const FILTERS = [
  { value: 'all', label: 'Todo' },
  { value: 'text', label: 'Texto' },
  { value: 'link', label: 'Links' },
  { value: 'file', label: 'Archivos' },
  { value: 'image', label: 'Fotos' },
];

export default function FilterBar({ value, onChange, onOpenSettings, onOpenAddDevice, onEnterSelection }) {
  return (
    <div className="filter-bar">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          className={value === f.value ? 'active' : ''}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </button>
      ))}
      <button className="icon-trigger icon-trigger-first" onClick={onEnterSelection} title="Seleccionar varios">
        ☑️
      </button>
      <button className="icon-trigger" onClick={onOpenAddDevice} title="Agregar dispositivo">
        📱
      </button>
      <button className="icon-trigger" onClick={onOpenSettings} title="Configuración">
        ⚙️
      </button>
    </div>
  );
}
