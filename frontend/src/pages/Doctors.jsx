import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import BookingModal from '../components/BookingModal';
import CrudPage from '../components/CrudPage';
import ReviewsModal from '../components/ReviewsModal';
import { Stars } from '../components/ui';
import { fmtRating } from '../utils';

// Patients et admin : annuaire avec prise de rendez-vous. Admin : CRUD complet.
export default function Doctors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [reviewing, setReviewing] = useState(null); // médecin dont on consulte les avis
  const [reloadToken, setReloadToken] = useState(0);
  const admin = user.role === 'ADMIN';

  return (
    <>
      <CrudPage
        title={admin ? 'Médecins' : 'Trouver un médecin'}
        subtitle={admin ? null : 'Choisissez un médecin puis un créneau disponible.'}
        singular="un médecin" newLabel="Ajouter un médecin" path="/doctors"
        searchPlaceholder="Nom du médecin" canManage={admin} reloadToken={reloadToken}
        filters={[{ name: 'specialtyId', optionsPath: '/specialties', placeholder: 'Toutes les spécialités' }]}
        columns={[
          { label: 'Médecin', render: (d) => <strong>{d.name}</strong> },
          { label: 'Spécialité', render: (d) => d.specialty?.name },
          {
            label: 'Avis',
            render: (d) => (
              <button className="rating-link" onClick={() => setReviewing(d)}
                aria-label={`Voir les avis de ${d.name}`}>
                {d.rating?.count ? (
                  <>
                    <b>{fmtRating(d.rating.avg)}</b> <Stars value={d.rating.avg} /> <span>({d.rating.count})</span>
                  </>
                ) : <span>Aucun avis</span>}
              </button>
            ),
          },
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
      {reviewing && (
        <ReviewsModal doctor={reviewing} onClose={() => setReviewing(null)} onChanged={() => setReloadToken((t) => t + 1)} />
      )}
      {booking && <BookingModal doctor={booking} onClose={() => setBooking(null)} onBooked={() => navigate('/rendez-vous')} />}
    </>
  );
}
