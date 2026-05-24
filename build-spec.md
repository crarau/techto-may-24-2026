# Build Spec — "Should I Cop This?" (Gen Z purchase advisor)

Gen Z persona pivot of the locked niche. Real family-finance substance underneath
(realistic ledger + deterministic engine), Gen Z skin on top (persona, framing, voice,
shareable verdict card). 12-hour hackathon, 4 parallel lanes.

**Status:** data layer shipped (4 personas), deterministic engine scaffolded and producing
the demo verdict. See "Status by component" tags below.

## Lead persona — Maya

`data/families/maya.json` — Gen Z, 19, Toronto barista, shared apartment. Her data was
built for this demo and the numbers tell a true Gen Z story:
- External income ~$1,160/mo (biweekly barista pay + occasional "E-transfer from Mom")
- Fixed ~$980/mo ($900 rent + subs + phone) → **cash-flow negative (~ -$470/mo)**, living
  on her ~$1,450 cushion
- Flagged waste: **Apple Music (duplicate of Spotify) + Audible (unused 3 months)** = $275/yr
- Goals: emergency fund $2,000 (at $640) · AirPods Pro $250 (at $90)

## The one query the demo answers

> "should i cop these $250 airpods?"

Engine output today (`python engine/engine.py`):
> **WAIT.** You've put $90 toward them, $160 to go. Don't raid your $1,452 cushion — buying
> now sets your emergency fund back 99 days. Cancel Apple Music + Audible ($275/yr of dead
> subs) and at your save pace you cop them in ~7 weeks. (That's ~44 coffee runs.)

That honest, surprising, actionable answer — grounded entirely in real data — is the wow.

---

## Component 1 — Persona data  ✅ SHIPPED
**Owner: Pablo + Abdul.**

`data/generate.py` deterministically generates 4 seeded personas (90-day window):
**maya** (Gen Z student, lead) · **daniel** (Gen Z professional, 26) · **chen** (family) ·
**margaret** (elder, 68, already tagged `slow_deliberate_elder_advisor`).

Each persona JSON: `accounts`, `transactions[{date, amount, merchant, category, location}]`,
`recurring[{merchant, amount, cadence, flag?}]`, `goals`, `purchase_history[{item, price,
used}]`, `demo_targets`, `sample_questions`. **No Tangerine sandbox → we mock** and frame it
as a Tangerine account export. **No SQLite needed** — the JSON is already clean structured
data; the engine loads it directly.

---

## Component 2 — Deterministic engine (the 99%)  ✅ SCAFFOLDED
**Owner: Abdul. `engine/engine.py`, stdlib only, no LLM, no network.**

Pure functions over a persona JSON — the **tools** the agent calls. Reliability and the
"99% deterministic" pitch live here. Already implemented and validated against Maya:
```
monthly_income(f)            discretionary_monthly(f)   liquid_balance(f)
fixed_monthly(f)             monthly_save_rate(f)        subscription_waste(f)
find_similar_purchases(f,$)  project_goal_impact(f,$)    matching_goal(f,item)
classify_item(f,item)        category_pace(f,category)
verdict(f, item, price) -> {
    decision: COP|WAIT|SKIP|DROP, affordable_now, reasons[], freed_up[],
    goal_impact, aspiration_equiv, category, category_pace, context{...}
}
```
`verdict()` is a rule tree: planned-goal path vs impulse path. The impulse path is
**magnitude- AND habit-aware** — `classify_item` tags the item's category + need/want;
`category_pace` measures both windows at once (chronic monthly rate + acute 7-day spike).
Verdicts: **COP** (fine), **WAIT** (soon / saving toward it), **SKIP** (affordable but a
leak/spike — *"shopping is $2,939/yr, your emergency fund 1.5x over"*), **DROP** (can't
afford). Needs (groceries, transit, rent…) are never shamed. The LLM never decides — it
only narrates this object. **Next:** validate against Maya's 10 `sample_questions`, then a
thin query-router so free-text maps to the right tool.

---

## Component 3 — Agent orchestration (the 1%)
**Owner: Chip. Backboard, code `TECHTO26`. Fallback decision point: ~2/3 through build.**

Backboard for LLM routing + memory. Flow: NL query → tool-call chain into Component 2 →
structured facts → compose Gen Z verdict. **System prompt rule: never invent numbers, only
use tool outputs.** Persona: brutally honest bestie (see Component 4). Memory carries context
across questions. Fallback if Backboard fights back: direct Anthropic/Gemini API + manual
dispatch — same tool signatures, so the engine is unaffected.

---

## Component 4 — Gen Z AI voice
**Owner: Luca. Voice-stack decision early. Ship a clip OR fallback recorded.**

Persona: **fast, casual, vibey** — the deliberate inverse of margaret's slow elder voice.
Slang but intelligible to judges. Roast + hype:
- *"bestie you've got an Audible you haven't opened in 3 months AND two music apps 💀"*
- *"good news — cancel those and the airpods are yours in like 7 weeks. we move."*

Tiers: **A (demo-safe)** pre-recorded Gen Z verdict clip (ElevenLabs young voice / Gemini TTS);
**B (stretch)** live **Gemini Live** voice-to-voice (Tangerine's actual stack → judge points).
Don't chase B late.

---

## Component 5 — Verdict card / frontend
**Owner: Luca. The shareable artifact + main visual of the video.**

Phone-native, **screenshottable** card (iMessage / notification styling):
big **COP / DROP / WAIT**, the grounded reasons (real numbers from Component 2), the
`freed_up` actions, goal impact, and the `aspiration_equiv` line ("~44 coffee runs"). Single
styled HTML/React card renders cleanest for screenshots. Mobile framing mandatory.

---

## Component 6 — Pitch + glue
**Owner: Chip.**

Pitch mirrors the intel back: *"You told us Gen Z personalization is the trend — slang, vibe,
gamified, under-40 is your biggest segment. We built it."* The subs/affordability reveal =
"real-world problem"; the verdict card = "delight"; the tool-call chain = "thoughtful agent."
Reuse the Tangerine snippet language from `idea.md`.

---

## Stretch (only if ahead of schedule): BNPL wedge

Maya's data currently has **no BNPL**. A punchier, more uniquely-Gen-Z reveal would add 2–3
Klarna/Afterpay plans to `maya.json` + a `get_bnpl_exposure()` tool ("4th active plan, $190
due before your next paycheck"). ~30 min of generator work. Not on the critical path — the
duplicate-subs + affordability story already lands.

## Lane summary

| Lane | Owner | Status | Hard fallback |
|---|---|---|---|
| Data | Pablo + Abdul | ✅ shipped | — |
| Engine | Abdul | ✅ scaffolded; validate vs 10 sample Qs next | — |
| Agent | Chip | Backboard tool-call chain | Direct API + manual dispatch |
| Voice | Luca | Gen Z verdict voice | Pre-recorded clip |
| Card | Luca | Screenshottable verdict card | Static mockup image |
| Pitch | Chip | 3-min video + slide 1 | — |
