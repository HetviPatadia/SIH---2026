import os
import csv
import uuid
import logging
import datetime
import threading
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.database.models import Project
from backend.models.grievance import CitizenGrievance

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public/grievances", tags=["Public Citizen Grievances API"])

CSV_FILE_PATH = os.path.join("data", "demo_dataset", "citizen_complaints_log.csv")
CSV_LOCK = threading.Lock()
CSV_HEADERS = [
    "ticket_number",
    "project_id",
    "project_title",
    "company_name",
    "contractor_name",
    "issue_type",
    "description",
    "citizen_name",
    "citizen_contact",
    "status",
    "timestamp",
]

def append_to_csv_ledger(record: dict):
    """
    Appends a grievance record safely to the append-only CSV ledger.
    Creates directory and file headers if missing.
    """
    with CSV_LOCK:
        try:
            os.makedirs(os.path.dirname(CSV_FILE_PATH), exist_ok=True)
            file_exists = os.path.exists(CSV_FILE_PATH) and os.path.getsize(CSV_FILE_PATH) > 0

            with open(CSV_FILE_PATH, mode="a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=CSV_HEADERS)
                if not file_exists:
                    writer.writeheader()

                writer.writerow({
                    "ticket_number": record.get("ticket_number", ""),
                    "project_id": record.get("project_id", ""),
                    "project_title": record.get("project_title", "").replace("\n", " "),
                    "company_name": (record.get("company_name") or "").replace("\n", " "),
                    "contractor_name": (record.get("contractor_name") or "").replace("\n", " "),
                    "issue_type": record.get("issue_type", ""),
                    "description": record.get("description", "").replace("\n", " "),
                    "citizen_name": record.get("citizen_name", "Anonymous"),
                    "citizen_contact": record.get("citizen_contact") or "",
                    "status": record.get("status", "Received"),
                    "timestamp": record.get("timestamp", datetime.datetime.utcnow().isoformat()),
                })
        except Exception as e:
            logger.error(f"Failed to append grievance to CSV ledger: {e}", exc_info=True)


class GrievanceCreateSchema(BaseModel):
    project_id: str = Field(..., description="Project ID matching an existing public work")
    project_title: Optional[str] = None
    contractor_name: Optional[str] = None
    company_name: Optional[str] = None
    issue_type: str = Field(..., description="Issue Category: quality, delay, abandoned, financial, other")
    description: str = Field(..., min_length=20, description="Detailed explanation (min 20 characters)")
    citizen_name: Optional[str] = "Anonymous"
    citizen_contact: Optional[str] = None


class GrievanceResponseSchema(BaseModel):
    ticket_number: str
    grievance_id: str
    status: str = "Received"
    message: str = "Citizen grievance submitted and logged to public record successfully."


class GrievanceTrackResponseSchema(BaseModel):
    ticket_number: str
    project_id: str
    project_title: str
    company_name: Optional[str] = None
    contractor_name: Optional[str] = None
    issue_type: str
    description: str
    citizen_name: str = "Anonymous"
    status: str = "Received"
    status_description: str = "Received & Logged in Public Ledger"
    created_at: str


@router.post("", response_model=GrievanceResponseSchema)
def submit_citizen_grievance(
    payload: GrievanceCreateSchema,
    db: Session = Depends(get_db)
):
    """
    Submits a public citizen grievance linked to a specific project.
    Stores in primary relational database and secondary append-only CSV ledger.
    """
    pid = payload.project_id.strip()
    project = db.query(Project).filter(Project.project_id == pid).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{pid}' does not exist in the public dataset."
        )

    desc = payload.description.strip()
    if len(desc) < 20:
        raise HTTPException(
            status_code=400,
            detail="Complaint description must be at least 20 characters long."
        )

    issue = payload.issue_type.strip()
    title = payload.project_title or (project.description.title if project.description else project.project_id)
    contractor = payload.contractor_name
    if not contractor and project.entities:
        for pe in project.entities:
            if pe.entity:
                contractor = pe.entity.name
                break

    today_str = datetime.datetime.utcnow().strftime("%Y%m%d")
    unique_code = uuid.uuid4().hex[:4].upper()
    ticket_number = f"GRV-{today_str}-{unique_code}"
    created_at_dt = datetime.datetime.utcnow()

    grievance = CitizenGrievance(
        id=str(uuid.uuid4()),
        ticket_number=ticket_number,
        grievance_id=ticket_number,
        project_id=pid,
        project_title=title[:255],
        contractor_name=contractor[:255] if contractor else None,
        company_name=payload.company_name[:255] if payload.company_name else None,
        issue_type=issue,
        description=desc,
        citizen_name=(payload.citizen_name or "Anonymous").strip()[:128],
        citizen_contact=payload.citizen_contact.strip()[:128] if payload.citizen_contact else None,
        status="Received",
        created_at=created_at_dt,
    )

    db.add(grievance)
    db.commit()
    db.refresh(grievance)

    # Secondary CSV Ledger recording
    append_to_csv_ledger({
        "ticket_number": ticket_number,
        "project_id": pid,
        "project_title": title,
        "company_name": payload.company_name,
        "contractor_name": contractor,
        "issue_type": issue,
        "description": desc,
        "citizen_name": payload.citizen_name or "Anonymous",
        "citizen_contact": payload.citizen_contact,
        "status": "Received",
        "timestamp": created_at_dt.isoformat(),
    })

    logger.info(f"Citizen grievance created successfully: {ticket_number} for project {pid}")

    return GrievanceResponseSchema(
        ticket_number=ticket_number,
        grievance_id=ticket_number,
        status="Received",
        message="Citizen grievance submitted and logged to public record successfully."
    )


@router.get("/track/{ticket_number}", response_model=GrievanceTrackResponseSchema)
def track_citizen_grievance(
    ticket_number: str,
    db: Session = Depends(get_db)
):
    """
    Looks up public status of a submitted grievance by reference ticket number.
    Checks primary DB first with CSV ledger fallback.
    """
    tn = ticket_number.strip()
    grievance = db.query(CitizenGrievance).filter(
        (CitizenGrievance.ticket_number == tn) |
        (CitizenGrievance.grievance_id == tn) |
        (CitizenGrievance.id == tn)
    ).first()

    if grievance:
        status_desc_map = {
            "Received": "Received & Logged in Public Ledger",
            "Submitted": "Received & Logged in Public Ledger",
            "Under Review": "Under Review by Monitoring Authority",
            "Resolved": "Resolved / Inspection Completed",
        }
        status_str = grievance.status or "Received"
        return GrievanceTrackResponseSchema(
            ticket_number=grievance.ticket_number or tn,
            project_id=grievance.project_id,
            project_title=grievance.project_title,
            company_name=grievance.company_name,
            contractor_name=grievance.contractor_name,
            issue_type=grievance.issue_type,
            description=grievance.description,
            citizen_name=grievance.citizen_name or "Anonymous",
            status=status_str,
            status_description=status_desc_map.get(status_str, "Received & Logged in Public Ledger"),
            created_at=grievance.created_at.isoformat() if grievance.created_at else datetime.datetime.utcnow().isoformat(),
        )

    # Fallback search in CSV ledger if not found in DB
    if os.path.exists(CSV_FILE_PATH):
        with CSV_LOCK:
            with open(CSV_FILE_PATH, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("ticket_number") == tn:
                        return GrievanceTrackResponseSchema(
                            ticket_number=row.get("ticket_number"),
                            project_id=row.get("project_id", ""),
                            project_title=row.get("project_title", ""),
                            company_name=row.get("company_name"),
                            contractor_name=row.get("contractor_name"),
                            issue_type=row.get("issue_type", "other"),
                            description=row.get("description", ""),
                            citizen_name=row.get("citizen_name", "Anonymous"),
                            status=row.get("status", "Received"),
                            status_description="Received & Logged in Public Ledger",
                            created_at=row.get("timestamp", datetime.datetime.utcnow().isoformat()),
                        )

    raise HTTPException(
        status_code=404,
        detail=f"Grievance ticket '{tn}' not found in public records."
    )
