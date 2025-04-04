from flask import request, jsonify
from app import app, mongo
import joblib
import numpy as np

# Load the trained model
model = joblib.load("models/sales_model.pkl")

@app.route("/")
def home():
    return jsonify({"message": "Welcome to the Sales Prediction API!"})

# Endpoint to fetch sales data
@app.route("/sales", methods=["GET"])
def get_sales():
    sales_data = list(mongo.db.sales.find({}, {"_id": 0}))
    return jsonify(sales_data)

# Endpoint to predict sales
@app.route("/predict", methods=["POST"])
def predict_sales():
    try:
        data = request.get_json()
        features = np.array([data["sales_volume"], data["stock_availability"]]).reshape(1, -1)
        prediction = model.predict(features)
        return jsonify({"predicted_sales": prediction.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)
