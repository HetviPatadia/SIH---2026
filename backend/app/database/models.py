import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    DateTime,
    Boolean,
    ForeignKey,
    JSON,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base
import enum

class RiskPriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class InvestigationStatusEnum(str, enum.Enum):
    NEW = "NEW"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFICATION_REQUIRED = "VERIFICATION_REQUIRED"
    VERIFIED = "VERIFIED"
    DISMISSED = "DISMISSED"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"

class UserRoleEnum(str, enum.Enum):
    VIEWER = "VIEWER"
    AUDITOR = "AUDITOR"
    ADMINISTRATOR = "ADMINISTRATOR"

# 1. Data Provenance & Source Management
class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String(64), unique=True, index=True, nullable=False)
    source_name = Column(String(128), nullable=False)
    dataset_name = Column(String(128), nullable=False)
    source_reference = Column(String(255))
    dataset_period = Column(String(64))
    format = Column(String(32))  # CSV, JSON, API
    download_date = Column(DateTime, default=datetime.datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)
    record_count = Column(Integer, default=0)
    checksum = Column(String(128))

    datasets = relationship("Dataset", back_populates="source")

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    dataset_version = Column(String(64), unique=True, index=True, nullable=False)
    source_id = Column(String(64), ForeignKey("data_sources.source_id"))
    file_path = Column(String(255))
    total_records = Column(Integer, default=0)
    valid_records = Column(Integer, default=0)
    invalid_records = Column(Integer, default=0)
    data_quality_score = Column(Float, default=100.0)
    ingested_at = Column(DateTime, default=datetime.datetime.utcnow)

    source = relationship("DataSource", back_populates="datasets")
    projects = relationship("Project", back_populates="dataset")

# 2. Project Core Tables
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), unique=True, index=True, nullable=False)
    dataset_version = Column(String(64), ForeignKey("datasets.dataset_version"), index=True)
    state = Column(String(100), index=True)
    district = Column(String(100), index=True)
    constituency = Column(String(100), index=True)
    mp_name = Column(String(128))
    sector = Column(String(100), index=True)
    status = Column(String(64), default="Sanctioned", index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    dataset = relationship("Dataset", back_populates="projects")
    location = relationship("ProjectLocation", uselist=False, back_populates="project")
    financial = relationship("ProjectFinancial", uselist=False, back_populates="project")
    timeline = relationship("ProjectTimeline", uselist=False, back_populates="project")
    description = relationship("ProjectDescription", uselist=False, back_populates="project")
    entities = relationship("ProjectEntity", back_populates="project")
    risk_score = relationship("RiskScore", uselist=False, back_populates="project")
    anomaly_signals = relationship("AnomalySignal", back_populates="project")
    investigations = relationship("InvestigationCase", back_populates="project")
    evidences = relationship("ProjectEvidence", back_populates="project")
    evidence_signals = relationship("EvidenceSignal", back_populates="project")
    evidence_confidence = relationship("EvidenceConfidence", uselist=False, back_populates="project")
    asset_fingerprint = relationship("AssetFingerprintRecord", uselist=False, back_populates="project")
    analysis_history = relationship("ProjectAnalysisHistory", backref="project", order_by="desc(ProjectAnalysisHistory.recorded_at)")


class ProjectLocation(Base):
    __tablename__ = "project_locations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), unique=True, index=True)
    block = Column(String(100))
    village = Column(String(100))
    location_name = Column(String(255))
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    has_valid_coords = Column(Boolean, default=False)

    project = relationship("Project", back_populates="location")

class ProjectFinancial(Base):
    __tablename__ = "project_financials"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), unique=True, index=True)
    sanctioned_amount = Column(Float, default=0.0)
    estimated_cost = Column(Float, default=0.0)
    expenditure = Column(Float, default=0.0)
    utilization_ratio = Column(Float, default=0.0)

    project = relationship("Project", back_populates="financial")

class ProjectTimeline(Base):
    __tablename__ = "project_timeline"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), unique=True, index=True)
    recommendation_date = Column(DateTime, nullable=True)
    sanction_date = Column(DateTime, nullable=True)
    start_date = Column(DateTime, nullable=True)
    completion_date = Column(DateTime, nullable=True)
    duration_days = Column(Integer, nullable=True)
    delay_days = Column(Integer, default=0)

    project = relationship("Project", back_populates="timeline")

class ProjectDescription(Base):
    __tablename__ = "project_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), unique=True, index=True)
    title = Column(String(255))
    description_text = Column(Text)
    normalized_text = Column(Text)

    project = relationship("Project", back_populates="description")

# 3. Entities (Contractors, Agencies)
class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    entity_type = Column(String(64), default="CONTRACTOR")  # CONTRACTOR, AGENCY
    registration_no = Column(String(128), nullable=True)
    primary_district = Column(String(100), nullable=True)

    projects = relationship("ProjectEntity", back_populates="entity")
    contractor_profile = relationship("ContractorProfile", uselist=False, backref="entity")


class ProjectEntity(Base):
    __tablename__ = "project_entities"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), index=True)
    entity_id = Column(String(64), ForeignKey("entities.entity_id"), index=True)
    relationship_role = Column(String(64), default="CONTRACTOR")

    project = relationship("Project", back_populates="entities")
    entity = relationship("Entity", back_populates="projects")

# 4. Anomaly Results & Risk Scores
class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(64), unique=True, index=True, nullable=False)
    dataset_version = Column(String(64), ForeignKey("datasets.dataset_version"))
    model_version = Column(String(64), default="model_v1.0")
    status = Column(String(32), default="COMPLETED")  # QUEUED, RUNNING, COMPLETED, FAILED
    total_analyzed = Column(Integer, default=0)
    anomalies_flagged = Column(Integer, default=0)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    configuration = Column(JSON, nullable=True)

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), unique=True, index=True)
    run_id = Column(String(64), ForeignKey("analysis_runs.run_id"))
    unified_score = Column(Float, default=0.0, index=True)  # 0 to 100
    priority_level = Column(SQLEnum(RiskPriorityEnum), default=RiskPriorityEnum.LOW, index=True)
    
    financial_contribution = Column(Float, default=0.0)
    temporal_contribution = Column(Float, default=0.0)
    text_contribution = Column(Float, default=0.0)
    spatial_contribution = Column(Float, default=0.0)
    network_contribution = Column(Float, default=0.0)
    
    explanation_summary = Column(Text)
    evidence_breakdown = Column(JSON)  # Structured evidence facts
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="risk_score")

class AnomalySignal(Base):
    __tablename__ = "anomaly_signals"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), index=True)
    run_id = Column(String(64), ForeignKey("analysis_runs.run_id"))
    engine_name = Column(String(64))  # financial, temporal, text, spatial, network
    signal_type = Column(String(128))  # COST_OUTLIER, VELOCITY_SPIKE, GEO_DUPLICATE, etc.
    severity = Column(String(32), default="MEDIUM")  # LOW, MEDIUM, HIGH
    score = Column(Float, default=0.0)  # 0 to 1
    reason = Column(Text)
    evidence = Column(JSON)

    project = relationship("Project", back_populates="anomaly_signals")

# 5. Investigation Workflow & Case Management
class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(64), unique=True, index=True, nullable=False)
    project_id = Column(String(64), ForeignKey("projects.project_id"), index=True)
    assigned_to = Column(String(64), nullable=True)
    status = Column(SQLEnum(InvestigationStatusEnum), default=InvestigationStatusEnum.NEW, index=True)
    priority = Column(String(32), default="HIGH")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="investigations")
    notes = relationship("InvestigationNote", back_populates="case")

class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("investigation_cases.case_id"), index=True)
    author = Column(String(128), nullable=False)
    note_text = Column(Text, nullable=False)
    action_taken = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("InvestigationCase", back_populates="notes")

# 6. User Auth, RBAC & Audit Trail
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRoleEnum), default=UserRoleEnum.VIEWER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    username = Column(String(64), default="system")
    action = Column(String(128), nullable=False)  # LOGIN, INGEST, ANALYZE, INVESTIGATE_NOTE
    resource = Column(String(128))
    result = Column(String(32), default="SUCCESS")
    details = Column(JSON, nullable=True)


# 7. Asset Evidence Intelligence Layer Models
class ProjectEvidence(Base):
    __tablename__ = "project_evidence"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(64), unique=True, index=True, nullable=False)
    project_id = Column(String(64), ForeignKey("projects.project_id"), index=True, nullable=False)
    evidence_type = Column(String(32), default="COMPLETION_PHOTO", index=True)  # COMPLETION_PHOTO, PROGRESS_PHOTO, SITE_IMAGE, DOCUMENT
    title = Column(String(255))
    description = Column(Text)
    source = Column(String(128), default="eSAKSHI Upload")
    status = Column(String(32), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="evidences")
    file = relationship("EvidenceFile", uselist=False, back_populates="evidence", cascade="all, delete-orphan")
    metadata_record = relationship("EvidenceMetadata", uselist=False, back_populates="evidence", cascade="all, delete-orphan")
    hashes = relationship("EvidenceHash", uselist=False, back_populates="evidence", cascade="all, delete-orphan")
    embedding = relationship("EvidenceEmbedding", uselist=False, back_populates="evidence", cascade="all, delete-orphan")


class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(64), ForeignKey("project_evidence.evidence_id"), unique=True, index=True, nullable=False)
    file_path = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    mime_type = Column(String(64), default="image/jpeg")
    file_size = Column(Integer, default=0)
    sha256 = Column(String(64), index=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    evidence = relationship("ProjectEvidence", back_populates="file")


class EvidenceMetadata(Base):
    __tablename__ = "evidence_metadata"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(64), ForeignKey("project_evidence.evidence_id"), unique=True, index=True, nullable=False)
    capture_time = Column(DateTime, nullable=True)
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    device_make = Column(String(128), nullable=True)
    device_model = Column(String(128), nullable=True)
    has_gps = Column(Boolean, default=False)
    has_timestamp = Column(Boolean, default=False)
    metadata_source = Column(String(64), default="EXIF")
    metadata_reliability = Column(Float, default=1.0)
    raw_exif = Column(JSON, nullable=True)

    evidence = relationship("ProjectEvidence", back_populates="metadata_record")


class EvidenceHash(Base):
    __tablename__ = "evidence_hashes"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(64), ForeignKey("project_evidence.evidence_id"), unique=True, index=True, nullable=False)
    sha256 = Column(String(64), index=True)
    phash = Column(String(64), index=True)
    dhash = Column(String(64), index=True)
    ahash = Column(String(64), index=True)

    evidence = relationship("ProjectEvidence", back_populates="hashes")


class EvidenceEmbedding(Base):
    __tablename__ = "evidence_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(64), ForeignKey("project_evidence.evidence_id"), unique=True, index=True, nullable=False)
    model_name = Column(String(64), default="vision_spatial_v1.0")
    model_version = Column(String(32), default="1.0")
    embedding_dim = Column(Integer, default=64)
    embedding_vector = Column(JSON, nullable=False)

    evidence = relationship("ProjectEvidence", back_populates="embedding")


class EvidenceSimilarity(Base):
    __tablename__ = "evidence_similarity"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id_1 = Column(String(64), index=True, nullable=False)
    evidence_id_2 = Column(String(64), index=True, nullable=False)
    project_id_1 = Column(String(64), index=True, nullable=False)
    project_id_2 = Column(String(64), index=True, nullable=False)
    similarity_method = Column(String(32), default="PHASH")  # EXACT_SHA256, PHASH, DHASH, EMBEDDING_COSINE
    similarity_score = Column(Float, default=0.0)
    match_tier = Column(String(32), default="LOW")  # VERY_HIGH, HIGH, MODERATE, LOW
    details = Column(JSON, nullable=True)
    analyzed_at = Column(DateTime, default=datetime.datetime.utcnow)


class EvidenceSignal(Base):
    __tablename__ = "evidence_signals"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), index=True, nullable=False)
    evidence_id = Column(String(64), nullable=True, index=True)
    signal_type = Column(String(64), index=True, nullable=False)  # EXACT_EVIDENCE_REUSE, POTENTIAL_EVIDENCE_REUSE, EVIDENCE_LOCATION_INCONSISTENCY, TEMPORAL_EVIDENCE_INCONSISTENCY, INSUFFICIENT_EVIDENCE
    severity = Column(String(32), default="MEDIUM")
    confidence = Column(Float, default=0.0)
    explanation = Column(Text, nullable=False)
    evidence_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="evidence_signals")


class EvidenceConfidence(Base):
    __tablename__ = "evidence_confidence"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), unique=True, index=True, nullable=False)
    overall_confidence = Column(Float, default=0.0)  # 0 to 100
    completeness_score = Column(Float, default=0.0)
    metadata_reliability = Column(Float, default=0.0)
    data_freshness = Column(Float, default=0.0)
    confidence_level = Column(String(32), default="INSUFFICIENT")  # HIGH, MEDIUM, LOW, INSUFFICIENT
    reasons = Column(JSON, nullable=True)
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="evidence_confidence")


class AssetFingerprintRecord(Base):
    __tablename__ = "asset_fingerprints"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), unique=True, index=True, nullable=False)
    fingerprint_hash = Column(String(64), index=True, nullable=False)
    fingerprint_data = Column(JSON, nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project", back_populates="asset_fingerprint")


# 8. Longitudinal Intelligence, History Tracking & Contractor Profiling
class ProjectAnalysisHistory(Base):
    __tablename__ = "project_analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(64), ForeignKey("projects.project_id"), index=True, nullable=False)
    run_id = Column(String(64), ForeignKey("analysis_runs.run_id"), index=True, nullable=False)
    dataset_version = Column(String(64), index=True)
    model_version = Column(String(64), default="model_v2.0")
    audit_priority_score = Column(Float, default=0.0)
    priority_level = Column(String(32), default="LOW")
    previous_score = Column(Float, nullable=True)
    score_delta = Column(Float, default=0.0)
    signals_snapshot = Column(JSON, nullable=True)
    contributing_factors = Column(JSON, nullable=True)
    change_summary = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)


class ContractorProfile(Base):
    __tablename__ = "contractor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(String(64), ForeignKey("entities.entity_id"), unique=True, index=True, nullable=False)
    normalized_name = Column(String(255), index=True, nullable=False)
    aliases = Column(JSON, default=list)
    state = Column(String(100), nullable=True)
    primary_district = Column(String(100), nullable=True)
    
    # Portfolio statistics
    total_projects = Column(Integer, default=0)
    total_sanctioned_amount = Column(Float, default=0.0)
    projects_by_year = Column(JSON, default=dict)
    projects_by_status = Column(JSON, default=dict)
    projects_by_district = Column(JSON, default=dict)

    # Sector specialization profile
    primary_sector = Column(String(100), nullable=True)
    sector_distribution = Column(JSON, default=dict)  # {"Roads": 0.52, "Bridges": 0.24, ...}
    sector_value_distribution = Column(JSON, default=dict)

    # Historical financial & duration baselines
    avg_project_value = Column(Float, default=0.0)
    median_project_value = Column(Float, default=0.0)
    value_mad = Column(Float, default=0.0)  # Median Absolute Deviation
    sector_value_baselines = Column(JSON, default=dict)  # sector -> {"median": float, "mad": float}
    avg_duration_days = Column(Float, default=0.0)
    median_duration_days = Column(Float, default=0.0)

    # Historical audit & review signals
    historical_high_priority_count = Column(Integer, default=0)
    review_outcomes_summary = Column(JSON, default=dict)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)


class PriceIndexRecord(Base):
    __tablename__ = "price_index_records"

    id = Column(Integer, primary_key=True, index=True)
    index_code = Column(String(64), index=True, nullable=False)  # WPI_CEMENT, WPI_STEEL, CPWD_INDEX, etc.
    category = Column(String(64), index=True, nullable=False)    # CIVIL_WORKS, ROADS, BRIDGES, WATER, GENERAL
    year = Column(Integer, index=True, nullable=False)
    month = Column(Integer, nullable=True)
    index_value = Column(Float, nullable=False)
    base_year = Column(Integer, default=2020)
    source_name = Column(String(128), default="Ministry of Commerce & Industry / DPIIT")
    source_version = Column(String(64), default="v1.0")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class IngestionChangeRecord(Base):
    __tablename__ = "ingestion_change_records"

    id = Column(Integer, primary_key=True, index=True)
    dataset_version = Column(String(64), index=True, nullable=False)
    project_id = Column(String(64), index=True, nullable=False)
    change_type = Column(String(32), index=True, nullable=False)  # NEW, UPDATED, UNCHANGED, REMOVED
    changed_fields = Column(JSON, default=list)
    checksum = Column(String(64), nullable=True)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)


# 9. Public Citizen Grievances & Reviews
from backend.models.grievance import CitizenGrievance
from backend.models.review import CitizenReview

