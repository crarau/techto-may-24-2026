# Build Spec — "Should I Cop This?" (Gen Z purchase advisor)

Gen Z persona pivot of the locked niche. Real family-finance substance underneath
(realistic ledger + deterministic engine), Gen Z skin on top (persona, framing, voice,
shareable verdict card). 7-hour build, 4 parallel lanes.

## The one query the demo answers

> "should i cop these $90 jordans?"

The agent pulls real account context, runs deterministic checks, and returns a verdict —
**COP / DROP / WAIT** — narrated in a Gen Z bestie voice, rendered as a screenshottable card.

**Demo dataset is engineered so the answer is non-obvious.** Persona: 23 y/o, ~$2,800/mo
income, heavy DoorDash, **3 active BNPL plans**, saving for a Japan trip. The honest answer
to the Jordans is **DROP / WAIT** — because the BNPL stack + dining pace already blow the
month. That reveal is the wow.

---

## Component 1 — Mock Tangerine data + ingestion
**Owner: Pablo (data) + Abdul (schema/loader). Gate: dataset committed by 10:30.**

No Tangerine sandbox (intel line 112/122) → we **mock a Tangerine account export**. Frame it
in the demo as a real Tangerine statement; categories match Canadian retail banking.

Inputs (committed to repo as fixtures):
- `data/transactions.csv` — 60+ txns over 90 days
- `data/bnpl_plans.json` — 3 active Klarna/Afterpay plans
- `data/profile.json` — income, monthly budget, savings goal, aspiration tags

SQLite schema (Abdul):
```
transactions(id, date, merchant, amount, category, channel, location, is_recurring)
bnpl_plans(id, provider, item, total_amount, installments, paid_count, remaining, next_due, opened)
profile(monthly_income, monthly_budget, savings_goal_name, savings_goal_amount,
        savings_goal_date, aspiration_tags)
```

Pablo's job is realism + a dataset where the math produces a *surprising* verdict. This is
the single most important deadline (everything downstream depends on it).

---

## Component 2 — Deterministic analysis engine (the 99%)
**Owner: Abdul. Gate: all tools return correct values by 12:30.**

Pure Python functions over SQLite. These are the **tools** the agent calls. No LLM here —
this is where reliability and the "99% deterministic" pitch live.

```python
get_budget_pace(month)        -> {spent, budget, pace_pct, days_left, projected_overage}
get_bnpl_exposure()           -> {active_plans, total_owed, due_before_next_paycheck}
find_similar_purchases(cat, price) -> {matches:[{item, price, date, used}], regret_rate}
project_goal_impact(amount)   -> {goal, delay_days, new_eta}
annualize(amount, cadence)    -> {yearly_total, aspiration_equivalent}
verdict(query_amount, category) -> {decision: COP|DROP|WAIT, reasons:[...]}
```

`verdict()` is a rule-based decision tree (e.g., DROP if projected_overage>0 AND
bnpl.due_before_next_paycheck>0). The LLM never decides — it only narrates the rule output.

---

## Component 3 — Agent orchestration (the 1%)
**Owner: Chip. Backboard, code `TECHTO26`. Fallback decision point: 14:00.**

Backboard for LLM routing + memory + RAG. Flow:
1. Receive NL query ("should i cop these jordans").
2. Tool-call chain → Components 2's functions → structured facts.
3. Compose Gen Z verdict from facts. **System prompt rule: never invent numbers, only use
   tool outputs.** Persona: brutally honest bestie (see Component 4).
4. Memory: carry context across questions ("you asked about the jordans earlier").

Fallback if Backboard fights back at 14:00 (per idea.md risk 1): direct Anthropic/Gemini API
+ manual tool dispatch. Same tool signatures, so Abdul's engine is unaffected.

---

## Component 4 — Gen Z AI voice
**Owner: Luca. Voice-stack decision by 11:30. Gate: clip working OR fallback recorded by 16:00.**

Persona: **fast, casual, vibey** — the deliberate inverse of the elder slow-pacing voice.
Slang but intelligible to judges. Roast mode + hype mode.
- Roast: *"bestie that's your 3rd doordash this week, be so for real 💀"*
- Hype: *"ok this one's actually smart — you've eyed it a month and the budget's there. cop it."*

Two tiers (ship Tier A, attempt Tier B):
- **Tier A (demo-safe):** pre-recorded Gen Z verdict clip(s) in the video. Generate via
  ElevenLabs (young casual voice) or Gemini TTS. Per Chip's build tactic — a single exchange
  that *looks* live is enough.
- **Tier B (if time):** live **Gemini Live** voice-to-voice (Tangerine's actual stack →
  scores with their judges).

Do not chase Tier B past 15:30 (idea.md risk 2).

---

## Component 5 — Verdict card / frontend
**Owner: Luca. The shareable artifact + main visual of the video.**

Gen Z doesn't open apps, they screenshot. The verdict is a **phone-native, screenshottable
card** (styled like an iMessage / notification):
- Big verdict: **COP / DROP / WAIT**
- 3–4 grounded reasons (pulled from Component 2, real numbers)
- Aspiration trade-off (*"this = the Japan flight you keep posting about"*)
- Vibe/aura score delta (gamified flourish)

Tech: single styled HTML/React card rendered in browser (cleanest for screenshots), or
Streamlit if faster. Mobile framing is mandatory — Gen Z = phone.

---

## Component 6 — Pitch + glue
**Owner: Chip.**

Pitch line writes itself from the intel: *"You told us Gen Z personalization is the trend —
slang, vibe, gamified, under-40 is your biggest segment. We built it."* Mirror it back the
same way we mirror the Tangerine snippets in idea.md. BNPL reveal = the "real-world problem"
proof point. Verdict card = the "delight." Tool-call chain = "thoughtful agent."

---

## Lane summary

| Lane | Owner | Ships | Hard fallback |
|---|---|---|---|
| Data | Pablo + Abdul | Realistic ledger + BNPL fixtures in SQLite | — (blocking, no fallback) |
| Engine | Abdul | 6 deterministic tools | — |
| Agent | Chip | Backboard tool-call chain | Direct API + manual dispatch @14:00 |
| Voice | Luca | Gen Z verdict voice | Pre-recorded clip @15:30 |
| Card | Luca | Screenshottable verdict card | Static mockup image |
| Pitch | Chip | 3-min video + slide 1 | — |
