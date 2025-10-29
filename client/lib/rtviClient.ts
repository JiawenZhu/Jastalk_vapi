"use client";

import { PipecatClient } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";

/**
 * Returns a Pipecat client configured for browser use.
 * The widget will fetch room credentials from the backend and call connect().
 */
export function getClient() {
  if (typeof window === "undefined") return null as any;
  const transport = new DailyTransport();
  const client = new PipecatClient({ enableMic: true, enableCam: false, transport });
  return client;
}

