// Vercel Node Serverless function (JS version)
// POST /api/pipecat/start -> returns { url, token } for Daily WebRTC

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    PIPECATCLOUD_PRIVATE_KEY = '',
    PIPECATCLOUD_PUBLIC_KEY = '',
    PIPECATCLOUD_START_URL = '',
  } = process.env;

  if (!PIPECATCLOUD_PRIVATE_KEY || !PIPECATCLOUD_START_URL) {
    const missing = [];
    if (!PIPECATCLOUD_START_URL) missing.push('PIPECATCLOUD_START_URL');
    if (!PIPECATCLOUD_PRIVATE_KEY) missing.push('PIPECATCLOUD_PRIVATE_KEY');
    return res.status(500).json({ error: 'Pipecat Cloud env not configured', missing });
  }

  try {
    let body = {};
    try {
      body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');
    } catch {}

    const payload = {
      mode: body.mode || 'voice',
      template: body.template || '',
      language: body.language || 'en',
      metadata: body.metadata || {},
    };

    const r = await fetch(PIPECATCLOUD_START_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PIPECATCLOUD_PRIVATE_KEY}`,
        ...(PIPECATCLOUD_PUBLIC_KEY ? { 'x-public-key': PIPECATCLOUD_PUBLIC_KEY } : {}),
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}
    if (!r.ok) {
      return res.status(r.status).json({ error: data?.error || text || 'Pipecat Cloud start failed' });
    }

    const url = data?.url || data?.room_url || data?.room?.url;
    const token = data?.token || data?.auth?.token || data?.daily?.token;
    if (!url || !token) {
      return res.status(502).json({ error: 'Invalid start response: missing url/token', raw: data });
    }

    return res.status(200).json({ url, token });
  } catch (e) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
};
