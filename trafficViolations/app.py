import os

import pandas as pd
import numpy as np

import sqlalchemy
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

from flask import Flask, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy


import createGeoJSON
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


@app.route("/")
def index():
    """Return the homepage."""
    return render_template("index.html")

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


@app.route("/distMap")
def distMap():
    """Return a geojson for displaying map."""

    # call crete GeoJSON function to 
    res = createGeoJSON.mainFunc(db, Violations) 

    #print(res['features'][0])
    # Return a list of the column names (sample names)
    return jsonify(res)


if __name__ == "__main__":
    app.run()
