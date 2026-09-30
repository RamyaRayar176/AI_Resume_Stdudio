import { useState, useEffect } from "react";
import axios from "axios";
import { FiCheckSquare, FiSquare, FiExternalLink, FiAward, FiBookOpen } from "react-icons/fi";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function LearningSection({ currentUser, onMessage }) {
    const [careerGoal, setCareerGoal] = useState("");
    const [skills, setSkills] = useState([]);
    const [allGoals, setAllGoals] = useState([]);
    const [probability, setProbability] = useState(null);
    const [recommendation, setRecommendation] = useState("");
    const [loading, setLoading] = useState(true);
    const [resourceFilter, setResourceFilter] = useState("all");

    const fetchSkills = async () => {
        try {
            const response = await axios.get(`/api/skills?email=${currentUser.email}`);
            setCareerGoal(response.data.career_goal);
            setSkills(response.data.skills);
            setAllGoals(response.data.all_goals || []);
        } catch (error) {
            onMessage?.(error.response?.data?.message || "Failed to load skills.");
        } finally {
            setLoading(false);
        }
    };

    const fetchLatestPrediction = async () => {
        try {
            // Retrieve latest prediction for placement probability display
            const response = await axios.post("/api/predict", {
                email: currentUser.email,
                cgpa: 0,
                aptitude: 0,
                projects: 0,
                internships: 0
            });
            // Note: the backend `/predict` endpoint saves and outputs probability, 
            // but we want to fetch the latest prediction from database if it exists.
            // Let's create a custom get latest prediction check on the backend or we can get it from skills toggle.
        } catch (e) {
            // Ignore
        }
    };

    useEffect(() => {
        fetchSkills();
        // Set initial probability from local prediction state if available, or just fetch
        const getInitialPredict = async () => {
            try {
                const res = await axios.get(`/api/admin/students/${currentUser.email}`);
                if (res.data && res.data.predictions && res.data.predictions.length > 0) {
                    setProbability(res.data.predictions[0].probability);
                    setRecommendation(res.data.predictions[0].recommendation);
                }
            } catch (e) {
                // Fail silently
            }
        };
        getInitialPredict();
    }, [currentUser]);

    const handleGoalChange = async (e) => {
        const newGoal = e.target.value;
        setLoading(true);
        try {
            const response = await axios.post("/api/skills/goal", {
                email: currentUser.email,
                career_goal: newGoal
            });
            onMessage?.(response.data.message);
            await fetchSkills();
            
            // Re-fetch latest prediction (career goal change changes the checklist and potentially updates scores)
            const res = await axios.get(`/api/admin/students/${currentUser.email}`);
            if (res.data && res.data.predictions && res.data.predictions.length > 0) {
                setProbability(res.data.predictions[0].probability);
                setRecommendation(res.data.predictions[0].recommendation);
            }
        } catch (error) {
            onMessage?.(error.response?.data?.message || "Failed to update career goal.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSkill = async (skillName, isCompleted) => {
        try {
            const response = await axios.post("/api/skills/toggle", {
                email: currentUser.email,
                skill_name: skillName,
                completed: isCompleted ? 1 : 0
            });
            
            // Update skills locally
            setSkills(prev => prev.map(s => {
                if (s.skill_name === skillName) {
                    return { ...s, completed: isCompleted ? 1 : 0 };
                }
                return s;
            }));

            if (response.data.updated_placement_probability !== undefined) {
                setProbability(response.data.updated_placement_probability);
                // Dynamically build recommendation local view
                const prob = response.data.updated_placement_probability;
                let rec = "Placement needs attention. Build foundational skills, internship exposure, and practice aptitude daily.";
                if (prob >= 80) rec = "Excellent placement outlook. Focus on interview practice and portfolio polish.";
                else if (prob >= 60) rec = "Good placement outlook. Strengthen projects, aptitude, and communication skills.";
                else if (prob >= 40) rec = "Moderate placement outlook. Improve core technical skills and add one strong project.";
                setRecommendation(rec);
                onMessage?.(`Skill completion updated! Live Placement Probability: ${prob}%`);
            } else {
                onMessage?.("Skill completion updated!");
            }
        } catch (error) {
            onMessage?.(error.response?.data?.message || "Failed to update skill status.");
        }
    };

    const completedCount = skills.filter(s => s.completed === 1).length;
    const totalCount = skills.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const gaugeStyle = buildStyles({
        pathColor: "var(--brand)",
        trailColor: "rgba(255,255,255,0.08)",
        textColor: "#fff",
        strokeLinecap: "round"
    });

    if (loading) {
        return (
            <div className="empty-state glass-panel">
                <p className="section-title">Loading learning roadmap...</p>
            </div>
        );
    }

    return (
        <section className="card-shell" style={{ display: "grid", gap: "24px" }}>
            <div className="card-header">
                <div>
                    <h2 className="card-title">Skill Learning & Roadmap Portal</h2>
                    <p className="card-subtitle">Select your career goal, complete the recommended checklist, and boost your live placement probability!</p>
                </div>
                <div className="eyebrow" style={{ fontSize: "0.8rem" }}>Goal Tracking</div>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr 340px" }}>
                {/* Main Roadmap */}
                <div style={{ display: "grid", gap: "20px" }}>
                    <div className="glass-panel" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "20px" }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, color: "var(--muted)", marginBottom: "8px" }}>Select Career Goal</label>
                            <div className="input-wrap">
                                <select 
                                    value={careerGoal} 
                                    onChange={handleGoalChange}
                                    style={{
                                        width: "100%",
                                        borderRadius: "16px",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        background: "rgba(3, 8, 18, 0.8)",
                                        color: "white",
                                        padding: "12px 16px",
                                        outline: "none",
                                        fontSize: "1rem"
                                    }}
                                >
                                    {allGoals.map(g => (
                                        <option key={g} value={g} style={{ background: "#0d1730", color: "#fff" }}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }}>Skill Requirements Checklist</h3>
                            
                            <div className="tab-row" style={{ margin: 0 }}>
                                <button 
                                    className={`tab-button ${resourceFilter === "all" ? "active" : ""}`}
                                    onClick={() => setResourceFilter("all")}
                                    style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                >
                                    🌐 All
                                </button>
                                <button 
                                    className={`tab-button ${resourceFilter === "unpaid" ? "active" : ""}`}
                                    onClick={() => setResourceFilter("unpaid")}
                                    style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                >
                                    🎁 Free
                                </button>
                                <button 
                                    className={`tab-button ${resourceFilter === "paid" ? "active" : ""}`}
                                    onClick={() => setResourceFilter("paid")}
                                    style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                                >
                                    💎 Paid
                                </button>
                            </div>
                        </div>
                        
                        {skills.map((skill) => {
                            const unpaidResources = (skill.resources || []).filter(r => r.type === "unpaid");
                            const paidResources = (skill.resources || []).filter(r => r.type === "paid");
                            
                            return (
                                <div 
                                    key={skill.skill_name} 
                                    className="glass-panel"
                                    style={{ 
                                        padding: "18px", 
                                        display: "flex", 
                                        flexDirection: "column",
                                        gap: "12px",
                                        borderLeft: skill.completed === 1 ? "4px solid var(--success)" : "4px solid var(--border)",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <div 
                                            style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                                            onClick={() => handleToggleSkill(skill.skill_name, skill.completed === 0)}
                                        >
                                            {skill.completed === 1 ? (
                                                <FiCheckSquare size={22} style={{ color: "var(--success)" }} />
                                            ) : (
                                                <FiSquare size={22} style={{ color: "var(--muted)" }} />
                                            )}
                                            <span style={{ 
                                                fontSize: "1.1rem", 
                                                fontWeight: 600, 
                                                textDecoration: skill.completed === 1 ? "line-through" : "none",
                                                color: skill.completed === 1 ? "var(--muted)" : "#fff" 
                                            }}>
                                                {skill.skill_name}
                                            </span>
                                        </div>
                                        {skill.completed === 1 && (
                                            <span className="eyebrow" style={{ color: "var(--success)", borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.05)", padding: "4px 10px", fontSize: "0.75rem" }}>
                                                Completed
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: "grid", gap: "12px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", marginTop: "4px" }}>
                                        {/* Unpaid Resources */}
                                        {(resourceFilter === "all" || resourceFilter === "unpaid") && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--success)", display: "flex", alignItems: "center", gap: "5px", background: "rgba(52,211,153,0.06)", padding: "4px 8px", borderRadius: "8px", border: "1px solid rgba(52,211,153,0.12)" }}>
                                                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--success)" }} />
                                                    Free / Unpaid
                                                </span>
                                                {unpaidResources.length > 0 ? (
                                                    unpaidResources.map((res, i) => (
                                                        <a 
                                                            key={i} 
                                                            href={res.url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="secondary-button" 
                                                            style={{ 
                                                                padding: "6px 12px", 
                                                                borderRadius: "10px", 
                                                                fontSize: "0.8rem", 
                                                                display: "inline-flex", 
                                                                alignItems: "center", 
                                                                gap: "6px",
                                                                background: "rgba(255,255,255,0.03)",
                                                                border: "1px solid rgba(255,255,255,0.06)"
                                                            }}
                                                        >
                                                            <span>{res.platform}</span>
                                                            <span style={{ color: "var(--muted)" }}>({res.title})</span>
                                                            <FiExternalLink size={12} style={{ color: "var(--success)", opacity: 0.8 }} />
                                                        </a>
                                                    ))
                                                ) : (
                                                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>No free resources listed</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Paid Resources */}
                                        {(resourceFilter === "all" || resourceFilter === "paid") && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--warning)", display: "flex", alignItems: "center", gap: "5px", background: "rgba(251,191,36,0.06)", padding: "4px 8px", borderRadius: "8px", border: "1px solid rgba(251,191,36,0.12)" }}>
                                                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--warning)" }} />
                                                    Paid / Premium
                                                </span>
                                                {paidResources.length > 0 ? (
                                                    paidResources.map((res, i) => (
                                                        <a 
                                                            key={i} 
                                                            href={res.url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="secondary-button" 
                                                            style={{ 
                                                                padding: "6px 12px", 
                                                                borderRadius: "10px", 
                                                                fontSize: "0.8rem", 
                                                                display: "inline-flex", 
                                                                alignItems: "center", 
                                                                gap: "6px",
                                                                background: "rgba(255,255,255,0.03)",
                                                                border: "1px solid rgba(255,255,255,0.06)"
                                                            }}
                                                        >
                                                            <span>{res.platform}</span>
                                                            <span style={{ color: "var(--muted)" }}>({res.title})</span>
                                                            <FiExternalLink size={12} style={{ color: "var(--warning)", opacity: 0.8 }} />
                                                        </a>
                                                    ))
                                                ) : (
                                                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>No paid resources listed</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar Analytics */}
                <div style={{ display: "grid", gap: "20px", alignContent: "start" }}>
                    <div className="glass-panel" style={{ padding: "20px", textAlign: "center" }}>
                        <h4 style={{ margin: "0 0 14px 0", fontSize: "1rem", fontWeight: 700, color: "var(--muted)" }}>Roadmap Progress</h4>
                        <div style={{ width: "130px", height: "130px", margin: "0 auto 14px" }}>
                            <CircularProgressbar
                                value={progressPercent}
                                text={`${progressPercent}%`}
                                styles={gaugeStyle}
                            />
                        </div>
                        <p style={{ margin: 0, fontSize: "0.95rem", color: "#fff" }}>
                            <strong>{completedCount}</strong> of <strong>{totalCount}</strong> skills completed
                        </p>
                    </div>

                    <div className="glass-panel" style={{ padding: "20px", display: "grid", gap: "12px" }}>
                        <h4 style={{ margin: "0", fontSize: "1rem", fontWeight: 700, color: "var(--muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                            <FiAward size={18} style={{ color: "var(--brand)" }} /> Placement Probability
                        </h4>
                        
                        {probability !== null ? (
                            <div style={{ marginTop: "5px" }}>
                                <p style={{ fontSize: "2.4rem", fontWeight: 900, margin: "0 0 6px 0", color: "var(--brand)", fontFamily: "Space Grotesk, sans-serif" }}>
                                    {probability}%
                                </p>
                                <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
                                    {recommendation || "Recalculating forecast based on completed skills..."}
                                </p>
                            </div>
                        ) : (
                            <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: 0, fontStyle: "italic" }}>
                                Please run an initial resume prediction first to calculate placement probability.
                            </p>
                        )}
                    </div>

                    <div className="glass-panel" style={{ padding: "20px", background: "rgba(94, 234, 212, 0.03)", border: "1px solid rgba(94, 234, 212, 0.15)" }}>
                        <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--brand)" }}>Model Insight</h4>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
                            Completing technical roadmap skills dynamically updates your mock ML model feature matrix. Each completed skill simulates added project experience and aptitude points, improving your forecast!
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default LearningSection;
