import os
import io
import datetime
from PIL import Image, ImageDraw
from sqlalchemy.orm import Session

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.database.connection import SessionLocal
from backend.app.database.models import Project, ProjectLocation
from ai.evidence.engine import AssetEvidenceEngine


def generate_scene_image(scene_type: str, seed: int = 1) -> Image.Image:
    """Draws a synthetic physical infrastructure photograph."""
    img = Image.new("RGB", (320, 240), color=(135, 206, 235))  # Sky blue background
    d = ImageDraw.Draw(img)

    # Ground
    d.rectangle([0, 160, 320, 240], fill=(70 + (seed * 5) % 40, 110, 50))

    if scene_type == "community_hall":
        # Hall structure
        d.rectangle([50, 80, 270, 180], fill=(210, 180, 140))
        # Roof
        d.polygon([(40, 80), (160, 30), (280, 80)], fill=(180, 60, 50))
        # Door and windows
        d.rectangle([130, 110, 190, 180], fill=(60, 40, 30))
        d.rectangle([70, 100, 110, 140], fill=(220, 240, 255))
        d.rectangle([210, 100, 250, 140], fill=(220, 240, 255))
    elif scene_type == "solar_light":
        # Pole
        d.rectangle([155, 40, 165, 180], fill=(160, 165, 170))
        # Solar Panel
        d.polygon([(110, 30), (210, 30), (190, 50), (90, 50)], fill=(20, 40, 100))
        # LED fixture
        d.rectangle([140, 55, 180, 65], fill=(255, 255, 180))
    elif scene_type == "road_work":
        # Asphalt road
        d.polygon([(120, 160), (200, 160), (320, 240), (0, 240)], fill=(60, 60, 65))
        # Center line
        d.line([(160, 160), (160, 240)], fill=(255, 255, 255), width=4)
        # Side drain / kerb
        d.rectangle([30, 150, 90, 170], fill=(150, 140, 130))
    else:
        # Drinking water tank
        d.rectangle([100, 70, 220, 170], fill=(0, 120, 180))
        d.polygon([(90, 70), (160, 40), (230, 70)], fill=(0, 90, 150))
        d.rectangle([145, 170, 175, 210], fill=(100, 100, 100))

    return img


def create_jpeg_with_exif(img: Image.Image, lat=None, lon=None, capture_date=None, make="Samsung", model="SM-A525F") -> bytes:
    exif = img.getexif()
    exif[0x010F] = make
    exif[0x0110] = model

    if capture_date:
        exif[0x0132] = capture_date.strftime("%Y:%m:%d %H:%M:%S")

    if lat is not None and lon is not None:
        gps_ifd = exif.get_ifd(0x8825)
        gps_ifd[1] = "N" if lat >= 0 else "S"
        lat_abs = abs(lat)
        deg_lat = int(lat_abs)
        min_lat = int((lat_abs - deg_lat) * 60)
        sec_lat = round((lat_abs - deg_lat - min_lat / 60) * 3600, 1)
        gps_ifd[2] = (float(deg_lat), float(min_lat), float(sec_lat))

        gps_ifd[3] = "E" if lon >= 0 else "W"
        lon_abs = abs(lon)
        deg_lon = int(lon_abs)
        min_lon = int((lon_abs - deg_lon) * 60)
        sec_lon = round((lon_abs - deg_lon - min_lon / 60) * 3600, 1)
        gps_ifd[4] = (float(deg_lon), float(min_lon), float(sec_lon))

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90, exif=exif)
    return buf.getvalue()


def seed_evidence_data():
    db: Session = SessionLocal()
    engine = AssetEvidenceEngine()
    print("Seeding Asset Evidence Intelligence records across database...")

    projects = db.query(Project).limit(70).all()
    if not projects:
        print("No projects found in database to seed.")
        db.close()
        return

    # Base photo assets
    img_hall = generate_scene_image("community_hall", seed=1)
    img_solar = generate_scene_image("solar_light", seed=2)
    img_road = generate_scene_image("road_work", seed=3)
    img_water = generate_scene_image("water_tank", seed=4)

    # -------------------------------------------------------------
    # Cluster 1: Photo Reuse (MPL-00001 & MPL-00002) - Exact + Near Duplicate
    # -------------------------------------------------------------
    p1 = db.query(Project).filter(Project.project_id == "MPL-00001").first()
    p2 = db.query(Project).filter(Project.project_id == "MPL-00002").first()

    if p1:
        bytes_p1 = create_jpeg_with_exif(img_hall, lat=25.3176, lon=82.9739, capture_date=datetime.datetime(2025, 11, 10, 14, 20))
        engine.ingest_and_analyze_file(
            project_id="MPL-00001",
            file_bytes=bytes_p1,
            file_name="hall_completion_front.jpg",
            evidence_type="COMPLETION_PHOTO",
            title="Community Hall Final Front View",
            description="Official completion inspection photograph",
            source="eSAKSHI Mobile Inspection App",
            db=db,
        )

    if p2:
        # Exact duplicate reused in MPL-00002
        bytes_p2_exact = bytes_p1
        engine.ingest_and_analyze_file(
            project_id="MPL-00002",
            file_bytes=bytes_p2_exact,
            file_name="site_inspection_verified.jpg",
            evidence_type="COMPLETION_PHOTO",
            title="Ward Hall Work Done",
            description="Photographic record submitted for final billing",
            source="Contractor Agency Upload Portal",
            db=db,
        )

    # -------------------------------------------------------------
    # Cluster 2: Near-Duplicate Reuse (MPL-00010 & MPL-00012)
    # -------------------------------------------------------------
    p10 = db.query(Project).filter(Project.project_id == "MPL-00010").first()
    p12 = db.query(Project).filter(Project.project_id == "MPL-00012").first()

    if p10:
        bytes_solar1 = create_jpeg_with_exif(img_solar, lat=25.3210, lon=82.9800, capture_date=datetime.datetime(2025, 9, 15, 11, 30))
        engine.ingest_and_analyze_file(
            project_id="MPL-00010",
            file_bytes=bytes_solar1,
            file_name="solar_high_mast_light.jpg",
            evidence_type="PROGRESS_PHOTO",
            title="Solar Light Installation Verification",
            description="Installed solar street light at village junction",
            source="eSAKSHI Mobile App",
            db=db,
        )

    if p12:
        # Resized and cropped version of solar light
        img_solar_resized = img_solar.resize((240, 180), Image.Resampling.LANCZOS)
        bytes_solar_crop = create_jpeg_with_exif(img_solar_resized, lat=25.3210, lon=82.9800, capture_date=datetime.datetime(2025, 9, 18, 16, 10))
        engine.ingest_and_analyze_file(
            project_id="MPL-00012",
            file_bytes=bytes_solar_crop,
            file_name="junction_light_pole.jpg",
            evidence_type="COMPLETION_PHOTO",
            title="Solar Light Pole Installed",
            description="Completion photo submitted for bill clearance",
            source="District Contractor Upload Portal",
            db=db,
        )

    # -------------------------------------------------------------
    # Scenario 3: GPS Inconsistency (MPL-00003) - Distant location
    # -------------------------------------------------------------
    p3 = db.query(Project).filter(Project.project_id == "MPL-00003").first()
    if p3:
        # Project is in Varanasi, but photo EXIF points to 18.5 km away in Mirzapur
        bytes_p3 = create_jpeg_with_exif(img_road, lat=25.1450, lon=82.8550, capture_date=datetime.datetime(2025, 10, 5, 15, 45))
        engine.ingest_and_analyze_file(
            project_id="MPL-00003",
            file_bytes=bytes_p3,
            file_name="road_paving_complete.jpg",
            evidence_type="COMPLETION_PHOTO",
            title="Link Road Paving Completion",
            description="Paved road segment evidence",
            source="eSAKSHI Mobile App",
            db=db,
        )

    # -------------------------------------------------------------
    # Scenario 4: Temporal Inconsistency (MPL-00004) - Captured before sanction
    # -------------------------------------------------------------
    p4 = db.query(Project).filter(Project.project_id == "MPL-00004").first()
    if p4:
        # Photo captured in 2024, but project sanctioned in late 2025
        bytes_p4 = create_jpeg_with_exif(img_water, lat=25.3180, lon=82.9750, capture_date=datetime.datetime(2024, 3, 10, 9, 15))
        engine.ingest_and_analyze_file(
            project_id="MPL-00004",
            file_bytes=bytes_p4,
            file_name="tubewell_tank.jpg",
            evidence_type="COMPLETION_PHOTO",
            title="Community Water Tank Installed",
            description="Tank completion inspection snapshot",
            source="Field Audit Upload",
            db=db,
        )

    # -------------------------------------------------------------
    # Scenario 5: Verified Compliant Projects (MPL-00005 to MPL-00025)
    # -------------------------------------------------------------
    for idx, proj in enumerate(projects[4:25], start=5):
        pid = proj.project_id
        loc = proj.location
        plat = loc.latitude if (loc and loc.latitude) else 25.3100
        plon = loc.longitude if (loc and loc.longitude) else 82.9700

        # Unique photo with authentic GPS within 30 meters
        scene = ["road_work", "community_hall", "solar_light", "water_tank"][idx % 4]
        img_unique = generate_scene_image(scene, seed=idx + 10)
        bytes_ok = create_jpeg_with_exif(
            img_unique,
            lat=plat + 0.0002,  # ~22 meters away
            lon=plon + 0.0001,
            capture_date=datetime.datetime(2026, 1, 15, 10 + (idx % 6), 30),
        )
        engine.ingest_and_analyze_file(
            project_id=pid,
            file_bytes=bytes_ok,
            file_name=f"{scene}_{pid}.jpg",
            evidence_type="COMPLETION_PHOTO",
            title=f"Site Completion Photo — {pid}",
            description="Verified geo-tagged physical inspection photograph",
            source="eSAKSHI Verified Inspector Device",
            db=db,
        )

    # -------------------------------------------------------------
    # Re-evaluate all projects with newly ingested evidence
    # -------------------------------------------------------------
    print("Evaluating evidence intelligence across seeded projects...")
    eval_count = 0
    for proj in projects[:30]:
        engine.evaluate_project_evidence(proj.project_id, db)
        eval_count += 1

    print(f"Successfully seeded evidence and evaluated {eval_count} projects!")
    db.close()


if __name__ == "__main__":
    seed_evidence_data()
