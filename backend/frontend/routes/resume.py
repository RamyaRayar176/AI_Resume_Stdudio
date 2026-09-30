from flask import Blueprint
from flask import request
from flask import jsonify
import os
from pathlib import Path

from backend.database import save_resume_upload

resume_bp = Blueprint(
    "resume",
    __name__
)

if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
    UPLOAD_FOLDER = Path("/tmp/uploads")
else:
    UPLOAD_FOLDER = Path(__file__).resolve().parents[2] / "uploads"

if not os.path.exists(
    UPLOAD_FOLDER
):
    os.makedirs(
        UPLOAD_FOLDER
    )

@resume_bp.route(
    "/upload_resume",
    methods=["POST"]
)
def upload_resume():

    if "resume" not in request.files:

        return jsonify({
            "message":
            "No file uploaded"
        })

    file = request.files["resume"]

    file_path = os.path.join(str(UPLOAD_FOLDER), file.filename)

    file.save(file_path)

    save_resume_upload(
        request.form.get("email"),
        file.filename,
        file_path
    )

    return jsonify({
        "message":
        "Resume Uploaded Successfully",
        "file_name":
        file.filename
    })