import { useState } from "react";
import Navbar from "./navbar";
import Login from "./login";
import Register from "./register";
import Dashboard from "./dashboard";
import Prediction from "./prediction";

function App() {

  const [currentUser, setCurrentUser] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [status, setStatus] = useState("Register or log in to begin.");

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "Arial, sans-serif" }}>

      <Navbar currentUser={currentUser} />

      <main style={{ maxWidth: "1180px", margin: "0 auto", padding: "24px" }}>

        <section style={{ background: "white", borderRadius: "18px", padding: "24px", boxShadow: "0 10px 30px rgba(15,23,42,0.08)", marginBottom: "24px" }}>
          <h1 style={{ marginTop: 0 }}>AI-Powered College Placement Prediction and Career Guidance System</h1>
          <p style={{ color: "#475569", lineHeight: 1.6 }}>
            Register or log in, enter student details, get a placement prediction, and view career guidance from one place.
          </p>
          <p style={{ fontWeight: 700, color: "#0f172a" }}>{status}</p>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
          <Login
            onLogin={(user) => {
              setCurrentUser(user);
              setStatus(`Logged in as ${user.email}`);
            }}
            onMessage={setStatus}
          />

          <Register
            onRegister={(user) => {
              setCurrentUser(user);
              setStatus(`Registered as ${user.email}`);
            }}
            onMessage={setStatus}
          />
        </section>

        <section style={{ marginBottom: "24px" }}>
          <Prediction
            currentUser={currentUser}
            onPrediction={setPrediction}
            onMessage={setStatus}
          />
        </section>

        <section>
          <Dashboard currentUser={currentUser} prediction={prediction} />
        </section>

      </main>
    </div>
  );
}

export default App;