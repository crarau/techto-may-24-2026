"use client";

import { useEffect, useRef, useState } from "react";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useTurns } from "../contexts/TurnsContext";
import { sendInput } from "../lib/sendInput";
import { ChatBubble } from "./ChatBubble";
import { VoiceAgent } from "../VoiceAgent";

type Props = {
  persona: string;
  suggestions: { item: string; price: number }[];
  conversation: ReturnType<typeof useConversation>;
  voiceConnected: boolean;
  voiceSpeaking: boolean;
  onConversationReady: (conv: ReturnType<typeof useConversation>) => void;
};

export function Chat({
  persona,
  suggestions,
  conversation,
  voiceConnected,
  voiceSpeaking,
  onConversationReady,
}: Props) {
  const { turns, appendTurn, replaceLastThinking, updateLastAgentText } = useTurns();
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // Scroll only the chat thread, never the page (avoids the whole screen jumping).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, voiceConnected, voiceSpeaking]);

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
  const state = voiceSpeaking ? "talking" : voiceConnected ? "listening" : "idle";
  const STATUS = {
    talking: { label: "bestie is talking", dot: "bg-tangerine animate-ping" },
    listening: { label: "listening — say it out loud", dot: "bg-tangerine animate-pulse" },
    idle: { label: "voice off", dot: "bg-ink-soft/40" },
  }[state];

  return (
    <div className="flex flex-col rounded-[28px] bg-paper border border-line overflow-hidden shadow-sm" style={{ minHeight: "440px" }}>
      {/* Header with live status */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-tangerine/15 text-sm">💬</span>
          <span className="font-display font-bold lowercase">your money bestie</span>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium lowercase ${
            state === "idle" ? "bg-line/50 text-ink-soft" : "bg-tangerine/10 text-tangerine-deep"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${STATUS.dot}`} />
          {STATUS.label}
        </span>
      </div>

      {/* Thread */}
      <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ maxHeight: "500px" }}>
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-44 gap-2 text-center text-ink-soft/70 text-sm lowercase">
            <span className="text-3xl">🍊</span>
            <span>tap the mic to talk, or type below</span>
            <span className="text-ink-soft/50">i&apos;ll answer from your real numbers</span>
          </div>
        )}
        {turns.map((t, i) => (
          <ChatBubble key={i} turn={t} />
        ))}
        {voiceConnected && (
          <div className="flex gap-2.5 items-start">
            <div className="shrink-0 h-8 w-8 rounded-full bg-tangerine grid place-items-center shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-white/95" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-paper border border-line px-4 py-3 text-sm text-ink-soft lowercase flex items-center gap-2">
              {voiceSpeaking ? (
                <>
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-tangerine animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                  talking…
                </>
              ) : (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-tangerine/60 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tangerine" />
                  </span>
                  listening…
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input bar — mic lives here now */}
      <div className="border-t border-line px-4 py-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <ConversationProvider>
            <VoiceAgent persona={persona} onConversationReady={onConversationReady} />
          </ConversationProvider>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={voiceConnected ? "talking… or type here" : "type a question…"}
            className="flex-1 bg-cream/60 rounded-2xl px-4 py-3 text-[15px] outline-none placeholder:text-ink-soft/50 lowercase focus:bg-cream transition"
          />

          <button
            onClick={() => submit(input)}
            disabled={!input.trim()}
            className="rounded-2xl bg-tangerine px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-tangerine-deep active:scale-95 disabled:opacity-40 lowercase"
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
