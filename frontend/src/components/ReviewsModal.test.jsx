import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReviewsModal from './ReviewsModal';
import { api } from '../api/client';

let mockUser = { role: 'PATIENT' };
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../api/client', () => ({ api: { get: vi.fn(), post: vi.fn(), del: vi.fn() } }));

const doctor = { id: 2, name: 'Dr Karim Trabelsi', specialty: { id: 2, name: 'Cardiologie' } };
const review = (id, extra = {}) => ({
  id, rating: 4, comment: `Commentaire ${id}`, createdAt: '2026-10-01T10:00:00', author: 'Leila C.', mine: false, ...extra,
});
const reply = (reviewState, items = [review(1), review(2)], total = items.length) => ({
  items, total, reviewState,
  summary: { avg: 4.5, count: total, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } },
});

beforeEach(() => { vi.clearAllMocks(); mockUser = { role: 'PATIENT' }; });

test('affiche la note moyenne, le nombre d\'avis et les commentaires', async () => {
  api.get.mockResolvedValue(reply('NEEDS_VISIT'));
  render(<ReviewsModal doctor={doctor} onClose={() => {}} />);
  expect(await screen.findByText('Commentaire 1')).toBeInTheDocument();
  expect(screen.getByText('4,5')).toBeInTheDocument();
  expect(screen.getByText('2 avis')).toBeInTheDocument();
  expect(screen.getByText(/après une consultation terminée/)).toBeInTheDocument();   // patient non éligible
  expect(screen.queryByText('Donnez votre avis')).not.toBeInTheDocument();
});

test('un patient éligible publie un avis', async () => {
  api.get.mockResolvedValue(reply('CAN_REVIEW'));
  api.post.mockResolvedValue({});
  const onChanged = vi.fn();
  render(<ReviewsModal doctor={doctor} onClose={() => {}} onChanged={onChanged} />);
  await screen.findByText('Donnez votre avis');
  fireEvent.click(screen.getByRole('button', { name: 'Publier mon avis' }));
  expect(await screen.findByText('Choisissez une note de 1 à 5 étoiles.')).toBeInTheDocument();   // note obligatoire
  fireEvent.click(screen.getByRole('radio', { name: '5 sur 5' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Très à l\'écoute' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publier mon avis' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/doctors/2/reviews', { rating: 5, comment: 'Très à l\'écoute' }));
  await waitFor(() => expect(onChanged).toHaveBeenCalled());
});

test('pagination « Afficher plus » et suppression réservée à l\'auteur ou à l\'admin', async () => {
  api.get.mockResolvedValueOnce(reply('ALREADY_REVIEWED', [review(1, { mine: true }), review(2)], 3));
  render(<ReviewsModal doctor={doctor} onClose={() => {}} />);
  await screen.findByText('Commentaire 1');
  expect(screen.getAllByRole('button', { name: 'Supprimer' })).toHaveLength(1);   // seulement son propre avis
  api.get.mockResolvedValueOnce(reply('ALREADY_REVIEWED', [review(3)], 3));
  fireEvent.click(screen.getByRole('button', { name: /Afficher plus d'avis \(1\)/ }));
  expect(await screen.findByText('Commentaire 3')).toBeInTheDocument();
  expect(api.get).toHaveBeenLastCalledWith('/doctors/2/reviews', { page: 2, size: 5 });
});
