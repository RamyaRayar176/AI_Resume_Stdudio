import React from "react";

function Dashboard({ currentUser, prediction }) {

  const probability = prediction?.placement_probability || 0;

  const student = {
    name: currentUser?.name || "Guest Student",
    cgpa: prediction?.cgpa || "-",
    placementProbability: probability,
    career: probability >= 80
      ? "Data Analyst / Software Developer"
      : probability >= 60
        ? "Junior Analyst / Support Engineer"
        : "Skill Building Track",
    skills: ["Python", "SQL", "Communication", "Projects"],
    missingSkills: probability >= 80
      ? ["Interview practice", "Portfolio polish"]
      : ["More projects", "Aptitude practice", "Core CS revision"]
  };

  return (
    <div style={{ padding: "20px" }}>

      <h1>Student Dashboard</h1>

      <h2>Welcome, {student.name}</h2>

      <hr />

      <h3>Academic Details</h3>

      <p>CGPA: {student.cgpa}</p>

      <hr />

      <h3>Placement Prediction</h3>

      {prediction ? (
        <div>
          <p>
            Placement Probability:
            <strong>
              {" "}
              {student.placementProbability}%
            </strong>
          </p>
          <p>{prediction.recommendation}</p>
        </div>
      ) : (
        <p>Run a prediction from the form above to see your result here.</p>
      )}

      <hr />

      <h3>Recommended Career</h3>

      <p>{student.career}</p>

      <hr />

      <h3>Current Skills</h3>

      <ul>
        {student.skills.map((skill, index) => (
          <li key={index}>{skill}</li>
        ))}
      </ul>

      <hr />

      <h3>Skills To Improve</h3>

      <ul>
        {student.missingSkills.map(
          (skill, index) => (
            <li key={index}>{skill}</li>
          )
        )}
      </ul>

    </div>
  );
}

export default Dashboard;