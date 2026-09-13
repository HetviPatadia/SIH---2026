from typing import List, Dict, Any

class AuditEvidenceEngine:
    """
    Assembles verifiable, audit-grade evidence packages for flagged cases,
    linking anomaly claims directly to raw data values and statistical peers.
    """

    def compile_evidence(
        self,
        pid: str,
        engine_scores: Dict[str, Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        evidence_items = []

        # 1. Financial Evidence
        fin = engine_scores.get("financial", {})
        if fin.get("score", 0.0) >= 0.50:
            ev = fin.get("evidence", {})
            evidence_items.append({
                "signal": "FINANCIAL_DEVIATION",
                "finding": fin.get("explanation", ""),
                "evidence_data": {
                    "sanctioned_amount": f"₹{ev.get('sanctioned_amount', 0):,.2f}",
                    "peer_category_median": f"₹{ev.get('sector_median_cost', 0):,.2f}",
                    "peer_cost_ratio": f"{ev.get('cost_to_peer_ratio', 1.0)}x",
                    "z_score": ev.get("sector_z_score"),
                },
            })

        # 2. Spatial Duplication Evidence
        spatial = engine_scores.get("spatial", {})
        if spatial.get("score", 0.0) >= 0.50:
            ev = spatial.get("evidence", {})
            evidence_items.append({
                "signal": "PHYSICAL_PROXIMITY_OVERLAP",
                "finding": spatial.get("explanation", ""),
                "evidence_data": {
                    "nearby_works": ev.get("nearby_works_within_150m", []),
                },
            })

        # 3. NLP Text Duplication Evidence
        text = engine_scores.get("text", {})
        if text.get("score", 0.0) >= 0.50:
            ev = text.get("evidence", {})
            evidence_items.append({
                "signal": "DESCRIPTION_REDUNDANCY",
                "finding": text.get("explanation", ""),
                "evidence_data": {
                    "matched_similar_projects": ev.get("matched_ids", []),
                    "maximum_lexical_similarity": f"{ev.get('max_similarity', 0)*100:.1f}%",
                },
            })

        # 4. Contractor Syndicate Evidence
        net = engine_scores.get("network", {})
        if net.get("score", 0.0) >= 0.50:
            ev = net.get("evidence", {})
            evidence_items.append({
                "signal": "CONTRACTOR_CONCENTRATION",
                "finding": net.get("explanation", ""),
                "evidence_data": {
                    "contractor_name": ev.get("contractor_name"),
                    "total_awarded_projects": ev.get("contractor_total_projects"),
                    "district_coverage_count": ev.get("contractor_district_reach"),
                },
            })

        # 5. Split-Tender Pattern Evidence
        split = engine_scores.get("split_tender", {})
        if split.get("score", 0.0) >= 0.50:
            evidence_items.append({
                "signal": "SPLIT_TENDER_INDICATOR",
                "finding": split.get("explanation", "Work value near statutory procurement ceiling with similar peer projects."),
                "evidence_data": {
                    "cluster_size": split.get("split_cluster_size", 0),
                    "split_candidate": split.get("is_split_candidate", False),
                    "related_projects": split.get("related_project_ids", []),
                },
            })

        # 6. Physical Evidence Intelligence
        evid = engine_scores.get("evidence", {})
        if evid.get("score", 0.0) >= 0.50:
            evidence_items.append({
                "signal": "ASSET_EVIDENCE_ANOMALY",
                "finding": f"Physical evidence anomaly flagged: {', '.join(evid.get('signals', []))}",
                "evidence_data": {
                    "signals": evid.get("signals", []),
                    "evidence_score": evid.get("score", 0.0),
                },
            })

        # 7. Temporal Execution Velocity / Lag Evidence
        temp = engine_scores.get("temporal", {})
        if temp.get("score", 0.0) >= 0.50:
            ev_temp = temp.get("evidence", {})
            evidence_items.append({
                "signal": "TEMPORAL_ANOMALY",
                "finding": temp.get("explanation", "Timeline execution rate or delay deviation."),
                "evidence_data": {
                    "duration_days": ev_temp.get("duration_days"),
                    "lag_days": ev_temp.get("sanction_to_start_days"),
                },
            })

        return evidence_items
