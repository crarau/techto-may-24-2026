"use client";

import { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { useTurns } from "../contexts/TurnsContext";
import { sendInput } from "../lib/sendInput";
import { ChatBubble } from "./ChatBubble";

type Props = {
  persona: string;
  suggestions: { item: string; price: number }[];
  conversation: ReturnType<typeof useConversation>;
  voiceConnected: boolean;
  voiceSpeaking: boolean;
};

export function Chat({ persona, suggestions, conversation, voiceConnected, voiceSpeaking }: Props) {
  const { turns, appendTurn, replaceLastThinking, updateLastAgentText } = useTurns();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const messages = turns
    .filter((t): t is Extract<typeof t, { text: string }> =>
      t.kind === "user-text" || t.kind === "user-voice" || t.kind === "agent-text" || t.kind === "agent-voice"
    )
    .map((t) => ({
      role: (t.kind === "user-text" || t.kind === "user-voice" ? "user" : "assistant") as "user" | "assistant",
      content: t.text,
    }));

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput("");
    sendInput(trimmed, {
      persona,
      voiceConnected,
      conversation,
      messages,
      appendTurn,
      replaceLastThinking,
      updateLastAgentText,
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const isEmpty = turns.length === 0;

  return (
    <div className="flex flex-col rounded-[28px] bg-paper border border-line overflow-hidden shadow-sm" style={{ minHeight: "420px" }}>
      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ maxHeight: "520px" }}>
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-ink-soft/60 text-sm lowercase">
            <span className="text-2xl">💬</span>
            <span>ask about a purchase below</span>
          </div>
        )}
        {turns.map((t, i) => (
          <ChatBubble key={i} turn={t} />
        ))}
        {voiceSpeaking && (
          <div className="flex items-center gap-2 text-sm text-tangerine lowercase animate-pulse">
            <span className="h-2 w-2 rounded-full bg-tangerine" />
            bestie is talking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-line px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Mic status pill */}
          <div
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium lowercase transition ${
              voiceConnected
                ? "bg-tangerine/10 text-tangerine-deep"
                : "bg-line/60 text-ink-soft"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${voiceConnected ? "bg-tangerine animate-pulse" : "bg-ink-soft/40"}`}
            />
            {voiceConnected ? "voice on" : "voice off"}
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="type a question…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-soft/50 lowercase"
          />

          <button
            onClick={() => submit(input)}
            disabled={!input.trim()}
            className="rounded-xl bg-tangerine px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-tangerine-deep active:scale-95 disabled:opacity-40 lowercase"
          >
            send
          </button>
        </div>

        {/* Suggestion chips */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.item}
                onClick={() => submit(`should i cop ${s.item} for $${s.price}?`)}
                className="rounded-full border border-line bg-cream/80 px-3 py-1 text-[12px] text-ink-soft transition hover:border-tangerine hover:text-tangerine-deep lowercase"
              >
                {s.item} · ${s.price}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
