import fs from 'node:fs';
import { db } from './db.js';

function getDefaultRetentionSeconds() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'default_retention_seconds'").get();
  return Number(row?.value ?? 0);
}

function sweep(io) {
  const defaultRetentionSeconds = getDefaultRetentionSeconds();
  const now = Date.now();

  const candidates = db.prepare('SELECT * FROM messages WHERE pinned = 0').all();

  for (const row of candidates) {
    let expiresAt;
    if (row.custom_expires_at === null || row.custom_expires_at === undefined) {
      expiresAt = defaultRetentionSeconds > 0 ? row.created_at + defaultRetentionSeconds * 1000 : 0;
    } else {
      expiresAt = row.custom_expires_at;
    }

    if (expiresAt > 0 && expiresAt <= now) {
      if (row.file_path) fs.unlink(row.file_path, () => {});
      db.prepare('DELETE FROM messages WHERE id = ?').run(row.id);
      io.emit('message:deleted', { id: row.id });
    }
  }
}

export function startCleanupJob(io, intervalMs = 60_000) {
  const timer = setInterval(() => sweep(io), intervalMs);
  sweep(io);
  return timer;
}
