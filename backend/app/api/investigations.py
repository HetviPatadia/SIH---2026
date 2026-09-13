from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from backend.app.database.connection import get_db
from backend.app.database.models import (
    InvestigationCase,
    InvestigationNote,
    AuditLog,
    InvestigationStatusEnum,
)
from backend.app.schemas.investigation import (
    CaseResponse,
    CaseStatusUpdate,
    NoteCreate,
    NoteResponse,
    CaseAuditTrailItem,
    CaseEventCreate,
    CaseSummaryResponse,
)
from backend.app.database.models import RiskScore, RiskPriorityEnum
from sqlalchemy import func

router = APIRouter(prefix="/api/investigations", tags=["Investigation Workflow API"])

@router.get("/summary", response_model=CaseSummaryResponse)
def get_investigations_summary(db: Session = Depends(get_db)):
    # Group counts of investigation cases by status
    status_counts = (
        db.query(InvestigationCase.status, func.count(InvestigationCase.id))
        .group_by(InvestigationCase.status)
        .all()
    )
    counts_map = {}
    for st, count in status_counts:
        key = (st.value if hasattr(st, "value") else str(st)).upper()
        counts_map[key] = count

    total_reviews = db.query(InvestigationCase).count()

    # Priority counts from RiskScore associated with projects under investigation
    high_priority_reviews = (
        db.query(InvestigationCase)
        .join(RiskScore, InvestigationCase.project_id == RiskScore.project_id)
        .filter(RiskScore.priority_level == RiskPriorityEnum.HIGH)
        .count()
    )
    critical_priority_reviews = (
        db.query(InvestigationCase)
        .join(RiskScore, InvestigationCase.project_id == RiskScore.project_id)
        .filter(RiskScore.priority_level == RiskPriorityEnum.CRITICAL)
        .count()
    )

    return CaseSummaryResponse(
        total_reviews=total_reviews,
        new=counts_map.get("NEW", 0),
        under_review=counts_map.get("UNDER_REVIEW", 0),
        verification_required=counts_map.get("VERIFICATION_REQUIRED", 0),
        verified=counts_map.get("VERIFIED", 0),
        dismissed=counts_map.get("DISMISSED", 0),
        escalated=counts_map.get("ESCALATED", 0),
        closed=counts_map.get("CLOSED", 0),
        high_priority_reviews=high_priority_reviews,
        critical_priority_reviews=critical_priority_reviews,
    )

@router.get("", response_model=List[CaseResponse])
def list_investigation_cases(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(InvestigationCase)
    if status:
        query = query.filter(InvestigationCase.status == status.upper())

    cases = query.order_by(InvestigationCase.created_at.desc()).limit(limit).all()
    results = []
    for c in cases:
        c_status = c.status.value if hasattr(c.status, "value") else str(c.status)
        notes = [
            NoteResponse(
                id=n.id,
                author=n.author,
                note_text=n.note_text,
                action_taken=n.action_taken,
                created_at=n.created_at,
            )
            for n in c.notes
        ]
        results.append(CaseResponse(
            case_id=c.case_id,
            project_id=c.project_id,
            assigned_to=c.assigned_to,
            status=c_status,
            priority=c.priority,
            created_at=c.created_at,
            updated_at=c.updated_at,
            notes=notes,
        ))
    return results

@router.get("/{case_id}", response_model=CaseResponse)
def get_investigation_case(case_id: str, db: Session = Depends(get_db)):
    c = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    c_status = c.status.value if hasattr(c.status, "value") else str(c.status)
    notes = [
        NoteResponse(
            id=n.id,
            author=n.author,
            note_text=n.note_text,
            action_taken=n.action_taken,
            created_at=n.created_at,
        )
        for n in c.notes
    ]
    return CaseResponse(
        case_id=c.case_id,
        project_id=c.project_id,
        assigned_to=c.assigned_to,
        status=c_status,
        priority=c.priority,
        created_at=c.created_at,
        updated_at=c.updated_at,
        notes=notes,
    )

@router.post("/{case_id}/notes", response_model=NoteResponse)
def add_case_note(case_id: str, note_in: NoteCreate, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    cleaned_note = (note_in.note_text or "").strip()
    if not cleaned_note:
        raise HTTPException(status_code=400, detail="Note text cannot be empty or whitespace only")

    cleaned_author = (note_in.author or "").strip() or "Auditor"

    note = InvestigationNote(
        case_id=case_id,
        author=cleaned_author,
        note_text=cleaned_note,
        action_taken=note_in.action_taken,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(note)
    case.updated_at = datetime.datetime.utcnow()

    # Log action
    db.add(AuditLog(
        username=cleaned_author,
        action="ADD_INVESTIGATION_NOTE",
        resource=case_id,
        result="SUCCESS",
        details={"note_text": cleaned_note[:80]},
    ))

    db.commit()
    db.refresh(note)

    return NoteResponse(
        id=note.id,
        author=note.author,
        note_text=note.note_text,
        action_taken=note.action_taken,
        created_at=note.created_at,
    )

@router.patch("/{case_id}/status", response_model=CaseResponse)
def update_case_status(case_id: str, payload: CaseStatusUpdate, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")

    try:
        new_status = getattr(InvestigationStatusEnum, payload.status.upper())
    except AttributeError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    old_status = case.status.value if hasattr(case.status, "value") else str(case.status)
    case.status = new_status
    if payload.assigned_to is not None:
        case.assigned_to = payload.assigned_to.strip() if payload.assigned_to else None
    case.updated_at = datetime.datetime.utcnow()

    if payload.notes and payload.notes.strip():
        db.add(InvestigationNote(
            case_id=case_id,
            author=payload.assigned_to or "Auditor",
            note_text=f"Status transition: {old_status} -> {payload.status}. {payload.notes.strip()}",
            action_taken=f"Status update to {payload.status}",
        ))

    db.add(AuditLog(
        username=payload.assigned_to or "Auditor",
        action="UPDATE_CASE_STATUS",
        resource=case_id,
        result="SUCCESS",
        details={"old_status": old_status, "new_status": payload.status},
    ))

    db.commit()
    db.refresh(case)
    return get_investigation_case(case_id, db)

@router.get("/cases/{case_id}/history", response_model=List[CaseAuditTrailItem])
def get_case_history(case_id: str, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.resource == case_id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )
    return logs

@router.post("/cases/{case_id}/review-event", response_model=CaseAuditTrailItem)
def record_case_review_event(case_id: str, payload: CaseEventCreate, db: Session = Depends(get_db)):
    case = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")
    
    log = AuditLog(
        username=payload.username or "auditor",
        action=payload.action,
        resource=case_id,
        result="SUCCESS",
        details=payload.details or {},
    )
    db.add(log)
    case.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(log)
    return log


from pydantic import BaseModel, Field

class AuditorFeedbackCreate(BaseModel):
    project_id: str
    case_id: Optional[str] = None
    outcome: str = Field(..., description="Reviewed — No Further Action | Requires More Evidence | Field Verification Requested | Escalated for Further Review | Closed")
    auditor_notes: str
    verified_signals: List[str] = Field(default_factory=list)
    dismissed_signals: List[str] = Field(default_factory=list)
    auditor_username: Optional[str] = "auditor"


@router.post("/feedback")
def submit_auditor_feedback(payload: AuditorFeedbackCreate, db: Session = Depends(get_db)):
    """
    Auditor Feedback & Calibration Loop:
    Records verified human outcome, updates the contractor profile review statistics,
    and logs the labeled outcome for future model calibration.
    """
    from backend.app.database.models import Project, ProjectEntity, ContractorProfile

    proj = db.query(Project).filter(Project.project_id == payload.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail=f"Project '{payload.project_id}' not found")

    # Log structured feedback in AuditLog
    log = AuditLog(
        username=payload.auditor_username or "auditor",
        action="AUDITOR_FEEDBACK_RECORDED",
        resource=payload.project_id,
        result="SUCCESS",
        details={
            "case_id": payload.case_id,
            "outcome": payload.outcome,
            "auditor_notes": payload.auditor_notes,
            "verified_signals": payload.verified_signals,
            "dismissed_signals": payload.dismissed_signals,
        },
    )
    db.add(log)

    # If project has an associated contractor, update contractor profile review outcome tally
    if proj.entities:
        c_entity = proj.entities[0].entity
        c_prof = db.query(ContractorProfile).filter(ContractorProfile.entity_id == c_entity.entity_id).first()
        if c_prof:
            curr_outcomes = dict(c_prof.review_outcomes_summary or {})
            curr_outcomes[payload.outcome] = curr_outcomes.get(payload.outcome, 0) + 1
            c_prof.review_outcomes_summary = curr_outcomes
            c_prof.last_updated = datetime.datetime.utcnow()

    db.commit()

    return {
        "status": "RECORDED",
        "project_id": payload.project_id,
        "outcome": payload.outcome,
        "message": "Auditor feedback successfully saved to labeled outcome repository for continuous calibration.",
    }


