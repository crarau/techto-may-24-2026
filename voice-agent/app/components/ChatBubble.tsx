"use client";

import type { Turn } from "../contexts/TurnsContext";
import { VerdictCard } from "./VerdictCard";

export function ChatBubble({ turn }: { turn: Turn }) {
  if (turn.kind === "thinking") {
    return (
      <div className="flex gap-2.5 items-start">
        <Avatar who="agent" />
        <div className="rounded-2xl bg-paper border border-line px-4 py-3 text-ink-soft text-sm animate-pulse lowercase">
          thinking…
        </div>
      </div>
    );
  }

  if (turn.kind === "tool-call") {
    return (
      <div className="flex items-center gap-2 px-1 text-[11px] text-ink-soft/70 lowercase">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono">{turn.name}</span>
        {turn.ms > 0 && <span>{turn.ms}ms</span>}
        <span className="h-px flex-1 bg-line" />
      </div>
    );
  }

  const isUser = turn.kind === "user-text" || turn.kind === "user-voice";
  const isVoice = turn.kind === "user-voice" || turn.kind === "agent-voice";
  const verdict = (turn.kind === "agent-text" || turn.kind === "agent-voice") ? turn.verdict : undefined;

  if (isUser) {
    return (
      <div className="flex gap-2.5 items-start justify-end">
        <div className="max-w-[72%] space-y-1">
          <div className="rounded-2xl rounded-tr-sm bg-tangerine px-4 py-3 text-white text-[15px] leading-snug lowercase">
            {turn.text}
          </div>
          {isVoice && (
            <p className="text-right text-[11px] text-ink-soft/60 pr-1">voice</p>
          )}
        </div>
        <Avatar who="user" />
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start">
      <Avatar who="agent" />
      <div className="max-w-[80%] space-y-3">
        {turn.text && (
          <div className="rounded-2xl rounded-tl-sm bg-paper border border-line px-4 py-3 text-[15px] leading-snug lowercase">
            {turn.text}
            {isVoice && (
              <span className="ml-2 text-[11px] text-ink-soft/60">(voice)</span>
            )}
          </div>
        )}
        {verdict && <VerdictCard v={verdict} compact />}
      </div>
    </div>
  );
}

function Avatar({ who }: { who: "user" | "agent" }) {
  if (who === "user") {
    return (
      <div className="shrink-0 h-8 w-8 rounded-full bg-ink/10 grid place-items-center text-xs font-semibold text-ink-soft lowercase">
        you
      </div>
    );
  }
  return (
    <div className="shrink-0 h-8 w-8 rounded-full bg-tangerine grid place-items-center shadow-sm">
      <span className="h-2.5 w-2.5 rounded-full bg-white/95" />
    </div>
  );
}
