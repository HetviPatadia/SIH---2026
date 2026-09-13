from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from backend.app.database.connection import get_db
from backend.app.database.models import Project, RiskScore, ProjectFinancial, ProjectEntity, Entity
from ai.explainability.pdf_reporter import AuditPDFReporter

router = APIRouter(prefix="/api/reports", tags=["Audit Reports & PDF API"])
pdf_reporter = AuditPDFReporter()

@router.get("/pdf/{project_id}")
def download_audit_pdf(
    project_id: str,
    auditor_name: str = Query("Authorized Auditor", description="Name of the reviewing officer"),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    risk = db.query(RiskScore).filter(RiskScore.project_id == project_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail=f"No risk score computed for '{project_id}'")

    c_entity = (
        db.query(Entity)
        .join(ProjectEntity, ProjectEntity.entity_id == Entity.entity_id)
        .filter(ProjectEntity.project_id == project_id)
        .first()
    )

    project_data = {
        "project_id": project.project_id,
        "state": project.state,
        "district": project.district,
        "sector": project.sector,
        "sanctioned_amount": project.financial.sanctioned_amount if project.financial else 0.0,
        "contractor_name": c_entity.name if c_entity else "Unspecified Contractor",
    }

    risk_data = {
        "unified_score": risk.unified_score,
        "priority_level": risk.priority_level.value if hasattr(risk.priority_level, "value") else str(risk.priority_level),
        "explanation_summary": risk.explanation_summary,
        "evidence_breakdown": risk.evidence_breakdown or {},
    }

    try:
        pdf_path = pdf_reporter.generate_report(project_id, project_data, risk_data, auditor_name)
        return FileResponse(
            path=str(pdf_path),
            filename=pdf_path.name,
            media_type="application/pdf",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
