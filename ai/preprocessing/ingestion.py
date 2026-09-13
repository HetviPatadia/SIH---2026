import os
import shutil
import hashlib
import json
import datetime
from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd
from backend.app.config import settings
from backend.app.utils.logger import logger

class DataIngestionEngine:
    """
    Handles data provenance, raw file storage, and initial parsing of 
    MPLADS/eSAKSHI government datasets without overwriting raw data.
    """

    def __init__(self):
        self.raw_dir = settings.RAW_DATA_DIR
        self.metadata_dir = settings.METADATA_DIR

    def compute_checksum(self, file_path: Path) -> str:
        """Compute SHA-256 checksum of raw file for provenance tracking."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    def ingest_file(
        self,
        source_path: str,
        source_id: str,
        source_name: str,
        dataset_name: str,
        dataset_version: str,
        dataset_period: str = "2024-2026",
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Ingest a CSV, Excel, or JSON dataset, store raw immutable copy,
        and generate provenance metadata.
        """
        src = Path(source_path)
        if not src.exists():
            raise FileNotFoundError(f"Source file not found at: {source_path}")

        ext = src.suffix.lower()
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        target_raw_name = f"{dataset_version}_{timestamp}{ext}"
        target_raw_path = self.raw_dir / target_raw_name

        # Store immutable raw copy
        shutil.copy2(src, target_raw_path)
        checksum = self.compute_checksum(target_raw_path)

        # Parse data into DataFrame
        if ext == ".csv":
            df = pd.read_csv(target_raw_path)
        elif ext in [".xls", ".xlsx"]:
            df = pd.read_excel(target_raw_path)
        elif ext == ".json":
            df = pd.read_json(target_raw_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}. Expected CSV, Excel, or JSON.")

        provenance_metadata = {
            "source_id": source_id,
            "source_name": source_name,
            "dataset_name": dataset_name,
            "dataset_version": dataset_version,
            "dataset_period": dataset_period,
            "format": ext.replace(".", "").upper(),
            "download_date": datetime.datetime.utcnow().isoformat(),
            "raw_file_path": str(target_raw_path),
            "record_count": len(df),
            "checksum": checksum,
        }

        # Store provenance metadata
        meta_file = self.metadata_dir / f"{dataset_version}_provenance.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(provenance_metadata, f, indent=2)

        logger.info(
            f"Successfully ingested dataset '{dataset_version}' from '{source_name}' "
            f"({len(df)} records, checksum: {checksum[:8]}...)"
        )

        return df, provenance_metadata
