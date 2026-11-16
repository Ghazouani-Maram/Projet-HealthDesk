import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination, RatingInput, Stars, StatusBadge } from './ui';
import { fmtRating, maskName } from '../utils';

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

test('Stars : note accessible et remplissage proportionnel', () => {
  render(<Stars value={4.2} />);
  const stars = screen.getByRole('img', { name: '4.2 sur 5' });
  expect(stars.style.getPropertyValue('--pct')).toBe('84%');
});

test('RatingInput : choisir une note', () => {
  const onChange = vi.fn();
  render(<RatingInput value={0} onChange={onChange} />);
  fireEvent.click(screen.getByRole('radio', { name: '4 sur 5' }));
  expect(onChange).toHaveBeenCalledWith(4);
});

test('fmtRating et maskName', () => {
  expect(fmtRating(4.2)).toBe('4,2');
  expect(fmtRating(null)).toBe('–');
  expect(maskName('Yasmine Khelifi')).toBe('Yasmine K.');
  expect(maskName('Omar')).toBe('Omar');
});
