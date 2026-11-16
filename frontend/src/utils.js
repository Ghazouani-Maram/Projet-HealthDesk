export const ROLE_LABEL = { ADMIN: 'Administrateur', DOCTOR: 'Médecin', PATIENT: 'Patient' };
export const ROLE_OPTIONS = Object.entries(ROLE_LABEL).map(([id, name]) => ({ id, name }));
export const STATUS_LABEL = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  CANCELLED: 'Annulé',
  DONE: 'Terminé',
};

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' }) : '';
// YYYY-MM-DD en heure locale, avec décalage en jours
export const todayISO = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('sv-SE');
};
export const fmtSize = (n) =>
  n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1048576).toFixed(1)} Mo`;

// 4.2 -> « 4,2 »
export const fmtRating = (n) => (n == null ? '–' : Number(n).toFixed(1).replace('.', ','));
// « Yasmine Khelifi » -> « Yasmine K. » (l'auteur d'un avis n'est pas identifié en entier)
export const maskName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : name;
};
// « il y a 2 mois »
export const fmtRelative = (iso) => {
  if (!iso) return '';
  const days = Math.round((new Date(iso) - new Date()) / 864e5);
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  const abs = Math.abs(days);
  if (abs < 1) return "aujourd'hui";
  if (abs < 31) return rtf.format(days, 'day');
  if (abs < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
};

// --- Dates du planning (jours au format YYYY-MM-DD, heure locale) ---
export const isoDate = (d) => d.toLocaleDateString('sv-SE');
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};
// Lundi de la semaine contenant le jour donné
export const startOfWeek = (iso) => addDays(iso, -((new Date(`${iso}T00:00`).getDay() + 6) % 7));
export const hhmm = (iso) => iso.slice(11, 16);
export const addMinutes = (hm, min) => {
  const t = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5)) + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
export const ageFrom = (birthIso) => {
  if (!birthIso) return null;
  const b = new Date(birthIso);
  const n = new Date();
  return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
};
export const avatarHue = (s = '') => [212, 160, 28, 280, 340, 190][[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 6];
// « Aujourd'hui 14:00 », « Demain 09:30 », « lun. 23 nov., 10:00 »
export const fmtWhen = (iso) => {
  const day = iso.slice(0, 10);
  if (day === todayISO()) return `Aujourd'hui ${hhmm(iso)}`;
  if (day === todayISO(1)) return `Demain ${hhmm(iso)}`;
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};
