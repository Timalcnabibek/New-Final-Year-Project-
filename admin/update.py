import pandas as pd
from pymongo import MongoClient
import os

# MongoDB Atlas connection
mongo_uri = os.getenv("MONGO_URI", "mongodb+srv://np03cs4a220312:bibek@ecommerce.sleh3.mongodb.net/Ecommerce_data?retryWrites=true&w=majority")
client = MongoClient(mongo_uri)
db = client["Ecommerce_data"]
csv_products_collection = db["CSV_products"]

# Path to the updated CSV
csv_path = r"C:\Users\sulochana timalsina\Downloads\Cleaned_Dataset__NPR_Only_.csv"

# Load the CSV file into a DataFrame
df = pd.read_csv(csv_path)

# Optional: Convert date fields if needed
df["sales_date"] = pd.to_datetime(df["sales_date"], errors='coerce')
df["created_at"] = pd.to_datetime(df["created_at"], errors='coerce')
df["updated_at"] = pd.to_datetime(df["updated_at"], errors='coerce')

# Drop old collection before re-uploading
csv_products_collection.drop()

# Insert into MongoDB
records = df.to_dict(orient='records')
csv_products_collection.insert_many(records)

print("✅ CSV data uploaded to MongoDB Atlas in 'CSV_products' collection.")
