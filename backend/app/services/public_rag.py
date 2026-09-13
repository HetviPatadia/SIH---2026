import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# Pre-indexed public documentation snippets (Public RAG Knowledge Base)
PUBLIC_KNOWLEDGE_DOCS = [
    {
        "id": "doc_disclaimer",
        "keywords": ["demo", "synthetic", "real", "official", "data source", "government of india"],
        "title": "Demonstration Dataset Notice",
        "content": (
            "This portal is currently operating on a synthetic demonstration dataset created for testing and evaluation purposes. "
            "The project records, MP names, locations, and financial amounts are simulated to represent standard eSAKSHI/MPLADS reporting structures."
        )
    },
    {
        "id": "doc_mplads_overview",
        "keywords": ["mplads", "scheme", "what is mplads", "mp fund", "member of parliament"],
        "title": "MPLADS Scheme Overview",
        "content": (
            "The Members of Parliament Local Area Development Scheme (MPLADS) enables MPs to recommend developmental works "
            "with an emphasis on creating durable community assets based on locally felt needs such as drinking water, education, public health, sanitation, and roads."
        )
    },
    {
        "id": "doc_sanctioned_amount",
        "keywords": ["sanctioned amount", "estimated cost", "unspent", "expenditure", "budget"],
        "title": "Public Financial Terminology",
        "content": (
            "Sanctioned Amount represents the formal financial sanction issued by the District Collector. "
            "Expenditure is the total public funds spent to date on physical execution. Unspent Balance is the remaining allocated amount."
        )
    },
    {
        "id": "doc_public_ratings",
        "keywords": ["rating", "reviews", "feedback", "citizen rating", "stars"],
        "title": "Public Rating & Citizen Feedback",
        "content": (
            "Citizens can submit public feedback and ratings (1 to 5 stars) on completed and ongoing public works. "
            "To prevent skewing and protect privacy, aggregate rating breakdowns are displayed only when a minimum threshold of responses is reached."
        )
    },
    {
        "id": "doc_location_hierarchy",
        "keywords": ["state", "district", "constituency", "block", "village", "location"],
        "title": "Administrative Location Structure",
        "content": (
            "Projects are organized hierarchically under State → District → Parliamentary Constituency → Block → Village. "
            "Citizens can filter public works progressively down to specific villages."
        )
    }
]

class PublicRAG:
    """
    Lightweight public knowledge base retrieval.
    Only indexes public portal documentation and public field descriptions.
    Never indexes confidential audit intelligence.
    """

    def query(self, text: str) -> Optional[Dict[str, Any]]:
        text_lower = text.lower()
        best_doc = None
        max_matches = 0

        for doc in PUBLIC_KNOWLEDGE_DOCS:
            matches = sum(1 for kw in doc["keywords"] if kw in text_lower)
            if matches > max_matches:
                max_matches = matches
                best_doc = doc

        if max_matches > 0:
            return best_doc
        return None
