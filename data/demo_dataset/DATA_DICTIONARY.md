# Data Dictionary: MPLADS Synthetic Demonstration Dataset (v1.0)

This document provides a comprehensive technical schema for all 6 relational CSV files comprising the SIH 2026 MPLADS Audit Intelligence demonstration dataset.

---

## 1. `projects.csv` (1,000 Records)
Primary table containing core project metadata, administrative sanctions, locations, finances, lifecycle timelines, and contractor assignments.

| Column Name | Data Type | Nullable | Constraints / Format | Description & Example Values |
| :--- | :--- | :---: | :--- | :--- |
| `project_id` | String(64) | No | Primary Key, `MPLADS-DEMO-\d{6}` | Unique identifier for the public work (e.g. `MPLADS-DEMO-000042`). |
| `dataset_version` | String(32) | No | `DEMO-SYNTHETIC-v1` | Provenance identifier indicating synthetic demo version. |
| `data_source_type` | String(32) | No | `SYNTHETIC_DEMONSTRATION` | Declaration that the record is simulated for Hackathon testing. |
| `source_basis` | String(32) | No | `MPLADS_STYLE_STRUCTURE` | Structural basis following eSAKSHI/MPLADS reporting standards. |
| `state` | String(64) | No | 1 of 10 Indian States | State where work was executed (e.g. `Gujarat`, `Maharashtra`, `Uttar Pradesh`). |
| `district` | String(64) | No | 1 of 30 Districts | District jurisdiction (e.g. `Rajkot`, `Nagpur`, `Varanasi`). |
| `constituency` | String(64) | No | Parliamentary Constituency | Lok Sabha constituency (e.g. `Ahmedabad West`, `Jaipur`). |
| `mp_name` | String(128) | No | Standardized Fictional Name | Simulated representative name (e.g. `Representative Rajkot (Simulated)`). |
| `sector` | String(64) | No | 1 of 7 Defined Sectors | Development category (e.g. `Rural Connectivity & Roads`, `Renewable Energy`). |
| `title` | String(255) | No | Title-cased text | Short title describing the asset (e.g. `Construction of Community Hall at Village-12`). |
| `description` | Text | No | Free text | Detailed scope of work including engineering specifications and materials. |
| `block` | String(64) | No | `Block-\d+` | Administrative block within the district (e.g. `Block-3`). |
| `village` | String(64) | No | `Village-\d+` or Village name | Habitation / village location (e.g. `Village-Sundarpur`, `Village-77`). |
| `latitude` | Float | No | 8.0 to 37.0 (6 decimal places) | Registered GPS latitude coordinate of the project asset site. |
| `longitude` | Float | No | 68.0 to 97.0 (6 decimal places) | Registered GPS longitude coordinate of the project asset site. |
| `has_valid_coords` | Boolean | No | `True` | Indicator if spatial coordinates are verified within India bounds. |
| `sanctioned_amount`| Float | No | $\ge 0.0$, in Indian Rupees (INR) | Total administrative sanctioned amount (e.g. `1800000.0` = ₹18 Lakhs). |
| `estimated_cost` | Float | No | $\ge 0.0$, INR | Preliminary technical estimate of the work. |
| `expenditure` | Float | No | $\le \text{sanctioned\_amount}$, INR | Total recorded public expenditure to date. |
| `unspent_balance` | Float | No | `= \text{sanctioned} - \text{expenditure}` | Residual allocated funds remaining unspent in project account. |
| `recommendation_date`| String | No | ISO 8601 Date (`YYYY-MM-DD`) | Date when MP recommended the work to District Authority. |
| `sanction_date` | String | No | ISO 8601 Date (`YYYY-MM-DD`) | Date of formal Administrative Sanction issued by District Collector. |
| `start_date` | String | No | ISO 8601 Date (`YYYY-MM-DD`) | Date when physical ground execution commenced. |
| `completion_date` | String | Yes | ISO 8601 Date or empty string | Date of physical completion (empty for "In Progress" works). |
| `status` | String(32) | No | `Completed`, `In Progress` | Current project execution status. |
| `contractor_id` | String(32) | No | Foreign Key to `contractors.csv` | Identifier of the awarded contractor (e.g. `CONTRACTOR-DEMO-0001`). |
| `contractor_name` | String(128) | No | Name matching `contractors.csv` | Trade name of the construction enterprise. |
| `implementing_agency`| String(128) | No | 1 of 6 Govt Agencies | Agency executing the work (e.g. `Public Works Department (PWD)`). |

---

## 2. `contractors.csv` (200 Records)
Master registry of synthetic commercial contracting entities, registration identifiers, and aggregated dataset exposure metrics.

| Column Name | Data Type | Nullable | Constraints / Format | Description & Example Values |
| :--- | :--- | :---: | :--- | :--- |
| `contractor_id` | String(32) | No | Primary Key, `CONTRACTOR-DEMO-\d{4}` | Unique vendor identifier (e.g. `CONTRACTOR-DEMO-0001`). |
| `contractor_name` | String(128) | No | Unique Business Name | Legal business name (e.g. `Apex Infrastructure Ltd`). |
| `registration_no` | String(64) | No | `REG-[A-Z]{2}-\d{4}-\d{4}` | Government commercial registration number (e.g. `REG-GJ-2018-8472`). |
| `entity_type` | String(32) | No | `CONTRACTOR` | Entity category in the relational knowledge graph. |
| `primary_district` | String(64) | No | District name | Headquarter / principal place of business. |
| `primary_state` | String(64) | No | State name | State where vendor is registered. |
| `incorporation_year`| Integer | No | 2010 to 2021 | Year of legal incorporation. |
| `contact_email` | String(128) | No | Valid email format | Synthetic operational contact email (e.g. `contact@apexinfra-demo.in`). |
| `total_projects_count`| Integer | No | $\ge 0$ | Total number of projects awarded to this vendor across dataset. |
| `total_sanctioned_amount`| Float | No | $\ge 0.0$, INR | Cumulative value of public works sanctioned to this vendor. |

---

## 3. `tenders.csv` (2,000 Records)
Public procurement tracking table capturing tender notices, bidding processes, statutory thresholds, and contract awards.

| Column Name | Data Type | Nullable | Constraints / Format | Description & Example Values |
| :--- | :--- | :---: | :--- | :--- |
| `tender_id` | String(32) | No | Primary Key, `TENDER-DEMO-\d{5}` | Unique procurement transaction ID (e.g. `TENDER-DEMO-00001`). |
| `project_id` | String(64) | No | Foreign Key to `projects.csv` | Associated development project ID. |
| `tender_title` | String(255) | No | Descriptive text | Title of the procurement package. |
| `tender_reference_no`| String(64) | No | Standardized NIT/WO ref | Official procurement reference code (e.g. `NIT/RES/RAI/2023/0042`). |
| `procurement_method`| String(64) | No | Defined Method Enum | `Open Tender`, `Limited Tender`, `Quotation / Direct Award`, `E-Procurement`. |
| `tender_stage` | String(64) | No | Defined Stage Enum | `Notice Inviting Tender (NIT)`, `Work Order Issued`. |
| `publishing_date` | String | No | ISO 8601 Date (`YYYY-MM-DD`) | Date when tender was published on public portal. |
| `closing_date` | String | No | ISO 8601 Date (`YYYY-MM-DD`) | Deadline for bidder proposal submission. |
| `award_date` | String | No | ISO 8601 Date (`YYYY-MM-DD`) | Date when evaluation concluded and contract was awarded. |
| `estimated_tender_value`| Float | No | $\ge 0.0$, INR | Benchmark value published in NIT. |
| `awarded_contract_value`| Float | No | $\ge 0.0$, INR | Final accepted contract value awarded to winning contractor. |
| `winning_contractor_id`| String(32) | No | Foreign Key to `contractors.csv` | Awarded vendor entity ID. |
| `winning_contractor_name`| String(128)| No | Contractor Name | Name of the successful bidder. |
| `bidder_count` | Integer | No | $\ge 1$ | Number of participating competitive bidders (1–2 for split/quotation). |
| `status` | String(32) | No | `Completed`, `Awarded` | Stage status of the tender record. |

---

## 4. `evidence.csv` (2,000 Records)
Physical asset evidence table storing geo-tagged site photographs, camera EXIF metadata, cryptographic hashes, and spatial distance checks.

| Column Name | Data Type | Nullable | Constraints / Format | Description & Example Values |
| :--- | :--- | :---: | :--- | :--- |
| `evidence_id` | String(32) | No | Primary Key, `EV-DEMO-\d{5}` | Unique evidence artifact ID (e.g. `EV-DEMO-00001`). |
| `project_id` | String(64) | No | Foreign Key to `projects.csv` | Development project associated with the evidence. |
| `evidence_type` | String(32) | No | Defined Evidence Enum | `PROGRESS_PHOTO`, `COMPLETION_PHOTO`, `SITE_IMAGE`. |
| `title` | String(255) | No | Descriptive text | Title of the asset photograph record. |
| `file_name` | String(128) | No | Image file name | Standard filename (e.g. `MPLADS-DEMO-000001_verification_stage.jpg`). |
| `mime_type` | String(32) | No | `image/jpeg` | Media type of the photographic asset. |
| `file_size_bytes` | Integer | No | Typically 150,000 to 500,000 | Simulated image file size in bytes. |
| `sha256_hash` | String(64) | No | 64 Hex characters | Cryptographic SHA-256 hash. Identical hashes indicate exact photo reuse. |
| `phash` | String(16) | No | 16 Hex characters | Perceptual 64-bit hash. Hamming distance $\le 4$ indicates near-duplicate reuse. |
| `capture_timestamp`| String | No | ISO Timestamp (`YYYY-MM-DD HH:MM:SS`)| Camera EXIF recorded timestamp of exposure. |
| `gps_latitude` | Float | No | 8.0 to 37.0 (6 decimal places) | Camera EXIF GPS recorded latitude. |
| `gps_longitude` | Float | No | 68.0 to 97.0 (6 decimal places) | Camera EXIF GPS recorded longitude. |
| `gps_distance_to_project_m`| Float | No | $\ge 0.0$, in meters | Great-circle Haversine distance between photo GPS and registered project site. |
| `device_make` | String(64) | No | Camera / Mobile make | Device manufacturer (e.g. `Samsung`, `Xiaomi`, `Apple`). |
| `device_model` | String(64) | No | Device hardware model | Model name (e.g. `SM-A525F`, `Redmi Note 11`, `iPhone 13`). |
| `source` | String(64) | No | Upload Channel | e.g. `eSAKSHI Mobile App`. |

---

## 5. `investigations.csv` (120 Records)
Case management and workflow review table recording audit desk reviews, escalations, and human-in-the-loop decisions.

| Column Name | Data Type | Nullable | Constraints / Format | Description & Example Values |
| :--- | :--- | :---: | :--- | :--- |
| `case_id` | String(32) | No | Primary Key, `CASE-MPLADS-DEMO-\d{6}`| Unique investigation case identifier (e.g. `CASE-MPLADS-DEMO-000001`). |
| `project_id` | String(64) | No | Foreign Key to `projects.csv` | Project under audit review. |
| `case_title` | String(255) | No | Descriptive title | Summary title of the audit case. |
| `assigned_to` | String(64) | No | Auditor Username | Username of assigned reviewer (e.g. `auditor_verma`, `senior_auditor_patel`). |
| `status` | String(32) | No | Investigation Status Enum | `NEW`, `UNDER_REVIEW`, `VERIFICATION_REQUIRED`, `VERIFIED`, `DISMISSED`, `ESCALATED`, `CLOSED`. |
| `priority` | String(32) | No | Priority Enum | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. |
| `created_at` | String | No | ISO 8601 Datetime | Date and time when the investigation case was opened. |
| `updated_at` | String | No | ISO 8601 Datetime | Date and time of most recent workflow action or status update. |
| `review_category` | String(64) | No | Operational Category | e.g. `Multi-Modal Compound Risk Review`, `High-Priority Anomaly Review`, `Routine Quality Audit Sample`. |

---

## 6. `investigation_notes.csv` (310 Records)
Detailed chronological ledger of observations, evidentiary exhibits examined, field verification orders, and formal audit findings.

| Column Name | Data Type | Nullable | Constraints / Format | Description & Example Values |
| :--- | :--- | :---: | :--- | :--- |
| `note_id` | String(32) | No | Primary Key, `NOTE-DEMO-\d{6}` | Unique identifier for the audit note. |
| `case_id` | String(32) | No | Foreign Key to `investigations.csv`| Associated investigation case ID. |
| `author` | String(128) | No | Full Name & Title | Auditor name and official designation (e.g. `R. Verma (Auditor)`). |
| `author_role` | String(64) | No | Role Enum | `AUDITOR`, `SENIOR_AUDITOR`, `LEAD_INVESTIGATOR`, `DISTRICT_OFFICER`. |
| `created_at` | String | No | ISO 8601 Datetime | Timestamp when observation was entered into system. |
| `note_text` | Text | No | Substantive narrative | Detailed audit finding using non-accusatory, evidence-based terminology. |
| `action_taken` | String(128) | No | Specific Action Taken | Administrative action (e.g. `Dispatched field verification notice to district executive engineer`). |
