import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';

export default function ChatFeed({ messages, currentDeviceId, onChanged }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  return (
    <div className="chat-feed">
      {messages.length === 0 && <p className="chat-empty">No hay mensajes todavía. Mandá algo 👋</p>}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.deviceId === currentDeviceId}
          onChanged={onChanged}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
