import React, { useState } from "react";
import axios from "axios";

function Register({ onRegister, onMessage }) {

  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");

  const handleRegister = async () => {
    try {
      const response = await axios.post("/api/register", {
        name,
        email,
        password
      });

      if (onRegister) {
        onRegister(response.data.user);
      }

      if (onMessage) {
        onMessage(response.data.message);
      }
    } catch (error) {
      if (onMessage) {
        onMessage(error.response?.data?.message || "Registration failed");
      }
    }
  };

  return (
    <div>

      <h2>Register</h2>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
      />

      <br /><br />

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

      <button onClick={handleRegister}>
        Register
      </button>

    </div>
  );
}

export default Register;