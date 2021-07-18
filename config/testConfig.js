
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0xC999De768BCfBfafF80ed71100DC94CFF0eaf847",
        "0xd079eFF796c1F60b3A7929620cE7853194B3Cbf8",
        "0x2495078e3717b47e1047cd6D6B6d230459baeB5c",
        "0x059bf972Bf3e64bE544d3ea2E6Fe2A8377a3F4b4",
        "0x29547fac3a848f009C2D57Ac1Fbe782DC149780C",
        "0x55a9585b9fffA4BEdf438badc9C1A6407aa55C47",
        "0x362c86b9e9B85194C257FaFd03DB134019e582ae",
        "0x2E24Fc859186D86b95b6E170bA4b68f7A20800eb",
        "0xaAAC94e5CeDF5Ac8754Bd7de3D68F6b520f0ca13",
        "0x00473290F4448261a5DeBec4904d1402b7eCC206"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];
    let firstAirlineName = "First Airline";

    let flightSuretyData = await FlightSuretyData.new(firstAirline, firstAirlineName);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);
    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};