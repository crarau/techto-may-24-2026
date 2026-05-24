"use client";

import type { Decision, Verdict } from "../lib/engine";

const STYLES: Record<
  Decision,
  { bg: string; ring: string; label: string; blurb: string }
> = {
  COP: { bg: "bg-cop", ring: "ring-cop/30", label: "cop it", blurb: "you can cop" },
  WAIT: { bg: "bg-wait", ring: "ring-wait/30", label: "wait", blurb: "cop it, but later" },
  SKIP: { bg: "bg-drop", ring: "ring-drop/30", label: "skip", blurb: "don't — it adds up" },
  DROP: { bg: "bg-drop", ring: "ring-drop/30", label: "drop", blurb: "don't cop it" },
};

export function VerdictCard({ v, compact }: { v: Verdict; compact?: boolean }) {
  const s = STYLES[v.decision];

  if (compact) {
    return (
      <div className="rounded-2xl overflow-hidden border border-line">
        <div className={`${s.bg} px-4 py-3 text-white flex items-center gap-3`}>
          <span className="font-display text-2xl font-extrabold leading-none lowercase">{s.label}</span>
          <span className="text-white/80 text-sm lowercase">{s.blurb}</span>
          <span className="ml-auto text-[11px] text-white/60 lowercase">
            {v.item} · ${v.price.toLocaleString("en-CA")}
          </span>
        </div>
        <div className="px-4 py-3 bg-paper space-y-1.5">
          <ul className="space-y-1">
            {v.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-ink">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tangerine" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          {v.freed_up.length > 0 && (
            <div className="rounded-xl bg-tangerine-soft/50 px-3 py-2 text-xs text-ink/80">
              {v.freed_up.map((f, i) => (
                <span key={i} className="lowercase">
                  {f.action} = +${f.annual.toFixed(0)}/yr
                  {i < v.freed_up.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pop rounded-[28px] bg-paper border border-line shadow-[0_30px_60px_-25px_rgba(217,78,0,0.35)] overflow-hidden">
      <div className={`${s.bg} px-7 pt-6 pb-7 text-white relative`}>
        <div className="flex items-baseline justify-between">
          <p className="text-white/80 text-sm font-medium lowercase">
            {v.item} · ${v.price.toLocaleString("en-CA")}
          </p>
          <span className="text-[11px] uppercase tracking-widest text-white/70">
            {v.affordable_now ? "has the cash" : "short on cash"}
          </span>
        </div>
        <div className="mt-2 flex items-end gap-3">
          <h2 className="font-display text-6xl font-extrabold leading-none lowercase">
            {s.label}
          </h2>
          <span className="mb-1 text-white/85 text-lg lowercase">{s.blurb}</span>
        </div>
      </div>

      <div className="px-7 py-6 space-y-4">
        <ul className="space-y-2.5">
          {v.reasons.map((r, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-snug text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-tangerine" />
              <span>{r}</span>
            </li>
          ))}
        </ul>

        {v.freed_up.length > 0 && (
          <div className="rounded-2xl bg-tangerine-soft/60 border border-tangerine-soft px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-tangerine-deep">
              free up cash
            </p>
            <ul className="mt-1.5 space-y-1">
              {v.freed_up.map((f, i) => (
                <li key={i} className="text-sm text-ink/90 flex justify-between gap-3">
                  <span className="lowercase">{f.action}</span>
                  <span className="font-semibold whitespace-nowrap">
                    +${f.annual.toFixed(0)}/yr
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft pt-1">
          {v.goal_impact?.delay_days != null && (
            <span>
              sets back <b className="text-ink">{v.goal_impact.goal}</b> by{" "}
              <b className="text-ink">{v.goal_impact.delay_days} days</b>
            </span>
          )}
          <span>
            ≈ <b className="text-ink lowercase">{v.aspiration_equiv}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
