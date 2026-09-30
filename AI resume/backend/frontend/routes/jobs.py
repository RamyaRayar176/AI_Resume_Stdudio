from flask import Blueprint, request, jsonify
from backend.database import (
    get_all_jobs,
    get_all_internships,
    get_student_applications,
    create_or_update_application
)

jobs_bp = Blueprint("jobs_bp", __name__)


@jobs_bp.route("/jobs", methods=["GET"])
def get_jobs_list():
    try:
        jobs = get_all_jobs()
        return jsonify(jobs)
    except Exception as e:
        return jsonify({"message": f"Error fetching jobs: {str(e)}"}), 500


@jobs_bp.route("/internships", methods=["GET"])
def get_internships_list():
    try:
        internships = get_all_internships()
        return jsonify(internships)
    except Exception as e:
        return jsonify({"message": f"Error fetching internships: {str(e)}"}), 500


@jobs_bp.route("/applications", methods=["GET"])
def get_applications_list():
    try:
        email = request.args.get("email")
        if not email:
            return jsonify({"message": "Email is required"}), 400
        
        apps = get_student_applications(email)
        jobs = {j["id"]: j for j in get_all_jobs()}
        internships = {i["id"]: i for i in get_all_internships()}
        
        enriched_apps = []
        for app in apps:
            item_id = app["item_id"]
            item_type = app["type"]
            
            details = None
            if item_type == "job" and item_id in jobs:
                details = jobs[item_id]
            elif item_type == "internship" and item_id in internships:
                details = internships[item_id]
                
            if details:
                app_dict = dict(app)
                app_dict["details"] = details
                enriched_apps.append(app_dict)
                
        return jsonify(enriched_apps)
    except Exception as e:
        return jsonify({"message": f"Error fetching applications: {str(e)}"}), 500


@jobs_bp.route("/applications/apply", methods=["POST"])
def apply_item():
    try:
        data = request.json
        email = data.get("email")
        item_type = data.get("type")  # 'job' or 'internship'
        item_id = data.get("item_id")
        status = data.get("status", "Applied")
        
        if not email or not item_type or not item_id:
            return jsonify({"message": "Email, type, and item_id are required"}), 400
            
        create_or_update_application(email, item_type, int(item_id), status)
        return jsonify({"message": f"Successfully tracked application status as '{status}'"})
    except Exception as e:
        return jsonify({"message": f"Error applying: {str(e)}"}), 500


@jobs_bp.route("/applications/save", methods=["POST"])
def save_item():
    try:
        data = request.json
        email = data.get("email")
        item_type = data.get("type")
        item_id = data.get("item_id")
        
        if not email or not item_type or not item_id:
            return jsonify({"message": "Email, type, and item_id are required"}), 400
            
        create_or_update_application(email, item_type, int(item_id), "Pending")
        return jsonify({"message": "Successfully saved for tracking"})
    except Exception as e:
        return jsonify({"message": f"Error saving: {str(e)}"}), 500
