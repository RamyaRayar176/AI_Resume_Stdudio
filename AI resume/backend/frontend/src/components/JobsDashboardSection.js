import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
    FiSearch, 
    FiBriefcase, 
    FiCalendar, 
    FiBookmark, 
    FiCheckCircle, 
    FiClock, 
    FiDollarSign, 
    FiAlertCircle,
    FiUserCheck
} from "react-icons/fi";

function JobsDashboardSection({ currentUser, onMessage }) {
    const [subTab, setSubTab] = useState("jobs"); // "jobs", "internships", "tracker"
    const [jobs, setJobs] = useState([]);
    const [internships, setInternships] = useState([]);
    const [applications, setApplications] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [skillFilter, setSkillFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [actionBusy, setActionBusy] = useState(null); // id of active updating item

    const loadOpportunities = async () => {
        setLoading(true);
        try {
            const [jobsRes, internsRes, appsRes] = await Promise.all([
                axios.get("/api/jobs"),
                axios.get("/api/internships"),
                axios.get(`/api/applications?email=${currentUser.email}`)
            ]);
            setJobs(jobsRes.data);
            setInternships(internsRes.data);
            setApplications(appsRes.data);
        } catch (error) {
            onMessage?.(error.response?.data?.message || "Failed to load opportunities.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOpportunities();
    }, [currentUser.email]);

    const handleApply = async (item, type) => {
        setActionBusy(item.id + "_" + type);
        try {
            await axios.post("/api/applications/apply", {
                email: currentUser.email,
                type: type,
                item_id: item.id,
                status: "Applied"
            });
            onMessage?.(`Successfully applied to ${item.title} at ${item.company}!`);
            
            // Reload applications
            const appsRes = await axios.get(`/api/applications?email=${currentUser.email}`);
            setApplications(appsRes.data);
        } catch (error) {
            onMessage?.("Failed to track application.");
        } finally {
            setActionBusy(null);
        }
    };

    const handleSave = async (item, type) => {
        setActionBusy(item.id + "_" + type);
        try {
            await axios.post("/api/applications/save", {
                email: currentUser.email,
                type: type,
                item_id: item.id
            });
            onMessage?.(`Saved ${item.title} at ${item.company} to your tracker!`);
            
            // Reload applications
            const appsRes = await axios.get(`/api/applications?email=${currentUser.email}`);
            setApplications(appsRes.data);
        } catch (error) {
            onMessage?.("Failed to save opportunity.");
        } finally {
            setActionBusy(null);
        }
    };

    const handleUpdateStatus = async (app, status) => {
        setActionBusy(app.id + "_status");
        try {
            await axios.post("/api/applications/apply", {
                email: currentUser.email,
                type: app.type,
                item_id: app.item_id,
                status: status
            });
            onMessage?.(`Updated status to ${status}!`);
            
            // Reload applications
            const appsRes = await axios.get(`/api/applications?email=${currentUser.email}`);
            setApplications(appsRes.data);
        } catch (error) {
            onMessage?.("Failed to update status.");
        } finally {
            setActionBusy(null);
        }
    };

    // Helper map of applications for status lookup in lists
    const appLookup = useMemo(() => {
        const map = {};
        applications.forEach(app => {
            map[app.type + "_" + app.item_id] = app.status;
        });
        return map;
    }, [applications]);

    // Filters for Jobs
    const filteredJobs = useMemo(() => {
        let list = jobs;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(item => 
                (item.title || "").toLowerCase().includes(query) ||
                (item.company || "").toLowerCase().includes(query)
            );
        }
        if (skillFilter) {
            const skill = skillFilter.toLowerCase();
            list = list.filter(item => 
                (item.skills || "").toLowerCase().includes(skill)
            );
        }
        return list;
    }, [jobs, searchQuery, skillFilter]);

    // Filters for Internships
    const filteredInternships = useMemo(() => {
        let list = internships;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(item => 
                (item.title || "").toLowerCase().includes(query) ||
                (item.company || "").toLowerCase().includes(query)
            );
        }
        if (skillFilter) {
            const skill = skillFilter.toLowerCase();
            list = list.filter(item => 
                (item.skills || "").toLowerCase().includes(skill)
            );
        }
        return list;
    }, [internships, searchQuery, skillFilter]);

    // Status Badge Component
    const renderStatusBadge = (status) => {
        let colors = { bg: "rgba(255,255,255,0.06)", text: "var(--muted)" };
        switch(status) {
            case "Applied":
                colors = { bg: "rgba(96, 165, 250, 0.15)", text: "#60a5fa" };
                break;
            case "Interview Scheduled":
                colors = { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24" };
                break;
            case "Selected":
                colors = { bg: "rgba(52, 211, 153, 0.15)", text: "#34d399" };
                break;
            case "Rejected":
                colors = { bg: "rgba(248, 113, 113, 0.15)", text: "#f87171" };
                break;
            case "Pending":
                colors = { bg: "rgba(192, 132, 252, 0.15)", text: "#c084fc" };
                break;
            default:
                break;
        }

        return (
            <span style={{ 
                fontSize: "0.8rem", 
                padding: "4px 10px", 
                borderRadius: "8px", 
                background: colors.bg, 
                color: colors.text,
                fontWeight: 600,
                border: `1px solid ${colors.text}20`
            }}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="empty-state glass-panel">
                <p className="section-title">Querying Careers & Opportunities...</p>
            </div>
        );
    }

    return (
        <div style={{ display: "grid", gap: "24px" }}>
            {/* Top Hub Navigation Panel */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <div>
                    <h2 className="section-title" style={{ margin: "0 0 4px 0" }}>Placement & Internship Board</h2>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>Explore premium opportunities matched to your skillsets.</p>
                </div>
                <div style={{ display: "flex", gap: "10px", background: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <button 
                        className="nav-chip" 
                        onClick={() => { setSubTab("jobs"); setSearchQuery(""); setSkillFilter(""); }}
                        style={{ background: subTab === "jobs" ? "rgba(94, 234, 212, 0.12)" : "transparent", margin: 0 }}
                    >
                        💼 Jobs
                    </button>
                    <button 
                        className="nav-chip" 
                        onClick={() => { setSubTab("internships"); setSearchQuery(""); setSkillFilter(""); }}
                        style={{ background: subTab === "internships" ? "rgba(94, 234, 212, 0.12)" : "transparent", margin: 0 }}
                    >
                        🎓 Internships
                    </button>
                    <button 
                        className="nav-chip" 
                        onClick={() => { setSubTab("tracker"); setSearchQuery(""); setSkillFilter(""); }}
                        style={{ background: subTab === "tracker" ? "rgba(94, 234, 212, 0.12)" : "transparent", margin: 0 }}
                    >
                        📌 Tracker ({applications.length})
                    </button>
                </div>
            </div>

            {/* Filter controls (only for jobs/internships tab) */}
            {subTab !== "tracker" && (
                <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <div className="input-wrap" style={{ flex: 1, minWidth: "240px" }}>
                        <FiSearch style={{ color: "var(--muted)", left: "14px" }} />
                        <input 
                            type="text" 
                            placeholder="Search by role or company..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: "42px" }}
                        />
                    </div>
                    <div className="input-wrap" style={{ width: "240px", minWidth: "180px" }}>
                        <FiBriefcase style={{ color: "var(--muted)", left: "14px" }} />
                        <input 
                            type="text" 
                            placeholder="Filter by skill (e.g. Python)"
                            value={skillFilter}
                            onChange={(e) => setSkillFilter(e.target.value)}
                            style={{ paddingLeft: "42px" }}
                        />
                    </div>
                </div>
            )}

            {/* Displaying Job Vacancies */}
            {subTab === "jobs" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                    {filteredJobs.length > 0 ? (
                        filteredJobs.map((job) => {
                            const isSavedOrApplied = appLookup["job_" + job.id];
                            return (
                                <article className="career-card" key={"job_" + job.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", opacity: isSavedOrApplied === "Rejected" ? 0.7 : 1 }}>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                                {job.logo_url ? (
                                                    <img src={job.logo_url} alt={job.company} style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "contain", background: "white", padding: "4px" }} onError={(e) => { e.target.style.display = 'none'; }} />
                                                ) : null}
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{job.title}</h3>
                                                    <p style={{ margin: 0, color: "var(--brand-2)", fontSize: "0.85rem", fontWeight: 600 }}>{job.company}</p>
                                                </div>
                                            </div>
                                            {isSavedOrApplied && renderStatusBadge(isSavedOrApplied)}
                                        </div>

                                        <div style={{ display: "grid", gap: "10px", fontSize: "0.9rem", color: "#dce8ff", marginBottom: "16px" }}>
                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                <FiUserCheck style={{ color: "var(--brand)" }} />
                                                <span><strong>Eligibility:</strong> {job.eligibility}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                <FiCalendar style={{ color: "var(--brand-3)" }} />
                                                <span><strong>Deadline:</strong> {job.deadline}</span>
                                            </div>
                                        </div>

                                        {/* Skills lists */}
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                                            {(job.skills || "").split(",").map(skill => (
                                                <span key={skill.trim()} style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "6px", color: "var(--muted)" }}>
                                                    {skill.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: "flex", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px", marginTop: "auto" }}>
                                        <button 
                                            className="primary-button" 
                                            onClick={() => handleApply(job, "job")}
                                            disabled={actionBusy === (job.id + "_job") || isSavedOrApplied === "Applied" || isSavedOrApplied === "Selected" || isSavedOrApplied === "Interview Scheduled"}
                                            style={{ flex: 2, padding: "8px", fontSize: "0.85rem", boxShadow: "none" }}
                                        >
                                            {actionBusy === (job.id + "_job") ? "Applying..." : isSavedOrApplied === "Applied" ? "Applied" : "Apply Now"}
                                        </button>
                                        {!isSavedOrApplied && (
                                            <button 
                                                className="secondary-button" 
                                                onClick={() => handleSave(job, "job")}
                                                disabled={actionBusy === (job.id + "_job")}
                                                style={{ flex: 1, padding: "8px", fontSize: "0.85rem", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "4px" }}
                                            >
                                                <FiBookmark size={14} /> Save
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="glass-panel empty-state" style={{ gridColumn: "1 / -1" }}>
                            <p style={{ margin: 0, color: "var(--muted)" }}>No job listings match your current filters.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Displaying Internships */}
            {subTab === "internships" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
                    {filteredInternships.length > 0 ? (
                        filteredInternships.map((intern) => {
                            const isSavedOrApplied = appLookup["internship_" + intern.id];
                            return (
                                <article className="career-card" key={"intern_" + intern.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", opacity: isSavedOrApplied === "Rejected" ? 0.7 : 1 }}>
                                    <div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "16px" }}>
                                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                                {intern.logo_url ? (
                                                    <img src={intern.logo_url} alt={intern.company} style={{ width: "42px", height: "42px", borderRadius: "10px", objectFit: "contain", background: "white", padding: "4px" }} onError={(e) => { e.target.style.display = 'none'; }} />
                                                ) : null}
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{intern.title}</h3>
                                                    <p style={{ margin: 0, color: "var(--brand-2)", fontSize: "0.85rem", fontWeight: 600 }}>{intern.company}</p>
                                                </div>
                                            </div>
                                            {isSavedOrApplied && renderStatusBadge(isSavedOrApplied)}
                                        </div>

                                        <div style={{ display: "grid", gap: "10px", fontSize: "0.9rem", color: "#dce8ff", marginBottom: "16px" }}>
                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                <FiDollarSign style={{ color: "var(--success)" }} />
                                                <span><strong>Stipend:</strong> {intern.stipend}</span>
                                            </div>
                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                <FiClock style={{ color: "var(--brand-3)" }} />
                                                <span><strong>Duration:</strong> {intern.duration}</span>
                                            </div>
                                        </div>

                                        {/* Skills lists */}
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
                                            {(intern.skills || "").split(",").map(skill => (
                                                <span key={skill.trim()} style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "6px", color: "var(--muted)" }}>
                                                    {skill.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: "flex", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px", marginTop: "auto" }}>
                                        <button 
                                            className="primary-button" 
                                            onClick={() => handleApply(intern, "internship")}
                                            disabled={actionBusy === (intern.id + "_internship") || isSavedOrApplied === "Applied" || isSavedOrApplied === "Selected" || isSavedOrApplied === "Interview Scheduled"}
                                            style={{ flex: 2, padding: "8px", fontSize: "0.85rem", boxShadow: "none" }}
                                        >
                                            {actionBusy === (intern.id + "_internship") ? "Applying..." : isSavedOrApplied === "Applied" ? "Applied" : "Apply Now"}
                                        </button>
                                        {!isSavedOrApplied && (
                                            <button 
                                                className="secondary-button" 
                                                onClick={() => handleSave(intern, "internship")}
                                                disabled={actionBusy === (intern.id + "_internship")}
                                                style={{ flex: 1, padding: "8px", fontSize: "0.85rem", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "4px" }}
                                            >
                                                <FiBookmark size={14} /> Save
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="glass-panel empty-state" style={{ gridColumn: "1 / -1" }}>
                            <p style={{ margin: 0, color: "var(--muted)" }}>No internships match your current filters.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Displaying Applications Tracker */}
            {subTab === "tracker" && (
                <section className="card-shell" style={{ border: "none", background: "transparent", padding: 0 }}>
                    <div className="glass-panel" style={{ padding: "24px" }}>
                        <h3 style={{ margin: "0 0 14px 0", fontSize: "1.2rem", fontWeight: 700, fontFamily: "Space Grotesk, sans-serif" }}>Your Career Opportunities Tracking Pipeline</h3>
                        
                        {applications.length > 0 ? (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                                    <thead>
                                        <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                            <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Type</th>
                                            <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Opportunity</th>
                                            <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Company</th>
                                            <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Current Tracker Status</th>
                                            <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "right" }}>Update Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {applications.map((app) => (
                                            <tr key={app.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                <td style={{ padding: "14px 10px" }}>
                                                    <span style={{ 
                                                        fontSize: "0.75rem", 
                                                        fontWeight: 700, 
                                                        background: app.type === "job" ? "rgba(96,165,250,0.12)" : "rgba(192,132,250,0.12)",
                                                        color: app.type === "job" ? "var(--brand-2)" : "#c084fc",
                                                        padding: "3px 8px",
                                                        borderRadius: "6px",
                                                        textTransform: "uppercase"
                                                    }}>
                                                        {app.type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "14px 10px" }}>
                                                    <div style={{ fontWeight: 600 }}>{app.details?.title || "Unknown Title"}</div>
                                                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                                                        {app.type === "job" ? app.details?.eligibility : `Duration: ${app.details?.duration}`}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "14px 10px" }}>
                                                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                        {app.details?.logo_url ? (
                                                            <img src={app.details.logo_url} alt={app.details.company} style={{ width: "20px", height: "20px", borderRadius: "4px", objectFit: "contain", background: "white", padding: "1px" }} onError={(e) => { e.target.style.display = 'none'; }} />
                                                        ) : null}
                                                        <strong>{app.details?.company || "Unknown Company"}</strong>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px 10px" }}>
                                                    {renderStatusBadge(app.status)}
                                                </td>
                                                <td style={{ padding: "14px 10px", textAlign: "right" }}>
                                                    <select 
                                                        value={app.status}
                                                        onChange={(e) => handleUpdateStatus(app, e.target.value)}
                                                        disabled={actionBusy === (app.id + "_status")}
                                                        style={{ 
                                                            background: "rgba(0,0,0,0.3)", 
                                                            color: "white", 
                                                            border: "1px solid rgba(255,255,255,0.1)", 
                                                            borderRadius: "8px", 
                                                            padding: "4px 8px",
                                                            fontSize: "0.85rem",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        <option value="Pending">Saved / Pending</option>
                                                        <option value="Applied">Applied</option>
                                                        <option value="Interview Scheduled">Interview Scheduled</option>
                                                        <option value="Selected">Selected</option>
                                                        <option value="Rejected">Rejected</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", padding: "34px", display: "grid", gap: "10px", placeItems: "center" }}>
                                <FiAlertCircle size={32} style={{ color: "var(--muted)" }} />
                                <p style={{ margin: 0, color: "var(--muted)" }}>You haven't saved or applied to any listings yet.</p>
                                <button className="primary-button" onClick={() => setSubTab("jobs")} style={{ padding: "6px 14px", fontSize: "0.85rem", marginTop: "6px" }}>Browse Postings</button>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}

export default JobsDashboardSection;
