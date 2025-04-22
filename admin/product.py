import pandas as pd
from pymongo import MongoClient
from bson import ObjectId

# Load the updated dataset with _id
df = pd.read_csv("Dataset_with_ObjectId.csv")

# Convert _id column to ObjectId
df["_id"] = df["_id"].apply(lambda x: ObjectId(str(x)))

# Connect to MongoDB
client = MongoClient("mongodb+srv://np03cs4a220312:bibek@ecommerce.sleh3.mongodb.net/Ecommerce_data?retryWrites=true&w=majority")
db = client["Ecommerce_data"]
products_collection = db["CSV_products"]

# Optional: Clean slate
products_collection.delete_many({})

# Insert records
records = df.to_dict(orient="records")
products_collection.insert_many(records)

print(f"✅ Inserted {len(records)} products with _id into MongoDB.")
