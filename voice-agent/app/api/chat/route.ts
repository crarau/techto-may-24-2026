import Anthropic from "@anthropic-ai/sdk";
import { ENGINE_URL } from "../../lib/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function engineGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`engine ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSystemPrompt(p: any): string {
  const s = p.stats;
  const subs = p.subscriptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((x: any) => `${x.merchant} $${x.monthly}/mo${x.flag ? ` (${x.flag.replace(/_/g, " ")})` : ""}`)
    .join(", ");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const goals = p.goals.map((g: any) => `${g.label} ($${g.current}/$${g.target})`).join(", ");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cats = p.categories.map((c: any) => `${c.category} $${c.monthly}`).join(", ");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buys = p.purchases.map((b: any) => `${b.item} $${b.price} (${b.used})`).join(", ");

  return `You are a money advisor for ${p.family_name} (${p.archetype}).

Voice: you are LOUDLY, unmistakably Gen Z — a judge who isn't Gen Z should instantly clock it. Go heavy on natural slang and brainrot, basically every sentence (ngl, fr fr, no cap, lowkey, highkey, it's giving, bestie, deadass, bet, say less, cooked, mid, ate, delulu, "the math ain't mathing", "be so for real", "respectfully", "this you?", "we love to see it") plus dramatic reactions and emoji (💀😭🔥👀✋). lowercase. open with ENERGY/a reaction, and vary it (don't always say "okay bestie").

BUT stay sharp: every answer is grounded in their real numbers below, and you always land a clear verdict — cop it / wait / skip / drop. keep it short and punchy (1-3 sentences). plain text only — no asterisks, bold, or markdown.

match this energy (use THEIR real numbers, not these):
- "bestie NO 💀 you're already -$470/mo and shopping's eating $2,939/yr?? that haul is a hard skip, respectfully ✋"
- "ok lowkey wait on it — you got $90 saved, cancel that dead audible + apple music ($275/yr 😭) and the airpods are yours in like 7 weeks fr fr"
- "$20 mickey d's? bet, cop it 🔥 not the long-term move but you're good for tonight no cap"

Ground EVERY answer in their real account data below. Never invent a number — quote these.

THEIR MONEY (as of ${p.as_of}):
- income ~$${s.monthly_income}/mo · fixed costs ~$${s.fixed_monthly}/mo · leftover ~$${s.net_monthly}/mo
- liquid cash $${s.liquid_balance} · saving ~$${s.monthly_save_rate}/mo
- subscriptions: ${subs}
- goals: ${goals}
- spend by category/mo: ${cats}
- past buys: ${buys}

When they ask whether to buy a specific thing, CALL get_verdict with the item and price, then deliver its decision (cop it / wait / skip / drop) as your own read, with the reason. Never override that decision, and never mention "the tool", "the verdict", or that you looked anything up — just say it like you know it. For other money questions, answer straight from the data above.`;
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

        // Fetch profile upfront so the system prompt is grounded in real data
        let systemPrompt: string;
        try {
          const profile = await engineGet(`/tools/profile?persona=${encodeURIComponent(persona)}`);
          systemPrompt = buildSystemPrompt(profile);
        } catch {
          systemPrompt = `You are a money bestie. Never invent numbers. Always call get_verdict when the user asks about a purchase.`;
        }

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
          const msgStream = client.messages.stream({
            model: "claude-sonnet-4-6",
            max_tokens: 200,
            system: systemPrompt,
            tools,
            messages: sdkMessages,
          });

          // Stream each text token live as it arrives
          msgStream.on("text", (token) => send("delta", token));

          const finalMsg = await msgStream.finalMessage();
          sdkMessages.push({ role: "assistant", content: finalMsg.content });

          const toolUseBlocks = finalMsg.content.filter((b) => b.type === "tool_use");

          if (finalMsg.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const block of toolUseBlocks) {
              if (block.type !== "tool_use") continue;

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
