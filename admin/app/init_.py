from flask import Flask
from flask_pymongo import PyMongo

app = Flask(__name__)

# MongoDB Configuration
app.config["MONGO_URI"] = "mongodb+srv://np03cs4a220312:bibek@ecommerce.sleh3.mongodb.net/Ecommerce_data?retryWrites=true&w=majority"
mongo = PyMongo(app)

from app import routes
