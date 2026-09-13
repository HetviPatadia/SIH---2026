"""
Evidence Status Model
Provides deterministic evaluation of evidence verification status based on
actual evidence signals, metadata reliability, and physical presence.

Priority Order:
1. POTENTIAL_REUSE: Exact hash match or high visual feature similarity with another project.
2. LOCATION_INCONSISTENCY: Photo EXIF GPS coordinates conflict with registered project site.
3. TEMPORAL_INCONSISTENCY: Photo timestamp is incompatible with project execution window.
4. INSUFFICIENT_METADATA: Required EXIF metadata (GPS or timestamp) is missing or corrupted.
5. REVIEW_REQUIRED: Moderate anomaly signals or manual verification flag.
6. VERIFIED: Valid metadata, no anomaly signals, consistent spatial/temporal checks.
7. UNAVAILABLE: Evidence record exists but physical file is missing or unreadable.
"""
from typing import List, Optional, Tuple, Dict, Any

EVIDENCE_STATUS_POTENTIAL_REUSE = "POTENTIAL_REUSE"
EVIDENCE_STATUS_LOCATION_INCONSISTENCY = "LOCATION_INCONSISTENCY"
EVIDENCE_STATUS_TEMPORAL_INCONSISTENCY = "TEMPORAL_INCONSISTENCY"
EVIDENCE_STATUS_INSUFFICIENT_METADATA = "INSUFFICIENT_METADATA"
EVIDENCE_STATUS_REVIEW_REQUIRED = "REVIEW_REQUIRED"
EVIDENCE_STATUS_VERIFIED = "VERIFIED"
EVIDENCE_STATUS_UNAVAILABLE = "UNAVAILABLE"

VALID_EVIDENCE_STATUSES = [
    EVIDENCE_STATUS_POTENTIAL_REUSE,
    EVIDENCE_STATUS_LOCATION_INCONSISTENCY,
    EVIDENCE_STATUS_TEMPORAL_INCONSISTENCY,
    EVIDENCE_STATUS_INSUFFICIENT_METADATA,
    EVIDENCE_STATUS_REVIEW_REQUIRED,
    EVIDENCE_STATUS_VERIFIED,
    EVIDENCE_STATUS_UNAVAILABLE,
]

def determine_evidence_status(
    signals: List[Any],
    has_file: bool = True,
    has_metadata: bool = True,
    metadata_reliability: float = 1.0,
    has_gps: bool = False,
    has_timestamp: bool = False,
) -> Tuple[str, List[str]]:
    """
    Deterministic rule engine mapping actual evidence signals and metadata to a clear status.
    Returns (status, list_of_signal_types).
    """
    if not has_file:
        return EVIDENCE_STATUS_UNAVAILABLE, []

    signal_types = []
    for s in signals:
        st = getattr(s, "signal_type", None) or (s.get("signal_type") if isinstance(s, dict) else str(s))
        if st:
            signal_types.append(st)

    # 1. Potential / Exact Reuse
    if any(st in ("EXACT_EVIDENCE_REUSE", "POTENTIAL_EVIDENCE_REUSE") for st in signal_types):
        return EVIDENCE_STATUS_POTENTIAL_REUSE, signal_types

    # 2. Location Inconsistency
    if "EVIDENCE_LOCATION_INCONSISTENCY" in signal_types:
        return EVIDENCE_STATUS_LOCATION_INCONSISTENCY, signal_types

    # 3. Temporal Inconsistency
    if "TEMPORAL_EVIDENCE_INCONSISTENCY" in signal_types:
        return EVIDENCE_STATUS_TEMPORAL_INCONSISTENCY, signal_types

    # 4. Insufficient Metadata
    if not has_metadata or (not has_gps and not has_timestamp) or metadata_reliability < 0.2:
        return EVIDENCE_STATUS_INSUFFICIENT_METADATA, signal_types

    # 5. Other review signals (e.g. INSUFFICIENT_EVIDENCE, low confidence flags)
    if signal_types:
        return EVIDENCE_STATUS_REVIEW_REQUIRED, signal_types

    # 6. Verified: all clear
    return EVIDENCE_STATUS_VERIFIED, signal_types
