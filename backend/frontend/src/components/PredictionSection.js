import { useState } from "react";
import axios from "axios";

function PredictionSection({ currentUser, onPrediction, onMessage }) {
	const [mode, setMode] = useState("file"); // "file" or "text"
	const [file, setFile] = useState(null);
	const [text, setText] = useState("");
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);

	const predictResume = async (event) => {
		event.preventDefault();
		setLoading(true);
		try {
			const formData = new FormData();
			formData.append("email", currentUser?.email || "");
			if (mode === "file") {
				if (!file) {
					onMessage?.("Please select a file to upload");
					setLoading(false);
					return;
				}
				formData.append("resume", file);
			} else {
				if (!text.trim()) {
					onMessage?.("Please paste your resume text");
					setLoading(false);
					return;
				}
				formData.append("text", text);
			}

			const response = await axios.post("/api/predict_resume", formData, {
				headers: {
					"Content-Type": "multipart/form-data"
				}
			});

			const payload = {
				...response.data
			};

			setResult(payload);
			onPrediction?.(payload);
			onMessage?.(`Prediction completed: ${response.data.placement_probability}%`);
		} catch (error) {
			onMessage?.(error.response?.data?.message || "Prediction failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="card-shell">
			<div className="card-header">
				<div>
					<h2 className="card-title">Placement forecast engine Center</h2>
					<p className="card-subtitle">Upload your resume (PDF, TXT, PNG, JPG, JPEG) or paste its text to generate a probability score and guidance.</p>
				</div>
				<div className="eyebrow" style={{ fontSize: "0.8rem" }}>Predictive flow</div>
			</div>

			<div className="tab-row" role="tablist" style={{ marginBottom: "1.5rem" }}>
				<button className={`tab-button ${mode === "file" ? "active" : ""}`} onClick={() => setMode("file")} type="button">Upload File</button>
				<button className={`tab-button ${mode === "text" ? "active" : ""}`} onClick={() => setMode("text")} type="button">Paste Text</button>
			</div>

			<form onSubmit={predictResume} className="form-grid">
				{mode === "file" ? (
					<div className="field full" style={{ marginBottom: "1rem" }}>
						<label>Resume File</label>
						<div 
							onClick={() => document.getElementById("resume-file-input").click()}
							style={{ 
								padding: "24px 16px", 
								background: "rgba(255, 255, 255, 0.02)", 
								border: "1px dashed rgba(255, 255, 255, 0.15)", 
								borderRadius: "16px", 
								textAlign: "center", 
								cursor: "pointer", 
								display: "flex", 
								flexDirection: "column", 
								alignItems: "center", 
								gap: "10px",
								transition: "border-color 160ms ease, background 160ms ease"
							}}
							onMouseOver={(e) => { e.currentTarget.style.borderColor = "rgba(94, 234, 212, 0.4)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)" }}
							onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)" }}
						>
							<span style={{ fontSize: "2rem" }}>📄</span>
							<input
								type="file"
								accept=".pdf,.txt,.png,.jpg,.jpeg"
								onChange={(event) => setFile(event.target.files[0])}
								style={{ display: "none" }}
								id="resume-file-input"
							/>
							<div style={{ color: "var(--brand)", fontWeight: "800", fontSize: "1rem" }}>
								{file ? file.name : "Click to choose resume file"}
							</div>
							<span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>Supports PDF, TXT, PNG, JPG, JPEG</span>
						</div>
					</div>
				) : (
					<div className="field full" style={{ marginBottom: "1rem" }}>
						<label>Resume Text</label>
						<div className="input-wrap">
							<textarea
								placeholder="Paste the plain text of your resume here..."
								value={text}
								onChange={(event) => setText(event.target.value)}
								style={{ paddingLeft: "16px" }}
							/>
						</div>
					</div>
				)}

				<div className="field full">
					<button className="submit-button" type="submit" disabled={loading}>
						{loading ? "Analyzing Resume..." : "Run AI prediction"}
					</button>
				</div>
			</form>

			{result ? (
				<div className="recommendation-banner" style={{ marginTop: "1.5rem" }}>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "14px", padding: "12px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>CGPA</div>
							<div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff" }}>{result.cgpa}</div>
						</div>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Aptitude</div>
							<div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff" }}>{result.aptitude}</div>
						</div>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Projects</div>
							<div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff" }}>{result.projects}</div>
						</div>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontSize: "0.78rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700" }}>Internships</div>
							<div style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff" }}>{result.internships}</div>
						</div>
					</div>
					<strong>Prediction:</strong> {result.placement_probability}% placement probability. {result.recommendation}
				</div>
			) : (
				<p className="footer-note">The result will appear here after you upload or paste your resume.</p>
			)}
		</section>
	);
}

export default PredictionSection;