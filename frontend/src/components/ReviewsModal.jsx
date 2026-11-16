import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fmtDate, fmtRating, fmtRelative } from '../utils';
import { ErrorMsg, Field, Loading, Modal, RatingInput, Stars } from './ui';

const PAGE = 5;
const HUES = [212, 160, 28, 280, 340, 190];
const hue = (s) => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

function Summary({ summary }) {
  const { avg, count, distribution } = summary;
  return (
    <div className="rev-summary">
      <div className="rev-score">
        <b>{fmtRating(avg)}</b>
        <Stars value={avg} label={avg == null ? 'Aucune note' : `${fmtRating(avg)} sur 5`} />
        <span>{count} avis</span>
      </div>
      <div className="rev-dist">
        {[5, 4, 3, 2, 1].map((n) => (
          <div key={n} className="rev-dist-row">
            <span>{n} ★</span>
            <i><u style={{ width: count ? `${((distribution[n] || 0) / count) * 100}%` : 0 }} /></i>
            <span>{distribution[n] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ doctorId, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Choisissez une note de 1 à 5 étoiles.');
    setBusy(true);
    setError('');
    try {
      await api.post(`/doctors/${doctorId}/reviews`, { rating, comment });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="rev-form" onSubmit={submit}>
      <h3>Donnez votre avis</h3>
      <ErrorMsg>{error}</ErrorMsg>
      <RatingInput value={rating} onChange={setRating} />
      <Field label="Votre commentaire (facultatif)">
        <textarea rows={3} maxLength={1000} value={comment} placeholder="Écoute, ponctualité, clarté des explications…"
          onChange={(e) => setComment(e.target.value)} />
      </Field>
      <div className="form-actions">
        <button className="btn sm" disabled={busy}>{busy ? 'Envoi…' : 'Publier mon avis'}</button>
      </div>
    </form>
  );
}

function ReviewItem({ r, canDelete, onDelete }) {
  return (
    <li className="rev-item">
      <span className="rev-avatar" style={{ '--h': hue(r.author) }} aria-hidden="true">{r.author[0]}</span>
      <div className="rev-body">
        <div className="rev-head">
          <strong>{r.author}{r.mine && <em> (vous)</em>}</strong>
          <time dateTime={r.createdAt} title={fmtDate(r.createdAt)}>{fmtRelative(r.createdAt)}</time>
        </div>
        <Stars value={r.rating} />
        {r.comment && <p>{r.comment}</p>}
        {canDelete && <button className="rev-del" onClick={() => onDelete(r)}>Supprimer</button>}
      </div>
    </li>
  );
}

// Avis des patients sur un médecin : note moyenne, répartition, liste, et formulaire pour les patients éligibles
export default function ReviewsModal({ doctor, onClose, onChanged }) {
  const { user } = useAuth();
  const [data, setData] = useState(null); // { summary, reviewState, total }
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p, replace) => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get(`/doctors/${doctor.id}/reviews`, { page: p, size: PAGE });
      setData({ summary: d.summary, reviewState: d.reviewState, total: d.total });
      setItems((prev) => (replace ? d.items : [...prev, ...d.items]));
      setPage(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [doctor.id]);

  useEffect(() => { load(1, true); }, [load]);

  const refresh = () => { load(1, true); onChanged?.(); };

  const remove = async (r) => {
    if (!window.confirm('Supprimer cet avis ?')) return;
    try {
      await api.del(`/reviews/${r.id}`);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const hint = {
    NEEDS_VISIT: 'Vous pourrez donner votre avis après une consultation terminée avec ce médecin.',
    ALREADY_REVIEWED: 'Merci, vous avez déjà donné votre avis sur ce médecin.',
  }[data?.reviewState];

  return (
    <Modal title={doctor.name} onClose={onClose} wide>
      <p className="muted rev-sub">{doctor.specialty?.name} · Avis des patients</p>
      <ErrorMsg>{error}</ErrorMsg>
      {!data ? <Loading /> : (
        <>
          <Summary summary={data.summary} />
          {data.reviewState === 'CAN_REVIEW' && <ReviewForm doctorId={doctor.id} onDone={refresh} />}
          {hint && <p className="rev-hint">{hint}</p>}
          {!items.length ? (
            <div className="state">Aucun avis pour le moment.</div>
          ) : (
            <ul className="rev-list">
              {items.map((r) => (
                <ReviewItem key={r.id} r={r} canDelete={r.mine || user.role === 'ADMIN'} onDelete={remove} />
              ))}
            </ul>
          )}
          {items.length < data.total && (
            <button className="btn sm ghost rev-more" disabled={loading} onClick={() => load(page + 1, false)}>
              {loading ? 'Chargement…' : `Afficher plus d'avis (${data.total - items.length})`}
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
