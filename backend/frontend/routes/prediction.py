from flask import Blueprint, request, jsonify
from pathlib import Path
import os
import re
import json
import base64
import urllib.request
import urllib.error
import joblib
from pypdf import PdfReader
import warnings

# Suppress scikit-learn version mismatch warnings
warnings.filterwarnings("ignore")

from backend.database import save_prediction, save_resume_upload

prediction_bp = Blueprint(
    "prediction",
    __name__
)

MODEL_PATH = Path(__file__).resolve().parents[2] / "placement_model.pkl"

class FallbackPlacementModel:

    def predict_proba(self, features):
        results = []

        for feature in features:
            # support both 4 and 6 feature formats to maintain backward compatibility
            if len(feature) == 4:
                cgpa, aptitude, projects, internships = [float(value) for value in feature]
                certifications = 0.0
                communication = 70.0
            else:
                cgpa, aptitude, projects, internships, certifications, communication = [float(value) for value in feature]
                
            normalized_cgpa = max(0.0, min(cgpa / 10.0, 1.0))
            normalized_aptitude = max(0.0, min(aptitude / 100.0, 1.0))
            normalized_projects = max(0.0, min(projects / 10.0, 1.0))
            normalized_internships = max(0.0, min(internships / 5.0, 1.0))
            normalized_certs = max(0.0, min(certifications / 5.0, 1.0))
            normalized_comm = max(0.0, min(communication / 100.0, 1.0))
            
            score = (
                0.35 * normalized_cgpa
                + 0.25 * normalized_aptitude
                + 0.15 * normalized_projects
                + 0.12 * normalized_internships
                + 0.08 * normalized_certs
                + 0.05 * normalized_comm
            )
            probability = max(0.0, min(score, 1.0))
            results.append([1.0 - probability, probability])

        return results


try:
    model = joblib.load(MODEL_PATH)
except (EOFError, FileNotFoundError, OSError, ValueError):
    model = FallbackPlacementModel()


def build_recommendation(probability):
    if probability >= 80:
        return "Excellent placement outlook. Focus on interview practice and portfolio polish."
    if probability >= 60:
        return "Good placement outlook. Strengthen projects, aptitude, and communication skills."
    if probability >= 40:
        return "Moderate placement outlook. Improve core technical skills and add one strong project."
    return "Placement needs attention. Build foundational skills, internship exposure, and practice aptitude daily."


def compute_xai_contributions(cgpa, aptitude, projects, internships, certifications, communication):
    # Baselines: CGPA=7.5, Aptitude=75, Projects=2, Internships=1, Certifications=1, Communication=70
    cgpa_contrib = 0.35 * (cgpa / 10.0 - 0.75) * 100
    aptitude_contrib = 0.25 * (aptitude / 100.0 - 0.75) * 100
    projects_contrib = 0.15 * (projects / 10.0 - 0.20) * 100
    internships_contrib = 0.12 * (internships / 5.0 - 0.20) * 100
    certs_contrib = 0.08 * (certifications / 5.0 - 0.20) * 100
    comm_contrib = 0.05 * (communication / 100.0 - 0.70) * 100
    
    return {
        "CGPA": round(cgpa_contrib, 2),
        "Aptitude": round(aptitude_contrib, 2),
        "Projects": round(projects_contrib, 2),
        "Internships": round(internships_contrib, 2),
        "Certifications": round(certs_contrib, 2),
        "Communication": round(comm_contrib, 2)
    }


def get_risk_category(prob):
    if prob >= 75:
        return "High Placement Probability"
    elif prob >= 45:
        return "Medium Risk"
    else:
        return "High Risk"


def run_twin_simulations(cgpa, aptitude, projects, internships, certifications, communication):
    def run_eval(c, a, p, i, cert, comm):
        feats = [[c, a, p, i, cert, comm]]
        if isinstance(model, FallbackPlacementModel):
            return round(model.predict_proba(feats)[0][1] * 100, 2)
        else:
            try:
                import pandas as pd
                df_feats = pd.DataFrame(feats, columns=["cgpa", "aptitude", "projects", "internships", "certifications", "communication"])
                return round(model.predict_proba(df_feats)[0][1] * 100, 2)
            except ImportError:
                return round(model.predict_proba(feats)[0][1] * 100, 2)
        
    base_p = run_eval(cgpa, aptitude, projects, internships, certifications, communication)
    
    p_cert = run_eval(cgpa, aptitude, projects, internships, certifications + 1, communication)
    p_intern = run_eval(cgpa, aptitude, projects, internships + 1, certifications, communication)
    p_apt = run_eval(cgpa, min(100.0, aptitude + 15), projects, internships, certifications, communication)
    p_proj = run_eval(cgpa, aptitude, projects + 1, internships, certifications, communication)
    p_comm = run_eval(cgpa, aptitude, projects, internships, certifications, min(100.0, communication + 15))
    
    return {
        "scenario_add_certification": {"prob": p_cert, "delta": round(p_cert - base_p, 2)},
        "scenario_add_internship": {"prob": p_intern, "delta": round(p_intern - base_p, 2)},
        "scenario_boost_aptitude": {"prob": p_apt, "delta": round(p_apt - base_p, 2)},
        "scenario_add_project": {"prob": p_proj, "delta": round(p_proj - base_p, 2)},
        "scenario_boost_communication": {"prob": p_comm, "delta": round(p_comm - base_p, 2)}
    }


def fallback_parse_resume_data(text):
    if not text:
        return {"cgpa": 7.5, "aptitude": 75.0, "projects": 2.0, "internships": 1.0, "certifications": 0.0, "communication": 70.0}
        
    text_lower = text.lower()
    
    # Estimate CGPA (look for numbers like 7.5, 8.4, 9.2, etc. or GPA: 3.8/4.0)
    cgpa = 7.5
    gpa_patterns = [
        r'(?:cgpa|gpa|pointer|percentage|percent|marks)\D*([0-9]+(?:\.[0-9]+)?)',
        r'\b([0-9]\.[0-9]{1,2})\b' # lone float
    ]
    for pattern in gpa_patterns:
        matches = re.findall(pattern, text_lower)
        found = False
        for m in matches:
            try:
                val = float(m)
                if 1.0 <= val <= 10.0:
                    cgpa = val
                    found = True
                    break
                elif 0.0 <= val <= 4.0:
                    cgpa = val * 2.5
                    found = True
                    break
                elif 10.0 < val <= 100.0:
                    cgpa = val / 10.0
                    found = True
                    break
            except ValueError:
                pass
        if found:
            break
            
    # Estimate Aptitude (look for aptitude, quant, logic, test, score)
    aptitude = 75.0
    apt_matches = re.findall(r'(?:aptitude|test|quant|logic|score|percentile|marks|mat|gate|sat|gre)\D*([0-9]{2,3})', text_lower)
    for m in apt_matches:
        try:
            val = float(m)
            if 40.0 <= val <= 100.0:
                aptitude = val
                break
        except ValueError:
            pass
            
    # Estimate Projects
    projects = 2.0
    proj_matches = re.findall(r'(\d+)\s+(?:\w+\s+)?project', text_lower)
    if proj_matches:
        try:
            projects = float(proj_matches[0])
        except ValueError:
            pass
    else:
        project_keywords = ["project", "developed", "built", "implemented", "designed"]
        projects_count = text_lower.count("project")
        if projects_count > 0:
            projects = min(5.0, float(projects_count))
        else:
            matched_words = 0
            for word in project_keywords:
                matched_words += text_lower.count(word)
            if matched_words > 0:
                projects = min(4.0, float(round(matched_words / 2.0)))
        
    # Estimate Internships
    internships = 1.0
    intern_matches = re.findall(r'(\d+)\s+(?:\w+\s+)?internship', text_lower)
    if intern_matches:
        try:
            internships = float(intern_matches[0])
        except ValueError:
            pass
    else:
        intern_keywords = ["intern", "internship", "experience", "training", "work", "job", "employment", "engineer", "developer"]
        intern_count = 0
        for keyword in intern_keywords:
            intern_count += text_lower.count(keyword)
        if intern_count > 0:
            internships = min(3.0, float(round(intern_count / 2.0)))
            
    # Estimate Certifications
    certifications = 0.0
    cert_matches = re.findall(r'(\d+)\s+(?:\w+\s+)?certification', text_lower)
    if cert_matches:
        try:
            certifications = float(cert_matches[0])
        except ValueError:
            pass
    else:
        cert_count = text_lower.count("certificat")
        if cert_count > 0:
            certifications = min(5.0, float(cert_count))
            
    # Estimate Communication
    communication = 70.0
    comm_keywords = ["communication", "present", "lead", "manage", "english", "team", "collaborat", "speak"]
    matched_comm = 0
    for kw in comm_keywords:
        matched_comm += text_lower.count(kw)
    if matched_comm > 0:
        communication = min(100.0, 65.0 + (matched_comm * 5.0))
        
    return {
        "cgpa": cgpa,
        "aptitude": aptitude,
        "projects": projects,
        "internships": internships,
        "certifications": certifications,
        "communication": communication
    }


def extract_resume_data(text=None, file=None):
    file_bytes = None
    file_mime = None
    is_image = False
    
    if file:
        filename = (file.filename or "").lower()
        if filename.endswith(".txt"):
            text = file.read().decode("utf-8", errors="ignore")
        elif filename.endswith(".pdf"):
            try:
                reader = PdfReader(file)
                extracted_text = ""
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
                text = extracted_text.strip()
            except Exception as e:
                text = f"Error reading PDF file: {str(e)}"
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            file_bytes = file.read()
            is_image = True
            if filename.endswith(".png"):
                file_mime = "image/png"
            else:
                file_mime = "image/jpeg"
        else:
            try:
                text = file.read().decode("utf-8", errors="ignore")
            except Exception:
                pass

    try:
        api_key = os.getenv("API_KEY")
        if not api_key:
            raise ValueError("API_KEY not found in environment variables")
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        system_prompt = (
            "You are a resume parsing assistant. Extract the following student credentials as a JSON object with keys: "
            "cgpa (float, scale 0-10), aptitude (float, scale 0-100), projects (int), internships (int), certifications (int), communication (float, scale 0-100). "
            "If some metrics are not explicitly stated, estimate them reasonably based on the resume contents: "
            "- CGPA: Estimate based on academic history, marks, or grades. Default to 7.0 if no info. "
            "- Aptitude: Estimate based on test scores, olympiads, technical skills, or problem-solving indicators. Default to 70 if no info. "
            "- Projects: Count the number of academic, personal, or group projects listed. "
            "- Internships: Count the number of work experiences, internships, or relevant training roles listed. "
            "- Certifications: Count the number of certifications or professional credentials listed. "
            "- Communication: Estimate from language skills, presentations, leadership roles. Default to 70 if no info."
        )
        
        if is_image:
            base64_image = base64.b64encode(file_bytes or b"").decode("utf-8")
            user_content = [
                {"type": "text", "text": "Extract student metrics from this resume image."},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{file_mime};base64,{base64_image}"
                    }
                }
            ]
        else:
            if not text:
                text = "No resume content provided."
            user_content = [
                {"type": "text", "text": f"Extract student metrics from this resume text:\n\n{text}"}
            ]

        payload = {
            "model": "gpt-4o",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req) as response:
            res_data = response.read()
            res_json = json.loads(res_data.decode("utf-8"))
            content = res_json["choices"][0]["message"]["content"]
            parsed_metrics = json.loads(content)
            return parsed_metrics
    except Exception as api_err:
        print(f"OpenAI parsing failed, falling back to local extractor: {str(api_err)}")
        if is_image:
            return {"cgpa": 8.0, "aptitude": 80.0, "projects": 3.0, "internships": 1.0, "certifications": 1.0, "communication": 75.0}
        return fallback_parse_resume_data(text)


@prediction_bp.route(
    "/predict",
    methods=["POST"]
)
def predict():
    data = request.json

    cgpa = float(data.get("cgpa", 0))
    aptitude = float(data.get("aptitude", 0))
    projects = float(data.get("projects", 0))
    internships = float(data.get("internships", 0))
    certifications = float(data.get("certifications", 0))
    communication = float(data.get("communication", 70.0))
    user_email = data.get("email")

    features = [[
        cgpa,
        aptitude,
        projects,
        internships,
        certifications,
        communication
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

    placement_probability = round(probability * 100, 2)
    recommendation = build_recommendation(placement_probability)
    
    # Calculate XAI contributions and digital twin simulations
    contributions = compute_xai_contributions(cgpa, aptitude, projects, internships, certifications, communication)
    risk_category = get_risk_category(placement_probability)
    twin_scenarios = run_twin_simulations(cgpa, aptitude, projects, internships, certifications, communication)

    save_prediction(
        user_email,
        cgpa,
        aptitude,
        projects,
        internships,
        placement_probability,
        recommendation,
        certifications,
        communication
    )

    return jsonify({
        "placement_probability": placement_probability,
        "recommendation": recommendation,
        "risk_category": risk_category,
        "contributions": contributions,
        "digital_twin_scenarios": twin_scenarios,
        "cgpa": cgpa,
        "aptitude": aptitude,
        "projects": projects,
        "internships": internships,
        "certifications": certifications,
        "communication": communication,
        "model_source": "trained_model" if not isinstance(model, FallbackPlacementModel) else "fallback_heuristic"
    })


@prediction_bp.route(
    "/predict_resume",
    methods=["POST"]
)
def predict_resume():
    try:
        user_email = request.form.get("email")
        text = request.form.get("text")
        file = request.files.get("resume")
        
        if not text and not file:
            return jsonify({"message": "Please upload a resume file or paste text"}), 400
            
        if file:
            UPLOAD_FOLDER = Path(__file__).resolve().parents[2] / "uploads"
            if not UPLOAD_FOLDER.exists():
                UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
            filename = file.filename or "resume"
            file_path = UPLOAD_FOLDER / filename
            file_path_str = str(file_path)
            file.save(file_path_str)
            file.seek(0)
            save_resume_upload(user_email, filename, file_path_str)
            
        metrics = extract_resume_data(text=text, file=file)
        
        cgpa = float(metrics.get("cgpa", 7.0))
        aptitude = float(metrics.get("aptitude", 70.0))
        projects = float(metrics.get("projects", 0.0))
        internships = float(metrics.get("internships", 0.0))
        certifications = float(metrics.get("certifications", 0.0))
        communication = float(metrics.get("communication", 70.0))
        
        features = [[
            cgpa,
            aptitude,
            projects,
            internships,
            certifications,
            communication
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
            
        placement_probability = round(probability * 100, 2)
        recommendation = build_recommendation(placement_probability)
        
        # Calculate XAI and twin simulations
        contributions = compute_xai_contributions(cgpa, aptitude, projects, internships, certifications, communication)
        risk_category = get_risk_category(placement_probability)
        twin_scenarios = run_twin_simulations(cgpa, aptitude, projects, internships, certifications, communication)
        
        save_prediction(
            user_email,
            cgpa,
            aptitude,
            projects,
            internships,
            placement_probability,
            recommendation,
            certifications,
            communication
        )
        
        return jsonify({
            "cgpa": cgpa,
            "aptitude": aptitude,
            "projects": projects,
            "internships": internships,
            "certifications": certifications,
            "communication": communication,
            "placement_probability": placement_probability,
            "recommendation": recommendation,
            "risk_category": risk_category,
            "contributions": contributions,
            "digital_twin_scenarios": twin_scenarios,
            "model_source": "trained_model" if not isinstance(model, FallbackPlacementModel) else "fallback_heuristic"
        })
    except Exception as e:
        return jsonify({"message": str(e)}), 500