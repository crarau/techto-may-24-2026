// The Phase 2 "brain": Claude reasons over each persona's REAL engine data and
// grounds every answer in it. The deterministic engine remains the source of
// truth — Claude narrates, it never decides the verdict or invents numbers.
//
// Server-only (reads ANTHROPIC_API_KEY). Used by /api/chat (text) and the
// ElevenLabs custom-LLM endpoint (voice).

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // ANTHROPIC_API_KEY from env
const ENGINE = process.env.ENGINE_URL ?? "http://localhost:8000";
const MODEL = "claude-opus-4-7";

export type ChatMessage = { role: "user" | "assistant"; content: string };

async function engine<T>(path: string): Promise<T> {
  const r = await fetch(`${ENGINE}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`engine ${r.status} on ${path}`);
  return r.json() as Promise<T>;
}

const getProfile = (persona: string) =>
  engine<any>(`/tools/profile?persona=${encodeURIComponent(persona)}`);

const getVerdict = (persona: string, item: string, price: number) =>
  engine<any>(
    `/tools/verdict?persona=${encodeURIComponent(persona)}` +
      `&item=${encodeURIComponent(item)}&price=${price}`
  );

function systemPrompt(p: any): string {
  const s = p.stats;
  const subs = p.subscriptions
    .map((x: any) => `${x.merchant} $${x.monthly}/mo${x.flag ? ` (${x.flag.replace(/_/g, " ")})` : ""}`)
    .join(", ");
  const goals = p.goals.map((g: any) => `${g.label} ($${g.current}/$${g.target})`).join(", ");
  const cats = p.categories.map((c: any) => `${c.category} $${c.monthly}`).join(", ");
  const buys = p.purchases.map((b: any) => `${b.item} $${b.price} (${b.used})`).join(", ");

  return `You are "should i cop this?", a Gen Z money bestie talking to ${p.family_name} (${p.archetype}).

Voice: a real friend — casual, lowercase, slang is fine, brutally honest but caring. Keep replies SHORT and spoken (1-3 sentences). No markdown, no jargon, no bullet lists.

Ground EVERY answer in their real account data below. Never invent a number — quote these.

THEIR MONEY (as of ${p.as_of}):
- income ~$${s.monthly_income}/mo · fixed costs ~$${s.fixed_monthly}/mo · leftover ~$${s.net_monthly}/mo
- liquid cash $${s.liquid_balance} · saving ~$${s.monthly_save_rate}/mo
- subscriptions: ${subs}
- goals: ${goals}
- spend by category/mo: ${cats}
- past buys: ${buys}

When they ask whether to buy a specific thing, CALL get_purchase_verdict with the item and price, then deliver its decision (cop it / wait / skip / drop) in your own voice with the reason. Never override the tool's decision. For other money questions, answer straight from the data above.`;
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_purchase_verdict",
    description:
      "Deterministic buy/no-buy verdict for a specific purchase, grounded in this person's real finances. Call whenever the user is deciding whether to buy a specific item at a price.",
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string", description: "what they want to buy, e.g. 'AirPods Pro'" },
        price: { type: "number", description: "price in dollars" },
      },
      required: ["item", "price"],
    },
  },
];

/** Run the grounded agent loop for one persona and return the final spoken text. */
export async function runAgent(persona: string, messages: ChatMessage[]): Promise<string> {
  const profile = await getProfile(persona);
  const system = systemPrompt(profile);
  const convo: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let i = 0; i < 4; i++) {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools: TOOLS,
      messages: convo,
    });

    if (resp.stop_reason === "tool_use") {
      convo.push({ role: "assistant", content: resp.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type === "tool_use" && block.name === "get_purchase_verdict") {
          const { item, price } = block.input as { item: string; price: number };
          let out: unknown;
          try {
            out = await getVerdict(persona, item, price);
          } catch (e) {
            out = { error: String(e) };
          }
          results.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(out),
          });
        }
      }
      convo.push({ role: "user", content: results });
      continue;
    }

    return resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }
  return "ngl my brain glitched — ask me again?";
}
