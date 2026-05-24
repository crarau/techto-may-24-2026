"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Verdict } from "../lib/engine";

export type Turn =
  | { kind: "user-text";   text: string; at: number }
  | { kind: "user-voice";  text: string; at: number }
  | { kind: "agent-text";  text: string; at: number; verdict?: Verdict }
  | { kind: "agent-voice"; text: string; at: number; verdict?: Verdict }
  | { kind: "tool-call";   name: string; ms: number; at: number }
  | { kind: "thinking";    at: number };

type TurnsContextValue = {
  turns: Turn[];
  appendTurn: (t: Turn) => void;
  replaceLastThinking: (t: Turn) => void;
  updateLastAgentText: (text: string, verdict?: Verdict) => void;
  clear: () => void;
};

const TurnsContext = createContext<TurnsContextValue | null>(null);

export function TurnsProvider({ children }: { children: ReactNode }) {
  const [turns, setTurns] = useState<Turn[]>([]);

  const appendTurn = useCallback((t: Turn) => {
    setTurns((prev) => [...prev, t]);
  }, []);

  const replaceLastThinking = useCallback((t: Turn) => {
    setTurns((prev) => {
      const idx = [...prev].reverse().findIndex((x) => x.kind === "thinking");
      if (idx === -1) return [...prev, t];
      const realIdx = prev.length - 1 - idx;
      const next = [...prev];
      next[realIdx] = t;
      return next;
    });
  }, []);

  const updateLastAgentText = useCallback((text: string, verdict?: Verdict) => {
    setTurns((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const t = prev[i];
        if (t.kind === "agent-text" || t.kind === "thinking") {
          const next = [...prev];
          next[i] = { kind: "agent-text", text, at: t.at, verdict };
          return next;
        }
      }
      return [...prev, { kind: "agent-text", text, at: Date.now(), verdict }];
    });
  }, []);

  const clear = useCallback(() => setTurns([]), []);

  return (
    <TurnsContext.Provider value={{ turns, appendTurn, replaceLastThinking, updateLastAgentText, clear }}>
      {children}
    </TurnsContext.Provider>
  );
}

export function useTurns() {
  const ctx = useContext(TurnsContext);
  if (!ctx) throw new Error("useTurns must be used inside TurnsProvider");
  return ctx;
}
