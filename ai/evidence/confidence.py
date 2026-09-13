from typing import Dict, Any, List, Optional


class EvidenceConfidenceEngine:
    """
    Computes an independent Evidence Confidence Score (0-100).
    Quantifies the reliability and completeness of project evidence data,
    strictly separated from the Anomaly/Audit Priority Score.
    Supports the INSUFFICIENT_EVIDENCE state when data is inadequate.
    """

    def evaluate(
        self,
        has_coordinates: bool,
        has_financials: bool,
        has_timeline: bool,
        evidence_items: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        reasons = []
        completeness_pts = 0.0
        metadata_pts = 0.0
        freshness_pts = 20.0  # Base freshness for active audit cycle

        # 1. Project Baseline Completeness (Max 40 pts)
        if has_coordinates:
            completeness_pts += 15.0
        else:
            reasons.append("Missing registered project geographic coordinates.")

        if has_financials:
            completeness_pts += 15.0
        else:
            reasons.append("Missing complete expenditure or financial records.")

        if has_timeline:
            completeness_pts += 10.0
        else:
            reasons.append("Incomplete project milestone timeline.")

        # 2. Evidence Availability & Metadata Quality (Max 40 pts)
        num_evidence = len(evidence_items)
        if num_evidence == 0:
            reasons.append("No photographs or document evidence attached to project.")
        else:
            completeness_pts += min(num_evidence * 10.0, 20.0)

            # Check EXIF metadata quality
            gps_count = sum(1 for ev in evidence_items if ev.get("has_gps", False))
            time_count = sum(1 for ev in evidence_items if ev.get("has_timestamp", False))

            if gps_count > 0:
                metadata_pts += 10.0
            else:
                reasons.append("Evidence photographs lack embedded GPS metadata.")

            if time_count > 0:
                metadata_pts += 10.0
            else:
                reasons.append("Evidence photographs lack embedded capture timestamps.")

        # 3. Overall Confidence Calculation (0-100)
        overall_confidence = round(completeness_pts + metadata_pts + freshness_pts, 1)

        # 4. Determine Confidence Tier & Insufficient Evidence State
        # Critical missing check: No evidence AND missing coordinates or financials
        is_insufficient = (num_evidence == 0 and (not has_coordinates or not has_financials)) or overall_confidence < 35.0

        if is_insufficient:
            confidence_level = "INSUFFICIENT"
        elif overall_confidence >= 75.0:
            confidence_level = "HIGH"
        elif overall_confidence >= 50.0:
            confidence_level = "MEDIUM"
        else:
            confidence_level = "LOW"

        return {
            "overall_confidence": overall_confidence,
            "completeness_score": round(completeness_pts, 1),
            "metadata_reliability": round(metadata_pts, 1),
            "data_freshness": round(freshness_pts, 1),
            "confidence_level": confidence_level,
            "is_insufficient": is_insufficient,
            "reasons": reasons,
            "status": "INSUFFICIENT_EVIDENCE" if is_insufficient else "ASSESSED",
            "summary": (
                "Insufficient evidence available to perform complete multi-modal audit."
                if is_insufficient
                else f"Evidence confidence is {confidence_level} ({overall_confidence}/100)."
            ),
        }
