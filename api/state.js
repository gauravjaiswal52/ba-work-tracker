// api/state.js
//
// Single endpoint that stores and retrieves the entire tracker state as one
// JSON blob in Upstash Redis (installed via the Vercel Marketplace - this
// is the same underlying database the old "Vercel KV" product used to run
// on, before Vercel discontinued it as a first-party product).
//
// GET  /api/state   -> returns the saved state (or null if nothing saved yet)
// POST /api/state   -> saves the state given in the request body
//
// Requires these environment variables (auto-added by Vercel once you
// install the Upstash integration from the Marketplace and connect it to
// this project; see README.md):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const STORE_KEY = 'ba-tracker-state-v1';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const raw = await redis.get(STORE_KEY);
      // Stored as a JSON string; parse it back into an object for the client.
      const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      const body = req.body; // Vercel parses JSON bodies automatically
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Expected a JSON object body' });
        return;
      }
      await redis.set(STORE_KEY, JSON.stringify(body));
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('api/state error:', err);
    res.status(500).json({
      error: 'Server error talking to storage. Check your UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN environment variables in Vercel project settings.',
      detail: String((err && err.message) || err),
    });
  }
}
