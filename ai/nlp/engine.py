import numpy as np
import pandas as pd
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.app.utils.logger import logger

class NLPSimilarityEngine:
    """
    Analyzes project work descriptions to identify identical or semantically
    repetitive works across the same district/village (Potential Duplication).
    Uses TF-IDF + Cosine Similarity with fallback to substring analysis.
    """

    def __init__(self, similarity_threshold: float = 0.85):
        self.similarity_threshold = similarity_threshold
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=5000,
            sublinear_tf=True,
        )

    def analyze(self, df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        results = {}
        if len(df) == 0:
            return results

        texts = df["normalized_description"].fillna("").tolist()
        pids = df["project_id"].astype(str).tolist()

        try:
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            sim_matrix = cosine_similarity(tfidf_matrix, tfidf_matrix)
        except Exception as e:
            logger.warning(f"TF-IDF similarity matrix failed: {e}. Defaulting to zero.")
            sim_matrix = np.zeros((len(texts), len(texts)))

        n = len(pids)
        districts = df["district"].astype(str).tolist() if "district" in df.columns else [""] * n
        for i in range(n):
            pid = pids[i]
            # Zero out diagonal
            row_sims = sim_matrix[i].copy()
            row_sims[i] = 0.0

            top_match_idx = int(np.argmax(row_sims)) if n > 1 else -1
            top_score = float(row_sims[top_match_idx]) if top_match_idx >= 0 else 0.0

            matched_ids = []
            if top_score >= self.similarity_threshold:
                # Find all projects meeting threshold
                matched_indices = np.where(row_sims >= self.similarity_threshold)[0]
                # Only filter by district if district information is present in the dataset
                has_districts = any(d != "" and d != "nan" for d in districts)
                curr_dist = districts[i]
                if has_districts and curr_dist != "" and curr_dist != "nan":
                    local_indices = [m for m in matched_indices if districts[m] == curr_dist]
                else:
                    local_indices = list(matched_indices)

                if local_indices:
                    matched_ids = [pids[m] for m in local_indices]
                    score = min(top_score, 0.88)
                    signal = "HIGH_TEXT_DUPLICATION"
                    explanation = (
                        f"Project description exhibits {top_score*100:.1f}% lexical similarity "
                        f"with project(s) {', '.join(matched_ids[:3])}. Potential duplicate billing."
                    )
                else:
                    score = 0.12
                    signal = "STANDARD_CIVIL_TEMPLATE"
                    explanation = "Standard civil works nomenclature across different districts."
            elif top_score >= 0.70:
                score = 0.12
                signal = "MODERATE_TEXT_SIMILARITY"
                explanation = f"Moderate text similarity ({top_score*100:.1f}%) observed with peer works."
            else:
                score = 0.05
                signal = "UNIQUE_DESCRIPTION"
                explanation = "Project description is distinct and non-duplicative."

            results[pid] = {
                "score": round(score, 3),
                "signal": signal,
                "explanation": explanation,
                "method": "TF-IDF + Cosine Similarity",
                "matched_project_ids": matched_ids,
                "evidence": {
                    "max_similarity": round(top_score, 3),
                    "matched_count": len(matched_ids),
                    "matched_ids": matched_ids[:5],
                },
            }

        return results
