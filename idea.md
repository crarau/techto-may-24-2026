# Track 2 — Family Finance Intelligence

## One-liner
A family financial agent that ingests every transaction and receipt, categorizes them automatically, and lets you query your household money like a database. Ask in natural language. Get answers grounded in your real data, with location, time, and context awareness.

## Inputs
- **Expenses**: bank/card transactions
- **Income**: paychecks, deposits, transfers in
- **Receipts**: photos, PDFs, emails (line-item level)
- **Going-out / discretionary**: restaurants, entertainment, travel
- **Location metadata**: where each spend happened

## The wedge
Most personal finance tools stop at category pie charts. We treat the financial life as a **structured, queryable corpus** that an LLM agent can reason over. Natural questions like:

- "How much did we spend on food during the Lisbon trip?"
- "Are we over budget on kids' activities this quarter compared to last?"
- "Which subscriptions did we use less than twice in the last 60 days?"
- "If we kept this spend pace, how much would we save by December?"
- "Show me every restaurant we ate at twice or more in Toronto, with the total."

## Why it scores

| Criterion | How we hit it |
|-----------|---------------|
| Real-world problem (10) | Money is the #1 stress source for families. Tangerine's brief literally names this. |
| Creativity / delight (10) | Location-aware trip queries + voice ("Hey, how much was the Lisbon trip?") feel magical compared to standard budget apps. |
| Thoughtful AI agent use (10) | Not a chatbot. The agent ingests, categorizes, deduplicates, links receipts to transactions, maintains context across questions, and proactively flags anomalies. |

## Tech stack (sponsor-aligned)
- **Backboard** for the agent layer: LLM routing, memory, RAG over the user's own transactions. `TECHTO26`.
- **Tangerine framing** in the demo. If a public Tangerine API exists, integrate; otherwise mock a Tangerine-style account view.
- **ElevenLabs** voice for the demo "wow" moment.
- Storage: SQLite or Postgres for the structured side. Vector DB (via Backboard memory) for the unstructured side (receipts, notes).

## Demo flow (5 min)
1. Show ingestion: drop a CSV of transactions + a folder of receipt photos. Agent parses and categorizes in real time.
2. Show a query: "How much did we spend on coffee shops in May?"
3. Show a location query: "What did the Lisbon trip cost us total, broken down by category?"
4. Voice query (ElevenLabs): same family asks aloud, gets spoken response.
5. Proactive: agent flags two unused subscriptions and proposes cancellation.

## Risks / unknowns
- Need a realistic sample dataset by 11am or the demo lands flat.
- Receipt OCR quality varies — pick one good lib and cap scope.
- Live demo of voice can fail under venue WiFi; pre-record a fallback clip.

## Open questions before kickoff
- Does Tangerine have a sandbox API for the demo, or do we mock?
- Are we building a web app, mobile shell, or just a CLI + voice for the demo?
- Who on the team owns which slice (ingestion, agent, UI, voice)?

---

## Team Analysis — 4 People, Track 2

### Team
- **Pablo** — Finance domain (non-developer). Owns dataset realism, categorization taxonomy, demo narrative.
- **Chip, Luca, Abdul** — coders. Chip and Luca are versatile across marketing, DevOps, agent, voice, and code. Abdul is the backend specialist.

**Lane assignments are deferred until the use case and demo shape are locked.** We have 7 hours of build time (10am to 5pm). Once the spec is firm, we split across the three coders for speed. Pre-assigning now creates rework when the spec shifts.

### Scope cuts (decided up front)
- **Cut receipt OCR.** Ingest pre-parsed transaction CSV + a few JSON "receipts" Pablo hand-crafts. OCR is a tarpit in a 7-hour build with one dev.
- **Cut full web UI.** Ship a minimal Streamlit or CLI. The video does not need a polished UI; it needs a working agent and a compelling voice moment.
- **Cut multi-user / auth / persistence beyond SQLite.** Single household, single session.
- **Keep voice.** ElevenLabs is the cheapest path to the "delight" criterion and the demo's wow moment.
- **Keep proactive anomaly flag.** One hardcoded surprise (unused subscriptions or trip overspend) sells the "agent, not chatbot" framing.

### Judging criteria mapped to the 2-person build

| Criterion (10 pts) | Where it comes from | Owner | Time at risk |
|---|---|---|---|
| Real-world problem | Pablo's finance lens drives the dataset and narrative. Frame in Tangerine's language: family stress, proactive coaching. First slide names the pain. | Pablo | Low. Pure narrative + dataset work, no code dependency. |
| Creativity / delight | Location-aware trip query ("Lisbon food spend") + ElevenLabs voice. Pre-recorded voice clip as fallback if venue WiFi flakes. | Abdul (voice wiring) + Pablo (script) | Medium. Voice integration is the single biggest schedule risk. |
| Thoughtful AI agent use | Ingest, categorize, link receipts to txns, cross-question memory, proactive flag. Backboard handles memory + RAG so Abdul does not build it from scratch. | Abdul | Medium. Hinges on Backboard SDK working as advertised. |

### Time blocks (10am to 5pm)

| Window | Pablo | Abdul | Gate |
|---|---|---|---|
| 10:00 to 10:30 | Build realistic family ledger CSV (incl. Lisbon trip, subscriptions, 60+ txns over 90 days). Draft demo script. | Repo skeleton, SQLite schema, Backboard account + key. | Dataset committed by 10:30. |
| 10:30 to 12:30 | Refine categorization rules, write 3 to 5 "killer queries" the demo must answer. | CSV ingest + categorization pipeline. End-to-end: CSV in, categorized rows in SQLite. | One query answered correctly by 12:30. |
| 12:30 to 13:30 | Lunch + record voiceover script. | Lunch + Backboard agent stub. | |
| 13:30 to 15:00 | Test queries against the agent, log every failure. | Backboard RAG + memory wired to SQLite. Natural language to SQL or tool-call path working. | All 5 killer queries pass by 15:00. |
| 15:00 to 16:00 | Pre-record voice fallback clip. Build slide 1 (team + emails). | ElevenLabs voice wired. One proactive anomaly flag hardcoded. | Voice demo working OR fallback recorded by 16:00. |
| 16:00 to 16:30 | Record the 3-minute video (screen + voice). | Standby to fix breakage. | Video file exists by 16:30. |
| 16:30 to 17:00 | Buffer for re-record. Upload to Google Drive with correct filename. | Buffer. | Submitted by 16:55. |

### Time dangers
1. **Backboard SDK surprises.** If the SDK fights back at 13:30, Abdul falls back to direct LLM API + manual SQL tool. Decision point: 14:00.
2. **Voice integration.** If ElevenLabs is not working by 15:30, ship the pre-recorded fallback. Do not chase it past 15:30.
3. **Dataset realism.** If Pablo's ledger is not done by 10:30, Abdul has nothing to ingest. This is the single most important deadline of the day.
4. **No second coder.** Any blocker on Abdul stalls the whole build. Pablo cannot back him up on code. Mitigation: aggressive scope cuts above, Backboard for as much glue as possible, Office Hours for blockers.
5. **Video render time.** Leave 30 minutes minimum. Past hackathons lose teams to upload deadlines, not build deadlines.

### What Pablo's finance background unlocks (the unfair advantage)
- Realistic dataset that looks like a real Canadian family ledger, not Faker output. Judges from Tangerine will spot synthetic data instantly.
- Categorization taxonomy that matches how Tangerine likely structures their own data (groceries vs dining, recurring vs one-off, household vs personal).
- A demo narrative grounded in actual family financial pain, not generic "save money" framing. This is the cheapest path to the full 10 points on "real-world problem."

---

## Tangerine Intel (from on-site conversations)

### From the PM
- Tangerine's first AI use case in production is **investment trends + graphs** (portfolio analytics). That's where the money is right now.
- 2 to 3 year roadmap: compete with Wealthsimple. Fast trade. Tangerine is building an AI hub to enable that.
- They use customer behavior data to **auto-offer personalized products** (e.g., savings hits threshold → offers HISA). Side effect of analytics, not the headline.
- **No sandbox data for us.** We mock. Faker output flagged as risk.

### From the AI engineer (self-described "closest to everything Tangerine has done in AI")
- **Personalization is THE big trend.** Two segments to think about:
  - Gen Z: slang, vibe, gamified.
  - Elders: voice, slow pacing. He shipped a Tangerine voice agent and elders said it talks too fast. He called it eye-opening.
- Tangerine customer split: under 40 is biggest, plus a meaningful elder cohort.
- Tangerine stack: **Google ADK + Gemini Live = 90% of what they use.**
- **Gemini Live is voice-to-voice** (skips the STT to LLM to TTS chain), low latency.
- Gemini Enterprise edition. Data on Google's servers, not used for training.
- He flagged that another AI hackathon already proposed something similar to the original family-finance idea. **We need a sharper niche.**

### Philosophy that resonated (and we should encode in the pitch)
- "AI is the 1%. The other 99% is deterministic." Rules engine first, LLM only for fuzzy edges. This will score well with the AI engineer judge.
- Niche first. Nail one thing. Don't ship a generic finance dashboard.
- Numbers change behavior. Families have 20+ transactions a week. The wife asks "are we spending too much on groceries?" and nobody can answer. That gap is the wedge.

---

## Angle Brainstorm (post-conversations)

Ranked by fit with the 2-person team + Tangerine alignment + judging criteria.

| # | Angle | Niche | Deterministic core | AI 1% | Sponsor fit |
|---|---|---|---|---|---|
| 1 | **Grocery price-over-time** | Same SKU 6 months ago vs today. Per-family baseline. | Price index per item across receipts. | Fuzzy product matching across stores. | Tangerine (family pain). |
| 2 | **Subscription audit agent** | Detect recurring charges, flag unused, draft cancellation. | Recurring-charge detection by amount + merchant + cadence. | Cancellation copy + classify "used vs not." | Tangerine. |
| 3 | **Trip cost decomposer** | Location + date window → full cost breakdown. | Geo + time window query over txns. | Natural language to query. | Tangerine + ElevenLabs voice. |
| 4 | **"Should we buy this?" agent** | Decision support given full family context. | Pulls budget, pace, similar past purchases. | Reasoning + recommendation. | Tangerine (behavior change). |
| 5 | **Elder voice coach (slow voice)** | Voice-first, deliberately slow, deliberate pacing. | Same finance pipeline. | Gemini Live with slow speech profile. | Direct differentiator the AI judge gave us. |
| 6 | **Gen Z gamified literacy** | Slang dashboard, vibe-scored spend. | Categorization + streaks. | Slang generation + tone matching. | Tangerine (Gen Z personalization). |
| 7 | **Investment-trigger consumer side** | Mirror what Tangerine does internally: nudge when balance hits threshold. | Threshold detection. | Recommendation framing. | Tangerine (rides their roadmap). |
| 8 | **Annualized behavior nudge** | "$15/wk dining = $780/yr = a flight to Lisbon." | Recurring spend + annualization math. | Narrative framing. | Tangerine. |

### Locked niche: "Should We Buy This?" household purchase advisor

Family-aware purchase decision agent. The query is the product: *"Should we buy this $300 stroller?"* The agent answers with a recommendation grounded in the family's actual financial reality, not a generic budget rule.

**What the agent pulls before answering:**
1. Current month's spend pace vs the family's stated budget.
2. Similar past purchases (category + price band) and whether they actually got used.
3. Savings goal trajectory (e.g., "this purchase delays December savings goal by 2 weeks").
4. Alternative timing or substitution suggestion (e.g., "wait 30 days and this fits the budget without trade-offs").

**Why it scores all three criteria:**
- *Real-world problem*: every family makes purchase decisions weekly and gets it wrong because the math is invisible in the moment.
- *Creativity / delight*: voice-led deliberation with the agent thinking aloud is genuinely novel vs static budget pie charts. Gemini Live makes it feel like asking a thoughtful sibling, not querying an app.
- *Thoughtful AI agent use*: multi-tool context pulling (budget, similar history, projection, alternatives). Not a chatbot, an orchestrated reasoning chain.

**Customer**: Canadian family of 4 (Pablo's domain advantage). Persona for the voice: measured household advisor, deliberate pacing. Specifically NOT a Gen Z buddy — we are leaning on the elder-voice gap the Tangerine AI engineer flagged, but applying that "deliberate pacing" sensibility to family decision-making rather than only elder UX.

**Tangerine fit**: pre-purchase moment is exactly where Tangerine could surface a contextual product (HISA, credit limit increase, savings round-up). We won't build that integration, but we'll frame it in the pitch so judges see the product-side upside.

### Backup bundle (only if we lose the niche): cross-time comparison

Combine #1 + #2 + #3 with a Gemini Live voice front door. One demo, three sharp answers no other app gives:
1. "How much more are we paying for the same groceries vs 6 months ago?"
2. "Which subscriptions did we use less than twice in the last 60 days?"
3. "What did the Lisbon trip cost us?"

Why this scores:
- Each query is a niche the family-finance category genuinely fails at today.
- Pipeline is 99% deterministic (SKU matching, recurrence detection, geo+date filter). AI is the natural-language layer + the voice. Matches the Tangerine AI engineer's philosophy.
- One Gemini Live voice exchange = the delight criterion, in his stack.
- Pablo's finance background drives the SKU normalization + categorization, which is the actual unsolved problem in this space.

### Open tech investigations
- **Google ADK** (Agent Development Kit): worth a short spike. If Tangerine uses it, demoing on the same rails wins points with both Tangerine judges. Confirm what it is and whether it works with Claude or only Gemini.
- **Gemini Live**: voice-to-voice low-latency. Strong candidate for the demo's wow moment. Replaces or supplements the original ElevenLabs plan.
- Decision point on voice stack (ElevenLabs vs Gemini Live) by 11:30am.

---

## Pitch language (from third Tangerine conversation, delivery/governance)

Snippets to mirror verbatim in the 3-minute video. These are Tangerine's own words about their strategic positioning. Using them tells judges we listened.

### Snippet 1: their stated niche
> "More options and a unified interface that simplifies your financial management. May not translate to big market share, but definitely translates to something no one else offers."

**Use in pitch**: frame our agent as "a unified interface that simplifies a financial decision." One voice query collapses budget, purchase history, savings trajectory, and alternatives into a single answer. That phrase is Tangerine's own strategy in their own words.

### Snippet 2: speed as competitive advantage
> "Bigger banks find it harder to get there because of broader customer base and more personas. Tangerine staying small is intentional. With AI and tech forward, it's all about speed."

**Use in pitch**: "RBC has 50 layers of leadership. This product is the kind a lean bank can ship fast that big banks can't get approved in a year." Lean = Tangerine's identity. We built ours in 7 hours; that lands the point.

### Snippet 3: customer-need-first, not market-share
> "Not competing with the big banks. Creating a niche to attract the right kind of people. Look at the customer and just give them what they need."

**Use in pitch**: "Every family makes purchase decisions weekly. Nobody has built the tool that actually helps in that moment. That's the niche." Frame the wedge as a customer-need gap, not a feature gap.

### Snippet 4: the parent (Scotiabank) is a follower
> "Skillshare [Scotiabank] is a follower. RBC has been the first. The point is how we create that niche for ourselves and one of the first unique experiences."

**Use in pitch (lightly)**: don't name competitors in the video. But internally: judges from Tangerine are hungry for "first-mover" framing within their constraints. Position our agent as a "first" of its kind in the Canadian retail-banking AI space.

---

## Build tactic (Chip's takeaway from that conversation)

> "We can shape everything in a demo in two hours. Figure out the nail that is positioning. Figure out positioning, the mock-ups, make sure it cohesively makes sense. Maybe throw some voice agents just for the sake of the demo. Something to catch their eye. Not the value, but eye-catching."

**Implication for Luca's lane**: voice does NOT need full bidirectional Gemini Live integration. A single pre-recorded or mock voice exchange that looks live in the demo video is enough. This cuts Luca's scope by ~60% and frees him to focus on the visual mockup that carries the unified-interface story.

**Implication for the whole team**: lock the positioning and mockup shape first (next ~30 minutes), then code the minimum that proves it. Order of work: positioning → mockup → backend just-enough → voice cosmetic. Not the reverse.

---

## Data Map — Tangerine product universe + family personas

Source: tangerine.ca/en/products (fetched live during planning).

### Tangerine product inventory

**Daily banking**
- No-Fee Daily Chequing Account (with Visa Debit)
- US$ Chequing *(skipped for demo)*

**Savings**
- Savings Account
- TFSA Savings Account (tax-free growth)
- RSP Savings Account (retirement, tax-deferred)
- RIF Savings Account (retirement income distribution)
- Children's Savings Account (minor accounts)
- US$ Savings *(skipped)*

**Investments**
- GICs (locked-in, guaranteed rate)
- Mutual Funds (managed portfolios)
- Non-Registered Investments (taxable)

**Borrowing**
- Mortgage
- Home Equity Line of Credit *(skipped)*
- Line of Credit *(skipped)*
- RSP Loan *(skipped)*

**Credit cards**
- World Elite Mastercard (premium, 30k Scene+ welcome bonus)
- Money-Back World Mastercard (cashback)
- Money-Back Credit Card (entry-level)

**Business** *(excluded from family-finance scope)*

### Build surface (what we actually ingest)

Chequing + Savings (regular, TFSA, RSP, Children's) + Credit Cards + Mutual Funds + Mortgage (as a fixed monthly obligation, no servicing logic). Everything else is excluded for the 7-hour build.

### Personas

We define personas at two levels: individuals and families. Each persona is a holdings mix that determines the data we generate.

#### Persona 1: Maya, 19, Gen Z student
- **Holdings**: No-Fee Chequing, Savings Account.
- **Income**: part-time barista + occasional e-transfers from parents.
- **Expenses**: rent share, food, transit, shared subscriptions (Spotify family, Netflix).
- **Goals**: $2,000 emergency fund by year-end.
- **Sample queries**:
  - "Can I afford these $250 AirPods this month?"
  - "How much have I actually saved vs my goal?"
  - "Which subscriptions am I paying that I do not use?"

#### Persona 2: Daniel, 26, Gen Z young professional
- **Holdings**: Chequing, Savings, TFSA Savings, Money-Back Mastercard, small Mutual Fund.
- **Income**: salaried (~$70k).
- **Expenses**: rent, groceries, dining out, transit, subscriptions, gym.
- **Goals**: max TFSA contribution, save for downpayment.
- **Sample queries**:
  - "Should I move my chequing surplus to TFSA this month?"
  - "Am I on track for the downpayment goal?"
  - "How much would I save by cancelling dining-out for 60 days?"

#### Persona 3: The Chen family (headline persona)
The family is the unit. Each member has their own accounts. A guardian view aggregates everything.

**Members:**
- **Sarah, 42** — guardian. Joint chequing, joint savings, TFSA, RSP, World Elite Mastercard, Mutual Funds, Mortgage (joint).
- **Mike, 44** — partner. Joint chequing, own chequing, RSP, Money-Back Mastercard.
- **Ben, 15** — teen. Children's Savings + parental e-transfer allowance.
- **Lily, 10** — kid. Children's Savings only.

**Family-level data:**
- Combined monthly income (~$11k after tax).
- Shared obligations (mortgage, utilities, groceries, kids' activities).
- Joint goals (Lisbon trip in August, home reno fund, kids' RESP contributions).
- Cross-member visibility for guardians.

**Sample queries by role:**
- **Ben (teen)**: "Can I buy an $80 gaming controller this month?" Agent checks Ben's allowance + Children's Savings against the request.
- **Sarah (guardian)**: "Should we buy a $300 stroller for Lily?" Agent aggregates household budget pace, savings trajectory, similar past purchases.
- **Sarah (guardian)**: "How much did the kids spend on subscriptions last month?" Cross-member roll-up.
- **Mike (partner)**: "Are we still on track for the Lisbon trip in August?" Trip-cost projection against goal.

#### Persona 4 (optional, elder voice differentiator): Margaret, 68
- **Holdings**: RIF, Savings, Chequing.
- **Income**: pension + RIF withdrawals.
- **Same query shape**, voice persona deliberately slow per the AI engineer's feedback.

### Family unit data model

```
family_id
  members[]:   { member_id, name, role (guardian|partner|teen|kid), age }
  accounts[]:  { account_id, type, owner (member_id | "joint"), balance,
                 product_name }
  transactions[]: { txn_id, account_id, member_id, amount, merchant,
                    category, location, date }
  recurring[]: { merchant, amount, cadence, account_id }
  goals[]:     { goal_id, scope (family | member_id), target, deadline,
                 current_progress }
  obligations[]: { type (mortgage|line_of_credit), monthly_payment,
                   remaining_balance }
  purchase_history[]: { item, price, date, used (yes|no|partial),
                        owner_member_id }
```

**Roles determine query scope:**
- Guardian reads all members + all joint accounts + all family goals.
- Partner reads joint + own.
- Teen reads own only (but guardian can see).
- Kid reads own (parents view-only on their behalf).

This role-scoped view is the demo's "wow" moment: the same agent answers a teen's "can I buy this?" with one budget context, and a mom's "should we buy this?" with a completely different aggregated context.

### Fake data generation plan

**Owner**: Pablo curates the structure and the 20 to 30 narratively important transactions. Coders write a Python script to expand into 60 to 90 days of realistic volume.

**Anchor points for realism**:
1. Bi-weekly paychecks for Sarah and Mike.
2. Monthly mortgage payment, fixed.
3. Recurring subscriptions (Netflix, Spotify family, gym, kids' app store charges).
4. Weekly grocery pattern at real Toronto chains (Loblaws, Metro, Sobeys, No Frills).
5. Location-tagged Lisbon trip (March, 14 days, multi-merchant spend across food/transport/lodging).
6. One embedded anomaly for the proactive flag demo (Sarah's gym sub unused for 8 weeks).
7. One reserved "should we buy this?" target event for the live demo moment.

**Tooling**:
- Python + Faker for volume.
- Pablo's hand-curated overlay (CSV) merged in for narratively important rows.
- SQLite as the store.

### Decisions still open

1. Lock the family scenario. Is Chen the right archetype? Or a different cultural / income profile?
2. Single-user demo (Maya or Daniel) in addition to the family, or family only?
3. Lock the demo question(s) that drive the 3-minute video.
4. Voice persona: family advisor (default) or elder voice (differentiator)?
5. Do we include Margaret as a secondary demo or skip her entirely?

---

## Agent UX + Architecture Spec (discussion draft, do not build yet)

Layers on top of Luca's `build-spec.md` (engine + tools + verdict card). Adds the **visualization**, **chat**, **ElevenLabs SDK integration**, and **persona reconciliation** that Luca's spec does not yet cover.

### Goal in one line
A single web app where the user sees their finances visualized, can ask anything by text chat or voice, and gets grounded answers (and a verdict card when relevant). Same agent backend, two input modes, one persona at a time.

### App shape (one page, three panels)

```
+-------------------------------------------------------------+
| Persona switcher:  [Maya] [Daniel] [Chen Family] [Margaret] |
+----------------------+--------------------+-----------------+
|                      |                    |                 |
|   DASHBOARD          |   CHAT             |  VOICE          |
|   (left)             |   (center)         |  (right)        |
|                      |                    |                 |
|  Account cards       |  Stream of user    |  ElevenLabs     |
|  Spending breakdown  |  + agent messages  |  press-to-talk  |
|  Goal bars           |  Tool-call cards   |  widget         |
|  Subscriptions list  |  collapse inline   |                 |
|  Recurring obligns   |  Verdict cards     |  Transcript     |
|  Recent purchases    |  inline when       |  also lands in  |
|                      |  "should I buy"    |  the chat panel |
+----------------------+--------------------+-----------------+
                  |
                  v
          /api/chat  (SSE)
          /api/voice (ElevenLabs webhook or stream)
                  |
                  v
        Agent backend (Python)
        ─ Claude tool-calling
        ─ Calls into Luca's deterministic tool layer
                  |
                  v
        SQLite (one DB per persona, generated from data/families/*.json)
```

### Visualization layer (the part Luca's spec does not yet cover)

The dashboard sells "this is a real product." Without it the demo looks like a CLI with TTS.

Components, all read-only:
- **Account cards** — one per account. Product name, owner (or "Joint"), balance. Mortgage and credit card show in red.
- **Spending breakdown** — pie or horizontal bar chart, last 30 days by category. Filterable by member when on family persona.
- **Goal progress bars** — one per goal in `goals[]`. Show current, target, deadline, on/off pace.
- **Subscriptions list** — flagged ones (`unused_8_weeks`, `duplicate_music_sub`, `watched_once_in_60d`) get a red badge. Annualized cost shown.
- **Recurring obligations** — mortgage, rent, utilities. Just a list.
- **Purchase history** — past large purchases with `used: yes/no/partial` color-coded badges.

No editing. The chat or voice is the only way to "do" anything.

### Chat panel

Standard chat UX. Streaming responses via SSE.

- Tool calls render as collapsed inline cards while the agent is working: `Checked budget pace`, `Pulled BNPL exposure`, etc. Click to expand and see the structured result. Sells the "thoughtful agent, not chatbot" criterion.
- When the user asks a "should I buy X" question, a **verdict card** (Luca's Component 5 design) renders inline at the end of the agent's response.
- Single conversation per persona session. Switching persona resets history.

### Voice panel — ElevenLabs SDK choice

Chip locked ElevenLabs over Gemini Live. Two integration modes on the table:

**Mode A — ElevenLabs Conversational AI** (their hosted agent product)
- They handle STT, LLM call, TTS in one stream.
- We configure tools as webhooks pointing at our backend.
- Pros: fastest to a demo, very low latency.
- Cons: our chat agent and voice agent diverge (they share tools but not the system prompt or memory).

**Mode B — ElevenLabs TTS only + browser STT + our agent**
- Browser captures audio, Web Speech API does STT.
- Our FastAPI agent receives text, runs the same chain as chat.
- Agent response text is streamed to ElevenLabs TTS, audio plays in browser.
- Pros: chat and voice are literally the same agent, same memory, same tool chain. Cleanest pitch.
- Cons: slightly more latency (one extra hop), STT quality depends on browser.

**Recommendation: Mode B.** The pitch "same agent, two input modes" is cleaner than "two agents that share tools." Latency loss is invisible in a recorded video.

### Persona reconciliation (the family question)

Chip's wavering: family is interesting but adds engineering surface. Luca's spec dropped family entirely for a single Gen Z persona.

**Recommendation**: keep family data shape (already generated), but **default the headline demo to Gen Z solo (Luca's direction)** and use the family as a 30-second "breadth proof" callout near the end.

Why:
- Gen Z slang/verdict matches Tangerine's stated personalization trend (intel: under-40 is biggest segment).
- Family architecture (role-scoped queries) is real engineering work that competes with polish in 7 hours.
- We already have the family data. Showing it at all costs us nothing.
- One persona switcher click in the demo proves the architecture handles both, without dedicating build hours to a second deep flow.

Concretely: video spends 2:00 on Maya or Daniel doing "Should I Cop This?" + 0:30 on Sarah Chen doing "Should we buy this?" with the role-scoped variant. Same agent, same backend, persona switch is one dropdown.

### Demo flow (3 minutes, revised)

1. **0:00 to 0:15** — title + premise. "Most personal finance apps tell you where the money went. Tangerine could tell you what to do next."
2. **0:15 to 0:45** — dashboard intro on Daniel (or whichever solo persona we lock). Show accounts, spending pie, goals. "90 days of Tangerine-shaped transactions, ingested and visualized."
3. **0:45 to 1:45** — voice query: *"Should I cop these $90 Jordans?"* Agent narrates, tool-call cards bloom in the chat panel, verdict card appears: **DROP**. Reasons grounded in real numbers from the dataset.
4. **1:45 to 2:15** — chat query: *"If I cancel Crave and Apple TV+, when do I hit my Japan goal?"* Streamed text answer with the math.
5. **2:15 to 2:45** — persona switch to Chen family. Sarah's voice: *"Should we buy a $300 stroller for Lily?"* Agent shows the guardian-scope answer (pulls joint accounts + Lily's history). "Same agent. Family edition."
6. **2:45 to 2:55** — pitch landing: lean banks ship the things big banks cannot approve. Built in 7 hours.
7. **2:55 to 3:00** — team + emails.

### Tech stack proposal

- **Frontend**: Vite + React + Tailwind. Three-panel layout, mobile-framed for screenshots where it matters (the verdict card).
- **Charts**: Recharts. Two charts max, simple shapes.
- **Backend**: FastAPI (Python). One process. SSE endpoint for chat. WebSocket or fetch-stream for voice transcript routing.
- **LLM**: Claude Sonnet for tool use + reasoning. Pitch mentions "model-agnostic, can swap to Gemini" to score with Tangerine.
- **Voice**: ElevenLabs TTS + Web Speech API STT (Mode B).
- **Data**: persona JSONs from `data/families/` loaded into SQLite-in-memory at startup, one DB per persona, swapped on persona switch.
- **Hosting**: Vercel for frontend, Fly.io or Render for backend. Or one Vercel project with serverless functions if FastAPI is too heavy for the deadline.

### Open decisions (lock before coding starts)

1. **Headline persona**: Daniel (Gen Z pro), Maya (Gen Z student), or a new Gen Z persona engineered specifically for the "Should I Cop This?" BNPL surprise (per Luca's spec)?
2. **ElevenLabs mode**: A (Conversational AI hosted) vs B (TTS only + our agent). *Recommend B.*
3. **LLM**: Claude Sonnet vs Gemini vs Backboard router. *Recommend Claude direct.*
4. **Frontend stack**: Vite+React vs Streamlit vs Next.js. *Recommend Vite+React.*
5. **Family scope**: 30-second callout (recommended) vs deeper demo vs cut entirely?
6. **Persona switching**: dropdown vs URL vs separate pages. *Recommend dropdown.*
7. **Tool layer**: reuse Luca's exact signatures or extend with a `scope` argument for family vs self? *Recommend extend.*
8. **Verdict card**: also show in chat panel inline (recommended) or as a separate route?

### Hard "no" list
- No user auth, no multi-tenant.
- No real Tangerine API integration (no sandbox available).
- No OCR or receipt ingestion (data is pre-generated).
- No mobile-native shell. Web only, mobile-framed in the demo where it matters.
- No cross-session memory. One session per persona is enough.
