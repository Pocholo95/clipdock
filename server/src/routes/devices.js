import express from 'express';
import { upsertDevice } from '../devices.js';

export function devicesRouter() {
  const router = express.Router();

  router.post('/devices', (req, res) => {
    const { id, name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const device = upsertDevice({ id, name: name.trim().slice(0, 60) });
    res.json({ id: device.id, name: device.name });
  });

  return router;
}
