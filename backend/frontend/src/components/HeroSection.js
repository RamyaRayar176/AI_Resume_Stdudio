function HeroSection({ currentUser, status, onGetStarted, onSeeInsights }) {
	return (
		<section className="glass-panel hero-shell">
			<div className="hero-copy">
				<div className="eyebrow">
					<span className="chip-mark">AI</span>
					AI career intelligence
				</div>

				<h1
					className="hero-title"
				>
					A modern AI SaaS experience for placement prediction and career guidance.
				</h1>

				<p className="hero-paragraph">
					Transform raw student data into a polished, executive-style dashboard with predictive insights, skill-gap tracking, and curated career recommendations.
				</p>

				<div className="hero-actions">
					<button className="primary-button" type="button" onClick={onGetStarted}>
						Get started <span className="button-mark">→</span>
					</button>
					<button className="secondary-button" type="button" onClick={onSeeInsights}>
						See dashboard
					</button>
				</div>

				<div className="metrics-row">
					<div className="metric-card">
						<p className="metric-value">Real-time</p>
						<p className="metric-label">AI scoring updates on submit</p>
					</div>
					<div className="metric-card">
						<p className="metric-value">Glass UI</p>
						<p className="metric-label">Premium SaaS-style layout</p>
					</div>
					<div className="metric-card">
						<p className="metric-value">{currentUser ? currentUser.name || currentUser.email : "Guest"}</p>
						<p className="metric-label">Current session</p>
					</div>
				</div>

				<div className="status-banner">{status}</div>
			</div>

			<div className="hero-visual">
				<div className="hero-illustration">
					<div className="illustration-card">
						<div className="ai-core">
							<div className="ai-chip chip-one">Placement forecast</div>
							<div className="ai-chip chip-two">Skill graph</div>
							<div className="ai-chip chip-three">Career routes</div>
							<div className="ai-chip chip-four">Neural insights</div>
						</div>
						<div style={{ display: "grid", gap: 10 }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<strong>Model confidence</strong>
								<span className="chip-mark">↑</span>
							</div>
							<div className="progress-track">
								<div className="progress-fill" style={{ width: "84%" }} />
							</div>
							<p className="inline-note">Polished recommendation flow, animated signals, and responsive insight cards.</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export default HeroSection;