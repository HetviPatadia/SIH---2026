import io
import datetime
from pathlib import Path
from typing import Union, Dict, Any, Optional, Tuple
from PIL import Image, ExifTags

from backend.app.utils.logger import logger


class EvidenceMetadataExtractor:
    """
    Extracts and normalizes metadata from photographs and evidence files.
    Supports EXIF GPS parsing, capture timestamp extraction, and reliability scoring.
    Strict Rule: If GPS is absent, NEVER invent coordinates.
    """

    @staticmethod
    def _convert_to_degrees(value) -> Optional[float]:
        """Converts EXIF GPS coordinate tuple (degrees, minutes, seconds) to decimal degrees."""
        try:
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        except Exception:
            return None

    def extract_exif(self, image_or_path: Union[str, Path, bytes, Image.Image]) -> Dict[str, Any]:
        img = None
        should_close = False

        result = {
            "has_gps": False,
            "has_timestamp": False,
            "latitude": None,
            "longitude": None,
            "capture_time": None,
            "device_make": None,
            "device_model": None,
            "software": None,
            "width": 0,
            "height": 0,
            "metadata_source": "EXIF",
            "metadata_reliability": 0.0,
            "raw_tags": {},
        }

        try:
            if isinstance(image_or_path, Image.Image):
                img = image_or_path
            elif isinstance(image_or_path, (str, Path)):
                img = Image.open(image_or_path)
                should_close = True
            elif isinstance(image_or_path, (bytes, bytearray)):
                img = Image.open(io.BytesIO(image_or_path))
                should_close = True
            elif isinstance(image_or_path, io.BytesIO):
                image_or_path.seek(0)
                img = Image.open(image_or_path)
            else:
                return result

            result["width"], result["height"] = img.size

            # Attempt to extract EXIF
            exif_data = img._getexif() if hasattr(img, "_getexif") and callable(img._getexif) else None
            if not exif_data:
                return result

            gps_info = {}
            for tag_id, value in exif_data.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))

                if tag_name == "GPSInfo":
                    for key in value:
                        sub_tag = ExifTags.GPSTAGS.get(key, str(key))
                        gps_info[sub_tag] = value[key]
                elif tag_name == "DateTimeOriginal" or tag_name == "DateTime":
                    if not result["capture_time"]:
                        result["capture_time"] = self._parse_exif_date(str(value))
                        if result["capture_time"]:
                            result["has_timestamp"] = True
                elif tag_name == "Make":
                    result["device_make"] = str(value).strip()
                elif tag_name == "Model":
                    result["device_model"] = str(value).strip()
                elif tag_name == "Software":
                    result["software"] = str(value).strip()

            # Parse GPS if present
            if gps_info:
                lat = self._parse_gps_coord(gps_info.get("GPSLatitude"), gps_info.get("GPSLatitudeRef"))
                lon = self._parse_gps_coord(gps_info.get("GPSLongitude"), gps_info.get("GPSLongitudeRef"))

                if lat is not None and lon is not None:
                    # Validate geographic sanity
                    if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                        result["latitude"] = round(lat, 6)
                        result["longitude"] = round(lon, 6)
                        result["has_gps"] = True

            # Calculate metadata reliability
            # 1.0: Full GPS + Timestamp
            # 0.5: Timestamp only
            # 0.5: GPS only
            # 0.0: No metadata
            reliability = 0.0
            if result["has_gps"] and result["has_timestamp"]:
                reliability = 1.0
            elif result["has_gps"] or result["has_timestamp"]:
                reliability = 0.5
            result["metadata_reliability"] = reliability

            return result
        except Exception as e:
            logger.warning(f"Failed to parse EXIF metadata: {e}")
            return result
        finally:
            if should_close and img:
                img.close()

    def _parse_gps_coord(self, coord_tuple, ref: Optional[str]) -> Optional[float]:
        if not coord_tuple or not ref:
            return None
        deg = self._convert_to_degrees(coord_tuple)
        if deg is None:
            return None
        if ref.upper() in ["S", "W"]:
            deg = -deg
        return deg

    @staticmethod
    def _parse_exif_date(date_str: str) -> Optional[datetime.datetime]:
        """Parses standard EXIF format 'YYYY:MM:DD HH:MM:SS' or ISO formats."""
        if not date_str:
            return None
        formats = [
            "%Y:%m:%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%Y/%m/%d %H:%M:%S",
            "%Y:%m:%d",
            "%Y-%m-%d",
        ]
        clean_str = date_str.strip().split("\x00")[0]
        for fmt in formats:
            try:
                return datetime.datetime.strptime(clean_str, fmt)
            except ValueError:
                continue
        return None
