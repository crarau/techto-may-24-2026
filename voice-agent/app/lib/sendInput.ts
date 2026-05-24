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

  let accumulated = "";

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
    let verdict: Verdict | undefined;

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
          accumulated += data;
          updateLastAgentText(accumulated);
        } else if (eventType === "tool") {
          try {
            const parsed = JSON.parse(data) as { name: string };
            appendTurn({ kind: "tool-call", name: parsed.name, ms: 0, at: Date.now() });
          } catch {}
        } else if (eventType === "verdict") {
          try {
            verdict = JSON.parse(data) as Verdict;
          } catch {}
        } else if (eventType === "done") {
          updateLastAgentText(accumulated, verdict);
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
