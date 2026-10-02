import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABEL } from '../utils';
import { Loading } from './ui';

const NAV = {
  ADMIN: [['/', 'Tableau de bord'], ['/rendez-vous', 'Rendez-vous'], ['/medecins', 'Médecins'],
    ['/specialites', 'Spécialités'], ['/patients', 'Patients'], ['/documents', 'Documents'], ['/utilisateurs', 'Utilisateurs']],
  DOCTOR: [['/', 'Mon planning'], ['/rendez-vous', 'Rendez-vous'], ['/documents', 'Documents patients']],
  PATIENT: [['/medecins', 'Trouver un médecin'], ['/rendez-vous', 'Mes rendez-vous'], ['/documents', 'Mes documents']],
};

// Garde de route : connexion obligatoire, et rôles autorisés le cas échéant
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
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Rendez-vous<br />médicaux</div>
        <nav aria-label="Navigation principale">
          {NAV[user.role].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>
        <div className="me">
          <strong>{user.name}</strong>
          <span>{ROLE_LABEL[user.role]}</span>
          <button className="link" onClick={logout}>Se déconnecter</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
