import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Boolean
from backend.app.database.connection import Base

class CitizenReview(Base):
    """
    Relational ORM model for storing citizen ratings, factor scores, and feedback comments.
    """
    __tablename__ = "citizen_reviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    review_id = Column(String(64), unique=True, index=True, nullable=False)
    project_id = Column(String(64), index=True, nullable=False)
    project_title = Column(String(255), nullable=True)
    
    # Rating factors (1 to 5 stars)
    overall_rating = Column(Integer, nullable=False, default=5)
    quality_rating = Column(Integer, nullable=False, default=5)       # Factor 1: Construction / Work Quality
    timeline_rating = Column(Integer, nullable=False, default=5)      # Factor 2: Timeline & Execution Speed
    utility_rating = Column(Integer, nullable=False, default=5)       # Factor 3: Public Utility & Community Benefit
    transparency_rating = Column(Integer, nullable=False, default=5)  # Factor 4: Cost & Info Transparency
    
    # Feedback portion
    feedback_text = Column(Text, nullable=False)
    reviewer_name = Column(String(128), nullable=True, default="Anonymous Citizen")
    reviewer_contact = Column(String(128), nullable=True)
    would_recommend = Column(Boolean, default=True)
    
    status = Column(String(32), default="Published", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
