# 📖 User Manual & Operational Workflows

The **SIH26102 MPLADS AI Audit Intelligence Platform** serves three primary stakeholder groups:
1. **Administrative Auditors & District Collectors** (Oversight, investigation triage, audit dossier generation)
2. **Field Verification Officers** (On-site inspection scheduling, geotagged evidence auditing)
3. **Citizens & Civil Society** (Public transparency, scheme tracking, grievance reporting)

---

## 🧭 System Workflow Overview

```
                         CITIZEN / PUBLIC
                                │
                                ▼
                   Public Transparency Portal
            (Track Ward Works • Submit Grievances)
                                │
                                ▼
                       eSAKSHI & DATA INGESTION
                                │
                                ▼
                    7 AI Detection Engines
            (Cost • Split-Tender • GIS • Vision • Graph)
                                │
                                ▼
                     Multi-Modal Fusion Core
               (0–100 Anomaly-Priority Score)
                                │
                                ▼
                   AUDITOR WORKSPACE & TRIAGE
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
Top Priority List         Interactive GIS        Contractor Nexus
  (Triage high risk)     (<150m Geo-Conflicts)  (Monopoly & Syndicates)
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                  Investigation Case Workflow
               • Review "WHY FLAGGED?" Evidence Facts
               • Verify Perceptual Photo Hashes
               • Assign Field Inspection Officer
                                │
                                ▼
                   One-Click Audit Dossier
                   (Formal ReportLab PDF)
```

---

## 👤 Persona 1: Administrative Auditor & District Collector

### 1. Dashboard & Triage View (`/dashboard`)
Upon logging into the administrative portal, the auditor is presented with high-level KPI cards:
- **Total Sanctioned Capital**: Total funds allocated across all active works.
- **Priority Distribution**: Bar and doughnut metrics segmenting works into **CRITICAL** ($\ge 80$), **HIGH** ($60-79$), **MEDIUM** ($30-59$), and **LOW** ($< 30$).
- **Multi-Modal Breakdown**: Frequency of flagged indicators across the 7 analytical domains.
- **Urgent Verification Table**: Real-time table displaying the top 10 projects requiring immediate inspection.

### 2. Project Investigation Dossier (`/investigations/:id`)
Clicking any project opens the deep investigative workspace:
- **Anomaly Score Gauge**: A circular gauge displaying the 0–100 Anomaly-Priority Score.
- **"WHY FLAGGED?" SHAP Decomposition**:
  - A radar chart visualizing the contribution percentage from each of the 7 engines.
  - Bulleted factual evidence points explaining the mathematical rationale (e.g. *"+142% above peer median"*, *"3 projects within 85m buffer"*).
- **Audit Action Tray**:
  - Update status: `PENDING_REVIEW` $\rightarrow$ `UNDER_INVESTIGATION` $\rightarrow$ `FIELD_INSPECTION` $\rightarrow$ `CLOSED`.
  - Add confidential audit notes and assign inspection officers.
  - **Export PDF Dossier**: Click "Download Official Audit Dossier" to instantly download a formatted PDF with official seals, financial schedules, map markers, and evidence logs.

---

## 🗺️ Persona 2: GIS Spatial & Network Analyst

### 1. Geospatial GIS Intelligence (`/gis`)
- **Map Controls**: Interactive Leaflet interface plotting all projects across the district.
- **Color-Coded Risk Markers**:
  - 🔴 Red: Critical Priority
  - 🟠 Orange: High Priority
  - 🟡 Yellow: Medium Priority
  - 🟢 Green: Low Priority / Normal
- **Overlap Detection Layer**: Enabling the "Proximity Buffer" toggle highlights projects sanctioned within $<150\text{ meters}$ of each other, exposing potential duplicate billing for the same road, school boundary, or borewell.

### 2. Contractor Nexus Graph (`/nexus`)
- **Graph Visualizer**: Interactive network graph rendered with Cytoscape.js / Vis.js.
- **Node Classification**:
  - Purple hexagons: Contractors & Vendors.
  - Blue circles: Executing Agencies & Government Departments.
- **Cluster Highlighting**: Identifies cartel syndicates where a group of contractors exclusively bids across shared administrative jurisdictions.
- **Contractor Profile Inspector**: Clicking any contractor node displays their total won contract volume, win rate, and district dispersion ratio.

### 3. Evidence Visual Intelligence (`/evidence`)
- **Side-by-Side Comparison**: Uploads and compares site inspection photos across two project IDs.
- **Perceptual Difference Hash**: Highlights whether photos are identical or digitally manipulated copies of the same site asset.
- **EXIF Verification**: Cross-checks embedded camera GPS coordinates against project sanction location.

---

## 👥 Persona 3: Citizen & Civil Society Member

### 1. Public Transparency Portal (`/public`)
- **Constituency Search**: Citizens can select their State, District, and Lok Sabha constituency to view all ongoing and completed MPLADS projects.
- **Spending Transparency**: Displays sanctioned vs. disbursed funds for local schools, community halls, roads, and drinking water facilities.

### 2. Geotagged Grievance Registration (`/public/grievances`)
- **Grievance Submission**:
  - Select project or location.
  - Upload on-site photograph.
  - Capture device GPS coordinates.
  - Detail grievance (e.g., *"Borewell sanctioned 8 months ago, but no physical work has commenced"*).
- **Ticket Tracking**: Receive an instant tracking ticket (e.g. `GRV-2024-8842`) to monitor administrative response in real time.

### 3. AI Public Assistant / Chatbot (`/copilot`)
- Citizens can ask natural language questions:
  - *"How much money was spent on roads in Pune district in 2024?"*
  - *"Which contractor was awarded the community hall project in my ward?"*
- The AI assistant synthesizes live database records into easy-to-understand conversational responses.
