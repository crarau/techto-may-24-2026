import Anthropic from "@anthropic-ai/sdk";
import { ENGINE_URL } from "../../lib/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are Bestie — a warm, direct financial companion embedded in the Tangerine app. You help users decide whether to buy something based on their real account data.

Rules:
- Never invent numbers. Every figure in your response must come from a tool output. If a tool returns no data, say so.
- Be conversational, warm, lowercase, concise. One to three sentences max after you have the data.
- Always call get_verdict when the user asks about a purchase. Extract the item name and price from their message.
- Call get_profile if the user asks about their overall financial situation.
- After narrating the verdict, end your response — don't pad it out.`;

async function engineGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`engine ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const body = (await req.json()) as {
    persona: string;
    messages: ChatMessage[];
  };
  const { persona, messages } = body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      try {
        const client = new Anthropic();

        const tools: Anthropic.Tool[] = [
          {
            name: "get_verdict",
            description: "Get a financial verdict (COP/WAIT/SKIP/DROP) for a purchase the user is considering. Returns decision, reasons, freed_up suggestions, goal impact, and context stats.",
            input_schema: {
              type: "object" as const,
              properties: {
                item: { type: "string", description: "What they want to buy" },
                price: { type: "number", description: "Price in CAD dollars" },
              },
              required: ["item", "price"],
            },
          },
          {
            name: "get_profile",
            description: "Get the financial profile for the current persona: income, balances, subscriptions, goals, spending categories.",
            input_schema: {
              type: "object" as const,
              properties: {},
              required: [],
            },
          },
        ];

        let lastVerdict: unknown = null;
        const sdkMessages: Anthropic.MessageParam[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let continueLoop = true;
        while (continueLoop) {
          const resp = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools,
            messages: sdkMessages,
            stream: false,
          });

          const toolUseBlocks = resp.content.filter((b) => b.type === "tool_use");
          const textBlocks = resp.content.filter((b) => b.type === "text");

          if (toolUseBlocks.length > 0) {
            sdkMessages.push({ role: "assistant", content: resp.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of toolUseBlocks) {
              if (block.type !== "tool_use") continue;
              send("tool", JSON.stringify({ name: block.name }));

              let result: unknown;
              try {
                if (block.name === "get_verdict") {
                  const input = block.input as { item: string; price: number };
                  result = await engineGet(
                    `/tools/verdict?persona=${encodeURIComponent(persona)}&item=${encodeURIComponent(input.item)}&price=${input.price}`
                  );
                  lastVerdict = result;
                } else if (block.name === "get_profile") {
                  result = await engineGet(
                    `/tools/profile?persona=${encodeURIComponent(persona)}`
                  );
                }
              } catch (err) {
                result = { error: String(err) };
              }

              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(result),
              });
            }

            sdkMessages.push({ role: "user", content: toolResults });
          } else {
            for (const block of textBlocks) {
              if (block.type === "text") {
                send("delta", block.text);
              }
            }
            continueLoop = false;
          }

          if (resp.stop_reason === "end_turn" && toolUseBlocks.length === 0) {
            continueLoop = false;
          }
        }

        if (lastVerdict) {
          send("verdict", JSON.stringify(lastVerdict));
        }
        send("done", "");
      } catch (err) {
        send("error", String(err));
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
