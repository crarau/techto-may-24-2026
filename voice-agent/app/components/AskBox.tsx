"use client";

import { useState } from "react";

type Props = {
  onAsk: (item: string, price: number) => void;
  loading: boolean;
  suggestions: { item: string; price: number }[];
};

export function AskBox({ onAsk, loading, suggestions }: Props) {
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    if (item.trim() && !Number.isNaN(p)) onAsk(item.trim(), p);
  };

  const pick = (s: { item: string; price: number }) => {
    setItem(s.item);
    setPrice(String(s.price));
    onAsk(s.item, s.price);
  };

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex flex-wrap items-stretch gap-2 rounded-2xl bg-paper border border-line p-2 shadow-sm"
      >
        <input
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="should i cop these airpods?"
          className="flex-1 min-w-[180px] bg-transparent px-3 py-2.5 text-lg outline-none placeholder:text-ink-soft/60 lowercase"
        />
        <div className="flex items-center rounded-xl bg-cream px-3">
          <span className="text-ink-soft">$</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="250"
            inputMode="decimal"
            className="w-20 bg-transparent px-1 py-2.5 text-lg outline-none placeholder:text-ink-soft/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-tangerine px-6 py-2.5 font-semibold text-white shadow-md transition hover:bg-tangerine-deep active:scale-95 disabled:opacity-60 lowercase"
        >
          {loading ? "…" : "ask"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.item}
            onClick={() => pick(s)}
            className="rounded-full border border-line bg-paper/70 px-3 py-1 text-sm text-ink-soft transition hover:border-tangerine hover:text-tangerine-deep lowercase"
          >
            {s.item} · ${s.price}
          </button>
        ))}
      </div>
    </div>
  );
}
