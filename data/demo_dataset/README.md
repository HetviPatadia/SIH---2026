# MPLADS Audit Intelligence - Synthetic Demonstration Dataset (v1.0)

> **IMPORTANT DECLARATION: SYNTHETIC DEMONSTRATION DATASET**  
> This dataset has been generated exclusively for algorithmic demonstration, testing, and evaluation of the **Smart India Hackathon (SIH 2026) Prototype `SIH26102`: AI-Powered MPLADS Audit Intelligence & Evidence Verification System**.  
> **This is NOT official Government of India data.** All project titles, contractor entities, personnel names, expenditure records, and evidence photographs are synthetic simulations. No real allegations against any person, Member of Parliament, contractor, or government official are made or implied.  
> The system operates strictly as a **Human-in-the-Loop Audit Prioritization and Investigation Support Tool**. It identifies statistical anomalies and irregular patterns to prioritize human review; it never declares fraud, guilt, or legal liability.

---

## 1. Dataset Overview

The synthetic demonstration dataset models the end-to-end lifecycle of MPLADS (Members of Parliament Local Area Development Scheme) and eSAKSHI-style public infrastructure projects across 10 Indian states and 30 parliamentary constituencies.

### Key Dimensions:
| Entity / Domain | Record Count | File Name | Size |
| :--- | :---: | :--- | :---: |
| **Development Projects** | 1,000 | `projects.csv` | ~614 KB |
| **Contractors / Entities** | 200 | `contractors.csv` | ~28 KB |
| **Tenders & Procurement** | 2,000 | `tenders.csv` | ~582 KB |
| **Physical Evidence & Photo-EXIF** | 2,000 | `evidence.csv` | ~643 KB |
| **Investigation Cases** | 120 | `investigations.csv` | ~29 KB |
| **Auditor Review Notes** | 310 | `investigation_notes.csv` | ~97 KB |

---

## 2. Dataset Philosophy & Design Principles

1. **Zero Injected Prediction Labels**:  
   Unlike superficial mock datasets, this dataset **never** includes artificial labels such as `is_fraud=True`, `fraud_probability=0.94`, or `risk_score=85`. Instead, it embeds the **raw underlying physical, temporal, financial, and spatial conditions** (e.g. repeated SHA-256 hashes, sub-threshold tender values, spatial coordinates within 20m, or 4-day construction velocities) that the AI analytical engines discover autonomously.
2. **100% Relational & Chronological Integrity**:  
   Every foreign key resolves to a valid entity. All dates strictly satisfy the lifecycle condition:  
   $$\text{recommendation\_date} \le \text{sanction\_date} \le \text{start\_date} \le \text{completion\_date}$$  
   All finances satisfy:  
   $$\text{expenditure} \le \text{sanctioned\_amount} \quad \text{and} \quad \text{unspent\_balance} = \text{sanctioned\_amount} - \text{expenditure}$$
3. **Multi-Modal Audit Engine Coverage**:  
   The dataset incorporates 12 underlying anomaly scenarios designed to test:
   - **Financial Anomaly Engine**: Cost outliers, unspent fund stagnation, severe budget variance.
   - **Temporal Velocity Engine**: Unrealistic construction speeds, high inception lags.
   - **NLP Lexical Similarity Engine**: Cloned work descriptions across adjacent villages.
   - **Spatial Deduplication Engine**: Near-duplicate assets within 20–50 meters.
   - **Contractor Nexus Graph Engine**: Syndicate concentration and cross-district monopolies.
   - **Split-Tender Engine**: Fragmentation right below statutory procurement limits (₹5 Lakhs).
   - **Asset Evidence Intelligence**: Perceptual and exact photo reuse, EXIF timestamp drift, GPS distance discrepancies > 10 km.
   - **Multi-Modal Fusion**: Compound risk cases combining 3 or more orthogonal signals.

---

## 3. Dataset Distribution

| Category | Proportion | Projects | Description |
| :--- | :---: | :---: | :--- |
| **Normal Projects** | ~65% | 650 | Standard lifecycle, typical sector costs, independent contractors, distinct photographic evidence matching project GPS within 50m. |
| **Mild Irregularity** | ~15% | 150 | Minor timeline drift (duration 280–380 days), slight budget variance (65–75% utilization), routine administrative delay. |
| **Medium Irregularity** | ~10% | 100 | Stalled works (< 15% spent after 18 months), high inception lag (> 240 days), moderate cost divergence (1.8x–2.3x median). |
| **High-Priority Review** | ~7% | 70 | Split-tender clusters below ₹5L ceiling, severe cost outliers (3.5x–5x median), exact photographic hash collisions, photo GPS discrepancy > 15 km. |
| **Critical Review** | ~3% | 30 | Multi-modal compound patterns: Simultaneous split tendering + syndicate contractor monopoly + identical photographic evidence. |

---

## 4. Geographic Master Coverage

The dataset covers **10 States** and **30 Districts** with authentic centroid coordinates and realistic sub-district village jitter:
1. **Gujarat**: Rajkot, Ahmedabad West, Surat
2. **Maharashtra**: Nagpur, Pune, Nashik
3. **Uttar Pradesh**: Varanasi, Lucknow, Gorakhpur
4. **Rajasthan**: Jaipur, Jodhpur, Udaipur
5. **Madhya Pradesh**: Indore, Bhopal, Jabalpur
6. **Karnataka**: Bengaluru Rural, Mysuru, Dharwad
7. **Tamil Nadu**: Coimbatore, Madurai, Salem
8. **Kerala**: Wayanad, Ernakulam, Kozhikode
9. **Telangana**: Warangal, Nizamabad, Karimnagar
10. **Odisha**: Khordha, Cuttack, Ganjam

---

## 5. How to Regenerate & Validate

To deterministically regenerate the dataset:
```powershell
python scripts/generate_synthetic_demo_dataset.py
```

To run the full automated QA and relational integrity validation suite:
```powershell
python scripts/validate_demo_dataset.py
```

To load the demo dataset directly into the backend SQLite database for live UI demonstration:
```powershell
python scripts/load_demo_dataset.py
```

---

## 6. Responsible & Ethical Use

- **Human-in-the-Loop Standard**: In compliance with public audit norms, outputs from this dataset must always be labeled as **"Audit Priority"**, **"Potential Irregularity"**, or **"Requires Human Verification"**.
- Under no circumstances should algorithmic flags generated from this synthetic dataset be characterized as proof of criminality, corruption, or legal culpability.
