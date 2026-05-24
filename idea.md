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
