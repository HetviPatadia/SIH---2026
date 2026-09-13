import pytest
import io
import datetime
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

from ai.evidence.hasher import EvidenceHasher
from ai.evidence.metadata import EvidenceMetadataExtractor
from ai.evidence.embeddings import VisionEmbeddingEngine
from ai.evidence.spatial_consistency import SpatialEvidenceConsistencyEngine
from ai.evidence.temporal_consistency import TemporalEvidenceConsistencyEngine
from ai.evidence.fingerprint import AssetFingerprintEngine
from ai.evidence.confidence import EvidenceConfidenceEngine
from ai.evidence.cross_correlation import CrossDomainEvidenceCorrelator


@pytest.fixture
def helper_images():
    """Helper to generate in-memory synthetic images for testing."""
    # Image A: Base road construction photo
    img_a = Image.new("RGB", (200, 200), color=(120, 120, 120))
    d = ImageDraw.Draw(img_a)
    d.rectangle([50, 50, 150, 150], fill=(200, 100, 50))
    d.line([0, 100, 200, 100], fill=(255, 255, 0), width=4)

    buf_a = io.BytesIO()
    img_a.save(buf_a, format="JPEG", quality=95)
    bytes_a = buf_a.getvalue()

    # Image B: Completely unrelated photo (blue water tank)
    img_b = Image.new("RGB", (200, 200), color=(20, 50, 180))
    d_b = ImageDraw.Draw(img_b)
    d_b.ellipse([30, 30, 170, 170], fill=(0, 220, 255))
    buf_b = io.BytesIO()
    img_b.save(buf_b, format="JPEG")
    bytes_b = buf_b.getvalue()

    return {"bytes_a": bytes_a, "img_a": img_a, "bytes_b": bytes_b, "img_b": img_b}


# Test 1: Exact duplicate photograph (SHA-256 match)
def test_1_exact_duplicate_photograph(helper_images):
    hasher = EvidenceHasher()
    sha1 = hasher.compute_sha256(helper_images["bytes_a"])
    sha2 = hasher.compute_sha256(helper_images["bytes_a"])
    assert sha1 == sha2
    assert len(sha1) == 64


# Test 2: Resized duplicate photograph
def test_2_resized_duplicate_photograph(helper_images):
    hasher = EvidenceHasher()
    # Resize original with standard resampling
    img_resized = helper_images["img_a"].resize((100, 100), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img_resized.save(buf, format="JPEG")

    h1 = hasher.compute_perceptual_hashes(helper_images["bytes_a"])
    h2 = hasher.compute_perceptual_hashes(buf.getvalue())
    sim = hasher.calculate_composite_similarity(h1, h2)
    sim_d = hasher.calculate_similarity(h1["dhash"], h2["dhash"])

    assert sim >= 0.80, f"Expected high composite similarity for resized photo, got {sim}"
    assert sim_d >= 0.95, f"Expected near-perfect dHash similarity for resized photo, got {sim_d}"
    assert hasher.classify_similarity_tier(sim) in ["VERY_HIGH", "HIGH", "MODERATE"]


# Test 3: Cropped duplicate photograph
def test_3_cropped_duplicate_photograph(helper_images):
    hasher = EvidenceHasher()
    # Center crop 85% of image
    img_cropped = helper_images["img_a"].crop((15, 15, 185, 185))
    buf = io.BytesIO()
    img_cropped.save(buf, format="JPEG")

    h1 = hasher.compute_perceptual_hashes(helper_images["bytes_a"])
    h2 = hasher.compute_perceptual_hashes(buf.getvalue())
    sim = hasher.calculate_similarity(h1["phash"], h2["phash"])

    assert sim >= 0.80, f"Expected moderate/high similarity for cropped photo, got {sim}"


# Test 4: Different photographs of the same type of asset
def test_4_different_photographs_same_asset_type():
    embedder = VisionEmbeddingEngine()
    # Two different community hall structures with distinct color schemes
    img1 = Image.new("RGB", (150, 150), color=(180, 160, 140))
    d1 = ImageDraw.Draw(img1)
    d1.rectangle([30, 30, 120, 120], fill=(220, 100, 50))
    d1.rectangle([50, 50, 80, 80], fill=(100, 100, 255))

    img2 = Image.new("RGB", (150, 150), color=(100, 140, 180))
    d2 = ImageDraw.Draw(img2)
    d2.rectangle([20, 40, 130, 110], fill=(200, 200, 100))
    d2.rectangle([40, 60, 90, 90], fill=(50, 180, 100))

    emb1 = embedder.generate_embedding(img1)
    emb2 = embedder.generate_embedding(img2)
    sim = embedder.cosine_similarity(emb1["embedding_vector"], emb2["embedding_vector"])

    assert 0.65 <= sim <= 0.95, f"Expected moderate visual similarity for same asset type, got {sim}"


# Test 5: Completely unrelated photographs
def test_5_completely_unrelated_photographs(helper_images):
    hasher = EvidenceHasher()
    embedder = VisionEmbeddingEngine()

    h1 = hasher.compute_perceptual_hashes(helper_images["bytes_a"])
    h2 = hasher.compute_perceptual_hashes(helper_images["bytes_b"])
    hash_sim = hasher.calculate_similarity(h1["phash"], h2["phash"])

    emb1 = embedder.generate_embedding(helper_images["bytes_a"])
    emb2 = embedder.generate_embedding(helper_images["bytes_b"])
    emb_sim = embedder.cosine_similarity(emb1["embedding_vector"], emb2["embedding_vector"])

    assert hash_sim < 0.70, f"Expected low hash similarity for unrelated photos, got {hash_sim}"
    assert emb_sim < 0.75, f"Expected low embedding similarity for unrelated photos, got {emb_sim}"


# Test 6: Missing metadata (Strict 'Unavailable' Rule)
def test_6_missing_metadata(helper_images):
    extractor = EvidenceMetadataExtractor()
    meta = extractor.extract_exif(helper_images["bytes_a"])

    assert meta["has_gps"] is False
    assert meta["latitude"] is None
    assert meta["longitude"] is None
    assert meta["metadata_reliability"] == 0.0

    # Spatial engine must report UNAVAILABLE, never fabricate
    spat = SpatialEvidenceConsistencyEngine()
    spat_res = spat.evaluate(project_lat=25.31, project_lon=82.97, evidence_lat=meta["latitude"], evidence_lon=meta["longitude"], has_gps=meta["has_gps"])
    assert spat_res["status"] == "UNAVAILABLE"
    assert "Unavailable" in spat_res["explanation"]


# Test 7: Incorrect / distant metadata
def test_7_incorrect_metadata():
    spat = SpatialEvidenceConsistencyEngine(tolerance_meters=500.0)
    # Project at Varanasi (25.31, 82.97), photo claimed from Lucknow (26.84, 80.94) -> ~280 km
    res = spat.evaluate(project_lat=25.31, project_lon=82.97, evidence_lat=26.84, evidence_lon=80.94, has_gps=True)

    assert res["is_inconsistent"] is True
    assert res["signal"] == "EVIDENCE_LOCATION_INCONSISTENCY"
    assert res["severity"] == "HIGH"
    assert res["distance_meters"] > 200000.0


# Test 8: Same location / different projects
def test_8_same_location_different_projects():
    spat = SpatialEvidenceConsistencyEngine(tolerance_meters=500.0)
    # Two different projects in the same village (within 80m)
    res = spat.evaluate(project_lat=25.3100, project_lon=82.9700, evidence_lat=25.3105, evidence_lon=82.9705, has_gps=True)
    assert res["status"] == "CONSISTENT"
    assert res["is_inconsistent"] is False


# Test 9: Different location / similar projects
def test_9_different_location_similar_projects():
    spat = SpatialEvidenceConsistencyEngine(tolerance_meters=500.0)
    # Similar works in two different districts (> 50 km)
    res = spat.evaluate(project_lat=25.31, project_lon=82.97, evidence_lat=25.80, evidence_lon=82.97, has_gps=True)
    assert res["is_inconsistent"] is True
    assert res["signal"] == "EVIDENCE_LOCATION_INCONSISTENCY"


# Test 10: Similar project descriptions + Photo reuse
def test_10_similar_descriptions_and_photo_reuse():
    correlator = CrossDomainEvidenceCorrelator()
    res = correlator.correlate(
        base_audit_score=40.0,
        financial_signal={"score": 0.1},
        nlp_signal={"score": 0.90},  # High description duplication
        spatial_signal={"score": 0.1},
        network_signal={"score": 0.1},
        temporal_signal={"score": 0.1},
        evidence_matches=[{"similarity_score": 0.96, "is_same_contractor": False}],
    )
    assert res["final_audit_score"] > 60.0
    assert any("DESCRIPTION_AND_PHOTO_DUPLICATION" in f.get("signal", "") for f in res["contributing_factors"])


# Test 11: Same contractor + Photo reuse
def test_11_same_contractor_and_photo_reuse():
    correlator = CrossDomainEvidenceCorrelator()
    res = correlator.correlate(
        base_audit_score=35.0,
        financial_signal={"score": 0.1},
        nlp_signal={"score": 0.1},
        spatial_signal={"score": 0.1},
        network_signal={"score": 0.5},
        temporal_signal={"score": 0.1},
        evidence_matches=[{"similarity_score": 0.95, "is_same_contractor": True}],
    )
    assert res["final_audit_score"] >= 70.0
    assert any("SAME_CONTRACTOR_EVIDENCE_REUSE" in f.get("signal", "") for f in res["contributing_factors"])


# Test 12: Multiple signals occurring together (Compound Synergy)
def test_12_multiple_signals_compound_synergy():
    correlator = CrossDomainEvidenceCorrelator()
    res = correlator.correlate(
        base_audit_score=50.0,
        financial_signal={"score": 0.8},
        nlp_signal={"score": 0.85},
        spatial_signal={"score": 0.85},
        network_signal={"score": 0.8},
        temporal_signal={"score": 0.5},
        evidence_matches=[{"similarity_score": 0.97, "is_same_contractor": True}],
        spatial_inconsistency={"is_inconsistent": True, "distance_meters": 3500.0},
    )
    assert res["final_audit_score"] >= 85.0
    assert res["priority_level"] == "CRITICAL"
    assert res["has_cross_domain_synergy"] is True


# Test 13: No evidence available (Insufficient Evidence State)
def test_13_no_evidence_available():
    conf_eng = EvidenceConfidenceEngine()
    conf = conf_eng.evaluate(has_coordinates=False, has_financials=False, has_timeline=False, evidence_items=[])
    assert conf["status"] == "INSUFFICIENT_EVIDENCE"
    assert conf["is_insufficient"] is True
    assert conf["overall_confidence"] < 35.0


# Test 14: Low-quality / blurry image processing
def test_14_low_quality_blurry_image(helper_images):
    # Apply severe Gaussian blur
    img_blurred = helper_images["img_a"].filter(ImageFilter.GaussianBlur(radius=8))
    buf = io.BytesIO()
    img_blurred.save(buf, format="JPEG", quality=20)  # High compression

    hasher = EvidenceHasher()
    hashes = hasher.compute_perceptual_hashes(buf.getvalue())
    assert hashes["phash"] is not None
    assert len(hashes["phash"]) > 0


# Test 15: Invalid / corrupted evidence file handling
def test_15_corrupted_evidence_file():
    corrupt_bytes = b"NOT_A_VALID_JPEG_OR_PNG_HEADER_CORRUPTED_FILE"
    extractor = EvidenceMetadataExtractor()
    meta = extractor.extract_exif(corrupt_bytes)
    # Must not crash, should return empty metadata safely
    assert meta["has_gps"] is False
    assert meta["width"] == 0
