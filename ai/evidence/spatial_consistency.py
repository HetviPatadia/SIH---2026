from typing import Dict, Any, Optional
from backend.app.utils.geo import haversine_distance_meters
from backend.app.config import settings


class SpatialEvidenceConsistencyEngine:
    """
    Compares project coordinates with photograph EXIF GPS coordinates.
    Strict Rule: If photograph does not contain reliable GPS metadata,
    DO NOT infer its location. Return 'Location Evidence Unavailable'.
    """

    def __init__(self, tolerance_meters: float = None):
        self.tolerance_meters = tolerance_meters or getattr(settings, "EVIDENCE_GPS_TOLERANCE_METERS", 500.0)

    def evaluate(
        self,
        project_lat: Optional[float],
        project_lon: Optional[float],
        evidence_lat: Optional[float],
        evidence_lon: Optional[float],
        has_gps: bool = False,
    ) -> Dict[str, Any]:
        # 1. Strict absence check
        if not has_gps or evidence_lat is None or evidence_lon is None:
            return {
                "status": "UNAVAILABLE",
                "is_inconsistent": False,
                "distance_meters": None,
                "signal": None,
                "explanation": "Location Evidence Unavailable — photograph does not contain reliable GPS metadata.",
            }

        if project_lat is None or project_lon is None:
            return {
                "status": "UNAVAILABLE",
                "is_inconsistent": False,
                "distance_meters": None,
                "signal": None,
                "explanation": "Location Evidence Unavailable — project record lacks registered geographic coordinates.",
            }

        # 2. Compute Haversine distance
        try:
            distance = haversine_distance_meters(project_lat, project_lon, evidence_lat, evidence_lon)
            distance_round = round(distance, 1)

            if distance > self.tolerance_meters:
                # Moderate or High discrepancy
                severity = "HIGH" if distance > 2000.0 else "MEDIUM"
                dist_str = f"{distance_round:.0f} meters" if distance < 1000 else f"{distance_round / 1000.0:.2f} km"
                
                return {
                    "status": "INCONSISTENT",
                    "is_inconsistent": True,
                    "distance_meters": distance_round,
                    "tolerance_meters": self.tolerance_meters,
                    "severity": severity,
                    "signal": "EVIDENCE_LOCATION_INCONSISTENCY",
                    "explanation": (
                        f"Evidence GPS metadata is located approximately {dist_str} away from recorded "
                        f"project site coordinates (threshold: {self.tolerance_meters:.0f}m). "
                        f"Human administrative verification recommended."
                    ),
                }
            else:
                return {
                    "status": "CONSISTENT",
                    "is_inconsistent": False,
                    "distance_meters": distance_round,
                    "tolerance_meters": self.tolerance_meters,
                    "signal": None,
                    "explanation": (
                        f"Evidence GPS metadata matches recorded project location within allowable "
                        f"threshold ({distance_round:.0f}m <= {self.tolerance_meters:.0f}m)."
                    ),
                }
        except Exception as e:
            return {
                "status": "ERROR",
                "is_inconsistent": False,
                "distance_meters": None,
                "signal": None,
                "explanation": f"Unable to calculate geographic distance: {e}",
            }
