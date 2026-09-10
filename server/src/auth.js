import crypto from 'node:crypto';
import { db } from './db.js';

export const AUTH_ENABLED = String(process.env.AUTH_ENABLED || 'false').toLowerCase() === 'true';
const PASSPHRASE = process.env.AUTH_PASSPHRASE || '';

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function login(passphrase) {
  if (!AUTH_ENABLED) return null;
  if (typeof passphrase !== 'string' || !timingSafeEqual(passphrase, PASSPHRASE)) {
    return false;
  }
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, created_at) VALUES (?, ?)').run(token, Date.now());
  return token;
}

export function isValidToken(token) {
  if (!AUTH_ENABLED) return true;
  if (!token) return false;
  const row = db.prepare('SELECT 1 FROM sessions WHERE token = ?').get(token);
  return !!row;
}

export function httpAuthMiddleware(req, res, next) {
  if (!AUTH_ENABLED) return next();
  // Query param fallback covers <img>/<a> requests (e.g. GET /files/:id) that can't set custom headers.
  const token = req.header('X-Clipboard-Token') || req.query.token;
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

export function socketAuthMiddleware(socket, next) {
  if (!AUTH_ENABLED) return next();
  const token = socket.handshake.auth?.token;
  if (!isValidToken(token)) {
    return next(new Error('unauthorized'));
  }
  next();
}
