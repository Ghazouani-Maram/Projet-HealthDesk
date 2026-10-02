import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import BookingModal from '../components/BookingModal';
import CrudPage from '../components/CrudPage';

// Patients et admin : annuaire avec prise de rendez-vous. Admin : CRUD complet.
export default function Doctors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const admin = user.role === 'ADMIN';

  return (
    <>
      <CrudPage
        title={admin ? 'Médecins' : 'Trouver un médecin'}
        subtitle={admin ? null : 'Choisissez un médecin puis un créneau disponible.'}
        singular="un médecin" newLabel="Ajouter un médecin" path="/doctors"
        searchPlaceholder="Nom du médecin" canManage={admin}
        filters={[{ name: 'specialtyId', optionsPath: '/specialties', placeholder: 'Toutes les spécialités' }]}
        columns={[
          { label: 'Médecin', render: (d) => <strong>{d.name}</strong> },
          { label: 'Spécialité', render: (d) => d.specialty?.name },
          { label: 'Téléphone', key: 'phone' },
          { label: 'Email', key: 'email' },
        ]}
        fields={[
          { name: 'name', label: 'Nom complet', required: true },
          { name: 'email', label: 'Adresse email', type: 'email', required: true },
          { name: 'phone', label: 'Téléphone' },
          { name: 'specialtyId', label: 'Spécialité', type: 'select', optionsPath: '/specialties', required: true },
          { name: 'password', label: 'Mot de passe initial', type: 'password', minLength: 8, required: true, createOnly: true },
        ]}
        rowActions={(d) => user.role !== 'DOCTOR' && (
          <button className="btn sm" onClick={() => setBooking(d)}>Prendre rendez-vous</button>
        )}
      />
      {booking && <BookingModal doctor={booking} onClose={() => setBooking(null)} onBooked={() => navigate('/rendez-vous')} />}
    </>
  );
}
