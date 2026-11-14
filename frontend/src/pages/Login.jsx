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
    <main className="auth auth--centered">
      <div className="auth-frame">
        <header className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">✚</div>
          <div className="auth-brand-copy">
            <strong>HealthDesk</strong>
            <span>ESPACE DE SANTÉ</span>
          </div>
        </header>

        <section className="auth-card">
          <div className="auth-card-heading">
            <span className="auth-kicker">BON RETOUR</span>
            <h1>Connexion</h1>
            <p>Connectez-vous à votre espace HealthDesk.</p>
          </div>

          {import.meta.env.VITE_DEMO === 'true' && (
            <p className="muted auth-demo">Mode démo. Comptes : admin@demo.tn, medecin@demo.tn ou patient@demo.tn (mot de passe libre).</p>
          )}

          <form className="auth-form" onSubmit={submit}>
            <ErrorMsg>{error}</ErrorMsg>
            <Field label="Adresse email">
              <input
                type="email"
                value={email}
                required
                autoComplete="username"
                placeholder="exemple@domaine.tn"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Mot de passe">
              <input
                type="password"
                value={password}
                required
                autoComplete="current-password"
                placeholder="Saisissez votre mot de passe"
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button className="btn auth-submit" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
            <p className="auth-signup">Vous n'avez pas encore de compte ? <Link to="/inscription">Créer un compte patient</Link></p>
          </form>

          <div className="auth-security">
            <span aria-hidden="true">▣</span>
            Connexion sécurisée · Vos données restent confidentielles
          </div>
        </section>
        <p className="auth-copyright">© {new Date().getFullYear()} HealthDesk · Tous droits réservés</p>
      </div>
    </main>
  );
}
