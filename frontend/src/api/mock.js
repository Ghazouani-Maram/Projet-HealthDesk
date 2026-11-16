// Mode démo : API simulée en mémoire (VITE_DEMO=true). Aucune donnée n'est conservée au rechargement.
import { maskName, todayISO } from '../utils';

export class MockError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const day = (o, hm) => `${todayISO(o)}T${hm}:00`;
const ago = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 19);
const db = {
  seq: 100,
  specialties: [
    { id: 1, name: 'Médecine générale', description: 'Suivi et consultations courantes' },
    { id: 2, name: 'Cardiologie', description: 'Cœur et système cardiovasculaire' },
    { id: 3, name: 'Dermatologie', description: 'Peau, cheveux et ongles' },
    { id: 4, name: 'Pédiatrie', description: "Santé de l'enfant" },
  ],
  doctors: [
    { id: 1, name: 'Dr Salma Ben Ali', email: 'medecin@demo.tn', phone: '71 000 001', specialtyId: 1 },
    { id: 2, name: 'Dr Karim Trabelsi', email: 'k.trabelsi@demo.tn', phone: '71 000 002', specialtyId: 2 },
    { id: 3, name: 'Dr Ines Gharbi', email: 'i.gharbi@demo.tn', phone: '71 000 003', specialtyId: 3 },
    { id: 4, name: 'Dr Mehdi Jlassi', email: 'm.jlassi@demo.tn', phone: '71 000 004', specialtyId: 4 },
    { id: 5, name: 'Dr Rania Mansour', email: 'r.mansour@demo.tn', phone: '71 000 005', specialtyId: 2 },
  ],
  patients: [
    { id: 1, name: 'Yasmine Khelifi', email: 'patient@demo.tn', phone: '20 111 001', birthDate: '1998-04-12' },
    { id: 2, name: 'Omar Bouzid', email: 'o.bouzid@demo.tn', phone: '20 111 002', birthDate: '1985-09-30' },
    { id: 3, name: 'Leila Chaabane', email: 'l.chaabane@demo.tn', phone: '20 111 003', birthDate: '1972-01-05' },
    { id: 4, name: 'Sami Hamdi', email: 's.hamdi@demo.tn', phone: '20 111 004', birthDate: '2015-06-21' },
  ],
  users: [
    { id: 1, name: 'Administrateur', email: 'admin@demo.tn', role: 'ADMIN', active: true },
    { id: 2, name: 'Dr Salma Ben Ali', email: 'medecin@demo.tn', role: 'DOCTOR', active: true, doctorId: 1 },
    { id: 3, name: 'Yasmine Khelifi', email: 'patient@demo.tn', role: 'PATIENT', active: true, patientId: 1 },
    { id: 4, name: 'Omar Bouzid', email: 'o.bouzid@demo.tn', role: 'PATIENT', active: true, patientId: 2 },
  ],
  appointments: [
    { id: 1, doctorId: 1, patientId: 1, startsAt: day(0, '09:00'), reason: 'Bilan annuel', status: 'CONFIRMED' },
    { id: 2, doctorId: 1, patientId: 2, startsAt: day(0, '10:30'), reason: 'Maux de dos persistants', status: 'PENDING' },
    { id: 3, doctorId: 2, patientId: 3, startsAt: day(0, '14:00'), reason: 'Contrôle tension', status: 'CONFIRMED' },
    { id: 4, doctorId: 1, patientId: 3, startsAt: day(1, '09:30'), reason: 'Renouvellement ordonnance', status: 'PENDING' },
    { id: 5, doctorId: 3, patientId: 1, startsAt: day(2, '11:00'), reason: 'Acné', status: 'PENDING' },
    { id: 6, doctorId: 4, patientId: 4, startsAt: day(2, '15:00'), reason: 'Vaccin de rappel', status: 'CONFIRMED' },
    { id: 7, doctorId: 1, patientId: 1, startsAt: day(3, '10:00'), reason: 'Suivi fatigue', status: 'CONFIRMED' },
    { id: 8, doctorId: 2, patientId: 2, startsAt: day(-3, '09:00'), reason: 'Palpitations', status: 'DONE' },
    { id: 9, doctorId: 1, patientId: 2, startsAt: day(-5, '14:30'), reason: 'Certificat médical', status: 'DONE' },
    { id: 10, doctorId: 5, patientId: 3, startsAt: day(-1, '10:00'), reason: 'Électrocardiogramme', status: 'CANCELLED' },
  ],
  // Avis de démonstration (doctorId, patientId, note, commentaire, ancienneté en jours)
  reviews: [
    [1, 3, 5, "Médecin très agréable, consciencieux et à l'écoute. Prend le temps d'expliquer le traitement.", 20],
    [1, 4, 4, 'Consultation claire et rassurante, cabinet bien organisé.', 75],
    [2, 3, 4, "Très compétent, il a pris le temps de bien m'expliquer mes résultats.", 40],
    [2, 4, 5, null, 130],
    [3, 1, 5, 'Diagnostic précis et traitement efficace, je recommande.', 12],
    [3, 2, 3, 'Bon médecin mais la consultation était un peu rapide.', 95],
    [3, 3, 4, 'Ponctuel et professionnel.', 210],
    [4, 1, 4, 'Très doux avec les enfants.', 33],
    [4, 3, 5, 'Excellent pédiatre, patient et rassurant pour les parents.', 160],
    [5, 2, 2, "Attente interminable, les horaires ne sont pas respectés. Pas très à l'écoute, diagnostic approximatif dans mon cas.", 52],
    [5, 1, 4, 'Médecin sérieux, explications claires.', 180],
  ].map(([doctorId, patientId, rating, comment, d], i) => ({ id: i + 1, doctorId, patientId, rating, comment, createdAt: ago(d) })),
  documents: [
    { id: 1, title: 'Analyse de sang', patientId: 1, size: 245000, createdAt: day(-4, '08:00') },
    { id: 2, title: 'Radio du genou', patientId: 2, size: 1800000, createdAt: day(-2, '08:00') },
  ],
};

const SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'];
const ok = (v) => JSON.parse(JSON.stringify(v));
const has = (s, q) => !q || String(s ?? '').toLowerCase().includes(String(q).toLowerCase());
const page = (arr, p) => {
  const size = +p.size || 8;
  const n = +p.page || 1;
  return { items: ok(arr.slice((n - 1) * size, n * size)), total: arr.length };
};
const spec = (id) => db.specialties.find((s) => s.id == id);
const rating = (id) => {
  const r = db.reviews.filter((x) => x.doctorId == id);
  return { avg: r.length ? Math.round((r.reduce((s, x) => s + x.rating, 0) / r.length) * 10) / 10 : null, count: r.length };
};
const doc = (id) => { const d = db.doctors.find((x) => x.id == id); return { ...d, specialty: spec(d.specialtyId), rating: rating(id) }; };
const pat = (id) => db.patients.find((x) => x.id == id);
const view = (a) => ({ ...a, doctor: doc(a.doctorId), patient: pat(a.patientId) });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, doctorId: u.doctorId, patientId: u.patientId });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function handle({ method, path, params = {}, body, token }) {
  await sleep(120);
  const [, res, id, sub] = path.split('/');
  const me = db.users.find((u) => `demo-${u.id}` === token);

  if (res === 'auth') {
    if (id === 'login') {
      const u = db.users.find((x) => x.email === body.email);
      if (!u || !u.active) throw new MockError(401, 'Identifiants invalides');
      return { token: `demo-${u.id}`, user: publicUser(u) };
    }
    if (id === 'register') {
      const pid = ++db.seq;
      db.patients.push({ id: pid, name: body.name, email: body.email });
      db.users.push({ id: pid, name: body.name, email: body.email, role: 'PATIENT', active: true, patientId: pid });
      return {};
    }
    if (!me) throw new MockError(401, 'Session expirée');
    return publicUser(me);
  }
  if (!me) throw new MockError(401, 'Session expirée');

  if (res === 'stats') {
    const appts = db.appointments;
    const byStatus = { PENDING: 0, CONFIRMED: 0, CANCELLED: 0, DONE: 0 };
    const bySpec = {};
    appts.forEach((a) => {
      byStatus[a.status]++;
      const n = doc(a.doctorId).specialty.name;
      bySpec[n] = (bySpec[n] || 0) + 1;
    });
    return {
      patients: db.patients.length, doctors: db.doctors.length, specialties: db.specialties.length,
      appointmentsToday: appts.filter((a) => a.startsAt.startsWith(todayISO())).length,
      appointmentsPending: byStatus.PENDING, byStatus,
      topSpecialties: Object.entries(bySpec).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    };
  }

  if (res === 'doctors' && sub === 'reviews') {
    const mine = me.role === 'PATIENT' ? me.patientId : null;
    const done = mine && db.appointments.some((a) => a.doctorId == id && a.patientId === mine && a.status === 'DONE');
    const state = () => (me.role !== 'PATIENT' ? null
      : db.reviews.some((r) => r.doctorId == id && r.patientId === mine) ? 'ALREADY_REVIEWED' : done ? 'CAN_REVIEW' : 'NEEDS_VISIT');
    const out = (r) => ({ id: r.id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, author: maskName(pat(r.patientId).name), mine: r.patientId === mine });
    if (method === 'POST') {
      if (me.role !== 'PATIENT') throw new MockError(403, 'Accès refusé pour votre rôle');
      if (state() === 'ALREADY_REVIEWED') throw new MockError(409, 'Vous avez déjà donné votre avis sur ce médecin');
      if (state() !== 'CAN_REVIEW') throw new MockError(403, 'Vous pouvez donner votre avis après une consultation terminée avec ce médecin');
      const r = { id: ++db.seq, doctorId: +id, patientId: mine, rating: +body.rating, comment: (body.comment || '').trim() || null, createdAt: ago(0) };
      db.reviews.push(r);
      return out(r);
    }
    const all = db.reviews.filter((r) => r.doctorId == id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    all.forEach((r) => { distribution[r.rating]++; });
    const p = page(all, params);
    return { items: p.items.map(out), total: p.total, summary: { ...rating(id), distribution }, reviewState: state() };
  }
  if (res === 'reviews' && method === 'DELETE') {
    const r = db.reviews.find((x) => x.id == id);
    if (!r || (me.role === 'PATIENT' && r.patientId !== me.patientId)) throw new MockError(404, 'Avis introuvable');
    db.reviews = db.reviews.filter((x) => x.id != id);
    return null;
  }

  if (res === 'doctors' && sub === 'slots') {
    const taken = db.appointments.filter((a) => a.doctorId == id && a.status !== 'CANCELLED' && a.startsAt.startsWith(params.date)).map((a) => a.startsAt.slice(11, 16));
    return SLOTS.filter((s) => !taken.includes(s));
  }

  if (res === 'appointments') {
    if (method === 'GET') {
      let list = db.appointments.filter((a) => {
        if (me.role === 'PATIENT' && a.patientId !== me.patientId) return false;
        if (me.role === 'DOCTOR' && a.doctorId !== me.doctorId) return false;
        if (params.status && a.status !== params.status) return false;
        if (params.from && a.startsAt.slice(0, 10) < params.from) return false;
        if (params.to && a.startsAt.slice(0, 10) > params.to) return false;
        return has(pat(a.patientId).name + doc(a.doctorId).name, params.search);
      });
      list = list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const p = page(list, params);
      return { ...p, items: p.items.map(view) };
    }
    if (method === 'POST') {
      const patientId = me.role === 'PATIENT' ? me.patientId : +body.patientId;
      if (db.appointments.some((a) => a.doctorId == body.doctorId && a.startsAt === body.startsAt && a.status !== 'CANCELLED'))
        throw new MockError(409, 'Ce créneau vient d’être réservé. Choisissez-en un autre.');
      db.appointments.push({ id: ++db.seq, doctorId: +body.doctorId, patientId, startsAt: body.startsAt, reason: body.reason, status: 'PENDING' });
      return {};
    }
    if (method === 'PATCH') { db.appointments.find((a) => a.id == id).status = body.status; return {}; }
    if (method === 'DELETE') { db.appointments = db.appointments.filter((a) => a.id != id); return null; }
  }

  if (res === 'documents') {
    if (sub === 'file') return new Blob(['Document de démonstration'], { type: 'text/plain' });
    if (method === 'GET') {
      const list = db.documents.filter((d) => (me.role === 'PATIENT' ? d.patientId === me.patientId : !params.patientId || d.patientId == params.patientId));
      const p = page(list, params);
      return { ...p, items: p.items.map((d) => ({ ...d, patient: pat(d.patientId) })) };
    }
    if (method === 'POST') {
      const f = body.get('file');
      db.documents.unshift({ id: ++db.seq, title: body.get('title'), size: f.size, createdAt: new Date().toISOString(), patientId: me.role === 'PATIENT' ? me.patientId : +body.get('patientId') });
      return {};
    }
    if (method === 'DELETE') { db.documents = db.documents.filter((d) => d.id != id); return null; }
  }

  // Ressources CRUD génériques : specialties, doctors, patients, users
  if (db[res] && ['specialties', 'doctors', 'patients', 'users'].includes(res)) {
    const table = db[res];
    if (method === 'GET') {
      const list = table.filter((r) => (has(r.name, params.search) || has(r.email, params.search))
        && (!params.specialtyId || r.specialtyId == params.specialtyId) && (!params.role || r.role === params.role));
      const p = page(list, params);
      p.items = p.items.map((r) => (res === 'doctors' ? doc(r.id) : res === 'specialties' ? { ...r, doctorsCount: db.doctors.filter((d) => d.specialtyId === r.id).length } : r));
      return p;
    }
    if (method === 'POST') { table.push({ ...body, id: ++db.seq, specialtyId: body.specialtyId ? +body.specialtyId : undefined }); return {}; }
    if (method === 'PUT') { Object.assign(table.find((r) => r.id == id), body, body.specialtyId ? { specialtyId: +body.specialtyId } : {}); return {}; }
    if (method === 'DELETE') { db[res] = table.filter((r) => r.id != id); return null; }
  }
  throw new MockError(404, 'Route inconnue en mode démo');
}
