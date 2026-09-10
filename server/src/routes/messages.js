import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { nanoid } from 'nanoid';
import { db, UPLOADS_DIR } from '../db.js';

const URL_REGEX = /^https?:\/\/[^\s]+$/i;
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 200);

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname).slice(0, 20);
    cb(null, `${nanoid()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

function serializeMessage(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    type: row.type,
    content: row.content,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    pinned: !!row.pinned,
    customExpiresAt: row.custom_expires_at,
    fileUrl: row.file_path ? `/api/files/${row.id}` : null,
  };
}

const SELECT_WITH_DEVICE = `
  SELECT messages.*, devices.name AS device_name
  FROM messages
  JOIN devices ON devices.id = messages.device_id
`;

export function messagesRouter(io) {
  const router = express.Router();

  router.get('/messages', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const before = req.query.before ? Number(req.query.before) : Date.now() + 1;

    const rows = db
      .prepare(`${SELECT_WITH_DEVICE} WHERE messages.created_at < ? ORDER BY messages.created_at DESC LIMIT ?`)
      .all(before, limit);

    res.json(rows.map(serializeMessage).reverse());
  });

  router.get('/files/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
    if (!row || !row.file_path || !fs.existsSync(row.file_path)) {
      return res.status(404).end();
    }
    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.file_name || 'file')}"`);
    fs.createReadStream(row.file_path).pipe(res);
  });

  router.post('/messages', (req, res) => {
    const { deviceId, content } = req.body || {};
    if (!deviceId || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'deviceId and content are required' });
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
    if (!device) return res.status(404).json({ error: 'unknown device' });

    const trimmed = content.trim();
    const type = URL_REGEX.test(trimmed) ? 'link' : 'text';
    const id = nanoid();
    const createdAt = Date.now();

    db.prepare(
      `INSERT INTO messages (id, device_id, type, content, created_at, pinned)
       VALUES (?, ?, ?, ?, ?, 0)`
    ).run(id, deviceId, type, trimmed, createdAt);

    const row = db.prepare(`${SELECT_WITH_DEVICE} WHERE messages.id = ?`).get(id);
    const message = serializeMessage(row);
    io.emit('message:new', message);
    res.status(201).json(message);
  });

  router.post('/messages/upload', upload.single('file'), (req, res) => {
    const { deviceId } = req.body || {};
    const file = req.file;
    if (!deviceId || !file) {
      if (file) fs.unlink(file.path, () => {});
      return res.status(400).json({ error: 'deviceId and file are required' });
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
    if (!device) {
      fs.unlink(file.path, () => {});
      return res.status(404).json({ error: 'unknown device' });
    }

    const type = file.mimetype.startsWith('image/') ? 'image' : 'file';
    const id = nanoid();
    const createdAt = Date.now();

    db.prepare(
      `INSERT INTO messages (id, device_id, type, file_name, file_path, mime_type, size_bytes, created_at, pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(id, deviceId, type, file.originalname, file.path, file.mimetype, file.size, createdAt);

    const row = db.prepare(`${SELECT_WITH_DEVICE} WHERE messages.id = ?`).get(id);
    const message = serializeMessage(row);
    io.emit('message:new', message);
    res.status(201).json(message);
  });

  // Registered before /messages/:id so "bulk" isn't swallowed as an :id param.
  router.patch('/messages/bulk', (req, res) => {
    const { ids, pinned } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || typeof pinned !== 'boolean') {
      return res.status(400).json({ error: 'ids and pinned are required' });
    }

    const updated = [];
    for (const id of ids) {
      const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
      if (!row) continue;
      db.prepare('UPDATE messages SET pinned = ? WHERE id = ?').run(pinned ? 1 : 0, id);
      const fresh = db.prepare(`${SELECT_WITH_DEVICE} WHERE messages.id = ?`).get(id);
      const message = serializeMessage(fresh);
      updated.push(message);
      io.emit('message:updated', message);
    }

    res.json(updated);
  });

  router.delete('/messages/bulk', (req, res) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'ids are required' });
    }

    let deletedCount = 0;
    for (const id of ids) {
      const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
      if (!row) continue;
      if (row.file_path) fs.unlink(row.file_path, () => {});
      db.prepare('DELETE FROM messages WHERE id = ?').run(id);
      io.emit('message:deleted', { id });
      deletedCount++;
    }

    res.json({ deletedCount });
  });

  router.patch('/messages/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });

    const { pinned, customExpiresAt } = req.body || {};

    if (typeof pinned === 'boolean') {
      db.prepare('UPDATE messages SET pinned = ? WHERE id = ?').run(pinned ? 1 : 0, row.id);
    }

    if (customExpiresAt !== undefined) {
      const value = customExpiresAt === null ? null : Number(customExpiresAt);
      db.prepare('UPDATE messages SET custom_expires_at = ? WHERE id = ?').run(value, row.id);
    }

    const updated = db.prepare(`${SELECT_WITH_DEVICE} WHERE messages.id = ?`).get(row.id);
    const message = serializeMessage(updated);
    io.emit('message:updated', message);
    res.json(message);
  });

  router.delete('/messages/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });

    if (row.file_path) {
      fs.unlink(row.file_path, () => {});
    }
    db.prepare('DELETE FROM messages WHERE id = ?').run(row.id);
    io.emit('message:deleted', { id: row.id });
    res.status(204).end();
  });

  return router;
}
