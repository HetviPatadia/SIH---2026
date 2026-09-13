import pytest
import pandas as pd
from ai.preprocessing.validator import DataQualityEngine
from ai.preprocessing.normalizer import DataNormalizer

def test_data_validator_catches_invalid_rows():
    validator = DataQualityEngine()
    test_df = pd.DataFrame([
        {"project_id": "P001", "district": "Varanasi", "sector": "Roads", "sanctioned_amount": 100000.0, "latitude": 25.3, "longitude": 82.9},
        {"project_id": "", "district": "Rajkot", "sector": "Water", "sanctioned_amount": 50000.0},  # Missing ID
        {"project_id": "P003", "district": "Nagpur", "sector": "Health", "sanctioned_amount": -15000.0},  # Negative amount
    ])

    valid_df, rejected, report = validator.validate(test_df, "test_v1")
    assert len(valid_df) == 1
    assert len(rejected) == 2
    assert report["valid_records"] == 1
    assert report["rejected_records"] == 2

def test_data_normalizer_standardizes_names():
    normalizer = DataNormalizer()
    test_df = pd.DataFrame([
        {
            "project_id": "P001",
            "district": "RAJKOT DIST.",
            "state": "GUJARAT",
            "sector": "community infrastructure",
            "description": "  Construction   of  hall   ",
            "sanctioned_amount": "250000",
        }
    ])

    norm_df = normalizer.normalize(test_df)
    assert norm_df["district"].iloc[0] == "Rajkot"
    assert norm_df["state"].iloc[0] == "Gujarat"
    assert norm_df["sector"].iloc[0] == "Community Infrastructure"
    assert norm_df["normalized_description"].iloc[0] == "Construction of hall"
    assert norm_df["sanctioned_amount"].iloc[0] == 250000.0
