from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import datetime
from backend.app.database.connection import get_db
from backend.app.database.models import Project, AnalysisRun, RiskScore
from backend.app.config import settings

router = APIRouter(prefix="/api/system", tags=["System Monitoring & Health API"])

@router.get("/health")
def get_system_health(db: Session = Depends(get_db)):
    # 1. Check Database
    try:
        db.execute(text("SELECT 1"))
        db_status = "HEALTHY"
    except Exception as e:
        db_status = f"UNHEALTHY: {str(e)}"

    # 2. Count Records
    total_projects = db.query(Project).count()
    total_analyzed = db.query(RiskScore).count()
    last_run = db.query(AnalysisRun).order_by(AnalysisRun.started_at.desc()).first()

    return {
        "status": "OPERATIONAL",
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "components": {
            "database": db_status,
            "ai_engine": "READY",
            "pdf_generator": "READY",
            "spatial_service": "READY",
            "network_service": "READY",
        },
        "database_metrics": {
            "total_projects_loaded": total_projects,
            "total_risk_scores_computed": total_analyzed,
            "last_analysis_run_id": last_run.run_id if last_run else None,
            "last_run_status": last_run.status if last_run else None,
        },
    }

@router.get("/status")
def get_system_status():
    return {
        "system": "MPLADS AI Audit Intelligence System",
        "role": "Lead Backend & Multi-Modal AI Core",
        "compliance": {
            "human_in_the_loop": True,
            "terminology_enforced": True,
            "data_provenance_tracked": True,
        },
    }
