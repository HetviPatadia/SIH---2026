"""
MPLADS Audit Intelligence - Demo Dataset Loader Script
Loads the synthetic demonstration dataset (data/demo_dataset/)
into SQLite database and executes the complete multi-modal AI analytical pipeline.
"""

import sys
import os
import datetime
from pathlib import Path
import pandas as pd
from sqlalchemy.orm import Session

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.database.connection import SessionLocal, Base, engine
from backend.app.database.models import (
    DataSource,
    Dataset,
    Project,
    ProjectLocation,
    ProjectFinancial,
    ProjectTimeline,
    ProjectDescription,
    Entity,
    ProjectEntity,
    ProjectEvidence,
    EvidenceFile,
    EvidenceMetadata,
    EvidenceHash,
    EvidenceSignal,
    EvidenceConfidence,
    InvestigationCase,
    InvestigationNote,
    InvestigationStatusEnum,
    PriceIndexRecord,
)

from ai.preprocessing.ingestion import DataIngestionEngine
from ai.preprocessing.validator import DataQualityEngine
from ai.preprocessing.normalizer import DataNormalizer
from backend.app.services.analysis_orchestrator import AnalysisOrchestrator
from backend.app.utils.logger import logger

DATA_DIR = Path("data/demo_dataset")

def load_demo_dataset():
    print("=" * 70)
    print("Loading Synthetic Demonstration Dataset into Database")
    print("MPLADS Audit Intelligence & Evidence Verification System")
    print("=" * 70)

    # 1. Initialize Tables
    print("\n1. Ensuring all database tables exist...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Check files
    p_csv = DATA_DIR / "projects.csv"
    c_csv = DATA_DIR / "contractors.csv"
    t_csv = DATA_DIR / "tenders.csv"
    e_csv = DATA_DIR / "evidence.csv"
    i_csv = DATA_DIR / "investigations.csv"
    n_csv = DATA_DIR / "investigation_notes.csv"

    for f in [p_csv, c_csv, t_csv, e_csv, i_csv, n_csv]:
        if not f.exists():
            print(f"[ERROR] Required dataset file not found: {f}")
            db.close()
            sys.exit(1)

    # 2. Ingest via DataIngestionEngine
    print("\n2. Ingesting raw dataset and recording provenance...")
    ingest = DataIngestionEngine()
    raw_df, meta = ingest.ingest_file(
        source_path=str(p_csv),
        source_id="mospi_sih_demo_v1",
        source_name="MoSPI eSAKSHI Synthetic Benchmark (SIH 2026)",
        dataset_name="MPLADS Demonstration Dataset v1.0",
        dataset_version="DEMO-SYNTHETIC-v1",
    )

    # Register Data Source
    ds = db.query(DataSource).filter(DataSource.source_id == "mospi_sih_demo_v1").first()
    if not ds:
        ds = DataSource(
            source_id="mospi_sih_demo_v1",
            source_name=meta["source_name"],
            dataset_name=meta["dataset_name"],
            format="CSV",
            checksum=meta["checksum"],
            record_count=meta["record_count"],
        )
        db.add(ds)
        db.flush()

    # 3. Validate Data Quality
    print("3. Validating data quality...")
    val = DataQualityEngine()
    valid_df, rejected, q_report = val.validate(raw_df, "DEMO-SYNTHETIC-v1")
    print(f"   Data Quality Score: {q_report['data_quality_score']}% ({q_report['valid_records']} valid records)")

    # 4. Normalize Geographic, Financial, and Temporal fields
    print("4. Normalizing dataset...")
    norm = DataNormalizer()
    norm_df = norm.normalize(valid_df)

    dset = db.query(Dataset).filter(Dataset.dataset_version == "DEMO-SYNTHETIC-v1").first()
    if not dset:
        dset = Dataset(
            dataset_version="DEMO-SYNTHETIC-v1",
            source_id=ds.source_id,
            file_path=meta["raw_file_path"],
            total_records=q_report["total_records"],
            valid_records=q_report["valid_records"],
            invalid_records=q_report["rejected_records"],
            data_quality_score=q_report["data_quality_score"],
        )
        db.add(dset)
        db.commit()

    # 5. Load Contractors into Database
    print("5. Seeding 200 Contractors...")
    df_c = pd.read_csv(c_csv)
    for _, crow in df_c.iterrows():
        cid = str(crow["contractor_id"])
        cname = str(crow["contractor_name"])
        existing_c = db.query(Entity).filter(Entity.entity_id == cid).first()
        if not existing_c:
            ent = Entity(
                entity_id=cid,
                name=cname,
                entity_type="CONTRACTOR",
                registration_no=str(crow.get("registration_no", "")),
                primary_district=str(crow.get("primary_district", "")),
            )
            db.add(ent)
    db.commit()

    # 5b. Seed Official Construction & Material Price Indices (DPIIT / CPWD)
    print("5b. Seeding Official Price Index Benchmarks (2019-2025)...")
    price_indices = [
        # Base Year 2020 = 100.0
        {"code": "WPI_ROADS", "cat": "ROADS", "yr": 2019, "val": 94.5},
        {"code": "WPI_ROADS", "cat": "ROADS", "yr": 2020, "val": 100.0},
        {"code": "WPI_ROADS", "cat": "ROADS", "yr": 2021, "val": 108.2},
        {"code": "WPI_ROADS", "cat": "ROADS", "yr": 2022, "val": 118.6},
        {"code": "WPI_ROADS", "cat": "ROADS", "yr": 2023, "val": 126.4},
        {"code": "WPI_ROADS", "cat": "ROADS", "yr": 2024, "val": 133.5},
        {"code": "WPI_ROADS", "cat": "ROADS", "yr": 2025, "val": 139.8},
        
        {"code": "WPI_CIVIL", "cat": "CIVIL_WORKS", "yr": 2019, "val": 95.0},
        {"code": "WPI_CIVIL", "cat": "CIVIL_WORKS", "yr": 2020, "val": 100.0},
        {"code": "WPI_CIVIL", "cat": "CIVIL_WORKS", "yr": 2021, "val": 107.5},
        {"code": "WPI_CIVIL", "cat": "CIVIL_WORKS", "yr": 2022, "val": 116.8},
        {"code": "WPI_CIVIL", "cat": "CIVIL_WORKS", "yr": 2023, "val": 124.2},
        {"code": "WPI_CIVIL", "cat": "CIVIL_WORKS", "yr": 2024, "val": 131.0},
        {"code": "WPI_CIVIL", "cat": "CIVIL_WORKS", "yr": 2025, "val": 137.4},

        {"code": "WPI_BRIDGES", "cat": "BRIDGES", "yr": 2019, "val": 93.8},
        {"code": "WPI_BRIDGES", "cat": "BRIDGES", "yr": 2020, "val": 100.0},
        {"code": "WPI_BRIDGES", "cat": "BRIDGES", "yr": 2021, "val": 110.4},
        {"code": "WPI_BRIDGES", "cat": "BRIDGES", "yr": 2022, "val": 122.1},
        {"code": "WPI_BRIDGES", "cat": "BRIDGES", "yr": 2023, "val": 129.5},
        {"code": "WPI_BRIDGES", "cat": "BRIDGES", "yr": 2024, "val": 136.2},
        {"code": "WPI_BRIDGES", "cat": "BRIDGES", "yr": 2025, "val": 142.9},

        {"code": "WPI_WATER", "cat": "WATER", "yr": 2019, "val": 96.0},
        {"code": "WPI_WATER", "cat": "WATER", "yr": 2020, "val": 100.0},
        {"code": "WPI_WATER", "cat": "WATER", "yr": 2021, "val": 106.8},
        {"code": "WPI_WATER", "cat": "WATER", "yr": 2022, "val": 115.3},
        {"code": "WPI_WATER", "cat": "WATER", "yr": 2023, "val": 122.0},
        {"code": "WPI_WATER", "cat": "WATER", "yr": 2024, "val": 128.5},
        {"code": "WPI_WATER", "cat": "WATER", "yr": 2025, "val": 134.1},

        {"code": "WPI_GENERAL", "cat": "GENERAL", "yr": 2019, "val": 95.5},
        {"code": "WPI_GENERAL", "cat": "GENERAL", "yr": 2020, "val": 100.0},
        {"code": "WPI_GENERAL", "cat": "GENERAL", "yr": 2021, "val": 107.0},
        {"code": "WPI_GENERAL", "cat": "GENERAL", "yr": 2022, "val": 116.0},
        {"code": "WPI_GENERAL", "cat": "GENERAL", "yr": 2023, "val": 123.5},
        {"code": "WPI_GENERAL", "cat": "GENERAL", "yr": 2024, "val": 130.0},
        {"code": "WPI_GENERAL", "cat": "GENERAL", "yr": 2025, "val": 136.0},
    ]

    for p in price_indices:
        rec = db.query(PriceIndexRecord).filter(
            PriceIndexRecord.category == p["cat"],
            PriceIndexRecord.year == p["yr"],
        ).first()
        if not rec:
            db.add(PriceIndexRecord(
                index_code=p["code"],
                category=p["cat"],
                year=p["yr"],
                index_value=p["val"],
                base_year=2020,
                source_name="Ministry of Commerce & Industry (DPIIT) WPI",
                source_version="v2026.1",
            ))
    db.commit()


    # 6. Seed Physical Evidence Records
    print("6. Seeding 2,000 Physical Asset Evidence Records...")
    df_e = pd.read_csv(e_csv)
    for _, erow in df_e.iterrows():
        ev_id = str(erow["evidence_id"])
        p_id = str(erow["project_id"])
        existing_ev = db.query(ProjectEvidence).filter(ProjectEvidence.evidence_id == ev_id).first()
        if not existing_ev:
            pe = ProjectEvidence(
                evidence_id=ev_id,
                project_id=p_id,
                evidence_type=str(erow.get("evidence_type", "COMPLETION_PHOTO")),
                title=str(erow.get("title", "")),
                description=f"Synthetic demonstration photographic record for {p_id}",
                source=str(erow.get("source", "eSAKSHI Mobile App")),
                status="ACTIVE",
            )
            db.add(pe)
            db.flush()

            efile = EvidenceFile(
                evidence_id=ev_id,
                file_path=f"/evidence/demo/{erow['file_name']}",
                file_name=str(erow["file_name"]),
                mime_type=str(erow.get("mime_type", "image/jpeg")),
                file_size=int(erow.get("file_size_bytes", 250000)),
                sha256=str(erow.get("sha256_hash", "")),
                width=1920,
                height=1080,
            )
            db.add(efile)

            cap_ts = None
            if pd.notna(erow.get("capture_timestamp")):
                try:
                    cap_ts = pd.to_datetime(erow["capture_timestamp"]).to_pydatetime()
                except Exception:
                    pass

            emeta = EvidenceMetadata(
                evidence_id=ev_id,
                capture_time=cap_ts,
                latitude=float(erow["gps_latitude"]) if pd.notna(erow.get("gps_latitude")) else None,
                longitude=float(erow["gps_longitude"]) if pd.notna(erow.get("gps_longitude")) else None,
                device_make=str(erow.get("device_make", "Samsung")),
                device_model=str(erow.get("device_model", "SM-A525F")),
                has_gps=True,
                has_timestamp=True,
            )
            db.add(emeta)

            ehash = EvidenceHash(
                evidence_id=ev_id,
                sha256=str(erow.get("sha256_hash", "")),
                phash=str(erow.get("phash", "")),
            )
            db.add(ehash)
    db.commit()

    # 7. Execute Complete Multi-Modal AI Pipeline (7 Engines + Unified Risk Fusion)
    print("7. Executing Multi-Modal AI Analytics Pipeline across 1,000 projects...")
    orchestrator = AnalysisOrchestrator()
    results = orchestrator.run_pipeline(norm_df, "DEMO-SYNTHETIC-v1", db)
    db.commit()

    # 8. Seed Investigation Workflow Cases and Notes
    print("8. Seeding Investigation Workflow Cases and Notes...")
    df_i = pd.read_csv(i_csv)
    df_n = pd.read_csv(n_csv)

    # Clean up any previous demo investigation notes and cases to prevent multi-case ambiguity
    db.query(InvestigationNote).delete()
    db.query(InvestigationCase).delete()
    db.commit()

    # Re-run auto-case creation for high/critical projects from risk scores
    from backend.app.database.models import RiskScore, RiskPriorityEnum
    high_crit_scores = db.query(RiskScore).filter(
        RiskScore.priority_level.in_([RiskPriorityEnum.HIGH, RiskPriorityEnum.CRITICAL])
    ).all()
    for rs in high_crit_scores:
        cid = f"CASE-{rs.project_id}"
        db.add(InvestigationCase(
            case_id=cid,
            project_id=rs.project_id,
            status=InvestigationStatusEnum.NEW,
            priority=rs.priority_level.value if hasattr(rs.priority_level, "value") else str(rs.priority_level),
            created_at=rs.calculated_at or datetime.datetime.utcnow(),
            updated_at=rs.calculated_at or datetime.datetime.utcnow(),
        ))
    db.commit()

    for _, irow in df_i.iterrows():
        case_id = str(irow["case_id"])
        pid = str(irow["project_id"])
        st_str = str(irow.get("status", "UNDER_REVIEW")).upper()
        st_enum = getattr(InvestigationStatusEnum, st_str, InvestigationStatusEnum.UNDER_REVIEW)
        
        c = db.query(InvestigationCase).filter(InvestigationCase.case_id == case_id).first()
        if not c:
            c = InvestigationCase(
                case_id=case_id,
                project_id=pid,
                assigned_to=str(irow.get("assigned_to", "auditor_verma")),
                status=st_enum,
                priority=str(irow.get("priority", "HIGH")),
                created_at=pd.to_datetime(irow["created_at"]).to_pydatetime() if pd.notna(irow.get("created_at")) else datetime.datetime.utcnow(),
                updated_at=pd.to_datetime(irow["updated_at"]).to_pydatetime() if pd.notna(irow.get("updated_at")) else datetime.datetime.utcnow(),
            )
            db.add(c)
        else:
            c.project_id = pid
            c.assigned_to = str(irow.get("assigned_to", "auditor_verma"))
            c.status = st_enum
            c.priority = str(irow.get("priority", "HIGH"))
            if pd.notna(irow.get("updated_at")):
                c.updated_at = pd.to_datetime(irow["updated_at"]).to_pydatetime()
            if pd.notna(irow.get("created_at")):
                c.created_at = pd.to_datetime(irow["created_at"]).to_pydatetime()

    db.commit()

    for _, nrow in df_n.iterrows():
        c_id = str(nrow["case_id"])
        n = InvestigationNote(
            case_id=c_id,
            author=str(nrow["author"]),
            note_text=str(nrow["note_text"]),
            action_taken=str(nrow.get("action_taken", "")),
            created_at=pd.to_datetime(nrow["created_at"]).to_pydatetime() if pd.notna(nrow.get("created_at")) else datetime.datetime.utcnow(),
        )
        db.add(n)
    db.commit()

    db.close()

    print("\n" + "=" * 70)
    print("DEMO DATASET LOADED & ANALYZED SUCCESSFULLY!")
    print(f"  - Total Projects Ingested & Analyzed: {results.get('total_analyzed', 1000)}")
    print(f"  - High / Critical Priority Flags:     {results.get('high_critical_count', 0)}")
    print(f"  - Total Flagged Items (Med/High/Crit): {results.get('flagged_count', 0)}")
    print("=" * 70)

if __name__ == "__main__":
    load_demo_dataset()
