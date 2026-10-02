import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorMsg, Field } from '../components/ui';

export default function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setBusy(true);
    setError('');
    try {
      await register({ name: form.name, email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <aside><p>Créez votre espace patient.</p></aside>
      <form onSubmit={submit}>
        <h1>Inscription</h1>
        <ErrorMsg>{error}</ErrorMsg>
        <Field label="Nom complet"><input value={form.name} required onChange={set('name')} /></Field>
        <Field label="Adresse email"><input type="email" value={form.email} required onChange={set('email')} /></Field>
        <Field label="Mot de passe (8 caractères minimum)">
          <input type="password" value={form.password} required minLength={8} autoComplete="new-password" onChange={set('password')} />
        </Field>
        <Field label="Confirmer le mot de passe">
          <input type="password" value={form.confirm} required autoComplete="new-password" onChange={set('confirm')} />
        </Field>
        <button className="btn" disabled={busy}>{busy ? 'Création…' : 'Créer mon compte'}</button>
        <p className="muted">Déjà inscrit ? <Link to="/connexion">Se connecter</Link></p>
      </form>
    </div>
  );
}
