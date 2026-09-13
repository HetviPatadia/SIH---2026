import random
import datetime
import pandas as pd
import numpy as np
from pathlib import Path
from backend.app.config import settings

def generate_mplads_dataset(num_records: int = 1200, output_filename: str = "mplads_sample_data.csv") -> Path:
    """
    Generates a realistic MPLADS dataset with authentic Indian constituencies,
    categories, contractors, and intentionally injected anomaly patterns
    for testing the AI audit intelligence engines.
    """
    random.seed(42)
    np.random.seed(42)

    districts_meta = [
        {"state": "Uttar Pradesh", "district": "Varanasi", "constituency": "Varanasi", "mp": "N. Modi", "lat": 25.3176, "lon": 82.9739},
        {"state": "Gujarat", "district": "Rajkot", "constituency": "Rajkot", "mp": "P. Rupala", "lat": 22.3039, "lon": 70.8022},
        {"state": "Maharashtra", "district": "Nagpur", "constituency": "Nagpur", "mp": "N. Gadkari", "lat": 21.1458, "lon": 79.0882},
        {"state": "Bihar", "district": "Patna", "constituency": "Patna Sahib", "mp": "R. S. Prasad", "lat": 25.5941, "lon": 85.1376},
        {"state": "Rajasthan", "district": "Jaipur", "constituency": "Jaipur", "mp": "M. Joshi", "lat": 26.9124, "lon": 75.7873},
        {"state": "Kerala", "district": "Wayanad", "constituency": "Wayanad", "mp": "P. Gandhi", "lat": 11.6854, "lon": 76.1320},
        {"state": "Madhya Pradesh", "district": "Indore", "constituency": "Indore", "mp": "S. Lalwani", "lat": 22.7196, "lon": 75.8577},
        {"state": "Karnataka", "district": "Bengaluru Rural", "constituency": "Bengaluru Rural", "mp": "C. N. Manjunath", "lat": 13.0645, "lon": 77.5678},
    ]

    sectors_data = {
        "Community Infrastructure": [
            ("Construction of Community Hall at Village {}", 1000000, 2500000),
            ("Development of Community Center and Boundary Wall in {}", 800000, 1800000),
            ("Installation of Public Shed and Seating Area at {}", 400000, 900000),
        ],
        "Drinking Water & Sanitation": [
            ("Installation of RO Water Purification Plant at {}", 500000, 1200000),
            ("Construction of Public Toilets and Sanitation Block in {}", 600000, 1500000),
            ("Drilling of Deep Borewell and Overhead Tank Setup at {}", 450000, 1100000),
        ],
        "Rural Connectivity & Roads": [
            ("Construction of CC Road and Drainage Channel at {}", 1500000, 3500000),
            ("Paver Block Road Construction in {}", 500000, 1200000),
            ("Widening of Rural Link Road connecting {}", 2000000, 5000000),
        ],
        "Education & Schools": [
            ("Construction of Additional Classrooms at Govt High School {}", 1200000, 3000000),
            ("Installation of Smart Classroom and Computer Lab in {}", 700000, 1600000),
            ("Solar Rooftop Power System installation for School at {}", 500000, 1000000),
        ],
        "Renewable Energy": [
            ("Installation of Solar LED High-Mast Lighting System at {}", 400000, 800000),
            ("Supply and installation of 25 Solar Street Lights in {}", 500000, 1000000),
        ],
    }

    contractor_pool = [
        "Apex Infrastructure Ltd",
        "Shree Ganesh Construction Co",
        "National Civil Projects",
        "Bharat Engineers & Builders",
        "Sai Urban Works Pvt Ltd",
        "Kisan Rural Developers",
        "Vanguard Infra Solutions",
        "Surya Shakti Engineering",
        "Reliable Works Corporation",
        "Local Panchayat Works Unit",
    ]

    agencies = [
        "Public Works Department (PWD)",
        "Rural Engineering Service (RES)",
        "District Rural Development Agency (DRDA)",
        "Municipal Corporation",
        "Minor Irrigation Division",
    ]

    records = []
    base_date = datetime.date(2023, 1, 1)

    for i in range(1, num_records + 1):
        pid = f"MPL-{i:05d}"
        dist_meta = random.choice(districts_meta)
        sector = random.choice(list(sectors_data.keys()))
        template, min_cost, max_cost = random.choice(sectors_data[sector])

        village_num = random.randint(1, 150)
        village_name = f"Village-{village_num}"
        description = template.format(village_name)

        # Baseline cost
        sanctioned_amount = float(random.randint(min_cost, max_cost))
        estimated_cost = round(sanctioned_amount * random.uniform(0.95, 1.05), 2)
        expenditure = round(sanctioned_amount * random.uniform(0.7, 1.0), 2)

        # Dates
        days_offset = random.randint(0, 700)
        sanc_date = base_date + datetime.timedelta(days=days_offset)
        start_date = sanc_date + datetime.timedelta(days=random.randint(15, 60))
        comp_date = start_date + datetime.timedelta(days=random.randint(60, 240)) if random.random() > 0.3 else None

        # Coordinates with realistic slight jitter
        lat = round(dist_meta["lat"] + random.uniform(-0.15, 0.15), 5)
        lon = round(dist_meta["lon"] + random.uniform(-0.15, 0.15), 5)

        contractor = random.choice(contractor_pool)
        agency = random.choice(agencies)
        status = "Completed" if comp_date and comp_date < datetime.date.today() else "In Progress"

        records.append({
            "project_id": pid,
            "state": dist_meta["state"],
            "district": dist_meta["district"],
            "constituency": dist_meta["constituency"],
            "mp_name": dist_meta["mp"],
            "sector": sector,
            "title": description,
            "description": description,
            "village": village_name,
            "block": f"Block-{random.randint(1, 10)}",
            "latitude": lat,
            "longitude": lon,
            "sanctioned_amount": sanctioned_amount,
            "estimated_cost": estimated_cost,
            "expenditure": expenditure,
            "recommendation_date": (sanc_date - datetime.timedelta(days=random.randint(10, 30))).isoformat(),
            "sanction_date": sanc_date.isoformat(),
            "start_date": start_date.isoformat(),
            "completion_date": comp_date.isoformat() if comp_date else None,
            "status": status,
            "contractor_name": contractor,
            "implementing_agency": agency,
        })

    # ----------------------------------------------------
    # INJECT REALISTIC AUDIT ANOMALIES FOR DEMO & TESTING
    # ----------------------------------------------------

    # 1. Cost Outlier Flag (Project MPL-00042)
    records[41]["sanctioned_amount"] = 8500000.0  # ₹85 Lakhs for basic solar light (4x median)
    records[41]["estimated_cost"] = 8700000.0
    records[41]["expenditure"] = 8500000.0
    records[41]["title"] = "Supply and installation of 25 Solar Street Lights in Village-42"
    records[41]["description"] = "Supply and installation of 25 Solar Street Lights in Village-42"

    # 2. Spatial Duplicate / Near-Duplicate Works (MPL-00101 & MPL-00102)
    records[100]["title"] = "Construction of Community Hall at Village-Kalyanpur"
    records[100]["description"] = "Construction of Community Hall at Village-Kalyanpur with sanitary fittings"
    records[100]["latitude"] = 25.31760
    records[100]["longitude"] = 82.97390
    records[100]["district"] = "Varanasi"
    records[100]["sanctioned_amount"] = 1800000.0

    records[101]["title"] = "Development of Community Hall in Village-Kalyanpur"
    records[101]["description"] = "Development of Community Hall in Village-Kalyanpur with sanitary fittings"
    records[101]["latitude"] = 25.31775  # ~16 meters away
    records[101]["longitude"] = 82.97395
    records[101]["district"] = "Varanasi"
    records[101]["sanctioned_amount"] = 1900000.0

    # 3. Split-Tender Pattern (MPL-00201, MPL-00202, MPL-00203 right below 5 Lakhs limit)
    for k, idx in enumerate([200, 201, 202]):
        records[idx]["title"] = f"Paver block road work Part {k+1} Village-77"
        records[idx]["description"] = f"Paver block road work Part {k+1} Village-77"
        records[idx]["sanctioned_amount"] = 495000.0
        records[idx]["estimated_cost"] = 495000.0
        records[idx]["expenditure"] = 490000.0
        records[idx]["sanction_date"] = "2023-08-15"
        records[idx]["village"] = "Village-77"
        records[idx]["contractor_name"] = "Apex Infrastructure Ltd"

    # 4. Contractor Syndicate Monopoly (Assign 'Apex Infrastructure Ltd' to 40 projects across districts)
    for idx in range(300, 340):
        records[idx]["contractor_name"] = "Apex Infrastructure Ltd"

    # 5. Temporal Expenditure Velocity Anomaly (MPL-00088: spent in 3 days)
    records[87]["sanction_date"] = "2024-01-10"
    records[87]["start_date"] = "2024-01-12"
    records[87]["completion_date"] = "2024-01-15"
    records[87]["sanctioned_amount"] = 3500000.0
    records[87]["expenditure"] = 3500000.0

    df = pd.DataFrame(records)
    out_dir = settings.DATA_DIR
    out_path = out_dir / output_filename
    df.to_csv(out_path, index=False)
    print(f"Generated realistic MPLADS dataset with {len(df)} records at: {out_path}")
    return out_path

if __name__ == "__main__":
    generate_mplads_dataset()
