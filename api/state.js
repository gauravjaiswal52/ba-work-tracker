// api/state.js
//
// Single endpoint that stores and retrieves the entire tracker state as one
// JSON blob in Upstash Redis (installed via the Vercel Marketplace).
//
// GET  /api/state   -> returns the saved state (or null if nothing saved yet)
// POST /api/state   -> saves the state given in the request body
//
// CONCURRENCY SAFETY: multiple people can have this app open at once, each
// holding their own in-browser copy of the state. Without a check, whoever
// saves last would silently overwrite everyone else's changes with their
// own (possibly stale) copy - including changes made after they loaded the
// page. To prevent this, every save must include the __expectedVersion it
// was loaded from. If someone else has saved in the meantime, the version
// won't match and the save is rejected (409) instead of silently clobbering
// data - the client then reloads the latest state and asks the user to
// redo their change.
//
// Requires these environment variables (auto-added by Vercel once you
// install the Upstash integration from the Marketplace and connect it to
// this project; see README.md):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const STORE_KEY = 'ba-tracker-state-v1';

function parseStored(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = parseStored(await redis.get(STORE_KEY));
      res.status(200).json(data);
      return;
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Expected a JSON object body' });
        return;
      }

      const expectedVersion = typeof body.__expectedVersion === 'number' ? body.__expectedVersion : null;
      const current = parseStored(await redis.get(STORE_KEY));
      const currentVersion = current && typeof current.__version === 'number' ? current.__version : 0;

      if (expectedVersion !== null && expectedVersion !== currentVersion) {
        res.status(409).json({
          error: 'Someone else saved changes since you loaded this page. Refresh and try again.',
          currentVersion,
        });
        return;
      }

      const toSave = Object.assign({}, body);
      delete toSave.__expectedVersion;
      toSave.__version = currentVersion + 1;

      await redis.set(STORE_KEY, JSON.stringify(toSave));
      res.status(200).json({ ok: true, version: toSave.__version });
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
