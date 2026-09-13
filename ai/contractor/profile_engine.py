import re
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.database.models import (
    Entity,
    ContractorProfile,
    Project,
    ProjectEntity,
    ProjectFinancial,
    ProjectTimeline,
    RiskScore,
)
from backend.app.utils.logger import logger


def normalize_contractor_name(name: str) -> str:
    """
    Standardizes contractor business names for entity resolution:
    - Uppercase, stripped
    - Removes common punctuation (dots, commas, hyphens)
    - Normalizes corporate suffixes (PVT LTD, PRIVATE LIMITED, CONSTRUCTIONS, INFRA, CO)
    """
    if not name or not isinstance(name, str):
        return ""
    cleaned = name.upper().strip()
    # Normalize punctuation
    cleaned = re.sub(r"[^\w\s]", " ", cleaned)
    # Normalize suffixes
    cleaned = re.sub(r"\bPRIVATE\s+LIMITED\b", "PVT LTD", cleaned)
    cleaned = re.sub(r"\bPVT\s+LTD\b", "LTD", cleaned)
    cleaned = re.sub(r"\bLIMITED\b", "LTD", cleaned)
    cleaned = re.sub(r"\bCONSTRUCTION\b", "CONST", cleaned)
    cleaned = re.sub(r"\bCONSTRUCTIONS\b", "CONST", cleaned)
    cleaned = re.sub(r"\bINFRASTRUCTURE\b", "INFRA", cleaned)
    cleaned = re.sub(r"\bCOMPANY\b", "CO", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


class ContractorIntelligenceEngine:
    """
    Builds and evaluates longitudinal contractor intelligence profiles:
    1. Entity resolution & alias mapping
    2. Portfolio statistics (projects, sanctioned values, timeline duration)
    3. Sector specialization distribution (% of projects & % of value by sector)
    4. Historical baselines (median value, MAD, median duration, sector-specific baselines)
    5. Sector deviation signal generation with configurable minimum sample size
    """

    def __init__(self, min_projects_for_baseline: int = 3, sector_deviation_threshold: float = 0.15):
        self.min_projects_for_baseline = min_projects_for_baseline
        self.sector_deviation_threshold = sector_deviation_threshold

    def build_profile(self, entity_id: str, db: Session) -> Optional[ContractorProfile]:
        """
        Derives or updates the longitudinal profile for a specific contractor entity.
        """
        entity = db.query(Entity).filter(Entity.entity_id == entity_id).first()
        if not entity:
            return None

        # Fetch all projects associated with this contractor
        project_entities = (
            db.query(ProjectEntity, Project, ProjectFinancial, ProjectTimeline, RiskScore)
            .join(Project, ProjectEntity.project_id == Project.project_id)
            .outerjoin(ProjectFinancial, Project.project_id == ProjectFinancial.project_id)
            .outerjoin(ProjectTimeline, Project.project_id == ProjectTimeline.project_id)
            .outerjoin(RiskScore, Project.project_id == RiskScore.project_id)
            .filter(ProjectEntity.entity_id == entity_id)
            .all()
        )

        total_projects = len(project_entities)
        if total_projects == 0:
            return None

        sanctioned_amounts = []
        durations = []
        sector_counts = {}
        sector_values = {}
        years_dict = {}
        status_dict = {}
        district_dict = {}
        high_priority_flags = 0

        for pe, proj, fin, time, risk in project_entities:
            sanc = float(fin.sanctioned_amount) if fin and fin.sanctioned_amount else 0.0
            sanctioned_amounts.append(sanc)

            # Sector distribution
            sec = str(proj.sector or "General").strip()
            sector_counts[sec] = sector_counts.get(sec, 0) + 1
            sector_values[sec] = sector_values.get(sec, 0.0) + sanc

            # District distribution
            dist = str(proj.district or "Unknown").strip()
            district_dict[dist] = district_dict.get(dist, 0) + 1

            # Status distribution
            st = str(proj.status or "Sanctioned").strip()
            status_dict[st] = status_dict.get(st, 0) + 1

            # Timeline
            if time and time.duration_days and time.duration_days > 0:
                durations.append(time.duration_days)

            # Year
            if time and time.sanction_date:
                yr = str(time.sanction_date.year)
                years_dict[yr] = years_dict.get(yr, 0) + 1
            elif proj.created_at:
                yr = str(proj.created_at.year)
                years_dict[yr] = years_dict.get(yr, 0) + 1

            # Audit history
            if risk and risk.priority_level and hasattr(risk.priority_level, "value"):
                if risk.priority_level.value in ["HIGH", "CRITICAL"]:
                    high_priority_flags += 1

        total_val = sum(sanctioned_amounts)
        norm_name = normalize_contractor_name(entity.name)

        # Sector percentage distribution
        sector_distribution = {
            s: round(count / total_projects, 4) for s, count in sector_counts.items()
        }
        sector_val_distribution = {
            s: round(val / (total_val + 1e-6), 4) for s, val in sector_values.items()
        }
        primary_sector = max(sector_counts.items(), key=lambda x: x[1])[0] if sector_counts else "General"

        # Robust statistics (Median & MAD for project values)
        arr_val = np.array(sanctioned_amounts)
        median_val = float(np.median(arr_val)) if len(arr_val) > 0 else 0.0
        val_mad = float(np.median(np.abs(arr_val - median_val))) if len(arr_val) > 0 else 0.0

        # Sector-specific value baselines
        sector_value_baselines = {}
        for s in sector_counts.keys():
            s_vals = [
                float(f.sanctioned_amount)
                for pe, pr, f, t, r in project_entities
                if pr.sector == s and f and f.sanctioned_amount
            ]
            if s_vals:
                s_arr = np.array(s_vals)
                s_med = float(np.median(s_arr))
                s_mad = float(np.median(np.abs(s_arr - s_med)))
                sector_value_baselines[s] = {"median": round(s_med, 2), "mad": round(s_mad, 2)}

        # Duration baselines
        arr_dur = np.array(durations) if durations else np.array([0.0])
        avg_dur = float(np.mean(arr_dur)) if len(durations) > 0 else 0.0
        med_dur = float(np.median(arr_dur)) if len(durations) > 0 else 0.0

        # Upsert ContractorProfile
        profile = db.query(ContractorProfile).filter(ContractorProfile.entity_id == entity_id).first()
        if not profile:
            profile = ContractorProfile(
                entity_id=entity_id,
                normalized_name=norm_name,
                aliases=[entity.name] if entity.name != norm_name else [],
                state=entity.primary_district,
                primary_district=entity.primary_district,
            )
            db.add(profile)

        profile.normalized_name = norm_name
        profile.total_projects = total_projects
        profile.total_sanctioned_amount = round(total_val, 2)
        profile.projects_by_year = years_dict
        profile.projects_by_status = status_dict
        profile.projects_by_district = district_dict
        profile.primary_sector = primary_sector
        profile.sector_distribution = sector_distribution
        profile.sector_value_distribution = sector_val_distribution
        profile.avg_project_value = round(float(np.mean(arr_val)), 2)
        profile.median_project_value = round(median_val, 2)
        profile.value_mad = round(val_mad, 2)
        profile.sector_value_baselines = sector_value_baselines
        profile.avg_duration_days = round(avg_dur, 1)
        profile.median_duration_days = round(med_dur, 1)
        profile.historical_high_priority_count = high_priority_flags
        profile.last_updated = datetime.utcnow()

        db.flush()
        return profile

    def evaluate_sector_specialization(
        self, profile: Optional[ContractorProfile], project_sector: str
    ) -> Dict[str, Any]:
        """
        Evaluates whether a new or existing project's sector represents a departure
        from the contractor's established historical specialization.
        
        Neutral, auditor-first approach:
        - Requires minimum historical volume (e.g. >= 3 historical projects).
        - Generates contextual information, NOT an accusation of wrongdoing.
        """
        if not profile or profile.total_projects < self.min_projects_for_baseline:
            return {
                "signal": "BASELINE_INSUFFICIENT",
                "score": 0.0,
                "has_baseline": False,
                "reason": (
                    f"Contractor has limited historical portfolio ({profile.total_projects if profile else 0} "
                    f"projects; min required: {self.min_projects_for_baseline}). Sector specialization baseline not established."
                ),
                "sector_share": None,
                "primary_sector": profile.primary_sector if profile else None,
            }

        sec_dist = profile.sector_distribution or {}
        norm_sector = str(project_sector).strip()
        sec_share = float(sec_dist.get(norm_sector, 0.0))

        if sec_share >= 0.30:
            return {
                "signal": "ESTABLISHED_SECTOR",
                "score": 0.0,
                "has_baseline": True,
                "sector_share": round(sec_share, 4),
                "primary_sector": profile.primary_sector,
                "reason": (
                    f"Contractor has established historical capability in {norm_sector} "
                    f"({sec_share*100:.1f}% of historical projects)."
                ),
            }
        elif sec_share >= self.sector_deviation_threshold:
            return {
                "signal": "SECONDARY_SECTOR",
                "score": 0.15,
                "has_baseline": True,
                "sector_share": round(sec_share, 4),
                "primary_sector": profile.primary_sector,
                "reason": (
                    f"Current project sector ({norm_sector}) represents {sec_share*100:.1f}% "
                    f"of contractor's historical portfolio (Primary sector: {profile.primary_sector})."
                ),
            }
        else:
            # Low historical presence in this sector (<15%)
            score = 0.45 if sec_share == 0.0 else 0.30
            return {
                "signal": "SECTOR_DEVIATION",
                "score": score,
                "has_baseline": True,
                "sector_share": round(sec_share, 4),
                "primary_sector": profile.primary_sector,
                "reason": (
                    f"Current project sector ({norm_sector}) represents only {sec_share*100:.1f}% "
                    f"of contractor's historical portfolio of {profile.total_projects} projects. "
                    f"Primary specialization is {profile.primary_sector} ({(sec_dist.get(profile.primary_sector, 0.0))*100:.1f}%). "
                    f"Deserves contextual review."
                ),
            }
