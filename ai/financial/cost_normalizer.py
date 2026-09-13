import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from backend.app.database.models import PriceIndexRecord
from backend.app.utils.logger import logger


# Configurable sector-to-material input mappings
SECTOR_COST_DRIVERS = {
    "Roads": {
        "primary_category": "ROADS",
        "key_inputs": ["Bitumen", "Aggregates", "Earthwork", "Diesel"],
        "weight_index": 0.85,
    },
    "Bridges": {
        "primary_category": "BRIDGES",
        "key_inputs": ["Structural Steel", "Cement", "RMC", "Pre-stressing Cables"],
        "weight_index": 0.90,
    },
    "Buildings": {
        "primary_category": "CIVIL_WORKS",
        "key_inputs": ["Cement", "Rebar Steel", "Bricks", "Electrical & Plumbing"],
        "weight_index": 0.80,
    },
    "Community Centers": {
        "primary_category": "CIVIL_WORKS",
        "key_inputs": ["Cement", "Rebar Steel", "Finishing Materials"],
        "weight_index": 0.75,
    },
    "Water": {
        "primary_category": "WATER",
        "key_inputs": ["DI / HDPE Pipes", "Pumps", "Valves", "RCC Tanks"],
        "weight_index": 0.80,
    },
    "Irrigation": {
        "primary_category": "WATER",
        "key_inputs": ["Canal Lining", "Masonry", "Pipes", "Gates"],
        "weight_index": 0.75,
    },
    "Sanitation": {
        "primary_category": "CIVIL_WORKS",
        "key_inputs": ["Pipes", "Pre-cast Concrete", "Sanitaryware"],
        "weight_index": 0.70,
    },
    "Education": {
        "primary_category": "CIVIL_WORKS",
        "key_inputs": ["Classroom Civil Work", "Furniture", "Wiring"],
        "weight_index": 0.70,
    },
    "Health": {
        "primary_category": "CIVIL_WORKS",
        "key_inputs": ["Clinical Grade Civil", "Electrical", "HVAC"],
        "weight_index": 0.75,
    },
}

DEFAULT_DRIVER = {
    "primary_category": "GENERAL",
    "key_inputs": ["General Civil Materials", "Labor"],
    "weight_index": 0.70,
}


class PriceIndexProvider:
    """
    Abstracts retrieval of official wholesale/construction price indices (WPI/CPWD).
    Guarantees full source provenance:
    - Never fabricates indices if missing.
    - Preserves source_name, version, reference_year, adjustment_factor.
    """

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def get_index(
        self,
        category: str,
        year: int,
        month: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieves the price index value for a category and year.
        Returns dict with index_value and provenance, or None if unavailable.
        """
        if not self.db:
            return None

        # Search for category-specific index first, fallback to GENERAL
        record = (
            self.db.query(PriceIndexRecord)
            .filter(
                PriceIndexRecord.category == category,
                PriceIndexRecord.year == year,
            )
            .first()
        )

        if not record and category != "GENERAL":
            record = (
                self.db.query(PriceIndexRecord)
                .filter(
                    PriceIndexRecord.category == "GENERAL",
                    PriceIndexRecord.year == year,
                )
                .first()
            )

        if record:
            return {
                "index_value": float(record.index_value),
                "base_year": record.base_year,
                "source_name": record.source_name,
                "source_version": record.source_version,
                "year": record.year,
                "category": record.category,
            }

        return None


class CostNormalizationEngine:
    """
    Price-Aware Financial Intelligence Engine:
    - Normalizes project costs across different financial years based on verified price indices.
    - Generates defensible expected cost ranges rather than single fixed numbers.
    - Distinguishes legitimate inflationary cost growth from unexplainable cost inflation.
    - Degrades gracefully: if price index is absent, flags 'price_adjustment_unavailable'
      and relies on standard unadjusted peer metrics.
    """

    def __init__(self, base_year: int = 2024, tolerance_band: float = 0.20):
        self.base_year = base_year
        self.tolerance_band = tolerance_band  # +/- 20% expected reasonable band

    def normalize_cost(
        self,
        sanctioned_amount: float,
        sector: str,
        sanction_year: Optional[int],
        price_provider: PriceIndexProvider,
    ) -> Dict[str, Any]:
        """
        Calculates price-adjusted equivalent cost and expected range.
        """
        sector_clean = str(sector).strip() if sector else "General"
        cost_drivers = SECTOR_COST_DRIVERS.get(sector_clean, DEFAULT_DRIVER)
        category = cost_drivers["primary_category"]

        if not sanction_year or sanction_year <= 0:
            return {
                "is_adjusted": False,
                "reason": "Sanction year unavailable for price index alignment.",
                "original_cost": sanctioned_amount,
                "adjusted_cost": sanctioned_amount,
                "adjustment_factor": 1.0,
                "expected_min": round(sanctioned_amount * (1.0 - self.tolerance_band), 2),
                "expected_max": round(sanctioned_amount * (1.0 + self.tolerance_band), 2),
                "provenance": None,
            }

        # Fetch index for sanction year and base year
        proj_index_info = price_provider.get_index(category, sanction_year)
        base_index_info = price_provider.get_index(category, self.base_year)

        if not proj_index_info or not base_index_info:
            return {
                "is_adjusted": False,
                "reason": f"Official price index unavailable for category '{category}' between {sanction_year} and base year {self.base_year}.",
                "original_cost": sanctioned_amount,
                "adjusted_cost": sanctioned_amount,
                "adjustment_factor": 1.0,
                "expected_min": round(sanctioned_amount * (1.0 - self.tolerance_band), 2),
                "expected_max": round(sanctioned_amount * (1.0 + self.tolerance_band), 2),
                "provenance": None,
            }

        proj_idx = proj_index_info["index_value"]
        base_idx = base_index_info["index_value"]

        if proj_idx <= 0:
            adj_factor = 1.0
        else:
            adj_factor = round(base_idx / proj_idx, 4)

        adjusted_cost = round(sanctioned_amount * adj_factor, 2)
        expected_min = round(adjusted_cost * (1.0 - self.tolerance_band), 2)
        expected_max = round(adjusted_cost * (1.0 + self.tolerance_band), 2)

        return {
            "is_adjusted": True,
            "reason": (
                f"Normalized from {sanction_year} (Index: {proj_idx}) to base year {self.base_year} "
                f"(Index: {base_idx}) via {proj_index_info['source_name']}."
            ),
            "original_cost": sanctioned_amount,
            "adjusted_cost": adjusted_cost,
            "adjustment_factor": adj_factor,
            "expected_min": expected_min,
            "expected_max": expected_max,
            "provenance": {
                "category": category,
                "sanction_year": sanction_year,
                "base_year": self.base_year,
                "source": proj_index_info["source_name"],
                "version": proj_index_info["source_version"],
                "key_cost_drivers": cost_drivers["key_inputs"],
            },
        }

    def evaluate_cost_deviation(
        self,
        sanctioned_amount: float,
        adjusted_peer_median: float,
        norm_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Compares observed cost against adjusted peer expectation.
        Outputs an auditor-neutral deviation signal.
        """
        expected_min = round(adjusted_peer_median * (1.0 - self.tolerance_band), 2)
        expected_max = round(adjusted_peer_median * (1.0 + self.tolerance_band), 2)

        if adjusted_peer_median <= 0:
            ratio = 1.0
        else:
            ratio = round(sanctioned_amount / adjusted_peer_median, 2)

        if sanctioned_amount > expected_max:
            deviation_pct = round(((sanctioned_amount - adjusted_peer_median) / (adjusted_peer_median + 1e-6)) * 100, 1)
            score = min(round((sanctioned_amount - expected_max) / (adjusted_peer_median + 1e-6), 3), 0.90)
            score = max(score, 0.40)
            return {
                "signal": "ABOVE_ADJUSTED_RANGE",
                "score": score,
                "observed_cost": sanctioned_amount,
                "expected_range_min": expected_min,
                "expected_range_max": expected_max,
                "adjusted_peer_median": adjusted_peer_median,
                "ratio_to_peer": ratio,
                "deviation_percentage": deviation_pct,
                "is_price_adjusted": norm_result.get("is_adjusted", False),
                "reason": (
                    f"Sanctioned cost (₹{sanctioned_amount:,.0f}) is {deviation_pct}% above the price-adjusted "
                    f"peer expected range (₹{expected_min:,.0f} – ₹{expected_max:,.0f}). Requires cost verification."
                ),
            }
        elif sanctioned_amount < expected_min:
            deviation_pct = round(((adjusted_peer_median - sanctioned_amount) / (adjusted_peer_median + 1e-6)) * 100, 1)
            return {
                "signal": "BELOW_ADJUSTED_RANGE",
                "score": 0.20,
                "observed_cost": sanctioned_amount,
                "expected_range_min": expected_min,
                "expected_range_max": expected_max,
                "adjusted_peer_median": adjusted_peer_median,
                "ratio_to_peer": ratio,
                "deviation_percentage": -deviation_pct,
                "is_price_adjusted": norm_result.get("is_adjusted", False),
                "reason": (
                    f"Sanctioned cost (₹{sanctioned_amount:,.0f}) is lower than the price-adjusted "
                    f"peer expected range (₹{expected_min:,.0f} – ₹{expected_max:,.0f}). Check for scope limitations."
                ),
            }
        else:
            return {
                "signal": "WITHIN_EXPECTED_RANGE",
                "score": 0.0,
                "observed_cost": sanctioned_amount,
                "expected_range_min": expected_min,
                "expected_range_max": expected_max,
                "adjusted_peer_median": adjusted_peer_median,
                "ratio_to_peer": ratio,
                "deviation_percentage": 0.0,
                "is_price_adjusted": norm_result.get("is_adjusted", False),
                "reason": (
                    f"Sanctioned cost conforms to the price-adjusted peer expectation "
                    f"(₹{expected_min:,.0f} – ₹{expected_max:,.0f})."
                ),
            }
