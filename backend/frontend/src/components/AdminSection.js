import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { FiUsers, FiFileText, FiTrendingUp, FiActivity, FiDownload, FiSearch, FiArrowLeft, FiCheckCircle, FiBookOpen } from "react-icons/fi";
import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

function AdminSection({ currentUser, onMessage }) {
    const [dashboardData, setDashboardData] = useState(null);
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterOption, setFilterOption] = useState("all"); // "all", "top10", "top20"
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dashRes, studentsRes] = await Promise.all([
                axios.get("/api/admin/dashboard"),
                axios.get("/api/admin/students")
            ]);
            setDashboardData(dashRes.data);
            setStudents(studentsRes.data);
        } catch (error) {
            onMessage?.(error.response?.data?.message || "Failed to load admin data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const fetchStudentDetail = async (email) => {
        setDetailLoading(true);
        try {
            const res = await axios.get(`/api/admin/students/${email}`);
            setStudentDetail(res.data);
        } catch (error) {
            onMessage?.(error.response?.data?.message || "Failed to load student details.");
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSelectStudent = (email) => {
        setSelectedStudent(email);
        fetchStudentDetail(email);
    };

    const handleBackToList = () => {
        setSelectedStudent(null);
        setStudentDetail(null);
    };

    const handleDownloadResume = (resumeId, filename) => {
        if (!resumeId) return;
        window.open(`/api/admin/resumes/download/${resumeId}`, "_blank");
        onMessage?.(`Downloading resume: ${filename}`);
    };

    // Sort students by placement probability descending and assign absolute rank
    const rankedStudents = useMemo(() => {
        const sorted = [...students].sort((a, b) => {
            const probA = a.placement_probability ?? -1;
            const probB = b.placement_probability ?? -1;
            return probB - probA;
        });

        let currentRank = 1;
        return sorted.map(s => {
            if (s.placement_probability !== null && s.placement_probability !== undefined) {
                const rankVal = currentRank;
                currentRank++;
                return { ...s, rank: rankVal };
            }
            return { ...s, rank: null };
        });
    }, [students]);

    // Filter students based on search and top-N filters
    const filteredStudents = useMemo(() => {
        let result = rankedStudents;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s => {
                const regNo = `REG-${String(s.id).padStart(4, '0')}`;
                return (
                    (s.name || "").toLowerCase().includes(query) ||
                    (s.email || "").toLowerCase().includes(query) ||
                    (s.career_goal || "").toLowerCase().includes(query) ||
                    String(s.id).includes(query) ||
                    regNo.toLowerCase().includes(query)
                );
            });
        }

        if (filterOption === "top10") {
            result = result.filter(s => s.rank !== null && s.rank <= 10);
        } else if (filterOption === "top20") {
            result = result.filter(s => s.rank !== null && s.rank <= 20);
        }

        return result;
    }, [rankedStudents, searchQuery, filterOption]);

    // Prepare chart datasets
    const chartsData = useMemo(() => {
        if (!dashboardData) return null;

        // Outlook Distribution Chart
        const outlookLabels = Object.keys(dashboardData.outlook_distribution || {});
        const outlookValues = Object.values(dashboardData.outlook_distribution || {});
        const outlookChart = {
            labels: outlookLabels,
            datasets: [
                {
                    label: "Students Count",
                    data: outlookValues,
                    backgroundColor: ["#34d399", "#60a5fa", "#fbbf24", "#fb7185"],
                    borderRadius: 8
                }
            ]
        };

        // Career Goal Distribution
        const careerLabels = (dashboardData.career_goals_distribution || []).map(c => c.career_goal);
        const careerValues = (dashboardData.career_goals_distribution || []).map(c => c.count);
        const careerChart = {
            labels: careerLabels.length > 0 ? careerLabels : ["Software Developer"],
            datasets: [
                {
                    data: careerValues.length > 0 ? careerValues : [0],
                    backgroundColor: ["#c084fc", "#60a5fa", "#5eead4", "#fca5a5", "#fbbf24"],
                    borderWidth: 1
                }
            ]
        };

        // Application Status Distribution
        const appStatusLabels = Object.keys(dashboardData.application_status_counts || {});
        const appStatusValues = Object.values(dashboardData.application_status_counts || {});
        const appStatusChart = {
            labels: appStatusLabels,
            datasets: [
                {
                    label: "Applications",
                    data: appStatusValues,
                    backgroundColor: ["#60a5fa", "#fbbf24", "#34d399", "#f87171", "#c084fc"],
                    borderRadius: 6
                }
            ]
        };

        return { outlookChart, careerChart, appStatusChart };
    }, [dashboardData]);

    if (loading) {
        return (
            <div className="empty-state glass-panel">
                <p className="section-title">Loading Administrative Module...</p>
            </div>
        );
    }

    if (selectedStudent) {
        return (
            <section className="card-shell" style={{ display: "grid", gap: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button className="secondary-button" onClick={handleBackToList} style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <FiArrowLeft /> Back to Directory
                    </button>
                    <h2 className="card-title" style={{ margin: 0 }}>Student Profile & Prediction Analysis</h2>
                </div>

                {detailLoading || !studentDetail ? (
                    <div className="empty-state">
                        <p>Loading profile details...</p>
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px" }}>
                        {/* Left Profile Summary */}
                        <div style={{ display: "grid", gap: "20px", alignContent: "start" }}>
                            <div className="glass-panel" style={{ padding: "20px", display: "grid", gap: "14px" }}>
                                <div style={{ textAlign: "center", paddingBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <div style={{ width: "64px", height: "64px", borderRadius: "32px", background: "rgba(94, 234, 212, 0.15)", border: "1px solid rgba(94, 234, 212, 0.3)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                                        <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--brand)" }}>
                                            {(studentDetail.profile.name || "S")[0].toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.15rem" }}>{studentDetail.profile.name}</h3>
                                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>{studentDetail.profile.email}</p>
                                </div>

                                <div style={{ fontSize: "0.9rem", display: "grid", gap: "8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--muted)" }}>Registered:</span>
                                        <span>{studentDetail.profile.created_at ? studentDetail.profile.created_at.split(" ")[0] : "N/A"}</span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--muted)" }}>Career Goal:</span>
                                        <span style={{ color: "var(--brand)", fontWeight: 600 }}>
                                            {studentDetail.skills && studentDetail.skills.length > 0 ? studentDetail.skills[0].career_goal : "Not Set"}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ color: "var(--muted)" }}>Latest Probability:</span>
                                        <span style={{ fontWeight: 700, color: studentDetail.predictions.length > 0 ? "var(--brand)" : "var(--muted)" }}>
                                            {studentDetail.predictions.length > 0 ? `${studentDetail.predictions[0].probability}%` : "No Pred"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Resume Panel */}
                            <div className="glass-panel" style={{ padding: "20px" }}>
                                <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "var(--muted)" }}>Uploaded Resumes</h4>
                                {studentDetail.resumes && studentDetail.resumes.length > 0 ? (
                                    <div style={{ display: "grid", gap: "10px" }}>
                                        {studentDetail.resumes.map((res) => (
                                            <div key={res.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "10px" }}>
                                                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }} title={res.file_name}>{res.file_name}</p>
                                                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{res.created_at ? res.created_at.split(" ")[0] : ""}</span>
                                                </div>
                                                <button className="secondary-button" onClick={() => handleDownloadResume(res.id, res.file_name)} style={{ padding: "6px 8px", borderRadius: "8px" }}>
                                                    <FiDownload size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>No resumes uploaded yet</p>
                                )}
                            </div>
                        </div>

                        {/* Right Details: Prediction History & Skills checklists */}
                        <div style={{ display: "grid", gap: "24px" }}>
                            {/* Predictions List */}
                            <div className="glass-panel" style={{ padding: "20px" }}>
                                <h3 style={{ margin: "0 0 14px 0", fontSize: "1.1rem", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }}>Placement Forecast & Heuristic Logs</h3>
                                {studentDetail.predictions && studentDetail.predictions.length > 0 ? (
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                                            <thead>
                                                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                                    <th style={{ padding: "10px 8px", color: "var(--muted)" }}>Date</th>
                                                    <th style={{ padding: "10px 8px", color: "var(--muted)" }}>CGPA</th>
                                                    <th style={{ padding: "10px 8px", color: "var(--muted)" }}>Aptitude</th>
                                                    <th style={{ padding: "10px 8px", color: "var(--muted)" }}>Projects</th>
                                                    <th style={{ padding: "10px 8px", color: "var(--muted)" }}>Internships</th>
                                                    <th style={{ padding: "10px 8px", color: "var(--muted)" }}>Placement Prob</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentDetail.predictions.map((p, idx) => (
                                                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                        <td style={{ padding: "10px 8px" }}>{p.created_at ? p.created_at.split(" ")[0] : idx === 0 ? "Latest" : "Previous"}</td>
                                                        <td style={{ padding: "10px 8px" }}>{p.cgpa}</td>
                                                        <td style={{ padding: "10px 8px" }}>{p.aptitude}</td>
                                                        <td style={{ padding: "10px 8px" }}>{p.projects}</td>
                                                        <td style={{ padding: "10px 8px" }}>{p.internships}</td>
                                                        <td style={{ padding: "10px 8px", fontWeight: 700, color: "var(--brand)" }}>{p.probability}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No predictions calculated yet.</p>
                                )}
                            </div>

                            {/* Skills progress */}
                            <div className="glass-panel" style={{ padding: "20px" }}>
                                <h3 style={{ margin: "0 0 14px 0", fontSize: "1.1rem", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }}>Skill learning roadmap checklist</h3>
                                {studentDetail.skills && studentDetail.skills.length > 0 ? (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                                        {studentDetail.skills.map((s) => (
                                            <div key={s.skill_name} style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.04)" }}>
                                                {s.completed === 1 ? (
                                                    <FiCheckCircle style={{ color: "var(--success)" }} />
                                                ) : (
                                                    <span style={{ width: 14, height: 14, borderRadius: 7, border: "1px solid var(--muted)" }} />
                                                )}
                                                <span style={{ fontSize: "0.9rem", color: s.completed === 1 ? "var(--muted)" : "#fff", textDecoration: s.completed === 1 ? "line-through" : "none" }}>{s.skill_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic" }}>No skills assigned yet. (They are initialized when the student navigates to their Learning Portal).</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </section>
        );
    }

    const renderProbabilityBadge = (prob) => {
        if (prob === null || prob === undefined) {
            return (
                <span style={{ 
                    color: "var(--muted)", 
                    background: "rgba(255, 255, 255, 0.05)", 
                    padding: "4px 8px", 
                    borderRadius: "8px", 
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    fontSize: "0.82rem",
                    fontWeight: 600
                }}>
                    No Prediction
                </span>
            );
        }

        let color = "var(--danger)";
        let bg = "rgba(251, 113, 133, 0.1)";
        let border = "1px solid rgba(251, 113, 133, 0.2)";
        let label = "Low";

        if (prob >= 75) {
            color = "var(--success)";
            bg = "rgba(52, 211, 153, 0.1)";
            border = "1px solid rgba(52, 211, 153, 0.2)";
            label = "High";
        } else if (prob >= 45) {
            color = "var(--warning)";
            bg = "rgba(251, 191, 36, 0.1)";
            border = "1px solid rgba(251, 191, 36, 0.2)";
            label = "Medium";
        }

        return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, color, fontSize: "0.95rem" }}>{prob}%</span>
                <span style={{ 
                    fontSize: "0.72rem", 
                    fontWeight: 800, 
                    color, 
                    background: bg, 
                    border, 
                    padding: "2px 6px", 
                    borderRadius: "6px", 
                    textTransform: "uppercase",
                    letterSpacing: "0.03em"
                }}>
                    {label}
                </span>
            </div>
        );
    };

    const renderRankBadge = (rank) => {
        if (rank === null || rank === undefined) {
            return <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.85rem" }}>N/A</span>;
        }

        let bg = "rgba(255, 255, 255, 0.05)";
        let border = "1px solid rgba(255, 255, 255, 0.1)";
        let color = "var(--text)";

        if (rank === 1) {
            bg = "rgba(251, 191, 36, 0.15)";
            border = "1px solid rgba(251, 191, 36, 0.35)";
            color = "var(--warning)";
        } else if (rank === 2) {
            bg = "rgba(220, 232, 255, 0.12)";
            border = "1px solid rgba(220, 232, 255, 0.3)";
            color = "#fff";
        } else if (rank === 3) {
            bg = "rgba(244, 164, 96, 0.12)";
            border = "1px solid rgba(244, 164, 96, 0.3)";
            color = "rgba(244, 164, 96, 0.9)";
        }

        return (
            <span style={{ 
                fontWeight: 700, 
                color, 
                background: bg, 
                border, 
                padding: "4px 8px", 
                borderRadius: "8px", 
                fontSize: "0.82rem",
                display: "inline-block",
                textAlign: "center"
            }}>
                Rank {rank}
            </span>
        );
    };

    const renderSkillsBadge = (s) => {
        const skillsList = s.skills || [];
        const hasGoal = s.career_goal && s.career_goal !== "Not Set";
        return (
            <div style={{ display: "grid", gap: "2px", maxWidth: "200px" }}>
                {hasGoal && (
                    <span style={{ 
                        fontSize: "0.76rem", 
                        color: "var(--brand-2)", 
                        background: "rgba(96,165,250,0.1)", 
                        padding: "2px 6px", 
                        borderRadius: "6px",
                        fontWeight: 600,
                        width: "fit-content"
                    }}>
                        {s.career_goal}
                    </span>
                )}
                {skillsList.length > 0 ? (
                    <div 
                        style={{ fontSize: "0.85rem", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} 
                        title={skillsList.join(", ")}
                    >
                        {skillsList.join(", ")}
                    </div>
                ) : (
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>No skills assignments</div>
                )}
                <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                    Progress: {s.skills_completed}/{s.skills_total} completed
                </div>
            </div>
        );
    };

    const renderResumeScoreBar = (score) => {
        if (score === null || score === undefined) {
            return <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.85rem" }}>N/A</span>;
        }

        return (
            <div style={{ display: "grid", gap: "4px", width: "100px" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{score}/100</span>
                <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${score}%`, height: "100%", background: "linear-gradient(90deg, var(--brand-3), var(--brand-2))", borderRadius: "3px" }} />
                </div>
            </div>
        );
    };

    const renderUploadDateText = (dateStr) => {
        if (!dateStr) return <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.85rem" }}>No upload</span>;
        const date = dateStr.split(" ")[0];
        return <span style={{ fontSize: "0.88rem" }}>{date}</span>;
    };

    return (
        <div style={{ display: "grid", gap: "24px" }}>
            {/* Header / Summary Analytics Dashboard */}
            {dashboardData && (
                <div className="glass-panel" style={{ padding: "24px" }}>
                    <h1 className="hero-title" style={{ fontSize: "2rem", marginBottom: "18px" }}>
                        Placement Analytics Console
                    </h1>

                    <div className="metrics-row" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "18px" }}>
                        <div className="metric-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "1.5rem" }}>👥</span>
                                <FiUsers style={{ color: "var(--brand)" }} />
                            </div>
                            <p className="metric-value">{dashboardData.total_students}</p>
                            <p className="metric-label">Registered Students</p>
                        </div>
                        <div className="metric-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "1.5rem" }}>📄</span>
                                <FiFileText style={{ color: "var(--brand-2)" }} />
                            </div>
                            <p className="metric-value">{dashboardData.total_resumes}</p>
                            <p className="metric-label">Resumes Uploaded</p>
                        </div>
                        <div className="metric-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "1.5rem" }}>📈</span>
                                <FiTrendingUp style={{ color: "var(--success)" }} />
                            </div>
                            <p className="metric-value">{dashboardData.avg_placement_probability}%</p>
                            <p className="metric-label">Avg Placement Prob</p>
                        </div>
                        <div className="metric-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "1.5rem" }}>⚡</span>
                                <FiActivity style={{ color: "var(--brand-3)" }} />
                            </div>
                            <p className="metric-value">{dashboardData.skills_progress.completion_rate}%</p>
                            <p className="metric-label">Skill Completion Rate</p>
                        </div>
                    </div>

                    <div className="metrics-row" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: "24px", gap: "20px" }}>
                        <div className="metric-card" style={{ borderLeft: "4px solid #34d399" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "1.5rem" }}>🎓</span>
                                <strong style={{ color: "#34d399", fontSize: "0.85rem", textTransform: "uppercase" }}>Placement Rate</strong>
                            </div>
                            <p className="metric-value" style={{ color: "#34d399" }}>{dashboardData.placement_success_rate}%</p>
                            <p className="metric-label">Students Placed in Career Roles</p>
                        </div>
                        <div className="metric-card" style={{ borderLeft: "4px solid #c084fc" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "1.5rem" }}>💼</span>
                                <strong style={{ color: "#c084fc", fontSize: "0.85rem", textTransform: "uppercase" }}>Internship Rate</strong>
                            </div>
                            <p className="metric-value" style={{ color: "#c084fc" }}>{dashboardData.internship_conversion_rate}%</p>
                            <p className="metric-label">Students with Secured Internships</p>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        {/* Placement outlook distribution */}
                        <div className="glass-panel" style={{ padding: "20px", minHeight: "300px" }}>
                            <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem", fontWeight: 700, color: "var(--muted)" }}>Placement Outlook Distribution</h3>
                            {chartsData && (
                                <div style={{ height: "230px" }}>
                                    <Bar 
                                        data={chartsData.outlookChart} 
                                        options={{
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                x: { grid: { display: false }, ticks: { color: "#dce8ff" } },
                                                y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "#dce8ff", stepSize: 1 } }
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Top Goals / Skills */}
                        <div className="glass-panel" style={{ padding: "20px", display: "grid", gridTemplateColumns: "130px 1fr", gap: "20px" }}>
                            <div>
                                <h3 style={{ margin: "0 0 14px 0", fontSize: "1.1rem", fontWeight: 700, color: "var(--muted)" }}>Goal Split</h3>
                                {chartsData && (
                                    <div style={{ height: "130px", width: "130px" }}>
                                        <Doughnut 
                                            data={chartsData.careerChart}
                                            options={{
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: "grid", gap: "8px", alignContent: "start" }}>
                                <h3 style={{ margin: "0 0 10px 0", fontSize: "1.1rem", fontWeight: 700, color: "var(--muted)" }}>Popular Skills (Completion Stats)</h3>
                                {dashboardData.popular_skills && dashboardData.popular_skills.length > 0 ? (
                                    dashboardData.popular_skills.map((s) => (
                                        <div key={s.skill_name} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", background: "rgba(255,255,255,0.02)", padding: "6px 10px", borderRadius: "8px" }}>
                                            <span style={{ fontWeight: 600 }}>{s.skill_name}</span>
                                            <span style={{ color: "var(--brand)" }}>{s.completed} completed</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>No skill roadmap stats available</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
                        {/* Application Status Distribution */}
                        <div className="glass-panel" style={{ padding: "20px", minHeight: "300px" }}>
                            <h3 style={{ margin: "0 0 14px 0", fontSize: "1rem", fontWeight: 700, color: "var(--muted)" }}>Student Application Statistics</h3>
                            {chartsData && (
                                <div style={{ height: "230px" }}>
                                    <Bar 
                                        data={chartsData.appStatusChart} 
                                        options={{
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                x: { grid: { display: false }, ticks: { color: "#dce8ff" } },
                                                y: { grid: { color: "rgba(255,255,255,0.06)" }, ticks: { color: "#dce8ff", stepSize: 1 } }
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Top applied jobs & internships */}
                        <div className="glass-panel" style={{ padding: "20px", display: "grid", gridTemplateRows: "auto 1fr 1fr", gap: "16px" }}>
                            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--muted)" }}>Demand Analytics (Top Postings)</h3>
                            
                            <div>
                                <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "var(--brand-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Most Applied Jobs</h4>
                                <div style={{ display: "grid", gap: "6px" }}>
                                    {dashboardData.most_applied_jobs && dashboardData.most_applied_jobs.length > 0 ? (
                                        dashboardData.most_applied_jobs.map((job) => (
                                            <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", background: "rgba(255,255,255,0.02)", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                                                <span style={{ fontWeight: 600 }}>{job.title} <span style={{ color: "var(--muted)", fontWeight: 400 }}>at {job.company}</span></span>
                                                <span style={{ color: "var(--brand)", fontWeight: 700 }}>{job.count} {job.count === 1 ? "applicant" : "applicants"}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>No job applications recorded yet</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>Most Applied Internships</h4>
                                <div style={{ display: "grid", gap: "6px" }}>
                                    {dashboardData.most_applied_internships && dashboardData.most_applied_internships.length > 0 ? (
                                        dashboardData.most_applied_internships.map((intern) => (
                                            <div key={intern.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", background: "rgba(255,255,255,0.02)", padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                                                <span style={{ fontWeight: 600 }}>{intern.title} <span style={{ color: "var(--muted)", fontWeight: 400 }}>at {intern.company}</span></span>
                                                <span style={{ color: "#c084fc", fontWeight: 700 }}>{intern.count} {intern.count === 1 ? "applicant" : "applicants"}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic" }}>No internship applications recorded yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Students List Panel */}
            <section className="card-shell">
                <div className="card-header" style={{ flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <h2 className="card-title">Student Directory</h2>
                        <p className="card-subtitle">Manage registered student profiles, check skill goals progress, and inspect ML prediction output.</p>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        {/* Filter dropdown */}
                        <div className="input-wrap" style={{ minWidth: "160px" }}>
                            <select
                                value={filterOption}
                                onChange={(e) => setFilterOption(e.target.value)}
                                style={{
                                    width: "100%",
                                    borderRadius: "16px",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    background: "rgba(3, 8, 18, 0.45)",
                                    color: "white",
                                    padding: "14px 16px",
                                    outline: "none",
                                    cursor: "pointer",
                                    transition: "border-color 160ms ease"
                                }}
                                onFocus={(e) => { e.target.style.borderColor = "rgba(94, 234, 212, 0.55)" }}
                                onBlur={(e) => { e.target.style.borderColor = "rgba(255, 255, 255, 0.1)" }}
                            >
                                <option value="all" style={{ background: "#07111f" }}>All Students</option>
                                <option value="top10" style={{ background: "#07111f" }}>Top 10 Probability</option>
                                <option value="top20" style={{ background: "#07111f" }}>Top 20 Probability</option>
                            </select>
                        </div>
                        <div className="input-wrap" style={{ minWidth: "240px" }}>
                            <FiSearch style={{ color: "var(--muted)", left: "14px" }} />
                            <input 
                                type="text"
                                placeholder="Search by name, reg no, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: "42px" }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Rank</th>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Reg No</th>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Student</th>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Probability</th>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Skills & Goal</th>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Resume Score</th>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Upload Date</th>
                                <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 0 ? (
                                filteredStudents.map((s) => (
                                    <tr key={s.email} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s ease" }}>
                                        <td style={{ padding: "12px 10px" }}>
                                            {renderRankBadge(s.rank)}
                                        </td>
                                        <td style={{ padding: "12px 10px", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }}>
                                            REG-{String(s.id).padStart(4, '0')}
                                        </td>
                                        <td style={{ padding: "12px 10px" }}>
                                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{s.email}</div>
                                        </td>
                                        <td style={{ padding: "12px 10px" }}>
                                            {renderProbabilityBadge(s.placement_probability)}
                                        </td>
                                        <td style={{ padding: "12px 10px" }}>
                                            {renderSkillsBadge(s)}
                                        </td>
                                        <td style={{ padding: "12px 10px" }}>
                                            {renderResumeScoreBar(s.resume_score)}
                                        </td>
                                        <td style={{ padding: "12px 10px" }}>
                                            {renderUploadDateText(s.resume_upload_date)}
                                        </td>
                                        <td style={{ padding: "12px 10px" }}>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                {s.resume_uploaded ? (
                                                    <button 
                                                        className="secondary-button" 
                                                        onClick={() => handleDownloadResume(s.resume_id, s.resume_name)}
                                                        style={{ padding: "6px 10px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                                                        title="Download Resume"
                                                    >
                                                        <FiDownload size={14} />
                                                    </button>
                                                ) : null}
                                                <button 
                                                    className="primary-button" 
                                                    onClick={() => handleSelectStudent(s.email)}
                                                    style={{ padding: "6px 12px", borderRadius: "10px", fontSize: "0.8rem", boxShadow: "none" }}
                                                >
                                                    Analyze
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ padding: "24px 10px", textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>
                                        No students found matching search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default AdminSection;
