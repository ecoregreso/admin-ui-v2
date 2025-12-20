import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login, error: authError } = useStaffAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.length > 0 && !submitting,
    [username, password, submitting]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    const ok = await login({ username: username.trim(), password });
    setSubmitting(false);

    if (ok) navigate("/dashboard");
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div>
          <h1 className="login-title">PlayTime USA</h1>
          <p className="login-subtitle">Staff access terminal</p>
        </div>

        <div className="field">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            className="input"
            type="text"
            placeholder="Enter staff username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            placeholder="Enter password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {authError && <div className="alert">{authError}</div>}

        <div className="login-actions">
          <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
            {submitting ? "Authenticating..." : "Access Console"}
          </button>
          <span className="tag tag-blue">Secure staff only</span>
        </div>
      </form>
    </div>
  );
}
