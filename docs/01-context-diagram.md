# 1. Context Diagram

**Store Pricing Hub** lets a retail chain of about 3,000 stores in several countries load store pricing feeds, then find and correct individual prices.

```mermaid
flowchart LR
    subgraph Stores["Retail stores (~3,000, multiple countries)"]
        POS[Store / POS systems]
    end

    PA["Pricing analyst<br/>(HQ or regional)"]
    SM[Store manager]

    SPH["<b>Store Pricing Hub</b><br/>Upload · Search · Edit"]

    DB[("Pricing database<br/>(MongoDB)")]

    POS -- "Export pricing feed (CSV)" --> PA
    PA -- "Upload CSV feed" --> SPH
    PA -- "Search and edit prices" --> SPH
    SM -- "Search and correct store prices" --> SPH
    SPH -- "Upload summary and rejected rows" --> PA
    SPH <-- "Read / write price records" --> DB
```

## Actors and external systems

| Actor / system | Interaction with Store Pricing Hub |
|---|---|
| **Store / POS systems** | Produce pricing feeds as CSV files with Store ID, SKU, Product Name, Price and Date. They do not call the system directly; a user uploads the file. |
| **Pricing analyst** | Uploads feeds, reviews the upload result (inserted, updated and rejected rows), and searches and edits prices across stores. |
| **Store manager** | Searches prices for their store and corrects individual records. |
| **Pricing database** | Stores price records and upload history. |

## System boundary

**Inside the system:**
- CSV upload and validation
- Persistence of price records
- Search with multiple criteria
- Record editing

**Outside the system (assumed to exist elsewhere):**
- Generating feeds at the stores
- Publishing prices back to POS or e-commerce channels
- Corporate identity provider (see [Assumptions](05-assumptions.md))
