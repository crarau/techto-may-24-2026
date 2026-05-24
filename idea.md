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

## Team Analysis — 2 People, Track 2

### Team
- **Pablo** — Finance background. Owns the domain: sample dataset realism, categorization taxonomy, demo narrative, "what families actually care about."
- **Abdul** — Backend developer. Owns the pipeline: ingestion, SQLite schema, Backboard agent wiring, query interface, voice integration.

A 2-person team (vs the default 4) forces aggressive scope cuts. The math: 7 hours of build time (10am to 5pm), one backend dev, no frontend or design specialist. Anything that requires parallel coding lanes is at risk.

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
