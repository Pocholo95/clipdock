import { useRef, useState } from 'react';
import { api } from '../api.js';
import { showToast } from '../toast.js';

export default function Composer({ deviceId }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  async function sendText() {
    const content = text.trim();
    if (!content) return;
    setText('');
    try {
      await api.sendText(deviceId, content);
    } catch (err) {
      setText(content);
      showToast('No se pudo enviar el mensaje', 'error');
    }
  }

  async function sendFiles(files) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of files) {
        await api.uploadFile(deviceId, file);
      }
    } catch (err) {
      showToast(`No se pudo subir el archivo: ${err.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  function handlePaste(e) {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.length) {
      e.preventDefault();
      sendFiles(files);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    sendFiles(Array.from(e.dataTransfer.files || []));
  }

  return (
    <div
      className={`composer ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <textarea
        placeholder="Escribe texto, pega un link, o arrastra/pega un archivo…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        rows={2}
      />
      <div className="composer-actions">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          title={busy ? 'Subiendo…' : 'Adjuntar archivo'}
        >
          {busy ? '⏳' : '📎'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => sendFiles(Array.from(e.target.files || []))}
        />
        <button type="button" onClick={sendText} disabled={!text.trim()}>
          Enviar
        </button>
      </div>
    </div>
  );
}
