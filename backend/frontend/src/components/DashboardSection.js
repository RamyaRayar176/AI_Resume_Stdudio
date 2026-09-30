import { useState, useEffect, useMemo } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Radar } from "react-chartjs-2";
import "chart.js/auto";
import { motion } from "framer-motion";
import axios from "axios";
import { FiSliders, FiCpu, FiTrendingUp, FiAlertCircle } from "react-icons/fi";

function clamp(value, min = 0, max = 100) {
	return Math.max(min, Math.min(max, value));
}

function percent(value, scale = 1) {
	return clamp(Number(value || 0) * scale);
}

function getCareerCards(probability) {
	if (probability >= 80) {
		return [
			{
				title: "Data Analyst",
				description: "Strong fit for analytics, dashboards, and business intelligence roles.",
				icon: "TR"
			},
			{
				title: "Software Developer",
				description: "Good readiness for entry-level engineering and product teams.",
				icon: "SD"
			},
			{
				title: "Interview Ready",
				description: "Focus on storytelling, projects, and portfolio refinement.",
				icon: "IR"
			}
		];
	}

	if (probability >= 60) {
		return [
			{
				title: "Junior Analyst",
				description: "A balanced track for data-heavy support and operations roles.",
				icon: "TR"
			},
			{
				title: "Support Engineer",
				description: "Best suited for technical support and implementation positions.",
				icon: "SE"
			},
			{
				title: "Upskilling Track",
				description: "Prioritize projects, aptitude, and interview simulation.",
				icon: "UP"
			}
		];
	}

	return [
		{
			title: "Foundation Builder",
			description: "Refine core CS concepts and build one strong portfolio project.",
			icon: "FB"
		},
		{
			title: "Aptitude Sprint",
			description: "Daily practice on problem solving and structured reasoning.",
			icon: "AS"
		},
		{
			title: "Experience Plan",
			description: "Seek internship exposure, team projects, and code reviews.",
			icon: "EP"
		}
	];
}

function DashboardSection({ currentUser, prediction, status }) {
	const [activePrediction, setActivePrediction] = useState(null);

	// Load initial prediction or fetch from DB
	useEffect(() => {
		if (prediction) {
			setActivePrediction({
				placement_probability: Number(prediction.placement_probability || 0),
				recommendation: prediction.recommendation,
				cgpa: Number(prediction.cgpa || 7.5),
				aptitude: Number(prediction.aptitude || 75),
				projects: Number(prediction.projects || 2),
				internships: Number(prediction.internships || 1),
				certifications: Number(prediction.certifications || 0),
				communication: Number(prediction.communication || 70),
				risk_category: prediction.risk_category || "Medium Risk",
				contributions: prediction.contributions
			});
		} else if (currentUser) {
			const fetchLatest = async () => {
				try {
					const res = await axios.get(`/api/admin/students/${currentUser.email}`);
					if (res.data && res.data.predictions && res.data.predictions.length > 0) {
						const p = res.data.predictions[0];
						const prob = Number(p.probability || 0);
						setActivePrediction({
							placement_probability: prob,
							recommendation: p.recommendation,
							cgpa: Number(p.cgpa || 7.5),
							aptitude: Number(p.aptitude || 75),
							projects: Number(p.projects || 2),
							internships: Number(p.internships || 1),
							certifications: Number(p.certifications || 0),
							communication: Number(p.communication || 70),
							risk_category: prob >= 75 ? "High Placement Probability" : (prob >= 45 ? "Medium Risk" : "High Risk"),
							contributions: null
						});
					}
				} catch (e) {
					// Silent fallback
				}
			};
			fetchLatest();
		}
	}, [prediction, currentUser]);

	// Twin simulator state initialized to student values
	const [twinCgpa, setTwinCgpa] = useState(7.5);
	const [twinAptitude, setTwinAptitude] = useState(75);
	const [twinProjects, setTwinProjects] = useState(2);
	const [twinInternships, setTwinInternships] = useState(1);
	const [twinCertifications, setTwinCertifications] = useState(0);
	const [twinCommunication, setTwinCommunication] = useState(70);

	// Sync twin state when activePrediction changes
	useEffect(() => {
		if (activePrediction) {
			setTwinCgpa(activePrediction.cgpa);
			setTwinAptitude(activePrediction.aptitude);
			setTwinProjects(activePrediction.projects);
			setTwinInternships(activePrediction.internships);
			setTwinCertifications(activePrediction.certifications);
			setTwinCommunication(activePrediction.communication);
		}
	}, [activePrediction]);

	// Local heuristic model evaluation
	const evaluateModel = (cgpa, aptitude, projects, internships, certifications, communication) => {
		const normalizedCgpa = Math.max(0, Math.min(cgpa / 10.0, 1.0));
		const normalizedAptitude = Math.max(0, Math.min(aptitude / 100.0, 1.0));
		const normalizedProjects = Math.max(0, Math.min(projects / 10.0, 1.0));
		const normalizedInternships = Math.max(0, Math.min(internships / 5.0, 1.0));
		const normalizedCerts = Math.max(0, Math.min(certifications / 5.0, 1.0));
		const normalizedComm = Math.max(0, Math.min(communication / 100.0, 1.0));

		const score = (
			0.35 * normalizedCgpa
			+ 0.25 * normalizedAptitude
			+ 0.15 * normalizedProjects
			+ 0.12 * normalizedInternships
			+ 0.08 * normalizedCerts
			+ 0.05 * normalizedComm
		);
		const probability = Math.round(Math.max(0.0, Math.min(score, 1.0)) * 100 * 100) / 100;
		
		// Contributions relative to baselines: CGPA=7.5, Aptitude=75, Projects=2, Internships=1, Certs=1, Comm=70
		const cgpa_contrib = 0.35 * (normalizedCgpa - 0.75) * 100;
		const aptitude_contrib = 0.25 * (normalizedAptitude - 0.75) * 100;
		const projects_contrib = 0.15 * (normalizedProjects - 0.20) * 100;
		const internships_contrib = 0.12 * (normalizedInternships - 0.20) * 100;
		const certs_contrib = 0.08 * (normalizedCerts - 0.20) * 100;
		const comm_contrib = 0.05 * (normalizedComm - 0.70) * 100;

		return {
			probability,
			contributions: {
				"CGPA": Number(cgpa_contrib.toFixed(1)),
				"Aptitude": Number(aptitude_contrib.toFixed(1)),
				"Projects": Number(projects_contrib.toFixed(1)),
				"Internships": Number(internships_contrib.toFixed(1)),
				"Certifications": Number(certs_contrib.toFixed(1)),
				"Communication": Number(comm_contrib.toFixed(1))
			}
		};
	};

	const baselineResults = useMemo(() => {
		if (!activePrediction) return null;
		return evaluateModel(
			activePrediction.cgpa,
			activePrediction.aptitude,
			activePrediction.projects,
			activePrediction.internships,
			activePrediction.certifications,
			activePrediction.communication
		);
	}, [activePrediction]);

	const simulatedResults = useMemo(() => {
		return evaluateModel(
			twinCgpa,
			twinAptitude,
			twinProjects,
			twinInternships,
			twinCertifications,
			twinCommunication
		);
	}, [twinCgpa, twinAptitude, twinProjects, twinInternships, twinCertifications, twinCommunication]);

	const probability = Number(activePrediction?.placement_probability || 0);
	const normalizedAptitude = percent(activePrediction?.aptitude, 1);
	const normalizedCgpa = percent(activePrediction?.cgpa, 10);
	const normalizedProjects = percent(activePrediction?.projects, 15);
	const normalizedInternships = percent(activePrediction?.internships, 25);
	const readiness = clamp(Math.round((probability + normalizedCgpa + normalizedAptitude) / 3));

	const dashboardData = useMemo(() => {
		return {
			radar: {
				labels: ["CGPA", "Aptitude", "Projects", "Internships", "Readiness"],
				datasets: [
					{
						label: "Current profile",
						data: [normalizedCgpa, normalizedAptitude, normalizedProjects, normalizedInternships, readiness],
						borderColor: "rgba(94, 234, 212, 0.9)",
						backgroundColor: "rgba(94, 234, 212, 0.18)",
						pointBackgroundColor: "#5eead4",
						borderWidth: 2,
						fill: true
					},
					{
						label: "Target profile",
						data: [92, 88, 84, 74, 96],
						borderColor: "rgba(96, 165, 250, 0.7)",
						backgroundColor: "rgba(96, 165, 250, 0.08)",
						pointBackgroundColor: "#60a5fa",
						borderWidth: 2,
						fill: true
					}
				]
			}
		};
	}, [normalizedAptitude, normalizedCgpa, normalizedInternships, normalizedProjects, readiness]);

	const gaugeStyle = buildStyles({
		pathColor: "var(--brand)",
		trailColor: "rgba(255,255,255,0.08)",
		textColor: "#ecf4ff",
		strokeLinecap: "round"
	});

	const simGaugeStyle = buildStyles({
		pathColor: simulatedResults.probability >= 75 ? "var(--success)" : (simulatedResults.probability >= 45 ? "var(--warning)" : "var(--danger)"),
		trailColor: "rgba(255,255,255,0.08)",
		textColor: "#ecf4ff",
		strokeLinecap: "round"
	});

	const insights = [
		{ label: "Probability", value: `${probability.toFixed(1)}%`, helper: "placement estimate" },
		{ label: "Profile readiness", value: `${readiness}%`, helper: "overall strength" },
		{ label: "Skill gaps", value: `${100 - readiness}%`, helper: "upgrade area" }
	];

	const careerCards = getCareerCards(simulatedResults.probability);
	
	const delta = simulatedResults.probability - (baselineResults?.probability || 0);
	const deltaFormatted = delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`;

	return (
		<section className="card-shell">
			<div className="card-header">
				<div>
					<h2 className="card-title">Placement Digital Twin & Talent Dashboard</h2>
					<p className="card-subtitle">Verify feature contributions using Explainable AI (XAI) and simulate upgrades on your virtual Twin.</p>
				</div>
				<div className="eyebrow" style={{ fontSize: "0.8rem" }}>TalentTwin Core</div>
			</div>

			{activePrediction ? (
				<div className="dashboard-grid">
					{/* Left Column: XAI & Metrics */}
					<div>
						{/* Baseline Placement Probability Gauge */}
						<div className="glass-panel section-shell" style={{ padding: 22 }}>
							<div className="probability-shell">
								<div className="circle-box">
									<CircularProgressbar
										value={probability}
										text={`${probability.toFixed(0)}%`}
										styles={gaugeStyle}
									/>
								</div>
								<div>
									<p className="probability-label">Placement probability</p>
									<p className="probability-value gradient-text">{probability.toFixed(1)}%</p>
									<p className="probability-copy">{activePrediction.recommendation}</p>
									<p className="footer-note">Model source: {activePrediction.model_source || "trained_model"}. Risk class: {activePrediction.risk_category || "Medium Risk"}</p>
								</div>
							</div>
						</div>

						{/* Quick Analytics Cards */}
						<div className="insight-grid">
							{insights.map((item) => (
								<div
									key={item.label}
									className="insight-card"
								>
									<h4>{item.label}</h4>
									<p style={{ fontSize: "1.6rem", fontWeight: 900, color: "#fff" }}>{item.value}</p>
									<p>{item.helper}</p>
								</div>
							))}
						</div>

						{/* Explainable AI SHAP Chart Panel */}
						<div className="glass-panel" style={{ padding: "24px", marginTop: "20px" }}>
							<h4 style={{ margin: "0 0 10px 0", fontSize: "1.05rem", fontWeight: 800, fontFamily: "Space Grotesk, sans-serif", display: "flex", alignItems: "center", gap: "8px" }}>
								<FiCpu style={{ color: "var(--brand)" }} /> Explainable AI (XAI) Feature Contributions
							</h4>
							<p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
								Attribution scores show how each metric drives (+) or restricts (-) placement probability relative to class averages.
							</p>
							
							<div style={{ display: "grid", gap: "6px" }}>
								{Object.entries(baselineResults?.contributions || {}).map(([feature, val]) => {
									const isPos = val >= 0;
									const pct = Math.min(50, Math.abs(val) * 1.5); // scale to fit layout nicely
									
									return (
										<div key={feature} style={{ display: "grid", gridTemplateColumns: "110px 1fr 65px", alignItems: "center", gap: "12px", margin: "6px 0" }}>
											<span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>{feature}</span>
											<div style={{ position: "relative", height: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "6px", overflow: "hidden" }}>
												<div 
													style={{
														position: "absolute",
														left: isPos ? "50%" : `calc(50% - ${pct}%)`,
														width: `${pct}%`,
														height: "100%",
														background: isPos 
															? "linear-gradient(90deg, rgba(52,211,153,0.3), var(--success))" 
															: "linear-gradient(90deg, var(--danger), rgba(248,113,113,0.3))",
														borderRadius: "4px",
														transition: "all 0.3s ease"
													}}
												/>
												<div style={{ position: "absolute", left: "50%", width: "1.5px", height: "100%", background: "rgba(255,255,255,0.18)" }} />
											</div>
											<span style={{ fontSize: "0.85rem", fontWeight: 700, color: isPos ? "var(--success)" : "var(--danger)", textAlign: "right" }}>
												{isPos ? "+" : ""}{val.toFixed(1)}%
											</span>
										</div>
									);
								})}
							</div>
						</div>
					</div>

					{/* Right Column: Digital Twin Simulator & Radar */}
					<div>
						{/* Digital Twin Simulator Panel */}
						<div className="glass-panel" style={{ padding: "24px", background: "rgba(13, 23, 48, 0.4)", border: "1px solid rgba(94, 234, 212, 0.15)" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
								<h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, fontFamily: "Space Grotesk, sans-serif", display: "flex", alignItems: "center", gap: "8px" }}>
									<FiSliders style={{ color: "var(--brand)" }} /> Placement Digital Twin Simulator
								</h4>
								<span className="eyebrow" style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(94,234,212,0.06)", borderColor: "rgba(94,234,212,0.15)" }}>
									Twin Mode
								</span>
							</div>
							
							{/* Live Twin Gauge */}
							<div style={{ display: "flex", gap: "20px", alignItems: "center", padding: "16px", background: "rgba(3,8,18,0.5)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", marginBottom: "20px" }}>
								<div style={{ width: "90px", height: "90px" }}>
									<CircularProgressbar
										value={simulatedResults.probability}
										text={`${simulatedResults.probability.toFixed(0)}%`}
										styles={simGaugeStyle}
									/>
								</div>
								<div>
									<div style={{ fontSize: "0.82rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Simulated Placement Probability</div>
									<div style={{ fontSize: "1.8rem", fontWeight: "900", color: "#fff", fontFamily: "Space Grotesk, sans-serif", marginTop: "2px" }}>
										{simulatedResults.probability.toFixed(1)}%
									</div>
									<div style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
										<FiTrendingUp style={{ color: delta >= 0 ? "var(--success)" : "var(--danger)" }} />
										<span style={{ color: delta >= 0 ? "var(--success)" : "var(--danger)", fontWeight: "700" }}>
											{deltaFormatted} deviation
										</span>
										<span style={{ color: "var(--muted)" }}>from baseline profile</span>
									</div>
								</div>
							</div>

							{/* Sliders Grid */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
								<div>
									<label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", color: "#fff" }}>
										<span>CGPA</span>
										<span style={{ color: "var(--brand)" }}>{twinCgpa.toFixed(1)}</span>
									</label>
									<input 
										type="range" min="5.0" max="10.0" step="0.1" 
										value={twinCgpa} onChange={(e) => setTwinCgpa(parseFloat(e.target.value))}
										style={{ width: "100%", height: "6px", accentColor: "var(--brand)", marginTop: "8px" }}
									/>
								</div>
								<div>
									<label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", color: "#fff" }}>
										<span>Aptitude Score</span>
										<span style={{ color: "var(--brand)" }}>{twinAptitude}</span>
									</label>
									<input 
										type="range" min="30" max="100" step="1" 
										value={twinAptitude} onChange={(e) => setTwinAptitude(parseInt(e.target.value))}
										style={{ width: "100%", height: "6px", accentColor: "var(--brand)", marginTop: "8px" }}
									/>
								</div>
								<div>
									<label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", color: "#fff" }}>
										<span>Projects Count</span>
										<span style={{ color: "var(--brand)" }}>{twinProjects}</span>
									</label>
									<input 
										type="range" min="0" max="10" step="1" 
										value={twinProjects} onChange={(e) => setTwinProjects(parseInt(e.target.value))}
										style={{ width: "100%", height: "6px", accentColor: "var(--brand)", marginTop: "8px" }}
									/>
								</div>
								<div>
									<label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", color: "#fff" }}>
										<span>Internships Count</span>
										<span style={{ color: "var(--brand)" }}>{twinInternships}</span>
									</label>
									<input 
										type="range" min="0" max="5" step="1" 
										value={twinInternships} onChange={(e) => setTwinInternships(parseInt(e.target.value))}
										style={{ width: "100%", height: "6px", accentColor: "var(--brand)", marginTop: "8px" }}
									/>
								</div>
								<div>
									<label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", color: "#fff" }}>
										<span>Certifications</span>
										<span style={{ color: "var(--brand)" }}>{twinCertifications}</span>
									</label>
									<input 
										type="range" min="0" max="5" step="1" 
										value={twinCertifications} onChange={(e) => setTwinCertifications(parseInt(e.target.value))}
										style={{ width: "100%", height: "6px", accentColor: "var(--brand)", marginTop: "8px" }}
									/>
								</div>
								<div>
									<label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", color: "#fff" }}>
										<span>Communication Score</span>
										<span style={{ color: "var(--brand)" }}>{twinCommunication}</span>
									</label>
									<input 
										type="range" min="30" max="100" step="1" 
										value={twinCommunication} onChange={(e) => setTwinCommunication(parseInt(e.target.value))}
										style={{ width: "100%", height: "6px", accentColor: "var(--brand)", marginTop: "8px" }}
									/>
								</div>
							</div>
						</div>

						{/* Dynamic Career recommendations */}
						<div className="career-grid" style={{ marginTop: "20px" }}>
							{careerCards.map((card) => {
								return (
									<article className="career-card" key={card.title}>
										<div className="career-icon">{card.icon}</div>
										<h3 className="career-title">{card.title}</h3>
										<p className="career-desc">{card.description}</p>
									</article>
								);
							})}
						</div>

						{/* Profile Strength Radar Panel */}
						<div className="glass-panel" style={{ padding: "20px", marginTop: "20px", height: "300px" }}>
							<Radar
								data={dashboardData.radar}
								options={{
									maintainAspectRatio: false,
									scales: {
										r: {
											min: 0,
											max: 100,
											angleLines: { color: "rgba(255,255,255,0.08)" },
											grid: { color: "rgba(255,255,255,0.06)" },
											pointLabels: { color: "#dce8ff", font: { size: 11, weight: 700 } },
											ticks: { display: false }
										}
									},
									plugins: {
										legend: { labels: { color: "#dce8ff", font: { size: 10 } } }
									}
								}}
							/>
						</div>
					</div>
				</div>
			) : (
				<div className="empty-state glass-panel">
					<p className="section-title" style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
						<FiAlertCircle /> Waiting for a prediction
					</p>
					<p className="section-copy">Run the prediction flow in the prediction tab to upload your credentials, and unlock the live interactive twin simulator and Explainable AI matrices.</p>
					<p className="footer-note">Status: {status}</p>
				</div>
			)}
		</section>
	);
}

export default DashboardSection;