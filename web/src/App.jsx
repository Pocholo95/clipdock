import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';
import { showToast } from './toast.js';
import DeviceSetup from './components/DeviceSetup.jsx';
import ChatFeed from './components/ChatFeed.jsx';
import Composer from './components/Composer.jsx';
import FilterBar from './components/FilterBar.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import AddDeviceModal from './components/AddDeviceModal.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import SelectionBar from './components/SelectionBar.jsx';

export default function App() {
  const [authStatus, setAuthStatus] = useState(null);
  const [device, setDevice] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [settings, setSettings] = useState({ defaultRetentionSeconds: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [connected, setConnected] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const wasConnected = useRef(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#pair=')) {
      const token = decodeURIComponent(hash.slice('#pair='.length));
      if (token) localStorage.setItem('clipboard_token', token);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    api.authStatus().then(setAuthStatus).catch(() => setAuthStatus({ authEnabled: false }));
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setDevice(null);
    }
    window.addEventListener('clipboard:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('clipboard:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (authStatus === null) return;
    const storedId = localStorage.getItem('clipboard_device_id');
    const storedName = localStorage.getItem('clipboard_device_name');
    const hasToken = !!localStorage.getItem('clipboard_token');
    if (storedId && storedName && (!authStatus.authEnabled || hasToken)) {
      setDevice({ id: storedId, name: storedName });
    }
  }, [authStatus]);

  useEffect(() => {
    if (!device) return;

    let active = true;
    api.getMessages().then((msgs) => active && setMessages(msgs));
    api.getSettings().then((s) => active && setSettings(s));

    const socket = connectSocket();

    socket.on('connect', () => {
      setConnected(true);
      if (!wasConnected.current) {
        showToast('Conexión restablecida', 'success');
      }
      wasConnected.current = true;
    });
    socket.on('disconnect', () => {
      setConnected(false);
      wasConnected.current = false;
      showToast('Se perdió la conexión, reconectando…', 'error');
    });

    socket.on('message:new', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    socket.on('message:updated', (msg) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });
    socket.on('message:deleted', ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
    socket.on('settings:updated', (s) => setSettings(s));

    return () => {
      active = false;
      disconnectSocket();
    };
  }, [device]);

  const handleChanged = useCallback((updated, deletedId) => {
    if (deletedId) {
      setMessages((prev) => prev.filter((m) => m.id !== deletedId));
    } else if (updated) {
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function cancelSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function bulkPin(pinned) {
    try {
      await api.bulkSetPinned([...selectedIds], pinned);
      cancelSelection();
    } catch {
      showToast('No se pudo actualizar los mensajes seleccionados', 'error');
    }
  }

  async function bulkDelete() {
    if (!window.confirm(`¿Eliminar ${selectedIds.size} mensaje${selectedIds.size === 1 ? '' : 's'}?`)) return;
    try {
      await api.bulkDelete([...selectedIds]);
      cancelSelection();
    } catch {
      showToast('No se pudo eliminar los mensajes seleccionados', 'error');
    }
  }

  if (authStatus === null) {
    return <div className="loading-screen">Cargando…</div>;
  }

  if (!device) {
    return (
      <>
        <DeviceSetup
          needsPassphrase={authStatus.authEnabled && !localStorage.getItem('clipboard_token')}
          onReady={(d) => setDevice({ id: d.id, name: d.name })}
        />
        <ToastContainer />
      </>
    );
  }

  const visibleMessages = filter === 'all' ? messages : messages.filter((m) => m.type === filter);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>Clipboard</h1>
          <div className="conn-indicator">
            <span className={`conn-dot ${connected ? '' : 'offline'}`} />
            {!connected && 'Reconectando…'}
          </div>
        </div>
        <span className="device-badge">{device.name}</span>
      </header>

      {selectionMode ? (
        <SelectionBar
          count={selectedIds.size}
          onPin={() => bulkPin(true)}
          onUnpin={() => bulkPin(false)}
          onDelete={bulkDelete}
          onCancel={cancelSelection}
        />
      ) : (
        <FilterBar
          value={filter}
          onChange={setFilter}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAddDevice={() => setShowAddDevice(true)}
          onEnterSelection={() => setSelectionMode(true)}
        />
      )}

      <ChatFeed
        messages={visibleMessages}
        currentDeviceId={device.id}
        defaultRetentionSeconds={settings.defaultRetentionSeconds}
        onChanged={handleChanged}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
      />

      <Composer deviceId={device.id} />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={setSettings}
        />
      )}

      {showAddDevice && <AddDeviceModal onClose={() => setShowAddDevice(false)} />}

      <ToastContainer />
    </div>
  );
}
