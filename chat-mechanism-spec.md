# Chat Mechanism Spec — Voice and Text in One Thread

Locks in the Phase 4 design from `architecture.md`. Source: design call with Chip, 2026-05-24.

This doc covers the **client side** only. Phase 2 (the Claude Agent SDK endpoint at `/api/llm/chat/completions` plus a sibling `/api/chat`) is the prerequisite. This spec assumes Phase 2 exists or is in flight.

---

## Goal

Replace the current parallel UI (separate `AskBox` deterministic call, separate `VoiceAgent` ElevenLabs session, disconnected `VerdictCard`) with a **single chat thread** that captures every turn from every input mode. Typed text and spoken text are equivalent inputs into the same conversation. The agent narrates verdicts in voice (when connected) and in text (always). Verdict cards render inline as rich chat bubbles.

---

## Mockup

Two-column layout, same `max-w-6xl` grid `app/page.tsx` already uses. AskBox shrinks to a suggestion strip. VoiceAgent collapses into the chat input bar.

```
+----------------------------------------------------------------------+
|  o Tangerine . should we buy this?           [luca][noah][priya]     |
+----------------------------------------------------------------------+
|  decision column (1.05fr)            |  proof column (0.95fr)        |
|                                      |                               |
|  should i                            |  +-------------------------+  |
|  cop this?                           |  | luca . age 23           |  |
|  every answer grounded in luca's     |  | $2,840 / mo . 18% save  |  |
|  real account data.                  |  |                         |  |
|                                      |  | accounts                |  |
|  +------------------------------+    |  |  . chequing  $612       |  |
|  | chat                         |    |  |  . savings   $1,420     |  |
|  |                              |    |  |                         |  |
|  |  [you]  should i cop these   |    |  | subscriptions (flagged) |  |
|  |         airpods $250?        |    |  |  . Apple Music $11/mo   |  |
|  |                              |    |  |  . Audible     $15/mo   |  |
|  |  [bestie]  checking your     |    |  |                         |  |
|  |  > get_verdict (350ms)       |    |  | goal: emergency $1,000  |  |
|  |                              |    |  | XXXXX..... 42%          |  |
|  |  +- verdict card --------+   |    |  +-------------------------+  |
|  |  | WAIT . almost not yet |   |    |                               |
|  |  | . bnpl due in 4 days  |   |    |  recent purchases             |
|  |  | . dining +43% wk      |   |    |  . airpods . sneakers . ps5   |
|  |  | free up cash > cancel |   |    |                               |
|  |  | apple music = +$132/y |   |    |                               |
|  |  +-----------------------+   |    |                               |
|  |                              |    |                               |
|  |  [bestie] (voice) "bestie    |    |                               |
|  |  not yet, your bnpl hits     |    |                               |
|  |  friday"                     |    |                               |
|  |                              |    |                               |
|  |  [you]   ok what about $90?  |    |                               |
|  |                              |    |                               |
|  |  thinking...                 |    |                               |
|  |                              |    |                               |
|  +------------------------------+    |                               |
|  | mic [tap]  type a question... |   |                               |
|  +------------------------------+    |                               |
|   suggestions:                       |                               |
|   [airpods $250] [mcdonald's $20]    |                               |
+----------------------------------------------------------------------+
```

Mobile collapses to one column. Chat takes full width. Proof column becomes a swipe up sheet (post hackathon nicety, not required for demo).

---

## Three layer client model

### Layer 1. Shared turn store

A single source of truth for the thread. Voice and text both append to it.

```ts
// app/contexts/TurnsContext.tsx
export type Turn =
  | { kind: 'user-text';   text: string; at: number }
  | { kind: 'user-voice';  text: string; at: number }
  | { kind: 'agent-text';  text: string; at: number; verdict?: Verdict }
  | { kind: 'agent-voice'; text: string; at: number; verdict?: Verdict }
  | { kind: 'tool-call';   name: string; ms: number; at: number }
  | { kind: 'thinking';    at: number };

export const TurnsProvider: React.FC<{ children: ReactNode }>;
export const useTurns: () => {
  turns: Turn[];
  appendTurn: (t: Turn) => void;
  replaceLastThinking: (t: Turn) => void;
  clear: () => void;
};
```

Wrap the whole `<main>` in `TurnsProvider` inside `app/page.tsx`. Every input path appends, the chat thread renders.

### Layer 2. Single input bridge

One function the input box calls. Routes based on whether voice is live.

```ts
// app/lib/sendInput.ts
export function sendInput(
  text: string,
  ctx: {
    voiceConnected: boolean;
    conversation: ReturnType<typeof useConversation>;
    appendTurn: (t: Turn) => void;
    replaceLastThinking: (t: Turn) => void;
  }
): void;
```

Behavior:

1. Append a `user-text` turn immediately.
2. Append a `thinking` placeholder.
3. **If voice is connected**: call `ctx.conversation.sendUserMessage(text)`. ElevenLabs treats it as an STT result, the Custom LLM endpoint runs the agent loop, the response comes back as audio plus transcript events. The voice transcript callbacks will replace the thinking placeholder.
4. **If voice is not connected**: open an EventSource (or fetch + stream) to `/api/chat`. Parse SSE deltas. As tokens arrive, replace the thinking placeholder with a growing `agent-text` turn. When the stream ends, attach `verdict` to the turn if the server sent a structured verdict block.

### Layer 3. Voice events feed the same store

Refactor `app/VoiceAgent.tsx` to drop its local `useState` and instead push events to `TurnsContext`. The ElevenLabs callbacks you need:

```ts
const { appendTurn, replaceLastThinking } = useTurns();
const conversation = useConversation({
  onMessage: (m) => {
    const t: Turn = m.source === 'user'
      ? { kind: 'user-voice',  text: m.message, at: Date.now() }
      : { kind: 'agent-voice', text: m.message, at: Date.now() };
    appendTurn(t);
  },
  onAgentToolRequest: (req) =>
    appendTurn({ kind: 'tool-call', name: req.tool_name, ms: 0, at: Date.now() }),
  onError: (err) => console.error('[elevenlabs]', err),
});
```

Verdict cards: when the agent response includes `{ verdict: {...} }` in its tool output, the server pushes a synthetic event the client can parse and attach to the `agent-voice` or `agent-text` turn. Concrete mechanism: server returns verdict JSON as the last SSE event with `event: verdict`. Voice path: server emits a contextual update via `conversation.sendContextualUpdate` so the client knows which turn to attach the card to. For demo simplicity, attach to the most recent agent turn.

---

## File plan

| File | New / change | Owner | Purpose |
|---|---|---|---|
| `app/contexts/TurnsContext.tsx` | new | next.js lane | Turn store, provider, hook |
| `app/components/Chat.tsx` | new | next.js lane | Thread plus input bar (mic pill on the left, text input, send) |
| `app/components/ChatBubble.tsx` | new | next.js lane | One turn renderer. Special case `verdict` to embed compact `VerdictCard` |
| `app/components/AskBox.tsx` | shrink | next.js lane | The free form input merges into Chat. Keep the suggestion chips. The price `$250` chip stays as a quick fill button above the chat input |
| `app/components/VerdictCard.tsx` | add `compact` prop | next.js lane | Inside chat: smaller padding, no glow shadow, no aspiration footer |
| `app/VoiceAgent.tsx` | refactor | next.js lane | Mic button only. Push events to `TurnsContext`. Remove local state |
| `app/page.tsx` | restructure | next.js lane | Wrap in `TurnsProvider`. Replace AskBox plus VerdictCard plus VoiceAgent block with `<Chat />` |
| `app/api/chat/route.ts` | new (Phase 2 dep) | next.js lane | Text only streaming endpoint. Same Agent SDK loop as `/api/llm/chat/completions`, simpler output (text/event-stream, not OpenAI format) |

The voice agent SDK already in `package.json` (`@elevenlabs/react`, `@elevenlabs/client`) does everything needed. No new dependencies.

---

## ElevenLabs SDK integration points (three)

1. **`useConversation` hook**. Stays inside `VoiceAgent.tsx`. Add the `onMessage`, `onAgentToolRequest`, `onAgentResponseCorrection` callbacks to push to the turn store.
2. **`conversation.sendUserMessage(text)`**. The bridge that makes typed input go through the voice agent when it is live. ElevenLabs receives the text as if it were spoken, the Custom LLM endpoint reasons, the response comes back as audio.
3. **`conversation.isSpeaking` plus `conversation.status`**. Already used for the `halo` animation. Now also used by `Chat.tsx` to render the thinking placeholder differently when the agent is mid utterance.

The text path (`/api/chat`) is fully independent of ElevenLabs. When voice is off, typed input bypasses ElevenLabs entirely.

---

## Smallest viable cut (after Phase 2 is in)

1. `TurnsContext` plus provider. 30 min.
2. `Chat.tsx` with input plus thread plus streaming from `/api/chat`. 60 min.
3. `VoiceAgent.tsx` refactor to push to `TurnsContext`. 20 min.
4. `VerdictCard` `compact` variant. 15 min.
5. Wire `sendUserMessage` for voice live text input. 15 min.

Total roughly 2h 20m, assuming Phase 2 endpoint exists.

---

## What does not change

- The Tangerine theme, palette, type, animations in `app/globals.css`. Reused as is.
- The deterministic engine, persona JSONs, tool surface. Unchanged.
- The `VerdictCard` content. Only the wrapper styling gets a `compact` prop.
- The system prompt rule "never invent numbers". Holds.

---

## Open questions

1. **Verdict card attachment in voice mode**: simplest is "attach to most recent agent turn." Cleaner is to have the Custom LLM endpoint emit a sideband event the client matches by `tool_call_id`. Start with the simple version, upgrade if time.
2. **Persistence**: should turn history survive a page reload? Out of scope for the demo. localStorage if we have time.
3. **Multi persona memory**: when the user switches persona, does the chat thread clear, or do we badge previous turns with the persona at the time? Recommend: clear on switch, simplest mental model for judges.
