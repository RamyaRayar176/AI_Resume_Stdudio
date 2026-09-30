from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from typing import Any

mysql: Any = None
try:
	import mysql.connector as mysql_connector  # type: ignore[import-not-found]
	mysql = mysql_connector
except ImportError:
	mysql = None

BASE_DIR = Path(__file__).resolve().parent

if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
	SQLITE_DB_PATH = Path("/tmp/placement.db")
	original_db = BASE_DIR / "placement.db"
	if not SQLITE_DB_PATH.exists() and original_db.exists():
		import shutil
		shutil.copy(original_db, SQLITE_DB_PATH)
else:
	SQLITE_DB_PATH = BASE_DIR / "placement.db"


def _mysql_config():
	host = os.getenv("MYSQL_HOST")
	user = os.getenv("MYSQL_USER")
	password = os.getenv("MYSQL_PASSWORD")
	database = os.getenv("MYSQL_DATABASE")

	if mysql is None or not all([host, user, database]):
		return None

	return {
		"host": host,
		"user": user,
		"password": password or "",
		"database": database,
		"port": int(os.getenv("MYSQL_PORT", "3306")),
		"ssl_disabled": False,
	}


def _is_sqlite_connection(connection):
	return isinstance(connection, sqlite3.Connection)


def _placeholder(connection):
	return "?" if _is_sqlite_connection(connection) else "%s"


def _cursor(connection):
	if _is_sqlite_connection(connection):
		return connection.cursor()
	return connection.cursor(dictionary=True, buffered=True)


def get_connection():
	config = _mysql_config()
	if config is not None and mysql is not None:
		try:
			return mysql.connect(**config)
		except Exception:
			pass

	connection = sqlite3.connect(SQLITE_DB_PATH)
	connection.row_factory = sqlite3.Row
	return connection


def _execute(connection, sql, params=()):
	cursor = _cursor(connection)
	cursor.execute(sql, params)
	
	# Only commit write operations, not SELECT statements
	sql_upper = sql.strip().upper()
	if not sql_upper.startswith("SELECT"):
		connection.commit()
		
	return cursor


def _table_sql(connection, sqlite_sql, mysql_sql):
	return sqlite_sql if _is_sqlite_connection(connection) else mysql_sql


def init_db():
	connection = get_connection()

	users_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			login_count INTEGER DEFAULT 0,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			email VARCHAR(255) NOT NULL UNIQUE,
			password VARCHAR(255) NOT NULL,
			login_count INT DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
		""",
	)

	predictions_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS predictions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_email TEXT,
			cgpa REAL NOT NULL,
			aptitude REAL NOT NULL,
			projects REAL NOT NULL,
			internships REAL NOT NULL,
			certifications REAL DEFAULT 0,
			communication REAL DEFAULT 70,
			probability REAL NOT NULL,
			recommendation TEXT NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS predictions (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_email VARCHAR(255),
			cgpa DECIMAL(4,2) NOT NULL,
			aptitude DECIMAL(6,2) NOT NULL,
			projects DECIMAL(6,2) NOT NULL,
			internships DECIMAL(6,2) NOT NULL,
			certifications DECIMAL(6,2) DEFAULT 0,
			communication DECIMAL(6,2) DEFAULT 70,
			probability DECIMAL(6,2) NOT NULL,
			recommendation TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
		""",
	)

	resume_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS resumes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_email TEXT,
			file_name TEXT NOT NULL,
			file_path TEXT NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS resumes (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_email VARCHAR(255),
			file_name VARCHAR(255) NOT NULL,
			file_path TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
		""",
	)

	admins_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS admins (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS admins (
			id INT AUTO_INCREMENT PRIMARY KEY,
			email VARCHAR(255) NOT NULL UNIQUE,
			password VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
		""",
	)

	student_skills_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS student_skills (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_email TEXT NOT NULL,
			career_goal TEXT DEFAULT 'Software Developer',
			skill_name TEXT NOT NULL,
			completed INTEGER DEFAULT 0,
			completed_at TEXT,
			UNIQUE(user_email, skill_name)
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS student_skills (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_email VARCHAR(255) NOT NULL,
			career_goal VARCHAR(255) DEFAULT 'Software Developer',
			skill_name VARCHAR(255) NOT NULL,
			completed INT DEFAULT 0,
			completed_at TIMESTAMP NULL,
			UNIQUE(user_email, skill_name)
		)
		""",
	)

	jobs_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS jobs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			company TEXT NOT NULL,
			skills TEXT NOT NULL,
			eligibility TEXT NOT NULL,
			deadline TEXT NOT NULL,
			logo_url TEXT
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS jobs (
			id INT AUTO_INCREMENT PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			company VARCHAR(255) NOT NULL,
			skills TEXT NOT NULL,
			eligibility TEXT NOT NULL,
			deadline VARCHAR(255) NOT NULL,
			logo_url TEXT
		)
		"""
	)

	internships_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS internships (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			company TEXT NOT NULL,
			skills TEXT NOT NULL,
			stipend TEXT NOT NULL,
			duration TEXT NOT NULL,
			logo_url TEXT
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS internships (
			id INT AUTO_INCREMENT PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			company VARCHAR(255) NOT NULL,
			skills TEXT NOT NULL,
			stipend VARCHAR(255) NOT NULL,
			duration VARCHAR(255) NOT NULL,
			logo_url TEXT
		)
		"""
	)

	applications_sql = _table_sql(
		connection,
		"""
		CREATE TABLE IF NOT EXISTS applications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_email TEXT NOT NULL,
			type TEXT NOT NULL,
			item_id INTEGER NOT NULL,
			status TEXT DEFAULT 'Applied',
			applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_email, type, item_id)
		)
		""",
		"""
		CREATE TABLE IF NOT EXISTS applications (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_email VARCHAR(255) NOT NULL,
			type VARCHAR(50) NOT NULL,
			item_id INT NOT NULL,
			status VARCHAR(50) DEFAULT 'Applied',
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_email, type, item_id)
		)
		"""
	)

	_execute(connection, users_sql)
	_execute(connection, predictions_sql)
	_execute(connection, resume_sql)
	_execute(connection, admins_sql)
	_execute(connection, student_skills_sql)
	_execute(connection, jobs_sql)
	_execute(connection, internships_sql)
	_execute(connection, applications_sql)

	# Migrate existing database to add certifications and communication columns if missing
	try:
		_execute(connection, "ALTER TABLE predictions ADD COLUMN certifications REAL DEFAULT 0")
	except Exception:
		pass
	try:
		_execute(connection, "ALTER TABLE predictions ADD COLUMN communication REAL DEFAULT 70")
	except Exception:
		pass
	try:
		_execute(connection, "ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0")
	except Exception:
		pass

	from werkzeug.security import generate_password_hash
	placeholder = _placeholder(connection)

	# Seed default admin if none exists
	try:
		cursor = _execute(
			connection,
			f"SELECT id FROM admins WHERE email = {placeholder}",
			("admin@placement.com",),
		)
		row = cursor.fetchone()
		if not row:
			hashed = generate_password_hash("admin123")
			_execute(
				connection,
				f"INSERT INTO admins (email, password) VALUES ({placeholder}, {placeholder})",
				("admin@placement.com", hashed),
			)
	except Exception as e:
		print("Admin seeding failed:", e)

	# Seed default student if none exists
	try:
		cursor = _execute(
			connection,
			f"SELECT id FROM users WHERE email = {placeholder}",
			("student@placement.com",),
		)
		row = cursor.fetchone()
		if not row:
			hashed = generate_password_hash("student123")
			_execute(
				connection,
				f"INSERT INTO users (name, email, password) VALUES ({placeholder}, {placeholder}, {placeholder})",
				("Demo Student", "student@placement.com", hashed),
			)
	except Exception as e:
		print("Student seeding failed:", e)

	# Seed default jobs if empty
	try:
		cursor = _execute(connection, "SELECT COUNT(*) as count FROM jobs")
		row = cursor.fetchone()
		if not row or dict(row)["count"] == 0:
			mock_jobs = [
				("Software Engineer", "Google", "Java, Python, Data Structures & Algorithms", "CGPA >= 8.0", "2026-07-30", "https://logo.clearbit.com/google.com"),
				("Data Analyst", "Microsoft", "Python, SQL, Tableau", "CGPA >= 7.0", "2026-08-15", "https://logo.clearbit.com/microsoft.com"),
				("Cloud Associate", "Amazon", "AWS, Linux, Docker", "CGPA >= 7.5", "2026-07-15", "https://logo.clearbit.com/amazon.com"),
				("Security Analyst", "CrowdStrike", "Cybersecurity, Networking, Linux", "CGPA >= 8.0", "2026-08-01", "https://logo.clearbit.com/crowdstrike.com"),
				("Frontend Developer", "Meta", "Web Development, Git & GitHub", "CGPA >= 7.0", "2026-07-20", "https://logo.clearbit.com/meta.com")
			]
			for job in mock_jobs:
				_execute(connection, f"INSERT INTO jobs (title, company, skills, eligibility, deadline, logo_url) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})", job)
	except Exception as e:
		print("Jobs seeding failed:", e)

	# Seed default internships if empty
	try:
		cursor = _execute(connection, "SELECT COUNT(*) as count FROM internships")
		row = cursor.fetchone()
		if not row or dict(row)["count"] == 0:
			mock_internships = [
				("Frontend Developer Intern", "Meta", "Web Development, Git & GitHub", "$5000/mo", "3 Months", "https://logo.clearbit.com/meta.com"),
				("ML Research Intern", "OpenAI", "Python, Machine Learning, Deep Learning", "$6000/mo", "6 Months", "https://logo.clearbit.com/openai.com"),
				("DevOps Intern", "Netflix", "Docker, Kubernetes, Terraform", "$4500/mo", "4 Months", "https://logo.clearbit.com/netflix.com"),
				("Cybersecurity Intern", "Palo Alto Networks", "Networking, Ethical Hacking", "$4000/mo", "3 Months", "https://logo.clearbit.com/paloaltonetworks.com"),
				("Software Engineer Intern", "Google", "Java, Python, Data Structures & Algorithms", "$5500/mo", "3 Months", "https://logo.clearbit.com/google.com")
			]
			for intern in mock_internships:
				_execute(connection, f"INSERT INTO internships (title, company, skills, stipend, duration, logo_url) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})", intern)
	except Exception as e:
		print("Internships seeding failed:", e)

	# Seed mock applications for student@placement.com if empty
	try:
		cursor = _execute(connection, "SELECT COUNT(*) as count FROM applications")
		row = cursor.fetchone()
		if not row or dict(row)["count"] == 0:
			mock_apps = [
				("student@placement.com", "job", 1, "Selected"),
				("student@placement.com", "job", 2, "Applied"),
				("student@placement.com", "internship", 4, "Interview Scheduled"),
				("student@placement.com", "internship", 1, "Selected")
			]
			for app in mock_apps:
				_execute(connection, f"INSERT INTO applications (user_email, type, item_id, status) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})", app)
	except Exception as e:
		print("Applications seeding failed:", e)

	connection.close()


def get_user_by_email(email):
	connection = get_connection()
	placeholder = _placeholder(connection)
	cursor = _execute(
		connection,
		f"SELECT id, name, email, password, login_count FROM users WHERE email = {placeholder}",
		(email,),
	)
	row = cursor.fetchone()
	connection.close()
	return dict(row) if row else None


def create_user(name, email, password_hash):
	if get_user_by_email(email) is not None:
		return None

	connection = get_connection()
	placeholder = _placeholder(connection)
	_execute(
		connection,
		f"INSERT INTO users (name, email, password, login_count) VALUES ({placeholder}, {placeholder}, {placeholder}, 1)",
		(name, email, password_hash),
	)
	connection.close()
	return get_user_by_email(email)


def save_prediction(user_email, cgpa, aptitude, projects, internships, probability, recommendation, certifications=0.0, communication=70.0):
	connection = get_connection()
	placeholder = _placeholder(connection)
	_execute(
		connection,
		f"""
		INSERT INTO predictions (
			user_email,
			cgpa,
			aptitude,
			projects,
			internships,
			certifications,
			communication,
			probability,
			recommendation
		) VALUES (
			{placeholder},
			{placeholder},
			{placeholder},
			{placeholder},
			{placeholder},
			{placeholder},
			{placeholder},
			{placeholder},
			{placeholder}
		)
		""",
		(user_email, cgpa, aptitude, projects, internships, certifications, communication, probability, recommendation),
	)
	connection.close()


def save_resume_upload(user_email, file_name, file_path):
	connection = get_connection()
	placeholder = _placeholder(connection)
	_execute(
		connection,
		f"INSERT INTO resumes (user_email, file_name, file_path) VALUES ({placeholder}, {placeholder}, {placeholder})",
		(user_email, file_name, file_path),
	)
	connection.close()


def get_admin_by_email(email):
	connection = get_connection()
	placeholder = _placeholder(connection)
	cursor = _execute(
		connection,
		f"SELECT id, email, password FROM admins WHERE email = {placeholder}",
		(email,),
	)
	row = cursor.fetchone()
	connection.close()
	return dict(row) if row else None


def get_all_users():
	connection = get_connection()
	cursor = _execute(connection, "SELECT id, name, email, created_at FROM users")
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []


def get_all_predictions():
	connection = get_connection()
	cursor = _execute(connection, "SELECT id, user_email, cgpa, aptitude, projects, internships, certifications, communication, probability, recommendation, created_at FROM predictions ORDER BY id DESC")
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []


def get_all_resumes():
	connection = get_connection()
	cursor = _execute(connection, "SELECT id, user_email, file_name, file_path, created_at FROM resumes ORDER BY id DESC")
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []


def get_student_skills(email):
	connection = get_connection()
	placeholder = _placeholder(connection)
	cursor = _execute(
		connection,
		f"SELECT id, user_email, career_goal, skill_name, completed, completed_at FROM student_skills WHERE user_email = {placeholder}",
		(email,),
	)
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []


def set_student_career_goal(email, career_goal):
	connection = get_connection()
	placeholder = _placeholder(connection)
	_execute(
		connection,
		f"UPDATE student_skills SET career_goal = {placeholder} WHERE user_email = {placeholder}",
		(career_goal, email),
	)
	connection.close()


def toggle_student_skill(email, skill_name, completed, career_goal='Software Developer'):
	connection = get_connection()
	placeholder = _placeholder(connection)
	
	cursor = _execute(
		connection,
		f"SELECT id FROM student_skills WHERE user_email = {placeholder} AND skill_name = {placeholder}",
		(email, skill_name),
	)
	row = cursor.fetchone()
	
	if row:
		import datetime
		completed_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") if completed else None
		_execute(
			connection,
			f"UPDATE student_skills SET completed = {placeholder}, completed_at = {placeholder}, career_goal = {placeholder} WHERE user_email = {placeholder} AND skill_name = {placeholder}",
			(completed, completed_at, career_goal, email, skill_name),
		)
	else:
		import datetime
		completed_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") if completed else None
		_execute(
			connection,
			f"INSERT INTO student_skills (user_email, career_goal, skill_name, completed, completed_at) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})",
			(email, career_goal, skill_name, completed, completed_at),
		)
	connection.close()


def get_all_jobs():
	connection = get_connection()
	cursor = _execute(connection, "SELECT id, title, company, skills, eligibility, deadline, logo_url FROM jobs ORDER BY id DESC")
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []


def get_all_internships():
	connection = get_connection()
	cursor = _execute(connection, "SELECT id, title, company, skills, stipend, duration, logo_url FROM internships ORDER BY id DESC")
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []


def get_student_applications(email):
	connection = get_connection()
	placeholder = _placeholder(connection)
	cursor = _execute(
		connection,
		f"SELECT id, user_email, type, item_id, status, applied_at FROM applications WHERE user_email = {placeholder}",
		(email,),
	)
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []


def create_or_update_application(email, item_type, item_id, status):
	connection = get_connection()
	placeholder = _placeholder(connection)
	cursor = _execute(
		connection,
		f"SELECT id FROM applications WHERE user_email = {placeholder} AND type = {placeholder} AND item_id = {placeholder}",
		(email, item_type, item_id),
	)
	row = cursor.fetchone()
	if row:
		_execute(
			connection,
			f"UPDATE applications SET status = {placeholder} WHERE user_email = {placeholder} AND type = {placeholder} AND item_id = {placeholder}",
			(status, email, item_type, item_id),
		)
	else:
		_execute(
			connection,
			f"INSERT INTO applications (user_email, type, item_id, status) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder})",
			(email, item_type, item_id, status),
		)
	connection.close()


def get_all_applications():
	connection = get_connection()
	cursor = _execute(connection, "SELECT id, user_email, type, item_id, status, applied_at FROM applications")
	rows = cursor.fetchall()
	connection.close()
	return [dict(r) for r in rows] if rows else []
