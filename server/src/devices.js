import { nanoid } from 'nanoid';
import { db } from './db.js';

export function upsertDevice({ id, name }) {
  const now = Date.now();
  const existing = id ? db.prepare('SELECT * FROM devices WHERE id = ?').get(id) : null;

  if (existing) {
    db.prepare('UPDATE devices SET name = ?, last_seen = ? WHERE id = ?').run(name, now, id);
    return { id, name, created_at: existing.created_at, last_seen: now };
  }

  const newId = nanoid();
  db.prepare(
    'INSERT INTO devices (id, name, created_at, last_seen) VALUES (?, ?, ?, ?)'
  ).run(newId, name, now, now);
  return { id: newId, name, created_at: now, last_seen: now };
}

export function getDevice(id) {
  return db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
}
