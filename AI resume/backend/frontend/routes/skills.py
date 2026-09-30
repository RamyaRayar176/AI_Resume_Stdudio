from flask import Blueprint, request, jsonify
import json
import urllib.request
import urllib.error

from backend.database import (
    get_student_skills,
    toggle_student_skill,
    set_student_career_goal,
    get_connection,
    _execute,
    _placeholder,
    save_prediction
)
from backend.frontend.routes.prediction import model, build_recommendation, FallbackPlacementModel

skills_bp = Blueprint("skills", __name__)

CAREER_SKILLS = {
    "Software Developer": [
        "Data Structures & Algorithms",
        "Java",
        "Python",
        "SQL",
        "Git & GitHub",
        "Web Development"
    ],
    "Data Analyst": [
        "Python",
        "SQL",
        "Excel",
        "Tableau",
        "Statistics",
        "Data Wrangling"
    ],
    "Data Scientist": [
        "Machine Learning",
        "Python",
        "R",
        "Deep Learning",
        "SQL",
        "Statistics"
    ],
    "Cloud Engineer": [
        "AWS",
        "Docker",
        "Kubernetes",
        "Linux",
        "Networking",
        "Terraform"
    ],
    "Cybersecurity Analyst": [
        "Networking",
        "Ethical Hacking",
        "Linux",
        "Cryptography",
        "Security Auditing",
        "Incident Response"
    ]
}

LEARNING_RESOURCES = {
    "Data Structures & Algorithms": [
        {"platform": "GeeksforGeeks", "title": "DSA Self-Paced Course", "url": "https://www.geeksforgeeks.org/data-structures/", "type": "unpaid"},
        {"platform": "freeCodeCamp", "title": "Algorithms and Data Structures Tutorial", "url": "https://www.freecodecamp.org/news/learn-data-structures-and-algorithms/", "type": "unpaid"},
        {"platform": "NPTEL", "title": "Programming, Data Structures and Algorithms in Python", "url": "https://nptel.ac.in/courses/106106145", "type": "unpaid"}
    ],
    "Python": [
        {"platform": "W3Schools", "title": "Python Tutorial", "url": "https://www.w3schools.com/python/", "type": "unpaid"},
        {"platform": "freeCodeCamp", "title": "Python for Beginners (Full Course)", "url": "https://www.youtube.com/watch?v=rfscVS0vtbw", "type": "unpaid"},
        {"platform": "Coursera", "title": "Python for Everybody Specialization", "url": "https://www.coursera.org/specializations/python", "type": "paid"}
    ],
    "SQL": [
        {"platform": "W3Schools", "title": "SQL Tutorial", "url": "https://www.w3schools.com/sql/", "type": "unpaid"},
        {"platform": "Infosys Springboard", "title": "SQL Basics & Advanced", "url": "https://infyspringboard.onwingspan.com/", "type": "unpaid"},
        {"platform": "Udemy", "title": "The Complete SQL Bootcamp", "url": "https://www.udemy.com/course/the-complete-sql-bootcamp/", "type": "paid"}
    ],
    "Java": [
        {"platform": "W3Schools", "title": "Java Tutorial", "url": "https://www.w3schools.com/java/", "type": "unpaid"},
        {"platform": "NPTEL", "title": "Programming in Java", "url": "https://nptel.ac.in/courses/106105191", "type": "unpaid"},
        {"platform": "Coursera", "title": "Java Programming and Software Engineering Fundamentals", "url": "https://www.coursera.org/specializations/java-programming", "type": "paid"}
    ],
    "Web Development": [
        {"platform": "freeCodeCamp", "title": "Responsive Web Design Certification", "url": "https://www.freecodecamp.org/learn/2022/responsive-web-design/", "type": "unpaid"},
        {"platform": "W3Schools", "title": "HTML, CSS & JavaScript Tutorials", "url": "https://www.w3schools.com/html/", "type": "unpaid"},
        {"platform": "Great Learning", "title": "Full Stack Web Development Program", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"}
    ],
    "Git & GitHub": [
        {"platform": "freeCodeCamp", "title": "Git and GitHub for Beginners", "url": "https://www.freecodecamp.org/news/git-and-github-for-beginners/", "type": "unpaid"},
        {"platform": "GeeksforGeeks", "title": "Git & GitHub Guide", "url": "https://www.geeksforgeeks.org/git-tutorial/", "type": "unpaid"},
        {"platform": "Udemy", "title": "Git Complete: The definitive step-by-step guide", "url": "https://www.udemy.com/course/git-complete/", "type": "paid"}
    ],
    "Excel": [
        {"platform": "W3Schools", "title": "Excel Tutorial", "url": "https://www.w3schools.com/excel/", "type": "unpaid"},
        {"platform": "Great Learning", "title": "Excel for Beginners", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"},
        {"platform": "Coursera", "title": "Excel Skills for Business Specialization", "url": "https://www.coursera.org/specializations/excel", "type": "paid"}
    ],
    "Tableau": [
        {"platform": "Great Learning", "title": "Tableau for Beginners", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"},
        {"platform": "Coursera", "title": "Data Visualization with Tableau Specialization", "url": "https://www.coursera.org/specializations/data-visualization-tableau", "type": "paid"},
        {"platform": "Udemy", "title": "Tableau 2024 A-Z: Hands-On Tableau Training For Data Science", "url": "https://www.udemy.com/course/tableau10/", "type": "paid"}
    ],
    "Statistics": [
        {"platform": "Coursera", "title": "Introduction to Statistics", "url": "https://www.coursera.org/learn/stanford-statistics", "type": "paid"},
        {"platform": "Great Learning", "title": "Statistics for Data Science", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"},
        {"platform": "Khan Academy", "title": "AP College Statistics", "url": "https://www.khanacademy.org/math/ap-statistics", "type": "unpaid"}
    ],
    "Data Wrangling": [
        {"platform": "GeeksforGeeks", "title": "Data Wrangling in Python", "url": "https://www.geeksforgeeks.org/data-wrangling-in-python/", "type": "unpaid"},
        {"platform": "Coursera", "title": "Data Wrangling, Analysis and AB Testing", "url": "https://www.coursera.org/learn/data-wrangling-analysis-abtesting", "type": "paid"},
        {"platform": "Udemy", "title": "Data Wrangling with Python and Pandas", "url": "https://www.udemy.com/course/data-wrangling-pandas/", "type": "paid"}
    ],
    "Machine Learning": [
        {"platform": "Coursera", "title": "Supervised Machine Learning: Regression and Classification", "url": "https://www.coursera.org/learn/machine-learning", "type": "paid"},
        {"platform": "NPTEL", "title": "Introduction to Machine Learning", "url": "https://nptel.ac.in/courses/106105152", "type": "unpaid"},
        {"platform": "Great Learning", "title": "Machine Learning Foundations", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"}
    ],
    "R": [
        {"platform": "W3Schools", "title": "R Tutorial", "url": "https://www.w3schools.com/r/", "type": "unpaid"},
        {"platform": "Coursera", "title": "Data Science: R Basics", "url": "https://www.coursera.org/learn/r-programming", "type": "paid"},
        {"platform": "freeCodeCamp", "title": "R Programming for Beginners Course", "url": "https://www.youtube.com/watch?v=_V8eKix87_s", "type": "unpaid"}
    ],
    "Deep Learning": [
        {"platform": "Coursera", "title": "Deep Learning Specialization", "url": "https://www.coursera.org/specializations/deep-learning", "type": "paid"},
        {"platform": "Udemy", "title": "Deep Learning A-Z: Hands-On Artificial Neural Networks", "url": "https://www.udemy.com/course/deeplearning/", "type": "paid"},
        {"platform": "Great Learning", "title": "Introduction to Deep Learning", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"}
    ],
    "AWS": [
        {"platform": "Infosys Springboard", "title": "AWS Cloud Practitioner Essentials", "url": "https://infyspringboard.onwingspan.com/", "type": "unpaid"},
        {"platform": "freeCodeCamp", "title": "AWS Certified Cloud Practitioner Training", "url": "https://www.freecodecamp.org/news/aws-certified-cloud-practitioner-study-course-pass-the-exam-with-this-free-13-hour-course/", "type": "unpaid"},
        {"platform": "Udemy", "title": "Ultimate AWS Certified Cloud Practitioner", "url": "https://www.udemy.com/course/aws-certified-cloud-practitioner-training-course/", "type": "paid"}
    ],
    "Docker": [
        {"platform": "freeCodeCamp", "title": "Docker Handbook", "url": "https://www.freecodecamp.org/news/the-docker-handbook/", "type": "unpaid"},
        {"platform": "GeeksforGeeks", "title": "Docker Tutorial", "url": "https://www.geeksforgeeks.org/docker-tutorial/", "type": "unpaid"},
        {"platform": "Udemy", "title": "Docker Technologies for DevOps and Developers", "url": "https://www.udemy.com/course/docker-technologies-for-devops-and-developers/", "type": "paid"}
    ],
    "Kubernetes": [
        {"platform": "freeCodeCamp", "title": "Kubernetes Course for Beginners", "url": "https://www.freecodecamp.org/news/the-kubernetes-handbook/", "type": "unpaid"},
        {"platform": "Great Learning", "title": "Introduction to Kubernetes", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"},
        {"platform": "Udemy", "title": "Kubernetes for the Absolute Beginners - Hands-on", "url": "https://www.udemy.com/course/learn-kubernetes/", "type": "paid"}
    ],
    "Linux": [
        {"platform": "W3Schools", "title": "Linux Tutorial", "url": "https://www.w3schools.com/linux/", "type": "unpaid"},
        {"platform": "freeCodeCamp", "title": "Linux Commands Handbook", "url": "https://www.freecodecamp.org/news/the-linux-commands-handbook/", "type": "unpaid"},
        {"platform": "NPTEL", "title": "Introduction to Linux", "url": "https://nptel.ac.in/courses/106106240", "type": "unpaid"}
    ],
    "Networking": [
        {"platform": "Coursera", "title": "Computer Networking", "url": "https://www.coursera.org/learn/computer-networking", "type": "paid"},
        {"platform": "GeeksforGeeks", "title": "Computer Network Tutorials", "url": "https://www.geeksforgeeks.org/computer-network-tutorials/", "type": "unpaid"},
        {"platform": "Udemy", "title": "Introduction to Computer Networks for Non-Techies", "url": "https://www.udemy.com/course/introduction-to-computer-networks/", "type": "paid"}
    ],
    "Terraform": [
        {"platform": "freeCodeCamp", "title": "Terraform Course for Beginners", "url": "https://www.youtube.com/watch?v=l5k1ai_GBDE", "type": "unpaid"},
        {"platform": "Udemy", "title": "HashiCorp Certified: Terraform Associate 2024", "url": "https://www.udemy.com/course/terraform-hands-on-labs-queries/", "type": "paid"},
        {"platform": "GeeksforGeeks", "title": "Introduction to Terraform", "url": "https://www.geeksforgeeks.org/introduction-to-terraform/", "type": "unpaid"}
    ],
    "Ethical Hacking": [
        {"platform": "freeCodeCamp", "title": "Full Ethical Hacking Course", "url": "https://www.freecodecamp.org/news/license-to-pentest-ethical-hacking-course-for-beginners/", "type": "unpaid"},
        {"platform": "Great Learning", "title": "Ethical Hacking for Beginners", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"},
        {"platform": "Udemy", "title": "Learn Ethical Hacking From Scratch", "url": "https://www.udemy.com/course/learn-ethical-hacking-from-scratch/", "type": "paid"}
    ],
    "Cryptography": [
        {"platform": "Coursera", "title": "Cryptography I", "url": "https://www.coursera.org/learn/crypto", "type": "paid"},
        {"platform": "NPTEL", "title": "Introduction to Cryptography", "url": "https://nptel.ac.in/courses/106105162", "type": "unpaid"},
        {"platform": "GeeksforGeeks", "title": "Cryptography and Network Security", "url": "https://www.geeksforgeeks.org/cryptography-and-network-security/", "type": "unpaid"}
    ],
    "Security Auditing": [
        {"platform": "Coursera", "title": "Security Auditing and Compliance", "url": "https://www.coursera.org/learn/security-auditing-compliance", "type": "paid"},
        {"platform": "Udemy", "title": "Information Security Auditing: The Complete Guide", "url": "https://www.udemy.com/course/information-security-auditing/", "type": "paid"},
        {"platform": "Great Learning", "title": "Cybersecurity Compliance Fundamentals", "url": "https://www.mygreatlearning.com/academy", "type": "unpaid"}
    ],
    "Incident Response": [
        {"platform": "Coursera", "title": "Incident Response, Threat Hunting, and Active Defense", "url": "https://www.coursera.org/learn/incident-response-threat-hunting", "type": "paid"},
        {"platform": "Udemy", "title": "Incident Response and Handling Seminar", "url": "https://www.udemy.com/course/incident-response/", "type": "paid"},
        {"platform": "GeeksforGeeks", "title": "Cybersecurity Incident Response", "url": "https://www.geeksforgeeks.org/cyber-incident-response/", "type": "unpaid"}
    ]
}


@skills_bp.route("/skills", methods=["GET"])
def get_skills():
    email = request.args.get("email")
    if not email:
        return jsonify({"message": "Email is required"}), 400
        
    skills = get_student_skills(email)
    
    # If student has no career goal/skills set yet, initialize default
    career_goal = "Software Developer"
    if not skills:
        default_skills = CAREER_SKILLS[career_goal]
        for skill in default_skills:
            toggle_student_skill(email, skill, 0, career_goal)
        skills = get_student_skills(email)
    else:
        career_goal = skills[0]["career_goal"]
        
    # Build complete list with platform resources
    skills_list = []
    for s in skills:
        skill_name = s["skill_name"]
        skills_list.append({
            "skill_name": skill_name,
            "completed": s["completed"],
            "completed_at": s["completed_at"],
            "resources": LEARNING_RESOURCES.get(skill_name, [])
        })
        
    return jsonify({
        "career_goal": career_goal,
        "skills": skills_list,
        "all_goals": list(CAREER_SKILLS.keys())
    })


@skills_bp.route("/skills/goal", methods=["POST"])
def update_career_goal():
	data = request.json
	email = data.get("email")
	career_goal = data.get("career_goal")
	
	if not email or not career_goal:
		return jsonify({"message": "Email and career goal are required"}), 400
		
	if career_goal not in CAREER_SKILLS:
		return jsonify({"message": "Invalid career goal"}), 400
		
	# Fetch current completed skills to preserve them, but swap the general catalog
	current_skills = get_student_skills(email)
	completed_names = {s["skill_name"] for s in current_skills if s["completed"] == 1}
	
	# Clear out the old incomplete skills and replace with new goal's catalog
	connection = get_connection()
	placeholder = _placeholder(connection)
	_execute(connection, f"DELETE FROM student_skills WHERE user_email = {placeholder}", (email,))
	connection.close()
	
	new_catalog = CAREER_SKILLS[career_goal]
	for skill in new_catalog:
		# Preserve completion if they already had it
		is_completed = 1 if skill in completed_names else 0
		toggle_student_skill(email, skill, is_completed, career_goal)
		
	return jsonify({"message": f"Career goal updated to {career_goal} successfully."})


@skills_bp.route("/skills/toggle", methods=["POST"])
def toggle_skill():
    data = request.json
    email = data.get("email")
    skill_name = data.get("skill_name")
    completed = int(data.get("completed", 0))
    
    if not email or not skill_name:
        return jsonify({"message": "Email and skill_name are required"}), 400
        
    # Get current career goal to save
    skills = get_student_skills(email)
    career_goal = skills[0]["career_goal"] if skills else "Software Developer"
    
    toggle_student_skill(email, skill_name, completed, career_goal)
    
    # Recalculate prediction probability based on newly completed skills!
    # Retrieve the student's latest prediction
    connection = get_connection()
    placeholder = _placeholder(connection)
    cursor = _execute(
        connection,
        f"SELECT cgpa, aptitude, projects, internships, certifications, communication FROM predictions WHERE user_email = {placeholder} ORDER BY id DESC LIMIT 1",
        (email,),
    )
    row = cursor.fetchone()
    connection.close()
    
    updated_prob = None
    if row:
        row_dict = dict(row)
        base_cgpa = float(row_dict["cgpa"])
        base_aptitude = float(row_dict["aptitude"])
        base_projects = float(row_dict["projects"])
        base_internships = float(row_dict["internships"])
        base_certifications = float(row_dict.get("certifications", 0.0))
        base_communication = float(row_dict.get("communication", 70.0))
        
        # Calculate how many skills are completed
        all_skills = get_student_skills(email)
        completed_count = sum(1 for s in all_skills if s["completed"] == 1)
        
        # Each completed skill adds a boost:
        # +3 to aptitude score (capped at 100)
        # +0.3 to projects count (capped at 10)
        boosted_aptitude = min(100.0, base_aptitude + (completed_count * 3.0))
        boosted_projects = min(10.0, base_projects + (completed_count * 0.3))
        
        features = [[
            base_cgpa,
            boosted_aptitude,
            boosted_projects,
            base_internships,
            base_certifications,
            base_communication
        ]]
        
        if isinstance(model, FallbackPlacementModel):
            probability = model.predict_proba(features)[0][1]
        else:
            try:
                import pandas as pd
                df_features = pd.DataFrame(features, columns=["cgpa", "aptitude", "projects", "internships", "certifications", "communication"])
                probability = model.predict_proba(df_features)[0][1]
            except ImportError:
                probability = model.predict_proba(features)[0][1]
            
        updated_prob = round(probability * 100, 2)
        recommendation = build_recommendation(updated_prob)
        
        # Save updated prediction
        save_prediction(
            email,
            base_cgpa,
            boosted_aptitude,
            boosted_projects,
            base_internships,
            updated_prob,
            recommendation,
            base_certifications,
            base_communication
        )
        
    return jsonify({
        "message": "Skill status updated successfully.",
        "updated_placement_probability": updated_prob
    })
