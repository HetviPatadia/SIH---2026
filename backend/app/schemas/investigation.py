from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class NoteCreate(BaseModel):
    author: str
    note_text: str
    action_taken: Optional[str] = None

class NoteResponse(BaseModel):
    id: int
    author: str
    note_text: str
    action_taken: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CaseStatusUpdate(BaseModel):
    status: str  # NEW, UNDER_REVIEW, VERIFICATION_REQUIRED, VERIFIED, DISMISSED, ESCALATED, CLOSED
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

class CaseResponse(BaseModel):
    case_id: str
    project_id: str
    assigned_to: Optional[str] = None
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime
    notes: List[NoteResponse] = []

    class Config:
        from_attributes = True

class CaseAuditTrailItem(BaseModel):
    id: int
    timestamp: datetime
    username: str
    action: str
    resource: Optional[str] = None
    result: str
    details: Optional[dict] = None

    class Config:
        from_attributes = True

class CaseEventCreate(BaseModel):
    action: str
    username: Optional[str] = "auditor"
    details: Optional[dict] = None

class CaseSummaryResponse(BaseModel):
    total_reviews: int
    new: int
    under_review: int
    verification_required: int
    verified: int
    dismissed: int
    escalated: int
    closed: int
    high_priority_reviews: int
    critical_priority_reviews: int

