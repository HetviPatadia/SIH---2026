import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BASE_DIR / ".env"), extra="ignore")

    PROJECT_NAME: str = "SIH26102 — MPLADS AI Audit Intelligence System"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/mplads_audit.db"

    # Security & JWT
    SECRET_KEY: str = "sih26102_secure_audit_secret_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALLOW_DEMO_AUTH: bool = False
    CORS_ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Risk Priority Score Thresholds (0-100)
    THRESHOLD_LOW: int = 30
    THRESHOLD_MEDIUM: int = 60
    THRESHOLD_HIGH: int = 80
    THRESHOLD_CRITICAL: int = 100

    # Directory Paths
    DATA_DIR: Path = BASE_DIR / "data"
    RAW_DATA_DIR: Path = BASE_DIR / "data" / "raw"
    PROCESSED_DATA_DIR: Path = BASE_DIR / "data" / "processed"
    REJECTED_DATA_DIR: Path = BASE_DIR / "data" / "rejected"
    METADATA_DIR: Path = BASE_DIR / "data" / "metadata"
    REPORTS_DIR: Path = BASE_DIR / "reports"
    EVIDENCE_DIR: Path = BASE_DIR / "data" / "evidence"

    # Evidence Similarity & Consistency Thresholds
    SIMILARITY_VERY_HIGH: float = 0.95
    SIMILARITY_HIGH: float = 0.90
    SIMILARITY_MODERATE: float = 0.80
    EVIDENCE_GPS_TOLERANCE_METERS: float = 500.0

    # Model & Version Tracking
    DEFAULT_DATASET_VERSION: str = "ds_v1.0"
    DEFAULT_MODEL_VERSION: str = "model_v1.0"

    # AI Assistant Settings
    AI_MODEL: str = "qwen3:8b"
    OLLAMA_BASE_URL: str = "http://localhost:11434"


settings = Settings()

# Ensure directories exist
for folder in [
    settings.DATA_DIR,
    settings.RAW_DATA_DIR,
    settings.PROCESSED_DATA_DIR,
    settings.REJECTED_DATA_DIR,
    settings.METADATA_DIR,
    settings.REPORTS_DIR,
    settings.EVIDENCE_DIR,
]:
    folder.mkdir(parents=True, exist_ok=True)
