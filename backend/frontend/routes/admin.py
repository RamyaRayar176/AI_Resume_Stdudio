from flask import Blueprint, request, jsonify, send_file, session
import os
from pathlib import Path
from functools import wraps

from backend.database import (
    get_connection,
    _execute,
    _placeholder,
    get_all_users,
    get_all_predictions,
    get_all_resumes,
    get_student_skills,
    get_all_applications,
    get_all_jobs,
    get_all_internships
)

admin_bp = Blueprint("admin", __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("role") != "admin":
            return jsonify({"message": "Unauthorized access"}), 401
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route("/admin/dashboard", methods=["GET"])
@admin_required
def admin_dashboard():
    try:
        users = get_all_users()
        resumes = get_all_resumes()
        predictions = get_all_predictions()

        # Group by email to find the latest prediction for each student
        latest_predictions = {}
        for p in predictions:
            email = p["user_email"]
            if email and email not in latest_predictions:
                latest_predictions[email] = p

        # Count placement outlook distributions
        outlook_dist = {
            "Excellent (>=80%)": 0,
            "Good (60-79%)": 0,
            "Moderate (40-59%)": 0,
            "Needs Attention (<40%)": 0
        }

        total_prob = 0.0
        for p in latest_predictions.values():
            prob = float(p["probability"])
            total_prob += prob
            if prob >= 80:
                outlook_dist["Excellent (>=80%)"] += 1
            elif prob >= 60:
                outlook_dist["Good (60-79%)"] += 1
            elif prob >= 40:
                outlook_dist["Moderate (40-59%)"] += 1
            else:
                outlook_dist["Needs Attention (<40%)"] += 1

        avg_placement_probability = round(total_prob / len(latest_predictions), 2) if latest_predictions else 0.0

        # Query all student skills progress
        connection = get_connection()
        cursor = _execute(connection, "SELECT user_email, career_goal, skill_name, completed FROM student_skills")
        rows = cursor.fetchall()
        connection.close()
        all_skills = [dict(r) for r in rows] if rows else []

        total_skills = len(all_skills)
        completed_skills = sum(1 for s in all_skills if s["completed"] == 1)
        completion_rate = round((completed_skills / total_skills) * 100, 2) if total_skills else 0.0

        # Aggregate skills statistics (most completed skills)
        skill_stats = {}
        career_goal_stats = {}
        for s in all_skills:
            # Skill completions count
            name = s["skill_name"]
            if name not in skill_stats:
                skill_stats[name] = {"total": 0, "completed": 0}
            skill_stats[name]["total"] += 1
            if s["completed"] == 1:
                skill_stats[name]["completed"] += 1

            # Career goals count
            goal = s["career_goal"] or "Software Developer"
            if goal not in career_goal_stats:
                career_goal_stats[goal] = 0
            career_goal_stats[goal] += 1

        formatted_skill_stats = [
            {"skill_name": k, "total": v["total"], "completed": v["completed"]}
            for k, v in skill_stats.items()
        ]
        formatted_skill_stats = sorted(formatted_skill_stats, key=lambda x: x["completed"], reverse=True)

        formatted_career_stats = [
            {"career_goal": k, "count": v} for k, v in career_goal_stats.items()
        ]

        # -------------------------------------------------------------
        # Career Opportunities & Application Tracking Aggregate Metrics
        # -------------------------------------------------------------
        applications = get_all_applications()
        jobs_map = {j["id"]: j for j in get_all_jobs()}
        internships_map = {i["id"]: i for i in get_all_internships()}
        
        job_apps_count = {}
        intern_apps_count = {}
        app_status_counts = {
            "Applied": 0,
            "Interview Scheduled": 0,
            "Selected": 0,
            "Rejected": 0,
            "Pending": 0
        }
        
        placed_students_jobs = set()
        placed_students_interns = set()
        student_emails = {u["email"] for u in users}
        
        for app in applications:
            email = app["user_email"]
            status = app["status"]
            item_id = app["item_id"]
            itype = app["type"]
            
            # Count status split
            if status in app_status_counts:
                app_status_counts[status] += 1
                
            # Track placement success / internship conversion successes
            if status == "Selected":
                if itype == "job":
                    placed_students_jobs.add(email)
                elif itype == "internship":
                    placed_students_interns.add(email)
                    
            # Track application counts by job/internship
            if itype == "job":
                job_apps_count[item_id] = job_apps_count.get(item_id, 0) + 1
            elif itype == "internship":
                intern_apps_count[item_id] = intern_apps_count.get(item_id, 0) + 1
                
        # Format most applied jobs list
        most_applied_jobs_list = []
        for jid, count in job_apps_count.items():
            if jid in jobs_map:
                most_applied_jobs_list.append({
                    "id": jid,
                    "title": jobs_map[jid]["title"],
                    "company": jobs_map[jid]["company"],
                    "count": count
                })
        most_applied_jobs_list.sort(key=lambda x: x["count"], reverse=True)
        
        # Format most applied internships list
        most_applied_interns_list = []
        for iid, count in intern_apps_count.items():
            if iid in internships_map:
                most_applied_interns_list.append({
                    "id": iid,
                    "title": internships_map[iid]["title"],
                    "company": internships_map[iid]["company"],
                    "count": count
                })
        most_applied_interns_list.sort(key=lambda x: x["count"], reverse=True)
        
        total_students = len(student_emails)
        placement_rate = round((len(placed_students_jobs) / total_students) * 100, 2) if total_students > 0 else 0.0
        internship_rate = round((len(placed_students_interns) / total_students) * 100, 2) if total_students > 0 else 0.0

        return jsonify({
            "total_students": len(users),
            "total_resumes": len(resumes),
            "avg_placement_probability": avg_placement_probability,
            "outlook_distribution": outlook_dist,
            "skills_progress": {
                "total": total_skills,
                "completed": completed_skills,
                "completion_rate": completion_rate
            },
            "popular_skills": formatted_skill_stats[:5],
            "career_goals_distribution": formatted_career_stats,
            "placement_success_rate": placement_rate,
            "internship_conversion_rate": internship_rate,
            "most_applied_jobs": most_applied_jobs_list[:5],
            "most_applied_internships": most_applied_interns_list[:5],
            "application_status_counts": app_status_counts
        })
    except Exception as e:
        return jsonify({"message": f"Error loading admin dashboard: {str(e)}"}), 500


def calculate_resume_score(pred):
    if not pred:
        return None
    cgpa = float(pred.get("cgpa", 0.0))
    aptitude = float(pred.get("aptitude", 0.0))
    projects = float(pred.get("projects", 0.0))
    internships = float(pred.get("internships", 0.0))
    certifications = float(pred.get("certifications", 0.0))
    communication = float(pred.get("communication", 70.0))
    
    score = (
        0.30 * (cgpa * 10.0) +
        0.20 * aptitude +
        0.15 * min(projects * 20.0, 100.0) +
        0.15 * min(internships * 33.3, 100.0) +
        0.10 * min(certifications * 33.3, 100.0) +
        0.10 * communication
    )
    return round(max(0.0, min(100.0, score)), 2)


@admin_bp.route("/admin/students", methods=["GET"])
@admin_required
def admin_students():
    try:
        users = get_all_users()
        predictions = get_all_predictions()
        resumes = get_all_resumes()

        # Latest predictions map
        latest_predictions = {}
        for p in predictions:
            email = p["user_email"]
            if email and email not in latest_predictions:
                latest_predictions[email] = p

        # Latest resumes map
        latest_resumes = {}
        for r in resumes:
            email = r["user_email"]
            if email and email not in latest_resumes:
                latest_resumes[email] = r

        # Build list of students with summary details
        students_list = []
        for u in users:
            email = u["email"]
            pred = latest_predictions.get(email)
            res = latest_resumes.get(email)

            # Fetch skill completions count
            skills = get_student_skills(email)
            completed_count = sum(1 for s in skills if s["completed"] == 1)
            total_count = len(skills)

            students_list.append({
                "id": u["id"],
                "name": u["name"],
                "email": email,
                "created_at": u["created_at"],
                "placement_probability": pred["probability"] if pred else None,
                "recommendation": pred["recommendation"] if pred else "No prediction yet",
                "resume_uploaded": True if res else False,
                "resume_name": res["file_name"] if res else None,
                "resume_id": res["id"] if res else None,
                "skills_completed": completed_count,
                "skills_total": total_count,
                "career_goal": skills[0]["career_goal"] if skills else "Not Set",
                "skills": [s["skill_name"] for s in skills],
                "resume_score": calculate_resume_score(pred),
                "resume_upload_date": res["created_at"] if res else None
            })

        return jsonify(students_list)
    except Exception as e:
        return jsonify({"message": f"Error listing students: {str(e)}"}), 500


@admin_bp.route("/admin/students/<email>", methods=["GET"])
@admin_required
def admin_student_detail(email):
    try:
        # Find user
        connection = get_connection()
        placeholder = _placeholder(connection)
        cursor = _execute(
            connection,
            f"SELECT id, name, email, created_at FROM users WHERE email = {placeholder}",
            (email,),
        )
        row = cursor.fetchone()
        connection.close()

        if not row:
            return jsonify({"message": "Student not found"}), 404

        student = dict(row)

        # Get all predictions for this student
        connection = get_connection()
        cursor = _execute(
            connection,
            f"SELECT id, cgpa, aptitude, projects, internships, probability, recommendation, created_at FROM predictions WHERE user_email = {placeholder} ORDER BY id DESC",
            (email,),
        )
        preds = cursor.fetchall()
        connection.close()
        predictions_history = [dict(p) for p in preds] if preds else []

        # Get all resumes for this student
        connection = get_connection()
        cursor = _execute(
            connection,
            f"SELECT id, file_name, file_path, created_at FROM resumes WHERE user_email = {placeholder} ORDER BY id DESC",
            (email,),
        )
        res_rows = cursor.fetchall()
        connection.close()
        resumes_history = [dict(r) for r in res_rows] if res_rows else []

        # Get skills list
        skills = get_student_skills(email)

        return jsonify({
            "profile": student,
            "predictions": predictions_history,
            "resumes": resumes_history,
            "skills": skills
        })
    except Exception as e:
        return jsonify({"message": f"Error loading student details: {str(e)}"}), 500


@admin_bp.route("/admin/resumes/download/<int:resume_id>", methods=["GET"])
@admin_required
def admin_download_resume(resume_id):
    try:
        connection = get_connection()
        placeholder = _placeholder(connection)
        cursor = _execute(
            connection,
            f"SELECT file_name, file_path FROM resumes WHERE id = {placeholder}",
            (resume_id,),
        )
        row = cursor.fetchone()
        connection.close()

        if not row:
            return jsonify({"message": "Resume file not found"}), 404

        row_dict = dict(row)
        file_path = row_dict["file_path"]
        file_name = row_dict["file_name"]

        if not os.path.exists(file_path):
            return jsonify({"message": f"Resume file not found on disk: {file_name}"}), 404

        return send_file(file_path, as_attachment=True, download_name=file_name)
    except Exception as e:
        return jsonify({"message": f"Error downloading file: {str(e)}"}), 500
