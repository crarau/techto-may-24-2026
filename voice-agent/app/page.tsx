"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceAgent } from "./VoiceAgent";
import { ProfilePanel } from "./components/ProfilePanel";
import { Chat } from "./components/Chat";
import { TurnsProvider, useTurns } from "./contexts/TurnsContext";
import { getPersonas, getProfile, type Profile } from "./lib/engine";

function HomeInner() {
  const [personas, setPersonas] = useState<string[]>(["maya"]);
  const [persona, setPersona] = useState("maya");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [down, setDown] = useState(false);
  const { clear } = useTurns();

  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);

  useEffect(() => {
    getPersonas().then(setPersonas).catch(() => setDown(true));
  }, []);

  useEffect(() => {
    getProfile(persona)
      .then((p) => {
        setProfile(p);
        setDown(false);
      })
      .catch(() => setDown(true));
  }, [persona]);

  const handlePersonaSwitch = useCallback((p: string) => {
    setPersona(p);
    clear();
  }, [clear]);

  const handleConversationReady = useCallback((conv: ReturnType<typeof useConversation>) => {
    conversationRef.current = conv;
    setVoiceConnected(conv.status === "connected");
    setVoiceSpeaking(conv.isSpeaking);
  }, []);

  // Poll voice state changes since the conversation object doesn't fire events for status
  useEffect(() => {
    const id = setInterval(() => {
      const conv = conversationRef.current;
      if (!conv) return;
      setVoiceConnected(conv.status === "connected");
      setVoiceSpeaking(conv.isSpeaking);
    }, 300);
    return () => clearInterval(id);
  }, []);

  const suggestions = [
    ...(profile?.demo_query?.item && profile.demo_query.price
      ? [{ item: profile.demo_query.item, price: profile.demo_query.price }]
      : []),
    { item: "Sephora haul", price: 60 },
    { item: "McDonald's", price: 20 },
    { item: "PS5", price: 650 },
  ].filter((s, i, a) => a.findIndex((x) => x.item === s.item) === i);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20">
      {/* Header */}
      <header className="rise flex flex-wrap items-center justify-between gap-4 py-7">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-tangerine text-white shadow-md">
            <span className="h-3.5 w-3.5 rounded-full bg-white/95" />
          </span>
          <div className="leading-none">
            <span className="font-display text-2xl font-extrabold text-tangerine-deep">
              Tangerine
            </span>
            <span className="ml-2 text-ink-soft text-sm lowercase">
              · should we buy this?
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Voice mic button (hoisted to header) */}
          <ConversationProvider>
            <VoiceAgent persona={persona} onConversationReady={handleConversationReady} />
          </ConversationProvider>

          {/* Persona switcher */}
          <div className="flex items-center gap-1.5 rounded-full bg-paper border border-line p-1">
            {personas.map((p) => (
              <button
                key={p}
                onClick={() => handlePersonaSwitch(p)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium lowercase transition ${
                  p === persona
                    ? "bg-tangerine text-white shadow"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </header>

      {down && (
        <div className="rise rounded-2xl border border-drop/30 bg-drop/5 px-5 py-4 text-drop mb-5">
          can&apos;t reach the engine — start it with{" "}
          <code className="font-mono">python engine/serve.py</code> (port 8000).
        </div>
      )}

      {/* Body */}
      <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Decision column */}
        <section className="rise space-y-5" style={{ animationDelay: "60ms" }}>
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] lowercase">
              should i<br />cop this?
            </h1>
            <p className="mt-3 text-ink-soft max-w-md">
              every answer is grounded in {profile?.family_name ?? "your"} real account
              data — not a generic budget rule.
            </p>
          </div>

          <Chat
            persona={persona}
            suggestions={suggestions}
            conversation={conversationRef.current ?? ({} as ReturnType<typeof useConversation>)}
            voiceConnected={voiceConnected}
            voiceSpeaking={voiceSpeaking}
          />
        </section>

        {/* Proof column */}
        <aside className="rise" style={{ animationDelay: "140ms" }}>
          <div className="rounded-[28px] bg-cream/60 border border-line p-6 lg:sticky lg:top-6">
            {profile ? (
              <ProfilePanel p={profile} />
            ) : (
              <p className="text-ink-soft">loading profile…</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <TurnsProvider>
      <HomeInner />
    </TurnsProvider>
  );
}
