from flask import Blueprint, request, jsonify
from bson.objectid import ObjectId
from datetime import datetime

admin_rewards_bp = Blueprint("admin_rewards", __name__)

# Assuming db is already defined in run.py
from run import db
rewards_collection = db["rewards"]

@admin_rewards_bp.route("/api/admin/rewards", methods=["POST"])
def add_reward():
    data = request.json
    required_fields = ["title", "description", "points_required", "category"]
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    reward = {
        "title": data["title"],
        "description": data["description"],
        "points_required": int(data["points_required"]),
        "category": data["category"],
        "active": True,
        "created_at": datetime.utcnow()
    }

    result = rewards_collection.insert_one(reward)
    return jsonify({"message": "Reward added", "reward_id": str(result.inserted_id)}), 201

@admin_rewards_bp.route("/api/admin/rewards/<reward_id>", methods=["PUT"])
def update_reward(reward_id):
    data = request.json
    update_fields = {k: v for k, v in data.items() if k in ["title", "description", "points_required", "category", "active"]}
    result = rewards_collection.update_one({"_id": ObjectId(reward_id)}, {"$set": update_fields})
    
    if result.matched_count == 0:
        return jsonify({"error": "Reward not found"}), 404

    return jsonify({"message": "Reward updated"}), 200

@admin_rewards_bp.route("/api/admin/rewards/<reward_id>", methods=["DELETE"])
def delete_reward(reward_id):
    result = rewards_collection.delete_one({"_id": ObjectId(reward_id)})
    if result.deleted_count == 0:
        return jsonify({"error": "Reward not found"}), 404
    return jsonify({"message": "Reward deleted"}), 200
