import { useEffect, useRef, useState } from 'react';
import { api, fileUrlWithToken } from '../api.js';
import { showToast } from '../toast.js';

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

function formatCountdown(ms) {
  if (ms <= 0) return 'en instantes';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'en instantes';
  if (minutes < 60) return `en ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `en ${hours} h`;
  const days = Math.round(hours / 24);
  return `en ${days} d`;
}

function getExpiryLabel(message, defaultRetentionSeconds) {
  if (message.pinned) return null;
  if (message.customExpiresAt === 0) return 'No se borra';

  const effectiveExpiresAt =
    message.customExpiresAt != null ? message.customExpiresAt : defaultRetentionSeconds > 0 ? message.createdAt + defaultRetentionSeconds * 1000 : null;

  if (!effectiveExpiresAt) return null;
  return `Se borra ${formatCountdown(effectiveExpiresAt - Date.now())}`;
}

export default function MessageBubble({
  message,
  isOwn,
  defaultRetentionSeconds,
  onChanged,
  selectionMode,
  selected,
  onToggleSelect,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  async function togglePin() {
    setMenuOpen(false);
    try {
      const updated = await api.patchMessage(message.id, { pinned: !message.pinned });
      onChanged(updated);
    } catch {
      showToast('No se pudo actualizar el mensaje', 'error');
    }
  }

  async function setExpiry(option) {
    setMenuOpen(false);
    const customExpiresAt = option === 'default' ? null : option === 'never' ? 0 : Date.now() + option;
    try {
      const updated = await api.patchMessage(message.id, { customExpiresAt });
      onChanged(updated);
    } catch {
      showToast('No se pudo actualizar la limpieza del mensaje', 'error');
    }
  }

  async function remove() {
    setMenuOpen(false);
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    try {
      await api.deleteMessage(message.id);
      onChanged(null, message.id);
    } catch {
      showToast('No se pudo eliminar el mensaje', 'error');
    }
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('No se pudo copiar', 'error');
    }
  }

  const expiryLabel = getExpiryLabel(message, defaultRetentionSeconds);

  return (
    <div className={`bubble-row ${isOwn ? 'own' : ''}`}>
      <div className={`bubble ${selected ? 'selected' : ''}`}>
        <div
          className="bubble-header"
          onClick={selectionMode ? () => onToggleSelect(message.id) : undefined}
        >
          {selectionMode && (
            <input
              type="checkbox"
              className="bubble-checkbox"
              checked={!!selected}
              onChange={() => onToggleSelect(message.id)}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <span className="bubble-device">{message.deviceName}</span>
          <span className="bubble-time">{formatTime(message.createdAt)}</span>
          {message.pinned && <span className="pin-badge" title="Fijado">📌</span>}

          {!selectionMode && (
            <div className="bubble-menu" ref={menuRef}>
              <button className="menu-trigger" onClick={() => setMenuOpen((v) => !v)} title="Opciones">
                ⋮
              </button>
              {menuOpen && (
                <div className="menu-dropdown">
                  <button onClick={togglePin}>{message.pinned ? '📌 Desfijar' : '📌 Fijar'}</button>
                  <div className="menu-separator" />
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button key={opt.label} onClick={() => setExpiry(opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                  <div className="menu-separator" />
                  <button className="danger" onClick={remove}>
                    🗑 Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
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

        <div className="bubble-footer">
          {(message.type === 'text' || message.type === 'link') && (
            <button className="copy-btn" onClick={copyContent} title="Copiar al portapapeles">
              {copied ? '✅ Copiado' : '📋 Copiar'}
            </button>
          )}
          {expiryLabel && <span className="expiry-badge">{expiryLabel}</span>}
        </div>
      </div>
    </div>
  );
}
