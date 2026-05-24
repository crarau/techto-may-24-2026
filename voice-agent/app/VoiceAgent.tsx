"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState } from "react";

type Turn = { role: "user" | "agent"; text: string };

export function VoiceAgent() {
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);

  const conversation = useConversation({
    onError: (err) =>
      setError(typeof err === "string" ? err : JSON.stringify(err)),
    onMessage: (m) => {
      const msg = m as { message?: string; source?: "user" | "ai" };
      if (msg && typeof msg.message === "string" && msg.source) {
        setTranscript((prev) => [
          ...prev,
          { role: msg.source === "user" ? "user" : "agent", text: msg.message! },
        ]);
      }
    },
  });

  const start = useCallback(async () => {
    setError(null);
    setTranscript([]);
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
    <div className="rounded-2xl bg-paper border border-line shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4">
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

      {transcript.length > 0 && (
        <div className="max-h-56 space-y-2 overflow-y-auto border-t border-line bg-cream/40 px-5 py-3">
          {transcript.map((t, i) => (
            <div
              key={i}
              className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-sm ${
                  t.role === "user"
                    ? "bg-tangerine text-white"
                    : "bg-paper border border-line text-ink"
                }`}
              >
                {t.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
