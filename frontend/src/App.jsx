import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout, { RequireAuth } from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Planning from './pages/Planning';
import Appointments from './pages/Appointments';
import Doctors from './pages/Doctors';
import Specialties from './pages/Specialties';
import Patients from './pages/Patients';
import Users from './pages/Users';
import Documents from './pages/Documents';

// Page d'accueil selon le rôle
function Home() {
  const { user } = useAuth();
  if (user.role === 'ADMIN') return <Dashboard />;
  if (user.role === 'DOCTOR') return <Planning />;
  return <Navigate to="/medecins" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route path="/inscription" element={<Register />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="rendez-vous" element={<Appointments />} />
          <Route path="documents" element={<Documents />} />
          <Route element={<RequireAuth roles={['ADMIN', 'PATIENT']} />}>
            <Route path="medecins" element={<Doctors />} />
          </Route>
          <Route element={<RequireAuth roles={['ADMIN']} />}>
            <Route path="specialites" element={<Specialties />} />
            <Route path="patients" element={<Patients />} />
            <Route path="utilisateurs" element={<Users />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
