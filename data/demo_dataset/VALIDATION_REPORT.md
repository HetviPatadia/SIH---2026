# Quality Assurance & Relational Validation Report

**Dataset Version**: `DEMO-SYNTHETIC-v1`  
**Generated Date**: September 2024 (SIH 2026 Prototype Benchmark)  
**Execution Script**: `scripts/validate_demo_dataset.py`  
**Validation Status**: **PASSED (100% INTEGRITY - 0 ERRORS, 0 WARNINGS)**

---

## 1. File Manifest & Storage Metrics

| File Name | Record Count | Column Count | File Size (KB) | Integrity Status |
| :--- | :---: | :---: | :---: | :---: |
| `projects.csv` | 1,000 | 28 | 614.0 KB | Verified |
| `contractors.csv` | 200 | 10 | 27.5 KB | Verified |
| `tenders.csv` | 2,000 | 15 | 581.6 KB | Verified |
| `evidence.csv` | 2,000 | 16 | 643.4 KB | Verified |
| `investigations.csv` | 120 | 9 | 28.7 KB | Verified |
| `investigation_notes.csv` | 310 | 7 | 97.1 KB | Verified |
| **Total / Cumulative** | **5,630** | **85** | **1,992.3 KB (~2.0 MB)** | **100% Verified** |

---

## 2. Primary Key Uniqueness Audit

Every primary key across all 6 relational files was checked for duplicate values:

| Table | Primary Key Field | Tested Records | Duplicate Count | Status |
| :--- | :--- | :---: | :---: | :---: |
| `projects.csv` | `project_id` | 1,000 | **0** | **PASS** |
| `contractors.csv` | `contractor_id` | 200 | **0** | **PASS** |
| `tenders.csv` | `tender_id` | 2,000 | **0** | **PASS** |
| `evidence.csv` | `evidence_id` | 2,000 | **0** | **PASS** |
| `investigations.csv` | `case_id` | 120 | **0** | **PASS** |
| `investigation_notes.csv`| `note_id` | 310 | **0** | **PASS** |

---

## 3. Foreign Key & Relational Referential Integrity

All cross-table foreign key relationships were evaluated against parent tables:

| Source File & Field | Target File & Key | Orphan Record Count | Match Rate | Status |
| :--- | :--- | :---: | :---: | :---: |
| `projects.csv` (`contractor_id`) | `contractors.csv` (`contractor_id`) | **0** | **100.0%** | **PASS** |
| `tenders.csv` (`project_id`) | `projects.csv` (`project_id`) | **0** | **100.0%** | **PASS** |
| `tenders.csv` (`winning_contractor_id`)| `contractors.csv` (`contractor_id`) | **0** | **100.0%** | **PASS** |
| `evidence.csv` (`project_id`) | `projects.csv` (`project_id`) | **0** | **100.0%** | **PASS** |
| `investigations.csv` (`project_id`)| `projects.csv` (`project_id`) | **0** | **100.0%** | **PASS** |
| `investigation_notes.csv` (`case_id`)| `investigations.csv` (`case_id`) | **0** | **100.0%** | **PASS** |

---

## 4. Financial Consistency & Arithmetic Validation

Public financial accounts require strict mathematical consistency across all allocations:

$$\text{expenditure} \le \text{sanctioned\_amount}$$
$$\text{unspent\_balance} = \text{sanctioned\_amount} - \text{expenditure}$$

- **Records Evaluated**: 1,000
- **Negative Sanction Violations**: **0**
- **Negative Expenditure Violations**: **0**
- **Over-Expenditure Violations** ($\text{expenditure} > \text{sanction}$): **0**
- **Unspent Balance Arithmetic Mismatches**: **0**
- **Result**: **PASS (100% Mathematical Consistency)**

---

## 5. Chronological Lifecycle Validation

Every project lifecycle must satisfy chronological sequencing:

$$\text{recommendation\_date} \le \text{sanction\_date} \le \text{start\_date} \le \text{completion\_date}$$

- **Records Evaluated**: 1,000
- **Recommendation after Sanction Violations**: **0**
- **Sanction after Start Date Violations**: **0**
- **Start after Completion Date Violations**: **0**
- **Result**: **PASS (100% Chronological Consistency)**

---

## 6. Geographic Coordinate Integrity

Project sites and evidence coordinates must reside within valid Indian territorial boundaries:

$$\text{Latitude} \in [8.0^{\circ}\text{N}, 37.0^{\circ}\text{N}], \quad \text{Longitude} \in [68.0^{\circ}\text{E}, 97.0^{\circ}\text{E}]$$

- **Projects Coordinates Evaluated**: 1,000 records
- **Invalid Coordinate Count**: **0**
- **Evidence Photos Evaluated**: 2,000 records
- **Invalid Evidence Coordinate Count**: **0**
- **Result**: **PASS (100% Valid Coordinates)**

---

## 7. Absence of Injected Prediction Labels

To ensure algorithmic integrity and prevent data leakage:
- **Evaluated Columns for Prohibited Terms** (`fraud`, `corrupt`, `guilty`, `fraud_probability`, `risk_score`):
- **Injected Prediction Columns Found**: **0**
- **Result**: **PASS (Raw Conditions Only)**

---

## 8. Embedded Anomaly Scenario Verification Metrics

Automated checks confirm that the underlying statistical and physical signatures exist in the raw records:

| Anomaly Pattern | Validation Metric in Raw Data | Verification Result |
| :--- | :--- | :---: |
| **Exact Photographic Hash Collisions** | 18 unique SHA-256 hashes shared across 46 projects | **VERIFIED** |
| **Split-Tender Threshold Proximity** | 44 projects sanctioned between ₹4.80L and ₹5.00L | **VERIFIED** |
| **Syndicate Monopoly Concentration** | Top 3 vendors hold 133 projects combined | **VERIFIED** |
| **Severe Cost Outliers** | 14 solar projects sanctioned at > ₹35.0 Lakhs | **VERIFIED** |
| **Photo GPS Discrepancies** | 10 photos located > 10,000 meters from project site | **VERIFIED** |
| **Temporal Velocity Anomalies** | 8 road projects with 4-day completion duration | **VERIFIED** |

---

## Conclusion & Certification

The synthetic demonstration dataset in `data/demo_dataset/` satisfies all structural, relational, financial, geographic, and algorithmic requirements specified for the **SIH 2026 MPLADS Audit Intelligence Prototype**. It is certified ready for ingestion and demonstration.
