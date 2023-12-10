// Function to handle form submission
function handleFormSubmission(event) {
    event.preventDefault(); // Prevents the default form submission

    const currencyInput = document.querySelector("#currency-code");
    const currencyDateInput = document.querySelector("#currency-date");
    const resultMessageArea = document.querySelector("#result-message");
    const chartContainer = document.querySelector(".chart-container");
    const dateRangeButtons = document.querySelector(".date-range-buttons");

    const selectedCurrency = currencyInput.value;
    const currencyDate = currencyDateInput.value;
    const inputDate = new Date(currencyDate);
    inputDate.setHours(0);

    // Validate form inputs; if the form is invalid, stop further execution
    if (!validateForm(selectedCurrency, inputDate, resultMessageArea)) {
        return;
    }

    // Display result elements
    resultMessageArea.removeAttribute("hidden");
    chartContainer.removeAttribute("hidden");
    dateRangeButtons.removeAttribute("hidden");

    // Fetch and display current exchange rate
    getExchangeRate(selectedCurrency, currencyDate, resultMessageArea);

    // Set up date range buttons and get the selected range
    const selectedDateRange = setupDateRangeButtons();

    // Fetch and draw historical data for the selected date range
    fetchAndDrawHistoricalData(selectedDateRange);
}

// Function to validate form inputs
function validateForm(selectedCurrency, inputDate, resultMessageArea) {
    const today = new Date();
    today.setHours(0);
    if (!selectedCurrency || selectedCurrency === "Select currency") {
        alert("Please select a currency.");
        return false;
    } else if (isNaN(inputDate.getTime())) {
        alert("Please select a valid date.");
        return false;
    } else if (inputDate < new Date("2002-01-02")) {
        resultMessageArea.innerHTML = "Exchange rate data is not available before 2002-01-02.";
        return false;
    } else if (inputDate > today) {
        resultMessageArea.innerHTML = "Future exchange rate data is not yet available.";
        return false;
    }
    return true;
}

// Function to set up date range buttons and return the selected range
function setupDateRangeButtons() {
    const dateRangeButtons = document.querySelector(".date-range-buttons");
    dateRangeButtons.removeAttribute("hidden");

    let selectedDateRange = "1"; // Default value
    document.querySelectorAll(".date-range-btn").forEach(button => {
        button.addEventListener("click", () => {
            selectedDateRange = button.value;
            fetchAndDrawHistoricalData(selectedDateRange);
        });
    });

    return selectedDateRange;
}

// Function to fetch and draw historical data
function fetchAndDrawHistoricalData(selectedDateRange) {
    const selectedCurrency = document.getElementById("currency-code").value;

    getHistoricalData(selectedCurrency, selectedDateRange)
        .then(data => {
            historicalDataChart(data.labels, data.values, selectedCurrency, selectedDateRange);
        })
        .catch(error => {
            console.error("Error getting historical data:", error);
        });
}

// Function to get the exchange rate of a currency on a given date
function getExchangeRate(currencyCode, date, resultMessageArea) {
    const url = `http://api.nbp.pl/api/exchangerates/rates/A/${currencyCode}/${date}/?format=json`;
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.rates && data.rates.length > 0) {
                const exchangeRate = data.rates[0].mid.toFixed(2);
                resultMessageArea.innerHTML = `The exchange rate of <span class='bold'>${currencyCode}</span> on <span class='bold'>${date}</span> is <span class='bold'>${exchangeRate}</span> PLN.`;
            } else {
                resultMessageArea.innerHTML = "Exchange rate data not found.";
            }
        })
        .catch(error => {
            resultMessageArea.innerHTML = "The table of the average foreign currency exchange rates is published (updated) on the NBP website on business days only, between 11:45 a.m. and 12:15 p.m. Data from a given business day before the indicated hours and the weekends are not available.";
            console.error("Data download error:", error);
        });
}

// Function to retrieve available currency rates from the NBP API and populate the dropdown list in the form
function getAvailableCurrencies() {
    const url = 'http://api.nbp.pl/api/exchangerates/tables/A/?format=json';
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const rates = data[0].rates;
            const currencySelect = document.getElementById("currency-code");

            // Loop through the available currencies and create options for the dropdown list
            rates.forEach(rate => {
                const option = document.createElement("option");
                option.value = rate.code;
                option.textContent = `${rate.code} - ${rate.currency}`;
                currencySelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Data download error:", error);
        });
}

// Call the function to fetch available currencies
getAvailableCurrencies();


// Function to retrieve historical exchange rates for a currency
function getHistoricalData(currencyCode, selectedDateRange) {
    const today = new Date();
    today.setHours(0);

    // Calculate the start date based on the time range
    let startDate = new Date(today);
    if (selectedDateRange === "1") {
        // 1 month
        startDate.setMonth(today.getMonth() - 1);
    } else if (selectedDateRange === "3") {
        // 3 months
        startDate.setMonth(today.getMonth() - 3);
    } else if (selectedDateRange === "6") {
        // 6 months
        startDate.setMonth(today.getMonth() - 6);
    } else if (selectedDateRange === "12") {
        // 1 year
        startDate.setFullYear(today.getFullYear() - 1);
    }

    // Use 'startDate' to create the appropriate URL to fetch historical data from the API
    const url = `http://api.nbp.pl/api/exchangerates/rates/A/${currencyCode}/${startDate.toISOString().substring(0, 10)}/${today.toISOString().substring(0, 10)}/?format=json`;

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.rates && data.rates.length > 0) {
                const historicalData = data.rates;
                const labels = historicalData.map(dataPoint => dataPoint.effectiveDate);
                const values = historicalData.map(dataPoint => dataPoint.mid);
                return { url, labels, values }
            } else {
                throw new Error("Historical exchange rate data not found.");
            }
        });
}

function historicalDataChart(labels, values, selectedCurrency, selectedDateRange) {
    const chartContainer = document.getElementById("historical-chart");
    const ctx = chartContainer.getContext("2d");

    // Determine the appropriate title text for the selected date range
    let dateRangeText = `${selectedDateRange} months`;
    if (selectedDateRange == 1) {
        dateRangeText = `${selectedDateRange} month`
    }

    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    data: values,
                    fill: false,
                    borderColor: "rgb(143, 183, 217)",
                    lineTension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: `${selectedCurrency} exchange rate chart for the last ${dateRangeText}`,
                fontFamily: 'Poppins, sans-serif',
                fontSize: 14,
                fontColor: "black"
            },
            legend: {
                display: false
            },
            tooltips: {
                callbacks: {
                    label: function (tooltipItem) {
                        return tooltipItem.yLabel;
                    }
                },
                titleFontFamily: 'Poppins, sans-serif',
                bodyFontFamily: 'Poppins, sans-serif',
                titleFontStyle: 'normal',
                bodyFontStyle: 'normal',
            },
            scales: {
                xAxes: [{
                    ticks: {
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: 12,
                        fontColor: "black",
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 45,
                        maxTicksLimit: 30,
                    }
                }],
                yAxes: [{
                    ticks: {
                        fontFamily: 'Poppins, sans-serif',
                        fontSize: 12,
                        fontColor: "black"
                    }
                }]
            }
        }
    });
}
