const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String, unique: true },
    description: { type: String },
    price: { type: Number, required: true },
    discount_price: { type: Number },
    category: { type: String, required: true },
    gender: { type: String },
    stock: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    trending: { type: Boolean, default: false },
    season: { type: String },
    sizes: { type: [String] },
    colors: { type: [String] },
    material: { type: String },
    tags: { type: [String] },
    release_date: { type: Date },
    weight: { type: Number },
    // Update the images schema to handle objects with url and public_id
    images: [{ 
        url: { type: String },
        public_id: { type: String }
    }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Ensure the model is registered only once
const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
module.exports = Product;