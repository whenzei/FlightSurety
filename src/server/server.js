import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

var cors = require('cors');
const app = express();
app.use(cors());

let flights = [];
let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

const oraclesByIndicies = new Array(10);
for (let i = 0; i < 10; i++) {
  oraclesByIndicies[i] = [];
}

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

async function initialSetup() {  
  let accounts = await web3.eth.getAccounts();

  // Authorize caller for data contract, this is done for ease of testing
  await flightSuretyData.methods.authorizeCaller(config.appAddress).send({from: accounts[0]});
  // let res = await flightSuretyData.methods.isContractAuthorized(config.appAddress).call();
  // console.log(res);
  let firstAirline = accounts[1];
  await flightSuretyApp.methods.fund().send({from: firstAirline, value: web3.utils.toWei('10', "ether")})

  // Prepopulate flights
  var now = new Date();
  var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  // Create departureTime 3 hours from current time
  var departureTime = startOfDay / 1000 * 1000 + (60 * 60 * 1000 * 3);

  const flightIDs = [
    "AAL" + Math.floor(Math.random()*89999+10000),
    "SIA" + Math.floor(Math.random()*89999+10000),
    "KKK" + Math.floor(Math.random()*89999+10000),
    "GGG" + Math.floor(Math.random()*89999+10000),
    "FFF" + Math.floor(Math.random()*89999+10000),
    "SSS" + Math.floor(Math.random()*89999+10000), 
    "CC5" + Math.floor(Math.random()*89999+10000)
  ]
  for (let flightID of flightIDs) {
    try {
      await flightSuretyApp.methods.registerFlight(flightID, departureTime).send({from: firstAirline, gas: 9999999,gasPrice: 20000000000});
    } catch (err) {
      console.log(err)
    }
  }
}

async function initOracles() {
  let accounts = await web3.eth.getAccounts();
  // Use last 30 accounts as airline
  let oracleAccounts = accounts.slice(-30);
  const fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();

  console.log('Registering oracles...');
  for (let oracleAccount of oracleAccounts) {
    try {
      await flightSuretyApp.methods.registerOracle().send({
        from: oracleAccount,
        value: fee,
        gas: 9999999,
        gasPrice: 20000000000
      });

      let indices = await flightSuretyApp.methods.getMyIndexes().call({from: oracleAccount});
      console.log(`Indices for ${oracleAccount}: ` + indices);
      oraclesByIndicies[indices[0]].push(oracleAccount);
      oraclesByIndicies[indices[1]].push(oracleAccount);
      oraclesByIndicies[indices[2]].push(oracleAccount);
    } catch (err) {
      console.log('Error occured while registering oracle: ' + err);
    }
  }
  console.log('Oracle registration completed');
  console.log(oraclesByIndicies);
}

function setupEventListeners() {

  flightSuretyApp.events.OracleRequest({
    fromBlock: "latest"
  }, function (error, event) {
    if (error){
       console.log("Error submit oracle report");
    } else {
      simulateResponseFromOracles(event.returnValues.index, event.returnValues.airline,
        event.returnValues.flight, event.returnValues.timestamp)
    }
  });

  flightSuretyApp.events.FlightRegistered({
    fromBlock: "latest"
  }, function (error, event) {
    if (error) {
      console.log(error)
    } else {
      let airline = event.returnValues.airline;
      let id =event.returnValues.id;
      let departureTime = event.returnValues.departureTime;
      console.log(`Flight registered: ${airline}, ${id}, ${departureTime}`);
      flights.push({
        airline,
        id,
        departureTime
      });
    }
  });
  
  flightSuretyApp.events.OracleReport({
    fromBlock: "latest"
  }, function (error, event) {
    if (error){
       console.log(error);
    } else {
      const report = event.returnValues;
      console.log(`Oracle Report: ${report.airline} ${report.flight} ${report.timestamp} ${report.status}`);
    }
  });

  
  flightSuretyApp.events.FlightStatusInfo({
    fromBlock: "latest"
  }, function (error, event) {
    if (error){
       console.log(error);
    } else {
      const flightInfo = event.returnValues;
      console.log(`Flight Status Info: ${flightInfo.airline} ${flightInfo.flight} ${flightInfo.timestamp} ${flightInfo.status}`);
      
      if (flightInfo.status != 20) return;

      // Attempt to credit insurees when status is 20 
      flightSuretyApp.methods.creditInsurees(flightInfo.flight, flightInfo.timestamp).send({
        from: flightInfo.airline,
        gas: 9999999,
        gasPrice: 20000000000
      }).then((result) => {
          console.log("Insurees credited by airline");
      }).catch(err => {
        console.log("Failed to credit insurees");
      }); 
    }
  });
}

function simulateResponseFromOracles(index, airline, flightID, departureTime) {
  const oracles = oraclesByIndicies[index];

  for (let oracle of oracles) {
    const randomNumber = Math.random();
    // Only returning 2 type of statuses to make testing easier, we can easily randomize other statuses
    // by dividing the random number range accordingly.
    // Simulate that airlines have about 50 chance of being late
    if (randomNumber > 0.5) {
      flightSuretyApp.methods.submitOracleResponse(index, airline, flightID, departureTime, STATUS_CODE_LATE_AIRLINE)
        .send({
          from: oracle,
          gas: 9999999,
          gasPrice: 20000000000
        });
    } else {
      // Else set flight as on time
      flightSuretyApp.methods.submitOracleResponse(index, airline, flightID, departureTime, STATUS_CODE_ON_TIME)
        .send({
          from: oracle,
          gas: 9999999,
          gasPrice: 20000000000
        });
    }
  }

}

setupEventListeners();

initialSetup().then(() => {
  initOracles().then(() => {
    initREST();
  });
});

function initREST(){
  app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
  })

  app.get('/flights', (req, res) => {
    res.json({
      result: flights
    })
  })
  
  console.log("App.get defined");

}


export default app;