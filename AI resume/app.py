import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

from backend.database import init_db
from backend.frontend.routes.auth import auth_bp
from backend.frontend.routes.prediction import prediction_bp
from backend.frontend.routes.resume import resume_bp
from backend.frontend.routes.skills import skills_bp
from backend.frontend.routes.admin import admin_bp
from backend.frontend.routes.jobs import jobs_bp

load_dotenv(BASE_DIR / ".env")


build_folder = BASE_DIR / "backend" / "frontend" / "build"
app = Flask(__name__, static_folder=str(build_folder), static_url_path="")

CORS(app, resources={r"/api/*": {"origins": "*"}})

app.register_blueprint(auth_bp, url_prefix="/api")
app.register_blueprint(prediction_bp, url_prefix="/api")
app.register_blueprint(resume_bp, url_prefix="/api")
app.register_blueprint(skills_bp, url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api")
app.register_blueprint(jobs_bp, url_prefix="/api")

init_db()


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if build_folder.exists() and (build_folder / "index.html").exists():
        if path != "" and os.path.exists(build_folder / path):
            return send_from_directory(str(build_folder), path)
        return send_from_directory(str(build_folder), "index.html")
    # Fallback if front-end is not built yet
    if path == "":
        return {"message": "Placement Prediction API Running"}
    return {"error": "Not Found"}, 404


@app.route("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    app.run(debug=True)