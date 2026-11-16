import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { STATUS_LABEL } from '../utils';

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="icon" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Pagination({ page, size, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pager">
      <span>{total} résultat{total > 1 ? 's' : ''}</span>
      <div>
        <button className="btn sm ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>Précédent</button>
        <span>Page {page} sur {pages}</span>
        <button className="btn sm ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>Suivant</button>
      </div>
    </div>
  );
}

export const StatusBadge = ({ status }) => (
  <span className={`badge ${status}`}>{STATUS_LABEL[status] || status}</span>
);

export const Loading = () => <div className="state">Chargement…</div>;
export const ErrorMsg = ({ children }) => (children ? <p className="error" role="alert">{children}</p> : null);

// Liste déroulante : options statiques ou chargées depuis l'API ({id, name})
export function OptionSelect({ options, optionsPath, value, onChange, placeholder, required, id }) {
  const [opts, setOpts] = useState(options || []);
  useEffect(() => {
    if (!optionsPath) return;
    api.get(optionsPath, { size: 100 }).then((d) => setOpts(d.items)).catch(() => {});
  }, [optionsPath]);
  return (
    <select id={id} value={value ?? ''} required={required} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder || 'Choisir…'}</option>
      {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

// Étoiles en lecture seule, remplies à hauteur de la note (4,2 -> 84 %)
export function Stars({ value = 0, label }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="stars" role="img" aria-label={label || `${v} sur 5`} style={{ '--pct': `${Math.round((v / 5) * 1000) / 10}%` }}>
      ★★★★★
    </span>
  );
}

// Saisie d'une note de 1 à 5
export function RatingInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="rating-input" role="radiogroup" aria-label="Note" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} role="radio" aria-checked={value === n} aria-label={`${n} sur 5`}
          className={n <= shown ? 'on' : ''} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}
