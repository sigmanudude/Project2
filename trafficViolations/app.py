import os

import pandas as pd
import numpy as np

import sqlalchemy
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

from flask import Flask, jsonify, render_template, request
from flask_sqlalchemy import SQLAlchemy

import createGeoJSON
import dataQueries as dq


app = Flask(__name__)


#################################################
# Database Setup
#################################################

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///static/db/trafficViolations.sqlite"
#  app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get('DATABASE_URL', '') or "sqlite:///db/bellybutton.sqlite"

# Create connection to DB
db = SQLAlchemy(app)

# reflect an existing database into a new model
Base = automap_base()
# reflect the tables
Base.prepare(db.engine, reflect=True)

# Save references to the required table(s)
Violations = Base.classes.traffic_violations

#################################################
# Global Variables
#################################################
filter_by = {"yr" : 0, "cat" : all, "dist" :0}


#################################################
# Routes setup
#################################################
@app.route("/")
def index():
    """Return the homepage."""
    return render_template("index.html", filterData = filter_by)

# IMPORTANT - PREVENT CACHING BY FLASK
@app.after_request
def add_header(r):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r


@app.route("/distMap/<yr>/<cat>/<dist>")
def distMap(yr,cat,dist):
    """Return a geojson for displaying map."""

    # call create GeoJSON function to 
    res = createGeoJSON.mainFunc(db, Violations, int(yr), str(cat), int(dist))

    #print(res['features'][0])
    # Return a list of the column names (sample names)
    return jsonify(res)

@app.route("/YOYchange")
def yoy_Change():
    """Return a json for displaying Total Violations vs YoY change."""

    # call data extraction function - that return a DF
    df_res = dq.violation_YOY_Change(db,Violations)

    return jsonify(df_res.to_dict(orient = "records"))

@app.route("/distContribYOY")
def distContribYOY():
    """Return a json for displaying district based violations with YOY contribution%."""

    # call data extraction function - that return a DF
    df_res = dq.dist_Contrib_YOY(db,Violations)

    return jsonify(df_res.to_dict(orient = "records"))

@app.route("/violationByDist/<yr>/<cat>/<dist>")
def violationByDist(yr,cat,dist):
    """Return a json for violation by district, further filtered by year and category"""

    # call data extraction function - that return a DF
    df_res = dq.getViolation_ByDist(db,Violations, int(yr), str(cat), int(dist))

    return jsonify(df_res.to_dict(orient = "records"))

@app.route("/violationByCat/<yr>/<cat>/<dist>")
def violationByCat(yr,cat,dist):
    """Return a json for violation by category, further filtered by year and district."""

    # call data extraction function - that return a DF
    df_res = dq.getViolation_ByCat(db,Violations, int(yr), str(cat), int(dist))

    return jsonify(df_res.to_dict(orient = "records"))

@app.route("/violationByType/<yr>/<cat>/<dist>")
def violationByType(yr,cat,dist):
    """Return a json for violation by type, further filtered by year, district and category."""

    # call data extraction function - that return a DF
    df_res = dq.getViolation_ByType(db,Violations, int(yr), str(cat), int(dist))

    return jsonify(df_res.to_dict(orient = "records"))

@app.route("/boxPlot")
def boxPlot():
    """Return a json for violation by type, further filtered by year, district and category."""

    # call data extraction function - that return a DF
    traceData = dq.boxPlot_data(db,Violations)

    return jsonify(traceData.to_dict(orient = "records"))

# Filter routes
@app.route("/filterData")
def filterData():
    """Return a json that can be used to populate filters."""

    # call data extraction function - that return a DF
    df_yr = dq.getYears(db,Violations)
    df_dist = dq.getPoliceDist(db, Violations)
    df_cat = dq.getVioCat(db,Violations)

    filt_dict = {}
    filt_dict['Year'] = df_yr.to_dict(orient = "records")
    filt_dict['District'] = df_dist.to_dict(orient = "records")
    filt_dict['Category'] = df_cat.to_dict(orient = "records")


    return jsonify(filt_dict)


if __name__ == "__main__":
    app.run()
