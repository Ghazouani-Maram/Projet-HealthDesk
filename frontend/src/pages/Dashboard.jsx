import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { STATUS_LABEL } from '../utils';
import { ErrorMsg, Loading } from '../components/ui';

function Bars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return data.map((d) => (
    <div className="bar" key={d.label}>
      <span>{d.label}</span>
      <i style={{ width: `${(d.value / max) * 100}%` }} />
      <b>{d.value}</b>
    </div>
  ));
}

// Tableau de bord administrateur (EF-06)
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/stats').then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!stats) return <Loading />;

  const counters = [
    ['Patients', stats.patients], ['Médecins', stats.doctors], ['Spécialités', stats.specialties],
    ["Rendez-vous aujourd'hui", stats.appointmentsToday],
  ];
  return (
    <>
      <div className="page-head"><h1>Tableau de bord</h1></div>
      <div className="stats">
        {counters.map(([label, n]) => (
          <div className="stat" key={label}><b>{n}</b><span className="muted">{label}</span></div>
        ))}
        <div className={`stat ${stats.appointmentsPending ? 'alert' : ''}`}>
          <b>{stats.appointmentsPending}</b><span className="muted">Rendez-vous à confirmer</span>
        </div>
      </div>
      <div className="grid2">
        <section className="card">
          <h2>Rendez-vous par statut</h2>
          <Bars data={Object.entries(stats.byStatus || {}).map(([k, v]) => ({ label: STATUS_LABEL[k] || k, value: v }))} />
        </section>
        <section className="card">
          <h2>Spécialités les plus demandées</h2>
          <Bars data={(stats.topSpecialties || []).map((s) => ({ label: s.name, value: s.count }))} />
        </section>
      </div>
    </>
  );
}
