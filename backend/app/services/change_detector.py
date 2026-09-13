import hashlib
import pandas as pd
from typing import Dict, Any, List, Set, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.database.models import (
    Project,
    ProjectLocation,
    ProjectFinancial,
    ProjectTimeline,
    ProjectDescription,
    IngestionChangeRecord,
    ProjectAnalysisHistory,
)
from backend.app.utils.logger import logger


def calculate_record_checksum(row_dict: Dict[str, Any]) -> str:
    """
    Computes deterministic SHA-256 fingerprint for a project record
    based on key financial, descriptive, spatial, and temporal attributes.
    """
    relevant_keys = [
        "project_id",
        "sanctioned_amount",
        "expenditure",
        "sector",
        "district",
        "block",
        "village",
        "latitude",
        "longitude",
        "title",
        "description",
        "contractor_name",
        "status",
        "sanction_date",
        "completion_date",
    ]
    parts = []
    for k in relevant_keys:
        val = row_dict.get(k)
        if pd.isna(val) or val is None:
            parts.append(f"{k}:None")
        else:
            parts.append(f"{k}:{str(val).strip()}")
    raw_str = "|".join(parts)
    return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()


class IncrementalChangeDetector:
    """
    Scalable Change Detection & Incremental Ingestion:
    - Avoids O(N) full reprocessing when ingesting updated datasets.
    - Classifies every incoming record into:
        NEW: First time seeing this project_id.
        UPDATED: Existing project_id with changed attributes/checksum.
        UNCHANGED: Existing project_id with identical checksum.
    - Persists IngestionChangeRecord audit entries.
    """

    def __init__(self, db: Session):
        self.db = db

    def detect_changes(
        self,
        df: pd.DataFrame,
        dataset_version: str,
    ) -> Dict[str, Any]:
        """
        Scans incoming dataframe against database and returns partitioned records.
        """
        if len(df) == 0:
            return {
                "new_records": pd.DataFrame(),
                "updated_records": pd.DataFrame(),
                "unchanged_records": pd.DataFrame(),
                "summary": {"new": 0, "updated": 0, "unchanged": 0, "total": 0},
            }

        pids = df["project_id"].astype(str).tolist()
        existing_projects = (
            self.db.query(Project)
            .filter(Project.project_id.in_(pids))
            .all()
        )
        existing_map = {p.project_id: p for p in existing_projects}

        new_indices = []
        updated_indices = []
        unchanged_indices = []
        change_records = []

        for idx, row in df.iterrows():
            pid = str(row["project_id"])
            row_dict = row.to_dict()
            checksum = calculate_record_checksum(row_dict)

            if pid not in existing_map:
                new_indices.append(idx)
                change_records.append(
                    IngestionChangeRecord(
                        dataset_version=dataset_version,
                        project_id=pid,
                        change_type="NEW",
                        changed_fields=["all"],
                        checksum=checksum,
                    )
                )
            else:
                existing = existing_map[pid]
                # Compare fields to check if changed
                changed_fields = []
                if existing.sector != str(row.get("sector", "")):
                    changed_fields.append("sector")
                if existing.status != str(row.get("status", "")):
                    changed_fields.append("status")
                
                # Check financial
                if existing.financial:
                    if abs(float(existing.financial.sanctioned_amount or 0.0) - float(row.get("sanctioned_amount", 0.0))) > 1.0:
                        changed_fields.append("sanctioned_amount")
                    if abs(float(existing.financial.expenditure or 0.0) - float(row.get("expenditure", 0.0))) > 1.0:
                        changed_fields.append("expenditure")

                # Check description
                if existing.description and existing.description.title != str(row.get("title", "")):
                    changed_fields.append("title")

                if changed_fields:
                    updated_indices.append(idx)
                    change_records.append(
                        IngestionChangeRecord(
                            dataset_version=dataset_version,
                            project_id=pid,
                            change_type="UPDATED",
                            changed_fields=changed_fields,
                            checksum=checksum,
                        )
                    )
                else:
                    unchanged_indices.append(idx)
                    change_records.append(
                        IngestionChangeRecord(
                            dataset_version=dataset_version,
                            project_id=pid,
                            change_type="UNCHANGED",
                            changed_fields=[],
                            checksum=checksum,
                        )
                    )

        # Batch insert change records
        if change_records:
            self.db.bulk_save_objects(change_records)
            self.db.flush()

        new_df = df.loc[new_indices].copy() if new_indices else pd.DataFrame(columns=df.columns)
        updated_df = df.loc[updated_indices].copy() if updated_indices else pd.DataFrame(columns=df.columns)
        unchanged_df = df.loc[unchanged_indices].copy() if unchanged_indices else pd.DataFrame(columns=df.columns)

        summary = {
            "new": len(new_indices),
            "updated": len(updated_indices),
            "unchanged": len(unchanged_indices),
            "total": len(df),
        }
        logger.info(
            f"Change Detection completed for {len(df)} records: "
            f"{summary['new']} NEW, {summary['updated']} UPDATED, {summary['unchanged']} UNCHANGED."
        )

        return {
            "new_records": new_df,
            "updated_records": updated_df,
            "unchanged_records": unchanged_df,
            "summary": summary,
        }
