"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) { router.push("/chat"); }
    else { setError("Invalid email or password."); setLoading(false); }
  };

  const inp = { width:"100%", padding:"12px 14px", background:"var(--aira-surface-2)", border:"1px solid var(--aira-border)", borderRadius:"var(--r-md)", color:"var(--aira-text)", fontFamily:"var(--font-body)", fontSize:15, outline:"none" } as React.CSSProperties;

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--aira-black)" }}>
      <div style={{ width:420, padding:"48px 40px", background:"var(--aira-surface)", border:"1px solid var(--aira-border)", borderRadius:"var(--r-xl)", boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, margin:"0 auto 16px", background:"linear-gradient(135deg, var(--aira-teal), var(--aira-blue))", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🌬️</div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:24, fontWeight:700, color:"var(--aira-text)" }}>Aira Labs</h1>
          <p style={{ color:"var(--aira-text-2)", fontSize:13, marginTop:4, fontFamily:"var(--font-mono)", letterSpacing:"0.08em" }}>ADMIN DASHBOARD</p>
        </div>
        {error && <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"var(--r-md)", marginBottom:20, fontSize:13, color:"#fca5a5" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ display:"block", fontSize:12, color:"var(--aira-text-2)", fontFamily:"var(--font-mono)", letterSpacing:"0.06em", marginBottom:6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@airalabs.io" required autoFocus style={inp} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, color:"var(--aira-text-2)", fontFamily:"var(--font-mono)", letterSpacing:"0.06em", marginBottom:6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={inp} />
          </div>
          <button type="submit" disabled={loading||!email||!password} style={{ marginTop:6, width:"100%", padding:"14px", background:loading||!email||!password?"var(--aira-surface-2)":"linear-gradient(135deg, var(--aira-teal), var(--aira-teal-dim))", border:"1px solid var(--aira-border)", borderRadius:"var(--r-md)", color:loading||!email||!password?"var(--aira-text-3)":"var(--aira-black)", fontFamily:"var(--font-display)", fontSize:15, fontWeight:600, cursor:loading||!email||!password?"default":"pointer" }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop:20, textAlign:"center", fontSize:12, color:"var(--aira-text-3)", fontFamily:"var(--font-mono)" }}>RESTRICTED ACCESS · AUTHORISED USERS ONLY</p>
      </div>
    </div>
  );
}
