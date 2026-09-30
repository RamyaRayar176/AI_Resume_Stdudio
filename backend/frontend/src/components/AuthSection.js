import { useState } from "react";
import axios from "axios";
import { FiLock, FiMail, FiEye, FiEyeOff } from "react-icons/fi";

function AuthSection({ currentUser, onLogin, onRegister, onMessage }) {
	const [portal, setPortal] = useState("student"); // "student", "admin"
	const [mode, setMode] = useState("login");
	const [loginForm, setLoginForm] = useState({ email: "", password: "" });
	const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
	const [busy, setBusy] = useState(false);
	const [errorMsg, setErrorMsg] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const submitLogin = async (event) => {
		event.preventDefault();
		setBusy(true);
		try {
			const endpoint = portal === "admin" ? "/api/admin/login" : "/api/login";
			const response = await axios.post(endpoint, loginForm);
			onLogin?.(response.data.user);
			onMessage?.(response.data.message);
			setErrorMsg("");
		} catch (error) {
			const msg = error.response?.data?.message || "Login failed";
			onMessage?.(msg);
			setErrorMsg(msg);
		} finally {
			setBusy(false);
		}
	};

	const submitRegister = async (event) => {
		event.preventDefault();
		setBusy(true);
		try {
			const endpoint = "/api/register";
			const payload = registerForm;
			const response = await axios.post(endpoint, payload);
			onRegister?.(response.data.user);
			onMessage?.(response.data.message);
			setErrorMsg("");
		} catch (error) {
			const msg = error.response?.data?.message || "Registration failed";
			onMessage?.(msg);
			setErrorMsg(msg);
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="card-shell">
			<div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", gap: "12px" }}>
				<button 
					className={`secondary-button`}
					onClick={() => { setPortal("student"); setMode("login"); onMessage?.(""); setErrorMsg(""); }}
					style={{
						padding: "10px 16px",
						borderRadius: "14px",
						flex: 1,
						background: portal === "student" ? "rgba(94, 234, 212, 0.16)" : "rgba(255,255,255,0.03)",
						borderColor: portal === "student" ? "var(--brand)" : "rgba(255,255,255,0.08)",
						color: portal === "student" ? "white" : "var(--muted)"
					}}
					type="button"
				>
					🎓 Student Portal
				</button>
				<button 
					className={`secondary-button`}
					onClick={() => { setPortal("admin"); setMode("login"); onMessage?.(""); setErrorMsg(""); }}
					style={{
						padding: "10px 16px",
						borderRadius: "14px",
						flex: 1,
						background: portal === "admin" ? "rgba(96, 165, 250, 0.16)" : "rgba(255,255,255,0.03)",
						borderColor: portal === "admin" ? "var(--brand-2)" : "rgba(255,255,255,0.08)",
						color: portal === "admin" ? "white" : "var(--muted)"
					}}
					type="button"
				>
					💼 Admin Console
				</button>
			</div>

			<div className="card-header">
				<div>
					<h2 className="card-title">
						{portal === "admin" ? "Admin Console Login" : "Access the intelligence layer"}
					</h2>
					<p className="card-subtitle">
						{portal === "admin" 
							? "Access placements tracking database & skills roadmap analytics." 
							: "Create a profile or sign in to personalize the prediction flow."}
					</p>
				</div>
				<div className="eyebrow" style={{ fontSize: "0.8rem" }}>
					{currentUser ? `Active: ${currentUser.name || currentUser.email}` : "Secure session"}
				</div>
			</div>

			<div className="tab-row" role="tablist" aria-label="Authentication mode">
				<button className={`tab-button ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); onMessage?.(""); setErrorMsg(""); }} type="button">Login</button>
				{portal !== "admin" && (
					<button className={`tab-button ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); onMessage?.(""); setErrorMsg(""); }} type="button">Register</button>
				)}
			</div>

			{errorMsg && (
				<div className="status-banner" style={{ 
					marginBottom: "20px", 
					background: "rgba(239, 68, 68, 0.12)", 
					borderColor: "rgba(239, 68, 68, 0.3)", 
					color: "#fca5a5" 
				}}>
					{errorMsg}
				</div>
			)}

				{mode === "login" ? (
					<form
						onSubmit={submitLogin}
						className="form-grid"
					>
						<div className="field full">
							<label>Email</label>
							<div className="input-wrap">
								<span className="input-mark">@</span>
								<input
									type="email"
									placeholder="you@example.com"
									value={loginForm.email}
									onChange={(event) => {
										setLoginForm((previous) => ({ ...previous, email: event.target.value }));
										onMessage?.("");
										setErrorMsg("");
									}}
								/>
							</div>
						</div>
						<div className="field full">
							<label>Password</label>
							<div className="input-wrap">
								<span className="input-mark">#</span>
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Your password"
									value={loginForm.password}
									onChange={(event) => {
										setLoginForm((previous) => ({ ...previous, password: event.target.value }));
										onMessage?.("");
										setErrorMsg("");
									}}
									style={{ paddingRight: "40px" }}
								/>
								<div 
									onClick={() => setShowPassword(!showPassword)}
									style={{
										position: "absolute",
										right: "14px",
										top: "50%",
										transform: "translateY(-50%)",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										color: "var(--muted, #94a3b8)"
									}}
								>
									{showPassword ? <FiEyeOff style={{ position: "static", transform: "none" }} /> : <FiEye style={{ position: "static", transform: "none" }} />}
								</div>
							</div>
						</div>
						<div className="field full">
							<button className="submit-button" type="submit" disabled={busy} style={{ background: portal === "admin" ? "linear-gradient(135deg, var(--brand-2), var(--brand-3))" : "" }}>
								{busy ? "Working..." : portal === "admin" ? "Sign in to console" : "Sign in to dashboard"}
							</button>
						</div>
					</form>
				) : (
					<form
						onSubmit={submitRegister}
						className="form-grid"
					>
						{portal !== "admin" && (
							<div className="field full">
								<label>Name</label>
								<div className="input-wrap">
									<span className="input-mark">ID</span>
									<input
										type="text"
										placeholder="Student name"
										value={registerForm.name}
										onChange={(event) => {
											setRegisterForm((previous) => ({ ...previous, name: event.target.value }));
											onMessage?.("");
											setErrorMsg("");
										}}
									/>
								</div>
							</div>
						)}
						<div className="field full">
							<label>Email</label>
							<div className="input-wrap">
								<FiMail />
								<input
									type="email"
									placeholder="you@example.com"
									value={registerForm.email}
									onChange={(event) => {
										setRegisterForm((previous) => ({ ...previous, email: event.target.value }));
										onMessage?.("");
										setErrorMsg("");
									}}
								/>
							</div>
						</div>
						<div className="field full">
							<label>Password</label>
							<div className="input-wrap">
								<FiLock />
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Create a secure password"
									value={registerForm.password}
									onChange={(event) => {
										setRegisterForm((previous) => ({ ...previous, password: event.target.value }));
										onMessage?.("");
										setErrorMsg("");
									}}
									style={{ paddingRight: "40px" }}
								/>
								<div 
									onClick={() => setShowPassword(!showPassword)}
									style={{
										position: "absolute",
										right: "14px",
										top: "50%",
										transform: "translateY(-50%)",
										cursor: "pointer",
										display: "flex",
										alignItems: "center",
										color: "var(--muted, #94a3b8)"
									}}
								>
									{showPassword ? <FiEyeOff style={{ position: "static", transform: "none" }} /> : <FiEye style={{ position: "static", transform: "none" }} />}
								</div>
							</div>
						</div>
						<div className="field full">
							<button className="submit-button" type="submit" disabled={busy}>
								{busy ? "Creating account..." : "Create account"}
							</button>
						</div>
					</form>
				)}
		</section>
	);
}

export default AuthSection;