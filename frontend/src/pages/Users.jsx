import CrudPage from '../components/CrudPage';
import { ROLE_LABEL, ROLE_OPTIONS } from '../utils';

export default function Users() {
  return (
    <CrudPage
      title="Utilisateurs" subtitle="Comptes et rôles de la plateforme." singular="un utilisateur"
      newLabel="Ajouter un utilisateur" path="/users" searchPlaceholder="Nom ou email"
      filters={[{ name: 'role', options: ROLE_OPTIONS, placeholder: 'Tous les rôles' }]}
      columns={[
        { label: 'Nom', render: (u) => <strong>{u.name}</strong> },
        { label: 'Email', key: 'email' },
        { label: 'Rôle', render: (u) => ROLE_LABEL[u.role] },
        { label: 'Compte', render: (u) => (u.active ? 'Actif' : 'Désactivé') },
      ]}
      fields={[
        { name: 'name', label: 'Nom complet', required: true },
        { name: 'email', label: 'Adresse email', type: 'email', required: true },
        { name: 'role', label: 'Rôle', type: 'select', options: ROLE_OPTIONS, required: true },
        { name: 'password', label: 'Mot de passe initial', type: 'password', minLength: 8, required: true, createOnly: true },
        { name: 'active', label: 'Compte actif', type: 'checkbox', default: true },
      ]}
    />
  );
}
