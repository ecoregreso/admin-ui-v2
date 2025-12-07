// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext.jsx";

export default function LoginPage() {
  const { login } = useStaffAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("Owner123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate("/dashboard"); // or /reports if that’s your main landing
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-[0_0_40px_rgba(0,0,0,0.6)] p-8 backdrop-blur">
        <h1 className="text-center text-2xl font-semibold text-slate-50 mb-2">
          PlayTime USA Admin
        </h1>
        <p className="text-center text-slate-400 text-sm mb-6">
          Staff / Operator Console
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Username
            </label>
            <input
              className="w-full rounded-lg bg-slate-800/80 border border-slate-600 px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70 transition-shadow shadow-inner"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              className="w-full rounded-lg bg-slate-800/80 border border-slate-600 px-3 py-2 text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/70 focus:border-cyan-400/70 transition-shadow shadow-inner"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 text-slate-950 font-semibold text-sm py-2.5 shadow-[0_0_25px_rgba(56,189,248,0.55)] hover:shadow-[0_0_35px_rgba(56,189,248,0.75)] hover:brightness-110 transition-all disabled:opacity-60 disabled:shadow-none"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
