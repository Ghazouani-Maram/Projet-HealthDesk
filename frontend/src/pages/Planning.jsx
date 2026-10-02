import { useList } from '../api/hooks';
import { todayISO } from '../utils';
import AppointmentActions from '../components/AppointmentActions';
import { ErrorMsg, Loading, StatusBadge } from '../components/ui';

// Planning du médecin : 7 prochains jours, regroupé par jour
export default function Planning() {
  const list = useList('/appointments', { from: todayISO(), to: todayISO(7), sort: 'startsAt' }, 100);
  const items = list.items.filter((a) => a.status !== 'CANCELLED');
  const days = items.reduce((acc, a) => {
    const day = a.startsAt.slice(0, 10);
    (acc[day] ||= []).push(a);
    return acc;
  }, {});

  return (
    <>
      <div className="page-head">
        <div><h1>Mon planning</h1><p className="muted">Vos rendez-vous des 7 prochains jours.</p></div>
      </div>
      <ErrorMsg>{list.error}</ErrorMsg>
      {list.loading && !items.length ? <Loading /> : !items.length ? (
        <div className="panel"><div className="state">Aucun rendez-vous prévu cette semaine.</div></div>
      ) : (
        Object.entries(days).map(([day, appts]) => (
          <section className="day" key={day}>
            <h2>{new Date(`${day}T00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            {appts.map((a) => (
              <div className="slot-row" key={a.id}>
                <time>{new Date(a.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>
                <div><strong>{a.patient?.name}</strong><br /><span className="muted">{a.reason}</span></div>
                <StatusBadge status={a.status} />
                <AppointmentActions a={a} onChange={list.reload} />
              </div>
            ))}
          </section>
        ))
      )}
    </>
  );
}
