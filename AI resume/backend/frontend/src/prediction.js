import React, { useState } from "react";
import axios from "axios";

function Prediction({ currentUser, onPrediction, onMessage }) {

  const [cgpa, setCgpa] = useState("");
  const [aptitude, setAptitude] = useState("");
  const [projects, setProjects] = useState("");
  const [internships, setInternships] = useState("");

  const [result, setResult] = useState("");
  const [recommendation, setRecommendation] = useState("");

  const predict = async () => {
    try {
      const response = await axios.post("/api/predict", {
        email: currentUser?.email,
        cgpa: Number(cgpa),
        aptitude: Number(aptitude),
        projects: Number(projects),
        internships: Number(internships)
      });

      setResult(response.data.placement_probability);
      setRecommendation(response.data.recommendation);

      if (onPrediction) {
        onPrediction({
          ...response.data,
          cgpa: Number(cgpa),
          aptitude: Number(aptitude),
          projects: Number(projects),
          internships: Number(internships)
        });
      }

      if (onMessage) {
        onMessage(`Prediction completed: ${response.data.placement_probability}%`);
      }
    } catch (error) {
      if (onMessage) {
        onMessage(error.response?.data?.message || "Prediction failed");
      }
    }
  };

  return (
    <div>

      <h1>
        Placement Prediction
      </h1>

      <input
        placeholder="CGPA"
        value={cgpa}
        onChange={(e) =>
          setCgpa(e.target.value)
        }
      />

      <input
        placeholder="Aptitude"
        value={aptitude}
        onChange={(e) =>
          setAptitude(e.target.value)
        }
      />

      <input
        placeholder="Projects"
        value={projects}
        onChange={(e) =>
          setProjects(e.target.value)
        }
      />

      <input
        placeholder="Internships"
        value={internships}
        onChange={(e) =>
          setInternships(e.target.value)
        }
      />

      <button onClick={predict}>
        Predict
      </button>

      <h2>
        Placement Chance:
        {result} %
      </h2>

      {recommendation && <p>{recommendation}</p>}

    </div>
  );
}

export default Prediction;