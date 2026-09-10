import { useState } from 'react';
import { api } from '../api.js';
import { showToast } from '../toast.js';

const PRESETS = [
  { label: 'Nunca limpiar', seconds: 0 },
  { label: 'Cada hora', seconds: 60 * 60 },
  { label: 'Cada día', seconds: 24 * 60 * 60 },
  { label: 'Cada semana', seconds: 7 * 24 * 60 * 60 },
];

export default function SettingsPanel({ settings, onClose, onSaved }) {
  const [customHours, setCustomHours] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(seconds) {
    setSaving(true);
    try {
      const updated = await api.putSettings(seconds);
      onSaved(updated);
    } catch {
      showToast('No se pudo guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Limpieza automática</h2>
        <p className="modal-subtitle">
          Retención actual:{' '}
          <strong>
            {settings.defaultRetentionSeconds === 0
              ? 'nunca se limpia'
              : `${Math.round(settings.defaultRetentionSeconds / 3600)} h`}
          </strong>
          . Los mensajes fijados y los que tengan una limpieza personalizada no se ven afectados.
        </p>

        <div className="preset-list">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              disabled={saving}
              className={settings.defaultRetentionSeconds === p.seconds ? 'active' : ''}
              onClick={() => save(p.seconds)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="custom-retention">
          <input
            type="number"
            min="1"
            placeholder="Horas personalizadas"
            value={customHours}
            onChange={(e) => setCustomHours(e.target.value)}
          />
          <button
            disabled={saving || !customHours}
            onClick={() => save(Number(customHours) * 3600)}
          >
            Aplicar
          </button>
        </div>

        <button className="modal-close" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
