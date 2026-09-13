# 🏛️ System Architecture — SIH26102 MPLADS AI Audit Intelligence System

This document outlines the architectural blueprint, data flow mechanisms, multi-modal artificial intelligence pipeline, database schemas, and integration points of the **SIH26102 MPLADS AI Audit Intelligence System**.

---

## 🎯 Architecture Vision & Core Principles

The Members of Parliament Local Area Development Scheme (**MPLADS**) finances hundreds of thousands of local infrastructure initiatives across Indian parliamentary constituencies. While the Ministry of Statistics and Programme Implementation (**MoSPI**) and the **eSAKSHI** portal maintain transactional records, manual oversight across thousands of concurrent works is practically impossible for district authorities.

The **SIH26102 System** acts as a **non-intrusive, proactive intelligence and decision-support layer** on top of eSAKSHI:
- **No Accusation Paradigm**: The platform computes an **Anomaly-Priority Score (0–100)** to help district collectors and audit officers prioritize on-site physical inspections, rather than automatically declaring guilt.
- **Multi-Modal Triangulation**: A single indicator (e.g. higher cost) rarely proves fraud; true risk emerges when cost outliers intersect with geographic proximity (<150m), contractor nexus, artificial split tenders, and recycled photo evidence.
- **Explainable AI (XAI)**: Every score is supported by human-readable, factual evidence and SHAP-style feature attributions.

---

## 🏗️ High-Level System Architecture Diagram

```
                       DATA SOURCES & INGESTION
          ┌──────────────────────────────────────────────────┐
          │  • eSAKSHI Master Portal Data (API / JSON / CSV) │
          │  • data.gov.in Datasets                          │
          │  • Citizen Geotagged Grievances & Reviews       │
          └─────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                     DATA INGESTION & PIPELINE
          ┌──────────────────────────────────────────────────┐
          │  1. Ingestion Engine & Checksum Verification     │
          │  2. Data Validation & Quality Scoring            │
          │  3. Geographic Normalization & Entity Resolution │
          └─────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                        PERSISTENCE & STORAGE
          ┌──────────────────────────────────────────────────┐
          │  SQLAlchemy ORM (SQLite / PostgreSQL + PostGIS)  │
          │  • Projects, Works, Financials, Milestones       │
          │  • Contractors, Agencies, Centrality Metrics     │
          │  • Image Hashes, EXIF Geo-Coordinates, Audits    │
          └─────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                 7 MULTI-MODAL AI DETECTION ENGINES
          ┌──────────────────────────────────────────────────┐
          │  [1] Financial Outlier Engine (Z-Score & IF)     │
          │  [2] Temporal & Velocity Engine (Spending Spikes)│
          │  [3] NLP Text Similarity (TF-IDF Lexical Redund.)│
          │  [4] Split-Tendering Engine (Threshold Chunking) │
          │  [5] Spatial GIS Engine (Haversine Buffers <150m)│
          │  [6] Entity Network Graph (Centrality & Nexus)   │
          │  [7] Evidence Vision Engine (dHash Image Reuse)  │
          └─────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                  MULTI-MODAL RISK FUSION ENGINE
          ┌──────────────────────────────────────────────────┐
          │  • Dynamic Re-weighting for missing modalities   │
          │  • Unified Anomaly-Priority Score (0–100)        │
          │  • Categorization: LOW | MEDIUM | HIGH | CRITICAL│
          └─────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                   EXPLAINABILITY (XAI) LAYER
          ┌──────────────────────────────────────────────────┐
          │  • SHAP-Style Feature Attribution Decomposition  │
          │  • Human-Readable Evidence Facts Generator       │
          │  • Automated Audit Dossier Compilation           │
          └─────────────────────────┬────────────────────────┘
                                    │
                                    ▼
                      FASTAPI APPLICATION BACKEND
          ┌──────────────────────────────────────────────────┐
          │  • RESTful Endpoints (Projects, Anomalies, Maps) │
          │  • AI Copilot Assistant & Citizen Chatbot        │
          │  • ReportLab Automated PDF Dossier Engine        │
          │  • JWT Authentication & Role-Based Access Control│
          └─────────────┬──────────────────────┬─────────────┘
                        │                      │
                        ▼                      ▼
        INTERNAL AUDIT DASHBOARD         PUBLIC TRANSPARENCY PORTAL
     (React 18 + TS + Tailwind + Leaflet) (Citizen Feedback & Discovery)
```

---

## 🔄 End-to-End Data Lifecycle

### 1. Data Ingestion & Hygiene Layer
- **Raw Ingestion**: Captures raw records from eSAKSHI data exports. Computes cryptographic hashes (SHA-256) to ensure provenance.
- **Validation Engine**: Flags records with missing values, illogical dates (e.g., completion date before sanction date), or negative financial amounts.
- **Geographic Normalizer**: Cleans district names, normalizes administrative boundaries, and validates latitude/longitude boundaries to ensure coordinates fall within Indian territorial boundaries.

### 2. Analytical AI Engines
The project executes 7 independent analytical engines asynchronously across ingested records:
1. **Financial**: Evaluates sector-wise unit cost against peer groups using statistical Z-scores and Isolation Forest.
2. **Temporal**: Measures elapsed days against physical completion percentage and detects abnormal milestone expenditure velocity.
3. **NLP Lexical Similarity**: Evaluates project descriptions across identical districts to flag duplicate or recycled project scopes.
4. **Split-Tendering**: Detects intentional artificial project chunking designed to circumvent statutory tender thresholds (e.g. ₹50 Lakh tender limits).
5. **Spatial GIS**: Calculates geodesic pairwise Haversine distances to identify projects operating within identical spatial footprints (<150m).
6. **Entity Network Graph**: Constructs a bipartite graph between contractors, executing agencies, and constituencies, computing Betweenness and Degree centrality to identify contractor syndicates.
7. **Evidence Vision**: Computes perceptual difference hashes (`dHash`) of site photographs to expose identical site images submitted for distinct projects.

### 3. Multi-Modal Risk Fusion
Outputs from all active engines are collected by the **MultiModalFusionEngine**. If an engine lacks required data (e.g., GPS coordinates missing for spatial analysis), the engine dynamically normalizes the remaining weights so the composite score remains calibrated on a 0–100 scale:

$$\text{Priority Score} = \sum_{m \in \text{Available}} \left( \frac{w_m}{\sum_{k \in \text{Available}} w_k} \times S_m \right)$$

### 4. Human Verification & Audit Case Management
- **Prioritized Queue**: Projects with scores $\ge 80$ are marked as **CRITICAL / HIGH** and pushed to the top of the auditor's dashboard.
- **Audit Dossier**: Instant download of formal PDF audit dossiers containing project summary, financial metrics, spatial map coordinates, network links, and evidence facts.
- **State Machine**: Supports transition through audit stages: `PENDING_REVIEW` $\rightarrow$ `UNDER_INVESTIGATION` $\rightarrow$ `FIELD_VERIFICATION` $\rightarrow$ `RESOLVED / ESCALATED`.

---

## 🗄️ Database Schema Overview

The relational database architecture is modeled with SQLAlchemy:

### Key Tables
1. `projects`: Primary project information (work ID, constituency, district, sector, sanctioned amount, expenditure, dates, status).
2. `project_risk_scores`: Composite anomaly-priority scores, individual domain scores, and risk classifications.
3. `contractors`: Contractor profiles, total awarded contracts, total value, and syndicate risk metrics.
4. `spatial_records`: Geocoded coordinates, constituency boundaries, and geographic cluster IDs.
5. `evidence_records`: Site photographs, inspection logs, perceptual image hashes, and EXIF metadata.
6. `investigations`: Audit cases, assigned auditor IDs, review statuses, notes, and recommendation logs.
7. `citizen_grievances`: Geotagged public complaints, photo evidence, category tags, and resolution tickets.
8. `users`: Administrative user credentials, hashed passwords, and RBAC roles (`SUPER_ADMIN`, `AUDITOR`, `DISTRICT_OFFICER`).

---

## 🛡️ Security & Access Control (RBAC)

- **Authentication**: Stateless JSON Web Tokens (JWT) signed via HMAC-SHA256.
- **Role-Based Access Control**:
  - `AUDITOR`: Access to audit workspaces, risk scores, XAI explanations, network graphs, and PDF dossier generation.
  - `DISTRICT_OFFICER`: View constituent projects, update investigation statuses, and review citizen grievances for their jurisdiction.
  - `PUBLIC`: Open access to public transparency portals, summary statistics, project search, and grievance submission.
- **CORS Configuration**: Explicit allowed origins configured for flexible frontend integration across local networks and reverse proxies.
