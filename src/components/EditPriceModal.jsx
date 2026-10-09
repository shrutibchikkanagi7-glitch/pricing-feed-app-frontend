import { useState } from 'react';
import { apiFetch } from '../api.js';
import Modal from './Modal.jsx';

const FIELDS = ['storeId', 'sku', 'productName', 'price', 'currency', 'date'];

function validate(f) {
  const errors = {};
  if (!f.storeId.trim()) errors.storeId = 'Required';
  if (!f.sku.trim()) errors.sku = 'Required';
  if (!f.productName.trim()) errors.productName = 'Required';
  if (!/^\d{1,9}(\.\d{1,4})?$/.test(f.price.trim())) errors.price = 'Enter a non-negative amount (max 4 decimals)';
  if (!/^[A-Za-z]{3}$/.test(f.currency.trim())) errors.currency = '3-letter ISO code';
  if (!f.date) errors.date = 'Required';
  return errors;
}

export default function EditPriceModal({ record, onClose, onSaved }) {
  const [base, setBase] = useState(record);
  const [form, setForm] = useState(() => Object.fromEntries(FIELDS.map((k) => [k, String(record[k] ?? '')])));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const changed = FIELDS.filter((k) => form[k].trim() !== String(base[k] ?? ''));

  const save = async (e) => {
    e?.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length || changed.length === 0) return;
    setSaving(true);
    setServerError(null);
    try {
      const patch = Object.fromEntries(changed.map((k) => [k, form[k].trim()]));
      onSaved(await apiFetch(`/api/prices/${record.id}`, { method: 'PATCH', body: { version: base.version, ...patch } }));
    } catch (err) {
      setServerError(err);
    } finally {
      setSaving(false);
    }
  };

  const reload = async () => {
    const fresh = await apiFetch(`/api/prices/${record.id}`);
    setBase(fresh);
    setForm(Object.fromEntries(FIELDS.map((k) => [k, String(fresh[k] ?? '')])));
    setServerError(null);
  };

  const input = (key, label, props = {}) => (
    <label className={errors[key] ? 'invalid' : ''}>
      {label}
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
      {errors[key] && <span className="field-error">{errors[key]}</span>}
    </label>
  );

  return (
    <Modal
      title="Edit price record"
      onClose={onClose}
      footer={
        <>
          <span className="muted small">{changed.length ? `${changed.length} field(s) changed` : 'No changes'}</span>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving || changed.length === 0} onClick={save}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <form className="form-grid" onSubmit={save}>
        {serverError && (
          <div className="alert alert-error span-2">
            {serverError.message}
            {serverError.details?.map?.((d) => (
              <div key={d.field} className="small">
                {d.field}: {d.message}
              </div>
            ))}
            {serverError.status === 409 && serverError.details?.currentVersion && (
              <button type="button" className="btn btn-small" onClick={reload}>
                Load latest version
              </button>
            )}
          </div>
        )}
        {input('storeId', 'Store ID')}
        {input('sku', 'SKU')}
        <div className="span-2">{input('productName', 'Product name')}</div>
        {input('price', 'Price', { inputMode: 'decimal' })}
        {input('currency', 'Currency', { maxLength: 3 })}
        {input('date', 'Date', { type: 'date' })}
        <div className="muted small">Version {base.version}</div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
