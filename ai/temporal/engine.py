import pandas as pd
import numpy as np
from typing import Dict, Any

class TemporalAnomalyEngine:
    """
    Analyzes project lifecycle timelines, sanction-to-execution delays,
    and expenditure velocity (e.g. ultra-fast fund depletion or prolonged stall).
    Handles missing dates cleanly with 'INSUFFICIENT_DATA'.
    """

    def analyze(self, df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        results = {}

        for _, row in df.iterrows():
            pid = str(row["project_id"])
            sanc_date = row.get("sanction_date")
            start_date = row.get("start_date")
            comp_date = row.get("completion_date")
            expenditure = float(row.get("expenditure", 0.0))
            duration = float(row.get("total_duration_days", -1))
            lag_days = float(row.get("sanction_to_start_days", -1))

            # If vital timing data is completely missing
            if pd.isna(sanc_date) and pd.isna(start_date):
                results[pid] = {
                    "status": "INSUFFICIENT_DATA",
                    "score": 0.0,
                    "signal": "NO_TIMELINE_DATA",
                    "explanation": "Timeline dates are not available in the current dataset record.",
                    "evidence": {},
                }
                continue

            score = 0.1
            signal = "NORMAL"
            reasons = []

            # 1. Unusual Expenditure Velocity (Huge fund release in unrealistically short span)
            if duration > 0 and duration <= 7 and expenditure > 1000000:
                score = max(score, 0.85)
                signal = "VELOCITY_SPIKE"
                daily_rate = expenditure / duration
                reasons.append(
                    f"Rapid expenditure velocity: ₹{expenditure:,.0f} disbursed over only "
                    f"{int(duration)} days (₹{daily_rate:,.0f}/day)."
                )

            # 2. Severe Start Lag (> 180 days from sanction)
            if lag_days > 180:
                score = max(score, 0.70)
                if signal == "NORMAL":
                    signal = "PROLONGED_START_LAG"
                reasons.append(
                    f"Substantial execution lag: {int(lag_days)} days elapsed between sanction and project start."
                )

            # 3. Normal progress
            if not reasons:
                explanation = "Project timeline and spending cadence are within normal parameters."
            else:
                explanation = " ".join(reasons)

            results[pid] = {
                "status": "AVAILABLE",
                "score": round(score, 3),
                "signal": signal,
                "explanation": explanation,
                "evidence": {
                    "duration_days": int(duration) if duration >= 0 else None,
                    "sanction_to_start_days": int(lag_days) if lag_days >= 0 else None,
                    "expenditure": expenditure,
                },
            }

        return results
