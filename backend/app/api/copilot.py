from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.services.copilot_service import InvestigationCopilotService

router = APIRouter(prefix="/api/investigation", tags=["AI Investigation Copilot API"])

copilot_service = InvestigationCopilotService()


class CopilotRequest(BaseModel):
    project_id: str = Field(..., description="Project ID to investigate")
    query: Optional[str] = Field(None, description="Auditor investigation query or prompt")


class CopilotResponse(BaseModel):
    project_id: str
    query: str
    audit_priority_score: float
    priority_level: str
    observations: List[str]
    supporting_signals: List[Union[str, Dict[str, Any]]]
    data_gaps_and_uncertainties: List[str]
    grounded_guideline_clauses: List[Dict[str, Any]]
    recommended_next_checks: List[str]
    disclaimer: str
    generated_at: str


@router.post("/copilot", response_model=CopilotResponse)
def run_investigation_copilot(req: CopilotRequest, db: Session = Depends(get_db)):
    """
    Controlled AI Investigation Copilot:
    Synthesizes project context, contractor longitudinal baseline, price normalization,
    evidence availability, and grounded regulatory guidelines into an actionable audit brief.
    """
    res = copilot_service.synthesize_investigation_brief(req.project_id, req.query, db)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res


@router.get("/{project_id}/context")
def get_investigation_context(project_id: str, db: Session = Depends(get_db)):
    """
    Retrieves all underlying analytical facts and signals assembled for a project.
    """
    ctx = copilot_service.get_project_context(project_id, db)
    if "error" in ctx:
        raise HTTPException(status_code=404, detail=ctx["error"])
    return ctx
