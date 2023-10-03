from flask import Flask, render_template, request
import requests
import pandas as pd
from datetime import datetime, timedelta

# Configure application
app = Flask(__name__)


# Function to retrieve available currency rates from the NBP API
def get_available_currencies():
    url = 'http://api.nbp.pl/api/exchangerates/tables/A/?format=json'
    resp = requests.get(url)
    if resp.status_code == 200:
        resp_json = resp.json()
        rates = resp_json[0]['rates']
        # Prepare a list of currency rates in the format "code - currency"
        currencies = [f"{rate['code']} - {rate['currency']}" for rate in rates]
        return currencies
    else:
        return "Data download error."
    

# Function to get the average exchange rate of a currency on a given date
def get_exchange_rate(currency_code, date):
    url = f'http://api.nbp.pl/api/exchangerates/rates/A/{currency_code}/{date}/?format=json'
    response = requests.get(url)
    if response.status_code == 200:
        response_json = response.json()
        # Retrieve the exchange rate against PLN
        exchange_rate = response_json['rates'][0]['mid']
        return exchange_rate
    

# Function to retrieve historical exchange rates for a currency
def get_exchange_rate_history(currency_code, start_date, end_date):
    # Check if start_date and end_date are in datetime format
    if isinstance(start_date, datetime):
        start_date = start_date.strftime("%Y-%m-%d")
    if isinstance(end_date, datetime):
        end_date = end_date.strftime("%Y-%m-%d")
    url = f'http://api.nbp.pl/api/exchangerates/rates/A/{currency_code}/{start_date}/{end_date}/?format=json'
    response = requests.get(url)
    if response.status_code == 200:
        response_json = response.json()
        rates = response_json['rates']
        df = pd.DataFrame(rates)
        return df


# Main page
@app.route('/', methods=['GET', 'POST'])
def index():
    # Get available currency rates
    available_currencies = get_available_currencies()

    # Default variable values
    exchange_rate = None
    result_message = ""
    labels = [] 
    values = []
    currency_code = ""

    if request.method == 'POST':
        # Get the full currency name from the form
        selected_currency = request.form['currency-code']

        # Find the currency code based on the full currency name
        currency_code = None
        for currency in available_currencies:
            if selected_currency in currency:
                currency_code = currency.split(' - ')[0]
                break
        
        if currency_code:
            # The <input> element with type="date" provides the date in the format "YYYY-MM-DD"
            currency_date = request.form['currency-date']
            today = datetime.today().date()

            if currency_date < "2002-01-02":
                result_message = "Exchange rate data is not available before 2002-01-02."
            elif currency_date > str(today):
                result_message = "Future exchange rate data is not yet available."
            else:
                exchange_rate = get_exchange_rate(currency_code, currency_date)

                if exchange_rate:
                    exchange_rate = round(exchange_rate, 2)
                    # result_message = f"The exchange rate of {currency_code} on {currency_date} is {exchange_rate} PLN."
                    result_message = f"The exchange rate of <span class='bold'>{currency_code}</span> on <span class='bold'>{currency_date}</span> is <span class='bold'>{exchange_rate}</span> PLN."
                else:
                    result_message = "The table of the average foreign currency exchange rates is published (updated) on the NBP website on business days only, between 11:45 a.m. and 12:15 p.m. Data from a given business day before the indicated hours and from the weekends are not available."

            # Retrieve historical data for the last 30 days
            start_date = today - timedelta(days=30)
            historical_data = get_exchange_rate_history(currency_code, start_date, today)
            labels = historical_data['effectiveDate'].tolist()
            values = historical_data['mid'].tolist()

    return render_template('index.html', available_currencies=available_currencies,
                           exchange_rate=exchange_rate, result_message=result_message,
                           labels=labels, values=values, currency_code=currency_code)

if __name__ == "__main__":
    app.run(debug=True)