import { showToast } from './toast.js';

function authHeaders() {
  const token = localStorage.getItem('clipboard_token');
  return token ? { 'X-Clipboard-Token': token } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('clipboard_token');
    window.dispatchEvent(new Event('clipboard:unauthorized'));
    if (path !== '/login') {
      showToast('Tu sesión expiró, inicia sesión de nuevo', 'error');
    }
    throw new Error('unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export function fileUrlWithToken(url) {
  if (!url) return url;
  const token = localStorage.getItem('clipboard_token');
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export const api = {
  authStatus: () => request('/auth/status'),
  login: (passphrase) => request('/login', { method: 'POST', body: JSON.stringify({ passphrase }) }),
  registerDevice: (id, name) => request('/devices', { method: 'POST', body: JSON.stringify({ id, name }) }),
  getMessages: (before) => request(`/messages${before ? `?before=${before}` : ''}`),
  sendText: (deviceId, content) => request('/messages', { method: 'POST', body: JSON.stringify({ deviceId, content }) }),
  uploadFile: (deviceId, file) => {
    const form = new FormData();
    form.append('deviceId', deviceId);
    form.append('file', file);
    return request('/messages/upload', { method: 'POST', body: form });
  },
  patchMessage: (id, patch) => request(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteMessage: (id) => request(`/messages/${id}`, { method: 'DELETE' }),
  getSettings: () => request('/settings'),
  putSettings: (defaultRetentionSeconds) =>
    request('/settings', { method: 'PUT', body: JSON.stringify({ defaultRetentionSeconds }) }),
};
