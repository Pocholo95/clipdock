import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUTH_ENABLED, login, httpAuthMiddleware, socketAuthMiddleware } from './auth.js';
import { messagesRouter } from './routes/messages.js';
import { settingsRouter } from './routes/settings.js';
import { devicesRouter } from './routes/devices.js';
import { startCleanupJob } from './cleanup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const WEB_DIST = process.env.WEB_DIST || path.join(__dirname, '..', 'web-dist');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.get('/api/auth/status', (_req, res) => {
  res.json({ authEnabled: AUTH_ENABLED });
});

app.post('/api/login', (req, res) => {
  const result = login(req.body?.passphrase);
  if (result === null) return res.json({ authEnabled: false });
  if (result === false) return res.status(401).json({ error: 'invalid passphrase' });
  res.json({ token: result });
});

app.use('/api', httpAuthMiddleware, devicesRouter());
app.use('/api', httpAuthMiddleware, messagesRouter(io));
app.use('/api', httpAuthMiddleware, settingsRouter(io));

app.use(express.static(WEB_DIST));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(WEB_DIST, 'index.html'));
});

io.use(socketAuthMiddleware);
io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

startCleanupJob(io);

httpServer.listen(PORT, () => {
  console.log(`clipboard server listening on :${PORT}`);
});
