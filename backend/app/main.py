from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os

from backend.app.config import settings
from backend.app.database.connection import engine, Base
from backend.app.api import (
    auth,
    projects,
    anomalies,
    maps,
    network,
    explanations,
    reports,
    investigations,
    data,
    system,
    evidence,
    analysis,
    copilot,
    public_assistant,
    public_locations,
    public_grievances,
    public_reviews,
)

from backend.app.utils.logger import logger
from sqlalchemy import inspect, text

# Initialize database schema tables and ensure legacy citizen_grievances has ticket_number column
with engine.connect() as conn:
    inspector = inspect(conn)
    if "citizen_grievances" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("citizen_grievances")]
        if "ticket_number" not in columns:
            conn.execute(text("DROP TABLE citizen_grievances"))
            conn.commit()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "**AI-Powered MPLADS Anomaly, Fraud-Risk & Inefficiency Detection System**<br/>"
        "Advanced audit-intelligence platform that analyzes public works data across "
        "spatial, textual, financial, temporal, and contractor network dimensions. "
        "Provides explainable anomaly-priority scores (0–100) to support human administrative verification."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for cross-device frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Domain Routers (Internal Auditor Workspace)
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(anomalies.router)
app.include_router(maps.router)
app.include_router(network.router)
app.include_router(explanations.router)
app.include_router(reports.router)
app.include_router(investigations.router)
app.include_router(data.router)
app.include_router(system.router)
app.include_router(evidence.router)
app.include_router(analysis.router)
app.include_router(copilot.router)

# Register Public Domain Routers (Citizen Discovery & Grievances)
app.include_router(projects.public_router)
app.include_router(public_assistant.router)
app.include_router(public_locations.router)
app.include_router(public_grievances.router)
app.include_router(public_reviews.router)

from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
FRONTEND_INDEX = FRONTEND_DIST / "index.html" if (FRONTEND_DIST / "index.html").exists() else (Path(__file__).resolve().parent.parent.parent / "frontend" / "index.html")

if (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

# Serve public assets (e.g. logos, maps)
for png_file in FRONTEND_DIST.glob("*.png") if FRONTEND_DIST.exists() else []:
    fname = png_file.name
    def _make_handler(f=png_file):
        return lambda: FileResponse(f)
    app.add_api_route(f"/{fname}", _make_handler(), methods=["GET"])

@app.get("/public")
@app.get("/public/{rest_of_path:path}")
@app.get("/dashboard")
@app.get("/reviews")
@app.get("/nexus")
@app.get("/gis")
@app.get("/evidence")
@app.get("/auditor/login")
@app.get("/login")
@app.get("/")
def serve_spa():
    if FRONTEND_INDEX.exists():
        return FileResponse(FRONTEND_INDEX)
    return {"error": "Dashboard template not found"}

if __name__ == "__main__":
    import uvicorn
    # Start server listening on all network interfaces for multi-device access
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
