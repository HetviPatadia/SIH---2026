# SIH26102 — AI-Powered MPLADS Anomaly, Fraud-Risk & Inefficiency Detection System

<p align="center">
  <img src="Stitch%20UI-UX/dashboard.png" alt="MPLADS AI Audit Intelligence Dashboard" width="850" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);" />
</p>

<p align="center">
  <strong>Multi-Modal Audit Intelligence & Early-Warning Oversight Layer for MPLADS / eSAKSHI</strong>
</p>

<p align="center">
  <a href="#-quick-start-guide"><img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge" alt="Status" /></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/Backend-FastAPI%200.110-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/Language-TypeScript%20%2B%20Python-blue?style=for-the-badge&logo=python&logoColor=white" alt="TypeScript & Python" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-amber?style=for-the-badge" alt="License" /></a>
  <a href=".github/workflows/ci.yml"><img src="https://img.shields.io/badge/CI-GitHub%20Actions-blueviolet?style=for-the-badge&logo=githubactions&logoColor=white" alt="CI" /></a>
</p>

---

## 📌 Executive Summary

The **Members of Parliament Local Area Development Scheme (MPLADS)** channels substantial central funding into grassroots constituency infrastructure across India. While the Ministry of Statistics and Programme Implementation (**MoSPI**) and the **eSAKSHI** portal maintain transactional records, manual oversight across tens of thousands of concurrent projects presents severe scalability bottlenecks.

**SIH26102** delivers an **AI-driven, multi-modal audit intelligence layer** that acts as an automated early-warning and decision-support system. By triangulating operational signals across financial, geospatial, contractor nexus, procurement, and site photography dimensions, the platform computes an explainable **0–100 Anomaly-Priority Score** to help district collectors and audit teams prioritize on-site physical inspections.

> [!IMPORTANT]  
> **Human-in-the-Loop Philosophy**: The system **never issues automated judicial or criminal accusations of fraud**. Instead, it generates an evidence-backed anomaly priority ranking to help administrative authorities decide *where to dispatch physical verification officers first*.

---

## 📑 Table of Contents

- [Key Features & Innovations](#-key-features--innovations)
- [System Architecture](#-system-architecture)
- [7 Multi-Modal AI Detection Engines](#-7-multi-modal-ai-detection-engines)
- [Interactive UI Walkthrough](#-interactive-ui-walkthrough)
- [Complete Tech Stack](#-complete-tech-stack)
- [Repository Directory Layout](#-repository-directory-layout)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Docker Compose Deployment](#docker-compose-deployment)
- [API Reference Overview](#-api-reference-overview)
- [Documentation Index](#-documentation-index)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [GitHub Upload Guide](#-github-upload-guide)
- [Defensible Presentation Terminology](#-defensible-presentation-terminology)
- [License & Authors](#-license--authors)

---

## 🌟 Key Features & Innovations

- 🎯 **Multi-Modal Risk Fusion**: Synthesizes 7 independent analytical engines into a single, calibrated 0–100 Anomaly-Priority Score with dynamic re-weighting for missing fields.
- 🔍 **Explainable AI (XAI) & SHAP Decomposition**: "WHY FLAGGED?" breakdowns that decompose risk scores into factual, human-readable evidence points.
- 🗺️ **Interactive Geospatial GIS Intelligence**: Leaflet-powered GIS mapping displaying projects, regional clusters, and automated `<150m` buffer conflict detection.
- 🕸️ **Contractor Nexus Network Analytics**: Cytoscape.js bipartite graph analytics detecting contractor monopolies, cartel syndicates, and cross-district clustering.
- 📸 **Evidence Vision & Perceptual Hashing**: Automated `dHash` perceptual difference hashing to detect duplicate/recycled work completion photos across distinct projects.
- 📄 **One-Click Audit Dossier Generation**: High-fidelity, printable PDF audit dossiers compiled dynamically with ReportLab, complete with official seals, financial schedules, and map coordinates.
- 🤖 **Auditor AI Copilot & Citizen Assistant**: Contextual natural language AI assistant providing immediate scheme answers and investigation summaries.
- 👥 **Citizen Transparency & Grievance Portal**: Public-facing discovery portal enabling community members to inspect local projects and submit geotagged complaints.

---

## 🏛️ System Architecture

```
                  eSAKSHI & Public Data (CSV / JSON / API)
                                    │
                                    ▼
         ┌─────────────────────────────────────────────────────┐
         │        Data Ingestion, Checksum & Validation        │
         │  (SHA-256 Provenance, Geographic Normalization)     │
         └──────────────────────────┬──────────────────────────┘
                                    │
                                    ▼
         ┌─────────────────────────────────────────────────────┐
         │         SQLAlchemy Database (SQLite / PostGIS)      │
         └──────────────────────────┬──────────────────────────┘
                                    │
                                    ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │                  7 Multi-Modal AI Detection Engines                 │
 │                                                                     │
 │  1. Financial Outlier (Z-Score, IQR & Isolation Forest)             │
 │  2. Contractor Nexus (Bipartite Graph & Centrality Analytics)       │
 │  3. Spatial GIS (Geodesic Haversine Proximity <150m)                │
 │  4. Split-Tender Engine (Threshold Chunking & Circumvention)        │
 │  5. Evidence Vision (dHash Perceptual Image Fingerprinting)         │
 │  6. NLP Text Similarity (TF-IDF & Cosine Scope Duplication)         │
 │  7. Temporal & Velocity (Disbursement Velocity & Stalled Starts)    │
 └──────────────────────────────────┬──────────────────────────────────┘
                                    │
                                    ▼
         ┌─────────────────────────────────────────────────────┐
         │              Multi-Modal Fusion Engine              │
         │ (Dynamic Normalization • 0–100 Anomaly-Priority)    │
         └──────────────────────────┬──────────────────────────┘
                                    │
                                    ▼
         ┌─────────────────────────────────────────────────────┐
         │         Explainable AI (XAI) & Evidence Ledger      │
         │      (SHAP Feature Attribution • Factual Bullets)   │
         └──────────────────────────┬──────────────────────────┘
                                    │
                                    ▼
         ┌─────────────────────────────────────────────────────┐
         │               FastAPI REST API Layer                │
         │    (JWT RBAC, GIS Endpoints, Copilot, PDF Engine)   │
         └─────────────┬─────────────────────────┬─────────────┘
                       │                         │
                       ▼                         ▼
            Auditor Investigation Suite     Public Citizen Portal
            (React 18 + TS + Tailwind)       (Grievances & Search)
```

---

## 🧠 7 Multi-Modal AI Detection Engines

| # | Engine | Analytical Dimension | Primary Algorithm | Weight |
|---|---|---|---|---|
| **1** | **Financial Outlier** | Cost & Budget | Peer Group Z-Score + Isolation Forest | **20%** |
| **2** | **Contractor Nexus** | Entity Network | NetworkX Bipartite Centrality & Modularity | **20%** |
| **3** | **Spatial GIS** | Geolocation | Geodesic Haversine Pairwise Distance (<150m) | **15%** |
| **4** | **Split-Tender** | Procurement Rules | Statutory Ceiling Windowing & Work Aggregation | **15%** |
| **5** | **Evidence Vision** | Photographic Proof | Perceptual Difference Hashing (`dHash` 64-bit) | **15%** |
| **6** | **NLP Text Similarity** | Work Descriptions | TF-IDF Vectorization & Cosine Distance Matrix | **10%** |
| **7** | **Temporal & Velocity**| Execution Timeline | Milestone Latency & Expenditure Velocity | **5%** |

*For deep mathematical formulations and threshold configurations, see [AI Detection Engines Documentation](docs/AI_DETECTION_ENGINES.md).*

---

## 🖥️ Interactive UI Walkthrough

| Module | Interface Preview | Key Capabilities |
|---|---|---|
| **Auditor Dashboard** | <img src="Stitch%20UI-UX/dashboard.png" width="300" /> | Real-time KPI summaries, risk tier distributions, and top prioritized project queue. |
| **Project Investigation** | <img src="Stitch%20UI-UX/project%20investigations.png" width="300" /> | Detailed case dossier, "WHY FLAGGED?" radar chart, factual evidence logs, and one-click PDF export. |
| **Geospatial GIS** | <img src="Stitch%20UI-UX/gis.png" width="300" /> | Interactive map markers, density clusters, and 150m proximity buffer conflict detection. |
| **Contractor Nexus** | <img src="Stitch%20UI-UX/Nexus%20graph.png" width="300" /> | Interactive graph topology identifying cartel cliques and monopoly entities across districts. |
| **Evidence Intelligence** | <img src="Stitch%20UI-UX/evidence%20comparison.png" width="300" /> | Perceptual visual comparison tool exposing recycled site completion photos. |
| **Public Portal & Reviews** | <img src="Stitch%20UI-UX/reviews.png" width="300" /> | Citizen-facing scheme search, public feedback, and geotagged grievance registration. |

---

## 🛠️ Complete Tech Stack

```
Frontend:
  ├── React 18 (TypeScript)
  ├── Vite (Fast Build Tooling)
  ├── Tailwind CSS (Utility-First Styling)
  ├── Leaflet & React-Leaflet (Interactive GIS Mapping)
  ├── Cytoscape.js & Vis.js (Network Graph Visualizations)
  └── Lucide Icons

Backend & AI Core:
  ├── FastAPI (Asynchronous Python REST Framework)
  ├── SQLAlchemy 2.0 (Relational ORM)
  ├── SQLite (Default Local) / PostgreSQL + PostGIS (Production)
  ├── Scikit-Learn (Isolation Forest, TF-IDF, Preprocessing)
  ├── NetworkX (Graph Analytics & Centrality Metrics)
  ├── Pillow & ImageHash (Perceptual Vision Difference Hashing)
  ├── ReportLab (High-Precision PDF Audit Dossier Generation)
  └── Pytest (Automated Unit & Integration Test Suites)

DevOps & Tooling:
  ├── Docker & Docker Compose
  ├── GitHub Actions CI
  └── Python Virtual Environments
```

---

## 📂 Repository Directory Layout

```text
SIH26102/
├── .github/
│   └── workflows/ci.yml         # Automated GitHub Actions CI workflow
├── ai/                          # 7 Multi-Modal AI Detection Engines
│   ├── contractor/              # Contractor monopoly scoring
│   ├── evidence/                # Image perceptual hashing & EXIF audit
│   ├── explainability/          # SHAP-style feature attribution & facts
│   ├── financial/               # Z-Score, peer IQR & Isolation Forest
│   ├── fusion/                  # Multi-modal dynamic weight fusion engine
│   ├── network/                 # NetworkX bipartite graph & centrality
│   ├── nlp/                     # TF-IDF lexical similarity matrix
│   ├── spatial/                 # Haversine distance & spatial clustering
│   └── temporal/                # Execution delay & velocity spike engine
├── backend/                     # FastAPI Application Backend
│   ├── app/
│   │   ├── api/                 # REST Routers (auth, projects, maps, etc.)
│   │   ├── config.py            # Pydantic environment settings
│   │   ├── database/            # SQLAlchemy models & connection pool
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   └── services/            # Core business logic services
│   ├── data_generator.py        # Synthetic dataset generator
│   └── requirements.txt         # Python dependencies
├── docs/                        # Comprehensive In-Depth Documentation
│   ├── AI_DETECTION_ENGINES.md  # Algorithms, math, and engine heuristics
│   ├── API_REFERENCE.md         # Complete REST API reference catalog
│   ├── GITHUB_UPLOAD_GUIDE.md   # Step-by-step instructions for GitHub upload
│   ├── SETUP_AND_DEPLOYMENT.md  # Local, Docker, and production deployment
│   ├── SYSTEM_ARCHITECTURE.md   # Deep architectural blueprint & schemas
│   └── USER_MANUAL_AND_WORKFLOWS.md # Walkthroughs for each user persona
├── frontend/                    # React 18 + TypeScript + Vite UI
│   ├── src/
│   │   ├── components/          # Reusable UI widgets & layouts
│   │   ├── pages/               # Dashboard, GIS, Nexus, Evidence, etc.
│   │   └── types/               # TypeScript interfaces
│   ├── package.json             # NPM dependencies & scripts
│   └── vite.config.ts           # Vite configuration
├── reports/                     # Cache directory for generated PDF dossiers
├── scripts/                     # Utility and data-seeding scripts
│   ├── generate_synthetic_demo_dataset.py
│   ├── load_demo_dataset.py
│   └── seed_evidence_data.py
├── tests/                       # Pytest automated test suites
├── docker-compose.yml           # Multi-container Docker configuration
├── init_data.py                 # One-click database and sample data initializer
├── .env.example                 # Template environment variables
├── .gitignore                   # Git exclusion rules
├── CONTRIBUTING.md              # Contribution and PR guidelines
├── LICENSE                      # MIT Open Source License
├── SECURITY.md                  # Security and vulnerability reporting policy
└── README.md                    # Project documentation (this file)
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & **npm 9+**
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/mplads-ai-audit.git
cd mplads-ai-audit/SIH26102
```

### 2. Backend Setup
```bash
# 1. Create and activate a Python virtual environment
python -m venv venv

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# 2. Install Python dependencies
pip install -r backend/requirements.txt

# 3. Configure environment settings
cp .env.example .env

# 4. Initialize database and seed 1,000+ realistic demo records
python init_data.py

# 5. Launch the FastAPI server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- API Health Check: [http://localhost:8000/api/system/health](http://localhost:8000/api/system/health)

### 3. Frontend Setup
```bash
# Open a second terminal window
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
- Open Web Application: [http://localhost:5173](http://localhost:5173)

### 4. Docker Compose Deployment
To run everything inside isolated Docker containers:
```bash
docker-compose up --build -d
```
Access the application at `http://localhost:3000` or `http://localhost:5173`.

---

## 📡 API Reference Overview

The backend exposes fully documented REST endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/anomalies/summary` | `GET` | Audit KPI indicators, priority breakdown, fund totals |
| `/api/projects` | `GET` | Filter projects by risk tier, district, sector, page |
| `/api/projects/{id}` | `GET` | Full project profile, financial milestones, contractor details |
| `/api/explanations/{id}` | `GET` | **"WHY FLAGGED?"** SHAP-style decomposition & factual bullets |
| `/api/maps/projects` | `GET` | GeoJSON-ready markers with risk color coding |
| `/api/maps/clusters` | `GET` | Regional geographic hotspots and density summaries |
| `/api/network/graph` | `GET` | Nodes and edges formatted for Cytoscape.js / Vis.js |
| `/api/evidence/compare` | `POST` | Perceptual visual comparison of two site images (`dHash`) |
| `/api/investigations/{id}/status` | `PATCH` | Update audit review status (`UNDER_REVIEW`, `VERIFIED`, etc.) |
| `/api/reports/pdf/{id}` | `GET` | Dynamically generates and downloads printable PDF audit dossier |
| `/api/public/grievances` | `POST` | Citizen geotagged grievance registration endpoint |

*For complete schema specifications and curl examples, see the [API Reference Documentation](docs/API_REFERENCE.md).*

---

## 📚 Documentation Index

For in-depth technical guides, explore the dedicated documentation suite:

- 🏛️ **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)**: Data ingestion pipeline, database models, and end-to-end component flow.
- 🧠 **[AI Detection Engines](docs/AI_DETECTION_ENGINES.md)**: Deep dive into all 7 engines, mathematical formulations, and thresholds.
- 📡 **[API Reference](docs/API_REFERENCE.md)**: Comprehensive REST API schemas, status codes, and curl examples.
- 🚀 **[Setup & Deployment Guide](docs/SETUP_AND_DEPLOYMENT.md)**: Native, Docker, and production deployment instructions.
- 📖 **[User Manual & Workflows](docs/USER_MANUAL_AND_WORKFLOWS.md)**: Operational guides for Auditors, GIS Analysts, and Citizens.
- 📤 **[GitHub Submission Guide](docs/GITHUB_UPLOAD_GUIDE.md)**: Step-by-step instructions for uploading and pushing this repository to GitHub.

---

## 🧪 Testing & Quality Assurance

Run the automated test suite covering all AI engines, API routes, and evidence utilities:

```bash
pytest tests/ -v
```

All tests execute in CI via **GitHub Actions** on every push and pull request.

---

## ⚖️ Defensible Presentation Terminology

When presenting this project at hackathons or to administrative authorities, use defensible, objective phrasing:

| ❌ What NOT to Say | ✅ What to Say |
|---|---|
| *"The AI detected 91% fraud probability"* | *"The project received a 91/100 Anomaly-Priority Score based on compounding cost, spatial, and contractor irregularities."* |
| *"This contractor is corrupt"* | *"Network analysis detected a high concentration pattern: this entity was awarded 38 projects across 3 districts with elevated cost variances."* |
| *"We are replacing eSAKSHI"* | *"eSAKSHI provides the digital monitoring foundation; our system adds an AI audit intelligence layer to tell officers where to look first."* |

---

## 📄 License & Authors

- **License**: Released under the [MIT License](LICENSE).
- **Authors**: SIH26102 Development Team (Smart India Hackathon 2024 Finalist).
- **Acknowledgments**: Built with appreciation for data standards provided by **MoSPI** and **data.gov.in**.
