# Store Pricing Hub

A single-page web application for uploading retail pricing feeds, searching records, and editing prices.

## Functional requirements

- Upload CSV pricing feeds containing Store ID, SKU, Product Name, Price, and Date.
- Persist valid rows and report invalid rows with their line numbers.
- Search pricing records by store ID, SKU, product name, currency, date range, and price range.
- Sort and paginate search results.
- Edit any record and save changes with optimistic concurrency protection.
- Prevent CSV key duplicates when editing records.

## Technology stack

- React 19 and Vite
- Express 5 and Node.js 20+
- MongoDB and Mongoose 8

## Run locally

### Backend

```bash
cd backend
npm install
npm run dev:memory
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Data behavior

- The CSV key is Store ID, SKU, and Date.
- Duplicate rows in the same feed use the last value.
- Identical uploaded files are rejected unless force is used.
- Prices are stored using Decimal128 and returned as strings.
- Invalid rows are retained in the upload result with their line numbers.

## API

### Upload

```http
POST /api/uploads
Content-Type: multipart/form-data
```

Returns HTTP 202 and an upload ID. The client polls the upload until processing finishes.

### Search

```http
GET /api/prices?storeId=S001&sku=SKU-1&dateFrom=2026-10-01&page=1&pageSize=25
```

Supported filters:

- storeId
- sku
- productName
- currency
- dateFrom
- dateTo
- priceMin
- priceMax
- sortBy
- sortDir
- page
- pageSize

### Edit

```http
PATCH /api/prices/:id
Content-Type: application/json
```

The request body must include the current version and the fields to change.

## Tests

```bash
cd backend
npm test
```

The test suite covers CSV validation, duplicate detection, search, optimistic concurrency, duplicate-key prevention, and invalid edits.

## Artifacts

- Context diagram: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Source implementation: [backend](backend) and [frontend](frontend)

## Non-functional requirements

- **Scalability:** Stateless API, async ingestion, batched database writes, compound indexes, and a capped page size.
- **Performance:** Streaming CSV parsing and configurable batch processing.
- **Reliability:** Unique price key, duplicate-file detection, row-level validation, and optimistic concurrency.
- **Data integrity:** Decimal128 prices and strict input validation.
- **Security:** Helmet headers, CORS allow-list, rate limiting, JSON size limits, upload size limits, and CSV-only input filtering.
- **Observability:** Structured request and processing logs with request IDs.
- **Usability:** Drag-and-drop upload, clear rejected-row reporting, sortable tables, pagination, and shareable search URLs.
- **Maintainability:** Route, service, model, and validation separation.
