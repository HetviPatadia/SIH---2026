import os
import shutil
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from PIL import Image

from backend.app.config import settings
from backend.app.utils.logger import logger
from backend.app.database.models import (
    Project,
    ProjectEvidence,
    EvidenceFile,
    EvidenceMetadata,
    EvidenceHash,
    EvidenceEmbedding,
    EvidenceSimilarity,
    EvidenceSignal,
    EvidenceConfidence,
    AssetFingerprintRecord,
    ProjectEntity,
    Entity,
)
from ai.evidence.hasher import EvidenceHasher
from ai.evidence.metadata import EvidenceMetadataExtractor
from ai.evidence.embeddings import VisionEmbeddingEngine
from ai.evidence.spatial_consistency import SpatialEvidenceConsistencyEngine
from ai.evidence.temporal_consistency import TemporalEvidenceConsistencyEngine
from ai.evidence.fingerprint import AssetFingerprintEngine
from ai.evidence.confidence import EvidenceConfidenceEngine
from ai.evidence.cross_search import CrossProjectEvidenceSearch
from ai.evidence.cross_correlation import CrossDomainEvidenceCorrelator


class AssetEvidenceEngine:
    """
    Central Coordinator for the Asset Evidence Intelligence Layer:
    - Preprocesses and validates photographs and documents
    - Computes cryptographic & perceptual hashes
    - Extracts GPS and timeline EXIF metadata
    - Computes vision embeddings
    - Evaluates spatial & temporal consistency
    - Detects exact & near-duplicate cross-project reuse
    - Assembles immutable Asset Fingerprints
    - Evaluates Evidence Confidence (0-100)
    - Builds interactive Evidence Graph topologies
    """

    def __init__(self):
        self.hasher = EvidenceHasher()
        self.metadata_extractor = EvidenceMetadataExtractor()
        self.embedder = VisionEmbeddingEngine()
        self.spatial_engine = SpatialEvidenceConsistencyEngine()
        self.temporal_engine = TemporalEvidenceConsistencyEngine()
        self.fingerprint_engine = AssetFingerprintEngine()
        self.confidence_engine = EvidenceConfidenceEngine()
        self.cross_search = CrossProjectEvidenceSearch()
        self.correlator = CrossDomainEvidenceCorrelator()
        self.storage_dir = settings.EVIDENCE_DIR

    def ingest_and_analyze_file(
        self,
        project_id: str,
        file_bytes: bytes,
        file_name: str,
        evidence_type: str = "COMPLETION_PHOTO",
        title: Optional[str] = None,
        description: Optional[str] = None,
        source: str = "eSAKSHI Upload",
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """
        Validates, saves, extracts metadata, computes hashes, and persists evidence record.
        Does not mutate the original file.
        """
        # 1. Validation
        if not file_bytes:
            raise ValueError("Empty evidence file provided.")

        # File security: prevent path traversal
        clean_filename = Path(file_name).name
        evidence_id = f"EV-{project_id}-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{abs(hash(clean_filename)) % 10000:04d}"

        # 2. Cryptographic SHA-256
        sha256 = self.hasher.compute_sha256(file_bytes)

        # 3. Save file securely
        project_evidence_dir = self.storage_dir / project_id
        project_evidence_dir.mkdir(parents=True, exist_ok=True)
        dest_path = project_evidence_dir / f"{evidence_id}_{clean_filename}"
        with open(dest_path, "wb") as f:
            f.write(file_bytes)

        file_size = len(file_bytes)
        mime_type = "image/jpeg" if clean_filename.lower().endswith((".jpg", ".jpeg")) else "image/png"

        # 4. Extract EXIF Metadata
        meta = self.metadata_extractor.extract_exif(dest_path)

        # 5. Multi-Hash Perceptual Hashes
        hashes = self.hasher.compute_perceptual_hashes(dest_path)

        # 6. Vision Embeddings
        embedding = self.embedder.generate_embedding(dest_path)

        record = {
            "evidence_id": evidence_id,
            "project_id": project_id,
            "evidence_type": evidence_type,
            "title": title or clean_filename,
            "description": description or f"Asset evidence for {project_id}",
            "source": source,
            "file": {
                "file_path": str(dest_path),
                "file_name": clean_filename,
                "mime_type": mime_type,
                "file_size": file_size,
                "sha256": sha256,
                "width": meta.get("width"),
                "height": meta.get("height"),
            },
            "metadata": meta,
            "hashes": {
                "sha256": sha256,
                "phash": hashes.get("phash"),
                "dhash": hashes.get("dhash"),
                "ahash": hashes.get("ahash"),
            },
            "embedding": embedding,
        }

        # 7. Persist to DB if session provided
        if db:
            self._persist_evidence(record, db)

        return record

    def _persist_evidence(self, data: Dict[str, Any], db: Session):
        ev = ProjectEvidence(
            evidence_id=data["evidence_id"],
            project_id=data["project_id"],
            evidence_type=data["evidence_type"],
            title=data["title"],
            description=data["description"],
            source=data["source"],
            created_at=datetime.datetime.utcnow(),
        )
        db.add(ev)
        db.flush()

        f = data["file"]
        db.add(EvidenceFile(
            evidence_id=data["evidence_id"],
            file_path=f["file_path"],
            file_name=f["file_name"],
            mime_type=f["mime_type"],
            file_size=f["file_size"],
            sha256=f["sha256"],
            width=f.get("width"),
            height=f.get("height"),
        ))

        m = data["metadata"]
        db.add(EvidenceMetadata(
            evidence_id=data["evidence_id"],
            capture_time=m.get("capture_time"),
            latitude=m.get("latitude"),
            longitude=m.get("longitude"),
            device_make=m.get("device_make"),
            device_model=m.get("device_model"),
            has_gps=bool(m.get("has_gps", False)),
            has_timestamp=bool(m.get("has_timestamp", False)),
            metadata_source=m.get("metadata_source", "EXIF"),
            metadata_reliability=m.get("metadata_reliability", 0.0),
        ))

        h = data["hashes"]
        db.add(EvidenceHash(
            evidence_id=data["evidence_id"],
            sha256=h["sha256"],
            phash=h["phash"],
            dhash=h["dhash"],
            ahash=h["ahash"],
        ))

        emb = data["embedding"]
        db.add(EvidenceEmbedding(
            evidence_id=data["evidence_id"],
            model_name=emb["model_name"],
            model_version=emb["model_version"],
            embedding_dim=emb["embedding_dim"],
            embedding_vector=emb["embedding_vector"],
        ))

        db.commit()

    def evaluate_project_evidence(self, project_id: str, db: Session) -> Dict[str, Any]:
        """
        Runs comprehensive evidence intelligence for a project:
        - Cross-project similarity search
        - Spatial & temporal consistency
        - Signal generation (EXACT_EVIDENCE_REUSE, POTENTIAL_EVIDENCE_REUSE, etc.)
        - Asset Fingerprinting
        - Evidence Confidence scoring
        """
        proj = db.query(Project).filter(Project.project_id == project_id).first()
        if not proj:
            return {"error": f"Project {project_id} not found"}

        evidences = db.query(ProjectEvidence).filter(ProjectEvidence.project_id == project_id).all()
        loc = proj.location
        fin = proj.financial
        tim = proj.timeline
        signals = []

        # 1. Cross-Project Evidence Search
        similar_matches = self.cross_search.find_similar_evidence(project_id, db, min_similarity=0.75)

        for m in similar_matches:
            sim = m["similarity_score"]
            if m["similarity_method"] == "EXACT_SHA256" or sim >= 0.99:
                signals.append({
                    "project_id": project_id,
                    "evidence_id": m["target_evidence_id"],
                    "signal_type": "EXACT_EVIDENCE_REUSE",
                    "severity": "CRITICAL",
                    "confidence": 98.0,
                    "explanation": (
                        f"Identical evidence file detected across project {project_id} and peer project "
                        f"{m['matched_project_id']}. Exact cryptographic file hash match. Human verification recommended."
                    ),
                    "details": m,
                })
            elif sim >= settings.SIMILARITY_HIGH:
                signals.append({
                    "project_id": project_id,
                    "evidence_id": m["target_evidence_id"],
                    "signal_type": "POTENTIAL_EVIDENCE_REUSE",
                    "severity": "HIGH",
                    "confidence": round(sim * 100.0, 1),
                    "explanation": (
                        f"Potentially reused/similar evidence detected ({m['similarity_percentage']}% visual similarity) "
                        f"with peer project {m['matched_project_id']} ({m['matched_district']})."
                    ),
                    "details": m,
                })

        # 2. Spatial & Temporal Consistency across attached photos
        spatial_results = []
        temporal_results = []

        for ev in evidences:
            meta = ev.metadata_record
            if meta:
                # Spatial
                spat_res = self.spatial_engine.evaluate(
                    project_lat=loc.latitude if loc else None,
                    project_lon=loc.longitude if loc else None,
                    evidence_lat=meta.latitude,
                    evidence_lon=meta.longitude,
                    has_gps=meta.has_gps,
                )
                spatial_results.append(spat_res)
                if spat_res.get("is_inconsistent"):
                    signals.append({
                        "project_id": project_id,
                        "evidence_id": ev.evidence_id,
                        "signal_type": "EVIDENCE_LOCATION_INCONSISTENCY",
                        "severity": spat_res.get("severity", "MEDIUM"),
                        "confidence": 85.0,
                        "explanation": spat_res["explanation"],
                        "details": spat_res,
                    })

                # Temporal
                temp_res = self.temporal_engine.evaluate(
                    sanction_date=tim.sanction_date if tim else None,
                    start_date=tim.start_date if tim else None,
                    completion_date=tim.completion_date if tim else None,
                    evidence_time=meta.capture_time,
                    evidence_type=ev.evidence_type,
                    has_timestamp=meta.has_timestamp,
                )
                temporal_results.append(temp_res)
                if temp_res.get("is_inconsistent"):
                    signals.append({
                        "project_id": project_id,
                        "evidence_id": ev.evidence_id,
                        "signal_type": "TEMPORAL_EVIDENCE_INCONSISTENCY",
                        "severity": temp_res.get("severity", "MEDIUM"),
                        "confidence": 80.0,
                        "explanation": temp_res["explanation"],
                        "details": temp_res,
                    })

        # 3. Evidence Confidence (0-100) & Insufficient Evidence Handling
        ev_items_summary = [
            {
                "evidence_id": ev.evidence_id,
                "has_gps": ev.metadata_record.has_gps if ev.metadata_record else False,
                "has_timestamp": ev.metadata_record.has_timestamp if ev.metadata_record else False,
            }
            for ev in evidences
        ]
        confidence_result = self.confidence_engine.evaluate(
            has_coordinates=bool(loc and loc.has_valid_coords),
            has_financials=bool(fin and fin.sanctioned_amount > 0),
            has_timeline=bool(tim and tim.sanction_date is not None),
            evidence_items=ev_items_summary,
        )

        if confidence_result["is_insufficient"]:
            signals.append({
                "project_id": project_id,
                "evidence_id": None,
                "signal_type": "INSUFFICIENT_EVIDENCE",
                "severity": "LOW",
                "confidence": 90.0,
                "explanation": (
                    f"Insufficient evidence for definitive assessment. Missing: {', '.join(confidence_result['reasons'])}"
                ),
                "details": confidence_result,
            })

        # 4. Digital Asset Fingerprint
        fp_result = self.fingerprint_engine.generate_fingerprint(
            project_data={"project_id": proj.project_id, "title": proj.description.title if proj.description else "", "district": proj.district, "state": proj.state},
            location_data={"latitude": loc.latitude if loc else None, "longitude": loc.longitude if loc else None, "has_valid_coords": loc.has_valid_coords if loc else False},
            financial_data={"sanctioned_amount": fin.sanctioned_amount if fin else 0, "expenditure": fin.expenditure if fin else 0},
            timeline_data={"sanction_date": tim.sanction_date if tim else None, "completion_date": tim.completion_date if tim else None},
            evidence_list=[
                {
                    "evidence_id": ev.evidence_id,
                    "evidence_type": ev.evidence_type,
                    "hashes": {"sha256": ev.hashes.sha256 if ev.hashes else None, "phash": ev.hashes.phash if ev.hashes else None},
                    "metadata": {"has_gps": ev.metadata_record.has_gps if ev.metadata_record else False, "capture_time": ev.metadata_record.capture_time if ev.metadata_record else None},
                }
                for ev in evidences
            ],
        )

        # 5. Persist Signals, Confidence, Fingerprint
        self._sync_signals_to_db(project_id, signals, confidence_result, fp_result, db)

        return {
            "project_id": project_id,
            "evidence_count": len(evidences),
            "signals": signals,
            "similar_matches": similar_matches,
            "confidence": confidence_result,
            "fingerprint": fp_result,
            "spatial_consistency": spatial_results[0] if spatial_results else {"status": "UNAVAILABLE"},
            "temporal_consistency": temporal_results[0] if temporal_results else {"status": "UNAVAILABLE"},
        }

    def _sync_signals_to_db(self, pid: str, signals: List[Dict[str, Any]], conf: Dict[str, Any], fp: Dict[str, Any], db: Session):
        # Clear previous evidence signals for this project
        db.query(EvidenceSignal).filter(EvidenceSignal.project_id == pid).delete()

        for s in signals:
            db.add(EvidenceSignal(
                project_id=pid,
                evidence_id=s.get("evidence_id"),
                signal_type=s["signal_type"],
                severity=s["severity"],
                confidence=s["confidence"],
                explanation=s["explanation"],
                evidence_details=s.get("details"),
                created_at=datetime.datetime.utcnow(),
            ))

        # Upsert confidence
        existing_conf = db.query(EvidenceConfidence).filter(EvidenceConfidence.project_id == pid).first()
        if existing_conf:
            existing_conf.overall_confidence = conf["overall_confidence"]
            existing_conf.completeness_score = conf["completeness_score"]
            existing_conf.metadata_reliability = conf["metadata_reliability"]
            existing_conf.data_freshness = conf["data_freshness"]
            existing_conf.confidence_level = conf["confidence_level"]
            existing_conf.reasons = conf["reasons"]
            existing_conf.calculated_at = datetime.datetime.utcnow()
        else:
            db.add(EvidenceConfidence(
                project_id=pid,
                overall_confidence=conf["overall_confidence"],
                completeness_score=conf["completeness_score"],
                metadata_reliability=conf["metadata_reliability"],
                data_freshness=conf["data_freshness"],
                confidence_level=conf["confidence_level"],
                reasons=conf["reasons"],
                calculated_at=datetime.datetime.utcnow(),
            ))

        # Upsert fingerprint
        existing_fp = db.query(AssetFingerprintRecord).filter(AssetFingerprintRecord.project_id == pid).first()
        if existing_fp:
            existing_fp.fingerprint_hash = fp["fingerprint_hash"]
            existing_fp.fingerprint_data = fp["fingerprint_data"]
            existing_fp.generated_at = datetime.datetime.utcnow()
        else:
            db.add(AssetFingerprintRecord(
                project_id=pid,
                fingerprint_hash=fp["fingerprint_hash"],
                fingerprint_data=fp["fingerprint_data"],
                generated_at=datetime.datetime.utcnow(),
            ))

        db.commit()

    def build_evidence_graph(self, project_id: str, db: Session) -> Dict[str, Any]:
        """
        Builds graph topology extending the project with Photo nodes, Contractor nodes,
        and Cross-Project Similarity edges.
        """
        proj = db.query(Project).filter(Project.project_id == project_id).first()
        if not proj:
            return {"nodes": [], "edges": []}

        nodes = []
        edges = []

        # Central Project Node
        nodes.append({
            "id": f"p_{proj.project_id}",
            "label": proj.project_id,
            "type": "PROJECT",
            "risk_level": proj.risk_score.priority_level.value if proj.risk_score and hasattr(proj.risk_score.priority_level, "value") else "LOW",
        })

        # District Node
        d_id = f"d_{proj.district}"
        nodes.append({"id": d_id, "label": proj.district, "type": "DISTRICT", "risk_level": "LOW"})
        edges.append({"source": f"p_{proj.project_id}", "target": d_id, "relation": "LOCATED_IN"})

        # Contractor Node
        pe = db.query(ProjectEntity).filter(ProjectEntity.project_id == project_id).first()
        if pe:
            ent = db.query(Entity).filter(Entity.entity_id == pe.entity_id).first()
            if ent:
                c_id = f"c_{ent.entity_id}"
                nodes.append({"id": c_id, "label": ent.name, "type": "CONTRACTOR", "risk_level": "MEDIUM"})
                edges.append({"source": c_id, "target": f"p_{proj.project_id}", "relation": "AWARDED_TO"})

        # Evidence / Photo Nodes
        evidences = db.query(ProjectEvidence).filter(ProjectEvidence.project_id == project_id).all()
        for ev in evidences:
            ev_node_id = f"ev_{ev.evidence_id}"
            nodes.append({
                "id": ev_node_id,
                "label": f"📸 {ev.evidence_type}",
                "type": "PHOTO",
                "risk_level": "LOW",
                "evidence_id": ev.evidence_id,
            })
            edges.append({"source": f"p_{proj.project_id}", "target": ev_node_id, "relation": "HAS_EVIDENCE"})

        # Similar Peer Projects via Evidence
        similar_matches = self.cross_search.find_similar_evidence(project_id, db, min_similarity=0.80)
        for m in similar_matches:
            matched_pid = m["matched_project_id"]
            peer_p_node_id = f"p_{matched_pid}"
            if not any(n["id"] == peer_p_node_id for n in nodes):
                nodes.append({
                    "id": peer_p_node_id,
                    "label": matched_pid,
                    "type": "PROJECT",
                    "risk_level": "HIGH" if m["similarity_score"] >= 0.90 else "MEDIUM",
                })
            # Connect photo to photo similarity
            edges.append({
                "source": f"ev_{m['target_evidence_id']}",
                "target": peer_p_node_id,
                "relation": "SIMILAR_TO",
                "label": f"{m['similarity_percentage']}%",
            })

        return {"nodes": nodes, "edges": edges}
