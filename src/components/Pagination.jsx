export default function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <span className="muted">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="pagination-controls">
        {onPageSize && (
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Rows per page">
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
        <button className="btn" disabled={page <= 1} onClick={() => onPage(1)}>
          «
        </button>
        <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹ Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button className="btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next ›
        </button>
        <button className="btn" disabled={page >= totalPages} onClick={() => onPage(totalPages)}>
          »
        </button>
      </div>
    </div>
  );
}
