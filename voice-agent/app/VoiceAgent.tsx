'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';

type Turn = { role: 'user' | 'agent'; text: string; at: number };

export function VoiceAgent() {
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);

  const conversation = useConversation({
    onConnect: () => console.log('[elevenlabs] connected'),
    onDisconnect: () => console.log('[elevenlabs] disconnected'),
    onError: (err) => {
      console.error('[elevenlabs] error', err);
      setError(typeof err === 'string' ? err : JSON.stringify(err));
    },
    onMessage: (m) => {
      console.log('[elevenlabs] message', m);
      const msg = m as { message?: string; source?: 'user' | 'ai' };
      if (msg && typeof msg.message === 'string' && msg.source) {
        setTranscript((prev) => [
          ...prev,
          {
            role: msg.source === 'user' ? 'user' : 'agent',
            text: msg.message!,
            at: Date.now(),
          },
        ]);
      }
    },
  });

  const start = useCallback(async () => {
    setError(null);
    setTranscript([]);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch('/api/get-signed-url');
      const body = (await res.json()) as { signedUrl?: string; error?: string };
      if (!res.ok || !body.signedUrl) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      conversation.startSession({ signedUrl: body.signedUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [conversation]);

  const stop = useCallback(() => {
    conversation.endSession();
  }, [conversation]);

  const status = conversation.status;
  const connected = status === 'connected';
  const connecting = status === 'connecting';
  const speaking = conversation.isSpeaking;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-200 dark:from-zinc-950 dark:to-black p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              should i cop this?
            </h1>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                connected
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : connecting
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            voice agent, genz bestie energy
          </p>
        </div>

        <div className="p-8 flex flex-col items-center gap-6">
          <button
            onClick={connected ? stop : start}
            disabled={connecting}
            className={`relative w-28 h-28 rounded-full font-semibold text-white shadow-lg transition-all active:scale-95 disabled:opacity-60 ${
              connected
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
            }`}
          >
            {connected ? 'end' : connecting ? '...' : 'talk'}
            {speaking && (
              <span className="absolute inset-0 rounded-full border-4 border-white/60 animate-ping" />
            )}
          </button>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center min-h-5">
            {connected
              ? speaking
                ? 'agent is speaking'
                : 'listening'
              : connecting
                ? 'connecting'
                : 'tap to start a voice convo'}
          </p>
        </div>

        {transcript.length > 0 && (
          <div className="px-6 pb-6 max-h-72 overflow-y-auto space-y-3">
            {transcript.map((t, i) => (
              <div
                key={i}
                className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    t.role === 'user'
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  }`}
                >
                  {t.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="px-6 pb-6">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
