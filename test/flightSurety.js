
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  beforeEach('setup contract', async () => {
    config = await Test.Config(accounts);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

//   it(`(multiparty) has correct initial isOperational() value`, async function () {

//     // Get operating status
//     let status = await config.flightSuretyData.isOperational.call();
//     assert.equal(status, true, "Incorrect initial operating status value");

//   });

//   it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

//       // Ensure that access is denied for non-Contract Owner account
//       let accessDenied = false;
//       try 
//       {
//           await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
//       }
//       catch(e) {
//           accessDenied = true;
//       }
//       assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
//   });

//   it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

//       // Ensure that access is allowed for Contract Owner account
//       let accessDenied = false;
//       try 
//       {
//           await config.flightSuretyData.setOperatingStatus(false);
//       }
//       catch(e) {
//           accessDenied = true;
//       }
//       assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
//   });

//   it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

//       await config.flightSuretyData.setOperatingStatus(false);

//       let reverted = false;
//       try 
//       {
//           await config.flightSurety.setTestingMode(true);
//       }
//       catch(e) {
//           reverted = true;
//       }
//       assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

//       // Set it back for other tests to work
//       await config.flightSuretyData.setOperatingStatus(true);

//   });

  // it('Airlines can be registered (non-multiparty consensus) ', async () => {
        
  //   // ARRANGE
  //   let airlineA = accounts[5];
  //   let airlineB = accounts[6];
  //   let airlineC = accounts[7];

  //   let newAirlineName = "Hehe Airline";

  //   await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
  //   await config.flightSuretyApp.registerAirline(airlineA, newAirlineName, {from: config.firstAirline});
  //   await config.flightSuretyApp.registerAirline(airlineB, newAirlineName, {from: config.firstAirline});
  //   await config.flightSuretyApp.registerAirline(airlineC, newAirlineName, {from: config.firstAirline});

    

  //   let resA = await config.flightSuretyData.fetchAirlineInfo.call(airlineA);
  //   let resB = await config.flightSuretyData.fetchAirlineInfo.call(airlineB);
  //   let resC = await config.flightSuretyData.fetchAirlineInfo.call(airlineC);

  //   // console.log(result)
  //   // ASSERT
  //   assert.equal(resA[2], true, "AirlineA should be recognized as approved");
  //   assert.equal(resB[2], true, "AirlineB should be recognized as approved");
  //   assert.equal(resC[2], true, "AirlineC should be recognized as approved");

  // });

  it('Airlines can be registered multiparty consensus', async () => {
        
    // ARRANGE
    let airlineA = accounts[5];
    let airlineB = accounts[6];
    let airlineC = accounts[7];
    let airlineD = accounts[8];

    let newAirlineName = "Hehe Airline";

    await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
    await config.flightSuretyApp.registerAirline(airlineA, newAirlineName, {from: config.firstAirline});
    await config.flightSuretyApp.registerAirline(airlineB, newAirlineName, {from: config.firstAirline});
    await config.flightSuretyApp.registerAirline(airlineC, newAirlineName, {from: config.firstAirline});

    // Activate existing airlines
    await config.flightSuretyApp.fund({from: airlineA, value: web3.utils.toWei('10', "ether")});
    await config.flightSuretyApp.fund({from: airlineB, value: web3.utils.toWei('10', "ether")});
    await config.flightSuretyApp.fund({from: airlineC, value: web3.utils.toWei('10', "ether")});

    // 5th airline to register
    await config.flightSuretyApp.registerAirline(airlineD, newAirlineName, {from: airlineD});

    let resD = await config.flightSuretyData.fetchAirlineInfo.call(airlineD);

    assert.equal(resD[0, 5, "ID should be set if airline is registered"]);
    assert.equal(resD[2], false, "AirlineD should not be recognized as approved");

    // Only requires 2 approvals for AirlineD
    await config.flightSuretyApp.approveAirline(airlineD, {from: config.firstAirline});
    await config.flightSuretyApp.approveAirline(airlineD, {from: airlineA});

    let resA = await config.flightSuretyData.fetchAirlineInfo.call(airlineA);
    let resB = await config.flightSuretyData.fetchAirlineInfo.call(airlineB);
    let resC = await config.flightSuretyData.fetchAirlineInfo.call(airlineC);
    resD = await config.flightSuretyData.fetchAirlineInfo.call(airlineD);

    assert.equal(resA[2], true, "AirlineA should be recognized as approved");
    assert.equal(resB[2], true, "AirlineB should be recognized as approved");
    assert.equal(resC[2], true, "AirlineC should be recognized as approved");
    assert.equal(resA[3], true, "AirlineA should be active");
    assert.equal(resB[3], true, "AirlineB should be active");
    assert.equal(resC[3], true, "AirlineC should be active");
    
    assert.equal(resD[2], true, "AirlineD should be recognized as approved");

  });

  // it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
      
  //   // ARRANGE
  //   let newAirline = accounts[2];
  //   let newAirlineName = "Hehe Airline";

  //   await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
  //   await config.flightSuretyApp.registerAirline(newAirline, newAirlineName, {from: config.firstAirline});


  //   let result = await config.flightSuretyData.isAirline.call(config.firstAirline); 
  //   // console.log(result)
  //   // ASSERT
  //   assert.equal(result, true, "Airline should be recognized as registered");

  // });

  // it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
  //   // ARRANGE
  //   let newAirline = accounts[3];
  //   let newAirlineName = "Haha Airline";

  //   // ACT
  //   try {
  //       await config.flightSuretyApp.registerAirline(newAirline, newAirlineName, {from: config.firstAirline});
  //   }
  //   catch(e) {
  //   }
  //   let result = await config.flightSuretyData.isAirline.call(newAirline); 

  //   // ASSERT
  //   assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  // });
 


});
