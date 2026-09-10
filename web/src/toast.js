let counter = 0;

export function showToast(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('clipboard:toast', { detail: { id: ++counter, message, type } }));
}
