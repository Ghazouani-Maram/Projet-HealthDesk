import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorMsg, Field } from '../components/ui';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.status === 401 ? 'Email ou mot de passe incorrect.' : err.message);
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <aside><p>Votre prochain rendez-vous en quelques clics.</p></aside>
      <form onSubmit={submit}>
        <h1>Connexion</h1>
        {import.meta.env.VITE_DEMO === 'true' && (
          <p className="muted">Mode démo. Comptes : admin@demo.tn, medecin@demo.tn ou patient@demo.tn (mot de passe libre).</p>
        )}
        <ErrorMsg>{error}</ErrorMsg>
        <Field label="Adresse email">
          <input type="email" value={email} required autoComplete="username" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mot de passe">
          <input type="password" value={password} required autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <button className="btn" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
        <p className="muted">Pas encore de compte ? <Link to="/inscription">Créer un compte patient</Link></p>
      </form>
    </div>
  );
}
