# 🚀 Setup & Deployment Guide — SIH26102

This guide provides comprehensive instructions for running the **SIH26102 MPLADS AI Audit Intelligence System** locally, in Docker, or deploying to a production server.

---

## 💻 System Prerequisites

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **OS** | Windows 10/11, Ubuntu 20.04+, macOS 12+ | Ubuntu 22.04 LTS or Windows 11 |
| **Python** | Python 3.10 | Python 3.11 |
| **Node.js** | Node.js 18.x LTS | Node.js 20.x LTS |
| **RAM** | 8 GB | 16 GB |
| **Disk Space** | 2 GB free | 5 GB free |
| **Docker (Optional)** | Docker Desktop 4.x / Engine 24+ | Docker Compose v2 |

---

## 🛠️ Option 1: Native Local Installation (Recommended for Development)

### Step 1: Clone the Repository
```bash
git clone https://github.com/<your-username>/mplads-ai-audit.git
cd mplads-ai-audit/SIH26102
```

### Step 2: Set Up Backend

1. **Create and Activate Python Virtual Environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

2. **Install Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy the example configuration:
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `copy .env.example .env`)*

4. **Initialize Database & Seed Data**:
   ```bash
   python init_data.py
   ```
   *This initializes the SQLite database (`mplads_audit.db`) and seeds 1,000+ realistic simulated MPLADS development works, complete with geographic coordinates, contractor records, and anomaly signatures.*

5. **Start the FastAPI Backend Server**:
   ```bash
   python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Verify backend:
   - API Docs: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/api/system/health`

---

### Step 3: Set Up Frontend

1. **Open a new terminal window** and navigate to the frontend directory:
   ```bash
   cd SIH26102/frontend
   ```

2. **Install Node Packages**:
   ```bash
   npm install
   ```

3. **Configure Frontend Environment**:
   Create a `.env` file in the `frontend` folder:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

4. **Start the Vite Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser to: `http://localhost:5173`

---

## 🐳 Option 2: Docker Compose Deployment

You can run the entire stack (FastAPI backend + Nginx-served frontend + persistent volume) using Docker:

1. **Build and Run Containers**:
   ```bash
   docker-compose up --build -d
   ```

2. **View Running Services**:
   ```bash
   docker-compose ps
   ```

3. **Access Services**:
   - Application Web UI: `http://localhost:3000` or `http://localhost:5173`
   - Backend API Docs: `http://localhost:8000/docs`

4. **Stop Containers**:
   ```bash
   docker-compose down
   ```

---

## 🌐 Connecting Frontend from Another Device (e.g. Hackathon Demo)

The backend server is bound to `0.0.0.0`, meaning it accepts connections across your local network:

### Method A: Local Wi-Fi / Hotspot
1. Find your backend machine's local IP address:
   - **Windows**: Run `ipconfig` (look for `IPv4 Address`, e.g. `192.168.1.35`)
   - **Linux/macOS**: Run `ifconfig` or `ip a`
2. On your teammate's device, set their `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://192.168.1.35:8000/api
   ```
3. Your teammate starts their frontend with `npm run dev -- --host` and can connect seamlessly.

### Method B: Cloud Public Tunnel (Ngrok / Cloudflare)
Use the included automated tunnel scripts or run ngrok directly:
```bash
ngrok http 8000
```
Update your frontend `.env`:
```env
VITE_API_BASE_URL=https://<your-ngrok-subdomain>.ngrok-free.app/api
```

---

## ⚙️ Environment Variables Explained

| Variable | Default Value | Description |
|---|---|---|
| `PROJECT_NAME` | `SIH26102 — MPLADS AI Audit Intelligence System` | System identifier in logs and API docs |
| `ENVIRONMENT` | `development` | `development` or `production` |
| `DATABASE_URL` | `sqlite:///./mplads_audit.db` | Database connection string. Use `postgresql://...` for PostgreSQL |
| `SECRET_KEY` | *(Random hex string)* | Key used to sign JWT tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` (8 hours) | Expiry duration for authenticated auditor sessions |
| `THRESHOLD_LOW` | `30` | Lower threshold for low anomaly score |
| `THRESHOLD_MEDIUM` | `60` | Threshold separating low and medium risk |
| `THRESHOLD_HIGH` | `80` | Threshold triggering prioritized audit review |
| `THRESHOLD_CRITICAL` | `100` | Upper ceiling for high/critical priority |
| `REPORTS_DIR` | `./reports` | Target folder where generated PDF dossiers are cached |

---

## 🔧 Troubleshooting & FAQ

### 1. `ModuleNotFoundError: No module named 'backend'`
Ensure you are running uvicorn from the `SIH26102` root directory, not from inside the `backend` folder:
```bash
cd SIH26102
python -m uvicorn backend.app.main:app --reload
```

### 2. Vite port conflict or connection refused
If port 5173 is in use, Vite will automatically try 5174. If backend connection fails, verify that your backend terminal is running and that CORS allows requests from your Vite port.

### 3. Database is empty
Run the sample data generation script:
```bash
python init_data.py
```
This populates the SQLite database with rich synthetic projects, contractors, and coordinates.
