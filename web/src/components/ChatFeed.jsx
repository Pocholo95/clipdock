import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';

export default function ChatFeed({
  messages,
  currentDeviceId,
  defaultRetentionSeconds,
  onChanged,
  selectionMode,
  selectedIds,
  onToggleSelect,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  return (
    <div className="chat-feed">
      {messages.length === 0 && <p className="chat-empty">No hay mensajes todavía. Envía algo 👋</p>}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.deviceId === currentDeviceId}
          defaultRetentionSeconds={defaultRetentionSeconds}
          onChanged={onChanged}
          selectionMode={selectionMode}
          selected={selectedIds?.has(message.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
