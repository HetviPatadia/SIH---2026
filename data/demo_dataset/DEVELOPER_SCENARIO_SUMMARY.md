# Developer & Evaluator Scenario Summary: MPLADS Synthetic Demonstration Dataset

This document provides an exhaustive index of the **12 specific anomaly scenarios** embedded within the raw demonstration dataset.

> **EVALUATOR NOTE**: The dataset does **not** contain pre-computed risk labels or fraud classifications. The project IDs below exhibit specific objective data conditions (numerical costs, dates, GPS coordinates, image hashes) that the backend AI analytical engines discover and prioritize for review.

---

## Master Scenario Matrix

| # | Anomaly Scenario | Target Entity / Category | Exemplar Project IDs | Analytical Engine | Raw Data Anomaly Signature |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Low Fund Utilization / Stalled Works** | Public Infrastructure | `MPLADS-DEMO-000051` to `000060` | Financial Engine | Sanctioned ₹55L–₹70L, expenditure < ₹9L (< 15%), duration > 18 months, status "In Progress". |
| **2** | **Severe Cost Inflation / Outlier** | Renewable Energy | `MPLADS-DEMO-000071` to `000082` | Financial Engine | 30 solar street lights sanctioned at ₹45L–₹88L (3.5x–5.2x sector median of ₹6L). |
| **3** | **Temporal Velocity / Unrealistic Speed** | Rural Connectivity | `MPLADS-DEMO-000091` to `000098` | Temporal Engine | Heavy civil road works (₹35L–₹48L) sanctioned, executed, and completed in 4 days. |
| **4** | **High Inception Delay / Execution Stagnation**| Community Infrastructure| `MPLADS-DEMO-000111` to `000120` | Temporal Engine | Administrative sanction issued January 2023; ground work start delayed by 288 days. |
| **5** | **NLP Description Clones across Blocks** | Community Centers | `MPLADS-DEMO-000131` to `000140` | NLP Engine | 100% character-identical technical scope ("Comprehensive modernization...") repeated across distant blocks. |
| **6** | **Spatial Near-Duplicates (< 20m Overlap)** | Community Halls | `MPLADS-DEMO-000151` / `000152`, etc. | Spatial Engine | Two distinct community hall sanctions located ~20 meters apart in the exact same village. |
| **7** | **Contractor Syndicate / High Concentration** | Commercial Monopoly | `CONTRACTOR-DEMO-0001`, `0002` | Nexus Graph Engine | Top 2 vendors monopolize 80 projects across multiple districts while average vendor has 2–4. |
| **8** | **Split Tendering / Procurement Fragmentation**| Paver Roads & Drains | `MPLADS-DEMO-000301` to `000312` | Split-Tender Engine | Clusters of 3 works in same village sanctioned at ₹4.85L–₹4.98L (just below ₹5L ceiling) within 3 days. |
| **9** | **Exact Cryptographic Photo Reuse** | Photographic Evidence | `MPLADS-DEMO-000601` / `000602`, etc. | Evidence Engine | Distinct projects share identical SHA-256 photographic hashes (`EXACT_EVIDENCE_REUSE`). |
| **10** | **Perceptual Photo Near-Duplicate Reuse** | Photographic Evidence | `MPLADS-DEMO-000621` / `000622`, etc. | Evidence Engine | Photographs have perceptual hash Hamming distance $\le 3$, indicating re-cropping / recompression. |
| **11** | **Evidence GPS Discrepancy (> 10 km)** | Field Verification | `MPLADS-DEMO-000641` to `000650` | Evidence Engine | Photo EXIF coordinates located 18 km to 26 km away from the registered physical asset site. |
| **12** | **Multi-Modal Critical Compound Risk** | Combined Infrastructure| `MPLADS-DEMO-000401` to `000430` | Multi-Modal Fusion | Simultaneous split tendering + syndicate contractor monopoly + photo reuse + velocity spike. |

---

## Detailed Scenario Walkthroughs

### Scenario 1: Low Fund Utilization / Stalled Works
- **Projects**: `MPLADS-DEMO-000051` through `MPLADS-DEMO-000060`
- **Underlying Conditions**:
  - `sanctioned_amount`: ₹55,00,000 to ₹70,00,000
  - `expenditure`: ₹4,00,000 to ₹9,00,000 (utilization ratio < 15%)
  - `unspent_balance`: ₹51,00,000 to ₹61,00,000
  - `sanction_date`: `2023-02-15`, `status`: `"In Progress"` (> 18 months active without completion)
- **AI Detection**: Financial Anomaly Engine identifies severe under-utilization and capital stagnation.
- **Auditor Action**: Review why high-value public capital remains locked without commensurate physical execution.

---

### Scenario 2: Severe Cost Outlier / Budget Inflation
- **Projects**: `MPLADS-DEMO-000071` through `MPLADS-DEMO-000082`
- **Underlying Conditions**:
  - `sector`: `"Renewable Energy"`
  - `title`: `"Supply and Erection of 30 Standalone Solar Street Lights in Village-..."`
  - `sanctioned_amount`: ₹45,00,000 to ₹88,00,000 (Sector median across 1,000 projects is ₹6,00,000)
- **AI Detection**: Financial Anomaly Engine detects $Z\text{-score} > 3.8$ against the regional and sectoral distribution.
- **Auditor Action**: Examine Schedule of Rates (SoR) and itemized quotation bills for inflated unit prices.

---

### Scenario 3: Temporal Velocity / Unrealistic Speed
- **Projects**: `MPLADS-DEMO-000091` through `MPLADS-DEMO-000098`
- **Underlying Conditions**:
  - `sanctioned_amount`: ₹35,00,000 to ₹48,00,000
  - `start_date`: `2023-11-05`, `completion_date`: `2023-11-09` (Duration: 4 days)
  - `expenditure`: 100% disbursed in 4 days
- **AI Detection**: Temporal Anomaly Engine flags expenditure velocity exceeding physical feasibility for reinforced road works.
- **Auditor Action**: Request daily site measurement registers and concrete curing inspection reports.

---

### Scenario 4: High Temporal Inception Lag
- **Projects**: `MPLADS-DEMO-000111` through `MPLADS-DEMO-000120`
- **Underlying Conditions**:
  - `sanction_date`: `2023-01-10`, `start_date`: `2023-10-25` (Inception lag: 288 days)
- **AI Detection**: Temporal Engine flags procedural delay between administrative approval and ground mobilization.
- **Auditor Action**: Ascertain whether delay arose from land disputes, tender litigation, or departmental neglect.

---

### Scenario 5: NLP Lexical Description Clones
- **Projects**: `MPLADS-DEMO-000131` through `MPLADS-DEMO-000140`
- **Underlying Conditions**:
  - `district`: `Varanasi`
  - `description`: `"Comprehensive modernization of rural community utility center including high-grade vitrified tile paving, aluminum sliding windows, and specialized electrical conduit installation."`
- **AI Detection**: NLP Engine computes cosine similarity $> 0.96$ using TF-IDF text embeddings.
- **Auditor Action**: Verify whether detailed project reports (DPRs) were customized for actual site needs or copied verbatim across disparate panchayats.

---

### Scenario 6: Spatial Near-Duplicates (< 20m Overlap)
- **Projects**:
  - Pair 1: `MPLADS-DEMO-000151` & `MPLADS-DEMO-000152`
  - Pair 2: `MPLADS-DEMO-000153` & `MPLADS-DEMO-000154`
  - Pair 3: `MPLADS-DEMO-000155` & `MPLADS-DEMO-000156`
- **Underlying Conditions**:
  - Same village (`Village-Ward-10`, etc.)
  - Registered GPS coordinates separated by 0.00018° latitude (~20 meters)
  - Identical scope: "Construction of Community Hall" and "Development of Community Hall"
- **AI Detection**: Spatial Anomaly Engine identifies spatial proximity $< 50\text{m}$ for identical asset categories.
- **Auditor Action**: Inspect whether two separate community halls were legitimately built 20m apart, or if a single physical asset was billed against multiple sanction orders.

---

### Scenario 7: Contractor Syndicate / Monopoly
- **Vendors**:
  - `CONTRACTOR-DEMO-0001` ("Apex Infrastructure Ltd") - 42 projects
  - `CONTRACTOR-DEMO-0002` ("Shree Ganesh Construction Co") - 38 projects
- **Underlying Conditions**:
  - Capture 80 projects across multiple adjacent districts (Rajkot, Nagpur, Varanasi)
  - Cumulative value awarded exceeds ₹18 Crores
- **AI Detection**: Network Graph Engine detects degree centrality, high betweenness, and repeat bidding associations.
- **Auditor Action**: Analyze tender participation logs for cartel behavior, rotating bids, or restrictive qualification criteria.

---

### Scenario 8: Split Tendering / Procurement Fragmentation
- **Projects**:
  - Cluster 1: `MPLADS-DEMO-000301`, `000302`, `000303` (`Village-Sundarpur`, Rajkot)
  - Cluster 2: `MPLADS-DEMO-000304`, `000305`, `000306` (`Village-Ramnagar`, Rajkot)
  - Cluster 3: `MPLADS-DEMO-000307`, `000308`, `000309` (`Village-Shivpur`, Varanasi)
  - Cluster 4: `MPLADS-DEMO-000310`, `000311`, `000312` (`Village-Kalyanpur`, Varanasi)
- **Underlying Conditions**:
  - Each individual work sanctioned between ₹4,85,000 and ₹4,98,000 (right below the statutory ₹5,00,000 ceiling that mandates open competitive e-tendering).
  - Awarded to the same contractor on the same or adjacent dates.
  - Total combined work value is ₹14.6 Lakhs per village.
- **AI Detection**: Split-Tender Engine identifies works within 10% of statutory ceiling with $\ge 2$ peers in the same village and contractor.
- **Auditor Action**: Ascertain whether a single continuous road/drain work was artificially divided into parts to circumvent mandatory competitive e-tendering rules.

---

### Scenario 9: Photographic Evidence Reuse (Exact SHA-256 Collisions)
- **Project Pairs**:
  - Pair 1: `MPLADS-DEMO-000601` & `MPLADS-DEMO-000602`
  - Pair 2: `MPLADS-DEMO-000603` & `MPLADS-DEMO-000604`
  - (8 pairs total = 16 projects)
- **Underlying Conditions**:
  - The completion photograph in `evidence.csv` has the exact same SHA-256 hexadecimal hash across both projects.
- **AI Detection**: Asset Evidence Engine triggers `EXACT_EVIDENCE_REUSE` signal with confidence 100.0%.
- **Auditor Action**: Physical site verification to confirm whether both assets exist or if a single photograph was submitted twice to claim separate disbursements.

---

### Scenario 10: Perceptual Photographic Near-Duplicate Reuse
- **Project Pairs**:
  - Pair 1: `MPLADS-DEMO-000621` & `MPLADS-DEMO-000622`
  - Pair 2: `MPLADS-DEMO-000623` & `MPLADS-DEMO-000624`
  - (6 pairs total = 12 projects)
- **Underlying Conditions**:
  - Perceptual hash Hamming distance $\le 3$ (simulating re-compression, slight cropping, or minor color filtering of the same underlying photograph).
- **AI Detection**: Asset Evidence Engine triggers `POTENTIAL_EVIDENCE_REUSE` via perceptual hash distance matching.
- **Auditor Action**: Compare high-resolution originals for matching architectural and background landmarks.

---

### Scenario 11: Photo GPS Discrepancy (> 10 km Distance)
- **Projects**: `MPLADS-DEMO-000641` through `MPLADS-DEMO-000650`
- **Underlying Conditions**:
  - Project registered coordinates: Centered in designated village.
  - Photograph EXIF GPS coordinates: Located 18.2 km to 25.8 km away (`gps_distance_to_project_m > 18000`).
- **AI Detection**: Evidence Engine triggers `EVIDENCE_LOCATION_INCONSISTENCY` (tolerance threshold: 500 meters).
- **Auditor Action**: Verify whether officer captured photo at an administrative office or incorrect site rather than the physical asset location.

---

### Scenario 12: Multi-Modal Critical Compound Risk
- **Projects**: `MPLADS-DEMO-000401` through `MPLADS-DEMO-000430` (30 Projects)
- **Underlying Conditions**:
  - **Split-Tender Pattern**: Sanctioned at ₹4,92,000–₹4,99,000 in village triplets.
  - **Syndicate Monopoly**: 100% awarded to `CONTRACTOR-DEMO-0001` ("Apex Infrastructure Ltd").
  - **Photographic Hash Collision**: All 3 projects in each triplet share identical SHA-256 completion photo hashes.
  - **Velocity Spike**: 4-day completion duration.
- **AI Detection**: Multi-Modal Fusion Engine combines financial, split-tender, network, and evidence signals, producing an **Audit Priority Score $> 85.0$** (`CRITICAL` priority tier).
- **Auditor Action**: Top-priority joint physical audit involving State Audit Directorate, District Magistrate, and independent technical assessors.
