// Minimal local relay for Pipecat Cloud during Vite dev.
// Start: node server/pipecat-dev.js (port 8787)
// Vite proxy forwards /api/pipecat/* to this server.

import http from 'http';
import { config as loadEnv } from 'dotenv';

loadEnv();

const PORT = process.env.PIPECAT_DEV_PORT ? Number(process.env.PIPECAT_DEV_PORT) : 8787;
const START_URL = process.env.PIPECATCLOUD_START_URL || '';
const PRIV = process.env.PIPECATCLOUD_PRIVATE_KEY || '';
const PUB = process.env.PIPECATCLOUD_PUBLIC_KEY || '';

function send(res, status, data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

async function handleStart(req, res) {
  if (!START_URL) return send(res, 500, { error: 'PIPECATCLOUD_START_URL not set' });
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', async () => {
    let payload = {};
    try { payload = body ? JSON.parse(body) : {}; } catch {}
    try {
      // Build a start payload that strongly requests Daily
      const out = {
        mode: payload.mode || 'voice',
        template: payload.template || '',
        language: payload.language || 'en',
        metadata: payload.metadata || {},
        transport: 'daily',
        daily: true,
      };

      // Decide auth: public endpoint uses PUBLIC key; non-public uses PRIVATE (with optional x-public)
      const isPublic = /\/public\//.test(START_URL) || (!PRIV && PUB);
      if (isPublic && !PUB) return send(res, 500, { error: 'Public start URL requires PIPECATCLOUD_PUBLIC_KEY' });
      if (!isPublic && !PRIV) return send(res, 500, { error: 'Private start URL requires PIPECATCLOUD_PRIVATE_KEY' });

      const r = await fetch(START_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${isPublic ? PUB : PRIV}`,
          ...(!isPublic && PUB ? { 'x-public-key': PUB } : {}),
        },
        body: JSON.stringify(out),
      });
      // Read body once and try JSON parse
      const raw = await r.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}
      if (!r.ok) {
        const err = data?.error || raw || `Cloud start failed (${r.status})`;
        return send(res, r.status, { error: err });
      }
      const url = data?.url || data?.room_url || data?.room?.url;
      const token = data?.token || data?.auth?.token || data?.daily?.token;
      if (!url || !token) return send(res, 502, { error: 'Invalid cloud response', raw: data || raw });
      return send(res, 200, { url, token, raw: data });
    } catch (e) {
      return send(res, 500, { error: e?.message || String(e) });
    }
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.url === '/api/pipecat/start' && req.method === 'POST') return handleStart(req, res);
  return send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[pipecat-dev] listening on http://127.0.0.1:${PORT}`);
});
