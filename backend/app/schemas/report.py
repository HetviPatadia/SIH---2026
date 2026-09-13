from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReportRequest(BaseModel):
    project_id: str
    auditor_name: Optional[str] = "Authorized Auditor"
    include_evidence: bool = True

class ReportResponse(BaseModel):
    project_id: str
    report_file: str
    download_url: str
    generated_at: datetime
    data_quality_score: float
    model_version: str
    dataset_version: str
