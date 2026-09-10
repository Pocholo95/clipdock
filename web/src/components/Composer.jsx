import { useRef, useState } from 'react';
import { api } from '../api.js';

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
      console.error(err);
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
      console.error(err);
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
        placeholder="Escribí texto, pegá un link, o arrastrá/pegá un archivo…"
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
          title="Adjuntar archivo"
        >
          📎
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
