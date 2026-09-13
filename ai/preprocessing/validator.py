import json
import datetime
from pathlib import Path
from typing import Tuple, Dict, Any, List
import pandas as pd
from backend.app.config import settings
from backend.app.utils.geo import is_valid_coordinate
from backend.app.utils.logger import logger

class DataQualityEngine:
    """
    Validates records against government reporting standards.
    Never silently discards suspicious records; keeps rejected records
    separately with reasons for auditor review.
    """

    def __init__(self):
        self.rejected_dir = settings.REJECTED_DATA_DIR

    def validate(
        self, df: pd.DataFrame, dataset_version: str
    ) -> Tuple[pd.DataFrame, List[Dict[str, Any]], Dict[str, Any]]:
        total_records = len(df)
        if total_records == 0:
            return df, [], {"total": 0, "valid": 0, "quality_score": 0.0}

        valid_rows = []
        rejected_records = []

        # Required columns check
        required_fields = ["project_id", "district", "sector"]
        missing_required = [col for col in required_fields if col not in df.columns]
        if missing_required:
            raise ValueError(f"Dataset missing mandatory columns: {missing_required}")

        seen_project_ids = set()

        for idx, row in df.iterrows():
            row_dict = row.to_dict()
            reasons = []

            # 1. Project ID check
            pid = str(row_dict.get("project_id", "")).strip()
            if not pid or pid == "nan":
                reasons.append("Missing project_id")
            elif pid in seen_project_ids:
                reasons.append(f"Duplicate project_id: {pid}")
            else:
                seen_project_ids.add(pid)

            # 2. Financial validity
            sanctioned = row_dict.get("sanctioned_amount")
            try:
                sanctioned_val = float(sanctioned)
                if sanctioned_val < 0:
                    reasons.append("Negative sanctioned amount")
                elif sanctioned_val > 1000000000:  # 100 Crores sanity threshold for MPLADS
                    reasons.append("Unrealistically high sanctioned amount (> 100 Cr)")
            except (ValueError, TypeError):
                reasons.append("Invalid or missing sanctioned amount format")

            # 3. Geo coordinates validity (if provided)
            lat = row_dict.get("latitude")
            lon = row_dict.get("longitude")
            if pd.notna(lat) and pd.notna(lon):
                if not is_valid_coordinate(lat, lon):
                    row_dict["has_valid_coords"] = False
                    row_dict["latitude"] = None
                    row_dict["longitude"] = None
                else:
                    row_dict["has_valid_coords"] = True
            else:
                row_dict["has_valid_coords"] = False

            # Evaluation
            if reasons:
                rejected_records.append({
                    "row_index": int(idx),
                    "project_id": pid,
                    "reasons": reasons,
                    "data": {k: (None if pd.isna(v) else v) for k, v in row_dict.items()},
                    "rejected_at": datetime.datetime.utcnow().isoformat(),
                })
            else:
                valid_rows.append(row_dict)

        valid_df = pd.DataFrame(valid_rows) if valid_rows else pd.DataFrame(columns=df.columns)
        valid_count = len(valid_rows)
        rejected_count = len(rejected_records)

        # Compute data quality score (0 - 100)
        quality_score = round(100.0 * (valid_count / total_records), 2) if total_records > 0 else 0.0

        # Save rejected records if any
        if rejected_records:
            rej_file = self.rejected_dir / f"{dataset_version}_rejected.json"
            with open(rej_file, "w", encoding="utf-8") as f:
                json.dump(rejected_records, f, indent=2)

        quality_report = {
            "dataset_version": dataset_version,
            "total_records": total_records,
            "valid_records": valid_count,
            "rejected_records": rejected_count,
            "data_quality_score": quality_score,
            "generated_at": datetime.datetime.utcnow().isoformat(),
        }

        logger.info(
            f"Quality Check [{dataset_version}]: Total={total_records}, Valid={valid_count}, "
            f"Rejected={rejected_count}, QualityScore={quality_score}%"
        )

        return valid_df, rejected_records, quality_report
