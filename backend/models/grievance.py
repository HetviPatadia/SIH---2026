import uuid
import datetime
from sqlalchemy import Column, String, Text, DateTime
from backend.app.database.connection import Base

class CitizenGrievance(Base):
    __tablename__ = "citizen_grievances"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_number = Column(String(20), unique=True, index=True, nullable=False)
    grievance_id = Column(String(64), unique=True, index=True, nullable=True)
    project_id = Column(String(64), index=True, nullable=False)
    project_title = Column(String(255), nullable=False)
    contractor_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    issue_type = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    citizen_name = Column(String(128), default="Anonymous")
    citizen_contact = Column(String(128), nullable=True)
    status = Column(String(32), default="Received")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
