# 6. Source Code

The implementation is in two repositories:

| Part | Repository | Stack |
|---|---|---|
| Backend API | https://github.com/shrutibchikkanagi7-glitch/tiger-analytics-backend | Node.js 20+, Express 5, Mongoose 8, MongoDB |
| Frontend SPA | https://github.com/shrutibchikkanagi7-glitch/tiger-analytics-frontend | React 19, React Router 7, Vite |

## 6.1 Run locally

Requires **Node.js 20+**. MongoDB is optional, because the backend can run on an in-memory database.

**Backend:**

```bash
cd backend
npm install
npm run dev:memory        # API on http://localhost:4000 with in-memory MongoDB
# or, with a real MongoDB:
cp .env.example .env      # set MONGO_URI
npm run dev
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api to :4000)
```

Upload `public/sample-prices.csv` from the frontend repository. It contains valid rows in four currencies, plus three invalid rows that show rejected-row reporting.

**Tests:**

```bash
cd backend
npm test
```

## 6.2 Code structure

```text
backend/
├── Dockerfile
├── .env.example                 # All configuration options
├── src/
│   ├── server.js                # Start-up, graceful shutdown
│   ├── app.js                   # Express app: middleware and routes
│   ├── config.js                # Environment-based configuration
│   ├── db.js                    # MongoDB connection and index sync
│   ├── logger.js                # pino structured logger
│   ├── middleware/
│   │   ├── validate.js          # zod request validation
│   │   └── errorHandler.js      # Consistent error responses
│   ├── models/
│   │   ├── PriceRecord.js       # Price schema, unique key and indexes
│   │   └── Upload.js            # Upload status and results
│   ├── routes/
│   │   ├── uploads.js           # POST/GET /api/uploads
│   │   ├── prices.js            # GET/PATCH /api/prices
│   │   └── health.js            # /health, /ready
│   ├── services/
│   │   ├── csvIngest.js         # Streaming parse, row validation, batch upserts
│   │   └── priceService.js      # Search filter building, optimistic-lock updates
│   ├── utils/                   # Date parsing, regex escaping, error helpers
│   └── scripts/dev-memory.js    # Runs the API with in-memory MongoDB
└── test/
    ├── api.test.js              # End-to-end API tests
    └── validateRow.test.js      # CSV header and row validation tests

frontend/
├── nginx.conf                   # Production static hosting and /api proxy
├── vite.config.js               # Dev server and API proxy
├── public/sample-prices.csv
└── src/
    ├── main.jsx, App.jsx        # Bootstrapping and routes (/ and /prices)
    ├── api.js                   # Fetch wrapper; XHR upload with progress
    ├── format.js                # Locale-aware price and date formatting
    ├── pages/
    │   ├── UploadPage.jsx       # Drag-and-drop upload, status polling, results
    │   └── SearchPage.jsx       # Filters, sortable table, URL-based state
    └── components/
        ├── EditPriceModal.jsx   # Edit form with validation and conflict handling
        ├── Modal.jsx
        └── Pagination.jsx
```

## 6.3 Where each requirement is implemented

| Requirement | Implementation |
|---|---|
| Upload and persist CSV feeds | `routes/uploads.js` → `services/csvIngest.js` → `models/PriceRecord.js`; UI in `pages/UploadPage.jsx` |
| Search by different criteria | `routes/prices.js` (search schema) → `services/priceService.js#buildSearchFilter`; UI in `pages/SearchPage.jsx` |
| Edit and save any record | `PATCH /api/prices/:id` → `services/priceService.js#updatePrice`; UI in `components/EditPriceModal.jsx` |
