import type { useConversation } from "@elevenlabs/react";
import type { Turn } from "../contexts/TurnsContext";
import type { Verdict } from "./engine";

type ConversationHandle = ReturnType<typeof useConversation>;

type Ctx = {
  persona: string;
  voiceConnected: boolean;
  conversation: ConversationHandle;
  messages: { role: "user" | "assistant"; content: string }[];
  appendTurn: (t: Turn) => void;
  replaceLastThinking: (t: Turn) => void;
  updateLastAgentText: (text: string, verdict?: Verdict) => void;
};

export function sendInput(text: string, ctx: Ctx): void {
  const { persona, voiceConnected, conversation, messages, appendTurn, replaceLastThinking, updateLastAgentText } = ctx;

  appendTurn({ kind: "user-text", text, at: Date.now() });
  appendTurn({ kind: "thinking", at: Date.now() });

  if (voiceConnected) {
    conversation.sendUserMessage(text);
    return;
  }

  // Text path: stream from /api/chat
  const body = JSON.stringify({
    persona,
    messages: [...messages, { role: "user", content: text }],
  });

  const eventSource = new EventSource(
    `/api/chat?_body=${encodeURIComponent(body)}`
  );

  // EventSource only supports GET; use fetch with streaming instead
  eventSource.close();

  // Typewriter drain: buffer incoming tokens, release a few chars per animation frame
  let pending = "";
  let displayed = "";
  let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
  let finalVerdict: Verdict | undefined;
  let streamDone = false;

  function drain() {
    if (pending.length > 0) {
      const chunk = pending.slice(0, 4);
      pending = pending.slice(4);
      displayed += chunk;
      updateLastAgentText(displayed);
    }
    if (pending.length > 0 || !streamDone) {
      rafId = requestAnimationFrame(drain);
    } else {
      rafId = null;
      updateLastAgentText(displayed, finalVerdict);
    }
  }

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).then(async (res) => {
    if (!res.ok || !res.body) {
      replaceLastThinking({
        kind: "agent-text",
        text: "something went wrong — check the console.",
        at: Date.now(),
      });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.split("\n");
        let eventType = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) eventType = line.slice(7).trim();
          if (line.startsWith("data: ")) data = line.slice(6);
        }

        if (eventType === "delta") {
          pending += data;
          if (rafId === null) rafId = requestAnimationFrame(drain);
        } else if (eventType === "verdict") {
          try { finalVerdict = JSON.parse(data) as Verdict; } catch {}
        } else if (eventType === "done") {
          streamDone = true;
        }
      }
    }
  }).catch(() => {
    replaceLastThinking({
      kind: "agent-text",
      text: "couldn't reach the chat endpoint.",
      at: Date.now(),
    });
  });
}
