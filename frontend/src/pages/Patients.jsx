import CrudPage from '../components/CrudPage';
import { fmtDate } from '../utils';

export default function Patients() {
  return (
    <CrudPage
      title="Patients" singular="un patient" newLabel="Ajouter un patient" path="/patients"
      searchPlaceholder="Nom ou email"
      columns={[
        { label: 'Patient', render: (p) => <strong>{p.name}</strong> },
        { label: 'Email', key: 'email' },
        { label: 'Téléphone', key: 'phone' },
        { label: 'Naissance', render: (p) => fmtDate(p.birthDate) },
      ]}
      fields={[
        { name: 'name', label: 'Nom complet', required: true },
        { name: 'email', label: 'Adresse email', type: 'email', required: true },
        { name: 'phone', label: 'Téléphone' },
        { name: 'birthDate', label: 'Date de naissance', type: 'date' },
        { name: 'password', label: 'Mot de passe initial', type: 'password', minLength: 8, required: true, createOnly: true },
      ]}
    />
  );
}
