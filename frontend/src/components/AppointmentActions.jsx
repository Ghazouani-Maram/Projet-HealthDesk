import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

// Actions possibles sur un rendez-vous selon le rôle (les droits sont revérifiés côté backend).
export default function AppointmentActions({ a, onChange }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const isPatient = user.role === 'PATIENT';

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      onChange();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };
  const setStatus = (status, label, cls) => (
    <button key={status} className={`btn sm ${cls}`} disabled={busy}
      onClick={() => run(() => api.patch(`/appointments/${a.id}/status`, { status }))}>{label}</button>
  );

  const open = a.status === 'PENDING' || a.status === 'CONFIRMED';
  const buttons = [];
  if (!isPatient && a.status === 'PENDING') buttons.push(setStatus('CONFIRMED', 'Confirmer', ''));
  if (!isPatient && a.status === 'CONFIRMED') buttons.push(setStatus('DONE', 'Terminer', ''));
  if (open) buttons.push(setStatus('CANCELLED', isPatient || a.status === 'CONFIRMED' ? 'Annuler' : 'Refuser', 'danger'));
  if (user.role === 'ADMIN')
    buttons.push(
      <button key="del" className="btn sm ghost" disabled={busy} onClick={() => {
        if (window.confirm('Supprimer ce rendez-vous ?')) run(() => api.del(`/appointments/${a.id}`));
      }}>Supprimer</button>
    );
  return <div className="actions">{buttons}</div>;
}
