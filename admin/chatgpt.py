from flask import Flask, render_template, request, jsonify
from flask_pymongo import PyMongo
from bson import ObjectId
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb+srv://np03cs4a220312:bibek@ecommerce.sleh3.mongodb.net/Ecommerce_data?retryWrites=true&w=majority"
mongo = PyMongo(app)

@app.route("/")
def index():
    return render_template("chatgpt.html")

@app.route("/customers", methods=["GET"])
def get_customers():
    customers = list(mongo.db.customers.find({}, {"password": 0}))  # Exclude password
    for customer in customers:
        customer["_id"] = str(customer["_id"])
    return jsonify(customers)

@app.route("/add_customer", methods=["POST"])
def add_customer():
    data = request.json
    mongo.db.customers.insert_one({
        "username": data["username"],
        "email": data["email"],
        "phone": data["phone"]
    })
    return jsonify({"message": "Customer added successfully"})

@app.route("/delete_customer/<id>", methods=["DELETE"])
def delete_customer(id):
    mongo.db.customers.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Customer deleted successfully"})

if __name__ == "__main__":
    app.run(debug=True)
