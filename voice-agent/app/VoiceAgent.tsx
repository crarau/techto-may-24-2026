"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useState } from "react";
import { useTurns } from "./contexts/TurnsContext";
import { getProfile, voiceSystemPrompt } from "./lib/engine";

type Props = {
  persona: string;
  onConversationReady: (conv: ReturnType<typeof useConversation>) => void;
};

export function VoiceAgent({ persona, onConversationReady }: Props) {
  const { appendTurn } = useTurns();
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onMessage: (m) => {
      const t =
        m.source === "user"
          ? { kind: "user-voice" as const, text: m.message, at: Date.now() }
          : { kind: "agent-voice" as const, text: m.message, at: Date.now() };
      appendTurn(t);
    },
    onAgentToolRequest: (req: { tool_name: string }) =>
      appendTurn({ kind: "tool-call", name: req.tool_name, ms: 0, at: Date.now() }),
    onError: (err) => {
      setError(typeof err === "string" ? err : JSON.stringify(err));
    },
  });

  useEffect(() => {
    onConversationReady(conversation);
  }, [conversation, onConversationReady]);

  const start = useCallback(async () => {
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch("/api/get-signed-url");
      const body = (await res.json()) as { signedUrl?: string; error?: string };
      if (!res.ok || !body.signedUrl) throw new Error(body.error || `HTTP ${res.status}`);

      // Inject the selected persona's real financial data so the voice is grounded.
      let overrides;
      try {
        const profile = await getProfile(persona);
        overrides = { agent: { prompt: { prompt: voiceSystemPrompt(profile) } } };
      } catch {
        // engine unreachable — connect anyway (ungrounded)
      }
      conversation.startSession({ signedUrl: body.signedUrl, overrides });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [conversation, persona]);

  const stop = useCallback(() => conversation.endSession(), [conversation]);

  const status = conversation.status;
  const connected = status === "connected";
  const connecting = status === "connecting";
  const speaking = conversation.isSpeaking;

  return (
    <button
      onClick={connected ? stop : start}
      disabled={connecting}
      title={
        error
          ? "voice needs elevenlabs key"
          : connected
            ? "end voice"
            : "start voice"
      }
      className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-md transition active:scale-95 disabled:opacity-60 ${
        connected ? "bg-drop" : "bg-tangerine hover:bg-tangerine-deep"
      } ${speaking ? "halo" : ""}`}
      aria-label={connected ? "end voice" : "start voice"}
    >
      {connected ? (
        <span className="h-3.5 w-3.5 rounded-[3px] bg-white" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
  );
}
