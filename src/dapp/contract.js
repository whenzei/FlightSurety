import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    // Status codes for flight info    
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.passenger;
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            // Use third account in ganache as passenger
            this.passenger = accts[2]

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .fetchFlightStatus(flight.airline, flight.id, flight.departureTime)
            .send({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    getFlightInfo(flight, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .getFlightInfo(flight.airline, flight.id, flight.departureTime)
            .call({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }

    fetchInsuranceInfo(flight, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .fetchInsuranceInfo(flight.airline, flight.flightID, flight.departureTime)
            .call({ from: self.passenger}, (error, result) => {
                callback(error, result);
            });
    }

    buyInsurance(flight, ethAmount, callback) {
        let self = this;

        const amount = Web3.utils.toWei(ethAmount, "ether"); 
        self.flightSuretyApp.methods
            .buyInsurance(flight.airline, flight.flightID, flight.departureTime)
            .send({
                from: self.passenger,
                value: amount,
                gas: 9999999,
                gasPrice: 20000000000
            }, (error, result) => {
                callback(error, result);
            });
    }

    claimInsurance(flight, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .claimInsurance(flight.airline, flight.flightID, flight.departureTime)
            .send({
                from: self.passenger,
                gas: 9999999,
                gasPrice: 20000000000
            }, (error, result) => {
                callback(error, result);
            });
    }

    setupEventListeners(callback) {
        // FlightStatusInfo(airline, flight, timestamp, statusCode)
        this.flightSuretyApp.events.FlightStatusInfo({
            fromBlock: "latest"
          }, function (error, event) {
            if (error){
               console.log(error);
            } else {
                callback(error, event.returnValues);
            }
          });
    }
}