from typing import Dict, Any, List, Optional


class CrossDomainEvidenceCorrelator:
    """
    Connects evidence intelligence signals with signals from the other 5 analytical domains:
    - Financial anomaly
    - Text/NLP similarity
    - Spatial proximity
    - Contractor network monopoly
    - Temporal execution velocity
    Computes compounding cross-domain audit priority boost and evidence attribution trails.
    """

    def correlate(
        self,
        base_audit_score: float,
        financial_signal: Dict[str, Any],
        nlp_signal: Dict[str, Any],
        spatial_signal: Dict[str, Any],
        network_signal: Dict[str, Any],
        temporal_signal: Dict[str, Any],
        evidence_matches: List[Dict[str, Any]],
        spatial_inconsistency: Optional[Dict[str, Any]] = None,
        temporal_inconsistency: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        contributing_factors = []
        compound_boost = 0.0

        # Check Evidence Reuse
        max_ev_sim = max([m.get("similarity_score", 0.0) for m in evidence_matches], default=0.0)
        has_same_contractor_reuse = any(m.get("is_same_contractor", False) and m.get("similarity_score", 0.0) >= 0.88 for m in evidence_matches)

        if max_ev_sim >= 0.95:
            compound_boost += 25.0
            contributing_factors.append({
                "domain": "Evidence",
                "signal": "HIGH_EVIDENCE_SIMILARITY",
                "impact": "+25 pts",
                "finding": f"Photographs exhibit {max_ev_sim*100:.1f}% visual match with peer project records.",
            })
        elif max_ev_sim >= 0.85:
            compound_boost += 15.0
            contributing_factors.append({
                "domain": "Evidence",
                "signal": "MODERATE_EVIDENCE_SIMILARITY",
                "impact": "+15 pts",
                "finding": f"Photographs exhibit {max_ev_sim*100:.1f}% visual similarity with peer project records.",
            })

        # Check Location Inconsistency
        if spatial_inconsistency and spatial_inconsistency.get("is_inconsistent"):
            compound_boost += 20.0
            dist_m = spatial_inconsistency.get("distance_meters", 0)
            contributing_factors.append({
                "domain": "Evidence Spatial",
                "signal": "LOCATION_INCONSISTENCY",
                "impact": "+20 pts",
                "finding": f"Photo GPS metadata is located {dist_m:.0f}m away from the project site.",
            })

        # Check Temporal Inconsistency
        if temporal_inconsistency and temporal_inconsistency.get("is_inconsistent"):
            compound_boost += 15.0
            contributing_factors.append({
                "domain": "Evidence Temporal",
                "signal": "TIMELINE_INCONSISTENCY",
                "impact": "+15 pts",
                "finding": temporal_inconsistency.get("explanation", "Photo capture date inconsistent with project timeline."),
            })

        # Cross-Domain Compounding Synergies:
        # Synergy 1: Same Contractor + Evidence Reuse
        if has_same_contractor_reuse:
            compound_boost += 15.0
            contributing_factors.append({
                "domain": "Synergy (Network + Evidence)",
                "signal": "SAME_CONTRACTOR_EVIDENCE_REUSE",
                "impact": "+15 pts",
                "finding": "Identical/similar photographs submitted across multiple projects awarded to the SAME contractor.",
            })

        # Synergy 2: Text Description Similarity + Evidence Reuse
        nlp_score = nlp_signal.get("score", 0.0)
        if nlp_score >= 0.80 and max_ev_sim >= 0.85:
            compound_boost += 15.0
            contributing_factors.append({
                "domain": "Synergy (NLP + Evidence)",
                "signal": "DESCRIPTION_AND_PHOTO_DUPLICATION",
                "impact": "+15 pts",
                "finding": "Compounding overlap: Both work description and visual photographs match peer projects.",
            })

        # Synergy 3: Spatial Proximity + Evidence Reuse
        spat_score = spatial_signal.get("score", 0.0)
        if spat_score >= 0.80 and max_ev_sim >= 0.85:
            compound_boost += 15.0
            contributing_factors.append({
                "domain": "Synergy (Spatial + Evidence)",
                "signal": "PHYSICAL_PROXIMITY_AND_PHOTO_MATCH",
                "impact": "+15 pts",
                "finding": "Projects are in close geographic proximity with matching visual evidence.",
            })

        # Calculate final unified score with evidence compounding
        final_score = min(max(base_audit_score + compound_boost, 0.0), 100.0)
        final_score_round = round(final_score, 1)

        # Priority Level
        if final_score_round >= 80.0:
            priority = "CRITICAL"
        elif final_score_round >= 60.0:
            priority = "HIGH"
        elif final_score_round >= 30.0:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        return {
            "base_audit_score": base_audit_score,
            "compound_boost": round(compound_boost, 1),
            "final_audit_score": final_score_round,
            "priority_level": priority,
            "contributing_factors": contributing_factors,
            "has_cross_domain_synergy": len(contributing_factors) >= 2,
        }
