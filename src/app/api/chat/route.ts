import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { queryDb, getSchema } from "@/lib/db";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function isSafe(sql: string) {
  const s = sql.trim().toUpperCase();
  return s.startsWith("SELECT") && !["INSERT","UPDATE","DELETE","DROP","CREATE","ALTER","TRUNCATE"].some(k => s.includes(k));
}

const tools: Anthropic.Tool[] = [
  {
    name: "query_database",
    description: "Run a read-only SELECT query against the Aira Labs PostgreSQL database.",
    input_schema: {
      type: "object" as const,
      properties: {
        sql: { type: "string", description: "A valid PostgreSQL SELECT statement." },
        description: { type: "string", description: "What this query fetches." },
      },
      required: ["sql", "description"],
    },
  },
  {
    name: "generate_chart",
    description: "Render a chart from data. Call after fetching data with query_database.",
    input_schema: {
      type: "object" as const,
      properties: {
        chart_type: { type: "string", enum: ["line","bar","area","scatter","pie","donut"] },
        title: { type: "string" },
        data: { type: "array", items: { type: "object" } },
        config: { type: "object" },
      },
      required: ["chart_type", "title", "data"],
    },
  },
];

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const schema = await getSchema();

  const system = `You are a data analyst for Aira Labs — a London air quality startup building the Aira Go PM2.5 monitor.

Database schema:
\`\`\`
${schema}
\`\`\`

Always query the database before answering data questions. For numeric questions also generate a chart.
PM2.5 context: WHO guideline 15 µg/m³, UK limit 20 µg/m³.
IMPORTANT: Only call ONE tool at a time. Wait for each tool result before calling the next tool.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        let msgs: Anthropic.MessageParam[] = messages;

        for (let i = 0; i < 15; i++) {
          const res = await client.messages.create({
            model: "claude-opus-4-5",
            max_tokens: 4096,
            system,
            tools,
            messages: msgs,
          });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of res.content) {
            if (block.type === "text") {
              send({ type: "text", content: block.text });
            } else if (block.type === "tool_use") {
              let result: unknown;

              if (block.name === "query_database") {
                const { sql, description } = block.input as { sql: string; description: string };
                send({ type: "query", sql, description });
                if (!isSafe(sql)) {
                  result = { error: "Only SELECT queries allowed." };
                } else {
                  try {
                    const data = await queryDb(sql);
                    send({ type: "rows", count: data.rows.length });
                    result = data;
                  } catch (e) {
                    result = { error: String(e) };
                  }
                }
              } else if (block.name === "generate_chart") {
                send({ type: "chart", spec: block.input });
                result = { rendered: true };
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            }
          }

          if (toolResults.length > 0) {
            msgs = [
              ...msgs,
              { role: "assistant", content: res.content },
              { role: "user", content: toolResults },
            ];
          }

          if (res.stop_reason === "end_turn") break;
          if (res.stop_reason !== "tool_use") break;
        }

        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: String(e) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
