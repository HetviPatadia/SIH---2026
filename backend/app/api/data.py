from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pathlib import Path
import json
import pandas as pd

from backend.app.database.connection import get_db
from backend.app.database.models import DataSource, Dataset, Project
from backend.app.config import settings
from backend.data_generator import generate_mplads_dataset
from ai.preprocessing.ingestion import DataIngestionEngine
from ai.preprocessing.validator import DataQualityEngine
from ai.preprocessing.normalizer import DataNormalizer
from backend.app.services.analysis_orchestrator import AnalysisOrchestrator

router = APIRouter(prefix="/api/data", tags=["Data Ingestion & Quality API"])

ingest_engine = DataIngestionEngine()
validator = DataQualityEngine()
normalizer = DataNormalizer()
orchestrator = AnalysisOrchestrator()

@router.post("/generate-sample")
def trigger_generate_sample(
    records: int = Query(1000, ge=100, le=5000),
    dataset_version: str = Query("ds_demo_v1", description="Identifier for this dataset generation"),
    db: Session = Depends(get_db),
):
    try:
        # 1. Generate realistic data with injected anomalies
        csv_path = generate_mplads_dataset(num_records=records, output_filename=f"{dataset_version}.csv")

        # 2. Ingest
        raw_df, meta = ingest_engine.ingest_file(
            source_path=str(csv_path),
            source_id="esakshi_simulated_src",
            source_name="MoSPI eSAKSHI & data.gov.in Synthetic Benchmark",
            dataset_name="MPLADS Project Registry",
            dataset_version=dataset_version,
        )

        # 3. Register Data Source & Dataset
        ds_record = db.query(DataSource).filter(DataSource.source_id == "esakshi_simulated_src").first()
        if not ds_record:
            ds_record = DataSource(
                source_id="esakshi_simulated_src",
                source_name=meta["source_name"],
                dataset_name=meta["dataset_name"],
                format="CSV",
                checksum=meta["checksum"],
                record_count=meta["record_count"],
            )
            db.add(ds_record)
            db.flush()

        # 4. Quality Validation
        valid_df, rejected, q_report = validator.validate(raw_df, dataset_version)

        # 5. Normalization
        norm_df = normalizer.normalize(valid_df)

        # Record Dataset entry
        dataset_entry = db.query(Dataset).filter(Dataset.dataset_version == dataset_version).first()
        if not dataset_entry:
            dataset_entry = Dataset(
                dataset_version=dataset_version,
                source_id=ds_record.source_id,
                file_path=meta["raw_file_path"],
                total_records=q_report["total_records"],
                valid_records=q_report["valid_records"],
                invalid_records=q_report["rejected_records"],
                data_quality_score=q_report["data_quality_score"],
            )
            db.add(dataset_entry)
            db.commit()

        # 6. Run AI Analysis Orchestrator
        run_res = orchestrator.run_pipeline(norm_df, dataset_version, db)

        return {
            "status": "SUCCESS",
            "message": f"Dataset '{dataset_version}' generated, validated, and analyzed.",
            "data_quality": q_report,
            "analysis_results": run_res,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Sample pipeline failed: {str(e)}")

@router.get("/quality")
def get_data_quality(db: Session = Depends(get_db)):
    datasets = db.query(Dataset).order_by(Dataset.ingested_at.desc()).all()
    results = []
    for d in datasets:
        results.append({
            "dataset_version": d.dataset_version,
            "total_records": d.total_records,
            "valid_records": d.valid_records,
            "invalid_records": d.invalid_records,
            "data_quality_score": d.data_quality_score,
            "ingested_at": d.ingested_at,
        })
    return {"datasets": results}


@router.get("/versions")
def get_dataset_versions(db: Session = Depends(get_db)):
    """
    Returns full provenance and metadata for all ingested dataset versions.
    """
    datasets = (
        db.query(Dataset)
        .order_by(Dataset.ingested_at.desc())
        .all()
    )
    versions = []
    for d in datasets:
        src = d.source
        versions.append({
            "dataset_version": d.dataset_version,
            "source_id": d.source_id,
            "source_name": src.source_name if src else "Unknown Source",
            "file_path": d.file_path,
            "total_records": d.total_records,
            "valid_records": d.valid_records,
            "invalid_records": d.invalid_records,
            "data_quality_score": d.data_quality_score,
            "ingested_at": d.ingested_at.isoformat() if d.ingested_at else None,
            "source_checksum": src.checksum if src else None,
        })
    return {"total_versions": len(versions), "versions": versions}


@router.get("/changes")
def get_ingestion_changes(
    dataset_version: Optional[str] = None,
    change_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Returns audit records for incremental change detection (NEW, UPDATED, UNCHANGED, REMOVED).
    """
    from backend.app.database.models import IngestionChangeRecord

    query = db.query(IngestionChangeRecord)
    if dataset_version:
        query = query.filter(IngestionChangeRecord.dataset_version == dataset_version)
    if change_type:
        query = query.filter(IngestionChangeRecord.change_type == change_type.upper())

    records = query.order_by(IngestionChangeRecord.detected_at.desc()).limit(limit).all()
    change_list = []
    for r in records:
        change_list.append({
            "dataset_version": r.dataset_version,
            "project_id": r.project_id,
            "change_type": r.change_type,
            "changed_fields": r.changed_fields,
            "checksum": r.checksum,
            "detected_at": r.detected_at.isoformat() if r.detected_at else None,
        })

    return {
        "total_returned": len(change_list),
        "changes": change_list,
    }

