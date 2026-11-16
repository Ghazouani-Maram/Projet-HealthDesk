import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useList } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import AppointmentActions from '../components/AppointmentActions';
import { ErrorMsg, Loading, Stars, StatusBadge } from '../components/ui';
import {
  STATUS_LABEL, addDays, addMinutes, ageFrom, avatarHue, fmtRating, fmtWhen, hhmm, startOfWeek, todayISO,
} from '../utils';

const SLOT = 30; // minutes (RG3)
const FILTERS = [['', 'Tous'], ['PENDING', 'À confirmer'], ['CONFIRMED', 'Confirmés'], ['DONE', 'Terminés'], ['CANCELLED', 'Annulés']];
const dayLong = (iso) => new Date(`${iso}T00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// Regroupe les créneaux libres consécutifs : 09:00, 09:30, 10:00 -> « 09:00 – 10:30 · 3 créneaux »
function groupFree(slots) {
  const groups = [];
  slots.forEach((s) => {
    const last = groups[groups.length - 1];
    if (last && last.end === s) { last.end = addMinutes(s, SLOT); last.count += 1; }
    else groups.push({ type: 'free', time: s, end: addMinutes(s, SLOT), count: 1 });
  });
  return groups;
}

function Kpi({ label, children, sub, alert }) {
  return (
    <div className={`stat ${alert ? 'alert' : ''}`}>
      <b>{children}</b>
      <span className="muted">{label}</span>
      {sub && <small className="kpi-sub">{sub}</small>}
    </div>
  );
}

function AppointmentRow({ a, flag, isNext, onChange }) {
  const age = ageFrom(a.patient?.birthDate);
  const start = hhmm(a.startsAt);
  return (
    <div className={`tl-row st-${a.status} ${flag === 'now' ? 'now' : ''}`}>
      <div className="tl-time"><time>{start}</time><span>{addMinutes(start, SLOT)}</span></div>
      <span className="rev-avatar" style={{ '--h': avatarHue(a.patient?.name) }} aria-hidden="true">{a.patient?.name?.[0]}</span>
      <div className="tl-main">
        <div className="tl-title">
          <strong>{a.patient?.name}</strong>
          {flag === 'now' && <span className="tag now">En cours</span>}
          {isNext && flag !== 'now' && <span className="tag next">Prochain</span>}
        </div>
        <span className="tl-reason">{a.reason}</span>
        <span className="tl-meta">
          {[age != null && `${age} ans`, a.patient?.phone].filter(Boolean).join(' · ') || 'Coordonnées non renseignées'}
        </span>
      </div>
      <StatusBadge status={a.status} />
      <AppointmentActions a={a} onChange={onChange} />
    </div>
  );
}

// Planning du médecin : indicateurs, navigation par semaine, journée détaillée avec créneaux libres, demandes à confirmer
export default function Planning() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(todayISO());
  const [filter, setFilter] = useState('');
  const [showFree, setShowFree] = useState(true);
  const [free, setFree] = useState([]);
  const [rating, setRating] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const weekStart = startOfWeek(selected);
  const week = useList('/appointments', { from: weekStart, to: addDays(weekStart, 6), sort: 'startsAt' }, 100);
  const upcoming = useList('/appointments', { from: todayISO(), sort: 'startsAt' }, 100);
  const reloadAll = () => { week.reload(); upcoming.reload(); };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user.doctorId) return;
    api.get(`/doctors/${user.doctorId}/reviews`, { size: 1 }).then((d) => setRating(d.summary)).catch(() => {});
  }, [user.doctorId]);

  useEffect(() => {
    if (!showFree || !user.doctorId) { setFree([]); return undefined; }
    let alive = true;
    api.get(`/doctors/${user.doctorId}/slots`, { date: selected })
      .then((s) => alive && setFree(s))
      .catch(() => alive && setFree([]));
    return () => { alive = false; };
  }, [user.doctorId, selected, showFree, week.items]);

  // Indicateurs (tous les rendez-vous à partir d'aujourd'hui)
  const today = todayISO();
  const todayAll = upcoming.items.filter((a) => a.startsAt.startsWith(today) && a.status !== 'CANCELLED');
  const pending = upcoming.items.filter((a) => a.status === 'PENDING');
  const next = upcoming.items.find((a) => ['PENDING', 'CONFIRMED'].includes(a.status) && new Date(a.startsAt) >= now);
  const minutesToNext = next ? Math.round((new Date(next.startsAt) - now) / 60000) : null;

  // Semaine et jour sélectionnés
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const countOf = (day) => week.items.filter((a) => a.startsAt.startsWith(day) && a.status !== 'CANCELLED').length;
  const dayItems = week.items.filter((a) => a.startsAt.startsWith(selected));
  const weekCounts = useMemo(() => {
    const c = { PENDING: 0, CONFIRMED: 0, DONE: 0, CANCELLED: 0 };
    week.items.forEach((a) => { c[a.status] += 1; });
    return c;
  }, [week.items]);
  const chipCount = (status) => (status ? dayItems.filter((a) => a.status === status).length : dayItems.filter((a) => a.status !== 'CANCELLED').length);

  const visible = dayItems.filter((a) => (filter ? a.status === filter : a.status !== 'CANCELLED'));
  const rows = [...visible.map((a) => ({ type: 'appt', time: hhmm(a.startsAt), a })), ...(!filter && showFree ? groupFree(free) : [])]
    .sort((x, y) => x.time.localeCompare(y.time));

  const flagOf = (a) => {
    const s = new Date(a.startsAt);
    return a.startsAt.startsWith(today) && ['PENDING', 'CONFIRMED'].includes(a.status) && s <= now && now < new Date(s.getTime() + SLOT * 60000) ? 'now' : '';
  };

  const weekLabel = `${new Date(`${weekStart}T00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${new Date(`${addDays(weekStart, 6)}T00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const shift = (n) => setSelected((s) => addDays(s, n));
  const error = week.error || upcoming.error;

  return (
    <>
      <div className="page-head">
        <div><h1>Mon planning</h1><p className="muted">Semaine du {weekLabel}</p></div>
        <div className="plan-nav">
          <button className="btn sm ghost" onClick={() => shift(-7)} aria-label="Semaine précédente">‹</button>
          <button className="btn sm ghost" onClick={() => setSelected(today)}>Aujourd'hui</button>
          <button className="btn sm ghost" onClick={() => shift(7)} aria-label="Semaine suivante">›</button>
          <input type="date" aria-label="Aller à la date" value={selected} onChange={(e) => e.target.value && setSelected(e.target.value)} />
        </div>
      </div>

      <ErrorMsg>{error}</ErrorMsg>

      <div className="stats kpis">
        <Kpi label="Rendez-vous aujourd'hui" sub={`${todayAll.filter((a) => a.status === 'DONE').length} terminé(s)`}>{todayAll.length}</Kpi>
        <Kpi label="Demandes à confirmer" alert={pending.length > 0} sub={pending.length ? 'Action requise' : 'Tout est à jour'}>{pending.length}</Kpi>
        <Kpi label="Prochain rendez-vous" sub={next ? `${next.patient?.name}${minutesToNext != null && minutesToNext < 120 ? ` · dans ${minutesToNext} min` : ''}` : 'Aucun à venir'}>
          {next ? fmtWhen(next.startsAt) : '–'}
        </Kpi>
        <Kpi label="Note des patients" sub={rating?.count ? `${rating.count} avis` : 'Aucun avis'}>
          {rating?.count ? <>{fmtRating(rating.avg)} <Stars value={rating.avg} /></> : '–'}
        </Kpi>
      </div>

      <div className="day-strip" role="tablist" aria-label="Jours de la semaine">
        {days.map((d) => {
          const n = countOf(d);
          return (
            <button key={d} role="tab" aria-selected={d === selected} className={`day-chip${d === selected ? ' on' : ''}${d === today ? ' today' : ''}`}
              onClick={() => setSelected(d)}>
              <span>{new Date(`${d}T00:00`).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
              <b>{new Date(`${d}T00:00`).getDate()}</b>
              <em className={n ? '' : 'zero'}>{n ? `${n} RDV` : '—'}</em>
            </button>
          );
        })}
      </div>

      <div className="plan-grid">
        <section>
          <div className="plan-head">
            <h2>{dayLong(selected)}{selected === today && <span className="tag now">Aujourd'hui</span>}</h2>
            <label className="switch"><input type="checkbox" checked={showFree} onChange={(e) => setShowFree(e.target.checked)} /> Afficher les créneaux libres</label>
          </div>
          <div className="chips" role="group" aria-label="Filtrer par statut">
            {FILTERS.map(([k, label]) => (
              <button key={k} className={`chip${filter === k ? ' on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {label} <small>{chipCount(k)}</small>
              </button>
            ))}
          </div>

          {week.loading && !week.items.length ? <Loading /> : !rows.length ? (
            <div className="panel"><div className="state">{filter ? `Aucun rendez-vous « ${STATUS_LABEL[filter].toLowerCase()} » ce jour-là.` : 'Aucun rendez-vous ce jour-là.'}</div></div>
          ) : (
            <div className="timeline">
              {rows.map((r) => r.type === 'appt' ? (
                <AppointmentRow key={r.a.id} a={r.a} flag={flagOf(r.a)} isNext={next?.id === r.a.id} onChange={reloadAll} />
              ) : (
                <div className="tl-free" key={`f-${r.time}`}>
                  <div className="tl-time"><time>{r.time}</time><span>{r.end}</span></div>
                  <span>Disponible · {r.count} créneau{r.count > 1 ? 'x' : ''} libre{r.count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="plan-side">
          <section className="card">
            <h2>Demandes à confirmer <span className="count-pill">{pending.length}</span></h2>
            {!pending.length ? <p className="muted">Aucune demande en attente.</p> : pending.slice(0, 5).map((a) => (
              <div className="pend" key={a.id}>
                <button className="pend-link" onClick={() => setSelected(a.startsAt.slice(0, 10))} title="Afficher ce jour">
                  <strong>{a.patient?.name}</strong>
                  <span>{fmtWhen(a.startsAt)}</span>
                </button>
                <span className="muted">{a.reason}</span>
                <AppointmentActions a={a} onChange={reloadAll} />
              </div>
            ))}
            {pending.length > 5 && <p className="muted pend-more">+ {pending.length - 5} autre(s) dans « Rendez-vous »</p>}
          </section>
          <section className="card">
            <h2>Cette semaine</h2>
            {[['CONFIRMED', 'Confirmés'], ['PENDING', 'À confirmer'], ['DONE', 'Terminés'], ['CANCELLED', 'Annulés']].map(([k, label]) => (
              <div className="wk-row" key={k}><StatusBadge status={k} /><span>{label}</span><b>{weekCounts[k]}</b></div>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}
