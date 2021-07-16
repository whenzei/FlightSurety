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

    uint8 private constant AIRLINES_THRESHOLD = 4;
    
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
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineRegistration(address airlineAddress, uint id, string airlineName);
    event AirlineApproval(address airlineAddress, uint id, string airlineName);
    event AirlineActivation(address airlineAddress);

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

        emit AirlineRegistration(newAirline, id, airlineName);
        emit AirlineApproval(newAirline, id, airlineName);    
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
        require(authorizedContracts[msg.sender] == 1, "Caller is not contract owner");
        _;
    }

    modifier requireAirlineOperable(address airline)
    {
        require(airlines[airline].active && airlines[airline].approved, "Airline is not operable");
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

        emit AirlineRegistration(newAirline, id, airlineName);
        emit AirlineApproval(newAirline, id, airlineName);
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

        emit AirlineRegistration(newAirline, id, airlineName);
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
            emit AirlineApproval(airline, airlines[airline].id, airlines[airline].name);
        }

    }

    function registerFlight (
                                address airline,
                                string flightID,
                                uint time
                            )
                            external
                            requireIsCallerAuthorized
                            requireIsOperational
                            requireAirlineOperable(airline)
    {
        bytes32 key = getFlightKey(airline, flightID, timestamp);
        require(flights[key].airline == 0, "Flight is already registered");
        Flight memory newFlight = Flight(flightCount, airline, time, 0, time);
        flights[key] = newFlight;

        airlinesFlights[airline].push(newFlight.id);

        emit FlightAdded(newFlight.id, newFlight.airline, newFlight.flightCode);
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (                             
                            )
                            external
                            requireIsCallerAuthorized
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                )
                                external
                                requireIsCallerAuthorized
    {
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            requireIsCallerAuthorized
    {
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
        airlines[airline].balance = msg.value;
        airlines[airline].active = true;
    }

    function isAirline(address airlineAddress) public view returns (bool) {
        return airlines[airlineAddress].id > 0 ;
    }

    function fetchAirlineInfo(address airlineAddress) public view returns (uint, string, bool, bool) {
        require(isAirline(airlineAddress), "Airline does not exist");

        uint id = airlines[airlineAddress].id;
        string name = airlines[airlineAddress].name;
        bool approved = airlines[airlineAddress].approved;
        bool active = airlines[airlineAddress].active;

        return (id, name, approved, active);
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

