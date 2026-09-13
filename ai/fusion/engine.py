from typing import Dict, Any, Optional

class MultiModalFusionEngine:
    """
    Fuses multi-modal anomaly signals across all 7 analytical domains:
    1. Financial (Cost Outliers & Utilization)
    2. Network (Contractor Syndicate Concentration)
    3. Spatial (Geographic Clustering & Proximity)
    4. Split-Tender (Threshold Circumvention & Artificial Splitting)
    5. Evidence (Photo Reuse, GPS Discrepancy, Timeline Alignment)
    6. Text / NLP (Description Duplication & Phrasing Redundancy)
    7. Temporal (Velocity Anomalies & Execution Delays)

    Dynamically re-weights if any specific engine reports UNAVAILABLE or INSUFFICIENT_DATA.
    """

    DEFAULT_WEIGHTS = {
        "financial": 0.20,
        "network": 0.20,
        "spatial": 0.15,
        "split_tender": 0.15,
        "evidence": 0.15,
        "text": 0.10,
        "temporal": 0.05,
    }

    def fuse(
        self,
        pid: str,
        fin_res: Dict[str, Any],
        temp_res: Dict[str, Any],
        text_res: Dict[str, Any],
        spatial_res: Dict[str, Any],
        network_res: Dict[str, Any],
        split_res: Optional[Dict[str, Any]] = None,
        evidence_res: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        active_weights = {}
        scores = {}
        domains_available = {}
        domain_signals = {}

        # 1. Financial
        fin_status = fin_res.get("status")
        if fin_status != "UNAVAILABLE" and fin_res.get("score") is not None:
            scores["financial"] = float(fin_res.get("score", 0.0))
            active_weights["financial"] = self.DEFAULT_WEIGHTS["financial"]
            domains_available["financial"] = True
            domain_signals["financial"] = {
                "available": True,
                "score": scores["financial"],
                "signal": fin_res.get("signal", "NORMAL"),
                "signals": [fin_res.get("signal", "NORMAL")] if fin_res.get("signal") else ["NORMAL"],
                "reason": fin_res.get("explanation", "Financial analysis completed."),
                "contribution": 0.0,
                "details": fin_res.get("evidence", {}),
            }
        else:
            domains_available["financial"] = False
            domain_signals["financial"] = {
                "available": False,
                "score": None,
                "signal": "UNAVAILABLE",
                "signals": [],
                "reason": "Financial expenditure data unavailable for analysis.",
                "contribution": 0.0,
                "details": {},
            }

        # 2. Network (Contractor Syndicate Concentration)
        net_status = network_res.get("status")
        net_sig = network_res.get("signal")
        if net_status != "UNAVAILABLE" and net_sig not in ["UNAVAILABLE", "NO_DATA"] and network_res.get("score") is not None:
            scores["network"] = float(network_res.get("score", 0.0))
            active_weights["network"] = self.DEFAULT_WEIGHTS["network"]
            domains_available["network"] = True
            domain_signals["network"] = {
                "available": True,
                "score": scores["network"],
                "signal": net_sig or "NORMAL",
                "signals": [net_sig] if net_sig else ["NORMAL"],
                "reason": network_res.get("explanation", "Network relationship analysis completed."),
                "contribution": 0.0,
                "details": network_res.get("evidence", {}),
            }
        else:
            domains_available["network"] = False
            domain_signals["network"] = {
                "available": False,
                "score": None,
                "signal": "UNAVAILABLE",
                "signals": [],
                "reason": "Contractor entity relationship data unavailable for network analysis.",
                "contribution": 0.0,
                "details": {},
            }

        # 3. Spatial (Geographic Clustering & Proximity)
        spat_status = spatial_res.get("status")
        spat_sig = spatial_res.get("signal")
        if spat_status != "UNAVAILABLE" and spat_sig != "NO_GEO_COORDINATES" and spatial_res.get("score") is not None:
            scores["spatial"] = float(spatial_res.get("score", 0.0))
            active_weights["spatial"] = self.DEFAULT_WEIGHTS["spatial"]
            domains_available["spatial"] = True
            domain_signals["spatial"] = {
                "available": True,
                "score": scores["spatial"],
                "signal": spat_sig or "NORMAL",
                "signals": [spat_sig] if spat_sig else ["NORMAL"],
                "reason": spatial_res.get("explanation", "Spatial proximity analysis completed."),
                "contribution": 0.0,
                "details": spatial_res.get("evidence", {}),
            }
        else:
            domains_available["spatial"] = False
            domain_signals["spatial"] = {
                "available": False,
                "score": None,
                "signal": "UNAVAILABLE",
                "signals": [],
                "reason": "Geographic coordinates unavailable for spatial proximity analysis.",
                "contribution": 0.0,
                "details": {},
            }

        # 4. Split-Tender (Artificial Threshold Evasion)
        split = split_res or {}
        split_status = split.get("status")
        split_sig = split.get("signal")
        if split_status != "UNAVAILABLE" and split_sig != "UNAVAILABLE" and split.get("score") is not None:
            scores["split_tender"] = float(split.get("score", 0.0))
            active_weights["split_tender"] = self.DEFAULT_WEIGHTS["split_tender"]
            domains_available["split_tender"] = True
            domain_signals["split_tender"] = {
                "available": True,
                "score": scores["split_tender"],
                "signal": split_sig or "NORMAL",
                "signals": [split_sig] if split_sig else ["NORMAL"],
                "reason": split.get("explanation", "Split-tender analysis completed."),
                "contribution": 0.0,
                "details": {
                    "is_split_candidate": split.get("is_split_candidate", False),
                    "split_cluster_size": split.get("split_cluster_size", 0),
                    "related_project_ids": split.get("related_project_ids", []),
                },
            }
        else:
            domains_available["split_tender"] = False
            domain_signals["split_tender"] = {
                "available": False,
                "score": None,
                "signal": "UNAVAILABLE",
                "signals": [],
                "reason": "Procurement and expenditure data unavailable for split-tender analysis.",
                "contribution": 0.0,
                "details": {},
            }

        # 5. Asset Evidence Intelligence (Photo Reuse, EXIF GPS Inconsistency)
        ev = evidence_res or {}
        ev_status = ev.get("status")
        ev_available = ev.get("available", ev_status not in ["UNAVAILABLE", "NO_EVIDENCE"] and bool(ev))
        if ev_available and ev_status not in ["UNAVAILABLE", "NO_EVIDENCE"]:
            scores["evidence"] = float(ev.get("score", 0.0))
            active_weights["evidence"] = self.DEFAULT_WEIGHTS["evidence"]
            domains_available["evidence"] = True
            raw_signals = ev.get("signals", [])
            primary_sig = ev.get("signal") or (raw_signals[0] if raw_signals else "EVIDENCE_VERIFIED")
            domain_signals["evidence"] = {
                "available": True,
                "score": scores["evidence"],
                "signal": primary_sig,
                "signals": raw_signals if raw_signals else [primary_sig],
                "reason": ev.get("explanation", "Asset evidence intelligence completed."),
                "contribution": 0.0,
                "details": {
                    "evidence_count": ev.get("evidence_count", len(raw_signals)),
                    "irregularity_count": len([s for s in raw_signals if s not in ["INSUFFICIENT_EVIDENCE", "COMPLIANT"]]),
                },
            }
        else:
            domains_available["evidence"] = False
            domain_signals["evidence"] = {
                "available": False,
                "score": None,
                "signal": "UNAVAILABLE",
                "signals": [],
                "reason": "Physical asset evidence photographs unavailable.",
                "contribution": 0.0,
                "details": {},
            }

        # 6. Text / NLP (Description Duplication)
        text_status = text_res.get("status")
        if text_status != "UNAVAILABLE" and text_res.get("score") is not None:
            scores["text"] = float(text_res.get("score", 0.0))
            active_weights["text"] = self.DEFAULT_WEIGHTS["text"]
            domains_available["text"] = True
            domain_signals["text"] = {
                "available": True,
                "score": scores["text"],
                "signal": text_res.get("signal", "NORMAL"),
                "signals": [text_res.get("signal", "NORMAL")] if text_res.get("signal") else ["NORMAL"],
                "reason": text_res.get("explanation", "Text lexical analysis completed."),
                "contribution": 0.0,
                "details": text_res.get("evidence", {}),
            }
        else:
            domains_available["text"] = False
            domain_signals["text"] = {
                "available": False,
                "score": None,
                "signal": "UNAVAILABLE",
                "signals": [],
                "reason": "Project description text unavailable for NLP analysis.",
                "contribution": 0.0,
                "details": {},
            }

        # 7. Temporal (Velocity & Execution Delays)
        temp_status = temp_res.get("status")
        if temp_status not in ["INSUFFICIENT_DATA", "UNAVAILABLE"] and temp_res.get("score") is not None:
            scores["temporal"] = float(temp_res.get("score", 0.0))
            active_weights["temporal"] = self.DEFAULT_WEIGHTS["temporal"]
            domains_available["temporal"] = True
            domain_signals["temporal"] = {
                "available": True,
                "score": scores["temporal"],
                "signal": temp_res.get("signal", "NORMAL"),
                "signals": [temp_res.get("signal", "NORMAL")] if temp_res.get("signal") else ["NORMAL"],
                "reason": temp_res.get("explanation", "Timeline execution analysis completed."),
                "contribution": 0.0,
                "details": temp_res.get("evidence", {}),
            }
        else:
            domains_available["temporal"] = False
            domain_signals["temporal"] = {
                "available": False,
                "score": None,
                "signal": "UNAVAILABLE",
                "signals": [],
                "reason": "Project timeline dates unavailable for velocity analysis.",
                "contribution": 0.0,
                "details": {},
            }

        # Normalize active weights so sum = 1.0
        total_weight = sum(active_weights.values())
        if total_weight == 0:
            contributions = {k: 0.0 for k in self.DEFAULT_WEIGHTS}
            return {
                "composite_index": 0.0,
                "contributions": contributions,
                "active_weights": {},
                "domain_scores": {},
                "domain_signals": domain_signals,
                "domains_available": domains_available,
            }

        normalized_weights = {k: v / total_weight for k, v in active_weights.items()}

        weighted_sum = sum(scores[k] * normalized_weights[k] for k in scores)
        max_single = max(scores.values()) if scores else 0.0

        # Compounding multi-modal fusion:
        # High/Critical (>= 70) requires either:
        # - An acute severe single-engine violation (max_single >= 0.90, e.g. exact geo duplication or photo reuse)
        # - Or acute corroboration across multiple engines (max_single >= 0.75 and weighted_sum >= 0.30)
        if max_single >= 0.90:
            composite = min(0.75 + weighted_sum * 0.25, 0.95)
        elif max_single >= 0.75 and weighted_sum >= 0.30:
            composite = min(0.70 + weighted_sum * 0.30, 0.90)
        elif max_single >= 0.50 or weighted_sum >= 0.26:
            composite = min(max(weighted_sum * 1.05, 0.35), 0.58)
        else:
            # Baseline compliant projects stay cleanly in LOW (Green)
            composite = min(weighted_sum * 0.65, 0.28)

        # Contribution amounts scaled to final score (0-100)
        raw_final = composite * 100.0
        contributions = {}
        for k in self.DEFAULT_WEIGHTS:
            if k in scores and (weighted_sum + 1e-6) > 0:
                raw_c = (scores[k] * normalized_weights[k] / (weighted_sum + 1e-6)) * raw_final
                contrib_val = round(raw_c, 1)
                contributions[k] = contrib_val
                if k in domain_signals:
                    domain_signals[k]["contribution"] = contrib_val
            else:
                contributions[k] = 0.0
                if k in domain_signals:
                    domain_signals[k]["contribution"] = 0.0

        return {
            "composite_index": round(composite, 4),
            "contributions": contributions,
            "active_weights": {k: round(v, 4) for k, v in normalized_weights.items()},
            "domain_scores": {k: round(v, 4) for k, v in scores.items()},
            "domain_signals": domain_signals,
            "domains_available": domains_available,
        }
