# 3. Design Decisions

Each decision lists the choice, why it was made, the alternatives considered, and the trade-off accepted.

## 3.1 Technology stack

| # | Decision | Rationale | Alternatives considered | Trade-off |
|---|---|---|---|---|
| D1 | **React 19 + Vite** single-page app | The brief asks for an SPA. React is widely known, and Vite gives fast builds and a dev proxy to the API. | Angular, Vue, server-rendered pages | Client-side rendering only; acceptable for an internal tool. |
| D2 | **Node.js + Express 5** REST API | Streams large files well; same language as the frontend; Express 5 handles async errors natively. | Spring Boot, .NET, FastAPI | Fewer built-in enterprise features than Spring or .NET, so security, logging and validation are added through middleware. |
| D3 | **MongoDB (Mongoose 8)** | Fast unordered bulk upserts for large feeds; compound indexes fit the search patterns; scales out by sharding on store or region. Mongoose provides schemas. | PostgreSQL | Fewer relational guarantees. Mitigated with a unique compound key and schema validation. PostgreSQL would also be a valid choice. |
| D4 | **zod** for request validation | Declarative schemas that both validate and normalise input and produce field-level errors. | Hand-written checks, Joi | Small extra dependency. |

## 3.2 Data and integrity

| # | Decision | Rationale | Trade-off |
|---|---|---|---|
| D5 | **Natural key: Store ID + SKU + Date (unique index)** | A store has one price per SKU per effective date. Feeds are upserted on this key, so re-sending a feed updates prices instead of duplicating them. | A second price change on the same day needs a new date, or replaces the earlier one. |
| D6 | **Decimal128 for prices**, returned as strings | Avoids floating-point rounding errors on money. | Client must treat price as a string or decimal value. |
| D7 | **Currency stored per record** (optional CSV column, default USD) | The chain operates in several countries; a bare number is ambiguous. | No currency conversion; that belongs to downstream reporting. |
| D8 | **Uppercase Store ID and SKU; dates as UTC midnight** | Makes matching case-insensitive and avoids time-zone drift between countries. | Original casing of identifiers is not kept. |
| D9 | **Optimistic concurrency (`version` field)** on edits | Several users may edit the same price; a stale save returns `409` instead of silently overwriting. No locks are held. | The user must reload and re-apply their change on conflict. |
| D10 | **Edits send only changed fields (PATCH)**; key collisions return `409` | Smaller requests; an edit cannot silently merge two records. | None significant. |

## 3.3 Ingestion

| # | Decision | Rationale | Trade-off |
|---|---|---|---|
| D11 | **Streaming CSV parse (csv-parse) from a temp file** | Memory stays flat regardless of file size (50 MB limit, configurable). | The temp file needs local disk space. |
| D12 | **Batched unordered `bulkWrite` upserts (1,000 rows, configurable)** | Far fewer database round trips; one bad row does not stop the batch. | Partial success is possible, so every outcome is recorded on the upload. |
| D13 | **Row-level validation: keep valid rows, report invalid ones by line number** | One bad row should not block a 100,000-row feed. Users can fix and re-upload only the bad rows. | Feed may be applied partially; status `completed_with_errors` makes this visible. |
| D14 | **Asynchronous processing with `202 Accepted` and status polling** | The HTTP request returns quickly; large feeds do not hit proxy timeouts; progress is visible. | In the prototype, processing runs in the API process. Production moves it to a queue and workers (see NFRs). |
| D15 | **Duplicate-file detection (SHA-256 checksum)** with explicit `force` override | Stops the same feed being processed twice by accident; the override allows a deliberate reprocess. | Same content under a different file name is still treated as a duplicate (intended). |
| D16 | **Tolerant header mapping** (`Store ID`, `store_id` and `StoreId` all accepted; extra columns ignored) | Stores in different countries may export slightly different headers. | Missing required columns fail the whole upload with a clear message. |
| D17 | **Last row wins** for duplicate keys within a feed | Predictable and matches "latest line is the correction". | Earlier duplicates are not reported as errors. |

## 3.4 Search and user experience

| # | Decision | Rationale | Trade-off |
|---|---|---|---|
| D18 | **Indexed filters:** exact or list Store ID, SKU prefix, date range | Common queries ("store X", "SKU Y in all stores", "prices for a week") use indexes. | SKU search is prefix-only, not "contains". |
| D19 | **Product-name "contains" search (escaped regex)** | Users often know only part of a name. | Not index-backed; at scale it should move to a text or search index (see NFRs). |
| D20 | **Server-side pagination (max 200 per page) with a stable sort** (`_id` tie-breaker) | Bounded response size; rows don't repeat or go missing between pages. | Offset pagination slows on very deep pages; cursor pagination is the next step. |
| D21 | **Search state kept in the URL** | Searches can be bookmarked and shared, and survive a refresh. | None significant. |
| D22 | **After an upload, open the search filtered to that upload** | User can immediately check what the feed changed. | Needs the `source.uploadId` index. |

## 3.5 API and operations

| # | Decision | Rationale | Trade-off |
|---|---|---|---|
| D23 | **Stateless API** (no server sessions) | Any instance can serve any request, so the API scales out behind a load balancer. | Background ingestion state lives in the database. |
| D24 | **Consistent error format** `{ error: { code, message, details, requestId } }` | The UI can show field-level messages; support can trace a request by its ID. | None significant. |
| D25 | **Security and operations middleware:** helmet, CORS allow-list, rate limiting, body and upload size limits, structured logs (pino) with request IDs, `/health` and `/ready`, graceful shutdown | Baseline production hygiene, cheap to add. | Authentication is not implemented in the prototype (see [Assumptions](05-assumptions.md)). |
| D26 | **Configuration via environment variables** | Twelve-factor style; the same build runs in every environment. | None significant. |
