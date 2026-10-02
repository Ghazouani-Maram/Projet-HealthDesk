import { useState } from 'react';
import { api } from '../api/client';
import { useDebounce, useList } from '../api/hooks';
import { ErrorMsg, Field, Loading, Modal, OptionSelect, Pagination } from './ui';

function FieldInput({ f, value, onChange }) {
  const id = `f-${f.name}`;
  if (f.type === 'select')
    return <OptionSelect id={id} options={f.options} optionsPath={f.optionsPath} value={value} required={f.required} onChange={onChange} />;
  if (f.type === 'textarea')
    return <textarea id={id} rows={3} value={value} required={f.required} onChange={(e) => onChange(e.target.value)} />;
  if (f.type === 'checkbox')
    return <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
  return (
    <input id={id} type={f.type || 'text'} value={value} required={f.required} minLength={f.minLength}
      onChange={(e) => onChange(e.target.value)} />
  );
}

function FormModal({ singular, path, fields, row, onClose, onSaved }) {
  const isNew = !row.id;
  const visible = fields.filter((f) => isNew || !f.createOnly);
  const [values, setValues] = useState(() =>
    Object.fromEntries(visible.map((f) => [f.name, row[f.name] ?? row[f.name.replace(/Id$/, '')]?.id ?? f.default ?? '']))
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isNew) await api.post(path, values);
      else await api.put(`${path}/${row.id}`, values);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={isNew ? `Ajouter ${singular}` : `Modifier ${singular}`} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorMsg>{error}</ErrorMsg>
        {visible.map((f) => (
          <Field key={f.name} label={f.label} className={f.type === 'checkbox' ? 'check' : ''}>
            <FieldInput f={f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
          </Field>
        ))}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Page liste + recherche + filtres + pagination + CRUD (création, modification, suppression).
 * Configurée par colonnes, champs de formulaire et filtres.
 */
export default function CrudPage({
  title, subtitle, singular, newLabel, path, columns, fields, filters = [],
  canManage = true, rowActions, searchPlaceholder = 'Rechercher',
}) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const q = useDebounce(search);
  const list = useList(path, { search: q, ...filterValues });
  const [editing, setEditing] = useState(null); // null | {} (nouveau) | ligne existante
  const [actionError, setActionError] = useState('');

  const remove = async (row) => {
    if (!window.confirm(`Supprimer « ${row.name} » ? Cette action est définitive.`)) return;
    setActionError('');
    try {
      await api.del(`${path}/${row.id}`);
      list.reload();
    } catch (e) {
      setActionError(e.message);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {canManage && <button className="btn" onClick={() => setEditing({})}>{newLabel}</button>}
      </div>

      <div className="toolbar">
        <input type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {filters.map((f) => (
          <div key={f.name}>
            <OptionSelect options={f.options} optionsPath={f.optionsPath} placeholder={f.placeholder}
              value={filterValues[f.name]} onChange={(v) => setFilterValues((s) => ({ ...s, [f.name]: v }))} />
          </div>
        ))}
      </div>

      <ErrorMsg>{actionError || list.error}</ErrorMsg>
      <div className="panel">
        {list.loading && !list.items.length ? <Loading /> : !list.items.length ? (
          <div className="state">Aucun résultat. Modifiez la recherche ou les filtres.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((c) => <th key={c.label}>{c.label}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => <td key={c.label}>{c.render ? c.render(row) : row[c.key]}</td>)}
                    <td>
                      <div className="actions">
                        {rowActions?.(row)}
                        {canManage && (
                          <>
                            <button className="btn sm ghost" onClick={() => setEditing(row)}>Modifier</button>
                            <button className="btn sm danger" onClick={() => remove(row)}>Supprimer</button>
                          </>
                        )}
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

      {editing && (
        <FormModal singular={singular} path={path} fields={fields} row={editing}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />
      )}
    </>
  );
}
