import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { todayISO } from '../utils';
import { ErrorMsg, Field, Modal, OptionSelect } from './ui';

// Prise de rendez-vous : médecin -> date -> créneau libre -> motif.
// Le patient réserve pour lui-même ; l'administrateur choisit aussi le patient.
export default function BookingModal({ doctor, onClose, onBooked }) {
  const { user } = useAuth();
  const admin = user.role === 'ADMIN';
  const [doctorId, setDoctorId] = useState(doctor?.id ?? '');
  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSlot('');
    setSlots(null);
    if (!doctorId || !date) return;
    let alive = true;
    api.get(`/doctors/${doctorId}/slots`, { date })
      .then((s) => alive && setSlots(s))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [doctorId, date]);

  const submit = async (e) => {
    e.preventDefault();
    if (!slot) return setError('Choisissez un créneau horaire.');
    setBusy(true);
    setError('');
    try {
      await api.post('/appointments', {
        doctorId,
        patientId: admin ? patientId : undefined,
        startsAt: `${date}T${slot}:00`,
        reason,
      });
      onBooked();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Prendre rendez-vous" onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorMsg>{error}</ErrorMsg>
        {doctor ? (
          <p><strong>{doctor.name}</strong><br /><span className="muted">{doctor.specialty?.name}</span></p>
        ) : (
          <Field label="Médecin">
            <OptionSelect optionsPath="/doctors" value={doctorId} onChange={setDoctorId} required />
          </Field>
        )}
        {admin && (
          <Field label="Patient">
            <OptionSelect optionsPath="/patients" value={patientId} onChange={setPatientId} required />
          </Field>
        )}
        <Field label="Date">
          <input type="date" min={todayISO()} value={date} required onChange={(e) => setDate(e.target.value)} />
        </Field>
        {date && doctorId && (
          <div className="field">
            <span>Créneaux disponibles</span>
            {slots === null ? <span className="muted">Chargement…</span> : slots.length === 0 ? (
              <span className="muted">Aucun créneau libre ce jour-là. Essayez une autre date.</span>
            ) : (
              <div className="slots">
                {slots.map((s) => (
                  <button type="button" key={s} className={`chip ${slot === s ? 'on' : ''}`}
                    aria-pressed={slot === s} onClick={() => setSlot(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
        )}
        <Field label="Motif de la consultation">
          <textarea rows={3} value={reason} required maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={busy}>{busy ? 'Envoi…' : 'Demander le rendez-vous'}</button>
        </div>
      </form>
    </Modal>
  );
}
