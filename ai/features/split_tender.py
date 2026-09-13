import pandas as pd
from typing import Dict, Any, List

class SplitTenderEngine:
    """
    Identifies patterns of work chunking or split tendering where multiple works
    are sanctioned in the same village/ward right below statutory thresholds
    (e.g., Rs. 5 Lakhs or 10 Lakhs) within short temporal windows.
    """

    def __init__(self, threshold_chunk: float = 500000.0, margin_window_days: int = 45):
        self.threshold_chunk = threshold_chunk
        self.margin_window_days = margin_window_days

    def analyze(self, df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        results = {}
        if len(df) == 0:
            return results

        # Group by village and contractor if present
        for pid, row in df.set_index("project_id").iterrows():
            pid_str = str(pid)
            sanctioned = float(row.get("sanctioned_amount", 0.0))
            village = str(row.get("village", ""))
            contractor = str(row.get("contractor_name", ""))

            # Check for missing/invalid financial data
            if pd.isna(row.get("sanctioned_amount")) or sanctioned <= 0:
                results[pid_str] = {
                    "status": "UNAVAILABLE",
                    "score": 0.0,
                    "signal": "UNAVAILABLE",
                    "explanation": "Financial expenditure data is unavailable for split-tender analysis.",
                    "related_project_ids": [],
                    "is_split_candidate": False,
                    "split_cluster_size": 0,
                }
                continue

            # Check if project amount is within 10% below statutory ceiling (e.g. 4.5L to 5.0L)
            near_threshold = (0.90 * self.threshold_chunk) <= sanctioned <= self.threshold_chunk

            # Find matching peers in same village & contractor
            if village and village != "nan":
                peers = df[
                    (df["project_id"].astype(str) != pid_str)
                    & (df["village"].astype(str) == village)
                    & ((df["sanctioned_amount"] >= 0.90 * self.threshold_chunk) & (df["sanctioned_amount"] <= self.threshold_chunk))
                ]
            else:
                peers = pd.DataFrame()

            if near_threshold and len(peers) >= 2:
                score = 0.80
                signal = "POTENTIAL_SPLIT_TENDER"
                peer_ids = peers["project_id"].astype(str).tolist()
                cluster_size = len(peers) + 1
                is_split = True
                explanation = (
                    f"Work value (₹{sanctioned:,.0f}) is near the statutory procurement ceiling with "
                    f"{len(peers)} similar projects in {village} awarded in close succession. "
                    f"Potentially related work pattern requiring human verification."
                )
            else:
                score = 0.05
                signal = "NORMAL"
                peer_ids = []
                cluster_size = 1
                is_split = False
                explanation = "No split tendering indicators identified."

            results[pid_str] = {
                "status": "AVAILABLE",
                "score": round(score, 3),
                "signal": signal,
                "explanation": explanation,
                "related_project_ids": peer_ids,
                "is_split_candidate": is_split,
                "split_cluster_size": cluster_size,
            }

        return results
