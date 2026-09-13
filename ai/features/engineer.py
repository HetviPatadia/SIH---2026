import numpy as np
import pandas as pd
from typing import Dict, Any

class FeatureEngineer:
    """
    Constructs normalized statistical, temporal, and spatial feature vectors
    used across the AI anomaly detection engines.
    """

    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        feat_df = df.copy()

        # 1. Financial Features
        if "sanctioned_amount" in feat_df.columns:
            feat_df["sanctioned_amount"] = pd.to_numeric(feat_df["sanctioned_amount"], errors="coerce").fillna(0.0)
            feat_df["expenditure"] = pd.to_numeric(feat_df.get("expenditure", 0.0), errors="coerce").fillna(0.0)

            # Expenditure utilization ratio
            feat_df["utilization_ratio"] = np.where(
                feat_df["sanctioned_amount"] > 0,
                feat_df["expenditure"] / feat_df["sanctioned_amount"],
                0.0,
            )

            # Sector-level median baseline comparison
            if "sector" in feat_df.columns:
                sector_medians = feat_df.groupby("sector")["sanctioned_amount"].transform("median")
                sector_stds = feat_df.groupby("sector")["sanctioned_amount"].transform("std").replace(0, 1.0)
                feat_df["sector_median_cost"] = sector_medians
                feat_df["cost_to_peer_ratio"] = feat_df["sanctioned_amount"] / sector_medians.replace(0, 1.0)
                feat_df["z_cost_sector"] = (feat_df["sanctioned_amount"] - sector_medians) / sector_stds.fillna(1.0)
            else:
                feat_df["cost_to_peer_ratio"] = 1.0
                feat_df["z_cost_sector"] = 0.0

        # 2. Temporal Features
        if "sanction_date" in feat_df.columns and "start_date" in feat_df.columns:
            sanc_dt = pd.to_datetime(feat_df["sanction_date"], errors="coerce")
            start_dt = pd.to_datetime(feat_df["start_date"], errors="coerce")
            comp_dt = pd.to_datetime(feat_df.get("completion_date"), errors="coerce")

            feat_df["sanction_to_start_days"] = (start_dt - sanc_dt).dt.days.fillna(-1)
            feat_df["total_duration_days"] = (comp_dt - start_dt).dt.days.fillna(-1)

            # Spending Velocity (Expenditure per active day)
            safe_days = feat_df["total_duration_days"].clip(lower=1)
            feat_df["expenditure_velocity"] = np.where(
                feat_df["total_duration_days"] > 0,
                feat_df["expenditure"] / safe_days,
                0.0,
            )

        return feat_df
