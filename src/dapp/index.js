
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';
import Web3 from 'web3';

(async() => {
    let result = null;

    let contract = new Contract('localhost', () => {
        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        fetchDataFromServer();
        // FlightStatusInfo(airline, flight, timestamp, statusCode)
        contract.setupEventListeners((error, result) => {
            let status = getStatus(result.status);

            displayStatusAlert(result.airline, result.flight, result.timestamp, status);
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let chosenOption = DOM.elid('flight').value;
            let flightInfo = chosenOption.split("|").map(item => item.trim());
            const flight = {
                airline: flightInfo[0],
                id: flightInfo[1],
                departureTime: flightInfo[2]
            }

            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                if (error)
                    displaySubmissionInfo('Request has failed');
                else
                    displaySubmissionInfo('Fetching flight status, you will be notified soon!');
            });
        })


        DOM.elid('get-flight-info').addEventListener('click', () => {
            let chosenOption = DOM.elid('flight').value;
            let flightInfo = chosenOption.split("|").map(item => item.trim());
            const flight = {
                airline: flightInfo[0],
                id: flightInfo[1],
                departureTime: flightInfo[2]
            }

            let retrievingDisplay = DOM.elid('retrieving-info');
            DOM.setStyles(retrievingDisplay, {display: 'block'});

            // Write transaction
            contract.getFlightInfo(flight, (error, result) => {
                if (error) {
                    DOM.setStyles(retrievingDisplay, {display: 'none'});
                    console.log(error);
                    return;
                }
                const statusInfo = getStatus(result[2]);
                const flightInfo = {
                    airline: result[0],
                    flightID: result[1],
                    status: statusInfo,
                    departureTime: result[3],
                    hasInsurance: false,
                    claimable: 0
                }

                contract.fetchInsuranceInfo({...flightInfo}, (error, result) => {
                    DOM.setStyles(retrievingDisplay, {display: 'none'});
                    if (error) {
                        console.log(error);
                        return;
                    }
                        flightInfo.hasInsurance = result[1] > 0;
                        flightInfo.claimable = result[2];
                        flightInfo.claimed = result[3];
                        displayFlightInfo(flightInfo);
                })
            });
        })

        DOM.elid('buy-insurance').addEventListener('click', () => {
            let airline = DOM.elid('airline-address-display').innerHTML;
            let flightID = DOM.elid('flight-id-display').innerHTML;
            let departureTime = DOM.elid('departure-time-display').innerHTML;
            let ethAmount = DOM.elid('eth-amount').value;
            if (!ethAmount) {
                alert("Please state a value > 0");
                return;
            }

            const flight = {
                airline,
                flightID,
                departureTime
            }
            clearFlightInfoDisplay();
            displaySubmissionInfo('Purchasing insurance...');

            // Write transaction
            contract.buyInsurance(flight, ethAmount, (error, result) => {
                if (error) {
                    console.log(error);
                    displaySubmissionInfo('Insurance purchase failed!');
                } else {
                    displaySubmissionInfo('Insurance purchase success!');
                }
            });
        })

        DOM.elid('withdraw-funds').addEventListener('click', () => {
            let airline = DOM.elid('airline-address-display').innerHTML;
            let flightID = DOM.elid('flight-id-display').innerHTML;
            let departureTime = DOM.elid('departure-time-display').innerHTML;

            const flight = {
                airline,
                flightID,
                departureTime
            }
            clearFlightInfoDisplay();
            displaySubmissionInfo('Claiming insurance...');

            // Write transaction
            contract.claimInsurance(flight, (error, result) => {
                if (error) {
                    console.log(error);
                    displaySubmissionInfo('Insurance claim failed!');
                } else {
                    displaySubmissionInfo('Insurance claim success!');
                }
            });
        })
    
    });
    

})();

function getStatus(statusCode) {
    if (statusCode == 0) {
        return 'UNKNOWN';
    } else if (statusCode == 10) {
        return 'ON TIME';
    } else if (statusCode == 20) {
        return'LATE AIRLINE';
    } else if (statusCode == 30) {
        return 'LATE WEATHER';
    } else if (statusCode == 40) {
        return 'LATE TECHNICAL';
    } else if (statusCode == 50) {
        return 'LATER OTHER'
    }
}

function fetchDataFromServer() {
    let dropdown = document.getElementById('flight');
    dropdown.length = 0;

    // server endpoint
    const endpoint = 'http://localhost:3000/flights';

    fetch(endpoint).then((response) => {  
        if (response.status !== 200) {  
            console.warn('Failed to fetch data from server: ' + response.status);  
            return;  
        }

        response.json().then((data) => {  
            let flights = data.result
            for (let i = 0; i < flights.length; i++) {
                let option = document.createElement('option');
                const formattedFlightValue =  `${flights[i].airline}|${flights[i].id}|${flights[i].departureTime}`
                const date = new Date(parseInt(flights[i].departureTime));
                const formattedFlightText =  `Airline: ${flights[i].airline}, Flight ID: ${flights[i].id}, Departure Time: ${date.toLocaleString()}`
                
                option.text = formattedFlightText;
                option.value = formattedFlightValue;
                dropdown.add(option);
            }    
        });  
        }  
    )  
    .catch(function(err) {  
        console.error('Fetch Error -', err);  
    });
}


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}

function displayStatusAlert(airline, flightID, departureTime, status) {
    let submissionInfoDiv = DOM.elid("submission-info");
    DOM.setStyles(submissionInfoDiv, {display: 'none'});
    submissionInfoDiv.innerHTML = "";

    let displayDiv = DOM.elid("status-alert");
    const displayMsg = `Status of flight (${airline}, ${flightID}, ${departureTime}): ${status}`;
    DOM.setStyles(displayDiv, {display: 'block'});
    displayDiv.innerHTML = displayMsg;

    clearFlightInfoDisplay();

    setTimeout(() => {
        DOM.setStyles(displayDiv, {display: 'none'});
        displayDiv.innerHTML = "";
    }, 5000);
}

function displaySubmissionInfo(displayMsg) {
    let displayDiv = DOM.elid("submission-info");
    DOM.setStyles(displayDiv, {display: 'block'});
    displayDiv.innerHTML = displayMsg;

    setTimeout(() => {
        DOM.setStyles(displayDiv, {display: 'none'});
        displayDiv.innerHTML = "";
    }, 4000);
}

function displayFlightInfo(flightInfo) {
    let airlineDisplay = DOM.elid("airline-address-display");
    airlineDisplay.innerHTML = flightInfo.airline;
    let flightID = DOM.elid("flight-id-display");
    flightID.innerHTML = flightInfo.flightID;
    let departureTime = DOM.elid("departure-time-display");
    departureTime.innerHTML = flightInfo.departureTime;
    let statusDisplay = DOM.elid("status-code-display");
    statusDisplay.innerHTML = flightInfo.status;

    let claimableAmtDisplay = DOM.elid("claimable-amount-display");
    let withdrawButton = DOM.elid("withdraw-funds");
    let buyButton = DOM.elid("buy-insurance");
    let ethAmount = DOM.elid("eth-amount");

    if (flightInfo.claimed) {
        claimableAmtDisplay.innerHTML = "Insurance claimed";
        DOM.setStyles(withdrawButton, {display: 'none'});
    } else if (flightInfo.hasInsurance && flightInfo.claimable > "0") {
        const claimableEth = Web3.utils.fromWei(flightInfo.claimable);
        claimableAmtDisplay.innerHTML = claimableEth + ' ETH';
        DOM.setStyles(withdrawButton, {display: 'inline'});
    } else if (flightInfo.hasInsurance && flightInfo.claimable == "0"
            && flightInfo.status == "LATE AIRLINE"){
        claimableAmtDisplay.innerHTML = "Not claimable yet";
        DOM.setStyles(withdrawButton, {display: 'none'});
    } else if (flightInfo.hasInsurance && flightInfo.claimable == "0"){
        claimableAmtDisplay.innerHTML = "Not claimable";
        DOM.setStyles(withdrawButton, {display: 'none'});
    } else {
        claimableAmtDisplay.innerHTML = "-";
        DOM.setStyles(withdrawButton, {display: 'none'});
    }

    if (!flightInfo.hasInsurance && flightInfo.status == "UNKNOWN") {
        claimableAmtDisplay.innerHTML = "Insurance not bought";
        DOM.setStyles(buyButton, {display: 'inline'});
        DOM.setStyles(ethAmount, {display: 'inline'});
    }
}

function clearFlightInfoDisplay() {
    let airlineDisplay = DOM.elid("airline-address-display");
    airlineDisplay.innerHTML = "";
    let flightID = DOM.elid("flight-id-display");
    flightID.innerHTML = "";
    let departureTime = DOM.elid("departure-time-display");
    departureTime.innerHTML = "";
    let statusDisplay = DOM.elid("status-code-display");
    statusDisplay.innerHTML = "";
    let claimableAmtDisplay = DOM.elid("claimable-amount-display");
    claimableAmtDisplay.innerHTML = "";
    let withdrawButton = DOM.elid("withdraw-funds");
    DOM.setStyles(withdrawButton, {display: 'none'});
    let buyButton = DOM.elid("buy-insurance");
    DOM.setStyles(buyButton, {display: 'none'});
    let ethAmount = DOM.elid("eth-amount");
    DOM.setStyles(ethAmount, {display: 'none'});
}





