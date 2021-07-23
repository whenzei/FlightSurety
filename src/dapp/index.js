
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


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
            let status;
            switch (result.statusCode) {
                case 0:
                    status = 'UNKNOWN';
                    break;
                case 10:
                    status = 'ON TIME';
                    break;
                case 20:
                    status = 'LATE AIRLINE';
                    break;
                case 30:
                    status = 'LATE WEATHER';
                    break;
                case 40:
                    status = 'LATE TECHNICAL';
                    break;
                case 50:
                    status = 'LATE OTHER';
                    break;
                
            }
            displayStatusAlert(result.airline, result.flight, result.timestamp, result.statusCode);
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
    
    });
    

})();


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
    let displayDiv = DOM.elid("status-alert");
    const displayMsg = `Status of flight (${airline}, ${flightID}, ${departureTime}): ${status}`;
    DOM.setStyles(displayDiv, {display: 'block'});
    displayDiv.innerHTML = displayMsg;

    setTimeout(() => {
        DOM.setStyles(displayDiv, {display: 'none'});
        displayDiv.innerHTML = "";
    }, 3000);
}

function displaySubmissionInfo(displayMsg) {
    let displayDiv = DOM.elid("submission-info");
    DOM.setStyles(displayDiv, {display: 'block'});
    displayDiv.innerHTML = displayMsg;

    setTimeout(() => {
        DOM.setStyles(displayDiv, {display: 'none'});
        displayDiv.innerHTML = "";
    }, 3000);
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







