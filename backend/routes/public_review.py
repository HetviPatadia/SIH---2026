import os
import csv
import datetime
import random
import string
import threading
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.connection import get_db
from backend.models.review import CitizenReview
from backend.app.database.models import Project

router = APIRouter(prefix="/api/public/reviews", tags=["Public Project Reviews & Ratings"])

CSV_LEDGER_LOCK = threading.Lock()
CSV_LEDGER_PATH = os.path.join("data", "demo_dataset", "citizen_reviews_log.csv")

def ensure_csv_ledger_exists():
    os.makedirs(os.path.dirname(CSV_LEDGER_PATH), exist_ok=True)
    if not os.path.exists(CSV_LEDGER_PATH):
        with CSV_LEDGER_LOCK:
            if not os.path.exists(CSV_LEDGER_PATH):
                with open(CSV_LEDGER_PATH, mode="w", newline="", encoding="utf-8") as f:
                    writer = csv.writer(f)
                    writer.writerow([
                        "review_id",
                        "project_id",
                        "project_title",
                        "overall_rating",
                        "quality_rating",
                        "timeline_rating",
                        "utility_rating",
                        "transparency_rating",
                        "feedback_text",
                        "reviewer_name",
                        "reviewer_contact",
                        "would_recommend",
                        "created_at",
                        "status",
                    ])

def append_review_to_csv(record: dict):
    ensure_csv_ledger_exists()
    with CSV_LEDGER_LOCK:
        with open(CSV_LEDGER_PATH, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                record.get("review_id"),
                record.get("project_id"),
                record.get("project_title"),
                record.get("overall_rating"),
                record.get("quality_rating"),
                record.get("timeline_rating"),
                record.get("utility_rating"),
                record.get("transparency_rating"),
                record.get("feedback_text"),
                record.get("reviewer_name"),
                record.get("reviewer_contact"),
                record.get("would_recommend"),
                record.get("created_at"),
                record.get("status"),
            ])

def generate_review_id() -> str:
    today_str = datetime.datetime.utcnow().strftime("%Y%m%d")
    random_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"REV-{today_str}-{random_code}"

# Pydantic Schemas
class CitizenReviewCreate(BaseModel):
    project_id: str = Field(..., description="Target project ID")
    project_title: Optional[str] = Field(None, description="Title of the project")
    overall_rating: int = Field(..., ge=1, le=5, description="Overall satisfaction rating (1-5)")
    quality_rating: int = Field(5, ge=1, le=5, description="Construction & Work Quality (1-5)")
    timeline_rating: int = Field(5, ge=1, le=5, description="Execution Speed & Timeline (1-5)")
    utility_rating: int = Field(5, ge=1, le=5, description="Public Utility & Community Benefit (1-5)")
    transparency_rating: int = Field(5, ge=1, le=5, description="Cost & Information Transparency (1-5)")
    feedback_text: str = Field(..., min_length=10, max_length=2000, description="Citizen feedback & comments")
    reviewer_name: Optional[str] = Field("Anonymous Citizen", max_length=128)
    reviewer_contact: Optional[str] = Field(None, max_length=128)
    would_recommend: bool = Field(True, description="Whether citizen recommends this project")

class FactorBreakdownSchema(BaseModel):
    overall: float
    quality: float
    timeline: float
    utility: float
    transparency: float

class ReviewItemSchema(BaseModel):
    review_id: str
    project_id: str
    project_title: Optional[str]
    overall_rating: int
    quality_rating: int
    timeline_rating: int
    utility_rating: int
    transparency_rating: int
    feedback_text: str
    reviewer_name: Optional[str]
    would_recommend: bool
    created_at: datetime.datetime

class ProjectRatingSummarySchema(BaseModel):
    project_id: str
    total_reviews: int
    average_overall: float
    recommendation_percentage: float
    factors: FactorBreakdownSchema
    reviews: List[ReviewItemSchema]

@router.post("", status_code=status.HTTP_201_CREATED)
def submit_citizen_review(payload: CitizenReviewCreate, db: Session = Depends(get_db)):
    """
    Submits a citizen rating, multi-factor review, and feedback comment for a public project.
    """
    # 1. Verify target project exists
    project = db.query(Project).filter(Project.project_id == payload.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{payload.project_id}' does not exist."
        )

    project_title = payload.project_title or (project.description.title if project.description else project.project_id)
    review_id = generate_review_id()
    created_at = datetime.datetime.utcnow()

    reviewer_name = payload.reviewer_name.strip() if payload.reviewer_name and payload.reviewer_name.strip() else "Anonymous Citizen"

    # 2. Save DB Record
    db_review = CitizenReview(
        review_id=review_id,
        project_id=payload.project_id,
        project_title=project_title,
        overall_rating=payload.overall_rating,
        quality_rating=payload.quality_rating,
        timeline_rating=payload.timeline_rating,
        utility_rating=payload.utility_rating,
        transparency_rating=payload.transparency_rating,
        feedback_text=payload.feedback_text.strip(),
        reviewer_name=reviewer_name,
        reviewer_contact=payload.reviewer_contact.strip() if payload.reviewer_contact else None,
        would_recommend=payload.would_recommend,
        status="Published",
        created_at=created_at,
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    # 3. Thread-safe CSV append
    csv_payload = {
        "review_id": review_id,
        "project_id": payload.project_id,
        "project_title": project_title,
        "overall_rating": payload.overall_rating,
        "quality_rating": payload.quality_rating,
        "timeline_rating": payload.timeline_rating,
        "utility_rating": payload.utility_rating,
        "transparency_rating": payload.transparency_rating,
        "feedback_text": payload.feedback_text.strip(),
        "reviewer_name": reviewer_name,
        "reviewer_contact": payload.reviewer_contact,
        "would_recommend": payload.would_recommend,
        "created_at": created_at.isoformat(),
        "status": "Published",
    }
    try:
        append_review_to_csv(csv_payload)
    except Exception as e:
        # Logging without failing DB submission
        print(f"[Warning] Failed to append review to CSV ledger: {e}")

    # 4. Calculate updated metrics for response
    metrics = calculate_project_metrics(payload.project_id, db)

    return {
        "message": "Citizen rating and feedback submitted successfully.",
        "review_id": review_id,
        "project_id": payload.project_id,
        "summary": metrics
    }

@router.get("/project/{project_id}", response_model=ProjectRatingSummarySchema)
def get_project_reviews(project_id: str, db: Session = Depends(get_db)):
    """
    Returns live rating summary, factor breakdowns, and public feedback comments for a project.
    """
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' does not exist."
        )

    metrics = calculate_project_metrics(project_id, db)

    # Fetch reviews list
    reviews = (
        db.query(CitizenReview)
        .filter(CitizenReview.project_id == project_id, CitizenReview.status == "Published")
        .order_by(CitizenReview.created_at.desc())
        .limit(50)
        .all()
    )

    review_items = [
        ReviewItemSchema(
            review_id=r.review_id,
            project_id=r.project_id,
            project_title=r.project_title,
            overall_rating=r.overall_rating,
            quality_rating=r.quality_rating,
            timeline_rating=r.timeline_rating,
            utility_rating=r.utility_rating,
            transparency_rating=r.transparency_rating,
            feedback_text=r.feedback_text,
            reviewer_name=r.reviewer_name,
            would_recommend=r.would_recommend,
            created_at=r.created_at,
        )
        for r in reviews
    ]

    return ProjectRatingSummarySchema(
        project_id=project_id,
        total_reviews=metrics["total_reviews"],
        average_overall=metrics["average_overall"],
        recommendation_percentage=metrics["recommendation_percentage"],
        factors=FactorBreakdownSchema(**metrics["factors"]),
        reviews=review_items,
    )

def calculate_project_metrics(project_id: str, db: Session) -> dict:
    """Helper to calculate aggregate factor averages and recommendation rate."""
    reviews = db.query(CitizenReview).filter(
        CitizenReview.project_id == project_id,
        CitizenReview.status == "Published"
    ).all()

    if not reviews:
        # Default baseline scores if no citizen reviews yet
        return {
            "total_reviews": 0,
            "average_overall": 4.5,
            "recommendation_percentage": 90.0,
            "factors": {
                "overall": 4.5,
                "quality": 4.5,
                "timeline": 4.2,
                "utility": 4.8,
                "transparency": 4.5,
            }
        }

    total = len(reviews)
    avg_overall = sum(r.overall_rating for r in reviews) / total
    avg_quality = sum(r.quality_rating for r in reviews) / total
    avg_timeline = sum(r.timeline_rating for r in reviews) / total
    avg_utility = sum(r.utility_rating for r in reviews) / total
    avg_transparency = sum(r.transparency_rating for r in reviews) / total
    recs = sum(1 for r in reviews if r.would_recommend)
    rec_pct = (recs / total) * 100.0

    return {
        "total_reviews": total,
        "average_overall": round(avg_overall, 1),
        "recommendation_percentage": round(rec_pct, 1),
        "factors": {
            "overall": round(avg_overall, 1),
            "quality": round(avg_quality, 1),
            "timeline": round(avg_timeline, 1),
            "utility": round(avg_utility, 1),
            "transparency": round(avg_transparency, 1),
        }
    }
