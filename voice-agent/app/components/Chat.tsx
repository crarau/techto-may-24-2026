"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../lib/agent";

export function Chat({ persona, personaName }: { persona: string; personaName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMessages([]), [persona]); // reset when persona changes
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, messages: next }),
      });
      const body = (await res.json()) as { text?: string; error?: string };
      setMessages((m) => [
        ...m,
        { role: "assistant", content: body.text || `(${body.error || "no reply"})` },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `(error: ${err instanceof Error ? err.message : String(err)})` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-paper border border-line shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 py-3 border-b border-line">
        <p className="font-display font-semibold lowercase">ask your money bestie</p>
        <p className="text-sm text-ink-soft lowercase">
          grounded in {personaName}&apos;s real numbers · powered by claude
        </p>
      </div>

      <div className="max-h-72 min-h-[120px] overflow-y-auto px-5 py-4 space-y-3 bg-cream/30">
        {messages.length === 0 && (
          <p className="text-sm text-ink-soft lowercase">
            try: &ldquo;how much am i wasting on subs?&rdquo; · &ldquo;should i cop $250 airpods?&rdquo;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <span
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "bg-tangerine text-white"
                  : "bg-paper border border-line text-ink"
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <span className="rounded-2xl bg-paper border border-line px-3.5 py-2 text-sm text-ink-soft lowercase">
              thinking…
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ask anything about your money…"
          className="flex-1 bg-cream rounded-xl px-3 py-2.5 outline-none placeholder:text-ink-soft/60 lowercase"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-tangerine px-5 py-2.5 font-semibold text-white transition hover:bg-tangerine-deep active:scale-95 disabled:opacity-60 lowercase"
        >
          send
        </button>
      </form>
    </div>
  );
}
