"use client";

import { useEffect, useMemo, useState } from "react";
import { usePipecatClient, useRTVIClientEvent } from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";

export function PipecatWidget() {
  const client = usePipecatClient();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [remoteLevel, setRemoteLevel] = useState(0);
  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:7860";
  }, []);

  useRTVIClientEvent(RTVIEvent.Connected, () => setConnected(true));
  useRTVIClientEvent(RTVIEvent.Disconnected, () => setConnected(false));
  useRTVIClientEvent(RTVIEvent.Error, (e) => setError(String(e?.message || e)));
  useRTVIClientEvent(RTVIEvent.BotStartedSpeaking, () => setSpeaking(true));
  useRTVIClientEvent(RTVIEvent.BotStoppedSpeaking, () => setSpeaking(false));
  // Remote audio level event (0..1); some builds may send { level } or raw number
  useRTVIClientEvent(RTVIEvent.RemoteAudioLevel, (payload: any) => {
    const lvl = typeof payload === "number" ? payload : (payload?.level ?? 0);
    setRemoteLevel(Math.max(0, Math.min(1, Number(lvl) || 0)));
  });

  async function start() {
    try {
      setError(null);
      setConnecting(true);
      // Ask backend to create a room and spawn the bot
      const resp = await fetch(`${apiBase}/connect`, { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.detail || data?.error || `HTTP ${resp.status}`);
      const { room_url, token } = data;
      // Connect client to Daily room
      await client.connect({ room_url, token });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setConnecting(false);
    }
  }

  function stop() {
    try { client.disconnect(); } catch {}
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={start}
          disabled={connecting || connected}
          className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
        >
          {connecting ? "Starting…" : "Start Voice Interview"}
        </button>
        <button
          onClick={stop}
          disabled={!connected}
          className="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50"
        >
          End Interview
        </button>
      </div>
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {!error && (
        <div className="mt-2 flex flex-col items-center">
          {!connected ? (
            <p className="text-gray-600 text-sm">Click start to create a room and connect your interviewer bot.</p>
          ) : (
            <>
              {/* Speaking wave animation (no name display) */}
              <div className="flex gap-1 items-end h-8 mt-2" aria-label="agent speaking indicator">
                {Array.from({ length: 12 }).map((_, i) => {
                  const jitter = (Math.sin((i + 1) * 1.3) + 1) * 0.08; // slight variation
                  const level = speaking ? Math.max(0.15, remoteLevel) : 0.05;
                  const height = 6 + Math.round(24 * Math.min(1, level + jitter));
                  const delay = `${(i % 4) * 40}ms`;
                  return (
                    <span
                      key={i}
                      className="w-1 rounded bg-emerald-500 transition-[height] duration-100"
                      style={{ height: `${height}px`, transitionDelay: delay }}
                    />
                  );
                })}
              </div>
              <p className="text-emerald-700 text-xs mt-2">{speaking ? "Agent speaking…" : "Connected — speak when ready."}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
