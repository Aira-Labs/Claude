"use client";

interface InsightSpec {
  type: "stat" | "warning" | "success" | "info";
  title: string;
  value: string;
  detail?: string;
  unit?: string;
}

const palette = {
  stat:    { bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.25)",  accent: "#3b82f6" },
  warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)",   accent: "#f59e0b" },
  success: { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)",   accent: "#22c55e" },
  info:    { bg: "rgba(0,229,200,0.08)",  border: "rgba(0,229,200,0.25)",   accent: "#00e5c8" },
};

export function InsightCard({ spec }: { spec: InsightSpec }) {
  const p = palette[spec.type];
  return (
    <div style={{
      padding: "16px 20px",
      background: p.bg,
      border: `1px solid ${p.border}`,
      borderRadius: "var(--r-lg)",
      borderLeft: `3px solid ${p.accent}`,
      marginTop: 12,
    }}>
      <div style={{
        fontSize: 11,
        color: p.accent,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        marginBottom: 8,
        textTransform: "uppercase",
      }}>
        {spec.title}
      </div>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: 28,
        fontWeight: 700,
        color: "var(--aira-text)",
        lineHeight: 1,
      }}>
        {spec.value}
        {spec.unit && (
          <span style={{ fontSize: 14, color: "var(--aira-text-2)", marginLeft: 6 }}>
            {spec.unit}
          </span>
        )}
      </div>
      {spec.detail && (
        <div style={{
          marginTop: 8,
          fontSize: 13,
          color: "var(--aira-text-2)",
          lineHeight: 1.5,
        }}>
          {spec.detail}
        </div>
      )}
    </div>
  );
}
