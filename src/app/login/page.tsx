"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function LoginContent() {
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setFormError("Invalid email or password.");
      setLoading(false);
    } else {
      router.push("/chat");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    background: "var(--aira-surface-2)",
    border: "1px solid var(--aira-border)",
    borderRadius: "var(--r-md)",
    color: "var(--aira-text)",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s",
  } as React.CSSProperties;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--aira-black)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,229,200,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,229,200,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />

      {/* Glow */}
      <div style={{
        position: "absolute",
        top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(0,229,200,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Card */}
      <div className="fade-up" style={{
        position: "relative",
        width: 420,
        padding: "48px 40px",
        background: "var(--aira-surface)",
        border: "1px solid var(--aira-border)",
        borderRadius: "var(--r-xl)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,200,0.05) inset",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            margin: "0 auto 16px",
            background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
            boxShadow: "0 8px 24px var(--aira-teal-glow)",
          }}>
            🌬️
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--aira-text)",
            letterSpacing: "-0.02em",
          }}>
            Aira Labs
          </h1>
          <p style={{
            color: "var(--aira-text-2)",
            fontSize: 13,
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
          }}>
            ADMIN DASHBOARD
          </p>
        </div>

        {/* Errors */}
        {(formError || error) && (
          <div style={{
            padding: "12px 16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--r-md)",
            marginBottom: 20,
            fontSize: 13,
            color: "#fca5a5",
          }}>
            {formError || "Sign-in failed. Please try again."}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{
              display: "block",
              fontSize: 12,
              color: "var(--aira-text-2)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@airalabs.io"
              required
              autoFocus
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = "var(--aira-teal-dim)"}
              onBlur={(e) => e.target.style.borderColor = "var(--aira-border)"}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              fontSize: 12,
              color: "var(--aira-text-2)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              style={inputStyle}
              onFocus={(e) => e.target.style.borderColor = "var(--aira-teal-dim)"}
              onBlur={(e) => e.target.style.borderColor = "var(--aira-border)"}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "14px",
              background: loading || !email || !password
                ? "var(--aira-surface-2)"
                : "linear-gradient(135deg, var(--aira-teal), var(--aira-teal-dim))",
              border: "1px solid var(--aira-border)",
              borderRadius: "var(--r-md)",
              color: loading || !email || !password ? "var(--aira-text-3)" : "var(--aira-black)",
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !email || !password ? "default" : "pointer",
              transition: "all 0.2s ease",
              letterSpacing: "0.01em",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={{
          marginTop: 20,
          textAlign: "center",
          fontSize: 12,
          color: "var(--aira-text-3)",
          fontFamily: "var(--font-mono)",
        }}>
          RESTRICTED ACCESS · AUTHORISED USERS ONLY
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
