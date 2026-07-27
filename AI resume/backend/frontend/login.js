import React, { useState } from "react";
import axios from "axios";

function Login({ onLogin, onMessage }) {

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const handleLogin = async () => {
    try {
      const response = await axios.post("/api/login", {
        email,
        password
      });

      if (onLogin) {
        onLogin(response.data.user);
      }

      if (onMessage) {
        onMessage(response.data.message);
      }
    } catch (error) {
      if (onMessage) {
        onMessage(error.response?.data?.message || "Login failed");
      }
    }
  };

  return (
    <div>

      <h2>Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <br /><br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <br /><br />

      <button onClick={handleLogin}>
        Login
      </button>

    </div>
  );
}

export default Login;