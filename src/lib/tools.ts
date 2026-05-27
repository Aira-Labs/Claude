import Anthropic from "@anthropic-ai/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "query_database",
    description:
      "Run a read-only SQL query against the Aira Labs PostgreSQL database. Use this to fetch data needed to answer questions or build charts. Only SELECT statements are allowed.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: {
          type: "string",
          description:
            "A valid PostgreSQL SELECT statement. No INSERT, UPDATE, DELETE, DROP, or DDL.",
        },
        description: {
          type: "string",
          description: "One-line description of what this query fetches.",
        },
      },
      required: ["sql", "description"],
    },
  },
  {
    name: "generate_chart",
    description:
      "Render a chart or map visualisation from data. Returns a chart spec that the UI will render. Call this after fetching data with query_database.",
    input_schema: {
      type: "object" as const,
      properties: {
        chart_type: {
          type: "string",
          enum: [
            "line",
            "bar",
            "area",
            "scatter",
            "pie",
            "donut",
            "histogram",
            "heatmap",
            "map_points",
            "map_heatmap",
            "map_choropleth",
            "composed",
          ],
          description: "The type of chart to render.",
        },
        title: { type: "string", description: "Chart title." },
        data: {
          type: "array",
          description:
            "Array of data objects. For maps, each object must have lat and lng fields.",
          items: { type: "object" },
        },
        config: {
          type: "object",
          description:
            "Chart configuration. For standard charts: {xKey, yKeys[], colors[], unit}. For maps: {center: [lat,lng], zoom, valueKey, colorScale}.",
        },
      },
      required: ["chart_type", "title", "data"],
    },
  },
  {
    name: "summarise_insight",
    description:
      "Present a highlighted insight, stat, or key finding in a visually prominent card rather than plain text.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["stat", "warning", "success", "info"],
        },
        title: { type: "string" },
        value: { type: "string", description: "Primary metric or headline." },
        detail: { type: "string", description: "Supporting context." },
        unit: { type: "string", description: "Optional unit (e.g. µg/m³)." },
      },
      required: ["type", "title", "value"],
    },
  },
];
