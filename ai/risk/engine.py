from typing import Dict, Any, Tuple, List, Optional
from backend.app.config import settings

DOMAIN_REASON_PHRASING = {
    "financial": {
        "COST_OUTLIER": "an unusual expenditure pattern significantly above sector median",
        "ELEVATED_COST": "an elevated project cost relative to sector benchmarks",
        "default": "financial expenditure deviations",
    },
    "split_tender": {
        "POTENTIAL_SPLIT_TENDER": "closely timed procurement records near statutory ceiling",
        "default": "tender sizing patterns near threshold",
    },
    "evidence": {
        "EXACT_PHOTO_REUSE": "exact photographic evidence reuse detected across projects",
        "EVIDENCE_HASH_REUSE": "cryptographic evidence hash reuse across projects",
        "PERCEPTUAL_PHOTO_SIMILARITY": "potential perceptual photographic similarity",
        "POTENTIAL_EVIDENCE_REUSE": "potential evidence reuse across projects",
        "EVIDENCE_LOCATION_INCONSISTENCY": "physical project site and photo EXIF GPS location inconsistency",
        "EVIDENCE_TEMPORAL_INCONSISTENCY": "photo timestamp and project execution timeline inconsistency",
        "default": "physical evidence irregularities",
    },
    "spatial": {
        "POTENTIAL_GEO_DUPLICATE": "unusual physical proximity to sibling project (< 150m)",
        "default": "spatial clustering patterns",
    },
    "network": {
        "HIGH_DEGREE_CONCENTRATION": "elevated contractor portfolio concentration across district network",
        "default": "contractor network associations",
    },
    "text": {
        "HIGH_TEXT_DUPLICATION": "repetitive project description text matching peer works",
        "default": "description lexical redundancy",
    },
    "temporal": {
        "VELOCITY_SPIKE": "rapid expenditure velocity over an unusually short execution window",
        "PROLONGED_START_LAG": "substantial execution lag between sanction and start date",
        "default": "timeline execution deviations",
    },
}

class UnifiedRiskEngine:
    """
    Computes calibrated 0-100 Audit Priority Scores from fused engine outputs.
    Assigns audit review priority (LOW, MEDIUM, HIGH, CRITICAL).
    Strictly adheres to Human-in-the-Loop decision support terminology.
    """

    def __init__(self):
        self.thresh_low = settings.THRESHOLD_LOW
        self.thresh_med = settings.THRESHOLD_MEDIUM
        self.thresh_high = settings.THRESHOLD_HIGH

    def calculate_priority(self, composite_index: float) -> Tuple[float, str]:
        # Scale 0-1 composite to 0-100
        raw_score = composite_index * 100.0
        score_100 = round(min(max(raw_score, 0.0), 100.0), 1)

        if score_100 <= self.thresh_low:
            level = "LOW"
        elif score_100 <= self.thresh_med:
            level = "MEDIUM"
        elif score_100 <= self.thresh_high:
            level = "HIGH"
        else:
            level = "CRITICAL"

        return score_100, level

    def extract_top_reasons(
        self,
        contributions: Dict[str, float],
        domain_signals: Optional[Dict[str, Any]] = None,
        max_reasons: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Extracts the strongest 3-5 active contributing factors behind the score.
        Only includes domains that actually contributed to the priority score.
        """
        top_reasons = []
        domain_sigs = domain_signals or {}

        # Sort by contribution descending
        sorted_contribs = sorted(contributions.items(), key=lambda x: x[1], reverse=True)

        for domain, pts in sorted_contribs:
            if pts <= 0.5:
                continue

            dom_info = domain_sigs.get(domain, {})
            sig = dom_info.get("signal", "NORMAL")
            dom_reasons = dom_info.get("reason")
            phrasing_map = DOMAIN_REASON_PHRASING.get(domain, {})

            # Select specific reason description
            if sig in phrasing_map:
                reason_desc = phrasing_map[sig]
            elif dom_reasons and dom_reasons != "NORMAL" and "completed" not in dom_reasons.lower():
                reason_desc = dom_reasons
            else:
                reason_desc = phrasing_map.get("default", f"{domain.capitalize()} analytical signal")

            # Clean capitalisation for UI display
            formatted_reason = reason_desc[0].upper() + reason_desc[1:] if reason_desc else f"{domain.capitalize()} indicator"

            top_reasons.append({
                "domain": domain,
                "reason": formatted_reason,
                "contribution": pts,
            })

            if len(top_reasons) >= max_reasons:
                break

        return top_reasons

    def generate_explanation_summary(
        self,
        level: str,
        contributions: Dict[str, float],
        domain_signals: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generates an explainable, data-driven, non-accusatory summary for the human auditor.
        """
        top_items = self.extract_top_reasons(contributions, domain_signals, max_reasons=3)

        if not top_items or level == "LOW":
            return (
                "Low Audit Priority. No strong anomaly signal identified from the available data. "
                "Project metrics align with standard regional benchmarks."
            )

        reason_phrases = [r["reason"][0].lower() + r["reason"][1:] for r in top_items]

        if len(reason_phrases) == 1:
            phrase = f"primarily due to {reason_phrases[0]}"
        elif len(reason_phrases) == 2:
            phrase = f"due to {reason_phrases[0]} and {reason_phrases[1]}"
        else:
            phrase = f"due to {reason_phrases[0]}, {reason_phrases[1]}, and {reason_phrases[2]}"

        if level == "CRITICAL":
            return f"Critical Audit Priority {phrase}. Immediate human verification recommended."
        elif level == "HIGH":
            return f"High Audit Priority {phrase}. Prioritized on-ground verification recommended."
        elif level == "MEDIUM":
            return f"Medium Audit Priority {phrase}. Routine audit sampling recommended."
        else:
            return f"Audit Priority {phrase}."
