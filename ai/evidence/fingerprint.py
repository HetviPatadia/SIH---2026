import hashlib
import json
import datetime
from typing import Dict, Any, List, Optional


class AssetFingerprintEngine:
    """
    Constructs an immutable digital 'Asset Fingerprint' for every project.
    Combines Project Identity, Financial, Timeline, Entities, and Evidence.
    Tolerates missing fields gracefully without fabricating data.
    """

    @staticmethod
    def _safe_iso(val: Any) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, (datetime.datetime, datetime.date)):
            return val.isoformat()
        return str(val)

    def generate_fingerprint(
        self,
        project_data: Dict[str, Any],
        location_data: Optional[Dict[str, Any]] = None,
        financial_data: Optional[Dict[str, Any]] = None,
        timeline_data: Optional[Dict[str, Any]] = None,
        entities_data: Optional[List[Dict[str, Any]]] = None,
        evidence_list: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        loc = location_data or {}
        fin = financial_data or {}
        tim = timeline_data or {}
        ents = entities_data or []
        ev_items = evidence_list or []

        # 1. Project Identity Section
        identity = {
            "project_id": str(project_data.get("project_id", "")),
            "work_name": str(project_data.get("title", project_data.get("project_id", ""))),
            "state": str(project_data.get("state", "")),
            "district": str(project_data.get("district", "")),
            "constituency": str(project_data.get("constituency", "")),
            "sector": str(project_data.get("sector", "")),
            "block": str(loc.get("block", "")),
            "village": str(loc.get("village", "")),
            "coordinates": {
                "latitude": loc.get("latitude"),
                "longitude": loc.get("longitude"),
                "has_valid_coords": bool(loc.get("has_valid_coords", False)),
            },
        }

        # 2. Financial Section
        financials = {
            "sanctioned_amount": float(fin.get("sanctioned_amount", 0.0)),
            "estimated_cost": float(fin.get("estimated_cost", 0.0)),
            "expenditure": float(fin.get("expenditure", 0.0)),
            "utilization_ratio": float(fin.get("utilization_ratio", 0.0)),
        }

        # 3. Timeline Section
        timeline = {
            "recommendation_date": self._safe_iso(tim.get("recommendation_date")),
            "sanction_date": self._safe_iso(tim.get("sanction_date")),
            "start_date": self._safe_iso(tim.get("start_date")),
            "completion_date": self._safe_iso(tim.get("completion_date")),
            "duration_days": tim.get("duration_days"),
        }

        # 4. Entity Section
        entities = [
            {
                "entity_id": str(e.get("entity_id", "")),
                "name": str(e.get("name", "")),
                "role": str(e.get("role", "CONTRACTOR")),
            }
            for e in ents
        ]

        # 5. Evidence Fingerprints Section
        evidence_summary = []
        for ev in ev_items:
            hashes = ev.get("hashes", {})
            meta = ev.get("metadata", {})
            evidence_summary.append({
                "evidence_id": str(ev.get("evidence_id", "")),
                "evidence_type": str(ev.get("evidence_type", "PHOTO")),
                "sha256": hashes.get("sha256"),
                "phash": hashes.get("phash"),
                "dhash": hashes.get("dhash"),
                "has_gps": bool(meta.get("has_gps", False)),
                "capture_time": self._safe_iso(meta.get("capture_time")),
            })

        fingerprint_data = {
            "version": "fp_v1.0",
            "identity": identity,
            "financials": financials,
            "timeline": timeline,
            "entities": entities,
            "evidence": evidence_summary,
            "generated_at": datetime.datetime.utcnow().isoformat(),
        }

        # Compute deterministic cryptographic hash of the canonical fingerprint JSON
        canonical_json = json.dumps(fingerprint_data, sort_keys=True)
        fingerprint_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        return {
            "fingerprint_hash": fingerprint_hash,
            "fingerprint_data": fingerprint_data,
        }
