import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL } from '../utils';
import { Loading } from './ui';

const NAV = {
  ADMIN: [['/', 'Tableau de bord', '▦'], ['/rendez-vous', 'Rendez-vous', '▣'], ['/medecins', 'Médecins', '⚕'], ['/specialites', 'Spécialités', '✳'], ['/patients', 'Patients', '♙'], ['/documents', 'Documents', '▤'], ['/utilisateurs', 'Utilisateurs', '♧']],
  DOCTOR: [['/', 'Mon planning', '▦'], ['/rendez-vous', 'Rendez-vous', '▣'], ['/documents', 'Documents patients', '▤']],
  PATIENT: [['/medecins', 'Trouver un médecin', '⚕'], ['/rendez-vous', 'Mes rendez-vous', '▣'], ['/documents', 'Mes documents', '▤']],
};
const TITLES = { '/': 'Espace de travail', '/rendez-vous': 'Gestion des rendez-vous', '/medecins': 'Annuaire médical', '/specialites': 'Spécialités médicales', '/patients': 'Gestion des patients', '/documents': 'Espace documentaire', '/utilisateurs': 'Administration des comptes' };

export function RequireAuth({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = TITLES[location.pathname] || 'MedCare';
  const initials = (user?.name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="shell">
      <aside className="side">
        <NavLink to="/" className="brand" aria-label="MedCare accueil">
          <span className="brand-mark">✚</span><span><strong>MedCare</strong><small>PORTAIL MÉDICAL</small></span>
        </NavLink>
        <div className="nav-caption">MENU PRINCIPAL</div>
        <nav aria-label="Navigation principale">
          {NAV[user.role].map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === '/'}><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span></NavLink>
          ))}
        </nav>
        <div className="side-help"><span className="help-icon">?</span><div><strong>Besoin d'aide ?</strong><small>Votre espace santé, simplifié.</small></div></div>
        <div className="me">
          <div className="avatar">{initials}</div><div className="me-info"><strong>{user.name}</strong><span>{ROLE_LABEL[user.role]}</span></div>
          <button className="logout" onClick={logout} title="Se déconnecter" aria-label="Se déconnecter">↪</button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar"><div><span className="eyebrow">ESPACE SÉCURISÉ</span><div className="topbar-title">{title}</div></div><div className="topbar-right"><span className="secure-pill"><i /> Connexion sécurisée</span><div className="top-avatar">{initials}</div></div></header>
        <div className="content"><Outlet /></div>
        <footer className="app-footer"><span>© {new Date().getFullYear()} MedCare</span><span>Votre santé, notre priorité.</span></footer>
      </main>
    </div>
  );
}
