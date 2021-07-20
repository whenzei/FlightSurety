
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    beforeEach('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    // it(`Has correct initial isOperational() value`, async function () {

    //     // Get operating status
    //     let status = await config.flightSuretyData.isOperational.call();
    //     assert.equal(status, true, "Incorrect initial operating status value");

    // });

    // it(`(Can block access to setOperational() for non-Contract Owner account`, async function () {

    //     // Ensure that access is denied for non-Contract Owner account
    //     let accessDenied = false;
    //     try 
    //     {
    //         await config.flightSuretyData.setOperational(false, { from: config.testAddresses[2] });
    //     }
    //     catch(e) {
    //         accessDenied = true;
    //     }
    //     assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
    // });

    // it(`Can allow access to setOperational() for Contract Owner account`, async function () {

    //     // Ensure that access is allowed for Contract Owner account
    //     let accessDenied = false;
    //     try 
    //     {
    //         await config.flightSuretyData.setOperational(false, {from: config.owner});
    //     }
    //     catch(e) {
    //         accessDenied = true;
    //     }
    //     assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
        
    // });

    // it(`Operating status is reflectn as false after updating it`, async function () {

    //     await config.flightSuretyData.setOperational(false);
    //     let status = await config.flightSuretyData.isOperational.call();
    //     assert.equal(status, false, "Access not blocked for requireIsOperational");      

    // });


    // it('Airline can register a flight', async () => {

    //     // ARRANGE
    //     let flightID = "FL1234";
    //     let time = "111111111111111";

    //     // ACT
    //     await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
    //     await config.flightSuretyApp.registerFlight(flightID, time, {from: config.firstAirline});
        
    //     let result = await config.flightSuretyApp.getFlightInfo(config.firstAirline, flightID, time);

    //     // ASSERT
    //     assert.equal(result[0], config.firstAirline, "Incorrect airline returned");
    //     assert.equal(result[1], flightID, "Incorrect flight ID returned");
    //     assert.equal(result[2], 0, "Incorrect flight status returned");
    //     assert.equal(result[3], time, "Incorrect departure time returned");
    //     assert.equal(result[4], time, "Incorrect updated time returned");

    // });

    // it('Passenger can buy an insurance for a flight', async () => {

    //     // ARRANGE
    //     let flightID = "FL1234";
    //     let time = "111111111111111";
    //     let passenger = accounts[9];
    //     let insuranceCost = web3.utils.toWei('1', "ether");

    //     // ACT
    //     await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
    //     await config.flightSuretyApp.registerFlight(flightID, time, {from: config.firstAirline});
    //     await config.flightSuretyApp.buyInsurance(config.firstAirline, flightID, time, {from: passenger, value: insuranceCost});
    //     let result = await config.flightSuretyApp.fetchInsuranceInfo(config.firstAirline, flightID, time, {from: passenger});

    //     // ASSERT
    //     assert.equal(result[0], passenger, "Passenger address mismatch");
    //     assert.equal(result[1], insuranceCost, "Insurance cost mismatch");
    //     assert.equal(result[2], 0, "Insurance should not have any claimable amount");
    //     assert.equal(result[3], false, "Insurance should not be claimed");

    // });

    it('Passenger can claim their insurance once it is credited', async () => {

        // ARRANGE
        let flightID = "FL1234";
        let time = "111111111111111";
        let passenger = accounts[9];
        let insuranceCost = web3.utils.toWei('1', "ether");

        // ACT
        await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
        await config.flightSuretyApp.registerFlight(flightID, time, {from: config.firstAirline});
        await config.flightSuretyApp.buyInsurance(config.firstAirline, flightID, time, {from: passenger, value: insuranceCost});

        // Set flight status as STATUS_CODE_LATE_AIRLINE(20)
        await config.flightSuretyApp.processFlightStatusTestMode(config.firstAirline, flightID, time, 20, {from: config.owner});
        let flightStatus = await config.flightSuretyApp.getFlightInfo(config.firstAirline, flightID, time);
        assert.equal(flightStatus[2], 20, "Flight status is incorrect");

        // Credit insurees
        await config.flightSuretyApp.creditInsurees(flightID, time, {from: config.firstAirline});
        let insuranceResult = await config.flightSuretyApp.fetchInsuranceInfo(config.firstAirline, flightID, time, {from: passenger});
        assert.equal(insuranceResult[2], insuranceCost * 1.5, "Insurance claimable is not 1.5x cost");
        let claimableAmount = insuranceResult[2];

        let passengerBalanceBefore = await web3.eth.getBalance(passenger);
        await config.flightSuretyApp.claimInsurance(config.firstAirline, flightID, time, {from: passenger, gasPrice: 0});
        let passengerBalanceAfter = await web3.eth.getBalance(passenger);

        // ASSERT
        assert.equal(passengerBalanceBefore,
             new web3.utils.BN(passengerBalanceAfter).sub(new web3.utils.BN(claimableAmount)), "Insurance payout amount incorrect");


    });

    // it('Airlines can be registered (non-multiparty consensus) ', async () => {
        
    //     // ARRANGE
    //     let airlineA = accounts[5];
    //     let airlineB = accounts[6];
    //     let airlineC = accounts[7];

    //     let newAirlineName = "Hehe Airline";

    //     await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
    //     await config.flightSuretyApp.registerAirline(airlineA, newAirlineName, {from: config.firstAirline});
    //     await config.flightSuretyApp.registerAirline(airlineB, newAirlineName, {from: config.firstAirline});
    //     await config.flightSuretyApp.registerAirline(airlineC, newAirlineName, {from: config.firstAirline});

        

    //     let resA = await config.flightSuretyData.fetchAirlineInfo.call(airlineA);
    //     let resB = await config.flightSuretyData.fetchAirlineInfo.call(airlineB);
    //     let resC = await config.flightSuretyData.fetchAirlineInfo.call(airlineC);

    //     // console.log(result)
    //     // ASSERT
    //     assert.equal(resA[2], true, "AirlineA should be recognized as approved");
    //     assert.equal(resB[2], true, "AirlineB should be recognized as approved");
    //     assert.equal(resC[2], true, "AirlineC should be recognized as approved");

    // });

    // it('Airlines can be registered multiparty consensus', async () => {
        
    //     // ARRANGE
    //     let airlineA = accounts[5];
    //     let airlineB = accounts[6];
    //     let airlineC = accounts[7];
    //     let airlineD = accounts[8];

    //     let newAirlineName = "Hehe Airline";

    //     await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
    //     await config.flightSuretyApp.registerAirline(airlineA, newAirlineName, {from: config.firstAirline});
    //     await config.flightSuretyApp.registerAirline(airlineB, newAirlineName, {from: config.firstAirline});
    //     await config.flightSuretyApp.registerAirline(airlineC, newAirlineName, {from: config.firstAirline});

    //     // Activate existing airlines
    //     await config.flightSuretyApp.fund({from: airlineA, value: web3.utils.toWei('10', "ether")});
    //     await config.flightSuretyApp.fund({from: airlineB, value: web3.utils.toWei('10', "ether")});
    //     await config.flightSuretyApp.fund({from: airlineC, value: web3.utils.toWei('10', "ether")});

    //     // 5th airline to register
    //     await config.flightSuretyApp.registerAirline(airlineD, newAirlineName, {from: airlineD});

    //     let resD = await config.flightSuretyData.fetchAirlineInfo.call(airlineD);

    //     assert.equal(resD[0, 5, "ID should be set if airline is registered"]);
    //     assert.equal(resD[2], false, "AirlineD should not be recognized as approved");

    //     // Only requires 2 approvals for AirlineD
    //     await config.flightSuretyApp.approveAirline(airlineD, {from: config.firstAirline});
    //     await config.flightSuretyApp.approveAirline(airlineD, {from: airlineA});

    //     let resA = await config.flightSuretyData.fetchAirlineInfo.call(airlineA);
    //     let resB = await config.flightSuretyData.fetchAirlineInfo.call(airlineB);
    //     let resC = await config.flightSuretyData.fetchAirlineInfo.call(airlineC);
    //     resD = await config.flightSuretyData.fetchAirlineInfo.call(airlineD);

    //     assert.equal(resA[2], true, "AirlineA should be recognized as approved");
    //     assert.equal(resB[2], true, "AirlineB should be recognized as approved");
    //     assert.equal(resC[2], true, "AirlineC should be recognized as approved");
    //     assert.equal(resA[3], true, "AirlineA should be active");
    //     assert.equal(resB[3], true, "AirlineB should be active");
    //     assert.equal(resC[3], true, "AirlineC should be active");

    //     assert.equal(resD[2], true, "AirlineD should be recognized as approved");

    // });

    // it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
        
    //     // ARRANGE
    //     let newAirline = accounts[2];
    //     let newAirlineName = "Hehe Airline";

    //     await config.flightSuretyApp.fund({from: config.firstAirline, value: web3.utils.toWei('10', "ether")});
    //     await config.flightSuretyApp.registerAirline(newAirline, newAirlineName, {from: config.firstAirline});


    //     let result = await config.flightSuretyData.isAirline.call(config.firstAirline); 
    //     // console.log(result)
    //     // ASSERT
    //     assert.equal(result, true, "Airline should be recognized as registered");

    // });

    // it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

    //     // ARRANGE
    //     let newAirline = accounts[3];
    //     let newAirlineName = "Haha Airline";

    //     // ACT
    //     try {
    //         await config.flightSuretyApp.registerAirline(newAirline, newAirlineName, {from: config.firstAirline});
    //     }
    //     catch(e) {
    //     }
    //     let result = await config.flightSuretyData.isAirline.call(newAirline); 

    //     // ASSERT
    //     assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

    // });

});
