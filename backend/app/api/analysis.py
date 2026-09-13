from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import datetime

from backend.app.database.connection import get_db
from backend.app.database.models import AnalysisRun

router = APIRouter(prefix="/api/analysis", tags=["Analysis Run Provenance API"])

class AnalysisRunResponse(BaseModel):
    id: int
    run_id: str
    dataset_version: Optional[str] = None
    model_version: Optional[str] = None
    status: str
    total_analyzed: int
    anomalies_flagged: int
    started_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    configuration: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

@router.get("/runs", response_model=List[AnalysisRunResponse])
def list_analysis_runs(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(AnalysisRun)
    if status:
        query = query.filter(AnalysisRun.status == status.upper())
    runs = query.order_by(AnalysisRun.started_at.desc()).limit(limit).all()
    return runs

@router.get("/runs/{run_id}", response_model=AnalysisRunResponse)
def get_analysis_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AnalysisRun).filter(AnalysisRun.run_id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Analysis run '{run_id}' not found")
    return run
