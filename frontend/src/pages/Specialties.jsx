import CrudPage from '../components/CrudPage';

export default function Specialties() {
  return (
    <CrudPage
      title="Spécialités" singular="une spécialité" newLabel="Ajouter une spécialité" path="/specialties"
      searchPlaceholder="Nom de la spécialité"
      columns={[
        { label: 'Spécialité', render: (s) => <strong>{s.name}</strong> },
        { label: 'Description', key: 'description' },
        { label: 'Médecins', key: 'doctorsCount' },
      ]}
      fields={[
        { name: 'name', label: 'Nom', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
      ]}
    />
  );
}
