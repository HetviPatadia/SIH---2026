"""
Synthetic Demonstration Dataset Generator for SIH 2026
MPLADS Audit Intelligence & Evidence Verification System

Generates a realistic, internally consistent synthetic demonstration dataset:
- 1,000 Projects (MPLADS-DEMO-000001 to MPLADS-DEMO-001000)
- 200 Contractors (CONTRACTOR-DEMO-0001 to CONTRACTOR-DEMO-0200)
- 2,000 Tenders (TENDER-DEMO-00001 to TENDER-DEMO-02000)
- 2,000 Evidence records (EV-DEMO-00001 to EV-DEMO-02000)
- 120 Investigation cases (CASE-MPLADS-DEMO-000001 to CASE-MPLADS-DEMO-000120)
- 300 Investigation notes (NOTE-DEMO-000001 to NOTE-DEMO-000300)

DISTRIBUTION:
- ~65% Normal projects (routine lifecycle, typical costs, distinct photos, matching locations)
- ~15% Mild irregularity patterns (minor timeline drift, minor budget variance, template reuse)
- ~10% Medium irregularity patterns (low utilization, high inception lag, moderate cost divergence)
- ~7% High-priority investigation patterns (split tender clusters, exact photo reuse, severe cost outliers, GPS discrepancy > 15km, velocity spikes)
- ~3% Critical investigation patterns (multi-modal compound: cost spike + split tender + photo reuse + syndicate contractor)

IMPORTANT CONSTRAINTS:
- SYNTHETIC ONLY: All records are simulated for algorithmic demonstration.
- NO INJECTED LABELS: No 'fraud=true', 'risk_score=95', or 'fraud_probability=0.9'.
- RELATIONAL INTEGRITY: All foreign keys, dates, finances, and coordinates are 100% consistent.
"""

import os
import math
import random
import hashlib
import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np

# Set deterministic random seed
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

OUTPUT_DIR = Path("data/demo_dataset")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------------
# 1. GEOGRAPHIC MASTER DATA (10 States, 30 Districts)
# ----------------------------------------------------------------------
DISTRICTS_DATA = [
    # Gujarat
    {"state": "Gujarat", "district": "Rajkot", "constituency": "Rajkot", "lat": 22.3039, "lon": 70.8022},
    {"state": "Gujarat", "district": "Ahmedabad", "constituency": "Ahmedabad West", "lat": 23.0225, "lon": 72.5714},
    {"state": "Gujarat", "district": "Surat", "constituency": "Surat", "lat": 21.1702, "lon": 72.8311},
    # Maharashtra
    {"state": "Maharashtra", "district": "Nagpur", "constituency": "Nagpur", "lat": 21.1458, "lon": 79.0882},
    {"state": "Maharashtra", "district": "Pune", "constituency": "Pune", "lat": 18.5204, "lon": 73.8567},
    {"state": "Maharashtra", "district": "Nashik", "constituency": "Nashik", "lat": 19.9975, "lon": 73.7898},
    # Uttar Pradesh
    {"state": "Uttar Pradesh", "district": "Varanasi", "constituency": "Varanasi", "lat": 25.3176, "lon": 82.9739},
    {"state": "Uttar Pradesh", "district": "Lucknow", "constituency": "Lucknow", "lat": 26.8467, "lon": 80.9462},
    {"state": "Uttar Pradesh", "district": "Gorakhpur", "constituency": "Gorakhpur", "lat": 26.7606, "lon": 83.3732},
    # Rajasthan
    {"state": "Rajasthan", "district": "Jaipur", "constituency": "Jaipur", "lat": 26.9124, "lon": 75.7873},
    {"state": "Rajasthan", "district": "Jodhpur", "constituency": "Jodhpur", "lat": 26.2389, "lon": 73.0243},
    {"state": "Rajasthan", "district": "Udaipur", "constituency": "Udaipur", "lat": 24.5854, "lon": 73.7125},
    # Madhya Pradesh
    {"state": "Madhya Pradesh", "district": "Indore", "constituency": "Indore", "lat": 22.7196, "lon": 75.8577},
    {"state": "Madhya Pradesh", "district": "Bhopal", "constituency": "Bhopal", "lat": 23.2599, "lon": 77.4126},
    {"state": "Madhya Pradesh", "district": "Jabalpur", "constituency": "Jabalpur", "lat": 23.1815, "lon": 79.9864},
    # Karnataka
    {"state": "Karnataka", "district": "Bengaluru Rural", "constituency": "Bengaluru Rural", "lat": 13.0645, "lon": 77.5678},
    {"state": "Karnataka", "district": "Mysuru", "constituency": "Mysuru", "lat": 12.2958, "lon": 76.6394},
    {"state": "Karnataka", "district": "Dharwad", "constituency": "Dharwad", "lat": 15.4589, "lon": 75.0078},
    # Tamil Nadu
    {"state": "Tamil Nadu", "district": "Coimbatore", "constituency": "Coimbatore", "lat": 11.0168, "lon": 76.9558},
    {"state": "Tamil Nadu", "district": "Madurai", "constituency": "Madurai", "lat": 9.9252, "lon": 78.1198},
    {"state": "Tamil Nadu", "district": "Salem", "constituency": "Salem", "lat": 11.6643, "lon": 78.1460},
    # Kerala
    {"state": "Kerala", "district": "Wayanad", "constituency": "Wayanad", "lat": 11.6854, "lon": 76.1320},
    {"state": "Kerala", "district": "Ernakulam", "constituency": "Ernakulam", "lat": 9.9816, "lon": 76.2999},
    {"state": "Kerala", "district": "Kozhikode", "constituency": "Kozhikode", "lat": 11.2588, "lon": 75.7804},
    # Telangana
    {"state": "Telangana", "district": "Warangal", "constituency": "Warangal", "lat": 17.9689, "lon": 79.5941},
    {"state": "Telangana", "district": "Nizamabad", "constituency": "Nizamabad", "lat": 18.6725, "lon": 78.0941},
    {"state": "Telangana", "district": "Karimnagar", "constituency": "Karimnagar", "lat": 18.4386, "lon": 79.1288},
    # Odisha
    {"state": "Odisha", "district": "Khordha", "constituency": "Bhubaneswar", "lat": 20.1809, "lon": 85.6212},
    {"state": "Odisha", "district": "Cuttack", "constituency": "Cuttack", "lat": 20.4625, "lon": 85.8830},
    {"state": "Odisha", "district": "Ganjam", "constituency": "Aska", "lat": 19.3800, "lon": 84.9900},
]

# ----------------------------------------------------------------------
# 2. SECTORS & WORK TEMPLATES
# ----------------------------------------------------------------------
SECTOR_TEMPLATES = {
    "Community Infrastructure": {
        "median": 1800000.0,
        "templates": [
            ("Construction of Multipurpose Community Hall at Village {}", 1200000, 2400000),
            ("Development of Public Recreation Shed and Boundary Wall in {}", 900000, 1800000),
            ("Construction of Open Air Gymnasium and Seating Area at {}", 600000, 1400000),
            ("Renovation and Expansion of Village Panchayat Bhavan in {}", 1400000, 2800000),
        ],
    },
    "Drinking Water & Sanitation": {
        "median": 800000.0,
        "templates": [
            ("Installation of Community RO Water Purification Plant at {}", 600000, 1100000),
            ("Construction of Public Sanitation Facility and Bathing Block in {}", 700000, 1300000),
            ("Drilling of Deep Borewell and Solar-Powered Overhead Water Tank at {}", 500000, 1000000),
            ("Laying of Underground Drinking Water Pipeline Distribution in {}", 800000, 1500000),
        ],
    },
    "Rural Connectivity & Roads": {
        "median": 2500000.0,
        "templates": [
            ("Construction of Cement Concrete (CC) Road and Drain Channel at {}", 1600000, 3600000),
            ("Interlocking Paver Block Road Installation along Main Street in {}", 800000, 1800000),
            ("Upgradation of Rural Link Road connecting Hamlet to Main Highway at {}", 2200000, 4800000),
            ("Construction of Culvert and Cross-Drainage Structure on Link Road {}", 1200000, 2600000),
        ],
    },
    "Education & Schools": {
        "median": 1600000.0,
        "templates": [
            ("Construction of Additional Classrooms at Govt Senior Secondary School {}", 1400000, 2800000),
            ("Installation of Digital Smart Classroom and Computer Lab Infrastructure at {}", 700000, 1500000),
            ("Construction of Separate Girls Toilet and Wash Area in Govt High School {}", 500000, 950000),
            ("Setup of Science Laboratory and Learning Resource Center in {}", 900000, 1800000),
        ],
    },
    "Renewable Energy": {
        "median": 600000.0,
        "templates": [
            ("Installation of Solar LED High-Mast Lighting System at Market Yard {}", 450000, 850000),
            ("Supply and Erection of 30 Standalone Solar Street Lights in {}", 500000, 950000),
            ("Installation of 10kW Rooftop Solar Power System at Primary Health Center {}", 600000, 1100000),
        ],
    },
    "Healthcare Infrastructure": {
        "median": 2200000.0,
        "templates": [
            ("Construction of Maternity & Child Healthcare Ward at Primary Health Sub-Center {}", 1800000, 3200000),
            ("Supply of Diagnostic Medical Equipment and Patient Beds to Rural Clinic in {}", 1000000, 2000000),
            ("Development of Emergency Cold Storage and Pharmacy Room at Hospital {}", 1200000, 2400000),
        ],
    },
    "Irrigation & Water Conservation": {
        "median": 1400000.0,
        "templates": [
            ("Construction of Check Dam and Water Harvesting Percolation Tank at {}", 1100000, 2200000),
            ("Desilting and Deepening of Traditional Village Water Reservoir in {}", 800000, 1700000),
            ("Construction of Reinforced Concrete Irrigation Sluice Gate and Channel in {}", 900000, 1900000),
        ],
    },
}

AGENCIES = [
    "Public Works Department (PWD)",
    "Rural Engineering Service (RES)",
    "District Rural Development Agency (DRDA)",
    "Panchayati Raj Engineering Division",
    "Municipal Corporation Public Works",
    "Minor Irrigation Division",
]

def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def generate_random_hash(seed_str: str) -> str:
    """Generates a deterministic SHA-256 hash string."""
    return hashlib.sha256(seed_str.encode("utf-8")).hexdigest()

def generate_random_phash(seed_val: int) -> str:
    """Generates a 16-hex-character perceptual hash string."""
    rng = random.Random(seed_val)
    val = rng.getrandbits(64)
    return f"{val:016x}"

def mutate_phash(base_phash: str, bits_to_flip: int = 2) -> str:
    """Flips specified number of bits to simulate near-duplicate photo perceptual hash."""
    val = int(base_phash, 16)
    for i in range(bits_to_flip):
        val ^= (1 << (i * 7 + 3))
    return f"{val:016x}"

# ----------------------------------------------------------------------
# 3. BUILD CONTRACTORS DATASET (200 CONTRACTORS)
# ----------------------------------------------------------------------
def build_contractors() -> Tuple[pd.DataFrame, Dict[str, Dict[str, Any]]]:
    contractors = []
    contractors_map = {}

    prefixes = ["Apex", "Shree Ganesh", "National", "Bharat", "Sai", "Kisan", "Vanguard",
                "Surya Shakti", "Reliable", "Pragati", "Maruti", "Universal", "Shiv Shakti",
                "Samriddhi", "Modern", "Classic", "Premier", "Alliance", "Golden", "Swastik",
                "Om", "Shanti", "Balaji", "Krishna", "Aditya", "Navnirman", "Gitanjali",
                "Hindustan", "Panchsheel", "United", "Vikas", "Riddhi", "Siddhartha", "Mahalaxmi"]
    suffixes = ["Infrastructure Ltd", "Construction Co", "Civil Projects", "Engineers & Builders",
                "Urban Works Pvt Ltd", "Rural Developers", "Infra Solutions", "Engineering Works",
                "Enterprises", "Contractors", "Buildcon Pvt Ltd", "Projects Ltd"]

    names_pool = []
    for p in prefixes:
        for s in suffixes:
            names_pool.append(f"{p} {s}")

    random.shuffle(names_pool)

    # First 3 are designated syndicate leaders with high project concentration
    names_pool[0] = "Apex Infrastructure Ltd"
    names_pool[1] = "Shree Ganesh Construction Co"
    names_pool[2] = "National Civil Projects"

    for i in range(1, 201):
        cid = f"CONTRACTOR-DEMO-{i:04d}"
        cname = names_pool[i - 1]
        dist_meta = random.choice(DISTRICTS_DATA)
        state = dist_meta["state"]
        district = dist_meta["district"]
        inc_year = random.randint(2010, 2021)
        clean_prefix = cname.lower().replace(" ", "").replace("&", "and")[:12]
        email = f"contact@{clean_prefix}-demo.in"
        reg_no = f"REG-{state[:2].upper()}-{inc_year}-{random.randint(1000, 9999)}"

        rec = {
            "contractor_id": cid,
            "contractor_name": cname,
            "registration_no": reg_no,
            "entity_type": "CONTRACTOR",
            "primary_district": district,
            "primary_state": state,
            "incorporation_year": inc_year,
            "contact_email": email,
            "total_projects_count": 0,
            "total_sanctioned_amount": 0.0,
        }
        contractors.append(rec)
        contractors_map[cid] = rec

    df = pd.DataFrame(contractors)
    return df, contractors_map

# ----------------------------------------------------------------------
# 4. BUILD 1,000 PROJECTS WITH EMBEDDED UNDERLYING ANOMALIES
# ----------------------------------------------------------------------
def build_projects(contractors_df: pd.DataFrame, contractors_map: Dict[str, Dict[str, Any]]) -> pd.DataFrame:
    records = []
    base_date = datetime.date(2023, 1, 15)

    all_contractor_ids = contractors_df["contractor_id"].tolist()
    syndicate_cids = all_contractor_ids[:3]  # Apex, Shree Ganesh, National
    standard_cids = all_contractor_ids[3:]

    # Pre-generate 1,000 basic projects
    for idx in range(1, 1001):
        pid = f"MPLADS-DEMO-{idx:06d}"
        dist_meta = random.choice(DISTRICTS_DATA)
        sector_name = random.choice(list(SECTOR_TEMPLATES.keys()))
        s_info = SECTOR_TEMPLATES[sector_name]
        template, min_c, max_c = random.choice(s_info["templates"])

        village_num = random.randint(1, 200)
        village = f"Village-{village_num}"
        block = f"Block-{(village_num % 10) + 1}"
        title = template.format(village)
        desc = f"{title}. Execution by authorized implementing agency following standard technical specifications."

        # Geographic coordinates with realistic sub-district jitter (within ~8 km)
        lat = round(dist_meta["lat"] + random.uniform(-0.065, 0.065), 6)
        lon = round(dist_meta["lon"] + random.uniform(-0.065, 0.065), 6)

        # Baseline finances
        sanctioned = float(random.randint(min_c // 10000, max_c // 10000) * 10000)
        estimated = round(sanctioned * random.uniform(0.96, 1.04), 2)
        expenditure = round(sanctioned * random.uniform(0.75, 0.98), 2)
        unspent = round(sanctioned - expenditure, 2)

        # Dates: recommendation -> sanction -> start -> completion
        rec_offset = random.randint(0, 500)
        rec_date = base_date + datetime.timedelta(days=rec_offset)
        sanc_lag = random.randint(14, 45)
        sanc_date = rec_date + datetime.timedelta(days=sanc_lag)
        start_lag = random.randint(15, 50)
        start_date = sanc_date + datetime.timedelta(days=start_lag)

        # 70% completed, 30% in progress
        is_completed = (random.random() > 0.28) and (start_date < datetime.date(2024, 7, 1))
        if is_completed:
            duration = random.randint(75, 220)
            comp_date = start_date + datetime.timedelta(days=duration)
            status = "Completed"
        else:
            comp_date = None
            status = "In Progress"

        # Assign contractor
        cid = random.choice(standard_cids)
        cname = contractors_map[cid]["contractor_name"]
        agency = random.choice(AGENCIES)

        records.append({
            "project_id": pid,
            "dataset_version": "DEMO-SYNTHETIC-v1",
            "data_source_type": "SYNTHETIC_DEMONSTRATION",
            "source_basis": "MPLADS_STYLE_STRUCTURE",
            "state": dist_meta["state"],
            "district": dist_meta["district"],
            "constituency": dist_meta["constituency"],
            "mp_name": f"Representative {dist_meta['district']} (Simulated)",
            "sector": sector_name,
            "title": title,
            "description": desc,
            "block": block,
            "village": village,
            "latitude": lat,
            "longitude": lon,
            "has_valid_coords": True,
            "sanctioned_amount": sanctioned,
            "estimated_cost": estimated,
            "expenditure": expenditure,
            "unspent_balance": unspent,
            "recommendation_date": rec_date.isoformat(),
            "sanction_date": sanc_date.isoformat(),
            "start_date": start_date.isoformat(),
            "completion_date": comp_date.isoformat() if comp_date else "",
            "status": status,
            "contractor_id": cid,
            "contractor_name": cname,
            "implementing_agency": agency,
        })

    # ==================================================================
    # EMBED 5 CONNECTED HERO CASES (PROJECTS 1 TO 10) - FOR SIH DEMO
    # ==================================================================

    # ------------------------------------------------------------------
    # HERO CASE 01: Financial + Temporal Anomaly (MPLADS-DEMO-000001)
    # Stalled ₹65L community hall in Village-Kalyanpur with only 12.6% spent after > 500 days
    # ------------------------------------------------------------------
    records[0]["state"] = "Gujarat"
    records[0]["district"] = "Rajkot"
    records[0]["constituency"] = "Rajkot"
    records[0]["mp_name"] = "Representative Rajkot (Simulated)"
    records[0]["block"] = "Block-1"
    records[0]["village"] = "Village-Kalyanpur"
    records[0]["sector"] = "Community Infrastructure"
    records[0]["title"] = "Construction of Multipurpose Community Hall at Village-Kalyanpur"
    records[0]["description"] = "Construction of Multipurpose Community Hall at Village-Kalyanpur with main auditorium, public sanitation block, and electrical wiring."
    records[0]["latitude"] = 22.303920
    records[0]["longitude"] = 70.802210
    records[0]["sanctioned_amount"] = 6500000.0  # ₹65 Lakhs
    records[0]["estimated_cost"] = 6500000.0
    records[0]["expenditure"] = 820000.0  # ₹8.2 Lakhs (12.6% utilization ratio)
    records[0]["unspent_balance"] = 5680000.0
    sanc_d0 = datetime.date(2023, 2, 10)
    records[0]["recommendation_date"] = "2023-01-15"
    records[0]["sanction_date"] = sanc_d0.isoformat()
    records[0]["start_date"] = "2023-03-15"
    records[0]["completion_date"] = ""
    records[0]["status"] = "In Progress"
    records[0]["contractor_id"] = syndicate_cids[0]  # Apex Infrastructure Ltd
    records[0]["contractor_name"] = contractors_map[syndicate_cids[0]]["contractor_name"]
    records[0]["implementing_agency"] = "Public Works Department (PWD)"

    # ------------------------------------------------------------------
    # HERO CASE 02: Spatial + NLP Clustered Duplicates (MPLADS-DEMO-000002 & 000003)
    # Two community halls ~20 meters apart with 95%+ lexical description overlap
    # ------------------------------------------------------------------
    # Part A (MPLADS-DEMO-000002 - awarded to Apex, connects to Hero 01)
    records[1]["state"] = "Gujarat"
    records[1]["district"] = "Rajkot"
    records[1]["constituency"] = "Rajkot"
    records[1]["mp_name"] = "Representative Rajkot (Simulated)"
    records[1]["block"] = "Block-1"
    records[1]["village"] = "Village-Kalyanpur"
    records[1]["sector"] = "Community Infrastructure"
    records[1]["title"] = "Development of Community Hall and Boundary Wall in Village-Kalyanpur"
    records[1]["description"] = "Comprehensive development of community center including boundary wall, RCC framing, and sanitary facilities at Village-Kalyanpur."
    records[1]["latitude"] = 22.303940
    records[1]["longitude"] = 70.802220  # ~5m from Project 1
    records[1]["sanctioned_amount"] = 1850000.0
    records[1]["estimated_cost"] = 1850000.0
    records[1]["expenditure"] = 1780000.0
    records[1]["unspent_balance"] = 70000.0
    records[1]["recommendation_date"] = "2023-04-10"
    records[1]["sanction_date"] = "2023-05-05"
    records[1]["start_date"] = "2023-05-25"
    records[1]["completion_date"] = "2023-11-15"
    records[1]["status"] = "Completed"
    records[1]["contractor_id"] = syndicate_cids[0]  # Apex Infrastructure Ltd
    records[1]["contractor_name"] = contractors_map[syndicate_cids[0]]["contractor_name"]
    records[1]["implementing_agency"] = "Public Works Department (PWD)"

    # Part B (MPLADS-DEMO-000003 - awarded to Shree Ganesh, connects to Hero 03)
    records[2]["state"] = "Gujarat"
    records[2]["district"] = "Rajkot"
    records[2]["constituency"] = "Rajkot"
    records[2]["mp_name"] = "Representative Rajkot (Simulated)"
    records[2]["block"] = "Block-1"
    records[2]["village"] = "Village-Kalyanpur"
    records[2]["sector"] = "Community Infrastructure"
    records[2]["title"] = "Construction of Community Center and Peripheral Wall in Village-Kalyanpur"
    records[2]["description"] = "Comprehensive development of community center including boundary wall, RCC framing, and sanitary facilities at Village-Kalyanpur."
    records[2]["latitude"] = 22.304120  # ~21 meters from Project 2!
    records[2]["longitude"] = 70.802280
    records[2]["sanctioned_amount"] = 1900000.0
    records[2]["estimated_cost"] = 1900000.0
    records[2]["expenditure"] = 1820000.0
    records[2]["unspent_balance"] = 80000.0
    records[2]["recommendation_date"] = "2023-04-12"
    records[2]["sanction_date"] = "2023-05-08"
    records[2]["start_date"] = "2023-05-28"
    records[2]["completion_date"] = "2023-11-20"
    records[2]["status"] = "Completed"
    records[2]["contractor_id"] = syndicate_cids[1]  # Shree Ganesh Construction Co
    records[2]["contractor_name"] = contractors_map[syndicate_cids[1]]["contractor_name"]
    records[2]["implementing_agency"] = "Public Works Department (PWD)"

    # ------------------------------------------------------------------
    # HERO CASE 03: Contractor + Procurement Fragmentation (MPLADS-DEMO-000004, 000005, 000006)
    # Triplet of road sanctions just below ₹5L ceiling awarded to Apex in Village-Sundarpur
    # ------------------------------------------------------------------
    for k, p_i in enumerate([3, 4, 5]):
        records[p_i]["state"] = "Gujarat"
        records[p_i]["district"] = "Rajkot"
        records[p_i]["constituency"] = "Rajkot"
        records[p_i]["mp_name"] = "Representative Rajkot (Simulated)"
        records[p_i]["block"] = "Block-1"
        records[p_i]["village"] = "Village-Sundarpur"
        records[p_i]["sector"] = "Rural Connectivity & Roads"
        records[p_i]["title"] = f"Interlocking Paver Block Road and Drain Channel Part {k+1} in Village-Sundarpur"
        records[p_i]["description"] = f"Interlocking Paver Block Road and Drain Channel Part {k+1} in Village-Sundarpur with standardized edge kerbs and stormwater drain."
        records[p_i]["latitude"] = 22.304100 + k * 0.00004
        records[p_i]["longitude"] = 70.802300 + k * 0.00004
        val = [495000.0, 492000.0, 488000.0][k]  # Right below ₹5,00,000 ceiling!
        records[p_i]["sanctioned_amount"] = val
        records[p_i]["estimated_cost"] = val
        records[p_i]["expenditure"] = val
        records[p_i]["unspent_balance"] = 0.0
        s_date_h3 = datetime.date(2023, 9, 12 + k)
        records[p_i]["recommendation_date"] = (s_date_h3 - datetime.timedelta(days=18)).isoformat()
        records[p_i]["sanction_date"] = s_date_h3.isoformat()
        records[p_i]["start_date"] = (s_date_h3 + datetime.timedelta(days=10)).isoformat()
        records[p_i]["completion_date"] = (s_date_h3 + datetime.timedelta(days=80)).isoformat()
        records[p_i]["status"] = "Completed"
        records[p_i]["contractor_id"] = syndicate_cids[0]  # Apex Infrastructure Ltd
        records[p_i]["contractor_name"] = contractors_map[syndicate_cids[0]]["contractor_name"]
        records[p_i]["implementing_agency"] = "Rural Engineering Service (RES)"

    # ------------------------------------------------------------------
    # HERO CASE 04: Evidence Reuse Across Projects (MPLADS-DEMO-000007 & 000008)
    # Identical photographic SHA-256 hash across distinct roads (Sundarpur vs Navagam, 14 km apart)
    # ------------------------------------------------------------------
    # Project 7: In Sundarpur (connects to Hero 03 location & Apex)
    records[6]["state"] = "Gujarat"
    records[6]["district"] = "Rajkot"
    records[6]["constituency"] = "Rajkot"
    records[6]["mp_name"] = "Representative Rajkot (Simulated)"
    records[6]["block"] = "Block-1"
    records[6]["village"] = "Village-Sundarpur"
    records[6]["sector"] = "Rural Connectivity & Roads"
    records[6]["title"] = "Widening of Rural Link Road connecting Village-Sundarpur"
    records[6]["description"] = "Widening of Rural Link Road connecting Village-Sundarpur to main district arterial corridor with asphalt surfacing."
    records[6]["latitude"] = 22.304200
    records[6]["longitude"] = 70.802400
    records[6]["sanctioned_amount"] = 2400000.0
    records[6]["estimated_cost"] = 2400000.0
    records[6]["expenditure"] = 2400000.0
    records[6]["unspent_balance"] = 0.0
    records[6]["recommendation_date"] = "2023-06-05"
    records[6]["sanction_date"] = "2023-06-25"
    records[6]["start_date"] = "2023-07-15"
    records[6]["completion_date"] = "2023-12-20"
    records[6]["status"] = "Completed"
    records[6]["contractor_id"] = syndicate_cids[0]  # Apex Infrastructure Ltd
    records[6]["contractor_name"] = contractors_map[syndicate_cids[0]]["contractor_name"]
    records[6]["implementing_agency"] = "Public Works Department (PWD)"

    # Project 8: In Navagam (14 km away)
    records[7]["state"] = "Gujarat"
    records[7]["district"] = "Rajkot"
    records[7]["constituency"] = "Rajkot"
    records[7]["mp_name"] = "Representative Rajkot (Simulated)"
    records[7]["block"] = "Block-3"
    records[7]["village"] = "Village-Navagam"
    records[7]["sector"] = "Rural Connectivity & Roads"
    records[7]["title"] = "Construction of CC Road and Drain in Village-Navagam"
    records[7]["description"] = "Construction of Cement Concrete (CC) Road and peripheral drain in Village-Navagam."
    records[7]["latitude"] = 22.415200
    records[7]["longitude"] = 70.895400
    records[7]["sanctioned_amount"] = 2200000.0
    records[7]["estimated_cost"] = 2200000.0
    records[7]["expenditure"] = 2200000.0
    records[7]["unspent_balance"] = 0.0
    records[7]["recommendation_date"] = "2023-07-01"
    records[7]["sanction_date"] = "2023-07-20"
    records[7]["start_date"] = "2023-08-10"
    records[7]["completion_date"] = "2024-01-15"
    records[7]["status"] = "Completed"
    records[7]["contractor_id"] = standard_cids[0]
    records[7]["contractor_name"] = contractors_map[standard_cids[0]]["contractor_name"]
    records[7]["implementing_agency"] = "Rural Engineering Service (RES)"

    # Supporting Project 9: Clean baseline in Village-Sundarpur
    records[8]["state"] = "Gujarat"
    records[8]["district"] = "Rajkot"
    records[8]["constituency"] = "Rajkot"
    records[8]["mp_name"] = "Representative Rajkot (Simulated)"
    records[8]["block"] = "Block-1"
    records[8]["village"] = "Village-Sundarpur"
    records[8]["sector"] = "Drinking Water & Sanitation"
    records[8]["title"] = "Installation of Community RO Water Purification Plant at Village-Sundarpur"
    records[8]["description"] = "Installation of Community RO Water Purification Plant at Village-Sundarpur with 1000 LPH capacity."
    records[8]["latitude"] = 22.304050
    records[8]["longitude"] = 70.802320
    records[8]["sanctioned_amount"] = 750000.0
    records[8]["estimated_cost"] = 750000.0
    records[8]["expenditure"] = 720000.0
    records[8]["unspent_balance"] = 30000.0
    records[8]["recommendation_date"] = "2023-05-10"
    records[8]["sanction_date"] = "2023-06-01"
    records[8]["start_date"] = "2023-06-20"
    records[8]["completion_date"] = "2023-09-30"
    records[8]["status"] = "Completed"
    records[8]["contractor_id"] = standard_cids[1]
    records[8]["contractor_name"] = contractors_map[standard_cids[1]]["contractor_name"]
    records[8]["implementing_agency"] = "Panchayati Raj Engineering Division"

    # ------------------------------------------------------------------
    # HERO CASE 05: Primary Cross-Domain Investigation Showcase (MPLADS-DEMO-000010)
    # The focal nexus project exhibiting multi-modal risk: Cost spike + 5-day velocity +
    # Cloned scope + Split cluster neighbor + Apex syndicate + Evidence reuse + 23km GPS drift
    # ------------------------------------------------------------------
    records[9]["state"] = "Gujarat"
    records[9]["district"] = "Rajkot"
    records[9]["constituency"] = "Rajkot"
    records[9]["mp_name"] = "Representative Rajkot (Simulated)"
    records[9]["block"] = "Block-1"
    records[9]["village"] = "Village-Sundarpur"
    records[9]["sector"] = "Community Infrastructure"
    records[9]["title"] = "Construction of Solar-Powered Community Facility and High-Mast Lighting at Village-Sundarpur"
    records[9]["description"] = "Comprehensive development of community center including boundary wall, RCC framing, and sanitary facilities with integrated solar high-mast illumination."
    records[9]["latitude"] = 22.304150
    records[9]["longitude"] = 70.802350
    records[9]["sanctioned_amount"] = 4850000.0  # ₹48.5 Lakhs
    records[9]["estimated_cost"] = 2400000.0   # 2.02x benchmark estimate (Cost Elevation)
    records[9]["expenditure"] = 4850000.0
    records[9]["unspent_balance"] = 0.0
    records[9]["recommendation_date"] = "2023-09-18"
    records[9]["sanction_date"] = "2023-10-02"
    records[9]["start_date"] = "2023-10-10"
    records[9]["completion_date"] = "2023-10-15"  # 5 days duration for ₹48.5L major construction!
    records[9]["status"] = "Completed"
    records[9]["contractor_id"] = syndicate_cids[0]  # Apex Infrastructure Ltd
    records[9]["contractor_name"] = contractors_map[syndicate_cids[0]]["contractor_name"]
    records[9]["implementing_agency"] = "Public Works Department (PWD)"

    # ==================================================================
    # EMBED GENERAL ANOMALY SCENARIOS ACROSS REMAINING DATASET
    # ==================================================================

    # ------------------------------------------------------------------
    # Scenario 1: Low Utilization / Stalled Works (10 Projects)
    # Indices 50 to 59: Sanctioned 50-70L, expenditure < 10L, age > 18 months, "In Progress"
    # ------------------------------------------------------------------
    for i in range(50, 60):
        records[i]["sanctioned_amount"] = float(random.randint(55, 70) * 100000)
        records[i]["estimated_cost"] = records[i]["sanctioned_amount"]
        records[i]["expenditure"] = float(random.randint(4, 9) * 100000)  # low utilization (< 15%)
        records[i]["unspent_balance"] = round(records[i]["sanctioned_amount"] - records[i]["expenditure"], 2)
        sanc_dt = datetime.date(2023, 2, 15)
        records[i]["recommendation_date"] = (sanc_dt - datetime.timedelta(days=random.randint(14, 25))).isoformat()
        records[i]["sanction_date"] = sanc_dt.isoformat()
        records[i]["start_date"] = (sanc_dt + datetime.timedelta(days=35)).isoformat()
        records[i]["completion_date"] = ""
        records[i]["status"] = "In Progress"

    # ------------------------------------------------------------------
    # Scenario 2: Severe Cost Outliers / Inflation (12 Projects)
    # Indices 70 to 81: Basic work (median 6L-8L) sanctioned at 3.5x-5.2x sector median (35L-88L)
    # ------------------------------------------------------------------
    for i in range(70, 82):
        records[i]["sector"] = "Renewable Energy"
        records[i]["title"] = f"Supply and Erection of 30 Standalone Solar Street Lights in {records[i]['village']}"
        records[i]["description"] = f"Supply and Erection of 30 Standalone Solar Street Lights in {records[i]['village']} with LED fixtures."
        inflated_cost = float(random.randint(45, 88) * 100000)  # Normal median is 6L!
        records[i]["sanctioned_amount"] = inflated_cost
        records[i]["estimated_cost"] = round(inflated_cost * 1.02, 2)
        records[i]["expenditure"] = inflated_cost
        records[i]["unspent_balance"] = 0.0

    # ------------------------------------------------------------------
    # Scenario 3: Temporal Velocity / Unrealistic Speed (8 Projects)
    # Indices 90 to 97: ₹35L-₹48L spent and completed in 3 to 6 days
    # ------------------------------------------------------------------
    for i in range(90, 98):
        records[i]["sanctioned_amount"] = float(random.randint(35, 48) * 100000)
        records[i]["estimated_cost"] = records[i]["sanctioned_amount"]
        records[i]["expenditure"] = records[i]["sanctioned_amount"]
        records[i]["unspent_balance"] = 0.0
        sanc_dt = datetime.date(2023, 11, 1)
        records[i]["recommendation_date"] = (sanc_dt - datetime.timedelta(days=random.randint(14, 25))).isoformat()
        records[i]["sanction_date"] = sanc_dt.isoformat()
        records[i]["start_date"] = "2023-11-05"
        records[i]["completion_date"] = "2023-11-09"  # 4 days total duration!
        records[i]["status"] = "Completed"

    # ------------------------------------------------------------------
    # Scenario 4: High Temporal Inception Lag (10 Projects)
    # Indices 110 to 119: Sanction to start date lag > 240 days
    # ------------------------------------------------------------------
    for i in range(110, 120):
        sanc_dt = datetime.date(2023, 1, 10)
        records[i]["recommendation_date"] = (sanc_dt - datetime.timedelta(days=random.randint(14, 25))).isoformat()
        records[i]["sanction_date"] = sanc_dt.isoformat()
        records[i]["start_date"] = "2023-10-25"  # 288 days lag
        records[i]["completion_date"] = ""
        records[i]["status"] = "In Progress"

    # ------------------------------------------------------------------
    # Scenario 5: NLP / Lexical Description Clones (10 Projects)
    # Indices 130 to 139: Exactly identical technical wording in adjacent blocks
    # ------------------------------------------------------------------
    cloned_text = "Comprehensive modernization of rural community utility center including high-grade vitrified tile paving, aluminum sliding windows, and specialized electrical conduit installation."
    for i in range(130, 140):
        records[i]["district"] = "Varanasi"
        records[i]["state"] = "Uttar Pradesh"
        records[i]["constituency"] = "Varanasi"
        records[i]["title"] = f"Comprehensive modernization of rural community utility center in {records[i]['village']}"
        records[i]["description"] = cloned_text

    # ------------------------------------------------------------------
    # Scenario 6: Spatial Near-Duplicate / Overlap (6 Pairs = 12 Projects)
    # Indices 150/151, 152/153, 154/155, 156/157, 158/159, 160/161
    # Placed 15 to 45 meters apart in the same village for identical work
    # ------------------------------------------------------------------
    for k in range(6):
        idx1 = 150 + k * 2
        idx2 = idx1 + 1
        base_lat = records[idx1]["latitude"]
        base_lon = records[idx1]["longitude"]
        vname = f"Village-Ward-{10 + k}"
        records[idx1]["village"] = vname
        records[idx2]["village"] = vname
        records[idx1]["district"] = records[idx2]["district"]
        records[idx1]["state"] = records[idx2]["state"]
        records[idx1]["title"] = f"Construction of Community Hall at {vname}"
        records[idx1]["description"] = f"Construction of Community Hall at {vname} with sanitation facilities."
        records[idx2]["title"] = f"Development of Community Hall in {vname}"
        records[idx2]["description"] = f"Development of Community Hall in {vname} with sanitation facilities."
        # Position idx2 ~20 meters away (0.00018 deg lat ~ 20m)
        records[idx2]["latitude"] = round(base_lat + 0.00018, 6)
        records[idx2]["longitude"] = round(base_lon + 0.00005, 6)

    # ------------------------------------------------------------------
    # Scenario 7: Contractor Syndicate / High Concentration (80 Projects)
    # Assign 42 projects to Apex, 38 to Shree Ganesh across adjacent districts
    # ------------------------------------------------------------------
    for i in range(200, 242):
        records[i]["contractor_id"] = syndicate_cids[0]  # Apex
        records[i]["contractor_name"] = contractors_map[syndicate_cids[0]]["contractor_name"]
    for i in range(242, 280):
        records[i]["contractor_id"] = syndicate_cids[1]  # Shree Ganesh
        records[i]["contractor_name"] = contractors_map[syndicate_cids[1]]["contractor_name"]

    # ------------------------------------------------------------------
    # Scenario 8: Split Tendering / Procurement Fragmentation (4 Clusters x 3 Works = 12 Projects)
    # Indices 300-302 (Cluster 1), 303-305 (Cluster 2), 306-308 (Cluster 3), 309-311 (Cluster 4)
    # Just below ₹5.00 Lakhs statutory threshold (₹4.85L - ₹4.98L) awarded to same contractor in same village
    # ------------------------------------------------------------------
    split_villages = ["Village-Sundarpur", "Village-Ramnagar", "Village-Shivpur", "Village-Kalyanpur"]
    for c_idx in range(4):
        v = split_villages[c_idx]
        c_contractor_id = syndicate_cids[c_idx % 2]
        c_contractor_name = contractors_map[c_contractor_id]["contractor_name"]
        for p_sub in range(3):
            p_i = 300 + c_idx * 3 + p_sub
            records[p_i]["village"] = v
            records[p_i]["block"] = f"Block-{c_idx + 1}"
            records[p_i]["district"] = "Rajkot" if c_idx < 2 else "Varanasi"
            records[p_i]["state"] = "Gujarat" if c_idx < 2 else "Uttar Pradesh"
            records[p_i]["title"] = f"Paver block road and drain construction Part {p_sub + 1} at {v}"
            records[p_i]["description"] = f"Paver block road and drain construction Part {p_sub + 1} at {v} under rural scheme."
            sanc_val = float(random.randint(485, 498) * 1000)  # ₹4,85,000 to ₹4,98,000 (right below ₹5L ceiling!)
            records[p_i]["sanctioned_amount"] = sanc_val
            records[p_i]["estimated_cost"] = sanc_val
            records[p_i]["expenditure"] = sanc_val
            records[p_i]["unspent_balance"] = 0.0
            sanc_dt = datetime.date(2023, 9, 10 + p_sub)
            records[p_i]["recommendation_date"] = (sanc_dt - datetime.timedelta(days=random.randint(14, 25))).isoformat()
            records[p_i]["sanction_date"] = sanc_dt.isoformat()
            records[p_i]["start_date"] = f"2023-09-{20 + p_sub:02d}"
            records[p_i]["contractor_id"] = c_contractor_id
            records[p_i]["contractor_name"] = c_contractor_name

    # ------------------------------------------------------------------
    # Scenario 9: Multi-Modal Critical Compound Anomalies (30 Projects)
    # Indices 400 to 429: Exhibit compound risk (Cost outlier + Split tender cluster + syndicate contractor + velocity spike)
    # ------------------------------------------------------------------
    for k in range(10):
        # Triplet of projects sharing village and contractor
        v_crit = f"Village-CriticalSector-{k+1}"
        for t in range(3):
            p_crit_idx = 400 + k * 3 + t
            records[p_crit_idx]["village"] = v_crit
            records[p_crit_idx]["contractor_id"] = syndicate_cids[0]  # Apex
            records[p_crit_idx]["contractor_name"] = contractors_map[syndicate_cids[0]]["contractor_name"]
            records[p_crit_idx]["district"] = "Nagpur" if k < 5 else "Jaipur"
            records[p_crit_idx]["state"] = "Maharashtra" if k < 5 else "Rajasthan"
            records[p_crit_idx]["title"] = f"Construction of High-Mast Light and Solar Substation Phase {t+1} at {v_crit}"
            records[p_crit_idx]["description"] = f"Construction of High-Mast Light and Solar Substation Phase {t+1} at {v_crit} with peripheral fencing."
            # Sanction amount right under ceiling
            val = float(random.randint(492, 499) * 1000)
            records[p_crit_idx]["sanctioned_amount"] = val
            records[p_crit_idx]["estimated_cost"] = val
            records[p_crit_idx]["expenditure"] = val
            records[p_crit_idx]["unspent_balance"] = 0.0
            sanc_dt = datetime.date(2023, 10, 12 + t)
            records[p_crit_idx]["recommendation_date"] = (sanc_dt - datetime.timedelta(days=random.randint(14, 25))).isoformat()
            records[p_crit_idx]["sanction_date"] = sanc_dt.isoformat()
            records[p_crit_idx]["start_date"] = f"2023-10-{16 + t:02d}"
            records[p_crit_idx]["completion_date"] = f"2023-10-{20 + t:02d}"  # 4-day velocity
            records[p_crit_idx]["status"] = "Completed"

    # Update Contractor counts and totals
    for r in records:
        cid = r["contractor_id"]
        contractors_map[cid]["total_projects_count"] += 1
        contractors_map[cid]["total_sanctioned_amount"] += r["sanctioned_amount"]

    df = pd.DataFrame(records)
    return df

# ----------------------------------------------------------------------
# 5. BUILD TENDERS DATASET (~2,000 TENDERS)
# ----------------------------------------------------------------------
def build_tenders(projects_df: pd.DataFrame) -> pd.DataFrame:
    tenders = []
    tender_id_counter = 1

    procurement_methods = ["Open Tender", "Limited Tender", "Quotation / Direct Award", "E-Procurement"]

    for _, proj in projects_df.iterrows():
        pid = proj["project_id"]
        sanc_amount = float(proj["sanctioned_amount"])
        sanc_date = datetime.date.fromisoformat(proj["sanction_date"])
        cid = proj["contractor_id"]
        cname = proj["contractor_name"]

        # Number of tenders per project: 2 tenders (Notice Inviting Tender + Awarded Contract)
        for stage_idx in range(2):
            tid = f"TENDER-DEMO-{tender_id_counter:05d}"
            tender_id_counter += 1

            if stage_idx == 0:
                stage = "Notice Inviting Tender (NIT)"
                ref_no = f"NIT/{proj['implementing_agency'][:3]}/{proj['district'][:3].upper()}/{sanc_date.year}/{tender_id_counter:04d}"
                pub_date = sanc_date - datetime.timedelta(days=random.randint(15, 30))
                close_date = pub_date + datetime.timedelta(days=random.randint(10, 21))
                award_date = close_date + datetime.timedelta(days=random.randint(5, 12))
                est_val = round(sanc_amount * random.uniform(0.98, 1.05), 2)
                award_val = round(sanc_amount, 2)
                status = "Completed"
                # Split tenders or quotation works typically have low bidder count (1 or 2)
                bidders = random.randint(1, 2) if sanc_amount <= 500000.0 else random.randint(3, 7)
                proc_method = "Quotation / Direct Award" if sanc_amount <= 500000.0 else random.choice(["Open Tender", "E-Procurement"])
            else:
                stage = "Work Order Issued"
                ref_no = f"WO/{proj['district'][:3].upper()}/{sanc_date.year}/{tender_id_counter:04d}"
                pub_date = sanc_date - datetime.timedelta(days=random.randint(5, 12))
                close_date = sanc_date
                award_date = sanc_date + datetime.timedelta(days=random.randint(2, 7))
                est_val = round(sanc_amount, 2)
                award_val = round(sanc_amount, 2)
                status = "Awarded"
                bidders = 1
                proc_method = "E-Procurement"

            if pid == "MPLADS-DEMO-000010" and stage_idx == 0:
                est_val = 2400000.0
                award_val = 4850000.0
                proc_method = "Limited Tender"
                bidders = 1

            tenders.append({
                "tender_id": tid,
                "project_id": pid,
                "tender_title": f"Procurement for {proj['title']}",
                "tender_reference_no": ref_no,
                "procurement_method": proc_method,
                "tender_stage": stage,
                "publishing_date": pub_date.isoformat(),
                "closing_date": close_date.isoformat(),
                "award_date": award_date.isoformat(),
                "estimated_tender_value": est_val,
                "awarded_contract_value": award_val,
                "winning_contractor_id": cid,
                "winning_contractor_name": cname,
                "bidder_count": bidders,
                "status": status,
            })

    df = pd.DataFrame(tenders)
    return df

# ----------------------------------------------------------------------
# 6. BUILD EVIDENCE DATASET (~2,000 EVIDENCE RECORDS)
# ----------------------------------------------------------------------
def build_evidence(projects_df: pd.DataFrame) -> pd.DataFrame:
    evidence_records = []
    ev_counter = 1

    devices = [
        ("Samsung", "SM-A525F"),
        ("Xiaomi", "Redmi Note 11"),
        ("Vivo", "Vivo V23 5G"),
        ("Realme", "Realme 9 Pro"),
        ("OnePlus", "Nord CE 2"),
        ("Apple", "iPhone 13"),
    ]

    # Each project gets 2 evidence records:
    # 1. Progress Photo (during construction)
    # 2. Completion / Site Photo (at completion or latest stage)

    for idx, proj in projects_df.iterrows():
        pid = proj["project_id"]
        s_date = datetime.date.fromisoformat(proj["sanction_date"])
        p_lat = proj["latitude"]
        p_lon = proj["longitude"]
        status = proj["status"]

        make, model = random.choice(devices)

        # Evidence Record 1: Progress Photo
        ev_id1 = f"EV-DEMO-{ev_counter:05d}"
        ev_counter += 1
        cap_date1 = s_date + datetime.timedelta(days=random.randint(15, 60))
        h1 = generate_random_hash(f"{pid}_progress_{SEED}")
        ph1 = generate_random_phash(idx * 2 + 1)
        # Normal photo GPS within 10 to 45 meters of project location
        gps_lat1 = round(p_lat + random.uniform(-0.0002, 0.0002), 6)
        gps_lon1 = round(p_lon + random.uniform(-0.0002, 0.0002), 6)
        dist1 = haversine_distance_m(p_lat, p_lon, gps_lat1, gps_lon1)

        evidence_records.append({
            "evidence_id": ev_id1,
            "project_id": pid,
            "evidence_type": "PROGRESS_PHOTO",
            "title": f"Site Inspection Photograph - Construction Stage - {proj['village']}",
            "file_name": f"{pid}_progress_stage.jpg",
            "mime_type": "image/jpeg",
            "file_size_bytes": random.randint(180000, 420000),
            "sha256_hash": h1,
            "phash": ph1,
            "capture_timestamp": f"{cap_date1.isoformat()} 11:24:15",
            "gps_latitude": gps_lat1,
            "gps_longitude": gps_lon1,
            "gps_distance_to_project_m": dist1,
            "device_make": make,
            "device_model": model,
            "source": "eSAKSHI Mobile App",
        })

        # Evidence Record 2: Completion / Verification Photo
        ev_id2 = f"EV-DEMO-{ev_counter:05d}"
        ev_counter += 1
        cap_date2 = s_date + datetime.timedelta(days=random.randint(70, 180))
        h2 = generate_random_hash(f"{pid}_completion_{SEED}")
        ph2 = generate_random_phash(idx * 2 + 2)
        gps_lat2 = round(p_lat + random.uniform(-0.0003, 0.0003), 6)
        gps_lon2 = round(p_lon + random.uniform(-0.0003, 0.0003), 6)
        dist2 = haversine_distance_m(p_lat, p_lon, gps_lat2, gps_lon2)

        evidence_records.append({
            "evidence_id": ev_id2,
            "project_id": pid,
            "evidence_type": "COMPLETION_PHOTO" if status == "Completed" else "SITE_IMAGE",
            "title": f"Geo-tagged Asset Verification Photograph - {proj['village']}",
            "file_name": f"{pid}_verification_stage.jpg",
            "mime_type": "image/jpeg",
            "file_size_bytes": random.randint(210000, 480000),
            "sha256_hash": h2,
            "phash": ph2,
            "capture_timestamp": f"{cap_date2.isoformat()} 15:42:10",
            "gps_latitude": gps_lat2,
            "gps_longitude": gps_lon2,
            "gps_distance_to_project_m": dist2,
            "device_make": make,
            "device_model": model,
            "source": "eSAKSHI Mobile App",
        })

    # ==================================================================
    # EMBED HERO CASES EVIDENCE WIRING
    # ==================================================================

    # Hero Case 04: Project 7 & Project 8 share identical photo SHA-256 and pHash
    h_hero_reuse = "a7f9b842c1e830d95e04289cf492b1a8d0537f16bc489e24016a94f08e332d91"
    ph_hero_reuse = "d28a5c3917ef410a"
    ev_hero7_comp = 6 * 2 + 1  # EV-DEMO-00014 (Project 7 completion)
    ev_hero8_comp = 7 * 2 + 1  # EV-DEMO-00016 (Project 8 completion)
    evidence_records[ev_hero7_comp]["sha256_hash"] = h_hero_reuse
    evidence_records[ev_hero7_comp]["phash"] = ph_hero_reuse
    evidence_records[ev_hero7_comp]["file_size_bytes"] = 342810
    evidence_records[ev_hero8_comp]["sha256_hash"] = h_hero_reuse
    evidence_records[ev_hero8_comp]["phash"] = ph_hero_reuse
    evidence_records[ev_hero8_comp]["file_size_bytes"] = 342810

    # Hero Case 05 (Project 10):
    # - Photo 1 (Progress): Reuses the exact same photograph hash as Hero 04!
    # - Photo 2 (Completion): EXIF GPS is located 23.4 km away from project site!
    ev_hero10_prog = 9 * 2      # EV-DEMO-00019 (Project 10 progress)
    ev_hero10_comp = 9 * 2 + 1  # EV-DEMO-00020 (Project 10 completion)
    evidence_records[ev_hero10_prog]["sha256_hash"] = h_hero_reuse
    evidence_records[ev_hero10_prog]["phash"] = ph_hero_reuse
    evidence_records[ev_hero10_prog]["file_size_bytes"] = 342810

    evidence_records[ev_hero10_comp]["gps_latitude"] = 22.482100
    evidence_records[ev_hero10_comp]["gps_longitude"] = 70.941200
    evidence_records[ev_hero10_comp]["gps_distance_to_project_m"] = 23418.5

    # ==================================================================
    # EMBED EVIDENCE ANOMALY PATTERNS
    # ==================================================================

    # 1. Exact SHA-256 Photo Reuse across 8 pairs of projects (16 projects)
    for p_pair in range(8):
        i_a = (600 + p_pair * 2) * 2 + 1  # completion photo index of proj A
        i_b = (600 + p_pair * 2 + 1) * 2 + 1  # completion photo index of proj B
        # Make SHA-256 hash identical!
        shared_hash = evidence_records[i_a]["sha256_hash"]
        shared_phash = evidence_records[i_a]["phash"]
        evidence_records[i_b]["sha256_hash"] = shared_hash
        evidence_records[i_b]["phash"] = shared_phash
        evidence_records[i_b]["file_size_bytes"] = evidence_records[i_a]["file_size_bytes"]

    # 2. Perceptual Photo Near-Duplicate Reuse across 6 pairs of projects (12 projects)
    for p_pair in range(6):
        i_a = (620 + p_pair * 2) * 2 + 1
        i_b = (620 + p_pair * 2 + 1) * 2 + 1
        base_ph = evidence_records[i_a]["phash"]
        evidence_records[i_b]["phash"] = mutate_phash(base_ph, bits_to_flip=2)

    # 3. Photo GPS Discrepancy (10 Projects: 640 to 649)
    # Photo coordinates are 15 km to 32 km away from registered project site!
    for p_idx in range(640, 650):
        ev_i = p_idx * 2 + 1  # completion photo
        orig_lat = evidence_records[ev_i]["gps_latitude"]
        orig_lon = evidence_records[ev_i]["gps_longitude"]
        # Offset lat by ~0.18 degrees (~20 km)
        discrepant_lat = round(orig_lat + 0.185, 6)
        discrepant_lon = round(orig_lon + 0.110, 6)
        evidence_records[ev_i]["gps_latitude"] = discrepant_lat
        evidence_records[ev_i]["gps_longitude"] = discrepant_lon
        disc_dist = haversine_distance_m(orig_lat, orig_lon, discrepant_lat, discrepant_lon)
        evidence_records[ev_i]["gps_distance_to_project_m"] = disc_dist

    # 4. Critical Compound Projects (400-429): Photographic evidence reuse across triplets!
    for k in range(10):
        ev_master_idx = (400 + k * 3) * 2 + 1
        master_hash = evidence_records[ev_master_idx]["sha256_hash"]
        master_phash = evidence_records[ev_master_idx]["phash"]
        for t in [1, 2]:
            ev_peer_idx = (400 + k * 3 + t) * 2 + 1
            evidence_records[ev_peer_idx]["sha256_hash"] = master_hash
            evidence_records[ev_peer_idx]["phash"] = master_phash

    df = pd.DataFrame(evidence_records)
    return df

# ----------------------------------------------------------------------
# 7. BUILD INVESTIGATIONS & INVESTIGATION NOTES DATASETS
# ----------------------------------------------------------------------
def build_investigations_and_notes(projects_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    investigations = []
    notes = []

    auditors = [
        ("auditor_verma", "AUDITOR", "R. Verma (Auditor)"),
        ("senior_auditor_patel", "SENIOR_AUDITOR", "P. Patel (Senior Audit Officer)"),
        ("lead_investigator_rao", "LEAD_INVESTIGATOR", "Dr. K. Rao (Lead Forensic Auditor)"),
        ("district_officer_sharma", "DISTRICT_OFFICER", "A. Sharma (District Monitoring Officer)"),
    ]

    hero_pids = [
        "MPLADS-DEMO-000001",  # Hero 01: Financial + Temporal
        "MPLADS-DEMO-000002",  # Hero 02: Spatial + NLP
        "MPLADS-DEMO-000004",  # Hero 03: Contractor + Split Tender
        "MPLADS-DEMO-000007",  # Hero 04: Evidence Reuse
        "MPLADS-DEMO-000010",  # Hero 05: Primary Cross-Domain
    ]

    selected_pids = list(hero_pids)
    # Remaining 115 cases
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(401, 426)])  # 25 Critical
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(71, 83)])    # 12 cost outliers
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(301, 313)])  # 12 split tenders
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(601, 617)])  # 16 photo reuse
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(51, 61)])    # 10 low utilization
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(111, 121)])  # 10 inception lag
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(151, 161)])  # 10 spatial overlap
    selected_pids.extend([f"MPLADS-DEMO-{i:06d}" for i in range(801, 821)])  # 20 routine
    selected_pids = selected_pids[:120]

    statuses = [
        "UNDER_REVIEW", "VERIFICATION_REQUIRED", "ESCALATED",
        "UNDER_REVIEW", "VERIFIED", "DISMISSED", "CLOSED", "NEW"
    ]

    note_counter = 1

    for c_idx, pid in enumerate(selected_pids):
        case_id = f"CASE-{pid}"
        proj_row = projects_df[projects_df["project_id"] == pid].iloc[0]

        auditor_user, auditor_role, auditor_name = auditors[c_idx % len(auditors)]

        # Custom configuration for the 5 Hero Cases
        if c_idx == 0:
            priority = "HIGH"
            category = "Financial & Lifecycle Discrepancy Review"
            status = "UNDER_REVIEW"
            case_title = "Audit Review: Low Fund Utilization in Community Hall Sanction"
            auditor_user = "auditor_verma"
            auditor_name = "R. Verma (Auditor)"
            auditor_role = "AUDITOR"
        elif c_idx == 1:
            priority = "HIGH"
            category = "Spatial Proximity & Scope Duplication Review"
            status = "VERIFICATION_REQUIRED"
            case_title = "Audit Review: Spatial Proximity & Work Description Cluster"
            auditor_user = "senior_auditor_patel"
            auditor_name = "P. Patel (Senior Audit Officer)"
            auditor_role = "SENIOR_AUDITOR"
        elif c_idx == 2:
            priority = "HIGH"
            category = "Procurement Fragmentation Review"
            status = "UNDER_REVIEW"
            case_title = "Audit Review: Sub-Threshold Procurement Fragmentation Pattern"
            auditor_user = "lead_investigator_rao"
            auditor_name = "Dr. K. Rao (Lead Forensic Auditor)"
            auditor_role = "LEAD_INVESTIGATOR"
        elif c_idx == 3:
            priority = "HIGH"
            category = "Photographic Evidence Integrity Review"
            status = "VERIFICATION_REQUIRED"
            case_title = "Audit Review: Identical Evidence File Detected Across Works"
            auditor_user = "auditor_verma"
            auditor_name = "R. Verma (Auditor)"
            auditor_role = "AUDITOR"
        elif c_idx == 4:
            priority = "CRITICAL"
            category = "Multi-Modal Cross-Domain Investigation"
            status = "ESCALATED"
            case_title = "Primary SIH Investigation: Cross-Domain Compound Risk"
            auditor_user = "lead_investigator_rao"
            auditor_name = "Dr. K. Rao (Lead Forensic Auditor)"
            auditor_role = "LEAD_INVESTIGATOR"
        elif c_idx < 30:
            priority = "CRITICAL"
            category = "Multi-Modal Compound Risk Review"
            status = random.choice(["ESCALATED", "VERIFICATION_REQUIRED", "UNDER_REVIEW"])
            case_title = f"Audit Review: {proj_row['title']}"
        elif c_idx < 70:
            priority = "HIGH"
            category = "High-Priority Anomaly Review"
            status = random.choice(["UNDER_REVIEW", "VERIFICATION_REQUIRED", "ESCALATED"])
            case_title = f"Audit Review: {proj_row['title']}"
        elif c_idx < 100:
            priority = "MEDIUM"
            category = "Operational Discrepancy Review"
            status = random.choice(["UNDER_REVIEW", "VERIFIED", "NEW"])
            case_title = f"Audit Review: {proj_row['title']}"
        else:
            priority = "LOW"
            category = "Routine Quality Audit Sample"
            status = random.choice(["CLOSED", "DISMISSED", "VERIFIED"])
            case_title = f"Audit Review: {proj_row['title']}"

        dt_created = datetime.datetime(2024, 4, 10, 10, 30) + datetime.timedelta(days=(c_idx % 60))
        dt_updated = dt_created + datetime.timedelta(days=random.randint(2, 18), hours=random.randint(1, 8))

        investigations.append({
            "case_id": case_id,
            "project_id": pid,
            "case_title": case_title,
            "assigned_to": auditor_user,
            "status": status,
            "priority": priority,
            "created_at": dt_created.isoformat(),
            "updated_at": dt_updated.isoformat(),
            "review_category": category,
        })

        # Generate 2 to 3 substantive notes per case (human-in-the-loop terminology)
        num_notes = 3 if priority in ["HIGH", "CRITICAL"] else 2
        for n_i in range(num_notes):
            nid = f"NOTE-DEMO-{note_counter:06d}"
            note_counter += 1

            n_time = dt_created + datetime.timedelta(days=n_i * 4 + 1, hours=random.randint(1, 5))

            if c_idx == 0:  # Hero 01
                if n_i == 0:
                    text = f"Desk review initiated for project {pid}. Sanctioned at ₹65.0 Lakhs; recorded expenditure is only ₹8.2 Lakhs (12.6% utilization ratio) after 500+ days."
                    action = "Financial utilization ledgers retrieved"
                elif n_i == 1:
                    text = "Comparative analysis against peer community halls in Rajkot shows average completion duration of 180 days with >85% fund utilization. Stalled status requires human verification."
                    action = "Benchmarked against district sector averages"
                else:
                    text = "Requested physical site verification report from Executive Engineer, PWD Rajkot Division, to confirm actual on-ground execution stage."
                    action = "Field verification notice issued"
            elif c_idx == 1:  # Hero 02
                if n_i == 0:
                    text = f"Spatial deduplication engine flagged potential cluster with peer project MPLADS-DEMO-000003 located ~21 meters away in Village-Kalyanpur."
                    action = "GIS coordinate overlay generated"
                elif n_i == 1:
                    text = "NLP textual similarity between DPR work descriptions is 96.4%. Both orders cite identical RCC framing, boundary wall construction, and sanitary fittings."
                    action = "Lexical similarity comparison recorded"
                else:
                    text = "Field verification notice issued to inspect whether two independent facilities exist or if single asset was billed against multiple sanction orders."
                    action = "Site inspection scheduled"
            elif c_idx == 2:  # Hero 03
                if n_i == 0:
                    text = f"Procurement analysis identified cluster of 3 road works (MPLADS-DEMO-000004, 000005, 000006) in Village-Sundarpur sanctioned within 72 hours."
                    action = "Procurement cluster indexed"
                elif n_i == 1:
                    text = "Each individual work is valued between ₹4.88L and ₹4.95L, directly below the ₹5.00 Lakhs statutory ceiling mandating open competitive e-tendering."
                    action = "Statutory procurement ceiling check executed"
                else:
                    text = "All 3 contracts awarded to Apex Infrastructure Ltd via quotation. Audit review initiated to verify justification for piecemeal procurement."
                    action = "Vendor tender documentation requisitioned"
            elif c_idx == 3:  # Hero 04
                if n_i == 0:
                    text = f"Asset Evidence Intelligence engine flagged exact cryptographic hash collision (SHA-256 match) between completion photo for {pid} and MPLADS-DEMO-000008."
                    action = "Cryptographic hash collision verified"
                elif n_i == 1:
                    text = "Projects are located 14 km apart (Village-Sundarpur vs Village-Navagam) under different executing divisions, yet submit identical photo files."
                    action = "Photographic EXIF comparison completed"
                else:
                    text = "Re-inspection ordered. Dispatched field verification officer to upload fresh timestamped geo-tagged photographs from both asset locations."
                    action = "Re-inspection notice dispatched"
            elif c_idx == 4:  # Hero 05
                if n_i == 0:
                    text = f"Multi-modal fusion engine flagged acute compound risk across financial (2.02x cost elevation), temporal (5-day completion velocity), and network domains."
                    action = "Cross-domain audit dossier compiled"
                elif n_i == 1:
                    text = "Evidence analysis reveals progress photo reuses hash from MPLADS-DEMO-000007, while completion photo EXIF GPS indicates coordinates 23.4 km from site."
                    action = "Evidence discrepancies cataloged"
                else:
                    text = "Case escalated to Lead Forensic Auditor and Senior District Magistrate. Joint multi-departmental physical inspection mandated."
                    action = "Escalated to State Audit Directorate"
            else:
                if n_i == 0:
                    text = (
                        f"Initiated comprehensive audit desk review for project {pid} in district {proj_row['district']}. "
                        f"Cross-referenced initial administrative sanction against public procurement schedules."
                    )
                    action = "Administrative records retrieved and indexed"
                elif n_i == 1:
                    if priority == "CRITICAL":
                        text = (
                            f"Detailed analysis identified compound indicators: work value is within statutory procurement threshold "
                            f"limits with photographic asset overlap. Field verification team instructed to obtain physical measurement sheet."
                        )
                        action = "Dispatched field verification notice to district executive engineer"
                    elif priority == "HIGH":
                        text = (
                            f"Review highlighted significant divergence from sectoral expenditure benchmarks or spatial proximity "
                            f"to adjacent registered works. Supporting contractor sub-vouchers requested."
                        )
                        action = "Requested itemized material procurement bills"
                    else:
                        text = (
                            f"Routine verification of asset commissioning milestones. Verified contractor registration details "
                            f"and milestone certificate uploaded to portal."
                        )
                        action = "Milestone documentation checked"
                else:
                    if status == "ESCALATED":
                        text = (
                            f"Due to unresolved evidence discrepancies between registered GPS coordinates and uploaded completion photo EXIF, "
                            f"case escalated for Senior District Magistrate review and multi-department joint physical verification."
                        )
                        action = "Escalated to State Audit Directorate"
                    elif status in ["VERIFIED", "CLOSED"]:
                        text = (
                            f"Satisfactory supplementary documentation received from District Rural Development Agency. "
                            f"Physical asset inspection verified on ground. Routine review concluded."
                        )
                        action = "Case closed with satisfactory clearance certificate"
                    else:
                        text = (
                            f"Under active evaluation. Awaiting response from regional PWD division regarding revised technical estimate."
                        )
                        action = "Follow-up reminder transmitted"

            notes.append({
                "note_id": nid,
                "case_id": case_id,
                "author": auditor_name,
                "author_role": auditor_role,
                "created_at": n_time.isoformat(),
                "note_text": text,
                "action_taken": action,
            })

    inv_df = pd.DataFrame(investigations)
    notes_df = pd.DataFrame(notes)
    return inv_df, notes_df

# ----------------------------------------------------------------------
# 8. MAIN GENERATOR & VALIDATION RUNNER
# ----------------------------------------------------------------------
def main():
    print("=" * 70)
    print("Generating Realistic Synthetic Demonstration Dataset for SIH 2026")
    print("MPLADS Audit Intelligence & Evidence Verification System")
    print("=" * 70)

    # 1. Contractors
    print("\n1. Generating 200 Synthetic Contractors...")
    contractors_df, contractors_map = build_contractors()

    # 2. Projects
    print("2. Generating 1,000 Projects with 12 Embedded Anomaly Scenarios...")
    projects_df = build_projects(contractors_df, contractors_map)

    # Update contractors_df with final project counts and amounts
    contractors_df["total_projects_count"] = contractors_df["contractor_id"].map(
        lambda cid: contractors_map[cid]["total_projects_count"]
    )
    contractors_df["total_sanctioned_amount"] = contractors_df["contractor_id"].map(
        lambda cid: round(contractors_map[cid]["total_sanctioned_amount"], 2)
    )

    # 3. Tenders
    print("3. Generating ~2,000 Procurement and Tender Records...")
    tenders_df = build_tenders(projects_df)

    # 4. Evidence
    print("4. Generating ~2,000 Physical Evidence Records with Geo-EXIF & Hashes...")
    evidence_df = build_evidence(projects_df)

    # 5. Investigations & Notes
    print("5. Generating 120 Investigation Cases and ~300 Audit Notes...")
    inv_df, notes_df = build_investigations_and_notes(projects_df)

    # ------------------------------------------------------------------
    # SAVE CSV FILES
    # ------------------------------------------------------------------
    p_csv = OUTPUT_DIR / "projects.csv"
    c_csv = OUTPUT_DIR / "contractors.csv"
    t_csv = OUTPUT_DIR / "tenders.csv"
    e_csv = OUTPUT_DIR / "evidence.csv"
    i_csv = OUTPUT_DIR / "investigations.csv"
    n_csv = OUTPUT_DIR / "investigation_notes.csv"

    projects_df.to_csv(p_csv, index=False)
    contractors_df.to_csv(c_csv, index=False)
    tenders_df.to_csv(t_csv, index=False)
    evidence_df.to_csv(e_csv, index=False)
    inv_df.to_csv(i_csv, index=False)
    notes_df.to_csv(n_csv, index=False)

    print("\n" + "=" * 70)
    print("CSV Deliverables Exported Successfully to data/demo_dataset/:")
    print(f"  - projects.csv:             {len(projects_df):>6} rows, {p_csv.stat().st_size / 1024:.1f} KB")
    print(f"  - contractors.csv:          {len(contractors_df):>6} rows, {c_csv.stat().st_size / 1024:.1f} KB")
    print(f"  - tenders.csv:              {len(tenders_df):>6} rows, {t_csv.stat().st_size / 1024:.1f} KB")
    print(f"  - evidence.csv:             {len(evidence_df):>6} rows, {e_csv.stat().st_size / 1024:.1f} KB")
    print(f"  - investigations.csv:       {len(inv_df):>6} rows, {i_csv.stat().st_size / 1024:.1f} KB")
    print(f"  - investigation_notes.csv:  {len(notes_df):>6} rows, {n_csv.stat().st_size / 1024:.1f} KB")
    print("=" * 70)

if __name__ == "__main__":
    main()
