# Storyboard of Traffic Violations for Montgomery County, MD
### Jointly developed by Justin Schlankey, Madhu S, Diane Tate and Yahia Zemoura 
### Link : [Traffic Violations Dashboard](https://traffic-violations-dashboard.herokuapp.com/)


Visualize the trends of traffic violations for Montgomery County, MD based on 4 years of data (2012 to 2016). This project focusses heavily on visualization as a way of telling a story. Python, Flask API, D3.JS, leaflet.js, JQuery and HTML/CSS are main technologies used for development. SQLite was used for storage.

### Inference: 

#### Since 2012, the number of violations was be going up as we predicted, however the data also shows an improving trend of violations going down based on year over year change as depicted below

![Trend Vs YoY change](outputImages/trend_vs_yoychange.png)

At a summary level, we also see that District 4 and District 3 are top runners in the number of violations. Also, they significantly impact the YOY change.

![District Summary and Contribution to YoY change](outputImages/district-wise_summary)


### Development Process:

#### Data extraction and cleaning (![link to ipynb](importDataToSQLite.ipynb): 
* The data was extracted as zip file from [Kaggle](https://www.kaggle.com/felix4guti/traffic-violations-in-usa). 
* Using pandas, the data was read into dataframes which was used for next steps
* Before we proceed to Data aggregation and Loading to SQLite, the data was cleaned as per the below process
	* Columns not used for dashboard was removed
	* Any columns that has null values for primary columns were dropped to avoid skewness
	* Presence of duplicates were checked. 
	* Formats are all columns changed to correct formats (eg. date cols to datatime format, Yes/No cols to boolean and numeric to Float)
* A new column Violation Category was created based on Analysis of Description field to categories like Distraction, Impairment, Offense, Safety, Violation and Other

#### Data Agregation and SQL Load (![link to ipynb](importDataToSQLite.ipynb):
* After cleaning, the data was agregated by Year, Month, Quarter, Police District, Type of Violation, Category of Violation and Vehicle type
* Once aggregated, the data was loaded into SQLite db using SQLAlchemy and Pandas.to_sql()

#### Development of Data-Driven Dashboard using Flask / HTML / JS (![code link](trafficViolations/):

The dashboard app can be divided broadly into FLASK app (back-end) and HTML/CSS/JavaScript (Front-End). The functions of each explained below

##### FLASK application (![code link](trafficViolations/app.py):
* The flask application drives the operation of the data-driven website.
* It exposes multiple routes from which the front-end (HTML/JS) can extract data required for displaying on the page
* Internally, the flask routes query the SQLite db using Flask-SQLAlchemy and return a JSON output to browser.

##### Front-End Webpages  
* HTML and CSS primarily provide the layout, format, styles and static content of the entire website. (![code link](trafficViolations/templates/index.html)
* Javascript ((![code link](trafficViolations/static/js/main.js)) is completely responsible for user interactivty and dynamically changing the page content based on user inputs.
* jQuery and d3.js are key libraris of Javascript that provides the data-driven functionality
* lealet.js is responsible for the map display on the website


## How to run the program

## IMPORTANT : Please add API_KEY to config.js under trafficViolations/static/js folder so that the leaflet can run successfully.

- Navigate to the main Flask folder - "trafficViolations"
- from bash or cmd, run python app.py
- from broweser, visit localhost:5000/ to view the webpage


### Data Credits: Datasource obtained from [Data Montgomery county, MD](https://data.montgomerycountymd.gov/Public-Safety/Traffic-Violations/4mse-ku6). Also available from [Kaggle](https://www.kaggle.com/felix4guti/traffic-violations-in-usa)
