import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from backend.data_generator import generate_mplads_dataset
from ai.preprocessing.ingestion import DataIngestionEngine
from ai.preprocessing.validator import DataQualityEngine
from ai.preprocessing.normalizer import DataNormalizer
from backend.app.services.analysis_orchestrator import AnalysisOrchestrator
from backend.app.database.connection import SessionLocal, Base, engine
from backend.app.database.models import DataSource, Dataset

def initialize_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("1. Generating realistic MPLADS dataset (1,200 projects with injected anomalies)...")
    csv_path = generate_mplads_dataset(num_records=1200, output_filename="mplads_initial_dataset.csv")

    print("2. Ingesting raw dataset and computing provenance checksums...")
    ingest = DataIngestionEngine()
    raw_df, meta = ingest.ingest_file(
        source_path=str(csv_path),
        source_id="mospi_esakshi_benchmark",
        source_name="MoSPI eSAKSHI & data.gov.in Simulated Benchmark",
        dataset_name="MPLADS Project Registry 2024-2026",
        dataset_version="ds_v1.0",
    )

    # Register Data Source
    ds = db.query(DataSource).filter(DataSource.source_id == "mospi_esakshi_benchmark").first()
    if not ds:
        ds = DataSource(
            source_id="mospi_esakshi_benchmark",
            source_name=meta["source_name"],
            dataset_name=meta["dataset_name"],
            format="CSV",
            checksum=meta["checksum"],
            record_count=meta["record_count"],
        )
        db.add(ds)
        db.flush()

    print("3. Validating data quality...")
    val = DataQualityEngine()
    valid_df, rejected, q_report = val.validate(raw_df, "ds_v1.0")

    print("4. Normalizing geographic, financial, and temporal fields...")
    norm = DataNormalizer()
    norm_df = norm.normalize(valid_df)

    # Save dataset entry
    dset = db.query(Dataset).filter(Dataset.dataset_version == "ds_v1.0").first()
    if not dset:
        dset = Dataset(
            dataset_version="ds_v1.0",
            source_id=ds.source_id,
            file_path=meta["raw_file_path"],
            total_records=q_report["total_records"],
            valid_records=q_report["valid_records"],
            invalid_records=q_report["rejected_records"],
            data_quality_score=q_report["data_quality_score"],
        )
        db.add(dset)
        db.commit()

    print("5. Executing 6 Multi-Modal AI Detection Engines & Unified Risk Priority Scorer...")
    orchestrator = AnalysisOrchestrator()
    results = orchestrator.run_pipeline(norm_df, "ds_v1.0", db)

    db.close()
    print("\nInitialization Complete!")
    print(f"Total Projects Analyzed: {results['total_analyzed']}")
    print(f"High/Critical Priority Flags: {results['high_critical_count']}")
    print(f"Total Flagged Items: {results['flagged_count']}")
    print("\nDatabase is fully seeded with live audit data!")

if __name__ == "__main__":
    initialize_database()
