import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination, StatusBadge } from './ui';

test('Pagination : navigation et bornes', () => {
  const onChange = vi.fn();
  render(<Pagination page={1} size={10} total={25} onChange={onChange} />);
  expect(screen.getByText('Page 1 sur 3')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Précédent' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
  expect(onChange).toHaveBeenCalledWith(2);
});

test('StatusBadge affiche le libellé français', () => {
  render(<StatusBadge status="CONFIRMED" />);
  expect(screen.getByText('Confirmé')).toBeInTheDocument();
});
