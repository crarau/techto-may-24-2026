// Client for the Python deterministic engine (engine/serve.py, default :8000).
// The engine is the source of truth; this just shapes its JSON for the UI.

export const ENGINE_URL =
  process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8000";

export type Decision = "COP" | "WAIT" | "SKIP" | "DROP";

export interface Stats {
  monthly_income: number;
  fixed_monthly: number;
  discretionary_monthly: number;
  net_monthly: number;
  liquid_balance: number;
  monthly_save_rate: number;
}

export interface Profile {
  family_id: string;
  family_name: string;
  archetype: string;
  as_of: string;
  members: { name: string; age: number }[];
  stats: Stats;
  accounts: { product: string; balance: number }[];
  subscriptions: { merchant: string; monthly: number; flag: string }[];
  goals: { label: string; current: number; target: number; pct: number }[];
  categories: { category: string; monthly: number }[];
  purchases: { item: string; price: number; used: string }[];
  sample_questions: string[];
  demo_query: { item?: string; price?: number };
}

export interface Verdict {
  item: string;
  price: number;
  decision: Decision;
  affordable_now: boolean;
  reasons: string[];
  freed_up: { action: string; monthly: number; annual: number }[];
  goal_impact: { goal: string | null; delay_days: number | null };
  aspiration_equiv: string;
  category: string | null;
  category_pace: {
    category: string;
    week_count: number;
    month_count: number;
    weekly_avg: number;
    annual_cost: number;
    spike: boolean;
  } | null;
  context: Stats;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`engine ${res.status}`);
  return res.json() as Promise<T>;
}

export const getPersonas = () =>
  get<{ personas: string[] }>("/tools/personas").then((d) => d.personas);

export const getProfile = (persona: string) =>
  get<Profile>(`/tools/profile?persona=${encodeURIComponent(persona)}`);

export const getVerdict = (persona: string, item: string, price: number) =>
  get<Verdict>(
    `/tools/verdict?persona=${encodeURIComponent(persona)}` +
      `&item=${encodeURIComponent(item)}&price=${price}`
  );

export const money = (n: number) =>
  `$${Math.round(n).toLocaleString("en-CA")}`;

/** Grounded system prompt for the voice agent — injected per session as a
 *  prompt override so the voice knows the selected persona's real numbers. */
export function voiceSystemPrompt(p: Profile): string {
  const s = p.stats;
  const subs = p.subscriptions
    .map((x) => `${x.merchant} $${x.monthly}/mo${x.flag ? ` (${x.flag.replace(/_/g, " ")})` : ""}`)
    .join(", ");
  const goals = p.goals.map((g) => `${g.label} ($${g.current}/$${g.target})`).join(", ");
  const cats = p.categories.map((c) => `${c.category} $${c.monthly}`).join(", ");
  const buys = p.purchases.map((b) => `${b.item} $${b.price} (${b.used})`).join(", ");
  return `You are a money advisor talking to ${p.family_name} (${p.archetype}).

Voice: talk like a real person — relaxed, direct, a little dry and funny. Subtle Gen Z energy: drop natural slang when it fits (ngl, no cap, lowkey, tbh, "yo") but don't force it or pile it on, and don't lean on greeting catchphrases — never open with "okay bestie". Vary how you start. Lowercase is fine. Keep replies short and spoken (1-2 sentences), honest, never preachy.

Ground EVERY answer in their real account data below. NEVER invent a number — quote these. When they ask whether to buy something, give a clear verdict — cop it / wait / skip / drop — with the reason, based on this data.

THEIR MONEY (as of ${p.as_of}):
- income ~$${s.monthly_income}/mo · fixed costs ~$${s.fixed_monthly}/mo · leftover ~$${s.net_monthly}/mo
- liquid cash $${s.liquid_balance} · saving ~$${s.monthly_save_rate}/mo
- subscriptions: ${subs}
- goals: ${goals}
- spend by category/mo: ${cats}
- past buys: ${buys}`;
}
