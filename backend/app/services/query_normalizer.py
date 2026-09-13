import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.models import Project, ProjectLocation

logger = logging.getLogger(__name__)

# Sector normalization map
SECTOR_MAPPING = {
    "road": "Rural Connectivity & Roads",
    "roads": "Rural Connectivity & Roads",
    "road kaam": "Rural Connectivity & Roads",
    "road work": "Rural Connectivity & Roads",
    "connectivity": "Rural Connectivity & Roads",
    "rasta": "Rural Connectivity & Roads",
    "rastao": "Rural Connectivity & Roads",
    "community hall": "Community Infrastructure",
    "hall": "Community Infrastructure",
    "bhavan": "Community Infrastructure",
    "community": "Community Infrastructure",
    "samajik bhavan": "Community Infrastructure",
    "paani": "Water & Sanitation",
    "water": "Water & Sanitation",
    "sanitation": "Water & Sanitation",
    "drinking water": "Water & Sanitation",
    "peevanu paani": "Water & Sanitation",
    "jal": "Water & Sanitation",
    "school": "Education",
    "shikshan": "Education",
    "vidhyalay": "Education",
    "education": "Education",
    "health": "Health & Family Welfare",
    "health centre": "Health & Family Welfare",
    "hospital": "Health & Family Welfare",
    "arogya": "Health & Family Welfare",
    "dawakhana": "Health & Family Welfare",
    "solar": "Renewable Energy",
    "solar light": "Renewable Energy",
    "street light": "Renewable Energy",
    "light": "Renewable Energy",
    "energy": "Renewable Energy",
    "irrigation": "Irrigation & Flood Control",
    "kheti": "Irrigation & Flood Control",
    "sinchai": "Irrigation & Flood Control",
}

STATUS_MAPPING = {
    "completed": "Completed",
    "complete": "Completed",
    "purna": "Completed",
    "pura": "Completed",
    "pure": "Completed",
    "phata": "Completed",
    "puro": "Completed",
    "in progress": "In Progress",
    "ongoing": "In Progress",
    "chal raha hai": "In Progress",
    "chalu": "In Progress",
    "progress": "In Progress",
    "sanctioned": "Sanctioned",
    "manzoor": "Sanctioned",
}

INDIC_SCRIPT_MAP = {
    # States
    "गुजरात": ("state", "Gujarat"),
    "ગુજરાત": ("state", "Gujarat"),
    "महाराष्ट्र": ("state", "Maharashtra"),
    "મહારાષ્ટ્ર": ("state", "Maharashtra"),
    "उत्तर प्रदेश": ("state", "Uttar Pradesh"),
    "ઉત્તર પ્રદેશ": ("state", "Uttar Pradesh"),
    "राजस्थान": ("state", "Rajasthan"),
    "રાજસ્થાન": ("state", "Rajasthan"),
    
    # Districts
    "राजकोट": ("district", "Rajkot"),
    "રાજકોટ": ("district", "Rajkot"),
    "नागपुर": ("district", "Nagpur"),
    "નાગપુર": ("district", "Nagpur"),
    "वाराणसी": ("district", "Varanasi"),
    "વારાણસી": ("district", "Varanasi"),
    "अहमदाबाद": ("district", "Ahmedabad"),
    "અમદાવાદ": ("district", "Ahmedabad"),
    "जयपुर": ("district", "Jaipur"),
    "જયપુર": ("district", "Jaipur"),
    "सूरत": ("district", "Surat"),
    "સુરત": ("district", "Surat"),
    "पुणे": ("district", "Pune"),
    "પુણે": ("district", "Pune"),
    
    # Terms
    "सड़क": ("sector", "Rural Connectivity & Roads"),
    "रोड": ("sector", "Rural Connectivity & Roads"),
    "રોડ": ("sector", "Rural Connectivity & Roads"),
    "રસ્તા": ("sector", "Rural Connectivity & Roads"),
    "पानी": ("sector", "Water & Sanitation"),
    "પાણી": ("sector", "Water & Sanitation"),
    "स्कूल": ("sector", "Education"),
    "શાળા": ("sector", "Education"),
    "कम्युनिटी हॉल": ("sector", "Community Infrastructure"),
    "કોમ્યુનિટી હોલ": ("sector", "Community Infrastructure"),
    "पूरे": ("status", "Completed"),
    "पूरा": ("status", "Completed"),
    "पूर्ण": ("status", "Completed"),
    "પૂર્ણ": ("status", "Completed"),
    "चालू": ("status", "In Progress"),
    "પ્રગતિમાં": ("status", "In Progress"),
}

# Known Intent keywords
INTENT_KEYWORDS = {
    "COUNT": ["how many", "kitne", "kitna", "ketla", "ketlu", "kethla", "count", "sankhya", "kithna", "કેટલા", "કેટલું", "कितने", "कितना"],
    "FINANCIAL": ["how much", "cost", "sanctioned", "amount", "budget", "expenditure", "unspent", "money", "rupees", "inr", "paisa", "karcha", "kharch", "ખર્ચ", "બજેટ", "રકમ", "खर्च", "बजट", "रकम"],
    "CONTRACTOR": ["contractor", "who built", "who constructed", "agency", "thekedar", "thekedar", "kon che", "કોન્ટ્રાક્ટર", "ठेकेदार"],
    "RATING": ["rating", "public rating", "review", "reviews", "feedback", "stars", "ગુણવત્તા", "रेटिंग"],
}

class QueryNormalizer:
    """
    Normalizes user natural language inputs into canonical database queries.
    Handles English, Hindi, Gujarati, Hinglish, Gujarati transliteration, and informal language.
    """

    def __init__(self, db: Session):
        self.db = db
        self._load_location_caches()

    def _load_location_caches(self):
        """Loads state, district, constituency, block, and village sets for exact/fuzzy entity matching."""
        try:
            self.states = {s[0] for s in self.db.query(Project.state).filter(Project.state != None).distinct().all()}
            self.districts = {d[0] for d in self.db.query(Project.district).filter(Project.district != None).distinct().all()}
            self.constituencies = {c[0] for c in self.db.query(Project.constituency).filter(Project.constituency != None).distinct().all()}
            self.blocks = {b[0] for b in self.db.query(ProjectLocation.block).filter(ProjectLocation.block != None).distinct().all()}
            self.villages = {v[0] for v in self.db.query(ProjectLocation.village).filter(ProjectLocation.village != None).distinct().all()}
            self.sectors = {s[0] for s in self.db.query(Project.sector).filter(Project.sector != None).distinct().all()}
        except Exception as e:
            logger.warning(f"Error loading location caches for normalizer: {e}")
            self.states = set()
            self.districts = set()
            self.constituencies = set()
            self.blocks = set()
            self.villages = set()
            self.sectors = set()

    def detect_language(self, text: str) -> str:
        """Detect language category: en, hi, gu, hi_translit, gu_translit."""
        # Check Gujarati Unicode script range (\u0A80-\u0AFF)
        if re.search(r'[\u0A80-\u0AFF]', text):
            return "gu"
        # Check Devanagari (Hindi) Unicode script range (\u0900-\u097F)
        if re.search(r'[\u0900-\u097F]', text):
            return "hi"

        text_lower = text.lower()
        # Check Gujarati transliteration indicators
        gu_words = ["ketla", "ketlu", "ma", "che", "kaam", "chhe", "karva", "mate", "karwa", "thaya"]
        if any(w in text_lower.split() for w in gu_words):
            return "gu_translit"

        # Check Hindi transliteration indicators
        hi_words = ["kitne", "kitna", "me", "hai", "kaam", "hue", "kya", "kaise", "huye", "par"]
        if any(w in text_lower.split() for w in hi_words):
            return "hi_translit"

        return "en"

    def normalize(self, query_text: str, active_filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Normalizes informal query into intent, structured DB filters, language, and confidence score.
        """
        text = query_text.strip()
        lang = self.detect_language(text)
        text_lower = text.lower()

        filters = {
            "state": None,
            "district": None,
            "constituency": None,
            "block": None,
            "village": None,
            "sector": None,
            "status": None,
            "project_id": None,
        }

        # Apply active_filters context if present
        if active_filters:
            for k in filters.keys():
                if active_filters.get(k):
                    filters[k] = active_filters[k]

        # 1. Project ID direct lookup check (e.g. MPLADS-DEMO-000001)
        pid_match = re.search(r'MPLADS-DEMO-\d{6}', text, re.IGNORECASE)
        if pid_match:
            pid = pid_match.group(0).upper()
            return {
                "intent": "GET_PROJECT_DETAILS",
                "filters": {"project_id": pid},
                "language": lang,
                "confidence": 1.0,
                "is_ambiguous": False,
            }

        # Check Indic script mappings first
        for script_term, (target_key, canonical_val) in INDIC_SCRIPT_MAP.items():
            if script_term in text or script_term in text_lower:
                if not filters.get(target_key):
                    filters[target_key] = canonical_val

        # 2. Extract Sector
        for kw, canonical in SECTOR_MAPPING.items():
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                filters["sector"] = canonical
                break

        # Also check against exact db sectors
        if not filters["sector"]:
            for sec in self.sectors:
                if sec.lower() in text_lower:
                    filters["sector"] = sec
                    break

        # 3. Extract Status
        for kw, canonical in STATUS_MAPPING.items():
            if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
                filters["status"] = canonical
                break

        # 4. Extract Location Entities (State, District, Constituency, Block, Village)
        # Check State
        for s in self.states:
            if s.lower() in text_lower:
                filters["state"] = s
                break

        # Check District
        for d in self.districts:
            if d.lower() in text_lower or (d.lower() + " district") in text_lower:
                filters["district"] = d
                break

        # Check Constituency
        for c in self.constituencies:
            if c.lower() in text_lower:
                filters["constituency"] = c
                break

        # Check Village
        for v in self.villages:
            if v.lower() in text_lower or v.replace("-", " ").lower() in text_lower:
                filters["village"] = v
                break

        # Check Block
        for b in self.blocks:
            if b.lower() in text_lower:
                filters["block"] = b
                break

        # Check if village is specified informally e.g. "in Kalyanpur" or "village Kalyanpur"
        if not filters["village"]:
            v_match = re.search(r'(?:village|gaam|gaon|gram)\s+([a-zA-Z0-9\-]+)', text_lower)
            if v_match:
                candidate = v_match.group(1).title()
                # Find matching village in db
                matched_v = next((v for v in self.villages if candidate.lower() in v.lower()), None)
                if matched_v:
                    filters["village"] = matched_v

        # 5. Classify Intent
        intent = "SEARCH_PROJECTS"
        is_count = any(kw in text_lower for kw in INTENT_KEYWORDS["COUNT"])
        is_financial = any(kw in text_lower for kw in INTENT_KEYWORDS["FINANCIAL"])
        is_contractor = any(kw in text_lower for kw in INTENT_KEYWORDS["CONTRACTOR"])
        is_rating = any(kw in text_lower for kw in INTENT_KEYWORDS["RATING"])

        if is_financial:
            intent = "FINANCIAL_SUMMARY"
        elif is_rating:
            intent = "PUBLIC_RATING_SUMMARY"
        elif is_count:
            if filters["village"] or filters["block"] or filters["constituency"] or filters["district"] or filters["state"]:
                intent = "COUNT_BY_LOCATION"
            elif filters["sector"]:
                intent = "COUNT_BY_SECTOR"
            elif filters["status"]:
                intent = "COUNT_BY_STATUS"
            else:
                intent = "COUNT_PROJECTS"
        elif any(w in text_lower for w in ["help", "kaise kare", "shu karvu", "what can you do"]):
            intent = "HELP"

        # Check ambiguity (e.g., if a village name exists in multiple districts and district is unspecified)
        is_ambiguous = False
        ambiguous_options = []
        if filters["village"] and not filters["district"]:
            # Query districts that have this village
            matches = (
                self.db.query(Project.district, ProjectLocation.village)
                .join(ProjectLocation, Project.project_id == ProjectLocation.project_id)
                .filter(ProjectLocation.village.ilike(filters["village"]))
                .distinct()
                .all()
            )
            distinct_districts = list({m[0] for m in matches if m[0]})
            if len(distinct_districts) > 1:
                is_ambiguous = True
                ambiguous_options = [f"{filters['village']} in {d}" for d in distinct_districts]

        confidence = 0.90 if (filters["state"] or filters["district"] or filters["sector"] or filters["status"] or is_count or is_financial) else 0.70

        return {
            "intent": intent,
            "filters": filters,
            "language": lang,
            "confidence": confidence,
            "is_ambiguous": is_ambiguous,
            "ambiguous_options": ambiguous_options,
            "raw_text": text,
        }
