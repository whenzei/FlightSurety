pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
   
    uint private airlineCount = 0;
    mapping(address => Airline) private airlines;
    mapping(address => mapping(address => bool)) private votersMap;
    mapping(bytes32 => Flight) flights;
    mapping(address => uint) private authorizedContracts;
    mapping(bytes32 => Insurance[]) private insurances;
    mapping(bytes32 => bool) private insuranceCredited;


    uint8 private constant AIRLINES_THRESHOLD = 4;
    uint private constant MAX_INSURANCE_COST = 1 ether;
    
    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct Airline {
        uint id;
        string name;
        bool approved;
        bool active;
        uint balance;
        uint votesNeeded;
        uint voteCount;
    }

    struct Flight {
        string id;
        address airline;
        uint departureTime;
        uint status;
        uint updatedTime;
    }

    struct Insurance {
        address passenger;
        uint cost;
        uint claimableAmount;
        bool claimed;
    }


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address newAirline,
                                    string airlineName
                                ) 
                                public 
    {
        contractOwner = msg.sender;

        // Register initial airline
        airlineCount++;
        uint id = airlineCount;
        Airline memory airlineObj = Airline(id, airlineName, true, false, 0, 0, 0);
        airlines[newAirline] = airlineObj;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }



    modifier requireAirlineRegistered(address airline)
    {
        require(airlines[airline].approved, "Airline is not registered");
        _;
    }

    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    modifier requireAirlineOperable(address airline)
    {
        require(airlines[airline].active && airlines[airline].approved, "Airline is not operable");
        _;
    }

    modifier requireFlightExists(bytes32 key) {
        require(bytes(flights[key].id).length > 0, "Flight should exist");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    function authorizeCaller(address contractAddress) external requireIsOperational requireContractOwner {
        authorizedContracts[contractAddress] = 1;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperational
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner
    {
        operational = mode;
    }

    function isContractAuthorized(address contractAddress) view public returns(bool){
        return authorizedContracts[contractAddress] == 1;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address registeringAirline,
                                address newAirline,
                                string airlineName
                            )
                            public
                            requireIsCallerAuthorized
                            requireIsOperational
    {
        require((airlines[newAirline].approved == false), "Airline already registred");

        if (airlineCount < AIRLINES_THRESHOLD) {
            nonConsensusRegister(registeringAirline, newAirline, airlineName);
        } else {
            multiPartyConsensusRegister(registeringAirline, newAirline, airlineName);
        }
    }
    
    function nonConsensusRegister(
                                    address registeringAirline,
                                    address newAirline,
                                    string airlineName
                                )
                                private
    {
        require((airlines[registeringAirline].approved && airlines[registeringAirline].active), "Registering airline is not authorized to register other airline");

        airlineCount++;
        uint id = airlineCount;
        Airline memory airlineObj = Airline(id, airlineName, true, false, 0, 0, 0);
        airlines[newAirline] = airlineObj;
    }

    function multiPartyConsensusRegister
                                        (
                                            address registeringAirline,
                                            address newAirline,
                                            string airlineName
                                        )
                                        private
    {
        require(registeringAirline == newAirline, "Airlines should only register for themselves");

        uint votesNeeded = airlineCount * 50 / 100;
        airlineCount++;
        uint id = airlineCount;
        Airline memory airlineObj = Airline(id, airlineName, false, false, 0, votesNeeded, 0);
        airlines[newAirline] = airlineObj;
    }

    function approveAirline(
                            address approvingAirline,
                            address airline
                        )
                        requireIsCallerAuthorized
                        requireIsOperational
                        external
    {
        require(airlines[approvingAirline].approved, "Approving airline is not approved" );
        require(airlines[approvingAirline].active, "Approving airline is not active" );
        require(airlines[airline].approved == false, "Airline has already been approved");
        require(votersMap[airline][approvingAirline] == false, "Approving airline has already voted");

        votersMap[airline][approvingAirline] = true;
        airlines[airline].voteCount = airlines[airline].voteCount + 1;

        if (airlines[airline].voteCount >= airlines[airline].votesNeeded) {
            airlines[airline].approved = true;
        }

    }

    
    function isAirline(address airlineAddress) public view returns (bool) {
        return airlines[airlineAddress].id > 0 ;
    }

    function fetchAirlineInfo(address airlineAddress) public view returns (uint, string, bool, bool) {
        require(isAirline(airlineAddress), "Airline does not exist");

        uint id = airlines[airlineAddress].id;
        string memory name = airlines[airlineAddress].name;
        bool approved = airlines[airlineAddress].approved;
        bool active = airlines[airlineAddress].active;

        return (id, name, approved, active);
    }

    function registerFlight (
                                address airlineAddress,
                                string flightID,
                                uint departureTime
                            )
                            external
                            requireIsCallerAuthorized
                            requireIsOperational
                            requireAirlineOperable(airlineAddress)
    {
        bytes32 key = getFlightKey(airlineAddress, flightID, departureTime);
        require(flights[key].departureTime == uint(0), "Flight is already registered");
        Flight memory flightObj = Flight({
                id: flightID,
                airline: airlineAddress,
                departureTime: departureTime,
                status: 0,
                updatedTime: departureTime
            });

        flights[key] = flightObj;
    }

    function getFlightInfo  (
                            address airline,
                            string flightID,
                            uint time
                        )
                        external
                        view
                        requireIsOperational
                        requireIsCallerAuthorized
                        returns (address, string, uint, uint, uint)
    {
        bytes32 key = getFlightKey(airline, flightID, time);
        Flight memory flight = flights[key];
        return (flight.airline, flight.id, flight.status, flight.departureTime, flight.updatedTime);
    }

    function updateFlightStatus(
                                        bytes32 key,
                                        uint flightStatus,
                                        uint lastUpdated
                                )
                                external
                                requireIsOperational
                                requireIsCallerAuthorized
                                requireFlightExists(key)
    {
        flights[key].status = flightStatus;
        flights[key].updatedTime = lastUpdated;
    }    

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buyInsurance (
                    bytes32 flightKey,
                    address passenger                       
                )
                external
                payable
                requireIsCallerAuthorized
                requireIsOperational
                requireFlightExists(flightKey)
    {
        require(msg.value > 0, "Insurance cost cannot be 0");
        require(msg.value <= MAX_INSURANCE_COST, "Maximum payable for insurance is 1 ETH");

        bool isDuplicate = false;
        Insurance[] storage insuredPassengers = insurances[flightKey];
        for (uint i = 0; i < insuredPassengers.length; i++) {
            if (passenger == insuredPassengers[i].passenger) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "Passenger has already bought insurance for flight");
        Insurance memory insuranceObj = Insurance(passenger, msg.value, 0, false); 
        insuredPassengers.push(insuranceObj);
    }

    function fetchInsuranceInfo(
                                    bytes32 flightKey,
                                    address passenger
                                )
                                view
                                public
                                requireIsOperational
                                requireFlightExists(flightKey)
                                returns(address, uint, uint, bool)
    {
        Insurance[] storage insuredPassengers = insurances[flightKey];
        uint insuranceCost;
        uint claimableAmount;
        bool claimed;

        for (uint i = 0; i < insuredPassengers.length; i++) {
            if (passenger == insuredPassengers[i].passenger) {
                insuranceCost = insuredPassengers[i].cost;
                claimableAmount = insuredPassengers[i].claimableAmount;
                claimed = insuredPassengers[i].claimed;
                break;
            }
        }

        return (passenger, insuranceCost, claimableAmount, claimed);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    bytes32 flightKey,
                                    address airline
                                )
                                external
                                requireIsOperational
                                requireIsCallerAuthorized
                                requireFlightExists(flightKey)
    {
        Flight storage flight = flights[flightKey];
        require(flight.airline == airline, "Flight airline not matching sender");
        require(flight.status == STATUS_CODE_LATE_AIRLINE, "Insurance not creditable due to flight status");
        require(!insuranceCredited[flightKey], "Insurees has already been credited");

        insuranceCredited[flightKey] = true;

        Insurance[] storage insuredPassengers = insurances[flightKey];
        for (uint i = 0; i < insuredPassengers.length; i++) {
            // Payout is 1.5X of insurance cost
            insuredPassengers[i].claimableAmount = insuredPassengers[i].cost.mul(150).div(100);
        }

    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                bytes32 flightKey,
                                address passenger
                            )
                            external
                            requireIsOperational
                            requireIsCallerAuthorized
                            requireFlightExists(flightKey)
    {
        require(insuranceCredited[flightKey], "Insurance has not been credited");
        Insurance[] storage insuredPassengers = insurances[flightKey];
        for (uint i = 0; i < insuredPassengers.length; i++) {
            if (insuredPassengers[i].passenger == passenger) {
                uint claimableAmount = insuredPassengers[i].claimableAmount;
                bool claimed = insuredPassengers[i].claimed;
                require(!claimed, "Claim for insurance already made");
                require(claimableAmount > 0, "Claimable amount is 0");

                insuredPassengers[i].claimableAmount = 0;
                insuredPassengers[i].claimed = true;
                passenger.transfer(claimableAmount);
                break;
            }
        }
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            ( 
                                address airline
                            )
                            public
                            requireIsCallerAuthorized
                            requireAirlineRegistered(airline)
                            payable
    {
        require (msg.value >= 10 ether, "Funding should be at least 10 ETH");
        airlines[airline].balance = airlines[airline].balance.add(msg.value);
        airlines[airline].active = true;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
    }


}

