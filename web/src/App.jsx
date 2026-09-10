import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import { connectSocket, disconnectSocket } from './socket.js';
import DeviceSetup from './components/DeviceSetup.jsx';
import ChatFeed from './components/ChatFeed.jsx';
import Composer from './components/Composer.jsx';
import FilterBar from './components/FilterBar.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';

export default function App() {
  const [authStatus, setAuthStatus] = useState(null);
  const [device, setDevice] = useState(null);
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [settings, setSettings] = useState({ defaultRetentionSeconds: 0 });
  const [showSettings, setShowSettings] = useState(false);

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
    socket.on('message:new', (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    socket.on('message:updated', (msg) => {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    });
    socket.on('message:deleted', ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
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

  if (authStatus === null) {
    return <div className="loading-screen">Cargando…</div>;
  }

  if (!device) {
    return (
      <DeviceSetup
        needsPassphrase={authStatus.authEnabled && !localStorage.getItem('clipboard_token')}
        onReady={(d) => setDevice({ id: d.id, name: d.name })}
      />
    );
  }

  const visibleMessages = filter === 'all' ? messages : messages.filter((m) => m.type === filter);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Clipboard</h1>
        <span className="device-badge">{device.name}</span>
      </header>

      <FilterBar value={filter} onChange={setFilter} onOpenSettings={() => setShowSettings(true)} />

      <ChatFeed messages={visibleMessages} currentDeviceId={device.id} onChanged={handleChanged} />

      <Composer deviceId={device.id} />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSaved={setSettings}
        />
      )}
    </div>
  );
}
