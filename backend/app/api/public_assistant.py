import logging
import time
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.services.ai_provider import get_ai_provider, OllamaProvider
from backend.app.services.query_normalizer import QueryNormalizer
from backend.app.services.query_tools import (
    count_projects,
    search_projects,
    aggregate_financials,
    get_sector_summary,
    get_status_summary,
    get_public_rating_summary,
    format_inr,
)
from backend.app.services.public_rag import PublicRAG

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public/assistant", tags=["Public Assistant AI API"])

# Pydantic Schemas for Assistant
class ActiveFiltersSchema(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    constituency: Optional[str] = None
    block: Optional[str] = None
    village: Optional[str] = None
    sector: Optional[str] = None
    status: Optional[str] = None

class ChatRequestSchema(BaseModel):
    message: str = Field(..., description="User natural language question")
    language: Optional[str] = Field("en", description="User explicit UI language: en, hi, gu")
    conversation_id: Optional[str] = None
    active_filters: Optional[ActiveFiltersSchema] = None

class ActionItemSchema(BaseModel):
    type: str = Field("APPLY_PUBLIC_FILTERS", description="Action type for frontend")
    filters: Dict[str, Any]

class ChatResponseSchema(BaseModel):
    answer: str
    language: str
    intent: str
    filters_applied: Dict[str, Any]
    result_count: int
    source: str = "synthetic_public_dataset"
    actions: List[ActionItemSchema] = []
    previews: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    is_ambiguous: bool = False
    ambiguous_options: List[str] = []

# Rate Limiter (in-memory sliding window)
REQUEST_HISTORY: Dict[str, List[float]] = {}
RATE_LIMIT_MAX = 30  # max 30 requests per minute per IP
RATE_LIMIT_WINDOW = 60.0

def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    history = REQUEST_HISTORY.get(client_ip, [])
    # Filter out entries older than window
    history = [t for t in history if now - t < RATE_LIMIT_WINDOW]
    if len(history) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait before asking another question.")
    history.append(now)
    REQUEST_HISTORY[client_ip] = history


# Injection keywords check
INJECTION_KEYWORDS = [
    "risk score", "fraud score", "audit priority", "anomaly signal", "investigation case",
    "internal note", "evidence hash", "phash", "contractor network", "ignore previous instructions",
    "system prompt", "raw sql", "database schema", "secret key"
]

@router.post("/chat", response_model=ChatResponseSchema)
def public_assistant_chat(
    req: ChatRequestSchema,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Main Public Assistant Chat endpoint.
    Translates user questions into validated DB queries and synthesizes factual answers.
    """
    check_rate_limit(request)

    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    msg_lower = message.lower()

    # 1. Security & Prompt Injection Boundary Check
    if any(k in msg_lower for k in INJECTION_KEYWORDS):
        return ChatResponseSchema(
            answer="That information is part of the restricted audit workspace and is not available through the Public Assistant.",
            language="en",
            intent="OUT_OF_SCOPE",
            filters_applied={},
            result_count=0,
            source="synthetic_public_dataset",
            actions=[]
        )

    active_dict = req.active_filters.dict() if req.active_filters else {}

    # 2. Query Normalization & Intent Extraction
    normalizer = QueryNormalizer(db)
    norm = normalizer.normalize(message, active_filters=active_dict)

    intent = norm["intent"]
    filters = norm["filters"]
    lang = norm["language"]
    target_lang = req.language if req.language in ["en", "hi", "gu"] else lang
    is_ambiguous = norm["is_ambiguous"]
    ambiguous_options = norm["ambiguous_options"]

    # If location is ambiguous, return clarification prompt
    if is_ambiguous:
        return ChatResponseSchema(
            answer=f'I found multiple location matches. Which specific location did you mean?',
            language=target_lang,
            intent=intent,
            filters_applied=filters,
            result_count=0,
            actions=[],
            is_ambiguous=True,
            ambiguous_options=ambiguous_options
        )

    # 3. Controlled DB Execution
    total_count = count_projects(db, filters)
    previews = []
    actions = []

    # Prepare Action event if location/sector/status filters were applied
    applied_clean = {k: v for k, v in filters.items() if v is not None}
    if applied_clean:
        actions.append(ActionItemSchema(type="APPLY_PUBLIC_FILTERS", filters=applied_clean))

    # 4. Generate Natural Language Answer
    ai_provider = get_ai_provider()
    answer_text = ""

    # Synthesize answers based on Intent
    if intent in ["COUNT_PROJECTS", "COUNT_BY_LOCATION", "COUNT_BY_SECTOR", "COUNT_BY_STATUS"]:
        location_str = ""
        if filters.get("village"):
            location_str += f" in {filters['village']}"
        elif filters.get("district"):
            location_str += f" in {filters['district']}"
        elif filters.get("state"):
            location_str += f" in {filters['state']}"

        sector_str = f" for {filters['sector']}" if filters.get("sector") else ""
        status_str = f" ({filters['status']})" if filters.get("status") else ""

        if target_lang in ["gu", "gu_translit"]:
            answer_text = f"હાલના ડેમો ડેટાસેટ મુજબ{location_str}{sector_str}{status_str} માં કુલ {total_count} જાહેર વિકાસ કાર્યો નોંધાયેલા છે."
        elif target_lang in ["hi", "hi_translit"]:
            answer_text = f"वर्तमान प्रदर्शन डेटासेट के अनुसार{location_str}{sector_str}{status_str} में कुल {total_count} विकास कार्य सूचीबद्ध हैं।"
        else:
            answer_text = f"There are {total_count} public development works listed{location_str}{sector_str}{status_str} in the current demonstration dataset."

        if total_count > 0:
            previews = search_projects(db, filters, limit=5)

    elif intent == "FINANCIAL_SUMMARY":
        fin = aggregate_financials(db, filters)
        c = fin["project_count"]
        s_amount = fin["formatted_sanctioned"]
        e_amount = fin["formatted_expenditure"]

        if target_lang in ["gu", "gu_translit"]:
            answer_text = f"પસંદ કરેલ સ્થાનિક કાર્યો માટે કુલ {s_amount} ની રકમ મંજૂર કરવામાં આવી છે અને {e_amount} નો ખર્ચ થયો છે (કુલ {c} કાર્યો)."
        elif target_lang in ["hi", "hi_translit"]:
            answer_text = f"चयनित सार्वजनिक कार्यों के लिए कुल {s_amount} की राशि स्वीकृत की गई है और {e_amount} का व्यय हुआ है (कुल {c} कार्य)।"
        else:
            answer_text = f"A total sanctioned amount of {s_amount} has been allocated with {e_amount} recorded expenditure across {c} public works."

        previews = search_projects(db, filters, limit=5)

    elif intent == "PUBLIC_RATING_SUMMARY":
        rating = get_public_rating_summary(db, filters)
        answer_text = rating["message"]

    elif intent == "HELP":
        answer_text = (
            "I can answer questions about public development works by location, sector, status, funding, and citizen ratings.\n"
            "Try asking:\n"
            "• 'How many projects are in Gujarat?'\n"
            "• 'Rajkot ma road na ketla kaam che?'\n"
            "• 'રાજકોટમાં કેટલા પ્રોજેક્ટ પૂર્ણ થયા છે?'\n"
            "• 'How much was sanctioned for community halls in Rajkot?'"
        )
    else:
        # Check Public RAG doc
        rag = PublicRAG()
        doc = rag.query(message)
        if doc:
            answer_text = f"{doc['content']}"
        else:
            if total_count > 0:
                previews = search_projects(db, filters, limit=5)
                answer_text = f"I found {total_count} matching public works in the demonstration dataset."
            else:
                answer_text = "I couldn't find any matching public projects in the current demonstration dataset. Try asking about project location, status, sector, or funding."

    # Optionally polish response with Ollama if available
    if isinstance(ai_provider, OllamaProvider) and total_count > 0 and intent != "HELP":
        try:
            sys_p = "You are the MPLADS Public Assistant. Formulate a polite, 1-2 sentence response summarizing the verified facts provided."
            prompt = f"Facts: {answer_text}. Target Language: {target_lang}. Write concise response."
            refined = ai_provider.generate_response(prompt, system_prompt=sys_p, temperature=0.1)
            if refined and len(refined) < 300:
                answer_text = refined
        except Exception:
            pass

    return ChatResponseSchema(
        answer=answer_text,
        language=target_lang,
        intent=intent,
        filters_applied=filters,
        result_count=total_count,
        source="synthetic_public_dataset",
        actions=actions,
        previews=previews,
        projects=previews,
        is_ambiguous=False,
        ambiguous_options=[]
    )
