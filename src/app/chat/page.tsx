"use client";
import { useState, useRef, useEffect } from "react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";

type Block = { kind: "text"; content: string } | { kind: "chart"; spec: any } | { kind: "query"; sql: string; description: string; rows?: number } | { kind: "error"; message: string };
type Message = { role: "user" | "assistant"; blocks: Block[]; id: string };

const SUGGESTED = [
  "What tables are in the database?",
  "Show me PM2.5 readings from the last 7 days as a line chart",
  "Which device recorded the highest PM2.5?",
  "How many users do we have?",
  "Show average PM2.5 by hour of day",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", blocks: [{ kind: "text", content: text }] };
    const asstMsg: Message = { id: crypto.randomUUID(), role: "assistant", blocks: [] };
    setMessages(prev => [...prev, userMsg, asstMsg]);
    setLoading(true);

    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.blocks.filter(b => b.kind === "text").map(b => (b as any).content).join("\n") || "...",
    }));

    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            setMessages(prev => {
              const msgs = [...prev];
              const last = { ...msgs[msgs.length - 1], blocks: [...msgs[msgs.length - 1].blocks] };
              if (ev.type === "text") {
                const lb = last.blocks[last.blocks.length - 1];
                if (lb?.kind === "text") last.blocks[last.blocks.length - 1] = { kind: "text", content: lb.content + ev.content };
                else last.blocks.push({ kind: "text", content: ev.content });
              } else if (ev.type === "chart") {
                last.blocks.push({ kind: "chart", spec: ev.spec });
              } else if (ev.type === "query") {
                last.blocks.push({ kind: "query", sql: ev.sql, description: ev.description });
              } else if (ev.type === "rows") {
                const qb = [...last.blocks].reverse().find(b => b.kind === "query");
                if (qb) { const idx = last.blocks.lastIndexOf(qb); last.blocks[idx] = { ...qb as any, rows: ev.count }; }
              } else if (ev.type === "error") {
                last.blocks.push({ kind: "error", message: ev.message });
              }
              msgs[msgs.length - 1] = last;
              return msgs;
            });
          } catch {}
        }
      }
    } catch (e) {
      setMessages(prev => { const msgs = [...prev]; msgs[msgs.length-1] = { ...msgs[msgs.length-1], blocks: [{ kind: "error", message: String(e) }] }; return msgs; });
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--aira-black)", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, flexShrink: 0, background: "var(--aira-dark)", borderRight: "1px solid var(--aira-border)", display: "flex", flexDirection: "column", padding: "24px 0 16px" }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--aira-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🌬️</div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--aira-text)" }}>Aira Labs</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--aira-text-3)", letterSpacing: "0.06em" }}>DATA ANALYTICS</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 12px 8px" }}>
          <button onClick={() => setMessages([])} style={{ width: "100%", padding: "9px 14px", background: "var(--aira-surface)", border: "1px solid var(--aira-border)", borderRadius: "var(--r-md)", color: "var(--aira-text-2)", fontSize: 13, fontFamily: "var(--font-body)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span>＋</span> New conversation
          </button>
        </div>

        <div style={{ padding: "12px 12px 0", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "var(--aira-text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>QUICK QUERIES</div>
          {SUGGESTED.map((q, i) => (
            <button key={i} onClick={() => send(q)} disabled={loading} style={{ width: "100%", textAlign: "left", padding: "8px 10px", background: "none", border: "none", borderRadius: "var(--r-sm)", color: "var(--aira-text-2)", fontSize: 12, fontFamily: "var(--font-body)", cursor: "pointer", lineHeight: 1.4, marginBottom: 2 }}>
              {q}
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 16px 0", borderTop: "1px solid var(--aira-border)", marginTop: 8 }}>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }} style={{ width: "100%", padding: "8px", background: "none", border: "none", color: "var(--aira-text-3)", fontSize: 12, fontFamily: "var(--font-body)", cursor: "pointer", textAlign: "left" }}>
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
          {messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 40 }}>
              <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20 }}>🌬️</div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "var(--aira-text)", marginBottom: 8 }}>Aira Labs Analytics</h2>
              <p style={{ color: "var(--aira-text-2)", fontSize: 15, maxWidth: 380, lineHeight: 1.6, marginBottom: 32 }}>Ask questions about your PM2.5 data, device telemetry, or user activity.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 560, width: "100%" }}>
                {SUGGESTED.slice(0, 4).map((q, i) => (
                  <button key={i} onClick={() => send(q)} style={{ padding: "12px 14px", background: "var(--aira-surface)", border: "1px solid var(--aira-border)", borderRadius: "var(--r-md)", fontSize: 13, color: "var(--aira-text-2)", lineHeight: 1.4, cursor: "pointer", textAlign: "left", fontFamily: "var(--font-body)" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px" }}>
              {messages.map(msg => (
                <div key={msg.id} className="fade-up" style={{ marginBottom: 24, display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginRight: 12, marginTop: 2 }}>🌬️</div>
                  )}
                  <div style={{ maxWidth: msg.role === "user" ? "72%" : "100%", flex: msg.role === "user" ? undefined : 1 }}>
                    {msg.role === "user" ? (
                      <div style={{ padding: "12px 16px", background: "var(--aira-surface-2)", border: "1px solid var(--aira-border)", borderRadius: "var(--r-lg) var(--r-lg) var(--r-sm) var(--r-lg)", fontSize: 15, lineHeight: 1.6, color: "var(--aira-text)" }}>
                        {(msg.blocks[0] as any)?.content}
                      </div>
                    ) : (
                      <div>
                        {msg.blocks.map((block, i) => {
                          if (block.kind === "text") return <div key={i} style={{ fontSize: 15, lineHeight: 1.7, color: "var(--aira-text)", whiteSpace: "pre-wrap" }}>{block.content}</div>;
                          if (block.kind === "chart") return <ChartRenderer key={i} spec={block.spec} />;
                          if (block.kind === "query") return (
                            <details key={i} style={{ marginTop: 8 }}>
                              <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--aira-text-3)", fontFamily: "var(--font-mono)", userSelect: "none", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ color: "var(--aira-teal)", opacity: 0.6 }}>▸</span>
                                SQL · {block.description} {block.rows !== undefined && `(${block.rows} rows)`}
                              </summary>
                              <pre style={{ marginTop: 8, padding: "12px 14px", background: "var(--aira-surface)", border: "1px solid var(--aira-border)", borderRadius: "var(--r-md)", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--aira-text-2)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{block.sql}</pre>
                            </details>
                          );
                          if (block.kind === "error") return <div key={i} style={{ marginTop: 8, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "var(--r-md)", fontSize: 13, color: "#fca5a5", fontFamily: "var(--font-mono)" }}>Error: {block.message}</div>;
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🌬️</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--aira-teal)", opacity: 0.6, animation: "blink 1.2s ease-in-out infinite", animationDelay: `${i*0.2}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "16px 24px 24px", borderTop: "1px solid var(--aira-border)", background: "var(--aira-dark)" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: "var(--aira-surface)", border: "1px solid var(--aira-border)", borderRadius: "var(--r-lg)", padding: "12px 16px" }}>
              <textarea
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }}}
                placeholder="Ask anything about your air quality data…"
                disabled={loading} rows={1}
                style={{ flex: 1, background: "none", border: "none", outline: "none", resize: "none", color: "var(--aira-text)", fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.6, maxHeight: 120, overflowY: "auto" }}
                onInput={e => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }}
              />
              <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: input.trim() ? "var(--aira-teal)" : "var(--aira-surface-2)", border: "none", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: input.trim() ? "var(--aira-black)" : "var(--aira-text-3)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "var(--aira-text-3)", fontFamily: "var(--font-mono)" }}>ENTER to send · SHIFT+ENTER for new line</div>
          </div>
        </div>
      </main>
    </div>
  );
}
