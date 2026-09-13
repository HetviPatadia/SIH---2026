from typing import List, Dict, Any

class ExplainableAIEngine:
    """
    Deconstructs individual feature contributions (SHAP-style attribution)
    showing why a project received its specific Anomaly Priority Score.
    """

    def compute_contributions(
        self,
        project_data: Dict[str, Any],
        engine_scores: Dict[str, Dict[str, Any]],
        contributions: Dict[str, float],
    ) -> List[Dict[str, Any]]:
        features_breakdown = []

        # 1. Cost Deviation Feature
        fin = engine_scores.get("financial", {})
        fin_ev = fin.get("evidence", {})
        cost = fin_ev.get("sanctioned_amount", 0.0)
        peer_ratio = fin_ev.get("cost_to_peer_ratio", 1.0)
        fin_pts = contributions.get("financial", 0.0)
        features_breakdown.append({
            "domain": "financial",
            "feature": "Sanctioned Cost vs Sector Peer Median",
            "value": f"₹{cost:,.0f} ({peer_ratio}x median)",
            "contribution": fin_pts,
            "direction": "INCREASES_PRIORITY" if fin_pts > 5 else "NEUTRAL",
            "importance": round(fin_pts / 100.0, 3),
        })

        # 2. Spatial Proximity Feature
        spatial = engine_scores.get("spatial", {})
        spat_ev = spatial.get("evidence", {})
        min_dist = spat_ev.get("nearest_neighbor_distance_km")
        spat_pts = contributions.get("spatial", 0.0)
        features_breakdown.append({
            "domain": "spatial",
            "feature": "Distance to Nearest Sibling Project",
            "value": f"{min_dist*1000:.0f} meters" if min_dist is not None else "N/A",
            "contribution": spat_pts,
            "direction": "INCREASES_PRIORITY" if spat_pts > 5 else "NEUTRAL",
            "importance": round(spat_pts / 100.0, 3),
        })

        # 3. Text Repetition Feature
        text = engine_scores.get("text", {})
        text_ev = text.get("evidence", {})
        max_sim = text_ev.get("max_similarity", 0.0)
        text_pts = contributions.get("text", 0.0)
        features_breakdown.append({
            "domain": "text",
            "feature": "Project Description Lexical Similarity",
            "value": f"{max_sim*100:.1f}% max similarity",
            "contribution": text_pts,
            "direction": "INCREASES_PRIORITY" if text_pts > 5 else "NEUTRAL",
            "importance": round(text_pts / 100.0, 3),
        })

        # 4. Contractor Project Load Feature
        net = engine_scores.get("network", {})
        net_ev = net.get("evidence", {})
        c_proj = net_ev.get("contractor_total_projects", 0)
        net_pts = contributions.get("network", 0.0)
        features_breakdown.append({
            "domain": "network",
            "feature": "Contractor Multi-District Portfolio Share",
            "value": f"{c_proj} projects in district network",
            "contribution": net_pts,
            "direction": "INCREASES_PRIORITY" if net_pts > 5 else "NEUTRAL",
            "importance": round(net_pts / 100.0, 3),
        })

        # 5. Execution Velocity Feature
        temp = engine_scores.get("temporal", {})
        temp_ev = temp.get("evidence", {})
        dur = temp_ev.get("duration_days")
        temp_pts = contributions.get("temporal", 0.0)
        features_breakdown.append({
            "domain": "temporal",
            "feature": "Execution Velocity / Timeline Window",
            "value": f"{dur} days total duration" if dur is not None else "N/A",
            "contribution": temp_pts,
            "direction": "INCREASES_PRIORITY" if temp_pts > 5 else "NEUTRAL",
            "importance": round(temp_pts / 100.0, 3),
        })

        # 6. Split-Tender Threshold Indicator Feature
        split = engine_scores.get("split_tender", {})
        split_pts = contributions.get("split_tender", 0.0)
        is_split = split.get("is_split_candidate", False) or (split.get("signal") == "POTENTIAL_SPLIT_TENDER")
        cluster_size = split.get("split_cluster_size", 0)
        features_breakdown.append({
            "domain": "split_tender",
            "feature": "Statutory Tender Splitting Indicator",
            "value": f"Near statutory procurement ceiling ({cluster_size} related works)" if is_split else "Standard contract sizing",
            "contribution": split_pts,
            "direction": "INCREASES_PRIORITY" if split_pts > 5 else "NEUTRAL",
            "importance": round(split_pts / 100.0, 3),
        })

        # 7. Physical Evidence Intelligence Feature
        ev = engine_scores.get("evidence", {})
        ev_pts = contributions.get("evidence", 0.0)
        ev_sigs = ev.get("signals", [])
        irreg_sigs = [s for s in ev_sigs if s not in ["INSUFFICIENT_EVIDENCE", "COMPLIANT"]]
        features_breakdown.append({
            "domain": "evidence",
            "feature": "Asset Evidence & Photo Verification",
            "value": f"{len(irreg_sigs)} evidence irregularity signals ({', '.join(irreg_sigs[:2])})" if irreg_sigs else "No evidence irregularities detected",
            "contribution": ev_pts,
            "direction": "INCREASES_PRIORITY" if ev_pts > 5 else "NEUTRAL",
            "importance": round(ev_pts / 100.0, 3),
        })

        return features_breakdown
