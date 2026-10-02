import { useRef, useState } from 'react';
import { api } from '../api/client';
import { useList } from '../api/hooks';
import { useAuth } from '../auth/AuthContext';
import { fmtDate, fmtSize } from '../utils';
import { ErrorMsg, Field, Loading, OptionSelect, Pagination } from '../components/ui';

const MAX_SIZE = 5 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

// Dépôt et consultation de fichiers (EF-05)
export default function Documents() {
  const { user } = useAuth();
  const isPatient = user.role === 'PATIENT';
  const [patientId, setPatientId] = useState('');
  const list = useList('/documents', { patientId: isPatient ? '' : patientId }, 8);
  const formRef = useRef(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = (e) => {
    const f = e.target.files[0];
    setError('');
    if (f && !TYPES.includes(f.type)) return setError('Format non accepté. Utilisez un PDF, un PNG ou un JPEG.');
    if (f && f.size > MAX_SIZE) return setError('Fichier trop volumineux (5 Mo maximum).');
    setFile(f || null);
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Choisissez un fichier.');
    if (!isPatient && !patientId) return setError('Sélectionnez le patient concerné.');
    const body = new FormData();
    body.append('title', title);
    body.append('file', file);
    if (!isPatient) body.append('patientId', patientId);
    setBusy(true);
    setError('');
    try {
      await api.post('/documents', body);
      formRef.current.reset();
      setTitle('');
      setFile(null);
      list.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Le fichier est protégé par le jeton JWT : on le télécharge en blob avant de l'ouvrir
  const view = async (doc) => {
    try {
      const blob = await api.blob(`/documents/${doc.id}/file`);
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    } catch (err) {
      setError(err.message);
    }
  };
  const remove = async (doc) => {
    if (!window.confirm(`Supprimer « ${doc.title} » ?`)) return;
    try {
      await api.del(`/documents/${doc.id}`);
      list.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isPatient ? 'Mes documents' : 'Documents des patients'}</h1>
          <p className="muted">PDF, PNG ou JPEG, 5 Mo maximum.</p>
        </div>
      </div>

      <form ref={formRef} className="card upload" onSubmit={upload}>
        <ErrorMsg>{error}</ErrorMsg>
        <div className="upload-row">
          {!isPatient && (
            <Field label="Patient">
              <OptionSelect optionsPath="/patients" value={patientId} onChange={setPatientId} />
            </Field>
          )}
          <Field label="Titre du document">
            <input value={title} required onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Analyse de sang" />
          </Field>
          <Field label="Fichier">
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={pick} />
          </Field>
          <button className="btn" disabled={busy}>{busy ? 'Envoi…' : 'Déposer'}</button>
        </div>
      </form>

      <div className="panel">
        {list.loading && !list.items.length ? <Loading /> : !list.items.length ? (
          <div className="state">Aucun document pour le moment.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Titre</th>{!isPatient && <th>Patient</th>}<th>Taille</th><th>Ajouté le</th><th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.title}</strong></td>
                    {!isPatient && <td>{d.patient?.name}</td>}
                    <td>{fmtSize(d.size)}</td>
                    <td>{fmtDate(d.createdAt)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn sm ghost" onClick={() => view(d)}>Consulter</button>
                        <button className="btn sm danger" onClick={() => remove(d)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={list.page} size={list.size} total={list.total} onChange={list.setPage} />
      </div>
    </>
  );
}
