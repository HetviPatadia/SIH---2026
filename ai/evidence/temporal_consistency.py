import datetime
from typing import Dict, Any, Optional


class TemporalEvidenceConsistencyEngine:
    """
    Compares project lifecycle dates (Sanction, Start, Completion) with evidence capture timestamps.
    Detects potential timeline anomalies while accounting for device/timezone tolerances.
    """

    def evaluate(
        self,
        sanction_date: Optional[datetime.datetime],
        start_date: Optional[datetime.datetime],
        completion_date: Optional[datetime.datetime],
        evidence_time: Optional[datetime.datetime],
        evidence_type: str = "COMPLETION_PHOTO",
        has_timestamp: bool = False,
    ) -> Dict[str, Any]:
        if not has_timestamp or evidence_time is None:
            return {
                "status": "UNAVAILABLE",
                "is_inconsistent": False,
                "signal": None,
                "explanation": "Timeline Evidence Unavailable — photograph metadata does not contain a verifiable capture timestamp.",
            }

        # Normalize dates
        ev_dt = evidence_time.replace(tzinfo=None) if hasattr(evidence_time, "replace") else evidence_time

        # Case 1: Photo captured significantly BEFORE project sanction (tolerance: 45 days for preliminary survey)
        if sanction_date:
            s_dt = sanction_date.replace(tzinfo=None)
            delta_days = (s_dt - ev_dt).days
            if delta_days > 45:
                return {
                    "status": "INCONSISTENT",
                    "is_inconsistent": True,
                    "signal": "TEMPORAL_EVIDENCE_INCONSISTENCY",
                    "severity": "MEDIUM",
                    "explanation": (
                        f"Evidence capture timestamp ({ev_dt.strftime('%d %b %Y')}) is {delta_days} days prior "
                        f"to project sanction date ({s_dt.strftime('%d %b %Y')}). "
                        f"Human verification recommended to confirm whether historical photos were submitted."
                    ),
                    "days_discrepancy": delta_days,
                }

        # Case 2: Completion photo claimed, but timestamp is significantly before work started
        if evidence_type == "COMPLETION_PHOTO" and start_date:
            st_dt = start_date.replace(tzinfo=None)
            if (st_dt - ev_dt).days > 15:
                delta_days = (st_dt - ev_dt).days
                return {
                    "status": "INCONSISTENT",
                    "is_inconsistent": True,
                    "signal": "TEMPORAL_EVIDENCE_INCONSISTENCY",
                    "severity": "HIGH",
                    "explanation": (
                        f"Completion photograph was captured on {ev_dt.strftime('%d %b %Y')}, prior to the "
                        f"official project start date ({st_dt.strftime('%d %b %Y')}). "
                        f"Timeline verification recommended."
                    ),
                    "days_discrepancy": delta_days,
                }

        # Case 3: Completion photo taken long AFTER reported completion (> 365 days)
        if evidence_type == "COMPLETION_PHOTO" and completion_date:
            c_dt = completion_date.replace(tzinfo=None)
            if (ev_dt - c_dt).days > 365:
                delta_days = (ev_dt - c_dt).days
                return {
                    "status": "INCONSISTENT",
                    "is_inconsistent": True,
                    "signal": "TEMPORAL_EVIDENCE_INCONSISTENCY",
                    "severity": "LOW",
                    "explanation": (
                        f"Evidence timestamp ({ev_dt.strftime('%d %b %Y')}) is over {delta_days} days after "
                        f"recorded project completion ({c_dt.strftime('%d %b %Y')}). "
                        f"Likely delayed administrative upload; verify freshness."
                    ),
                    "days_discrepancy": delta_days,
                }

        return {
            "status": "CONSISTENT",
            "is_inconsistent": False,
            "signal": None,
            "explanation": f"Evidence timestamp ({ev_dt.strftime('%d %b %Y')}) aligns within the expected project lifecycle.",
            "days_discrepancy": 0,
        }
