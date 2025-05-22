from flask import Flask, render_template,Blueprint, request, jsonify, url_for
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from bson import ObjectId
from bson.objectid import ObjectId
import cloudinary
import cloudinary.uploader
import cloudinary.api
from datetime import datetime, timedelta
import calendar
import json
import bcrypt
from bson.son import SON
import joblib
import numpy as np
import pandas as pd



# from products import *
predict_bp = Blueprint('predict', __name__)

# Load environment variables
load_dotenv()





from bson import ObjectId
from datetime import datetime

def convert_object_ids(data):
    """Recursively converts ObjectId and datetime in dicts/lists."""
    if isinstance(data, list):
        return [convert_object_ids(item) for item in data]
    elif isinstance(data, dict):
        converted = {}
        for key, value in data.items():
            converted[key] = convert_object_ids(value)
        return converted
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, datetime):
        return data.isoformat()
    else:
        return data

    


def serialize(value):
    if isinstance(value, ObjectId):
        return str(value)
    elif isinstance(value, datetime):
        return value.isoformat()
    elif isinstance(value, list):
        return [serialize(v) for v in value]
    elif isinstance(value, dict):
        return {k: serialize(v) for k, v in value.items()}
    else:
        return value



# Custom JSON encoder to handle ObjectId
class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d')
        return json.JSONEncoder.default(self, obj)


app = Flask(__name__, static_folder="static")

# MongoDB connection
mongo_uri = os.getenv("MONGO_URI", "mongodb+srv://np03cs4a220312:bibek@ecommerce.sleh3.mongodb.net/Ecommerce_data?retryWrites=true&w=majority")
client = MongoClient(mongo_uri)
db = client["Ecommerce_data"]
products_collection = db["products"]
customers_collection = db["customers"]  
orders_collection = db["orders"]  
sales_data_collection = db["sales_datas"]
promo_codes_collection = db["promo_codes"]
rewards_collection = db["rewards"]


# Load model and scaler from the models folder
model = joblib.load('models/xgb_model.pkl')
scaler = joblib.load('models/scaler.pkl')


# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

if customers_collection.count_documents({}) == 0:
    sample_customers = [
        {
            "username": "john_smith",
            "email": "john.smith@example.com",
            "phone": 5551234567,
            "password": bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "otp": None,
            "otpExpiration": None,
            "isVerified": True,
            "wishlist": [],
            "cart": [],
            "total_spent": 150.75,  # ✅ Add a sample amount
            "status": "Active",  # ✅ Add customer status
            "registration_date": datetime.now() - timedelta(days=10),  # ✅ Add registration date
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        },
        {
            "username": "sarah_johnson",
            "email": "sarah.j@example.com",
            "phone": 5559876543,
            "password": bcrypt.hashpw("password456".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "otp": None,
            "otpExpiration": None,
            "isVerified": True,
            "wishlist": [],
            "cart": [],
            "total_spent": 75.50,  # ✅
            "status": "Inactive",  # ✅
            "registration_date": datetime.now() - timedelta(days=30),  # ✅
            "createdAt": datetime.now() - timedelta(days=30),
            "updatedAt": datetime.now() - timedelta(days=30)
        },
        {
            "username": "michael_brown",
            "email": "m.brown@example.com",
            "phone": 5554567890,
            "password": bcrypt.hashpw("password789".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "otp": None,
            "otpExpiration": None,
            "isVerified": False,
            "wishlist": [],
            "cart": [],
            "total_spent": 0.00,  # ✅
            "status": "Pending",  # ✅
            "registration_date": datetime.now() - timedelta(days=60),  # ✅
            "createdAt": datetime.now() - timedelta(days=60),
            "updatedAt": datetime.now() - timedelta(days=60)
        }
    ]
    customers_collection.insert_many(sample_customers)


@app.route('/api/category-demand-purchased', methods=['GET'])
def get_category_demand_purchased():
    try:
        pipeline = [
            # Unwind the purchased products array
            { "$unwind": "$products" },

            # Join with products collection to get category
            {
                "$lookup": {
                    "from": "products",
                    "localField": "products.productId",
                    "foreignField": "_id",
                    "as": "product_info"
                }
            },

            # Flatten product_info array
            { "$unwind": "$product_info" },

            # Group by product category and sum the quantities
            {
                "$group": {
                    "_id": "$product_info.category",
                    "total_quantity": { "$sum": "$products.quantity" }
                }
            },

            # Sort by quantity descending
            { "$sort": { "total_quantity": -1 } }
        ]

        result = list(orders_collection.aggregate(pipeline))

        category_data = {
            "labels": [r["_id"] for r in result if r["_id"]],
            "data": [r["total_quantity"] for r in result if r["_id"]]
        }

        return jsonify({ "success": True, "categories": category_data })

    except Exception as e:
        return jsonify({ "success": False, "error": str(e) }), 500





@app.route('/customer')
def new_page():
    try:
        # Get customer stats for dashboard
        total_customers = customers_collection.count_documents({})
        active_customers = customers_collection.count_documents({"isVerified": True})
        active_percentage = int((active_customers / total_customers) * 100) if total_customers > 0 else 0
        
        # Get the most recent 5 customers
        recent_customers = list(customers_collection.find().sort("createdAt", -1).limit(5))
        recent_customers = convert_object_ids(recent_customers)  # Convert ObjectIDs to strings
        
        for customer in recent_customers:
            # Check if createdAt is a string and convert it properly if needed
            if 'createdAt' in customer:
                if isinstance(customer['createdAt'], str):
                    # If it's already a string, format it or leave as is
                    pass
                else:
                    # If it's a datetime object, use strftime
                    customer['createdAt'] = customer['createdAt'].strftime('%Y-%m-%d')
                    
            # Same check for updatedAt
            if 'updatedAt' in customer:
                if isinstance(customer['updatedAt'], str):
                    # If it's already a string, format it or leave as is
                    pass
                else:
                    # If it's a datetime object, use strftime
                    customer['updatedAt'] = customer['updatedAt'].strftime('%Y-%m-%d')
        
        # Generate monthly data for customer growth chart
        months = []
        counts = []
        today = datetime.now()
        for i in range(6, -1, -1):
            month_start = datetime(today.year, today.month, 1) - timedelta(days=30*i)
            month_end = datetime(month_start.year, month_start.month, calendar.monthrange(month_start.year, month_start.month)[1], 23, 59, 59)
            
            month_name = month_start.strftime("%b")
            months.append(month_name)
            
            count = customers_collection.count_documents({
                "createdAt": {
                    "$gte": month_start,
                    "$lte": month_end
                }
            })
            counts.append(count)
        
        monthly_data = {"months": months, "counts": counts}
        
        # Get verification status distribution for chart
        status_distribution = list(customers_collection.aggregate([
            {"$group": {"_id": "$isVerified", "count": {"$sum": 1}}},
            {"$project": {"status": {"$cond": [{"$eq": ["$_id", True]}, "Verified", "Unverified"]}, "count": 1, "_id": 0}}
        ]))
        
        return render_template('new.html', 
                            total_customers=total_customers,
                            active_customers=active_customers,
                            active_percentage=active_percentage,
                            recent_customers=recent_customers,
                            monthly_data=json.dumps(monthly_data),
                            status_distribution=json.dumps(status_distribution))
    except Exception as e:
        print(f"Error in new_page route: {str(e)}")
        return jsonify({"error": str(e)}), 500
 

#  Render HTML page
@app.route('/customers')
def customers_page():
    return render_template('customer.html')

@app.route('/promo')
def promo_page():
    return render_template('promo.html')

@app.route('/analytics')
def analytics_page():
    return render_template('analytics.html')

@app.route('/settings')
def settings_page():
    return render_template('settings.html')
@app.route('/dashboard')
def dashboard_page():
    return render_template('dashboard.html')

@app.route('/average')
def average_page():
    return render_template('average.html')

@app.route('/prediction')
def prediction_page():
    return render_template('prediction.html')

@app.route('/orders')
def order_page():
    return render_template('orders.html')

@app.route('/login-signup')
def login_sign_page():
    return render_template('login.html')



#API starts from here
@app.route('/api/customers', methods=['GET'])
def get_customers():
    try:
        # Get all customers with proper field projections to match Node.js schema
        pipeline = [
            {
                "$project": {
                    "username": 1,
                    "email": 1,
                    "phone": 1,
                    "isVerified": 1,
                    "status": {"$ifNull": ["$status", "Active"]},  # Default if missing
                    "loyaltyPoints": {"$ifNull": ["$loyaltyPoints", 0]},  # Default if missing
                    "total_spent": {"$ifNull": ["$total_spent", 0]},
                    "registration_date": {"$ifNull": ["$registration_date", "$createdAt"]},
                    "wishlist": {"$ifNull": ["$wishlist", []]},
                    "cart": {"$ifNull": ["$cart", []]},
                    "createdAt": 1,
                    "updatedAt": 1,
                    # Exclude password and sensitive fields
                }
            },
            {"$sort": {"createdAt": -1}}
        ]
        
        customers = list(customers_collection.aggregate(pipeline))
        
        # Use the convert_object_ids function to properly serialize MongoDB objects
        serialized_customers = convert_object_ids(customers)
        
        # Debug: Print first customer (with sensitive data removed)
        if serialized_customers and len(serialized_customers) > 0:
            debug_customer = serialized_customers[0].copy()
            if 'password' in debug_customer:
                debug_customer['password'] = '[REDACTED]'
            print(f"Sample customer data: {debug_customer}")
        
        return jsonify({"success": True, "customers": serialized_customers})
    except Exception as e:
        print(f"Error in get_customers API: {str(e)}")
        # Print stack trace for debugging
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


    
@app.route('/api/customers', methods=['POST'])
def add_customer():
    try:
        data = request.json
        
        # Required fields check
        required_fields = ['username', 'email', 'phone', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({"success": False, "message": f"Missing required field: {field}"}), 400
        
        # Convert phone to number
        data['phone'] = int(data['phone']) if isinstance(data['phone'], str) else data['phone']
        
        # Hash password
        data['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Set default values
        data['isVerified'] = data.get('isVerified', False)
        data['wishlist'] = data.get('wishlist', [])
        data['cart'] = data.get('cart', [])
        data['createdAt'] = datetime.now()
        data['updatedAt'] = datetime.now()
        
        # Insert customer
        result = customers_collection.insert_one(data)
        return jsonify({"success": True, "id": str(result.inserted_id)})
    
    except Exception as e:
        print(f"Error in add_customer API: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/customers/<id>', methods=['PUT'])
def update_customer(id):
    try:
        data = request.json
        
        # Handle special fields
        if 'password' in data:
            data['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        if 'phone' in data:
            data['phone'] = int(data['phone']) if isinstance(data['phone'], str) else data['phone']
        
        # Update timestamp
        data['updatedAt'] = datetime.now()
        
        # Update customer
        customers_collection.update_one(
            {"_id": ObjectId(id)},
            {"$set": data}
        )
        return jsonify({"success": True})
    
    except Exception as e:
        print(f"Error in update_customer API: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/customers/<id>', methods=['DELETE'])
def delete_customer(id):
    try:
        customers_collection.delete_one({"_id": ObjectId(id)})
        return jsonify({"success": True})
    
    except Exception as e:
        print(f"Error in delete_customer API: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500




@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    try:
        # Count total and verified customers
        total_customers = customers_collection.count_documents({})
        verified_customers = customers_collection.count_documents({"isVerified": True})
        
        # Get cart stats
        cart_stats = list(customers_collection.aggregate([
            {"$unwind": {"path": "$cart", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": None,
                "total_items_in_cart": {"$sum": {"$cond": [{"$ifNull": ["$cart", False]}, "$cart.quantity", 0]}},
                "customers_with_items": {"$sum": {"$cond": [{"$ifNull": ["$cart", False]}, 1, 0]}}
            }}
        ]))
        
        cart_stats = cart_stats[0] if cart_stats else {"total_items_in_cart": 0, "customers_with_items": 0}
        
        # Get wishlist stats
        wishlist_stats = list(customers_collection.aggregate([
            {"$project": {
                "wishlist_count": {"$size": {"$ifNull": ["$wishlist", []]}},
            }},
            {"$group": {
                "_id": None,
                "total_items_in_wishlist": {"$sum": "$wishlist_count"},
                "customers_with_wishlist": {"$sum": {"$cond": [{"$gt": ["$wishlist_count", 0]}, 1, 0]}}
            }}
        ]))
        
        wishlist_stats = wishlist_stats[0] if wishlist_stats else {"total_items_in_wishlist": 0, "customers_with_wishlist": 0}
        
        return jsonify({
            "total_customers": total_customers,
            "verified_customers": verified_customers,
            "cart_metrics": {
                "total_items": cart_stats["total_items_in_cart"],
                "customers_with_items": cart_stats["customers_with_items"]
            },
            "wishlist_metrics": {
                "total_items": wishlist_stats["total_items_in_wishlist"],
                "customers_with_wishlist": wishlist_stats["customers_with_wishlist"]
            }
        })
    
    except Exception as e:
        print(f"Error in get_metrics API: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/customers/stats', methods=['GET'])
def get_customer_stats():
    try:
        total_customers = customers_collection.count_documents({})
        verified_customers = customers_collection.count_documents({"isVerified": True})
        active_customers = customers_collection.count_documents({"status": "Active"})  # <-- ADD THIS

        today = datetime.utcnow()
        first_day_of_current_month = datetime(today.year, today.month, 1)
        if today.month > 1:
            first_day_of_last_month = datetime(today.year, today.month - 1, 1)
        else:
            first_day_of_last_month = datetime(today.year - 1, 12, 1)

        customers_this_month = customers_collection.count_documents({
            "createdAt": {"$gte": first_day_of_current_month}
        })

        customers_last_month = customers_collection.count_documents({
            "createdAt": {"$gte": first_day_of_last_month, "$lt": first_day_of_current_month}
        })

        customer_growth_percentage = 0
        if customers_last_month > 0:
            customer_growth_percentage = ((customers_this_month - customers_last_month) / customers_last_month) * 100
        elif customers_this_month > 0:
            customer_growth_percentage = 100

        return jsonify({
            "totalCustomers": total_customers,
            "verifiedCustomers": verified_customers,
            "activeCustomers": active_customers,
            "activeCustomerPercentage": round((active_customers / total_customers) * 100, 2) if total_customers > 0 else 0,
            "customerGrowthPercentage": round(customer_growth_percentage, 2)
        })


    except Exception as e:
        print(f"Error in get_customer_stats API: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/showproducts')
def index():
    return render_template('admin_products.html')

# Product-related routes (keeping these from your original code)
@app.route('/products', methods=['POST'])
def add_product():
    try:

        if request.is_json:
            data = request.get_json()
        else:
            data = request.form
        # Get checkbox values for sizes
        sizes = request.form.getlist('productSize') if 'productSize' in request.form else []

        # Colors from comma-separated input
        colors = [color.strip() for color in request.form.get('productColor', '').split(',') if color.strip()]

        # Tags from comma-separated input
        tags = [tag.strip() for tag in request.form.get('productTags', '').split(',') if tag.strip()]

        # Product data
        product_data = {
            "name": request.form.get('productName'),
            "sku": request.form.get('productSKU', ''),
            "description": request.form.get('productDescription', ''),
            "price": float(request.form.get('productPrice', 0)),
            "discount_price": float(request.form.get('productDiscountPrice', 0)) if request.form.get('productDiscountPrice') else None,
            "category": request.form.get('productCategory'),
            "gender": request.form.get('productGender'),
            "stock": int(request.form.get('productStock', 0)),
            "featured": request.form.get('productFeatured') in ['true', 'True', '1', 'on', 'yes'],
            "trending": request.form.get('productTrending') in ['true', 'True', '1', 'on', 'yes'],
            "season": request.form.get('productSeason') or "",
            "sizes": sizes,
            "colors": colors,
            "material": request.form.get('productMaterial') or "",
            "tags": tags,
            "release_date": request.form.get('productReleaseDate') or "",  # You said to ignore this but leaving it here (optional)
            "weight": None,  # Ignored per your request
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "images": []
        }

        # Handle Cloudinary uploads
        if 'productImages' in request.files:
            image_urls = []
            for file in request.files.getlist('productImages'):
                if file and file.filename:
                    upload_result = cloudinary.uploader.upload(
                        file,
                        folder="ecommerce/products",
                        use_filename=True,
                        unique_filename=True
                    )
                    image_urls.append({
                        "url": upload_result['secure_url'],
                        "public_id": upload_result['public_id']
                    })
            product_data["images"] = image_urls

        # Insert product
        result = products_collection.insert_one(product_data)


        # Get first image URL if available
        first_image_url = ""
        if product_data["images"] and isinstance(product_data["images"], list):
            first_image_url = product_data["images"][0].get("url", "")

        # Insert related sales data with image and stock
        sales_data = {
            "product_id": result.inserted_id,
            "product_name": product_data["name"],
            "category": product_data["category"],
            "gender": product_data["gender"],
            "season": product_data["season"],
            "price": product_data["price"],
            "stock": product_data["stock"],                # ✅ Include stock count
            "image_url": first_image_url,                  # ✅ Include image URL
            "total_sold": 0,
            "total_revenue": 0,
            "growth_rate": 0.0,
            "historical_sales": [],
            "last_updated": datetime.utcnow()
}
        sales_data_collection.insert_one(sales_data)

        return jsonify({"success": True, "message": "Product added successfully", "product_id": str(result.inserted_id)})

    except Exception as e:
        print(f"Error in add_product API: {str(e)}")
        return jsonify({"success": False, "message": f"Error adding product: {str(e)}"}), 500



@app.route('/products', methods=['GET'])
def get_products():
    try:
        # Get all products from MongoDB
        products = list(products_collection.find())
        
        # Convert ObjectId to string for JSON serialization
        for product in products:
            product['_id'] = str(product['_id'])
        
        return jsonify({"success": True, "products": products})
    
    except Exception as e:
        print(f"Error in get_products API: {str(e)}")
        return jsonify({"success": False, "message": f"Error retrieving products: {str(e)}"}), 500

@app.route('/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        # Find the product
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"success": False, "message": "Product not found"}), 404
        
        # Delete images from Cloudinary
        for image in product.get('images', []):
            if 'public_id' in image:
                cloudinary.uploader.destroy(image['public_id'])
        
        # Delete the product from MongoDB
        result = products_collection.delete_one({"_id": ObjectId(product_id)})
        
        # Delete associated sales data
        sales_data_collection.delete_one({"product_id": ObjectId(product_id)})
        
        if result.deleted_count > 0:
            return jsonify({"success": True, "message": "Product deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Error deleting product"}), 500
    
    except Exception as e:
        print(f"Error in delete_product API: {str(e)}")
        return jsonify({"success": False, "message": f"Error deleting product: {str(e)}"}), 500

# ✅ Route: Get a single product by ID
@app.route('/products/<product_id>', methods=['GET'])
def get_product(product_id):
    try:
        product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not product:
            return jsonify({"success": False, "message": "Product not found"}), 404
        product['_id'] = str(product['_id'])  # Convert ObjectId to string
        return jsonify({"success": True, "product": product})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# ✅ Route: Update product
@app.route('/products/<product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        # Get the existing product
        existing_product = products_collection.find_one({"_id": ObjectId(product_id)})
        if not existing_product:
            return jsonify({"success": False, "message": "Product not found"}), 404

        # Use request.form for multipart/form-data
        data = request.form

        # Parse checkbox/multiselect values
        sizes = data.getlist('productSize') if 'productSize' in data else []

        # Parse comma-separated values
        colors = [c.strip() for c in data.get('productColor', '').split(',') if c.strip()]
        tags = [t.strip() for t in data.get('productTags', '').split(',') if t.strip()]

        # Build product data dictionary
        product_data = {
            "name": data.get('productName'),
            "sku": data.get('productSKU', ''),
            "description": data.get('productDescription', ''),
            "price": float(data.get('productPrice', 0)),
            "discount_price": float(data.get('productDiscountPrice', 0)) if data.get('productDiscountPrice') else None,
            "category": data.get('productCategory'),
            "gender": data.get('productGender'),
            "stock": int(data.get('productStock', 0)),
            "featured": data.get('productFeatured') in ['true', 'True', '1', 'on', 'yes'],
            "trending": data.get('productTrending') in ['true', 'True', '1', 'on', 'yes'],
            "season": data.get('productSeason', ''),
            "sizes": sizes,
            "colors": colors,
            "material": data.get('productMaterial', ''),
            "tags": tags,
            "release_date": data.get('productReleaseDate', ''),
            "weight": float(data.get('productWeight', 0)) if data.get('productWeight') else None,
            "updated_at": datetime.utcnow()
        }

        # Handle image replacement if new files are uploaded
        if 'productImages' in request.files and any(f.filename for f in request.files.getlist('productImages')):
            # Delete existing Cloudinary images
            for image in existing_product.get('images', []):
                if 'public_id' in image:
                    cloudinary.uploader.destroy(image['public_id'])

            # Upload new images
            image_urls = []
            for file in request.files.getlist('productImages'):
                if file.filename:
                    upload_result = cloudinary.uploader.upload(
                        file,
                        folder="ecommerce/products",
                        use_filename=True,
                        unique_filename=True
                    )
                    image_urls.append({
                        "url": upload_result['secure_url'],
                        "public_id": upload_result['public_id']
                    })
            product_data['images'] = image_urls
        else:
            # Keep previous images if no new ones are uploaded
            product_data['images'] = existing_product.get('images', [])

        # Update product in MongoDB
        result = products_collection.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": product_data}
        )

        # Update or create sales data
        sales_record = sales_data_collection.find_one({"product_id": ObjectId(product_id)})
        if sales_record:
            sales_data_collection.update_one(
                {"product_id": ObjectId(product_id)},
                {"$set": {
                    "product_name": product_data["name"],
                    "category": product_data["category"],
                    "gender": product_data["gender"],
                    "season": product_data["season"],
                    "price": product_data["price"],
                    "stock": product_data["stock"],
                    "last_updated": datetime.utcnow()
                }}
            )
        else:
            # If no sales record, create one
            sales_data_collection.insert_one({
                "product_id": ObjectId(product_id),
                "product_name": product_data["name"],
                "category": product_data["category"],
                "gender": product_data["gender"],
                "season": product_data["season"],
                "price": product_data["price"],
                "stock": product_data["stock"],
                "total_sold": 0,
                "total_revenue": 0,
                "growth_rate": 0.0,
                "historical_sales": [],
                "last_updated": datetime.utcnow()
            })

        if result.modified_count > 0:
            return jsonify({"success": True, "message": "Product updated successfully"})
        else:
            return jsonify({"success": False, "message": "No changes made to product"}), 200

    except Exception as e:
        print(f"Error in update_product API: {str(e)}")
        return jsonify({"success": False, "message": f"Error updating product: {str(e)}"}), 500



# Add a new endpoint to get customer data for your Node.js application
@app.route('/api/customers/all', methods=['GET'])
def get_all_customers():
    try:
        customers = list(customers_collection.find())
        customers = convert_object_ids(customers)  # Add this line
        
        # Format dates (keep this part)
        for customer in customers:
            # Convert dates to ISO format strings
            for date_field in ['createdAt', 'updatedAt', 'otpExpiration']:
                if date_field in customer and customer[date_field]:
                    customer[date_field] = customer[date_field].isoformat()
        
        return jsonify({"success": True, "customers": customers})
    
    except Exception as e:
        print(f"Error in get_all_customers API: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    

# Route to get all orders
@app.route("/orders", methods=["GET"])
def get_all_orders():
    try:
        orders = list(orders_collection.find())
        serialized_orders = [serialize(order) for order in orders]
        return jsonify(serialized_orders), 200
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return jsonify({"error": str(e)}), 500

# Route to get a single order by ID
@app.route("/orders/<string:order_id>", methods=["GET"])
def get_order_by_id(order_id):
    try:
        order = orders_collection.find_one({"_id": ObjectId(order_id)})
        if not order:
            return jsonify({"error": "Order not found"}), 404
        return jsonify(serialize(order)), 200
    except Exception as e:
        print(f"Error fetching order by ID: {e}")
        return jsonify({"error": "Invalid order ID"}), 400

@app.route('/api/orders/count', methods=['GET'])
def get_order_count():
    try:
        count = orders_collection.count_documents({})
        return jsonify({"success": True, "totalOrders": count})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500






#route to find the total sales, average order value, total revenue and conversion

#total salesfrom bson.son import SON  # Make sure you import this for sorting

@app.route('/api/metrics/total-sales-monthly')
def total_sales_monthly():
    try:
        pipeline = [
            {"$unwind": "$products"},
            {
                "$group": {
                    "_id": {
                        "month": {"$dateToString": {"format": "%Y-%m", "date": "$createdAt"}}
                    },
                    "monthlyTotalSales": {"$sum": "$products.quantity"}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "month": "$_id.month",
                    "monthlyTotalSales": 1
                }
            },
            {
                "$sort": SON([("month", 1)])
            }
        ]
        result = list(orders_collection.aggregate(pipeline))
        return jsonify({"success": True, "monthlySales": result})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500



#total revenue
@app.route('/api/metrics/total-revenue')
def total_revenue():
    try:
        pipeline = [{"$group": {"_id": None, "revenue": {"$sum": "$totalAmount"}}}]
        result = list(orders_collection.aggregate(pipeline))
        revenue = result[0]["revenue"] if result else 0
        return jsonify({"success": True, "totalRevenue": revenue})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

#average order value
@app.route('/api/metrics/average-order-value-monthly')
def average_order_value_monthly():
    try:
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "month": {"$dateToString": {"format": "%Y-%m", "date": "$createdAt"}}
                    },
                    "monthlyRevenue": {"$sum": "$totalAmount"},
                    "orderCount": {"$sum": 1}
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "month": "$_id.month",
                    "averageOrderValue": {
                        "$cond": [{"$eq": ["$orderCount", 0]}, 0, {"$divide": ["$monthlyRevenue", "$orderCount"]}]
                    }
                }
            },
            {
                "$sort": SON([("month", 1)])  # Sort by month ascending
            }
        ]

        result = list(orders_collection.aggregate(pipeline))
        return jsonify({"success": True, "monthlyAOV": result})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500



#average customer spend API
@app.route('/api/metrics/average-customer-spend')
def average_customer_spend():
    try:
        pipeline = [
            {"$group": {
                "_id": "$customerId",  # group by customer
                "totalSpentByCustomer": {"$sum": "$totalAmount"}
            }},
            {"$group": {
                "_id": None,
                "totalCustomerSpend": {"$sum": "$totalSpentByCustomer"},
                "customerCount": {"$sum": 1}
            }},
            {"$project": {
                "averageSpendPerCustomer": {
                    "$cond": [
                        {"$eq": ["$customerCount", 0]},
                        0,
                        {"$divide": ["$totalCustomerSpend", "$customerCount"]}
                    ]
                }
            }}
        ]
        result = list(orders_collection.aggregate(pipeline))
        avg = result[0]["averageSpendPerCustomer"] if result else 0
        return jsonify({"success": True, "avgCustomerSpend": round(avg, 2)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500




@app.route('/api/metrics/conversion-rate')
def conversion_rate():
    try:
        total_orders = orders_collection.count_documents({})
        total_visitors = 50000 
        rate = (total_orders / total_visitors) * 100 if total_visitors > 0 else 0
        return jsonify({"success": True, "conversionRate": round(rate, 2)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500




#gets the total sold item from the database to show the best selling item
# Route: Get Top Selling Products
# Route: Get Top Selling Products

@app.route('/api/products/topselling', methods=['GET'])
def get_top_selling_products():
    try:
        products = list(sales_data_collection.find())
        valid_products = []

        for p in products:
            historical_sales = p.get("historical_sales", [])

            # Calculate total quantity sold
            calculated_total_sold = sum(
                int(s.get("quantity", 0))
                for s in historical_sales
                if isinstance(s.get("quantity"), (int, float)) and s.get("quantity", 0) > 0
            )

            if calculated_total_sold > 0:
                # Convert IDs to string
                p["_id"] = str(p["_id"])
                if "product_id" in p:
                    product_id = p["product_id"]
                    p["product_id"] = str(product_id)

                    # 🔍 Fetch product details (stock, image) from product collection
                    product = products_collection.find_one({"_id": ObjectId(product_id)})
                    if product:
                        p["stock"] = product.get("stock", "N/A")

                        images = product.get("images", [])
                        p["image_url"] = images[0]["url"] if images and "url" in images[0] else ""

                # Convert nested sale _ids
                for sale in historical_sales:
                    if "_id" in sale and isinstance(sale["_id"], ObjectId):
                        sale["_id"] = str(sale["_id"])

                p["historical_sales"] = historical_sales
                p["calculated_total_sold"] = calculated_total_sold
                valid_products.append(p)

        # Sort and return top 5
        sorted_products = sorted(valid_products, key=lambda x: x["calculated_total_sold"], reverse=True)[:5]

        return jsonify({"success": True, "top_products": sorted_products})

    except Exception as e:
        print(f"Error fetching top-selling products: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    
# Add this below your existing route definitions


@app.route('/api/analytics/overview', methods=['GET'])
def get_analytics_overview():
    try:
        # Get time period filter (default to daily)
        time_period = request.args.get("period", "daily")
        
        # Calculate date ranges based on time period
        today = datetime.now()
        if time_period == "daily":
            start_date = today - timedelta(days=1)
            period_label = "daily"
        elif time_period == "weekly":
            start_date = today - timedelta(days=7)
            period_label = "weekly"
        elif time_period == "monthly":
            start_date = today - timedelta(days=30)
            period_label = "monthly"
        elif time_period == "yearly":
            start_date = today - timedelta(days=365)
            period_label = "yearly"
        
        # Modified query to use orderedAt instead of orderDate
        orders = list(orders_collection.find({
            "orderedAt": {"$gte": start_date, "$lte": today}
        }))
        
        # Previous period for comparison
        previous_period_start = start_date - (today - start_date)
        previous_period_orders = list(orders_collection.find({
            "orderedAt": {"$gte": previous_period_start, "$lt": start_date}
        }))
        
        # Calculate metrics
        
        # 1. Total Sales
        total_sales = sum(order.get("totalAmount", 0) for order in orders)
        previous_total_sales = sum(order.get("totalAmount", 0) for order in previous_period_orders)
        sales_change_percent = round(((total_sales - previous_total_sales) / previous_total_sales * 100) if previous_total_sales else 0, 1)
        
        # 2. Orders Count
        order_count = len(orders)
        previous_order_count = len(previous_period_orders)
        order_change_percent = round(((order_count - previous_order_count) / previous_order_count * 100) if previous_order_count else 0, 1)
        
        # 3. Average Order Value
        avg_order_value = round(total_sales / order_count, 2) if order_count else 0
        previous_avg_order_value = round(previous_total_sales / previous_order_count, 2) if previous_order_count else 0
        aov_change_percent = round(((avg_order_value - previous_avg_order_value) / previous_avg_order_value * 100) if previous_avg_order_value else 0, 1)
        
        # 4. Average Sales (daily)
        days_in_period = (today - start_date).days or 1
        avg_daily_sales = round(total_sales / days_in_period, 2)
        
        # 5. Items Sold
        items_sold = 0
        for order in orders:
            if "products" in order and isinstance(order["products"], list):
                for product in order["products"]:
                    items_sold += product.get("quantity", 0)
        
        # 6. Unique Customers
        unique_customers = len(set(str(order.get("customerId")) for order in orders if "customerId" in order))
        
        # 7. Conversion Rate
        # This might require session data, so using a placeholder or calculation based on available data
        total_visitors = 2000  
        conversion_rate = round((order_count / total_visitors * 100), 1) if total_visitors > 0 else 0
        
        # 8. Average Session Duration (placeholder or calculated value)
        avg_session_minutes = 4
        avg_session_seconds = 32
        session_duration_change = 12  # Percentage increase from last week
        
        # 9. Cart Abandonment Rate
        cart_abandonment_rate = 23.4
        cart_abandonment_change = -2  # Percentage decrease from last week
        
        # 10. Repeat Purchase Rate
        customer_order_counts = {}
        for order in orders:
            customer_id = str(order.get("customerId"))
            if customer_id:
                customer_order_counts[customer_id] = customer_order_counts.get(customer_id, 0) + 1
        
        repeat_customers = sum(1 for count in customer_order_counts.values() if count > 1)
        repeat_purchase_rate = round((repeat_customers / len(customer_order_counts) * 100), 0) if customer_order_counts else 0
        repeat_purchase_change = 5  # Percentage increase from last month
        
        # 11. Recent Transactions
        recent_transactions = []
        
        # Sort orders by date (newest first)
        sorted_orders = sorted(orders, key=lambda x: x.get("orderedAt", datetime.min), reverse=True)[:5]
        
        for order in sorted_orders:
            # Get customer name
            customer_name = "Unknown"
            if "customerId" in order:
                customer = customers_collection.find_one({"_id": ObjectId(str(order["customerId"]))})
                if customer:
                    customer_name = customer.get("username", "Unknown")
            
            # Get product name (first product in order)
            product_name = "Unknown"
            if "products" in order and len(order["products"]) > 0:
                product_id = order["products"][0].get("productId")
                if product_id:
                    product = products_collection.find_one({"_id": ObjectId(str(product_id))})
                    if product:
                        product_name = product.get("name", "Unknown")
            
            recent_transactions.append({
                "order_id": f"#{order.get('orderReference', '')}",                "customer": customer_name,
                "product": product_name,
                "date": order.get("orderedAt", "").strftime("%b %d, %Y") if isinstance(order.get("orderedAt"), datetime) else "",
                "amount": order.get("totalAmount", 0),
                "status": order.get("status", "Completed")
            })
        
        return jsonify({
            "total_sales": {
                "value": total_sales,
                "change_percent": sales_change_percent
            },
            "orders": {
                "value": order_count,
                "change_percent": order_change_percent
            },
            "average_order_value": {
                "value": avg_order_value,
                "change_percent": aov_change_percent
            },
            "average_sales_daily": avg_daily_sales,
            "items_sold": items_sold,
            "customers_count": unique_customers,
            "conversion_rate": conversion_rate,
            "avg_session_duration": {
                "value": f"{avg_session_minutes}m {avg_session_seconds}s",
                "change_percent": session_duration_change
            },
            "cart_abandonment_rate": {
                "value": cart_abandonment_rate,
                "change_percent": cart_abandonment_change
            },
            "repeat_purchase_rate": {
                "value": repeat_purchase_rate,
                "change_percent": repeat_purchase_change
            },
            "recent_transactions": recent_transactions,
            "time_period": period_label
        })
    
    except Exception as e:
        print(f"Error in analytics overview API: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500




#order's status API

#get the orders:-
@app.route('/api/orders/dashboard', methods=['GET'])
def get_order_dashboard():
    if db is None:
        return jsonify({"error": "Database connection failed."}), 500

    try:
        pipeline = [
            {
                '$lookup': {
                    'from': 'customers',
                    'localField': 'customerId',
                    'foreignField': '_id',
                    'as': 'customerInfo'
                }
            },
            { '$unwind': '$customerInfo' },
            {
                '$project': {
                    'orderReference': 1,
                    'orderedAt': 1,
                    'totalAmount': 1,
                    'status': 1,
                    'customerName': '$customerInfo.username',  # 👈 Add this line
                    'customerLocation': {
                        '$concat': [
                            { '$ifNull': ['$deliveryInfo.city', ''] },
                            ', ',
                            { '$ifNull': ['$deliveryInfo.postalCode', ''] }
                        ]
                    }
                }
            },

            {
                '$sort': {
                    'orderedAt': -1
                }
            }
        ]

        orders = list(orders_collection.aggregate(pipeline))
        return jsonify([serialize(order) for order in orders]), 200

    except Exception as e:
        print(f"❌ Error fetching orders: {str(e)}")
        return jsonify({"error": f"Failed to fetch order data. Details: {str(e)}"}), 500

    
#update the order
@app.route('/api/orders/<order_id>', methods=['PUT'])
def update_order(order_id):
    if db is None:
        return jsonify({"success": False, "error": "Database connection failed."}), 500

    try:
        # Get request data
        data = request.json
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({"success": False, "error": "Status field is required"}), 400
        
        # Convert string ID to ObjectId for MongoDB
        order_id_obj = ObjectId(order_id)
        
        # Update the order
        result = orders_collection.update_one(
            {"_id": order_id_obj},
            {"$set": {"status": new_status}}
        )
        
        if result.matched_count == 0:
            return jsonify({"success": False, "error": "Order not found"}), 404
            
        if result.modified_count == 0:
            return jsonify({"success": False, "error": "No changes made"}), 304
        
        return jsonify({"success": True, "message": "Order status updated successfully"}), 200
        
    except Exception as e:
        print(f"❌ Error updating order: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to update order. Details: {str(e)}"}), 500


#delete the orders
@app.route('/api/orders/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    # Check database connection first
    if db is None:
        print("❌ Database connection is None")
        return jsonify({"success": False, "error": "Database connection failed."}), 500
    
    try:
        # Add validation for order_id format
        if not order_id or len(order_id) != 24:
            return jsonify({"success": False, "error": "Invalid order ID format"}), 400
            
        # Convert string ID to ObjectId for MongoDB
        order_id_obj = ObjectId(order_id)
        
        # Ensure orders_collection is defined
        if 'orders_collection' not in globals() or orders_collection is None:
            print("❌ orders_collection is not defined")
            return jsonify({"success": False, "error": "Collection not initialized"}), 500
        
        # Delete the order
        result = orders_collection.delete_one({"_id": order_id_obj})
        
        if result.deleted_count == 0:
            return jsonify({"success": False, "error": "Order not found"}), 404
            
        return jsonify({
            "success": True, 
            "message": "Order deleted successfully",
            "deletedCount": result.deleted_count
        }), 200
        
    except Exception as e:
        error_message = str(e)
        print(f"❌ Error deleting order: {error_message}")
        
        # Provide more specific error messages
        if "Invalid ObjectId" in error_message:
            return jsonify({"success": False, "error": "Invalid order ID format"}), 400
            
        return jsonify({"success": False, "error": f"Failed to delete order. Details: {error_message}"}), 500
    

#promo code section
# Route to show the admin promo code dashboard
@app.route('/admin/promo-codes', methods=['GET'])
def admin_promo_codes():
    promo_codes = list(promo_codes_collection.find())
    promo_codes = convert_object_ids(promo_codes)
    return render_template('promo.html', promo_codes=promo_codes)

@app.route('/api/admin/promo-codes/add', methods=['POST'])
def add_promo_code():
    try:
        data = request.get_json()
        print("📥 Received promo data:", data)

        if not data:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400

        # Validate required fields
        if not data.get('code'):
            return jsonify({'success': False, 'message': 'Promo code is required'}), 400

        if not data.get('start_date'):
            return jsonify({'success': False, 'message': 'Start date is required'}), 400

        # Status
        status = True if data.get('status') == 'on' else False

        # Discount amount
        try:
            discount_amount = float(data.get('discount_amount') or 0)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid discount amount'}), 400

        # Usage limit
        try:
            usage_limit = int(data.get('usage_limit') or 0)
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid usage limit'}), 400

        # Dates
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'message': 'Invalid start date format (expected YYYY-MM-DD)'}), 400

        end_date = None
        if data.get('end_date'):
            try:
                end_date = datetime.strptime(data['end_date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid end date format (expected YYYY-MM-DD)'}), 400

        # Check if promo code already exists
        existing_code = promo_codes_collection.find_one({'code': data['code']})
        if existing_code:
            return jsonify({'success': False, 'message': 'Promo code already exists'}), 400

        # Prepare document
        promo_code = {
            'code': data['code'],
            'status': status,
            'discount_amount': discount_amount,
            'discount_type': data.get('discount_type', 'percentage'),
            'start_date': start_date,
            'end_date': end_date,
            'usage_limit': usage_limit,
            'usage_count': 0,
            'created_at': datetime.now()
        }

        # Insert
        result = promo_codes_collection.insert_one(promo_code)

        if result.inserted_id:
            return jsonify({'success': True, 'message': 'Promo code added successfully'}), 201
        else:
            return jsonify({'success': False, 'message': 'Failed to insert promo code'}), 500

    except Exception as e:
        print(f"🔥 Error adding promo code: {str(e)}")
        return jsonify({'success': False, 'message': f'Internal Server Error: {str(e)}'}), 500

# Route to get all promo codes (for the listing page)
@app.route('/admin/promo-codes/list', methods=['GET'])
def list_promo_codes():
    try:
        # Get filter parameter
        filter_status = request.args.get('filter', 'all')
        
        # Build query based on filter
        query = {}
        if filter_status == 'active':
            query['status'] = True
        elif filter_status == 'inactive':
            query['status'] = False
        
        # Get all promo codes
        promo_codes = list(promo_codes_collection.find(query).sort('created_at', -1))
        
        # Process data for JSON response
        for code in promo_codes:
            code['_id'] = str(code['_id'])
            if 'start_date' in code:
                code['start_date'] = code['start_date'].strftime('%Y-%m-%d')
            if 'end_date' in code and code['end_date']:
                code['end_date'] = code['end_date'].strftime('%Y-%m-%d')
            if 'created_at' in code:
                code['created_at'] = code['created_at'].strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({'success': True, 'data': promo_codes})
    
    except Exception as e:
        print(f"Error listing promo codes: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# Route to update a promo code
@app.route('/admin/promo-codes/update/<code_id>', methods=['POST'])
def update_promo_code(code_id):
    try:
        data = request.form
        
        # Process status value
        status = True if data.get('status') == 'on' else False
        
        # Convert discount amount to float
        discount_amount = float(data.get('discount_amount', 0))
        
        # Process dates
        start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d')
        end_date = None
        if data.get('end_date'):
            end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d')
        
        # Process usage limit
        usage_limit = int(data.get('usage_limit', 0))
        
        # Update values
        update_values = {
            '$set': {
                'code': data.get('code'),
                'status': status,
                'discount_amount': discount_amount,
                'discount_type': data.get('discount_type'),
                'start_date': start_date,
                'end_date': end_date,
                'usage_limit': usage_limit,
                'updated_at': datetime.now()
            }
        }
        
        # Check if code with new name already exists (if code was changed)
        existing_code = promo_codes_collection.find_one({'code': data.get('code'), '_id': {'$ne': ObjectId(code_id)}})
        if existing_code:
            return jsonify({'success': False, 'message': 'Another promo code with this code already exists'}), 400
        
        # Update the promo code
        result = promo_codes_collection.update_one({'_id': ObjectId(code_id)}, update_values)
        
        if result.modified_count > 0:
            return jsonify({'success': True, 'message': 'Promo code updated successfully'})
        else:
            return jsonify({'success': False, 'message': 'No changes made or promo code not found'}), 404
            
    except Exception as e:
        print(f"Error updating promo code: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# Route to delete a promo code
@app.route('/admin/promo-codes/delete/<code_id>', methods=['POST'])
def delete_promo_code(code_id):
    try:
        result = promo_codes_collection.delete_one({'_id': ObjectId(code_id)})
        
        if result.deleted_count > 0:
            return jsonify({'success': True, 'message': 'Promo code deleted successfully'})
        else:
            return jsonify({'success': False, 'message': 'Promo code not found'}), 404
            
    except Exception as e:
        print(f"Error deleting promo code: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500

# Function to validate a promo code (to be used in checkout)
def validate_promo_code(code):
    try:
        # Find the promo code
        promo_code = promo_codes_collection.find_one({'code': code})
        
        if not promo_code:
            return {'valid': False, 'message': 'Promo code not found'}
        
        # Check if active
        if not promo_code['status']:
            return {'valid': False, 'message': 'This promo code is inactive'}
        
        # Check date range
        current_date = datetime.now()
        if current_date < promo_code['start_date']:
            return {'valid': False, 'message': 'This promo code is not yet active'}
        
        if promo_code.get('end_date') and current_date > promo_code['end_date']:
            return {'valid': False, 'message': 'This promo code has expired'}
        
        # Check usage limit
        if promo_code['usage_limit'] > 0 and promo_code['usage_count'] >= promo_code['usage_limit']:
            return {'valid': False, 'message': 'This promo code has reached its usage limit'}
        
        # Promo code is valid
        discount_info = {
            'type': promo_code['discount_type'],
            'amount': promo_code['discount_amount']
        }
        
        return {
            'valid': True, 
            'discount': discount_info,
            'promo_code_id': str(promo_code['_id']),
            'message': 'Promo code applied successfully'
        }
        
    except Exception as e:
        print(f"Error validating promo code: {str(e)}")
        return {'valid': False, 'message': f'Error: {str(e)}'}

# API route to validate a promo code
@app.route('/api/validate-promo-code', methods=['POST'])
def api_validate_promo_code():
    try:
        data = request.json
        code = data.get('code', '').strip()
        
        if not code:
            return jsonify({'valid': False, 'message': 'Please enter a promo code'}), 400
        
        result = validate_promo_code(code)
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in promo code API: {str(e)}")
        return jsonify({'valid': False, 'message': f'Error: {str(e)}'}), 500

# Function to apply discount to an order amount
def apply_discount(amount, discount_info):
    if discount_info['type'] == 'percentage':
        discount = amount * (discount_info['amount'] / 100)
    else:  # fixed amount
        discount = discount_info['amount']
        # Ensure discount doesn't exceed amount
        if discount > amount:
            discount = amount
            
    return amount - discount, discount

# Function to increment usage count when a promo code is used
def increment_promo_code_usage(promo_code_id):
    try:
        promo_codes_collection.update_one(
            {'_id': ObjectId(promo_code_id)},
            {'$inc': {'usage_count': 1}}
        )
        return True
    except Exception as e:
        print(f"Error incrementing promo code usage: {str(e)}")
        return False



#forecast 


# Define feature order (MUST match training)
feature_cols = ['dayofweek', 'month', 'day', 'quarter', 'year', 'is_weekend', 
                'is_month_start', 'is_month_end', 'day_sin', 'day_cos'] + \
               [f'lag_{i}' for i in range(1, 15)] + \
               ['rolling_mean_3', 'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30',
                'day_change', '3d_momentum', '7d_momentum', '14d_momentum']



@app.route('/predict-sales', methods=['POST'])
def predict_sales():
    try:
        data = request.get_json()

        # Validate input
        required_fields = [
            'dayofweek', 'month', 'day', 'quarter', 'year', 'is_weekend', 
            'is_month_start', 'is_month_end', 'day_sin', 'day_cos',
            'lag_values',
            'rolling_mean_3', 'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30',
            'day_change', '3d_momentum', '7d_momentum', '14d_momentum',
            'last_actual'
        ]

        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        if not isinstance(data['lag_values'], list) or len(data['lag_values']) != 14:
            return jsonify({"error": "lag_values must be a list of 14 values"}), 400

        # Build feature vector in exact order
        feature_vector = [
            data['dayofweek'], data['month'], data['day'], data['quarter'], data['year'],
            data['is_weekend'], data['is_month_start'], data['is_month_end'],
            data['day_sin'], data['day_cos'],
            *data['lag_values'],
            data['rolling_mean_3'], data['rolling_mean_7'], data['rolling_mean_14'], data['rolling_mean_30'],
            data['day_change'], data['3d_momentum'], data['7d_momentum'], data['14d_momentum']
        ]

        # Scale and predict
        input_array = np.array(feature_vector).reshape(1, -1)
        input_scaled = scaler.transform(input_array)
        predicted_diff = model.predict(input_scaled)[0]
        print("Predicted Diff:", predicted_diff)
        predicted_sales = data['last_actual'] + predicted_diff
                # Apply clipping to prevent unrealistic spikes (limit ±20%)
        lower_bound = data['last_actual'] * 0.8
        upper_bound = data['last_actual'] * 1.2
        predicted_sales = np.clip(predicted_sales, lower_bound, upper_bound)


        return jsonify({
            "forecasted_sales": float(round(predicted_sales, 2))  # <-- Convert to native float
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def prepare_data(daily_sales):
    """Process sales data to create features needed for the model"""
    # Add time-based features
    daily_sales['dayofweek'] = daily_sales['sales_date'].dt.dayofweek
    daily_sales['month'] = daily_sales['sales_date'].dt.month
    daily_sales['day'] = daily_sales['sales_date'].dt.day
    daily_sales['quarter'] = daily_sales['sales_date'].dt.quarter
    daily_sales['year'] = daily_sales['sales_date'].dt.year
    daily_sales['is_weekend'] = daily_sales['dayofweek'].apply(lambda x: 1 if x >= 5 else 0)
    daily_sales['is_month_start'] = daily_sales['sales_date'].dt.is_month_start.astype(int)
    daily_sales['is_month_end'] = daily_sales['sales_date'].dt.is_month_end.astype(int)
    
    # Create lag features
    for i in range(1, 15):
        daily_sales[f'lag_{i}'] = daily_sales['sales_volume'].shift(i)
    
    # Add rolling window statistics
    daily_sales['rolling_mean_3'] = daily_sales['sales_volume'].rolling(window=3).mean().shift(1)
    daily_sales['rolling_mean_7'] = daily_sales['sales_volume'].rolling(window=7).mean().shift(1)
    daily_sales['rolling_mean_14'] = daily_sales['sales_volume'].rolling(window=14).mean().shift(1)
    daily_sales['rolling_mean_30'] = daily_sales['sales_volume'].rolling(window=30).mean().shift(1)
    
    # Add momentum features
    daily_sales['day_change'] = daily_sales['sales_volume'].pct_change()
    daily_sales['3d_momentum'] = daily_sales['sales_volume'].pct_change(3)
    daily_sales['7d_momentum'] = daily_sales['sales_volume'].pct_change(7)
    daily_sales['14d_momentum'] = daily_sales['sales_volume'].pct_change(14)
    
    # Add cyclical features
    daily_sales['day_sin'] = np.sin(2 * np.pi * daily_sales['dayofweek'] / 7)
    daily_sales['day_cos'] = np.cos(2 * np.pi * daily_sales['dayofweek'] / 7)
    
    return daily_sales

def generate_forecast(daily_sales, days=14):
    """Generate sales forecast using the trained model"""
    # Load the model and scaler
    global model, scaler
    
    # Define feature columns
    feature_cols = ['dayofweek', 'month', 'day', 'quarter', 'year', 'is_weekend',
                   'is_month_start', 'is_month_end', 'day_sin', 'day_cos'] + \
                  [f'lag_{i}' for i in range(1, 15)] + \
                  ['rolling_mean_3', 'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30',
                   'day_change', '3d_momentum', '7d_momentum', '14d_momentum']
    
    # Drop NaN values
    daily_sales = daily_sales.dropna().reset_index(drop=True)
    
    # Create future dates dataframe
    last_date = daily_sales['sales_date'].max()
    forecast_df = pd.DataFrame({
        'sales_date': [last_date + pd.Timedelta(days=i+1) for i in range(days)]
    })
    
    # Add calendar features
    forecast_df['dayofweek'] = forecast_df['sales_date'].dt.dayofweek
    forecast_df['month'] = forecast_df['sales_date'].dt.month
    forecast_df['day'] = forecast_df['sales_date'].dt.day
    forecast_df['quarter'] = forecast_df['sales_date'].dt.quarter
    forecast_df['year'] = forecast_df['sales_date'].dt.year
    forecast_df['is_weekend'] = forecast_df['dayofweek'].apply(lambda x: 1 if x >= 5 else 0)
    forecast_df['is_month_start'] = forecast_df['sales_date'].dt.is_month_start.astype(int)
    forecast_df['is_month_end'] = forecast_df['sales_date'].dt.is_month_end.astype(int)
    forecast_df['day_sin'] = np.sin(2 * np.pi * forecast_df['dayofweek'] / 7)
    forecast_df['day_cos'] = np.cos(2 * np.pi * forecast_df['dayofweek'] / 7)
    
    # Initialize features for forecasting
    for i in range(1, 15):
        forecast_df.loc[0, f'lag_{i}'] = daily_sales['sales_volume'].iloc[-i]
    
    # Initialize rolling means
    last_values = daily_sales['sales_volume'].iloc[-30:].values
    forecast_df.loc[0, 'rolling_mean_3'] = np.mean(last_values[-3:])
    forecast_df.loc[0, 'rolling_mean_7'] = np.mean(last_values[-7:])
    forecast_df.loc[0, 'rolling_mean_14'] = np.mean(last_values[-14:])
    forecast_df.loc[0, 'rolling_mean_30'] = np.mean(last_values[-30:])
    
    # Initialize momentum features
    forecast_df.loc[0, 'day_change'] = (daily_sales['sales_volume'].iloc[-1] / daily_sales['sales_volume'].iloc[-2]) - 1
    forecast_df.loc[0, '3d_momentum'] = (daily_sales['sales_volume'].iloc[-1] / daily_sales['sales_volume'].iloc[-4]) - 1
    forecast_df.loc[0, '7d_momentum'] = (daily_sales['sales_volume'].iloc[-1] / daily_sales['sales_volume'].iloc[-8]) - 1
    forecast_df.loc[0, '14d_momentum'] = (daily_sales['sales_volume'].iloc[-1] / daily_sales['sales_volume'].iloc[-15]) - 1
    
    # Make forecasts
    forecast_sales = []
    for i in range(days):
        # Prepare features for current prediction
        X_forecast = forecast_df[feature_cols].iloc[i:i+1]
        X_forecast_scaled = scaler.transform(X_forecast)
        
        # Make prediction
        forecast = model.predict(X_forecast_scaled)[0]
        forecast_sales.append(forecast)
        
        # Update features for next day if not the last day
        if i < days - 1:
            # Update lag features
            for j in range(14, 1, -1):
                forecast_df.loc[i+1, f'lag_{j}'] = forecast_df.loc[i, f'lag_{j-1}']
            forecast_df.loc[i+1, 'lag_1'] = forecast
            
            # Update rolling means and momentum features as in your original code
            # (similar implementation as in your training notebook)
            
    # Return forecast results
    return pd.DataFrame({
        'Date': forecast_df['sales_date'],
        'Forecasted_Sales': forecast_sales
    })

@app.route('/api/forecast', methods=['GET'])
def get_combined_forecast():
    try:
        days = int(request.args.get('days', 14))  # default to 14
        # Read from CSV_products
        csv_products = list(db.CSV_products.find({}, {'sales_volume': 1, 'sales_date': 1}))
        csv_sales = [
            {
                "sales_date": pd.to_datetime(doc["sales_date"]),
                "sales_volume": doc["sales_volume"]
            }
            for doc in csv_products if "sales_date" in doc and "sales_volume" in doc
        ]

        # Read from orders
        orders = list(orders_collection.find({}, {"products": 1, "orderedAt": 1}))
        order_sales = []
        order_counts_by_date = {}  # Track order counts by date
        
        for order in orders:
            order_date = order.get("orderedAt")
            if order_date:
                # Convert to datetime object for consistent formatting
                order_date_dt = pd.to_datetime(order_date)
                date_key = order_date_dt.strftime('%Y-%m-%d')
                
                # Count orders
                if date_key in order_counts_by_date:
                    order_counts_by_date[date_key] += 1
                else:
                    order_counts_by_date[date_key] = 1
                
                # Track sales volumes
                for item in order.get("products", []):
                    quantity = item.get("quantity", 0)
                    order_sales.append({
                        "sales_date": order_date_dt,
                        "sales_volume": quantity
                    })

        # Combine CSV + Order sales
        all_sales = pd.DataFrame(csv_sales + order_sales)
        daily_sales = all_sales.groupby("sales_date")["sales_volume"].sum().reset_index()

        # Create daily order counts dataframe
        order_counts_df = pd.DataFrame([
            {"sales_date": pd.to_datetime(date), "order_count": count}
            for date, count in order_counts_by_date.items()
        ])

        # Forecasting sales volume
        processed_data = prepare_data(daily_sales)
        forecast_result = generate_forecast(processed_data, days=days)
        
        # Generate order count forecast based on historical ratio
        # Calculate average order size (items per order)
        avg_order_size = None
        
        if len(order_counts_df) > 0:
            # Merge sales and order counts
            merged_data = pd.merge(
                daily_sales, 
                order_counts_df, 
                on="sales_date", 
                how="left"
            ).fillna(0)
            
            # Calculate average items per order over the last 30 days
            recent_data = merged_data.tail(30)
            total_items = recent_data["sales_volume"].sum()
            total_orders = recent_data["order_count"].sum()
            
            if total_orders > 0:
                avg_order_size = total_items / total_orders
            else:
                # Fallback if no order data
                avg_order_size = 3.0  # Default assumption
        else:
            # No order data available, use reasonable default
            avg_order_size = 3.0
        
        # Generate the forecast results with orders included
        forecast_list = []
        for _, row in forecast_result.iterrows():
            sales_forecast = float(round(row["Forecasted_Sales"], 2))
            # Estimate order count from sales forecast using average order size
            order_forecast = round(sales_forecast / avg_order_size) if avg_order_size else 0
            
            forecast_list.append({
                "date": row["Date"].strftime('%Y-%m-%d'),
                "forecast": sales_forecast,
                "orders": order_forecast
            })

        return jsonify({
            "forecast": forecast_list,
            "metrics": {
                "avg_order_size": round(avg_order_size, 2) if avg_order_size else 0
            }
        })
    
    except Exception as e:
        print(f"❌ Forecast Error: {e}")
        return jsonify({"error": str(e)}), 500




@app.route('/api/sales-data', methods=['GET'])
def get_sales_data():
    """
    API endpoint to get combined historical sales data and forecast
    
    Query Parameters:
    - days_history: Number of historical days to fetch (default: 30)
    - days_forecast: Number of forecast days to generate (default: 14)
    - view: Type of data to return - 'all', 'historical', 'forecast' (default: 'all')
    - forecast_from_date: ISO string date to start forecast from (default: current date)
    - date: Specific date to get total sales for (format: YYYY-MM-DD)
    
    Returns:
    - Historical sales data (aggregated by day)
    - Forecasted sales data
    - Order counts for both historical and forecast periods
    - If date parameter is provided, returns total sales for that specific date
    """
    try:
        # Check if a specific date was requested
        specific_date = request.args.get('date')
        
        if specific_date:
            # User wants aggregated data for a specific date
            try:
                # Parse the date
                target_date = datetime.fromisoformat(specific_date)
                # Get next day to create a range
                next_day = target_date + timedelta(days=1)
                
                # Get data from CSV_products for the specific date
                csv_products = list(db.CSV_products.find(
                    {"sales_date": {"$gte": target_date, "$lt": next_day}},
                    {'sales_volume': 1, 'sales_date': 1, '_id': 0}
                ))
                
                csv_sales_total = sum(doc.get("sales_volume", 0) for doc in csv_products)
                
                # Get data from orders collection for the specific date
                orders = list(orders_collection.find(
                    {"orderedAt": {"$gte": target_date, "$lt": next_day}},
                    {"products": 1, "orderedAt": 1, "_id": 0}
                ))
                
                order_sales_total = 0
                order_count = len(orders)
                
                for order in orders:
                    for item in order.get("products", []):
                        quantity = item.get("quantity", 0)
                        order_sales_total += quantity
                
                # Combine totals
                total_sales = csv_sales_total + order_sales_total
                
                # Return the aggregated data
                return jsonify({
                    "success": True,
                    "date": specific_date,
                    "total_sales": float(total_sales),
                    "total_orders": order_count
                })
            
            except ValueError:
                return jsonify({
                    "success": False, 
                    "error": f"Invalid date format: {specific_date}. Please use YYYY-MM-DD format."
                }), 400
        
        # Parse query parameters for the original functionality
        days_history = int(request.args.get('days_history', 30))
        days_forecast = int(request.args.get('days_forecast', 14))
        view_type = request.args.get('view', 'all')  # 'all', 'historical', 'forecast'
        
        # Get the forecast date from query param or use current date
        forecast_from_date_str = request.args.get('forecast_from_date')
        if forecast_from_date_str:
            try:
                forecast_from_date = datetime.fromisoformat(forecast_from_date_str.replace('Z', '+00:00'))
            except ValueError:
                # If parsing fails, use current date
                forecast_from_date = datetime.now()
        else:
            forecast_from_date = datetime.now()
            
        # Calculate date ranges
        end_date = forecast_from_date
        start_date = end_date - timedelta(days=days_history)
        
        # Get historical data from MongoDB
        # 1. From CSV_products collection
        csv_products = list(db.CSV_products.find(
            {"sales_date": {"$gte": start_date}},
            {'sales_volume': 1, 'sales_date': 1, '_id': 0}
        ))
        
        csv_sales = [
            {
                "sales_date": pd.to_datetime(doc["sales_date"]),
                "sales_volume": doc["sales_volume"]
            }
            for doc in csv_products if "sales_date" in doc and "sales_volume" in doc
        ]
        
        # 2. From orders collection
        orders = list(orders_collection.find(
            {"orderedAt": {"$gte": start_date}},
            {"products": 1, "orderedAt": 1, "_id": 0}
        ))
        
        order_sales = []
        order_counts_by_date = {}  # Track order counts by date
        
        for order in orders:
            order_date = order.get("orderedAt")
            if order_date:
                # Convert to datetime object for consistent formatting
                order_date_dt = pd.to_datetime(order_date)
                date_key = order_date_dt.strftime('%Y-%m-%d')
                
                # Count orders
                if date_key in order_counts_by_date:
                    order_counts_by_date[date_key] += 1
                else:
                    order_counts_by_date[date_key] = 1
                
                # Track sales volumes
                for item in order.get("products", []):
                    quantity = item.get("quantity", 0)
                    order_sales.append({
                        "sales_date": order_date_dt,
                        "sales_volume": quantity
                    })
        
        # Combine historical data
        all_sales = pd.DataFrame(csv_sales + order_sales)
        
        # Group by date and sum sales volume
        if not all_sales.empty:
            daily_sales = all_sales.groupby("sales_date")["sales_volume"].sum().reset_index()
            
            # Create order counts dataframe
            order_counts_df = pd.DataFrame([
                {"sales_date": pd.to_datetime(date), "order_count": count}
                for date, count in order_counts_by_date.items()
            ])
            
            # Merge sales and order counts
            historical_df = pd.merge(
                daily_sales, 
                order_counts_df, 
                on="sales_date", 
                how="left"
            ).fillna(0)
        else:
            # Create empty dataframe if no data found
            historical_df = pd.DataFrame(columns=["sales_date", "sales_volume", "order_count"])
        
        # Group historical data by date and aggregate
        # This ensures we have only one entry per date with totals
        historical_data = []
        if not historical_df.empty:
            # Convert sales_date to string format for grouping
            historical_df['date_str'] = historical_df['sales_date'].dt.strftime('%Y-%m-%d')
            
            # Group by the string date and sum
            daily_totals = historical_df.groupby('date_str').agg({
                'sales_volume': 'sum',
                'order_count': 'sum'
            }).reset_index()
            
            # Format for API response
            for _, row in daily_totals.iterrows():
                historical_data.append({
                    "date": row["date_str"],
                    "sales": float(row["sales_volume"]),
                    "orders": int(row["order_count"])
                })
            
        # Generate forecast if requested
        forecast_data = []
        if view_type in ['all', 'forecast']:
            # We need more historical data for forecasting than just what we display
            # So get all available data for the model
            all_historical_sales = all_sales.copy()
            if not all_historical_sales.empty:
                # Process for forecasting
                processed_data = prepare_data(all_historical_sales.groupby("sales_date")["sales_volume"].sum().reset_index())
                forecast_result = generate_forecast(processed_data, days=days_forecast)
                
                # Calculate average order size for order count prediction
                avg_order_size = None
                if len(order_counts_df) > 0:
                    merged_data = pd.merge(
                        daily_sales, 
                        order_counts_df, 
                        on="sales_date", 
                        how="left"
                    ).fillna(0)
                    
                    recent_data = merged_data.tail(30)
                    total_items = recent_data["sales_volume"].sum()
                    total_orders = recent_data["order_count"].sum()
                    
                    if total_orders > 0:
                        avg_order_size = total_items / total_orders
                    else:
                        avg_order_size = 3.0  # Default assumption
                else:
                    avg_order_size = 3.0
                
                # Format forecast data
                for _, row in forecast_result.iterrows():
                    sales_forecast = float(round(row["Forecasted_Sales"], 2))
                    order_forecast = round(sales_forecast / avg_order_size) if avg_order_size else 0
                    
                    forecast_data.append({
                        "date": row["Date"].strftime('%Y-%m-%d'),
                        "sales": sales_forecast,
                        "orders": int(order_forecast)
                    })
        
        # Prepare the response based on the requested view
        response = {
            "success": True,
            "metrics": {
                "total_historical_days": len(historical_data),
                "total_forecast_days": len(forecast_data),
                "forecast_from_date": forecast_from_date.strftime('%Y-%m-%d')
            }
        }
        
        if view_type in ['all', 'historical']:
            response["historical"] = historical_data
            
        if view_type in ['all', 'forecast']:
            response["forecast"] = forecast_data
            
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Sales Data API Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# New endpoint to get today's sales
@app.route('/api/sales-today', methods=['GET'])
def get_today_sales():
    """
    API endpoint to get total sales for today
    
    Returns:
    - Total sales for today
    - Total order count for today
    """
    try:
        # Get today's date
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        # Get data from CSV_products for today
        csv_products = list(db.CSV_products.find(
            {"sales_date": {"$gte": today, "$lt": tomorrow}},
            {'sales_volume': 1, '_id': 0}
        ))
        
        csv_sales_total = sum(doc.get("sales_volume", 0) for doc in csv_products)
        
        # Get data from orders collection for today
        orders = list(orders_collection.find(
            {"orderedAt": {"$gte": today, "$lt": tomorrow}},
            {"products": 1, "_id": 0}
        ))
        
        order_sales_total = 0
        order_count = len(orders)
        
        for order in orders:
            for item in order.get("products", []):
                quantity = item.get("quantity", 0)
                order_sales_total += quantity
        
        # Combine totals
        total_sales = csv_sales_total + order_sales_total
        
        return jsonify({
            "success": True,
            "date": today.strftime('%Y-%m-%d'),
            "total_sales": float(total_sales),
            "total_orders": order_count
        })
    
    except Exception as e:
        print(f"❌ Today's Sales API Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# Frontend API that combines both historical and forecast data for the chart
# Modified API backend code
@app.route('/api/chart-data', methods=['GET'])
def get_chart_data():
    """
    API endpoint to get data formatted specifically for the sales chart
    
    Query Parameters:
    - days_history: Number of historical days to fetch (default: 30)
    - days_forecast: Number of forecast days to generate (default: 14)
    - view: Type of data to return - 'combined', 'historical', 'forecast' (default: 'combined')
    - forecastFromDate: ISO string date to start forecast from (default: current date)
    
    Returns:
    - Data formatted for the chart component
    """
    try:
        # Get request parameters with defaults
        days_history = int(request.args.get('days_history', 30))
        days_forecast = int(request.args.get('days_forecast', 14))
        
        # Get the forecast date parameter - if not provided use current date
        forecast_from_date = request.args.get('forecastFromDate')
        if not forecast_from_date:
            forecast_from_date = datetime.now().isoformat()
        
        # Create parameters for the sales data endpoint
        params = {
            'days_history': days_history,
            'days_forecast': days_forecast,
            'view': 'all',
            'forecast_from_date': forecast_from_date
        }
            
        # Store the original request args
        original_args = request.args
        
        # Override request.args temporarily
        request.args = params
        
        # Call the main API function directly to avoid HTTP overhead
        sales_response = get_sales_data()
        
        # Restore original request args
        request.args = original_args
        
        # Parse the response
        sales_data = json.loads(sales_response.data)
        
        if not sales_data.get("success", False):
            return jsonify({"success": False, "error": "Failed to fetch sales data"}), 500
            
        # Process the data for the chart
        chart_data = {
            "success": True,
            "labels": [],
            "datasets": [
                {
                    "label": "Historical Sales",
                    "data": [],
                    "borderColor": "rgba(95, 145, 255, 1)",
                    "backgroundColor": "rgba(95, 145, 255, 0.3)",
                    "fill": True
                },
                {
                    "label": "Forecasted Sales",
                    "data": [],
                    "borderColor": "rgba(186, 85, 211, 1)",
                    "backgroundColor": "rgba(186, 85, 211, 0.3)",
                    "borderDash": [5, 5],
                    "fill": True
                }
            ]
        }
        
        # Add historical data
        if "historical" in sales_data:
            for item in sales_data["historical"]:
                # We'll use a placeholder for the forecasted values during historical period
                chart_data["labels"].append(item["date"])
                chart_data["datasets"][0]["data"].append(item["sales"])
                chart_data["datasets"][1]["data"].append(None)  # No forecast for historical dates
        
        # Add forecast data
        if "forecast" in sales_data:
            historical_end_value = None
            if chart_data["datasets"][0]["data"]:
                historical_end_value = chart_data["datasets"][0]["data"][-1]
            
            for i, item in enumerate(sales_data["forecast"]):
                chart_data["labels"].append(item["date"])
                
                # For the combined view, we show the forecast continuing from historical
                if i == 0 and historical_end_value is not None:
                    chart_data["datasets"][0]["data"].append(historical_end_value)
                else:
                    chart_data["datasets"][0]["data"].append(None)  # No historical data for forecast dates
                
                chart_data["datasets"][1]["data"].append(item["sales"])
        
        # Add additional metrics
        chart_data["metrics"] = sales_data.get("metrics", {})
        # Add the current date and forecast from date for reference
        chart_data["metrics"]["current_date"] = datetime.now().strftime('%Y-%m-%d')
        chart_data["metrics"]["forecast_from"] = params["forecast_from_date"]
            
        return jsonify(chart_data)
    
    except Exception as e:
        print(f"❌ Chart Data API Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


#api routes for reward section

@app.route("/api/rewards", methods=["POST"])
def add_reward():
    data = request.json
    required_fields = ["title", "description", "points_required"]

    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    reward = {
        "title": data["title"],
        "description": data["description"],
        "points_required": int(data["points_required"]),
        "active": True,
        "created_at": datetime.utcnow()
    }

    # Add discount info if present
    if "discount" in data:
        discount = data["discount"]
        if not isinstance(discount, dict) or "type" not in discount or "value" not in discount:
            return jsonify({"success": False, "message": "Invalid discount format"}), 400

        if discount["type"] not in ["percentage", "fixed"]:
            return jsonify({"success": False, "message": "Discount type must be 'percentage' or 'fixed'"}), 400

        reward["discount"] = {
            "type": discount["type"],
            "value": float(discount["value"])
        }

    result = rewards_collection.insert_one(reward)
    return jsonify({"success": True, "message": "Reward added successfully", "reward_id": str(result.inserted_id)}), 201


@app.route("/api/rewards/get", methods=["GET"])
def get_all_rewards():
    rewards = list(rewards_collection.find())
    
    # Convert ObjectId and datetime to string
    for reward in rewards:
        reward["_id"] = str(reward["_id"])
        reward["created_at"] = reward["created_at"].isoformat() if "created_at" in reward else None
    
    return jsonify(rewards), 200



@app.route("/api/rewards/<reward_id>", methods=["PUT"])
def update_reward(reward_id):
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "No data received"}), 400

    update_fields = {
        "title": data.get("title"),
        "description": data.get("description"),
        "points_required": data.get("points_required"),
        "active": data.get("active", True)
    }

    if "discount" in data:
        discount = data["discount"]
        if not isinstance(discount, dict) or "type" not in discount or "value" not in discount:
            return jsonify({"success": False, "message": "Invalid discount format"}), 400

        if discount["type"] not in ["percentage", "fixed"]:
            return jsonify({"success": False, "message": "Discount type must be 'percentage' or 'fixed'"}), 400

        update_fields["discount"] = {
            "type": discount["type"],
            "value": float(discount["value"])
        }

    result = rewards_collection.update_one(
        {"_id": ObjectId(reward_id)},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        return jsonify({"success": False, "message": "Reward not found"}), 404

    return jsonify({"success": True, "message": "Reward updated successfully"}), 200



@app.route("/api/rewards/<reward_id>", methods=["DELETE"])
def delete_reward(reward_id):
    try:
        result = rewards_collection.delete_one({"_id": ObjectId(reward_id)})
        if result.deleted_count == 1:
            return jsonify({"success": True, "message": "Reward deleted successfully!"}), 200
        else:
            return jsonify({"success": False, "message": "Reward not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": f"Error deleting reward: {str(e)}"}), 500




    
@app.route('/list-routes')
def list_routes():
    output = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(sorted(rule.methods))
        line = f"{rule.endpoint}: {rule.rule} [{methods}]"
        output.append(line)
    return "<pre>" + "\n".join(output) + "</pre>"


app.register_blueprint(predict_bp)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)



