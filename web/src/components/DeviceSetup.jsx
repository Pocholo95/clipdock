import { useState } from 'react';
import { api } from '../api.js';

export default function DeviceSetup({ needsPassphrase, onReady }) {
  const [passphrase, setPassphrase] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Elige un nombre para este dispositivo');
      return;
    }

    setBusy(true);
    setError('');
    try {
      if (needsPassphrase) {
        const result = await api.login(passphrase);
        if (!result?.token) throw new Error('login failed');
        localStorage.setItem('clipboard_token', result.token);
      }

      const existingId = localStorage.getItem('clipboard_device_id') || undefined;
      const device = await api.registerDevice(existingId, name.trim());
      localStorage.setItem('clipboard_device_id', device.id);
      localStorage.setItem('clipboard_device_name', device.name);
      onReady(device);
    } catch (err) {
      setError(needsPassphrase ? 'Passphrase incorrecta' : 'No se pudo continuar, intenta de nuevo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="setup-screen">
      <form className="setup-card" onSubmit={handleSubmit}>
        <h1>Clipboard</h1>
        <p className="setup-subtitle">Configura este dispositivo para empezar</p>

        {needsPassphrase && (
          <label className="field">
            Passphrase
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoFocus
            />
          </label>
        )}

        <label className="field">
          Nombre de este dispositivo
          <input
            type="text"
            placeholder="ej. laptop, celular, pc-oficina"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </label>

        {error && <p className="setup-error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
