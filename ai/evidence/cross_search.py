from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.database.models import (
    Project,
    ProjectEvidence,
    EvidenceHash,
    EvidenceEmbedding,
    EvidenceMetadata,
    ProjectEntity,
    Entity,
    ProjectLocation,
)
from ai.evidence.hasher import EvidenceHasher
from ai.evidence.embeddings import VisionEmbeddingEngine
from backend.app.utils.geo import haversine_distance_meters
from backend.app.config import settings


class CrossProjectEvidenceSearch:
    """
    Searches for similar evidence across project records using:
    1. Exact SHA-256 cryptographic match
    2. Perceptual hash similarity (pHash, dHash)
    3. Vision embedding cosine similarity
    Returns matches with similarity score, tier, contractor relation, and geo distance.
    """

    def __init__(self):
        self.hasher = EvidenceHasher()
        self.embedder = VisionEmbeddingEngine()

    def find_similar_evidence(
        self,
        target_project_id: str,
        db: Session,
        min_similarity: float = 0.75,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        # Fetch target project's evidence
        target_evidences = db.query(ProjectEvidence).filter(ProjectEvidence.project_id == target_project_id).all()
        if not target_evidences:
            return []

        # Get target contractor
        target_pe = db.query(ProjectEntity).filter(ProjectEntity.project_id == target_project_id).first()
        target_contractor = None
        if target_pe:
            ent = db.query(Entity).filter(Entity.entity_id == target_pe.entity_id).first()
            target_contractor = ent.name if ent else None

        # Get target location
        target_loc = db.query(ProjectLocation).filter(ProjectLocation.project_id == target_project_id).first()
        t_lat = target_loc.latitude if target_loc else None
        t_lon = target_loc.longitude if target_loc else None

        # Query all other project evidence
        other_evidences = (
            db.query(ProjectEvidence, EvidenceHash, EvidenceEmbedding, Project)
            .join(EvidenceHash, ProjectEvidence.evidence_id == EvidenceHash.evidence_id)
            .outerjoin(EvidenceEmbedding, ProjectEvidence.evidence_id == EvidenceEmbedding.evidence_id)
            .join(Project, ProjectEvidence.project_id == Project.project_id)
            .filter(ProjectEvidence.project_id != target_project_id)
            .all()
        )

        matches = []

        for t_ev in target_evidences:
            t_hash = db.query(EvidenceHash).filter(EvidenceHash.evidence_id == t_ev.evidence_id).first()
            t_emb = db.query(EvidenceEmbedding).filter(EvidenceEmbedding.evidence_id == t_ev.evidence_id).first()

            if not t_hash:
                continue

            for o_ev, o_hash, o_emb, o_proj in other_evidences:
                # 1. Exact SHA-256 check
                if t_hash.sha256 and o_hash.sha256 and t_hash.sha256 == o_hash.sha256:
                    similarity = 1.0
                    method = "EXACT_SHA256"
                else:
                    # 2. Perceptual pHash & dHash
                    sim_p = self.hasher.calculate_similarity(t_hash.phash, o_hash.phash)
                    sim_d = self.hasher.calculate_similarity(t_hash.dhash, o_hash.dhash)
                    hash_sim = (sim_p * 0.6) + (sim_d * 0.4)

                    # 3. Embedding cosine similarity if available
                    emb_sim = 0.0
                    if t_emb and o_emb and t_emb.embedding_vector and o_emb.embedding_vector:
                        emb_sim = self.embedder.cosine_similarity(t_emb.embedding_vector, o_emb.embedding_vector)

                    # Combined weighted similarity
                    similarity = max(hash_sim, (hash_sim * 0.6 + emb_sim * 0.4))
                    method = "PERCEPTUAL_EMBEDDING"

                if similarity >= min_similarity:
                    # Determine contractor relationship
                    o_pe = db.query(ProjectEntity).filter(ProjectEntity.project_id == o_proj.project_id).first()
                    o_contractor = None
                    if o_pe:
                        o_ent = db.query(Entity).filter(Entity.entity_id == o_pe.entity_id).first()
                        o_contractor = o_ent.name if o_ent else None

                    is_same_contractor = (
                        target_contractor is not None
                        and o_contractor is not None
                        and target_contractor == o_contractor
                    )

                    # Determine geographic distance between projects
                    o_loc = db.query(ProjectLocation).filter(ProjectLocation.project_id == o_proj.project_id).first()
                    dist_meters = None
                    if t_lat and t_lon and o_loc and o_loc.latitude and o_loc.longitude:
                        dist_meters = round(haversine_distance_meters(t_lat, t_lon, o_loc.latitude, o_loc.longitude), 1)

                    match_tier = self.hasher.classify_similarity_tier(similarity)

                    matches.append({
                        "target_evidence_id": t_ev.evidence_id,
                        "matched_evidence_id": o_ev.evidence_id,
                        "matched_project_id": o_proj.project_id,
                        "matched_project_title": o_proj.description.title if o_proj.description else o_proj.project_id,
                        "matched_district": o_proj.district,
                        "matched_contractor": o_contractor,
                        "is_same_contractor": is_same_contractor,
                        "similarity_score": round(similarity, 4),
                        "similarity_percentage": round(similarity * 100.0, 1),
                        "similarity_method": method,
                        "match_tier": match_tier,
                        "distance_meters": dist_meters,
                        "evidence_type": o_ev.evidence_type,
                    })

        # Sort by similarity descending and deduplicate by matched_project_id
        matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        unique_matches = []
        seen_projects = set()
        for m in matches:
            if m["matched_project_id"] not in seen_projects:
                seen_projects.add(m["matched_project_id"])
                unique_matches.append(m)
            if len(unique_matches) >= limit:
                break

        return unique_matches
