"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { InsightCard } from "@/components/ui/InsightCard";

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType =
  | { kind: "text"; content: string }
  | { kind: "chart"; spec: Record<string, unknown> }
  | { kind: "insight"; spec: Record<string, unknown> }
  | { kind: "query"; sql: string; description: string; rows?: number }
  | { kind: "error"; message: string };

interface Message {
  role: "user" | "assistant";
  blocks: BlockType[];
  id: string;
}

const SUGGESTED = [
  "What's the average PM2.5 by hour of day across all devices?",
  "Show me a map of all readings from the last 7 days",
  "Which device has recorded the highest PM2.5 spike?",
  "Compare air quality on weekdays vs weekends",
  "Show active users and their last sync time",
];

// ── Chat Page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      blocks: [{ kind: "text", content: text }],
    };

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      blocks: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.blocks
        .filter((b) => b.kind === "text")
        .map((b) => (b as { kind: "text"; content: string }).content)
        .join("\n"),
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            setMessages((prev) => {
              const msgs = [...prev];
              const last = { ...msgs[msgs.length - 1] };
              const blocks = [...last.blocks];

              if (event.type === "text") {
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock?.kind === "text") {
                  blocks[blocks.length - 1] = {
                    kind: "text",
                    content: lastBlock.content + event.content,
                  };
                } else {
                  blocks.push({ kind: "text", content: event.content });
                }
              } else if (event.type === "chart") {
                blocks.push({ kind: "chart", spec: event.spec });
              } else if (event.type === "insight") {
                blocks.push({ kind: "insight", spec: event.spec });
              } else if (event.type === "tool_query") {
                blocks.push({
                  kind: "query",
                  sql: event.sql,
                  description: event.description,
                });
              } else if (event.type === "tool_data") {
                const queryBlock = [...blocks].reverse().find((b) => b.kind === "query" && !("rows" in b));
                if (queryBlock && queryBlock.kind === "query") {
                  const idx = blocks.lastIndexOf(queryBlock);
                  blocks[idx] = { ...queryBlock, rows: event.rows };
                }
              } else if (event.type === "error") {
                blocks.push({ kind: "error", message: event.message });
              }

              last.blocks = blocks;
              msgs[msgs.length - 1] = last;
              return msgs;
            });
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const msgs = [...prev];
        const last = { ...msgs[msgs.length - 1] };
        last.blocks = [{ kind: "error", message: String(err) }];
        msgs[msgs.length - 1] = last;
        return msgs;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, loading]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--aira-black)", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: "var(--aira-dark)",
        borderRight: "1px solid var(--aira-border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0 16px",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--aira-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))",
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15,
              flexShrink: 0,
            }}>
              🌬️
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--aira-text)" }}>
                Aira Labs
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--aira-text-3)", letterSpacing: "0.06em" }}>
                DATA ANALYTICS
              </div>
            </div>
          </div>
        </div>

        {/* New chat */}
        <div style={{ padding: "16px 12px 8px" }}>
          <button
            onClick={() => setMessages([])}
            style={{
              width: "100%",
              padding: "9px 14px",
              background: "var(--aira-surface)",
              border: "1px solid var(--aira-border)",
              borderRadius: "var(--r-md)",
              color: "var(--aira-text-2)",
              fontSize: 13,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--aira-teal-dim)"; e.currentTarget.style.color = "var(--aira-text)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--aira-border)"; e.currentTarget.style.color = "var(--aira-text-2)"; }}
          >
            <span style={{ fontSize: 16 }}>＋</span> New conversation
          </button>
        </div>

        {/* Suggested queries */}
        <div style={{ padding: "12px 12px 0", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "var(--aira-text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>
            QUICK QUERIES
          </div>
          {SUGGESTED.map((q, i) => (
            <button
              key={i}
              onClick={() => send(q)}
              disabled={loading}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                background: "none",
                border: "none",
                borderRadius: "var(--r-sm)",
                color: "var(--aira-text-2)",
                fontSize: 12,
                fontFamily: "var(--font-body)",
                cursor: "pointer",
                lineHeight: 1.4,
                marginBottom: 2,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--aira-surface)"; e.currentTarget.style.color = "var(--aira-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--aira-text-2)"; }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* User */}
        <div style={{
          padding: "12px 16px 0",
          borderTop: "1px solid var(--aira-border)",
          marginTop: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            {session?.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", border: "1px solid var(--aira-border)" }} />
            )}
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--aira-text)" }}>{session?.user?.name}</div>
              <div style={{ fontSize: 10, color: "var(--aira-text-3)", fontFamily: "var(--font-mono)" }}>ADMIN</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              width: "100%",
              padding: "6px",
              background: "none",
              border: "none",
              color: "var(--aira-text-3)",
              fontSize: 12,
              fontFamily: "var(--font-body)",
              cursor: "pointer",
              textAlign: "left",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--aira-danger)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--aira-text-3)"}
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0" }}>
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px" }}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: "16px 24px 24px",
          borderTop: "1px solid var(--aira-border)",
          background: "var(--aira-dark)",
        }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              background: "var(--aira-surface)",
              border: "1px solid var(--aira-border)",
              borderRadius: "var(--r-lg)",
              padding: "12px 16px",
              transition: "border-color 0.2s",
            }}
              onFocus={() => {}}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask anything about your air quality data…"
                disabled={loading}
                rows={1}
                style={{
                  flex: 1,
                  background: "none",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  color: "var(--aira-text)",
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxHeight: 120,
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${t.scrollHeight}px`;
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--r-md)",
                  background: input.trim() ? "var(--aira-teal)" : "var(--aira-surface-2)",
                  border: "none",
                  cursor: input.trim() ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s",
                  flexShrink: 0,
                  color: input.trim() ? "var(--aira-black)" : "var(--aira-text-3)",
                }}
              >
                <SendIcon />
              </button>
            </div>
            <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "var(--aira-text-3)", fontFamily: "var(--font-mono)" }}>
              ENTER to send · SHIFT+ENTER for new line · queries run read-only SQL only
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      className="fade-up"
      style={{
        marginBottom: 24,
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      {!isUser && (
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          flexShrink: 0,
          marginRight: 12,
          marginTop: 2,
        }}>
          🌬️
        </div>
      )}

      <div style={{ maxWidth: isUser ? "72%" : "100%", flex: isUser ? undefined : 1 }}>
        {isUser ? (
          <div style={{
            padding: "12px 16px",
            background: "var(--aira-surface-2)",
            border: "1px solid var(--aira-border)",
            borderRadius: "var(--r-lg) var(--r-lg) var(--r-sm) var(--r-lg)",
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--aira-text)",
          }}>
            {msg.blocks.find((b) => b.kind === "text") && (
              (msg.blocks.find((b) => b.kind === "text") as { kind: "text"; content: string }).content
            )}
          </div>
        ) : (
          <div>
            {msg.blocks.map((block, i) => {
              if (block.kind === "text") {
                return (
                  <div key={i} style={{
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--aira-text)",
                    whiteSpace: "pre-wrap",
                  }}>
                    {block.content}
                  </div>
                );
              }
              if (block.kind === "chart") {
                return <ChartRenderer key={i} spec={block.spec as unknown as Parameters<typeof ChartRenderer>[0]["spec"]} />;
              }
              if (block.kind === "insight") {
                return <InsightCard key={i} spec={block.spec as unknown as Parameters<typeof InsightCard>[0]["spec"]} />;
              }
              if (block.kind === "query") {
                return (
                  <details key={i} style={{ marginTop: 8 }}>
                    <summary style={{
                      cursor: "pointer",
                      fontSize: 11,
                      color: "var(--aira-text-3)",
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.04em",
                      userSelect: "none",
                      listStyle: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}>
                      <span style={{ color: "var(--aira-teal)", opacity: 0.6 }}>▸</span>
                      SQL · {block.description}
                      {block.rows !== undefined && (
                        <span style={{ color: "var(--aira-text-2)" }}>({block.rows} rows)</span>
                      )}
                    </summary>
                    <pre style={{
                      marginTop: 8,
                      padding: "12px 14px",
                      background: "var(--aira-surface)",
                      border: "1px solid var(--aira-border)",
                      borderRadius: "var(--r-md)",
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      color: "var(--aira-text-2)",
                      overflowX: "auto",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}>
                      {block.sql}
                    </pre>
                  </details>
                );
              }
              if (block.kind === "error") {
                return (
                  <div key={i} style={{
                    marginTop: 8,
                    padding: "10px 14px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderRadius: "var(--r-md)",
                    fontSize: 13,
                    color: "#fca5a5",
                    fontFamily: "var(--font-mono)",
                  }}>
                    Error: {block.message}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, flexShrink: 0,
      }}>🌬️</div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 6, height: 6,
            borderRadius: "50%",
            background: "var(--aira-teal)",
            opacity: 0.6,
            animation: "blink 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      textAlign: "center",
      padding: 40,
    }}>
      <div style={{
        width: 64, height: 64,
        background: "linear-gradient(135deg, var(--aira-teal), var(--aira-blue))",
        borderRadius: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28,
        marginBottom: 20,
        boxShadow: "0 16px 40px var(--aira-teal-glow)",
      }}>
        🌬️
      </div>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 24,
        fontWeight: 700,
        color: "var(--aira-text)",
        marginBottom: 8,
        letterSpacing: "-0.02em",
      }}>
        Aira Labs Analytics
      </h2>
      <p style={{
        color: "var(--aira-text-2)",
        fontSize: 15,
        maxWidth: 380,
        lineHeight: 1.6,
        marginBottom: 32,
      }}>
        Ask questions about your PM2.5 data, device telemetry, or user activity. Claude will query the database and visualise the results.
      </p>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        maxWidth: 560,
        width: "100%",
      }}>
        {SUGGESTED.slice(0, 4).map((q, i) => (
          <div key={i} style={{
            padding: "12px 14px",
            background: "var(--aira-surface)",
            border: "1px solid var(--aira-border)",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            color: "var(--aira-text-2)",
            lineHeight: 1.4,
            cursor: "pointer",
          }}>
            {q}
          </div>
        ))}
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
