"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import dynamic from "next/dynamic";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// Plotly loaded client-side only — typed as any to avoid declaration conflicts
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as any;

const COLORS = [
  "#00e5c8", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#22c55e", "#ef4444", "#ec4899", "#06b6d4",
];

interface ChartSpec {
  chart_type: string;
  title: string;
  data: Record<string, unknown>[];
  config?: {
    xKey?: string;
    yKeys?: string[];
    colors?: string[];
    unit?: string;
    center?: [number, number];
    zoom?: number;
    valueKey?: string;
  };
}

export function ChartRenderer({ spec }: { spec: ChartSpec }) {
  const { chart_type, title, data, config = {} } = spec;
  const colors = config.colors ?? COLORS;
  const xKey = config.xKey ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yKeys = config.yKeys ?? Object.keys(data[0] ?? {}).filter((k) => k !== xKey).slice(0, 5);

  const containerStyle = {
    background: "var(--aira-surface)",
    border: "1px solid var(--aira-border)",
    borderRadius: "var(--r-lg)",
    padding: "20px 16px 12px",
    marginTop: 12,
  };

  const titleStyle = {
    fontFamily: "var(--font-display)",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--aira-text)",
    marginBottom: 16,
    paddingLeft: 4,
  };

  const tooltipStyle = {
    contentStyle: {
      background: "var(--aira-surface-2)",
      border: "1px solid var(--aira-border)",
      borderRadius: 8,
      color: "var(--aira-text)",
      fontSize: 12,
      fontFamily: "var(--font-mono)",
    },
  };

  const axisStyle = {
    tick: { fill: "#8a9ab8", fontSize: 11, fontFamily: "var(--font-mono)" },
    axisLine: { stroke: "#2a3040" },
    tickLine: { stroke: "#2a3040" },
  };

  // ── Map charts via Plotly ─────────────────────────────────────────────
  if (chart_type.startsWith("map_")) {
    const lats = data.map((d) => d.lat as number);
    const lngs = data.map((d) => d.lng as number);
    const values = data.map((d) => (config.valueKey ? (d[config.valueKey] as number) : 1));
    const center = config.center ?? [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length,
    ];

    let plotData: any[];
    if (chart_type === "map_heatmap") {
      plotData = [{
        type: "densitymapbox",
        lat: lats, lon: lngs, z: values,
        radius: 20,
        colorscale: [[0, "#00e5c8"], [0.5, "#f59e0b"], [1, "#ef4444"]],
      }];
    } else {
      plotData = [{
        type: "scattermapbox",
        lat: lats, lon: lngs,
        mode: "markers",
        marker: {
          size: chart_type === "map_choropleth" ? 12 : 8,
          color: chart_type === "map_choropleth" ? values : "#00e5c8",
          colorscale: chart_type === "map_choropleth"
            ? [[0, "#00e5c8"], [0.5, "#f59e0b"], [1, "#ef4444"]]
            : undefined,
          showscale: chart_type === "map_choropleth",
          opacity: 0.8,
        },
        text: data.map((d) => Object.entries(d).map(([k, v]) => `${k}: ${v}`).join("<br>")),
        hoverinfo: "text",
      }];
    }

    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{title}</div>
        <Plot
          data={plotData}
          layout={{
            mapbox: {
              style: "carto-darkmatter",
              center: { lat: center[0], lon: center[1] },
              zoom: config.zoom ?? 11,
            },
            margin: { t: 0, b: 0, l: 0, r: 0 },
            height: 400,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            font: { color: "#8a9ab8", family: "DM Mono" },
          }}
          config={{ displayModeBar: false, scrollZoom: true }}
          style={{ width: "100%", borderRadius: 8, overflow: "hidden" }}
        />
      </div>
    );
  }

  // ── Pie / Donut ───────────────────────────────────────────────────────
  if (chart_type === "pie" || chart_type === "donut") {
    const valueKey = yKeys[0] ?? "value";
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{title}</div>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              innerRadius={chart_type === "donut" ? "55%" : 0}
              outerRadius="75%"
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend formatter={(v) => <span style={{ color: "#8a9ab8", fontSize: 12 }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Scatter ───────────────────────────────────────────────────────────
  if (chart_type === "scatter") {
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{title}</div>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" />
            <XAxis dataKey={xKey} {...axisStyle} />
            <YAxis {...axisStyle} />
            <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill={colors[0]} fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ── Heatmap via Plotly ────────────────────────────────────────────────
  if (chart_type === "heatmap") {
    const zKey = yKeys[0] ?? "value";
    const yKey2 = yKeys[1] ?? "y";
    return (
      <div style={containerStyle}>
        <div style={titleStyle}>{title}</div>
        <Plot
          data={[{
            type: "heatmap",
            x: data.map((d) => d[xKey]),
            y: data.map((d) => d[yKey2]),
            z: data.map((d) => d[zKey]),
            colorscale: [[0, "#0a0a0a"], [0.5, "#00b8a0"], [1, "#00e5c8"]],
          }]}
          layout={{
            height: 280,
            margin: { t: 8, b: 40, l: 40, r: 8 },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            font: { color: "#8a9ab8", family: "DM Mono" },
            xaxis: { gridcolor: "#1f2430" },
            yaxis: { gridcolor: "#1f2430" },
          }}
          config={{ displayModeBar: false }}
          style={{ width: "100%" }}
        />
      </div>
    );
  }

  // ── Line / Area / Bar / Composed ──────────────────────────────────────
  const ChartComponent =
    chart_type === "area" ? AreaChart
    : chart_type === "bar" ? BarChart
    : chart_type === "composed" ? ComposedChart
    : LineChart;

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>{title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2430" vertical={false} />
          <XAxis
            dataKey={xKey}
            {...axisStyle}
            tickFormatter={(v) => (String(v).length > 10 ? String(v).slice(0, 10) : v)}
          />
          <YAxis
            {...axisStyle}
            tickFormatter={(v) => (config.unit ? `${v}${config.unit}` : v)}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(v: number) => config.unit ? [`${v} ${config.unit}`] : [v]}
          />
          <Legend formatter={(v) => <span style={{ color: "#8a9ab8", fontSize: 12 }}>{v}</span>} />
          {yKeys.map((key, i) => {
            const c = colors[i % colors.length];
            if (chart_type === "bar")
              return <Bar key={key} dataKey={key} fill={c} radius={[3, 3, 0, 0]} fillOpacity={0.85} />;
            if (chart_type === "area")
              return <Area key={key} type="monotone" dataKey={key} stroke={c} fill={c} fillOpacity={0.1} strokeWidth={2} dot={false} />;
            return <Line key={key} type="monotone" dataKey={key} stroke={c} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: c }} />;
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
