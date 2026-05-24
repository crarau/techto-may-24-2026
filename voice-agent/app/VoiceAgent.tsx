"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTurns } from "./contexts/TurnsContext";
import { getProfile, getVerdict, voiceSystemPrompt } from "./lib/engine";

type Props = {
  persona: string;
  onConversationReady: (conv: ReturnType<typeof useConversation>) => void;
};

// Heuristic: pull a purchase (item + price) out of a spoken line so the voice
// path can show the same verdict card the text chat shows. Digit prices only
// (STT outputs digits for amounts); buy-intent gated to avoid false cards.
function parsePurchase(text: string): { item: string; price: number } | null {
  const lower = text.toLowerCase();
  if (!/\b(buy|buying|cop|copping|cope|purchase|afford|grab|get|getting|spend|worth it|should i)\b/.test(lower))
    return null;
  const m = lower.match(/\$\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s*(?:dollars?|bucks)/);
  if (!m) return null;
  const price = parseFloat((m[1] ?? m[2]).replace(/,/g, ""));
  if (!price || price <= 0) return null;

  const item =
    text
      .replace(/\$\s?\d[\d,]*(?:\.\d+)?/g, "")
      .replace(/\d[\d,]*(?:\.\d+)?\s*(?:dollars?|bucks)/gi, "")
      .replace(
        /\b(dollars?|bucks|should i|can i|do you think|i should|buy|buying|cop|copping|cope|purchase|afford|grab|get|getting|spend|worth it|a|an|the|these|this|those|for|on|pair of|of|some|now|right)\b/gi,
        ""
      )
      .replace(/[?.!,]/g, "")
      .replace(/\s+/g, " ")
      .trim() || "this";
  return { item, price };
}

export function VoiceAgent({ persona, onConversationReady }: Props) {
  const { appendTurn } = useTurns();
  const [error, setError] = useState<string | null>(null);
  const personaRef = useRef(persona);
  personaRef.current = persona;
  const greetedRef = useRef(false);

  // A persona switch starts a fresh chat → allow the greeting once more.
  useEffect(() => {
    greetedRef.current = false;
  }, [persona]);

  const conversation = useConversation({
    onMessage: (m) => {
      if (m.source === "user") {
        appendTurn({ kind: "user-voice", text: m.message, at: Date.now() });
        const parsed = parsePurchase(m.message);
        if (parsed) {
          getVerdict(personaRef.current, parsed.item, parsed.price)
            .then((v) => appendTurn({ kind: "agent-voice", text: "", verdict: v, at: Date.now() }))
            .catch(() => {});
        }
      } else {
        appendTurn({ kind: "agent-voice", text: m.message, at: Date.now() });
      }
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

      // Ground the voice in the selected persona's real data.
      let overrides:
        | { agent: { prompt?: { prompt: string }; firstMessage?: string } }
        | undefined;
      try {
        const profile = await getProfile(persona);
        overrides = { agent: { prompt: { prompt: voiceSystemPrompt(profile) } } };
      } catch {
        // engine unreachable — connect ungrounded
      }
      // Only greet once per chat — skip "hey, what are you buying?" on reconnect.
      if (greetedRef.current) {
        overrides = overrides ?? { agent: {} };
        overrides.agent.firstMessage = "";
      }

      await conversation.startSession({ signedUrl: body.signedUrl, overrides });
      greetedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [conversation, persona]);

  const stop = useCallback(() => conversation.endSession(), [conversation]);

  const status = conversation.status;
  const connected = status === "connected";
  const connecting = status === "connecting";
  const speaking = conversation.isSpeaking;
  const muted = conversation.isMuted;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
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
        } ${speaking && !muted ? "halo" : ""}`}
        aria-label={connected ? "end voice" : "start voice"}
      >
        {connected ? (
          <span className="h-3.5 w-3.5 rounded-[3px] bg-white" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" fill="currentColor" />
            <path d="M19 11a7 7 0 0 1-14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {connected && (
        <button
          onClick={() => conversation.setMuted(!muted)}
          title={muted ? "unmute mic" : "mute mic (let it finish talking)"}
          aria-label={muted ? "unmute mic" : "mute mic"}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-md transition active:scale-95 ${
            muted
              ? "bg-ink text-white"
              : "bg-paper border border-line text-ink-soft hover:text-ink"
          }`}
        >
          {muted ? (
            // mic with a slash (muted)
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-5.4-1.8M9 9v3a3 3 0 0 0 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M19 11a7 7 0 0 1-1.2 3.9M12 18v3M5 5l14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" fill="currentColor" />
              <path d="M19 11a7 7 0 0 1-14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
