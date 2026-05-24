"use client";

import { money, type Profile } from "../lib/engine";

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-paper border border-line px-4 py-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-soft">{k}</p>
      <p
        className={`font-display text-2xl font-bold ${
          accent ? "text-drop" : "text-ink"
        }`}
      >
        {v}
      </p>
    </div>
  );
}

export function ProfilePanel({ p }: { p: Profile }) {
  const maxCat = Math.max(...p.categories.map((c) => c.monthly), 1);
  const usedColor: Record<string, string> = {
    yes: "text-cop",
    no: "text-drop",
    partial: "text-wait",
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-2xl font-bold lowercase">
          {p.family_name}
        </h3>
        <p className="text-sm text-ink-soft">{p.archetype}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat k="income / mo" v={money(p.stats.monthly_income)} />
        <Stat k="net / mo" v={money(p.stats.net_monthly)} accent={p.stats.net_monthly < 0} />
        <Stat k="liquid cash" v={money(p.stats.liquid_balance)} />
        <Stat k="saving / mo" v={money(p.stats.monthly_save_rate)} />
      </div>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          subscriptions
        </p>
        <div className="rounded-2xl bg-paper border border-line divide-y divide-line">
          {p.subscriptions.map((s) => (
            <div key={s.merchant} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="flex items-center gap-2 lowercase">
                {s.merchant}
                {s.flag && (
                  <span className="rounded-full bg-drop/10 px-2 py-0.5 text-[11px] font-semibold text-drop lowercase">
                    {s.flag.replace(/_/g, " ")}
                  </span>
                )}
              </span>
              <span className="text-ink-soft">${s.monthly.toFixed(2)}/mo</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          goals
        </p>
        <div className="space-y-2.5">
          {p.goals.map((g) => (
            <div key={g.label}>
              <div className="flex justify-between text-sm">
                <span className="lowercase">{g.label}</span>
                <span className="text-ink-soft">
                  {money(g.current)} / {money(g.target)}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-tangerine"
                  style={{ width: `${g.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          where it goes / mo
        </p>
        <div className="space-y-1.5">
          {p.categories.slice(0, 6).map((c) => (
            <div key={c.category} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 lowercase text-ink-soft">{c.category}</span>
              <div className="flex-1 h-2.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-tangerine/70"
                  style={{ width: `${(c.monthly / maxCat) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right tabular-nums">${c.monthly.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </section>

      {p.purchases.length > 0 && (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            past buys
          </p>
          <div className="flex flex-wrap gap-2">
            {p.purchases.map((b) => (
              <span
                key={b.item}
                className="rounded-full border border-line bg-paper px-3 py-1 text-sm lowercase"
              >
                {b.item} ${b.price.toFixed(0)}{" "}
                <span className={usedColor[b.used] ?? "text-ink-soft"}>· {b.used}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
