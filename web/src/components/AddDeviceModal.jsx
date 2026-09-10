import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function AddDeviceModal({ onClose }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [link, setLink] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('clipboard_token');
    const pairUrl = `${window.location.origin}${window.location.pathname}${
      token ? `#pair=${encodeURIComponent(token)}` : ''
    }`;
    setLink(pairUrl);
    QRCode.toDataURL(pairUrl, {
      margin: 2,
      width: 240,
      color: { dark: '#ece9f5', light: '#1e1a2b' },
    }).then(setDataUrl);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Agregar dispositivo</h2>
        <p className="modal-subtitle">
          Escanea este código desde la cámara del otro dispositivo para entrar directo, sin escribir la
          passphrase.
        </p>

        {dataUrl && <img src={dataUrl} alt="Código QR para agregar dispositivo" className="qr-image" />}

        <p className="qr-link">{link}</p>

        <button className="modal-close" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
