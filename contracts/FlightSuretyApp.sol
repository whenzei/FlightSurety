pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;          // Account used to deploy contract
    
    FlightSuretyData flightSuretyData;
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
        require(isOperational(), "Contract is currently not operational");  
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


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event FlightRegistered(address airline, string id, uint departureTime);
    event FlightStatusUpdated(bytes32 key, uint status, uint updatedTime);
    event AirlineRegistration(address airlineAddress, string airlineName);
    event AirlineApproval(address airlineAddress);
    event AirlineActivation(address airlineAddress);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address contractAddress
                                ) 
                                public 
    {
        flightSuretyData = FlightSuretyData(contractAddress);
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return flightSuretyData.isOperational();
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
                            (
                                address newAirline,
                                string airlineName
                            )
                            requireIsOperational
                            public
    {
        flightSuretyData.registerAirline(msg.sender, newAirline, airlineName);
        emit AirlineRegistration(newAirline, airlineName);
    }

   /**
    * @dev Airline to fund insurance
    *
    */   
    function fund() requireIsOperational external payable {
        flightSuretyData.fund.value(msg.value)(msg.sender);
        emit AirlineActivation(msg.sender);
    }

       /**
    * @dev Approve an airline
    *
    */   
    function approveAirline(address airline) requireIsOperational external {
        flightSuretyData.approveAirline(msg.sender, airline);
        emit AirlineApproval(airline);
    }
    
   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    string flightID,
                                    uint time  
                                )
                                requireIsOperational
                                external
    {
        flightSuretyData.registerFlight(msg.sender, flightID, time);
        emit FlightRegistered(msg.sender, flightID, time);
    }

   /**
    * @dev Retrieve flight info
    *
    */  
    function getFlightInfo  (
                                address airline,
                                string flightID,
                                uint departureTime
                            )
                            external
                            requireIsOperational
                            view
                            returns (address, string, uint, uint, uint)
    {
        return flightSuretyData.getFlightInfo(airline, flightID, departureTime);
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    string memory flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                internal
    {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        flightSuretyData.updateFlightStatus(key, statusCode, block.timestamp);
        emit FlightStatusUpdated(key, statusCode, block.timestamp);
    }

    // For testing purposes
    function processFlightStatusTestMode
                                        (
                                            address airline,
                                            string flight,
                                            uint256 timestamp,
                                            uint8 statusCode
                                        )
                                        external
                                        requireContractOwner
                                        requireIsOperational
    {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        flightSuretyData.updateFlightStatus(key, statusCode, block.timestamp);
        emit FlightStatusUpdated(key, statusCode, block.timestamp);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        requireIsOperational
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 

    function buyInsurance(
                            address airline,
                            string memory flightID,
                            uint departureTime
                        )
                        public
                        payable
                        requireIsOperational
    {
        require(departureTime > block.timestamp, "Not allowed to buy insurance after departure time");
        bytes32 key = getFlightKey(airline, flightID, departureTime);
        flightSuretyData.buyInsurance.value(msg.value)(key, msg.sender);
    }

    function creditInsurees(
                            string flightID,
                            uint departureTime
                        )
                        external
                        requireIsOperational
    {
        bytes32 key = getFlightKey(msg.sender, flightID, departureTime);
        flightSuretyData.creditInsurees(key, msg.sender);
    }

    function claimInsurance(
                            address airline,
                            string flightID,
                            uint departureTime
                        )
                        external
                        requireIsOperational
    {
        bytes32 key = getFlightKey(airline, flightID, departureTime);
        flightSuretyData.pay(key, msg.sender);
    }

    function fetchInsuranceInfo(
                            address airline,
                            string memory flightID,
                            uint departureTime
                        )
                        view
                        public
                        requireIsOperational
                        returns(address, uint, uint, bool)
    {
        bytes32 key = getFlightKey(airline, flightID, departureTime);
        (address passenger, uint cost, uint claimableAmount, bool claimed) = flightSuretyData.fetchInsuranceInfo(key, msg.sender);
        return (passenger, cost, claimableAmount, claimed);
    }

// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    
    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   

contract FlightSuretyData {
    function registerAirline(address registeringAirline, address newAirline, string airlineName) public;
    function fund(address airline) external payable;
    function approveAirline(address approvingAirline, address airline) external;
    function registerFlight (address airline, string flightID, uint time) external;
    function isOperational() public view returns (bool status);
    function getFlightInfo(address airline, string flightID, uint departureTime) public view returns (address, string, uint, uint, uint);
    function updateFlightStatus(bytes32 key, uint flightStatus,uint lastUpdated) external;
    function buyInsurance(bytes32 key, address passenger) external payable;
    function fetchInsuranceInfo(bytes32 key, address passenger) view public returns (address, uint, uint, bool);
    function creditInsurees(bytes32 key, address airline) external;
    function pay(bytes32 key, address passenger) external;
}
