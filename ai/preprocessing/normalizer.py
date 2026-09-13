import re
import datetime
from typing import Optional, Any
import pandas as pd
from backend.app.utils.logger import logger

class DataNormalizer:
    """
    Normalizes geographic names, financial numbers, dates, and text descriptions
    into a standardized audit format without destroying meaningful information.
    """

    DISTRICT_CLEANUP_REGEX = re.compile(r"\b(dist\.?|district|zila)\b", re.IGNORECASE)

    @classmethod
    def normalize_text(cls, text: Optional[str]) -> str:
        if not text or pd.isna(text):
            return ""
        # Remove repeated whitespace and normalize casing
        cleaned = re.sub(r"\s+", " ", str(text)).strip()
        return cleaned

    @classmethod
    def normalize_district(cls, district: Optional[str]) -> str:
        if not district or pd.isna(district):
            return "Unknown District"
        text = cls.DISTRICT_CLEANUP_REGEX.sub("", str(district))
        text = re.sub(r"[^\w\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip().title()
        return text if text else "Unknown District"

    @classmethod
    def normalize_date(cls, val: Any) -> Optional[datetime.datetime]:
        if pd.isna(val) or not val:
            return None
        if isinstance(val, (datetime.datetime, datetime.date)):
            return datetime.datetime(val.year, val.month, val.day)
        try:
            parsed = pd.to_datetime(val, errors="coerce")
            if pd.isna(parsed):
                return None
            return parsed.to_pydatetime()
        except Exception:
            return None

    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        norm_df = df.copy()

        # Text & Sector normalization
        if "description" in norm_df.columns:
            norm_df["normalized_description"] = norm_df["description"].apply(self.normalize_text)
        elif "title" in norm_df.columns:
            norm_df["normalized_description"] = norm_df["title"].apply(self.normalize_text)
        else:
            norm_df["normalized_description"] = ""

        if "district" in norm_df.columns:
            norm_df["district"] = norm_df["district"].apply(self.normalize_district)

        if "state" in norm_df.columns:
            norm_df["state"] = norm_df["state"].apply(lambda s: self.normalize_text(s).title())

        if "sector" in norm_df.columns:
            norm_df["sector"] = norm_df["sector"].apply(lambda s: self.normalize_text(s).title())

        # Financial normalization
        for col in ["sanctioned_amount", "estimated_cost", "expenditure"]:
            if col in norm_df.columns:
                norm_df[col] = pd.to_numeric(norm_df[col], errors="coerce").fillna(0.0)
                norm_df[col] = norm_df[col].clip(lower=0.0)

        # Dates normalization
        for dcol in ["recommendation_date", "sanction_date", "start_date", "completion_date"]:
            if dcol in norm_df.columns:
                norm_df[dcol] = norm_df[dcol].apply(self.normalize_date)

        logger.info(f"Normalized {len(norm_df)} records successfully.")
        return norm_df
