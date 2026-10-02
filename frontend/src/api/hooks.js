import { useEffect, useState } from 'react';
import { api } from './client';

export function useDebounce(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// Liste paginée : GET path?page=&size=&...filtres -> { items, total }
export function useList(path, filters = {}, size = 8) {
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ items: [], total: 0, loading: true, error: null });
  const key = JSON.stringify(filters);

  useEffect(() => setPage(1), [key]);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(path, { ...filters, page, size })
      .then((d) => alive && setState({ items: d.items, total: d.total, loading: false, error: null }))
      .catch((e) => alive && setState((s) => ({ ...s, loading: false, error: e.message })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, page, size, tick]);

  return { ...state, page, setPage, size, reload: () => setTick((t) => t + 1) };
}
