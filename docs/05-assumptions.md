# 5. Assumptions

## 5.1 CSV feed format

1. Each file has a **header row**. Required columns are **Store ID, SKU, Product Name, Price, Date**.
2. Header names are matched case- and punctuation-insensitively, so `Store ID`, `store_id` and `StoreId` are all accepted. Extra columns are ignored.
3. **Currency** is an optional column holding a 3-letter ISO 4217 code. If it's missing, the default is `USD` (configurable via `DEFAULT_CURRENCY`).
4. **Date** is the price's effective date, in `YYYY-MM-DD` (or `YYYY/MM/DD`) format. It has no time or time zone.
5. **Price** is a non-negative number with up to 4 decimal places. Thousands separators (`1,299.50`) are accepted.
6. Store IDs and SKUs are alphanumeric codes; `.`, `_` and `-` are also allowed. Store IDs can be up to 32 characters and SKUs up to 64. Both are case-insensitive and stored in uppercase.
7. Files are UTF-8 (with or without a byte-order mark), comma-delimited, and at most **50 MB** (configurable).
8. One file can contain rows for many stores, so both per-store and regional feeds are supported.

## 5.2 Business rules

1. A price is uniquely identified by **Store ID + SKU + Date**. A row with an existing key **updates** that record.
2. Feeds are **partial updates**: records missing from a feed are not deleted.
3. If the same key appears more than once in a feed, the **last row wins**.
4. Invalid rows are skipped and reported by line number; valid rows in the same file are still saved.
5. Uploading a file with the same contents as an earlier upload is treated as a mistake and blocked, unless the user explicitly chooses to process it again.
6. Any record field can be edited, including the key fields, as long as the result doesn't collide with another record.
7. Store and product master data (store list, product catalogue) are owned by other systems. A Store ID or SKU in a feed is not checked against a master list.
8. No currency conversion and no tax calculation.

## 5.3 Users and security

1. Users are internal employees on the corporate network or VPN.
2. **Authentication and authorisation are out of scope for the prototype.** Production would use the corporate SSO (OIDC or SAML) with role- and store-scoped access (see [NFRs](04-non-functional-requirements.md)).
3. All users of the prototype can upload, search and edit every record.

## 5.4 Scale and environment

1. About 3,000 stores, ~10–20k active SKUs per store, and roughly one feed per store per day (see [sizing](04-non-functional-requirements.md#41-expected-load-sizing-basis)).
2. Users run current versions of Chrome, Edge, Firefox or Safari.
3. The prototype runs as a single API instance with one MongoDB. The production topology is described in the NFRs but not built.
4. MongoDB 7+ and Node.js 20+ are available, or the in-memory MongoDB script is used for local review.
