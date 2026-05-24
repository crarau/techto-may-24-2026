# Architecture — Claude Agent SDK + ElevenLabs Voice + Deterministic Engine

The question this doc answers: **Can we put the Claude Agent SDK (the same agentic framework that powers Claude Code) in the middle of ElevenLabs voice and the deterministic Python engine, so the voice agent and the chat agent both reason via Claude and ground every answer in the engine?**

Short answer: **yes**, and it's the architecture I recommend. ElevenLabs Agents supports a Custom LLM endpoint that accepts OpenAI-compatible chat completion requests, including tool calling. Our endpoint runs the Claude Agent SDK with the engine functions registered as tools.

---

## Current state recap (as of pull `f7cf4f4`)

| Component | Status | Path |
|---|---|---|
| Persona data (4 personas, 90 days each) | ✅ shipped | `data/families/*.json` |
| Deterministic engine (COP / WAIT / DROP / SKIP) | ✅ shipped | `engine/engine.py` |
| Web tester + persona profile view | ✅ shipped | `engine/serve.py` |
| Next.js voice UI (ElevenLabs Conversational AI, hosted mode) | ✅ scaffolded | `voice-agent/` |
| Chat interface | ❌ not started | — |
| Engine ⇄ agent bridge | ❌ not started | — |
| Claude Agent SDK in the loop | ❌ not started | — |

Today the voice UI talks to an ElevenLabs Agent configured in their dashboard. That agent's LLM is ElevenLabs-side; it has no way to call `engine/engine.py`. The deterministic verdict is unused. **That is the gap this architecture closes.**

---

## The proposed architecture

```
   user
    │
    ├─ speaks ────────────────────────────────────────────┐
    │                                                     │
    └─ types ──┐                                          │
               │                                          │
               ▼                                          ▼
        Next.js (port 3000)                  ElevenLabs Agents Platform
        ┌─────────────────────┐              ┌──────────────────────────┐
        │  /  (page)          │◀────────────▶│  STT  ─  audio plumbing  │
        │  Chat.tsx           │   signed     │  TTS  ─  voice plumbing  │
        │  VoiceAgent.tsx     │   WebSocket  │                          │
        ├─────────────────────┤              │  Custom LLM webhook  ────┼──┐
        │  /api/chat          │              │  (OpenAI-compatible)     │  │
        │  /api/llm           │◀─────────────┼──────────────────────────┘  │
        │  /api/get-signed-url│              └──────────────────────────────┘
        └────────┬────────────┘
                 │
                 ▼  (one shared agent runtime per request)
        ┌─────────────────────────────────────┐
        │  Claude Agent SDK (TypeScript)      │
        │  ─────────────────────────────────  │
        │  - model: claude-sonnet-4-6         │
        │  - system prompt: persona, voice,   │
        │    "never invent numbers" rule      │
        │  - custom tools: see below          │
        └────────┬────────────────────────────┘
                 │
                 ▼  HTTP (or MCP, see "stretch")
        ┌─────────────────────────────────────┐
        │  Python engine service              │
        │  ─────────────────────────────────  │
        │  engine/serve.py (port 8000)        │
        │  /tools/verdict, /tools/profile,    │
        │  /tools/subscriptions, ...          │
        └────────┬────────────────────────────┘
                 │
                 ▼
        engine/engine.py (pure functions over persona JSON)
```

**Two entry points, one brain.** Both `/api/chat` (text) and the ElevenLabs Custom LLM webhook (voice) hand the request to the same Claude Agent SDK session. The session decides which tools to call, the tools hit the Python engine, the engine returns deterministic facts, the agent narrates them. Voice goes back through ElevenLabs TTS; chat streams the same text to the browser.

---

## Why the Claude Agent SDK in particular

1. **It's the same framework that powers Claude Code.** The agent loop, tool use, hooks, MCP support, streaming — already battle-tested in production. We don't write an agent loop from scratch.
2. **It maps cleanly to the "AI is 1%, deterministic is 99%" pitch.** Engine is the 99%. Claude Agent SDK is the thin reasoning shell.
3. **Strong pitch language for the Tangerine judges**: "the same agentic system Anthropic uses internally, plugged into Tangerine-shaped financial data."
4. **Model-swappable.** Claude Sonnet 4.6 today, Opus 4.7 for harder reasoning, or Gemini through Anthropic's compatibility layer in the future. The agent loop doesn't care.
5. **MCP-ready.** If we wrap the engine as an MCP server (see stretch goal), the same engine becomes a reusable artifact: plug it into Claude Desktop, Claude Code, any MCP-compatible client. That's a serious Tangerine product story.

---

## ElevenLabs Custom LLM mode — how it works

ElevenLabs Agents Platform supports a **Custom LLM** endpoint that replaces their hosted models. They call our HTTPS endpoint with **OpenAI-compatible chat completion requests** during a conversation. Tool calls are passed through. We return an OpenAI-compatible response (streaming or not).

Practically:
- ElevenLabs dashboard: switch agent's LLM from "hosted" → "Custom LLM" → paste our endpoint URL.
- Our endpoint accepts `POST /v1/chat/completions` with `{messages, tools, stream}` payload.
- Inside that endpoint we run the Claude Agent SDK loop, then return the response in OpenAI's format.
- ElevenLabs handles all the audio: STT, sentence chunking for TTS, interruption.

**No ngrok needed for voice** if we deploy the endpoint to Vercel. The signed URL flow and the Custom LLM flow are both HTTPS.

Reference: [Integrate your own model](https://elevenlabs.io/docs/agents-platform/customization/llm/custom-llm)

---

## Custom tools registered with the Claude Agent SDK

Mapped one-to-one onto the engine. Each tool description tells Claude what it does; the implementation calls `engine/serve.py`:

| Tool name | Engine function | Purpose |
|---|---|---|
| `get_verdict` | `verdict(family, item, price)` | The headline tool. Returns `{decision: COP|WAIT|DROP|SKIP, reasons, freed_up, goal_impact, context}`. |
| `get_profile` | `monthly_income`, `fixed_monthly`, `discretionary_monthly`, `liquid_balance`, `monthly_save_rate` | Financial snapshot for the persona. |
| `get_subscription_waste` | `subscription_waste(family)` | Flagged subs, monthly + annual savings if cancelled. |
| `find_similar_purchases` | `find_similar_purchases(family, price)` | Past buys near this price, regret rate. |
| `project_goal_impact` | `project_goal_impact(family, amount)` | Days a spend would delay the emergency goal. |
| `get_category_pace` | `category_pace(family, category)` | Spending pace for a specific category vs typical. Feeds the SKIP path. |
| `list_personas` | (filesystem) | For when the user asks "what other personas can I try?" — chat affordance only. |

**System prompt rule**: "Never invent numbers. Every figure in your response must come from a tool output. If a tool returns no data, say so."

---

## Implementation steps (in order)

**Phase 0 — Decisions and credentials (5 min)**
- Confirm Claude Sonnet 4.6 is the chat model.
- Chip provides `ANTHROPIC_API_KEY` for `voice-agent/.env.local`.
- Confirm Custom LLM endpoint will live at `/api/llm/chat/completions` inside the Next.js app.

**Phase 1 — Expose engine as JSON tools (45 min, owner: Python)**
- Extend `engine/serve.py` with `/tools/<name>` endpoints returning JSON.
- Add CORS headers.
- Smoke test with `curl`.
- See `idea.md` Phase 1 plan for the full endpoint list.

**Phase 2 — Build the Custom LLM endpoint with Claude Agent SDK (90 min, owner: Next.js)**
- `npm install @anthropic-ai/claude-agent-sdk` in `voice-agent/` (read `voice-agent/AGENTS.md` first — it warns Next.js 16 has breaking changes, consult `node_modules/next/dist/docs/` before writing routes).
- `app/api/llm/chat/completions/route.ts`: accept OpenAI-format POST, instantiate the Agent SDK with the tools above (each tool handler `fetch`es `http://localhost:8000/tools/...`), run the loop, stream the response in OpenAI format.
- Add a small OpenAI-format streaming serializer (Anthropic SDK returns events; ElevenLabs wants OpenAI deltas).
- **Gate**: `curl POST /api/llm/chat/completions -d '{"messages":[{"role":"user","content":"should i cop these AirPods"}]}'` returns a streamed response that references real numbers from Luca's engine output.

**Phase 3 — Point ElevenLabs at the Custom LLM (30 min)**
- ElevenLabs dashboard → agent → LLM settings → Custom LLM → paste URL.
- Configure tools in the dashboard with the same schemas the Agent SDK uses (so ElevenLabs knows which tools exist for the OpenAI format).
- **Gate**: speak query into the voice UI, transcript shows the same grounded answer chat would give.

**Phase 4 — Add the chat UI (60 min, owner: Next.js)**
- `app/Chat.tsx`: input + message list + streaming.
- `/api/chat`: thin wrapper that calls the same agent loop and streams text (no OpenAI format needed here, just text/event-stream).
- Tool calls render as collapsed cards in the chat panel.
- Verdict (COP / WAIT / DROP / SKIP) renders as the verdict card from `build-spec.md` Component 5.

**Phase 5 — Persona switcher + dashboard frame (30 min)**
- Top-of-page dropdown. Routes through both chat and voice (voice ends + restarts session with persona in the signed URL request).
- Embed the engine profile view via `<iframe src="http://localhost:8000/profile?persona=X" />`. Re-skin later if we have time.

**Phase 6 — Demo recording (60 min)**
- Luca, AirPods $250 — voice → WAIT verdict → switch to chat → "what if I cancel Apple Music + Audible" → text response → switch persona → family scenario.

**Total: ~5 hours.** Phase 2 is the schedule hinge.

---

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Anthropic SDK ⇄ OpenAI streaming format mismatch | Medium | Use the official Anthropic OpenAI-compatibility layer if it exists; otherwise write a 30-line translator. |
| ElevenLabs Custom LLM tool format quirks | Medium | Mirror their schema exactly. Test with one tool before adding more. |
| Next.js 16 API route surprises | Medium | Read `voice-agent/AGENTS.md` + `node_modules/next/dist/docs/` first. Per their warning, this is not the Next.js most code assumes. |
| ANTHROPIC_API_KEY leaks | Low | `.env.local` is gitignored. Never put it in `NEXT_PUBLIC_*`. |
| Latency: voice → STT → SDK → engine → TTS | Low | Engine calls are sub-10ms. Agent loop is one tool call, one summary. Should land under 2s. |
| Engine evolves while we wire it | High | Keep the tool surface (HTTP endpoints) stable. Engine internals can change. |

---

## Stretch goal — turn the engine into an MCP server

Instead of HTTP, wrap `engine/engine.py` as an **MCP server** (`@anthropic-ai/mcp-server` or the Python equivalent). The Claude Agent SDK consumes it natively via the `mcpServers` config.

Why it's worth the extra 60-90 min if we have it:

1. **Reusable artifact.** Anyone with Claude Desktop or Claude Code can install our MCP server and ask their finances questions. That's a Tangerine product story: "we built an MCP server. Tangerine ships it as part of their AI hub."
2. **Cleaner agent code.** No `fetch()` calls inside tool handlers. MCP tools are first-class.
3. **Pitch angle.** MCP is hot. Saying "we built an MCP server for personal finance" lands well with technical judges.

Decision point: do this in Phase 7, only if we hit Phase 5 with time to spare.

---

## Open questions for Chip

1. **API key**: when can you drop the `ANTHROPIC_API_KEY` into `voice-agent/.env.local`?
2. **Model**: Sonnet 4.6 default. Want Opus 4.7 for the demo run to look smarter? (Slower, ~3x cost, probably not worth it for a 3-min demo.)
3. **Deployment**: deploy the Next.js app to Vercel before recording so ElevenLabs can reach a stable public URL? Or keep everything localhost + screen record from your machine?
4. **MCP stretch**: yes/no — depends on Phase 5 timing.
5. **Chat vs voice priority for the demo**: equal weight, or chat as the safety net if voice glitches on stage?

---

## What does not change

- Engine stays Python, stdlib only.
- Persona JSONs stay in `data/families/`.
- The deterministic philosophy holds: the LLM only narrates engine outputs. No invented numbers.

That's the whole point.
