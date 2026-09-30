import React from "react";

function Navbar({ currentUser }) {
  return (
    <nav
      style={{
        background: "linear-gradient(90deg, #0f172a, #1e3a8a)",
        padding: "16px 24px",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <h2>
        Placement AI System
      </h2>
      <div>{currentUser ? `Signed in as ${currentUser.name || currentUser.email}` : "Guest"}</div>
    </nav>
  );
}

export default Navbar;