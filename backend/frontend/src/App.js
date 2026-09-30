import "./styles.css";
import Navbar from "./components/Navbar";
import AuthSection from "./components/AuthSection";
import PredictionSection from "./components/PredictionSection";
import DashboardSection from "./components/DashboardSection";
import AdminSection from "./components/AdminSection";
import LearningSection from "./components/LearningSection";
import JobsDashboardSection from "./components/JobsDashboardSection";
import { useState } from "react";
import axios from "axios";

axios.defaults.withCredentials = true;

function App() {
	const [currentUser, setCurrentUser] = useState(null);
	const [prediction, setPrediction] = useState(null);
	const [status, setStatus] = useState("Welcome! Please register or log in to begin.");
	const [view, setView] = useState("login"); // "login", "home", "prediction", "dashboard", "profile", "learning", "admin_dashboard", "career_board"

	const handleLogout = async () => {
		try {
			await axios.post("/api/logout");
		} catch (error) {
			console.error("Logout error", error);
		}
		setCurrentUser(null);
		setPrediction(null);
		setStatus("Logged out successfully.");
		setView("login");
	};

	// Enforce Login view when user is not authenticated
	if (!currentUser) {
		return (
			<div className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
				<div className="background-grid" />
				<div className="floating-orb orb-one" />
				<div className="floating-orb orb-two" />
				<div className="floating-orb orb-three" />
				<div style={{ width: "min(480px, 100% - 32px)" }}>
					<div style={{ textAlign: "center", marginBottom: "2rem" }}>
						<h1 className="gradient-text" style={{ fontSize: "2.5rem", fontWeight: "900", fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.04em", margin: "0 0 8px 0" }}>
							Placement AI Studio
						</h1>
						<p style={{ color: "var(--muted)", margin: 0, fontSize: "1rem" }}>
							Predict. guide. improve.
						</p>
					</div>
					<AuthSection
						currentUser={currentUser}
						onLogin={(user) => {
							setCurrentUser(user);
							setStatus(`Logged in successfully.`);
							if (user.role === "admin") {
								setView("admin_dashboard");
							} else {
								setView("home");
							}
						}}
						onRegister={(user) => {
							setCurrentUser(user);
							setStatus(`Registered successfully.`);
							if (user.role === "admin") {
								setView("admin_dashboard");
							} else {
								setView("home");
							}
						}}
						onMessage={setStatus}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="app-shell">
			<div className="background-grid" />
			<div className="floating-orb orb-one" />
			<div className="floating-orb orb-two" />
			<div className="floating-orb orb-three" />
			<Navbar
				currentUser={currentUser}
				currentView={view}
				setView={setView}
				onLogout={handleLogout}
			/>
			<main className="page-shell">
				{view === "home" && (
					<div style={{ display: "grid", gap: "24px" }}>
						<div className="glass-panel" style={{ padding: "34px", display: "grid", gap: "14px" }}>
							<h1 className="hero-title">
								{currentUser.is_first_login ? "Welcome" : "Welcome back"}, <span className="gradient-text">{currentUser.name || currentUser.email}</span>!
							</h1>
							<p className="hero-paragraph">
								You have successfully unlocked the college placement intelligence layer. From here, you can analyze your resume credentials, view forecast models, and optimize your skill gaps.
							</p>
							<div className="status-banner" style={{ marginTop: "10px" }}>{status}</div>
						</div>

						<div className="career-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
							<article className="career-card" onClick={() => setView("prediction")} style={{ cursor: "pointer", padding: "24px" }}>
								<div className="career-icon">🔮</div>
								<h3 className="career-title" style={{ fontSize: "1.2rem", margin: "10px 0" }}>Run Prediction</h3>
								<p className="career-desc">Upload your resume file, screenshot, or paste text to extract metrics and calculate placement chances.</p>
							</article>

							<article className="career-card" onClick={() => setView("dashboard")} style={{ cursor: "pointer", padding: "24px" }}>
								<div className="career-icon">📊</div>
								<h3 className="career-title" style={{ fontSize: "1.2rem", margin: "10px 0" }}>Interactive Dashboard</h3>
								<p className="career-desc">View probability gauges, skills metrics breakdowns, radar graphs, and career recommendation paths.</p>
							</article>

							<article className="career-card" onClick={() => setView("learning")} style={{ cursor: "pointer", padding: "24px" }}>
								<div className="career-icon">⚡</div>
								<h3 className="career-title" style={{ fontSize: "1.2rem", margin: "10px 0" }}>Learning Roadmap</h3>
								<p className="career-desc">Select your career goal, track skill checklists, access learning resources, and boost your prediction score.</p>
							</article>

							<article className="career-card" onClick={() => setView("career_board")} style={{ cursor: "pointer", padding: "24px" }}>
								<div className="career-icon">💼</div>
								<h3 className="career-title" style={{ fontSize: "1.2rem", margin: "10px 0" }}>Career Board</h3>
								<p className="career-desc">Browse jobs & internships, apply to postings, and track your active application pipeline statuses.</p>
							</article>

							<article className="career-card" onClick={() => setView("profile")} style={{ cursor: "pointer", padding: "24px" }}>
								<div className="career-icon">👤</div>
								<h3 className="career-title" style={{ fontSize: "1.2rem", margin: "10px 0" }}>Account Profile</h3>
								<p className="career-desc">View your registered student account profile information and manage active sessions.</p>
							</article>
						</div>
					</div>
				)}

				{view === "prediction" && (
					<PredictionSection
						currentUser={currentUser}
						onPrediction={(pred) => {
							setPrediction(pred);
						}}
						onMessage={setStatus}
					/>
				)}

				{view === "dashboard" && (
					<DashboardSection currentUser={currentUser} prediction={prediction} status={status} />
				)}

				{view === "learning" && (
					<LearningSection currentUser={currentUser} onMessage={setStatus} />
				)}

				{view === "career_board" && (
					<JobsDashboardSection currentUser={currentUser} onMessage={setStatus} />
				)}

				{view === "admin_dashboard" && (
					<AdminSection currentUser={currentUser} onMessage={setStatus} />
				)}

				{view === "profile" && (
					<section className="card-shell" style={{ maxWidth: "600px", margin: "0 auto" }}>
						<div className="card-header">
							<div>
								<h2 className="card-title">Student Account Profile</h2>
								<p className="card-subtitle">Current session details and active credentials.</p>
							</div>
							<div className="eyebrow" style={{ fontSize: "0.8rem" }}>Active session</div>
						</div>
						<div style={{ display: "grid", gap: "18px", margin: "24px 0", padding: "18px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px" }}>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ color: "var(--muted)" }}>Student Name:</span>
								<strong style={{ color: "#fff" }}>{currentUser.name || "Guest Student"}</strong>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ color: "var(--muted)" }}>Email Address:</span>
								<strong style={{ color: "#fff" }}>{currentUser.email}</strong>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={{ color: "var(--muted)" }}>Authentication Role:</span>
								<strong style={{ color: "var(--brand)" }}>Student User</strong>
							</div>
						</div>
						<button className="submit-button" onClick={handleLogout} style={{ width: "100%", background: "linear-gradient(135deg, rgba(248, 113, 113, 0.2), rgba(239, 68, 68, 0.2))", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.4)", boxShadow: "none" }} type="button">
							Sign out of session
						</button>
					</section>
				)}
			</main>
		</div>
	);
}

export default App;