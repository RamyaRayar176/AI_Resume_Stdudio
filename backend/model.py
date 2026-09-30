import os
from pathlib import Path
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

BASE_DIR = Path(__file__).resolve().parent
dataset_path = BASE_DIR.parent / "student_placement_dataset_1M.csv"

print("Loading dataset...")
# Load a subset of 100,000 rows for fast training
data = pd.read_csv(dataset_path, nrows=100000)

# Map features to match what predictions expect
X = pd.DataFrame({
    "cgpa": data["cgpa"],
    "aptitude": data["aptitude_score"],
    "projects": data["projects"],
    "internships": data["internships"],
    "certifications": data["certifications"],
    "communication": data["communication_skill"]
})

y = data["placed"]

print("Training model...")
model = RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
model.fit(X, y)

model_save_path = BASE_DIR / "placement_model.pkl"
joblib.dump(model, model_save_path)
print(f"Model saved successfully to {model_save_path}")