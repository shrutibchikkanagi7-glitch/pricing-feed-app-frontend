# 2. Solution Architecture

## 2.1 Logical architecture

```mermaid
flowchart TB
    subgraph Client["Browser"]
        SPA["React 19 SPA<br/>Upload page · Search page · Edit dialog"]
    end

    subgraph Edge["Web tier"]
        WEB["Static hosting / reverse proxy<br/>(Vite dev server or nginx)"]
    end

    subgraph API["API tier: Node.js 20+ / Express 5 (stateless, horizontally scalable)"]
        MW["Middleware<br/>helmet · CORS · compression · rate limit · request ID · structured logs"]
        UR["Upload routes<br/>/api/uploads"]
        PR["Price routes<br/>/api/prices"]
        ING["CSV ingestion service<br/>stream parse → validate → batch upsert"]
        PS["Price service<br/>search · get · update (optimistic locking)"]
        HR["Health routes<br/>/health · /ready"]
    end

    subgraph Data["Data tier"]
        DB[("MongoDB<br/>pricerecords · uploads")]
        TMP[["Temporary file storage<br/>(uploaded CSVs)"]]
    end

    SPA -->|HTTPS / JSON, multipart| WEB
    WEB -->|/api/*| MW
    MW --> UR & PR
    UR -->|save file| TMP
    UR -->|async| ING
    ING -->|stream| TMP
    ING -->|bulkWrite upserts, 1,000 per batch| DB
    PR --> PS --> DB
    HR --> DB
```

## 2.2 Components

| Component | Responsibility | Key files |
|---|---|---|
| **React SPA** | Upload page with drag-and-drop and progress; search page with filters, sorting and pagination; edit dialog. Search state is kept in the URL. | `frontend/src/pages`, `frontend/src/components` |
| **API client** | Fetch wrapper with consistent error handling; XHR upload so progress can be shown. | `frontend/src/api.js` |
| **Express app** | HTTP middleware, routing and centralised error handling. | `backend/src/app.js`, `middleware/` |
| **Upload routes** | Accept the CSV (multipart), compute a SHA-256 checksum, reject duplicate files, create an `Upload` record, start ingestion and return `202 Accepted`. | `backend/src/routes/uploads.js` |
| **CSV ingestion service** | Streams the file, maps header variants, validates each row, removes duplicate keys within a batch, and upserts in batches. It records progress and rejected rows on the `Upload` record. | `backend/src/services/csvIngest.js` |
| **Price routes and service** | Validate search and edit requests (zod), build indexed queries, paginate, and apply edits with optimistic concurrency. | `backend/src/routes/prices.js`, `services/priceService.js` |
| **MongoDB** | `pricerecords` (one document per store, SKU and date) and `uploads` (upload status and results). | `backend/src/models` |

## 2.3 Key flows

### Upload a pricing feed

```mermaid
sequenceDiagram
    actor U as User
    participant SPA as React SPA
    participant API as Express API
    participant ING as Ingestion service
    participant DB as MongoDB

    U->>SPA: Select / drop CSV
    SPA->>API: POST /api/uploads (multipart, progress shown)
    API->>API: Save to temp file, SHA-256 checksum
    API->>DB: Find upload with same checksum
    alt Duplicate file and not forced
        API-->>SPA: 409 Conflict (offer "process again")
    else New file
        API->>DB: Create Upload (status: queued)
        API-->>SPA: 202 Accepted + upload id
        API->>ING: processUpload (async)
        loop Every 1,000 valid rows
            ING->>DB: bulkWrite upserts on (storeId, sku, date)
            ING->>DB: Update Upload progress counts
        end
        ING->>DB: Upload status = completed / completed_with_errors / failed
        loop Every 1s while queued or processing
            SPA->>API: GET /api/uploads/:id
        end
        SPA->>U: Show counts and rejected rows, open search filtered to this upload
    end
```

### Search and edit a price

```mermaid
sequenceDiagram
    actor U as User
    participant SPA as React SPA
    participant API as Express API
    participant DB as MongoDB

    U->>SPA: Enter filters, sort, page
    SPA->>API: GET /api/prices?storeId=…&sku=…&page=…
    API->>DB: find(filter).sort().skip().limit() + countDocuments
    API-->>SPA: { items, page, pageSize, total, totalPages }
    U->>SPA: Edit record, Save
    SPA->>API: PATCH /api/prices/:id { version, changed fields }
    API->>DB: findOneAndUpdate({ _id, version }, $set, $inc version)
    alt Version matches
        API-->>SPA: 200 updated record
    else Changed by someone else
        API-->>SPA: 409 Conflict (offer "load latest version")
    else Store ID + SKU + Date already used
        API-->>SPA: 409 Conflict
    end
```

## 2.4 API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/uploads[?force=true]` | Upload a CSV feed. Returns `202` with the upload record. |
| `GET` | `/api/uploads` | List uploads (paginated). |
| `GET` | `/api/uploads/:id` | Upload status, counts and rejected rows. |
| `GET` | `/api/prices` | Search. Filters: `storeId` (comma-separated list), `sku` (prefix), `productName` (contains), `currency`, `dateFrom`, `dateTo`, `priceMin`, `priceMax`, `uploadId`. Also `sortBy`, `sortDir`, `page`, `pageSize`. |
| `GET` | `/api/prices/:id` | Get one record. |
| `PATCH` | `/api/prices/:id` | Edit a record. The body includes `version` plus the changed fields. |
| `GET` | `/health`, `/ready` | Liveness and readiness (database connected). |

## 2.5 Data model

```mermaid
erDiagram
    UPLOAD ||--o{ PRICE_RECORD : "last written by"
    PRICE_RECORD {
        ObjectId _id
        string storeId "uppercase, unique key part"
        string sku "uppercase, unique key part"
        string productName
        Decimal128 price
        string currency "ISO 4217, default USD"
        Date date "UTC midnight, unique key part"
        int version "optimistic locking"
        object source "type upload|manual, uploadId"
        Date createdAt
        Date updatedAt
    }
    UPLOAD {
        ObjectId _id
        string fileName
        int sizeBytes
        string checksum "SHA-256"
        string status "queued|processing|completed|completed_with_errors|failed"
        int totalRows
        int insertedCount
        int updatedCount
        int errorCount
        array rowErrors "first 500: row, message"
        string failureReason
        Date startedAt
        Date finishedAt
    }
```

**Indexes on `pricerecords`:**

| Index | Serves |
|---|---|
| `{ storeId, sku, date }` (unique) | Natural key and upserts; store-level searches |
| `{ sku, date }` | One SKU across all stores |
| `{ date, storeId }` | Date-range searches and the default sort |
| `{ source.uploadId }` | "Records from this upload" view |

## 2.6 Deployment view

```mermaid
flowchart LR
    U[Users] --> LB[Load balancer / CDN<br/>TLS termination]
    LB --> W[Static SPA<br/>nginx / CDN]
    LB --> A1[API instance 1]
    LB --> A2[API instance N]
    A1 & A2 --> RS[(MongoDB replica set)]
```

**Prototype:**
- The API runs as a single Node.js process. The backend `Dockerfile` builds it.
- `npm run dev:memory` starts it with an in-memory MongoDB for local review.
- The SPA is served by Vite in development, or as static files behind nginx (`frontend/nginx.conf`).

**Production target:**
- Multiple stateless API instances behind a load balancer.
- A MongoDB replica set.
- The SPA served from a CDN.
- Production evolution is described in [Non-Functional Requirements](04-non-functional-requirements.md).
