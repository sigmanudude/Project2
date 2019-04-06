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
    df_res = df_res.sort_values(['Year','Qtr'])

    return jsonify(df_res.to_dict(orient = "records"))

@app.route("/distContribYOY")
def distContribYOY():
    """Return a json for displaying district based violations with YOY contribution%."""

    # call data extraction function - that return a DF
    df_res = dq.dist_Contrib_YOY(db,Violations)
    df_res = df_res.sort_values(['Year','Qtr'])

    marker= {
        "color": 'rgb(64, 64, 64)',
        "size": 8
      }
    line= {
        "color": 'rgb(64, 64, 64)',
        "width": 4
      }

    df_line = dq.violation_YOY_Change(db, Violations)
    df_line = df_line.sort_values(['Year','Qtr'])

    trace_line = {
        "x": df_line.apply(lambda x:'%s-%s' % (x['Qtr'],x['Year']),axis=1).tolist(),
        "y": df_line.YOY_Change_PCT.tolist(),
        "type": "scatter",
        "mode": "lines+markers",
        "line": line,
        "marker": marker, 
        "name" : "YOY %"
        }
    agencies = []
    df_sub = dq.dist_Contrib_YOY(db,Violations)
    for s in df_sub.SubAgency.unique():
        agencies.append(     
        {
        "x": df_line.apply(lambda x:'%s-%s' % (x['Qtr'],x['Year']),axis=1).tolist(),
        "y": df_sub[df_sub.SubAgency == s].Contrib_pct.tolist(),
        "type": "bar",
        "opacity": 0.8,
        "name": s
        })
    agencies.append(trace_line)
    return jsonify(agencies)

@app.route("/dashboardData/<yr>/<cat>/<dist>/<pg>")
def dashboardData(yr,cat,dist,pg):
    """Return a json for all dashboard plots and data to be displayed as html table"""
    
    # get all data as per the filter criteria requested
    df_all_data = dq.filterData_main(db,Violations, int(yr), str(cat), int(dist))

    pg = int(pg)
    st_row = 0
    end_row = 500
    if(pg == 36):
        st_row = (pg-1)*500
        end_row = df_all_data.index.size        
    elif (pg == 1):
        st_row = 0
        end_row = pg * 500 
    else:
        st_row = (pg-1)*500
        end_row = pg *500

    df_all_data = df_all_data.iloc[st_row:end_row,]

    dataHTM = {"html" : df_all_data.to_html(header = True, border = 0, classes = ['table table-striped table-hover borderless'])}
    # print(dataHTM)

    return jsonify(dataHTM)

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
