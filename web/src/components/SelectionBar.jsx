export default function SelectionBar({ count, onPin, onUnpin, onDelete, onCancel }) {
  return (
    <div className="selection-bar">
      <button className="icon-trigger" onClick={onCancel} title="Cancelar selección">
        ✕
      </button>
      <span className="selection-count">{count} seleccionado{count === 1 ? '' : 's'}</span>
      <div className="selection-actions">
        <button onClick={onPin} disabled={!count}>
          📌 Fijar
        </button>
        <button onClick={onUnpin} disabled={!count}>
          📌 Desfijar
        </button>
        <button className="danger" onClick={onDelete} disabled={!count}>
          🗑 Eliminar
        </button>
      </div>
    </div>
  );
}
