import os

import pandas as pd
import numpy as np

import sqlalchemy
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy import func # library to use aggregate functions

# libraries to read json
import json
import requests
from pandas.io.json import json_normalize


# Declare global variables
jsonPath = "static/db"

# GEOJSON filename
geojson_fname = "geoLoc.json"


#Police District JSON link for district Polygon Coordinates
police_dist_URL = "https://data.montgomerycountymd.gov/resource/vxy6-ve2e.json"

################### HELPER FUNCTIONS
def readJSON(url):
    # Extract JSON though requests.get()
    try:
        resp = requests.get(url)

        #check if the status code is other 200 (ie. not successful request)
        if(resp.status_code != 200):
            raise HTTPError

        # extract the JSON data
        return resp.json()

    except ConnectionError as c:
        raise ("Error in Connection :" + e)

    except HTTPError as h:
        raise ("Unsuccessful in obtaining JSON : " + h)
        

# function that constructs the feature details for GEOJSON
def genFeatureDict(info):
    
    f = {
        "type" : "Feature",
        "geometry":{
            "type": info['the_geom.type'],
            "coordinates": info['the_geom.coordinates']
        },
        "properties" : {
            "name" : info['SubAgency'],
            "distID" : info['PoliceDistrictID'],
            "total_traffic_violations" : info['TotalViolations']
        }
    }
    
    return f

def mainFunc(db, Violations):
    

    # query the table and obtain the results for Total violations count at the Police district level

    resDF = pd.DataFrame(db.session.query(Violations.SubAgency, Violations.PoliceDistrictID, func.sum(Violations.ViolationCount)).                
                group_by(Violations.SubAgency, Violations.PoliceDistrictID).all(), 
                columns = ['SubAgency','PoliceDistrictID','TotalViolations'])

    #print(resDF.SubAgency.count())
    # Request JSON file containing Police district's coordinates
    resp = readJSON(police_dist_URL)

    coordsDF = json_normalize(resp)

    #print(coordsDF.dist.count())

    #drop cols not necessary
    # only select the columns needed from the JSON on Police district
    coordsDF = coordsDF[['dist', 'the_geom.coordinates','the_geom.type']]

    coordsDF.rename(columns = {"dist" : "PoliceDistrictID"}, inplace = True)

    coordsDF.PoliceDistrictID = coordsDF.PoliceDistrictID.astype(int)

    

    # Merge SQLIte result DF and Coordinates DF
    coordsDF = pd.merge(resDF, coordsDF, on="PoliceDistrictID", how = "inner")

    
    #covert all values to string for easy json creation
    coordsDF[['PoliceDistrictID','TotalViolations']] = coordsDF[['PoliceDistrictID','TotalViolations']] .astype(str)


    # declare default structure of geoJSON
    map_geojson = {
        "type": "FeatureCollection",
        "features" : []
    }


    #construct the geoJSON features
    for i in range(0,coordsDF.index.size):
        map_geojson['features'].append(genFeatureDict(coordsDF.iloc[i,]))

    

    # write file to disk
    with open(os.path.join(jsonPath,geojson_fname), "w") as write_file:
        json.dump(map_geojson, write_file)

    
    return map_geojson




