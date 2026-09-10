import { useState } from 'react';
import { api, fileUrlWithToken } from '../api.js';

const EXPIRY_OPTIONS = [
  { label: 'Usar retención global', value: 'default' },
  { label: 'Borrar en 10 min', value: 10 * 60 * 1000 },
  { label: 'Borrar en 1 hora', value: 60 * 60 * 1000 },
  { label: 'Borrar en 1 día', value: 24 * 60 * 60 * 1000 },
  { label: 'Nunca borrar', value: 'never' },
];

function formatTime(ts) {
  return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageBubble({ message, isOwn, onChanged }) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function togglePin() {
    const updated = await api.patchMessage(message.id, { pinned: !message.pinned });
    onChanged(updated);
  }

  async function setExpiry(option) {
    setMenuOpen(false);
    const customExpiresAt = option === 'default' ? null : option === 'never' ? 0 : Date.now() + option;
    const updated = await api.patchMessage(message.id, { customExpiresAt });
    onChanged(updated);
  }

  async function remove() {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    await api.deleteMessage(message.id);
    onChanged(null, message.id);
  }

  return (
    <div className={`bubble-row ${isOwn ? 'own' : ''}`}>
      <div className="bubble">
        <div className="bubble-header">
          <span className="bubble-device">{message.deviceName}</span>
          <span className="bubble-time">{formatTime(message.createdAt)}</span>
          {message.pinned && <span className="pin-badge" title="Fijado">📌</span>}
        </div>

        <div className="bubble-content">
          {message.type === 'text' && <p>{message.content}</p>}
          {message.type === 'link' && (
            <a href={message.content} target="_blank" rel="noopener noreferrer">
              {message.content}
            </a>
          )}
          {message.type === 'image' && (
            <a href={fileUrlWithToken(message.fileUrl)} target="_blank" rel="noopener noreferrer">
              <img src={fileUrlWithToken(message.fileUrl)} alt={message.fileName} className="bubble-image" />
            </a>
          )}
          {message.type === 'file' && (
            <a href={fileUrlWithToken(message.fileUrl)} download={message.fileName} className="bubble-file">
              📄 {message.fileName} <span className="bubble-filesize">{formatSize(message.sizeBytes)}</span>
            </a>
          )}
        </div>

        <div className="bubble-actions">
          <button onClick={togglePin} title={message.pinned ? 'Desfijar' : 'Fijar'}>
            {message.pinned ? 'Desfijar' : 'Fijar'}
          </button>
          <div className="expiry-menu">
            <button onClick={() => setMenuOpen((v) => !v)}>Limpiar…</button>
            {menuOpen && (
              <div className="expiry-dropdown">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button key={opt.label} onClick={() => setExpiry(opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={remove} className="danger" title="Eliminar">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
