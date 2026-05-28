"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        window.location.href = "/chat";
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid email or password.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--aira-black)", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(0,229,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,200,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      <div className="fade-up" style={{
        position: "relative", width: 420, padding: "48px 40px",
        background: "var(--aira-surface)", border: "1px solid var(--aira-border)",
        borderRadius: "var(--r-xl)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, margin: "0 auto 16px",
            background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))",
            borderRadius: 14, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 22,
          }}>🌬️</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--aira-text)", letterSpacing: "-0.02em" }}>
            Aira Labs
          </h1>
          <p style={{ color: "var(--aira-text-2)", fontSize: 13, marginTop: 4, fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
            ADMIN DASHBOARD
          </p>
        </div>

        {error && (
          <div style={{
            padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#fca5a5",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--r-md)",
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--aira-text-2)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@airalabs.io" required autoFocus
              style={{
                width: "100%", padding: "12px 14px", background: "var(--aira-surface-2)",
                border: "1px solid var(--aira-border)", borderRadius: "var(--r-md)",
                color: "var(--aira-text)", fontFamily: "var(--font-body)", fontSize: 15, outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "var(--aira-text-2)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>PASSWORD</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: "100%", padding: "12px 14px", background: "var(--aira-surface-2)",
                border: "1px solid var(--aira-border)", borderRadius: "var(--r-md)",
                color: "var(--aira-text)", fontFamily: "var(--font-body)", fontSize: 15, outline: "none",
              }}
            />
          </div>
          <button
            type="submit" disabled={loading || !email || !password}
            style={{
              marginTop: 4, width: "100%", padding: "14px",
              background: !loading && email && password
                ? "linear-gradient(135deg, var(--aira-teal), var(--aira-teal-dim))"
                : "var(--aira-surface-2)",
              border: "none", borderRadius: "var(--r-md)",
              color: !loading && email && password ? "var(--aira-black)" : "var(--aira-text-3)",
              fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600,
              cursor: !loading && email && password ? "pointer" : "default",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "var(--aira-text-3)", fontFamily: "var(--font-mono)" }}>
          RESTRICTED ACCESS · AUTHORISED USERS ONLY
        </p>
      </div>
    </div>
  );
}
