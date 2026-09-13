# 📡 Complete REST API Reference — SIH26102

The **SIH26102 Backend** is built with **FastAPI** and provides high-performance, asynchronous REST endpoints for both the internal administrative audit workspace and the citizen transparency portal.

Interactive documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## 🔐 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/login`
Authenticate administrative auditor and retrieve bearer JWT token.
- **Request Body** (Form-Data or JSON):
  ```json
  {
    "username": "auditor_admin",
    "password": "SecurePassword123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "auditor_admin",
      "role": "AUDITOR",
      "jurisdiction": "All India"
    }
  }
  ```

### `GET /api/auth/me`
Retrieve details of the currently authenticated user session.
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): User object with roles and permissions.

---

## 📊 2. Project Intelligence & Anomaly Endpoints (`/api/projects`, `/api/anomalies`)

### `GET /api/anomalies/summary`
Get macro audit KPI indicators across all analyzed projects.
- **Response** (`200 OK`):
  ```json
  {
    "total_projects": 1240,
    "total_sanctioned_amount_cr": 312.45,
    "priority_breakdown": {
      "critical": 48,
      "high": 126,
      "medium": 380,
      "low": 686
    },
    "anomalies_by_domain": {
      "financial": 94,
      "network": 52,
      "spatial": 41,
      "split_tender": 67,
      "evidence": 28,
      "text": 33,
      "temporal": 79
    }
  }
  ```

### `GET /api/projects`
Search and filter projects across constituencies, risk levels, and sectors.
- **Query Parameters**:
  - `priority` (optional): `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - `district` (optional): Filter by district name
  - `sector` (optional): Filter by work category (e.g. `Education`, `Roads`, `Water`)
  - `min_score` (optional): Minimum anomaly score (0–100)
  - `page` (default: 1), `page_size` (default: 20)
- **Response** (`200 OK`): Paginated project list with calculated priority scores.

### `GET /api/projects/{id}`
Retrieve complete project dossier including financial schedules, contractors, and coordinates.
- **Response** (`200 OK`): Detailed project object.

### `GET /api/projects/high-priority`
Retrieve top 10 most urgent projects requiring physical verification.

---

## 🔍 3. Explainable AI Endpoints (`/api/explanations`)

### `GET /api/explanations/{id}`
Retrieve the comprehensive **"WHY FLAGGED?"** SHAP-style breakdown.
- **Response** (`200 OK`):
  ```json
  {
    "project_id": "MPLADS-2024-MH-0421",
    "composite_priority_score": 88.5,
    "risk_level": "CRITICAL",
    "domain_contributions": {
      "financial": { "score": 92.0, "weight": 0.20, "contribution": 18.4 },
      "spatial": { "score": 85.0, "weight": 0.15, "contribution": 12.75 },
      "network": { "score": 90.0, "weight": 0.20, "contribution": 18.0 },
      "split_tender": { "score": 86.0, "weight": 0.15, "contribution": 12.9 }
    },
    "evidence_facts": [
      "Sanctioned cost is +148% above the peer district median for Rural Roads.",
      "Identified another road project within 85 meters sanctioned within 90 days.",
      "Contractor 'Vanguard Infra' has received 44% of district sector contracts.",
      "Project value (₹24,80,000) sits 0.8% below the ₹25L open-tender ceiling."
    ]
  }
  ```

---

## 🗺️ 4. Geospatial GIS Endpoints (`/api/maps`)

### `GET /api/maps/projects`
Fetch all projects formatted as GeoJSON-ready markers with risk metadata.
- **Response** (`200 OK`):
  ```json
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [73.8567, 18.5204] },
        "properties": {
          "id": "MPLADS-2024-MH-0421",
          "title": "Construction of Community Hall",
          "priority_score": 88.5,
          "risk_color": "#DC2626",
          "district": "Pune",
          "sanction_amount": 2480000
        }
      }
    ]
  }
  ```

### `GET /api/maps/clusters`
Retrieve spatial clusters identifying geographical density hotspots of flagged works.

---

## 🕸️ 5. Entity Network Graph Endpoints (`/api/network`)

### `GET /api/network/graph`
Returns nodes and edges formatted for **Vis.js** / **Cytoscape.js**.
- **Response** (`200 OK`):
  ```json
  {
    "nodes": [
      { "id": "C_104", "label": "Vanguard Infra", "type": "contractor", "centrality": 0.78 },
      { "id": "D_Pune", "label": "District Pune", "type": "district", "centrality": 0.91 }
    ],
    "edges": [
      { "source": "C_104", "target": "D_Pune", "weight": 14, "total_value_cr": 4.8 }
    ]
  }
  ```

### `GET /api/network/contractor/{name}`
Get full portfolio footprint, awarded works, and cross-district connections for a specific contractor.

---

## 📸 6. Evidence Intelligence Endpoints (`/api/evidence`)

### `POST /api/evidence/compare`
Compare two project site images to evaluate perceptual visual similarity.
- **Parameters**: `image_1` (File), `image_2` (File)
- **Response** (`200 OK`):
  ```json
  {
    "perceptual_hash_1": "d4e2a1b9f8c3e0a1",
    "perceptual_hash_2": "d4e2a1b9f8c3e0a3",
    "hamming_distance": 2,
    "is_duplicate": true,
    "confidence": 0.968
  }
  ```

---

## 📋 7. Investigation Workflow Endpoints (`/api/investigations`)

### `GET /api/investigations`
Retrieve all open audit investigation cases.

### `PATCH /api/investigations/{id}/status`
Update the state of an audit review case.
- **Request Body**:
  ```json
  {
    "status": "FIELD_VERIFICATION_SCHEDULED",
    "notes": "Assigned to Assistant Engineer for physical GPS site verification on Monday.",
    "assigned_to": "officer_sharma"
  }
  ```

---

## 📑 8. Audit Dossier PDF Generation (`/api/reports`)

### `GET /api/reports/pdf/{project_id}`
Dynamically generates and returns a formal, printable audit report in PDF format created using ReportLab.
- **Response**: `application/pdf` binary stream with filename `Audit_Dossier_{project_id}.pdf`.

---

## 👥 9. Public Citizen Portal Endpoints (`/api/public/*`)

### `POST /api/public/grievances`
Submit a geotagged citizen grievance or progress complaint.
- **Form Data**: `work_id`, `reporter_name`, `description`, `photo` (File), `latitude`, `longitude`
- **Response** (`201 Created`):
  ```json
  {
    "ticket_number": "GRV-2024-8842",
    "status": "RECEIVED",
    "message": "Grievance registered. You can track status using your ticket number."
  }
  ```

### `POST /api/public/assistant/chat`
Conversational public chatbot answering citizen queries about local constituency development funds.
- **Request Body**: `{"message": "How much fund was spent on schools in Ward 12?"}`
- **Response**: Explanatory conversational response backed by live scheme data.
