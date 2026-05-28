"use client";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#00e5c8","#3b82f6","#8b5cf6","#f59e0b","#22c55e","#ef4444","#ec4899"];

export function ChartRenderer({ spec }: { spec: any }) {
  const { chart_type, title, data, config = {} } = spec;
  if (!data?.length) return null;

  const colors = config.colors ?? COLORS;
  const xKey = config.xKey ?? Object.keys(data[0])[0];
  const yKeys = config.yKeys ?? Object.keys(data[0]).filter((k: string) => k !== xKey).slice(0, 5);

  const wrap = (children: React.ReactNode) => (
    <div style={{ background: "var(--aira-surface)", border: "1px solid var(--aira-border)", borderRadius: "var(--r-lg)", padding: "20px 16px 12px", marginTop: 12 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--aira-text)", marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );

  const tip = { contentStyle: { background: "var(--aira-surface-2)", border: "1px solid var(--aira-border)", borderRadius: 8, color: "var(--aira-text)", fontSize: 12 } };
  const ax = { tick: { fill: "#8a9ab8", fontSize: 11 }, axisLine: { stroke: "#2a3040" }, tickLine: { stroke: "#2a3040" } };

  if (chart_type === "pie" || chart_type === "donut") {
    return wrap(
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey={yKeys[0] ?? "value"} nameKey={xKey} cx="50%" cy="50%" innerRadius={chart_type === "donut" ? "55%" : 0} outerRadius="75%" paddingAngle={2}>
            {data.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip {...tip} />
          <Legend formatter={(v: string) => <span style={{ color: "#8a9ab8", fontSize: 12 }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart_type === "scatter") {
    return wrap(
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#1f2430" /><XAxis dataKey={xKey} {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Scatter data={data} fill={colors[0]} fillOpacity={0.7} /></ScatterChart>
      </ResponsiveContainer>
    );
  }

  const Comp = chart_type === "area" ? AreaChart : chart_type === "bar" ? BarChart : LineChart;
  return wrap(
    <ResponsiveContainer width="100%" height={260}>
      <Comp data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" vertical={false} />
        <XAxis dataKey={xKey} {...ax} tickFormatter={(v: string) => String(v).length > 10 ? String(v).slice(0,10) : v} />
<YAxis {...ax} tickFormatter={(v: number) => config.unit ? `${v}${config.unit}` : String(v)} />
        <Tooltip {...tip} />
        <Legend formatter={(v: string) => <span style={{ color: "#8a9ab8", fontSize: 12 }}>{v}</span>} />
        {yKeys.map((key: string, i: number) => {
          const c = colors[i % colors.length];
          if (chart_type === "bar") return <Bar key={key} dataKey={key} fill={c} radius={[3,3,0,0]} fillOpacity={0.85} />;
          if (chart_type === "area") return <Area key={key} type="monotone" dataKey={key} stroke={c} fill={c} fillOpacity={0.1} strokeWidth={2} dot={false} />;
          return <Line key={key} type="monotone" dataKey={key} stroke={c} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />;
        })}
      </Comp>
    </ResponsiveContainer>
  );
}
