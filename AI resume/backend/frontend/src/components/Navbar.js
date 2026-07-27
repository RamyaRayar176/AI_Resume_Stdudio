function Navbar({ currentUser, currentView, setView, onLogout }) {
	return (
		<nav className="glass-panel nav-bar">
			<div className="brand-lockup" onClick={() => currentUser && setView("home")} style={{ cursor: currentUser ? "pointer" : "default" }}>
				<div className="brand-icon">
					<span>AI</span>
				</div>
				<div>
					<p className="brand-title">Placement AI Studio</p>
					<p className="brand-subtitle">Predict. guide. improve.</p>
				</div>
			</div>

			{currentUser && (
				<div className="nav-actions">
					{currentUser.role === "admin" ? (
						<button className="nav-chip" onClick={() => setView("admin_dashboard")} type="button" style={{ background: currentView === "admin_dashboard" ? "rgba(96, 165, 250, 0.15)" : "" }}>
							Admin Console
						</button>
					) : (
						<>
							<button className="nav-chip" onClick={() => setView("home")} type="button" style={{ background: currentView === "home" ? "rgba(94, 234, 212, 0.15)" : "" }}>
								Home
							</button>
							<button className="nav-chip" onClick={() => setView("prediction")} type="button" style={{ background: currentView === "prediction" ? "rgba(94, 234, 212, 0.15)" : "" }}>
								Prediction
							</button>
							<button className="nav-chip" onClick={() => setView("dashboard")} type="button" style={{ background: currentView === "dashboard" ? "rgba(94, 234, 212, 0.15)" : "" }}>
								Dashboard
							</button>
							<button className="nav-chip" onClick={() => setView("learning")} type="button" style={{ background: currentView === "learning" ? "rgba(94, 234, 212, 0.15)" : "" }}>
								Learning Hub
							</button>
							<button className="nav-chip" onClick={() => setView("career_board")} type="button" style={{ background: currentView === "career_board" ? "rgba(94, 234, 212, 0.15)" : "" }}>
								Career Board
							</button>
							<button className="nav-chip" onClick={() => setView("profile")} type="button" style={{ background: currentView === "profile" ? "rgba(94, 234, 212, 0.15)" : "" }}>
								Profile
							</button>
						</>
					)}
					<button className="nav-chip" onClick={onLogout} type="button" style={{ color: "rgba(248, 113, 113, 0.9)" }}>
						Logout
					</button>
					<div className="nav-chip" style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span style={{ width: 10, height: 10, borderRadius: 999, background: currentUser.role === "admin" ? "var(--brand-2)" : "var(--success)", boxShadow: currentUser.role === "admin" ? "0 0 12px rgba(96, 165, 250, 0.9)" : "0 0 12px rgba(52,211,153,0.9)" }} />
						{currentUser.role === "admin" ? "Admin: " : ""}{currentUser.name || currentUser.email}
					</div>
				</div>
			)}
		</nav>
	);
}

export default Navbar;