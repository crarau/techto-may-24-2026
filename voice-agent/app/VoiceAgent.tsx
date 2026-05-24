"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState } from "react";

export function VoiceAgent() {
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onError: (err) =>
      setError(typeof err === "string" ? err : JSON.stringify(err)),
  });

  const start = useCallback(async () => {
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch("/api/get-signed-url");
      const body = (await res.json()) as { signedUrl?: string; error?: string };
      if (!res.ok || !body.signedUrl) throw new Error(body.error || `HTTP ${res.status}`);
      conversation.startSession({ signedUrl: body.signedUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [conversation]);

  const stop = useCallback(() => conversation.endSession(), [conversation]);

  const status = conversation.status;
  const connected = status === "connected";
  const connecting = status === "connecting";
  const speaking = conversation.isSpeaking;

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-paper border border-line px-5 py-4 shadow-sm">
      <button
        onClick={connected ? stop : start}
        disabled={connecting}
        className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-md transition active:scale-95 disabled:opacity-60 ${
          connected ? "bg-drop" : "bg-tangerine hover:bg-tangerine-deep"
        } ${speaking ? "halo" : ""}`}
        aria-label={connected ? "end voice" : "start voice"}
      >
        {connected ? (
          <span className="h-4 w-4 rounded-[3px] bg-white" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z"
              fill="currentColor"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0M12 18v3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      <div className="min-w-0">
        <p className="font-display font-semibold lowercase">
          {connected ? (speaking ? "talking…" : "listening…") : "or just ask out loud"}
        </p>
        <p className="text-sm text-ink-soft lowercase truncate">
          {error
            ? "voice needs the elevenlabs key — text works now"
            : connecting
              ? "connecting…"
              : "tap to talk to your money bestie"}
        </p>
      </div>
    </div>
  );
}
