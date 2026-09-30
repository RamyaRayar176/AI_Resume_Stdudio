from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash

from backend.database import create_user, get_user_by_email, create_admin, get_admin_by_email

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():

    data = request.json

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400

    user = create_user(name, email, generate_password_hash(password))

    if user is None:
        return jsonify({"message": "User already exists"}), 409

    return jsonify({
        "message": "User Registered Successfully",
        "user": {
            "name": user["name"], 
            "email": user["email"], 
            "role": "student",
            "is_first_login": True
        }
    })


@auth_bp.route("/login", methods=["POST"])
def login():

    data = request.json

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400

    user = get_user_by_email(email)

    if user and check_password_hash(user["password"], password):
        current_login_count = user.get("login_count") or 0
        new_login_count = current_login_count + 1
        
        # Update login_count in database
        from backend.database import get_connection, _placeholder, _execute
        connection = get_connection()
        placeholder = _placeholder(connection)
        _execute(
            connection,
            f"UPDATE users SET login_count = {placeholder} WHERE email = {placeholder}",
            (new_login_count, email),
        )
        connection.close()

        is_first_login = (current_login_count == 0)

        return jsonify({
            "message": "Login Successful",
            "user": {
                "name": user["name"], 
                "email": user["email"], 
                "role": "student",
                "is_first_login": is_first_login
            }
        })

    return jsonify({
        "message": "Invalid Credentials"
    }), 401


@auth_bp.route("/admin/register", methods=["POST"])
def admin_register():
    data = request.json
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
        
    admin = create_admin(email, generate_password_hash(password))
    if admin is None:
        return jsonify({"message": "Admin already exists"}), 409
        
    return jsonify({
        "message": "Admin Registered Successfully",
        "user": {"email": admin["email"], "role": "admin"}
    })


@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    
    if not email or not password:
        return jsonify({"message": "Email and password are required"}), 400
        
    admin = get_admin_by_email(email)
    if admin and check_password_hash(admin["password"], password):
        return jsonify({
            "message": "Admin Login Successful",
            "user": {"email": admin["email"], "role": "admin"}
        })
        
    return jsonify({"message": "Invalid Admin Credentials"}), 401