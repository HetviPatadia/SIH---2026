from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database.connection import get_db
from backend.app.database.models import (
    Project,
    RiskScore,
    ProjectFinancial,
    RiskPriorityEnum,
)

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies & KPI Summary"])

@router.get("/summary")
def get_anomaly_summary(db: Session = Depends(get_db)):
    total_projects = db.query(Project).count()

    # Priority counts
    priority_counts = {
        "LOW": db.query(RiskScore).filter(RiskScore.priority_level == RiskPriorityEnum.LOW).count(),
        "MEDIUM": db.query(RiskScore).filter(RiskScore.priority_level == RiskPriorityEnum.MEDIUM).count(),
        "HIGH": db.query(RiskScore).filter(RiskScore.priority_level == RiskPriorityEnum.HIGH).count(),
        "CRITICAL": db.query(RiskScore).filter(RiskScore.priority_level == RiskPriorityEnum.CRITICAL).count(),
    }

    high_priority_total = priority_counts["HIGH"] + priority_counts["CRITICAL"]

    # Financial aggregates
    total_sanctioned = db.query(func.sum(ProjectFinancial.sanctioned_amount)).scalar() or 0.0
    total_expenditure = db.query(func.sum(ProjectFinancial.expenditure)).scalar() or 0.0

    # Sector breakdown of high priority flags
    sector_flags = (
        db.query(Project.sector, func.count(Project.id))
        .join(RiskScore)
        .filter(RiskScore.priority_level.in_([RiskPriorityEnum.HIGH, RiskPriorityEnum.CRITICAL]))
        .group_by(Project.sector)
        .order_by(func.count(Project.id).desc())
        .limit(5)
        .all()
    )

    return {
        "total_projects": total_projects,
        "high_priority_flags": high_priority_total,
        "priority_breakdown": priority_counts,
        "financials": {
            "total_sanctioned_funds": round(total_sanctioned, 2),
            "total_expenditure": round(total_expenditure, 2),
            "overall_utilization_ratio": round((total_expenditure / total_sanctioned) if total_sanctioned > 0 else 0.0, 2),
        },
        "top_flagged_sectors": [{"sector": s, "flagged_count": c} for s, c in sector_flags],
    }
