import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api.js';
import EditPriceModal from '../components/EditPriceModal.jsx';
import Pagination from '../components/Pagination.jsx';
import { formatDateTime, formatPrice } from '../format.js';

const FILTER_KEYS = ['storeId', 'sku', 'productName', 'currency', 'dateFrom', 'dateTo', 'priceMin', 'priceMax'];
const EMPTY_FILTERS = Object.fromEntries(FILTER_KEYS.map((k) => [k, '']));
const COLUMNS = [
  { key: 'storeId', label: 'Store ID' },
  { key: 'sku', label: 'SKU' },
  { key: 'productName', label: 'Product name' },
  { key: 'price', label: 'Price', num: true },
  { key: 'date', label: 'Date' },
  { key: 'updatedAt', label: 'Last updated' },
];

export default function SearchPage() {
  // The URL is the source of truth for the query so searches are shareable and survive refresh.
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, ...pick(query, FILTER_KEYS) }));
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const queryKey = params.toString();
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await apiFetch('/api/prices', { query: Object.fromEntries(new URLSearchParams(queryKey)) }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    load();
  }, [load]);

  const updateQuery = (patch) => {
    const next = { ...query, ...patch };
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v != null)));
  };

  const submit = (e) => {
    e.preventDefault();
    updateQuery({ ...filters, page: 1 });
  };

  const reset = () => {
    setFilters(EMPTY_FILTERS);
    setParams({});
  };

  const sortBy = query.sortBy || 'date';
  const sortDir = query.sortDir || 'desc';
  const toggleSort = (key) =>
    updateQuery({ sortBy: key, sortDir: sortBy === key && sortDir === 'desc' ? 'asc' : 'desc', page: 1 });

  const onSaved = (updated) => {
    setResult((r) => ({ ...r, items: r.items.map((i) => (i.id === updated.id ? updated : i)) }));
    setEditing(null);
  };

  const field = (key, label, props = {}) => (
    <label>
      {label}
      <input value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <div className="stack">
      <section className="card">
        <h1>Search prices</h1>
        <form className="filters" onSubmit={submit}>
          {field('storeId', 'Store ID(s)', { placeholder: 'Enter Store ID' })}
          {field('sku', 'SKU (starts with)', { placeholder: 'Enter SKU' })}
          {field('productName', 'Product name contains', { placeholder: 'Enter product name' })}
          {field('currency', 'Currency', { placeholder: 'Enter currency', maxLength: 3 })}
          {field('dateFrom', 'Date from', { type: 'date' })}
          {field('dateTo', 'Date to', { type: 'date' })}
          {field('priceMin', 'Min price', { type: 'number', min: 0, step: 'any', placeholder: 'Enter min price' })}
          {field('priceMax', 'Max price', { type: 'number', min: 0, step: 'any', placeholder: 'Enter max price' })}
          <div className="filter-actions">
            <button className="btn btn-primary" type="submit">
              Search
            </button>
            <button className="btn" type="button" onClick={reset}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        {error && (
          <div className="alert alert-error">
            {error.message}
            {error.details?.map((d) => (
              <div key={d.field} className="small">
                {d.field}: {d.message}
              </div>
            ))}
          </div>
        )}
        <div className={`table-wrap ${loading ? 'loading' : ''}`}>
          <table>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.num ? 'num' : ''}>
                    <button className="sort" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      {sortBy === c.key && <span aria-hidden>{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
                    </button>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {result?.items.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="empty">
                    No pricing records match these filters.
                  </td>
                </tr>
              )}
              {result?.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.storeId}</td>
                  <td>
                    <code>{r.sku}</code>
                  </td>
                  <td>{r.productName}</td>
                  <td className="num">{formatPrice(r.price, r.currency)}</td>
                  <td>{r.date}</td>
                  <td>{formatDateTime(r.updatedAt)}</td>
                  <td className="row-actions">
                    <button className="btn btn-small" onClick={() => setEditing(r)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result && (
          <Pagination
            {...result}
            onPage={(page) => updateQuery({ page })}
            onPageSize={(pageSize) => updateQuery({ pageSize, page: 1 })}
          />
        )}
      </section>

      {editing && <EditPriceModal record={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </div>
  );
}

function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => obj[k] != null).map((k) => [k, obj[k]]));
}
