import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Planning from './Planning';
import { api } from '../api/client';
import { addDays, todayISO } from '../utils';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { role: 'DOCTOR', doctorId: 1, name: 'Dr Salma Ben Ali' } }) }));
vi.mock('../api/client', () => ({ api: { get: vi.fn(), patch: vi.fn(), del: vi.fn(), post: vi.fn() } }));

const appt = (id, day, hm, status, name, reason) => ({
  id, startsAt: `${day}T${hm}:00`, status, reason,
  doctor: { id: 1, name: 'Dr Salma Ben Ali' }, patient: { id: id + 10, name, phone: '20 111 002', birthDate: '1985-09-30' },
});

beforeEach(() => {
  vi.clearAllMocks();
  const today = todayISO();
  const all = [
    appt(1, today, '23:30', 'CONFIRMED', 'Omar Bouzid', 'Bilan annuel'),
    appt(2, today, '23:00', 'DONE', 'Leila Chaabane', 'Contrôle tension'),
    appt(3, addDays(today, 1), '09:30', 'PENDING', 'Sami Hamdi', 'Vaccin de rappel'),
    appt(4, today, '22:00', 'CANCELLED', 'Yasmine Khelifi', 'Acné'),
  ];
  api.get.mockImplementation(async (path, params = {}) => {
    if (path === '/appointments') return { items: all.filter((a) => a.startsAt.slice(0, 10) >= params.from && (!params.to || a.startsAt.slice(0, 10) <= params.to)), total: all.length };
    if (path.endsWith('/slots')) return ['09:00', '09:30', '10:00', '14:00'];
    if (path.endsWith('/reviews')) return { items: [], total: 15, summary: { avg: 4.2, count: 15, distribution: {} }, reviewState: null };
    throw new Error(`route inattendue ${path}`);
  });
});

test('affiche les indicateurs, les rendez-vous du jour et la note des patients', async () => {
  render(<Planning />);
  expect(await screen.findByText('Bilan annuel')).toBeInTheDocument();
  expect(screen.getByText('Rendez-vous aujourd\'hui').parentElement).toHaveTextContent('2');   // annulé exclu
  expect(screen.getByText('Demandes à confirmer', { selector: '.stat span' }).parentElement).toHaveTextContent('1');
  expect(await screen.findByText('4,2')).toBeInTheDocument();
  expect(screen.getByText('15 avis')).toBeInTheDocument();
  expect(screen.getByText(/^Prochain$/)).toBeInTheDocument();
  expect(screen.queryByText('Acné')).not.toBeInTheDocument();                                  // annulés masqués par défaut
});

test('regroupe les créneaux libres consécutifs', async () => {
  render(<Planning />);
  expect(await screen.findByText('Disponible · 3 créneaux libres')).toBeInTheDocument();       // 09:00 -> 10:30
  expect(screen.getByText('Disponible · 1 créneau libre')).toBeInTheDocument();                // 14:00
  fireEvent.click(screen.getByLabelText('Afficher les créneaux libres'));
  await waitFor(() => expect(screen.queryByText(/Disponible ·/)).not.toBeInTheDocument());
});

test('le filtre « Annulés » révèle les rendez-vous annulés', async () => {
  render(<Planning />);
  await screen.findByText('Bilan annuel');
  fireEvent.click(screen.getByRole('button', { name: /Annulés/ }));
  expect(await screen.findByText('Acné')).toBeInTheDocument();
  expect(screen.queryByText('Bilan annuel')).not.toBeInTheDocument();
});

test('un clic sur une demande en attente affiche le jour concerné', async () => {
  render(<Planning />);
  const panel = (await screen.findByText('Demandes à confirmer', { selector: 'h2' })).closest('section');
  fireEvent.click(within(panel).getByTitle('Afficher ce jour'));
  expect(await screen.findAllByText('Vaccin de rappel')).not.toHaveLength(0);
});
