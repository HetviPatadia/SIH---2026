"""
Evidence Gap Detection Engine
Analyzes evidence completeness, missing artifacts, and metadata compliance.
"""
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.database.models import Project, ProjectEvidence, EvidenceFile, EvidenceMetadata

class EvidenceGapEngine:
    def __init__(self):
        # Weighted coverage breakdown:
        # 1. Completion/Progress Photograph exists: 35%
        # 2. GPS EXIF / Coordinates populated: 25%
        # 3. Capture Timestamp verified: 20%
        # 4. Physical / Financial record correlation: 20%
        self.WEIGHT_PHOTO = 35.0
        self.WEIGHT_GPS = 25.0
        self.WEIGHT_TIMESTAMP = 20.0
        self.WEIGHT_FINANCIAL = 20.0

    def evaluate_project_gap(self, project_id: str, db: Session) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.project_id == project_id).first()
        if not project:
            return {
                "project_id": project_id,
                "coverage_percentage": 0.0,
                "gap_status": "PROJECT_NOT_FOUND",
                "missing_items": ["Project record not found"],
                "present_items": [],
                "recommendation": "Verify project identifier.",
            }

        evidences = db.query(ProjectEvidence).filter(ProjectEvidence.project_id == project_id).all()

        missing_items = []
        present_items = []
        coverage = 0.0

        # 1. Check for photograph presence
        has_photo = False
        has_gps = False
        has_timestamp = False

        if evidences:
            for ev in evidences:
                if ev.evidence_type in ["COMPLETION_PHOTO", "PROGRESS_PHOTO", "SITE_IMAGE"]:
                    has_photo = True
                if ev.metadata_record:
                    meta = ev.metadata_record
                    if meta.latitude is not None and meta.longitude is not None:
                        has_gps = True
                    if (getattr(meta, "capture_time", None) is not None) or (getattr(meta, "captured_at", None) is not None) or getattr(meta, "has_timestamp", False):
                        has_timestamp = True

        if has_photo:
            coverage += self.WEIGHT_PHOTO
            present_items.append("Site / Completion Photographic Record")
        else:
            missing_items.append("Mandatory completion/progress photo")

        if has_gps:
            coverage += self.WEIGHT_GPS
            present_items.append("Geotagged EXIF coordinates")
        else:
            missing_items.append("EXIF Geotag metadata (latitude/longitude)")

        if has_timestamp:
            coverage += self.WEIGHT_TIMESTAMP
            present_items.append("Capture timestamp verification")
        else:
            missing_items.append("Camera timestamp / capture datetime metadata")

        # 4. Check financial sanction completeness
        if project.financial and project.financial.sanctioned_amount and project.financial.sanctioned_amount > 0:
            coverage += self.WEIGHT_FINANCIAL
            present_items.append("Sanction / Expenditure financial trail")
        else:
            missing_items.append("Sanction financial allocation trail")

        # Determine gap status
        if coverage >= 80.0:
            gap_status = "ADEQUATE"
            recommendation = "Evidence coverage meets verification standards. Routine monitoring."
        elif coverage >= 50.0:
            gap_status = "PARTIAL_GAP"
            recommendation = f"Missing {len(missing_items)} compliance elements. Request field officer submission."
        else:
            gap_status = "CRITICAL_GAP"
            recommendation = "Critical evidence gap: project lacks essential photographic or geotagged documentation. Physical inspection recommended."

        return {
            "project_id": project_id,
            "coverage_percentage": round(coverage, 1),
            "gap_status": gap_status,
            "missing_items": missing_items,
            "present_items": present_items,
            "recommendation": recommendation,
        }
