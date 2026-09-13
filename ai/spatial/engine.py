import numpy as np
import pandas as pd
from typing import Dict, Any, List
from backend.app.utils.geo import haversine_distance_km
from backend.app.utils.logger import logger

class SpatialAnomalyEngine:
    """
    Detects physical duplicate works in unusual proximity (< 150 meters)
    and anomalous spatial clusters across wards and villages.
    """

    def __init__(self, proximity_threshold_km: float = 0.15):  # 150 meters
        self.proximity_threshold_km = proximity_threshold_km

    def analyze(self, df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        results = {}
        if len(df) == 0:
            return results

        # Filter projects with valid coordinates
        valid_coords_mask = df["has_valid_coords"] == True
        valid_df = df[valid_coords_mask].copy()

        # Prepopulate projects without valid coords
        for _, row in df[~valid_coords_mask].iterrows():
            pid = str(row["project_id"])
            results[pid] = {
                "status": "UNAVAILABLE",
                "score": 0.0,
                "signal": "NO_GEO_COORDINATES",
                "explanation": "Geographic coordinates are not available for spatial proximity analysis.",
                "evidence": {},
                "nearby_project_ids": [],
            }

        pids = valid_df["project_id"].astype(str).tolist()
        lats = valid_df["latitude"].values
        lons = valid_df["longitude"].values
        sectors = valid_df["sector"].fillna("").tolist()
        n = len(pids)

        for i in range(n):
            pid = pids[i]
            lat_i, lon_i, sec_i = lats[i], lons[i], sectors[i]

            nearby_same_sector = []
            min_dist_km = float("inf")

            for j in range(n):
                if i == j:
                    continue
                dist_km = haversine_distance_km(lat_i, lon_i, lats[j], lons[j])
                if dist_km < min_dist_km:
                    min_dist_km = dist_km

                if dist_km <= self.proximity_threshold_km:
                    # Check sector / category overlap
                    is_same_sector = (sec_i == sectors[j])
                    nearby_same_sector.append({
                        "project_id": pids[j],
                        "distance_meters": round(dist_km * 1000, 1),
                        "same_sector": is_same_sector,
                    })

            if nearby_same_sector:
                duplicate_candidates = [m for m in nearby_same_sector if m["same_sector"]]
                if duplicate_candidates:
                    score = 0.85
                    signal = "POTENTIAL_GEO_DUPLICATE"
                    explanation = (
                        f"Project is within {duplicate_candidates[0]['distance_meters']}m of "
                        f"project '{duplicate_candidates[0]['project_id']}' in the same sector ({sec_i}). "
                        f"Requires physical verification of site independence."
                    )
                else:
                    score = 0.50
                    signal = "HIGH_SPATIAL_PROXIMITY"
                    explanation = (
                        f"Project is located within {nearby_same_sector[0]['distance_meters']}m of "
                        f"another public asset."
                    )
            else:
                score = 0.10
                signal = "NORMAL_SPATIAL_DISTRIBUTION"
                explanation = "Project location has normal geographic separation from peer works."

            results[pid] = {
                "status": "AVAILABLE",
                "score": round(score, 3),
                "signal": signal,
                "explanation": explanation,
                "nearby_project_ids": [m["project_id"] for m in nearby_same_sector],
                "evidence": {
                    "nearest_neighbor_distance_km": round(min_dist_km, 3) if min_dist_km != float("inf") else None,
                    "nearby_works_within_150m": nearby_same_sector,
                },
            }

        return results
