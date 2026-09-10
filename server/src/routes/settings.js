import express from 'express';
import { db } from '../db.js';

export function settingsRouter(io) {
  const router = express.Router();

  router.get('/settings', (_req, res) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'default_retention_seconds'").get();
    res.json({ defaultRetentionSeconds: Number(row?.value ?? 0) });
  });

  router.put('/settings', (req, res) => {
    const { defaultRetentionSeconds } = req.body || {};
    const value = Math.max(0, Number(defaultRetentionSeconds) || 0);

    db.prepare(
      `INSERT INTO settings (key, value) VALUES ('default_retention_seconds', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(String(value));

    io.emit('settings:updated', { defaultRetentionSeconds: value });
    res.json({ defaultRetentionSeconds: value });
  });

  return router;
}
