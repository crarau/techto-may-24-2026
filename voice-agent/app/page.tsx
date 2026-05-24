"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { useCallback, useEffect, useState } from "react";
import { VoiceAgent } from "./VoiceAgent";
import { AskBox } from "./components/AskBox";
import { VerdictCard } from "./components/VerdictCard";
import { ProfilePanel } from "./components/ProfilePanel";
import { getPersonas, getProfile, getVerdict, type Profile, type Verdict } from "./lib/engine";

export default function Home() {
  const [personas, setPersonas] = useState<string[]>(["maya"]);
  const [persona, setPersona] = useState("maya");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    getPersonas().then(setPersonas).catch(() => setDown(true));
  }, []);

  useEffect(() => {
    setVerdict(null);
    getProfile(persona)
      .then((p) => {
        setProfile(p);
        setDown(false);
        if (p.demo_query?.item && p.demo_query?.price) {
          getVerdict(persona, p.demo_query.item, p.demo_query.price)
            .then(setVerdict)
            .catch(() => {});
        }
      })
      .catch(() => setDown(true));
  }, [persona]);

  const ask = useCallback(
    (item: string, price: number) => {
      setLoading(true);
      getVerdict(persona, item, price)
        .then(setVerdict)
        .catch(() => setDown(true))
        .finally(() => setLoading(false));
    },
    [persona]
  );

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

        <div className="flex items-center gap-1.5 rounded-full bg-paper border border-line p-1">
          {personas.map((p) => (
            <button
              key={p}
              onClick={() => setPersona(p)}
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
      </header>

      {down && (
        <div className="rise rounded-2xl border border-drop/30 bg-drop/5 px-5 py-4 text-drop">
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

          <AskBox onAsk={ask} loading={loading} suggestions={suggestions} />

          {verdict ? (
            <VerdictCard v={verdict} />
          ) : (
            <div className="rounded-[28px] border border-dashed border-line bg-paper/50 px-7 py-12 text-center text-ink-soft">
              ask about a purchase to get a verdict.
            </div>
          )}

          <ConversationProvider>
            <VoiceAgent />
          </ConversationProvider>
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
