import { useState } from 'react';
import { useDebounce, useList } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { STATUS_LABEL, fmtDateTime } from '../utils';
import AppointmentActions from '../components/AppointmentActions';
import BookingModal from '../components/BookingModal';
import { ErrorMsg, Loading, OptionSelect, Pagination, StatusBadge } from '../components/ui';

const STATUS_OPTIONS = Object.entries(STATUS_LABEL).map(([id, name]) => ({ id, name }));

export default function Appointments() {
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const list = useList('/appointments', { status, from, search: q, sort: 'startsAt' });
  const [booking, setBooking] = useState(false);
  const { role } = user;

  return (
    <>
      <div className="page-head">
        <h1>{role === 'PATIENT' ? 'Mes rendez-vous' : 'Rendez-vous'}</h1>
        {role === 'ADMIN' && <button className="btn" onClick={() => setBooking(true)}>Nouveau rendez-vous</button>}
      </div>

      <div className="toolbar">
        {role !== 'PATIENT' && (
          <input type="search" placeholder={role === 'ADMIN' ? 'Patient ou médecin' : 'Nom du patient'}
            aria-label="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        )}
        <div>
          <OptionSelect options={STATUS_OPTIONS} placeholder="Tous les statuts" value={status} onChange={setStatus} />
        </div>
        <input type="date" aria-label="À partir du" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>

      <ErrorMsg>{list.error}</ErrorMsg>
      <div className="panel">
        {list.loading && !list.items.length ? <Loading /> : !list.items.length ? (
          <div className="state">Aucun rendez-vous pour ces critères.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {role !== 'DOCTOR' && <th>Médecin</th>}
                  {role !== 'PATIENT' && <th>Patient</th>}
                  <th>Motif</th><th>Statut</th><th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDateTime(a.startsAt)}</td>
                    {role !== 'DOCTOR' && <td>{a.doctor?.name}<br /><span className="muted">{a.doctor?.specialty?.name}</span></td>}
                    {role !== 'PATIENT' && <td>{a.patient?.name}</td>}
                    <td>{a.reason}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td><AppointmentActions a={a} onChange={list.reload} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={list.page} size={list.size} total={list.total} onChange={list.setPage} />
      </div>

      {booking && <BookingModal onClose={() => setBooking(false)} onBooked={() => { setBooking(false); list.reload(); }} />}
    </>
  );
}
