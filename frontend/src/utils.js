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
