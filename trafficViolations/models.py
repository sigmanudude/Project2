from sqlalchemy.ext.automap import automap_base
from app import db


# reflect an existing database into a new model
Base = automap_base()
# reflect the tables
Base.prepare(db.engine, reflect=True)

# Save references to the required table(s)
Violations = Base.classes.traffic_violations
