import { auth } from "@/auth";
import { queryDb, getSchema } from "@/lib/db";
import { tools } from "@/lib/tools";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Validate SQL is read-only
function isSafeQuery(sql: string): boolean {
  const upper = sql.trim().toUpperCase();
  const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE", "GRANT", "REVOKE"];
  return upper.startsWith("SELECT") && !forbidden.some((kw) => upper.includes(kw));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  // Fetch schema once per request to give Claude context
  let schema = "";
  try {
    schema = await getSchema();
  } catch {
    schema = "(schema unavailable — database may be unreachable)";
  }

  const systemPrompt = `You are an expert data analyst assistant for Aira Labs — a London-based air quality startup building the Aira Go wearable PM2.5 monitor.

You have direct access to the Aira Labs PostgreSQL database. Your job is to answer questions about the data, surface insights, and generate charts and maps.

## Database Schema
\`\`\`
${schema}
\`\`\`

## Guidelines
- Always query the database before answering data questions — don't guess values.
- For any numeric or trend question, also call generate_chart to visualise the answer.
- For maps, use map_points for individual readings, map_heatmap for density, map_choropleth for area aggregates.
- PM2.5 context: WHO guideline is 15 µg/m³ (24h mean). UK legal limit is 20 µg/m³. Flag anything above these thresholds.
- Keep prose responses concise — let the charts and insight cards do the heavy lifting.
- If a query would be unsafe or non-SELECT, refuse and explain why.
- Dates: the database likely stores timestamps in UTC. Convert to Europe/London for display.`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        // Agentic loop — Claude may call tools multiple times
        let claudeMessages: Anthropic.MessageParam[] = messages;
        
        for (let iteration = 0; iteration < 10; iteration++) {
          const response = await client.messages.create({
            model: "claude-opus-4-5",
            max_tokens: 4096,
            system: systemPrompt,
            tools,
            messages: claudeMessages,
          });

          // Stream text blocks as they come
          for (const block of response.content) {
            if (block.type === "text") {
              send({ type: "text", content: block.text });
            } else if (block.type === "tool_use") {
              send({ type: "tool_start", name: block.name, id: block.id });

              let toolResult: unknown;

              if (block.name === "query_database") {
                const input = block.input as { sql: string; description: string };
                send({ type: "tool_query", sql: input.sql, description: input.description });
                
                if (!isSafeQuery(input.sql)) {
                  toolResult = { error: "Only SELECT queries are permitted." };
                } else {
                  try {
                    const result = await queryDb(input.sql);
                    toolResult = result;
                    send({ type: "tool_data", rows: result.rows.length });
                  } catch (err) {
                    toolResult = { error: String(err) };
                  }
                }
              } else if (block.name === "generate_chart") {
                const input = block.input as Record<string, unknown>;
                // Send chart spec directly to client for rendering
                send({ type: "chart", spec: input });
                toolResult = { rendered: true, message: "Chart sent to client." };
              } else if (block.name === "summarise_insight") {
                const input = block.input as Record<string, unknown>;
                send({ type: "insight", spec: input });
                toolResult = { rendered: true };
              }

              // Add assistant message + tool result to history
              claudeMessages = [
                ...claudeMessages,
                { role: "assistant", content: response.content },
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result",
                      tool_use_id: block.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                },
              ];
            }
          }

          if (response.stop_reason === "end_turn") break;
          if (response.stop_reason !== "tool_use") break;
        }

        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
