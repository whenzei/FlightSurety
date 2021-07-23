import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    // Status codes for flight info    
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
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
                callback(error, flight);
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