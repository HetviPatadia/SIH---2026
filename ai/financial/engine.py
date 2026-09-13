import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.ensemble import IsolationForest
from backend.app.utils.logger import logger

class FinancialAnomalyEngine:
    """
    Detects unusual project costs, expenditure deviations, and sector-level
    cost inflations using statistical Z-scores combined with Isolation Forest.
    """

    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )

    def analyze(
        self,
        df: pd.DataFrame,
        cost_norm_results: Optional[Dict[str, Dict[str, Any]]] = None,
        contractor_baselines: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> Dict[str, Dict[str, Any]]:
        results = {}
        if len(df) == 0:
            return results

        cost = df["sanctioned_amount"].values
        peer_ratio = df.get("cost_to_peer_ratio", pd.Series(1.0, index=df.index)).values
        z_score = df.get("z_cost_sector", pd.Series(0.0, index=df.index)).values

        # Prepare feature matrix for Isolation Forest
        X = np.column_stack([
            np.nan_to_num(cost, nan=0.0),
            np.nan_to_num(peer_ratio, nan=1.0),
            np.nan_to_num(z_score, nan=0.0),
        ])

        # Fit Isolation Forest
        try:
            self.model.fit(X)
            # decision_function gives anomaly score: lower means more abnormal
            raw_scores = self.model.decision_function(X)
            # Normalize to 0-1 (higher = more anomalous)
            norm_scores = 1.0 - ((raw_scores - raw_scores.min()) / (raw_scores.max() - raw_scores.min() + 1e-6))
        except Exception as e:
            logger.warning(f"Isolation Forest fallback due to: {e}")
            norm_scores = np.clip(np.abs(z_score) / 4.0, 0.0, 1.0)

        for idx, row in df.iterrows():
            pid = str(row["project_id"])
            p_cost = float(row.get("sanctioned_amount", 0.0))
            p_peer = float(row.get("cost_to_peer_ratio", 1.0))
            p_z = float(row.get("z_cost_sector", 0.0))
            p_median = float(row.get("sector_median_cost", p_cost))
            iso_score = float(norm_scores[idx])

            # Check price-aware normalization context if provided
            norm_ctx = (cost_norm_results or {}).get(pid, {})
            is_price_adjusted = norm_ctx.get("is_adjusted", False)
            price_signal = norm_ctx.get("signal", "NONE")

            # Check contractor baseline context if provided
            c_base = (contractor_baselines or {}).get(pid, {})
            c_med = c_base.get("contractor_median_cost")

            # Contextual financial evaluation:
            # If price adjustment explains cost (i.e. within adjusted range), mitigate outlier score
            if is_price_adjusted and price_signal == "WITHIN_EXPECTED_RANGE" and p_peer < 2.0:
                fin_score = min(iso_score * 0.5, 0.25)
                signal = "PRICE_INDEX_ALIGNED"
                explanation = (
                    f"Sanctioned cost (₹{p_cost:,.0f}) is higher than historical unadjusted median, "
                    f"but aligns with price-indexed construction benchmarks. Verified inflationary adjustment."
                )
            elif p_peer >= 2.5:
                fin_score = max(iso_score, 0.85)
                signal = "COST_OUTLIER"
                explanation = (
                    f"Sanctioned cost (₹{p_cost:,.0f}) is {p_peer:.1f}x higher than "
                    f"the sector median (₹{p_median:,.0f}). Requires cost justification."
                )
            elif p_peer >= 1.75:
                fin_score = max(iso_score, 0.65)
                signal = "ELEVATED_COST"
                explanation = (
                    f"Sanctioned cost (₹{p_cost:,.0f}) is {p_peer:.1f}x the sector benchmark. "
                    f"Deserves verification."
                )
            else:
                fin_score = min(iso_score, 0.35)
                signal = "NORMAL"
                explanation = "Project cost conforms to standard category benchmarks."

            results[pid] = {
                "score": round(float(fin_score), 3),
                "signal": signal,
                "explanation": explanation,
                "evidence": {
                    "sanctioned_amount": p_cost,
                    "sector_median_cost": p_median,
                    "cost_to_peer_ratio": round(p_peer, 2),
                    "sector_z_score": round(p_z, 2),
                    "isolation_forest_anomaly_index": round(float(iso_score), 3),
                    "is_price_adjusted": is_price_adjusted,
                    "price_normalized_signal": price_signal if is_price_adjusted else "UNAVAILABLE",
                    "contractor_historical_median": c_med,
                },
            }

        return results

