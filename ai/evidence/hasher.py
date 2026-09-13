import hashlib
from pathlib import Path
from typing import Union, Dict, Any
from PIL import Image
import imagehash
import io

from backend.app.config import settings
from backend.app.utils.logger import logger


class EvidenceHasher:
    """
    Evidence Hashing Engine:
    1. Cryptographic SHA-256 for exact duplicate detection.
    2. Multi-Hash Perceptual Hashes (pHash, dHash, aHash) to detect resized,
       compressed, cropped, and format-converted near-duplicate photographs.
    """

    def __init__(self, hash_size: int = 8):
        self.hash_size = hash_size

    @staticmethod
    def compute_sha256(data_or_path: Union[str, Path, bytes, io.BytesIO]) -> str:
        """Computes SHA-256 cryptographic hash of raw file bytes."""
        hasher = hashlib.sha256()
        if isinstance(data_or_path, (str, Path)):
            with open(data_or_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
        elif isinstance(data_or_path, (bytes, bytearray)):
            hasher.update(data_or_path)
        elif isinstance(data_or_path, io.BytesIO):
            data_or_path.seek(0)
            hasher.update(data_or_path.read())
            data_or_path.seek(0)
        else:
            raise ValueError(f"Unsupported data type for SHA-256 computation: {type(data_or_path)}")
        return hasher.hexdigest()

    def compute_perceptual_hashes(self, image_or_path: Union[str, Path, bytes, Image.Image]) -> Dict[str, str]:
        """
        Computes pHash (DCT-based), dHash (gradient-based), and aHash (average-based).
        Tolerates resize, JPEG compression, minor color grade changes, and format conversions.
        """
        img = None
        should_close = False

        try:
            if isinstance(image_or_path, Image.Image):
                img = image_or_path.convert("RGB")
            elif isinstance(image_or_path, (str, Path)):
                img = Image.open(image_or_path).convert("RGB")
                should_close = True
            elif isinstance(image_or_path, (bytes, bytearray)):
                img = Image.open(io.BytesIO(image_or_path)).convert("RGB")
                should_close = True
            elif isinstance(image_or_path, io.BytesIO):
                image_or_path.seek(0)
                img = Image.open(image_or_path).convert("RGB")
            else:
                raise ValueError(f"Unsupported image input type: {type(image_or_path)}")

            ph = str(imagehash.phash(img, hash_size=self.hash_size))
            dh = str(imagehash.dhash(img, hash_size=self.hash_size))
            ah = str(imagehash.average_hash(img, hash_size=self.hash_size))

            return {
                "phash": ph,
                "dhash": dh,
                "ahash": ah,
            }
        except Exception as e:
            logger.warning(f"Failed to compute perceptual hashes: {e}")
            return {
                "phash": "0" * (self.hash_size ** 2 // 4),
                "dhash": "0" * (self.hash_size ** 2 // 4),
                "ahash": "0" * (self.hash_size ** 2 // 4),
            }
        finally:
            if should_close and img:
                img.close()

    @staticmethod
    def calculate_similarity(hash1_str: str, hash2_str: str) -> float:
        """
        Calculates normalized perceptual similarity (0.0 to 1.0) derived
        from hex string Hamming distance.
        1.0 = identical perceptual hash.
        """
        if not hash1_str or not hash2_str:
            return 0.0
        try:
            h1 = imagehash.hex_to_hash(hash1_str)
            h2 = imagehash.hex_to_hash(hash2_str)
            # Max possible hamming distance is total bits
            max_dist = len(h1.hash.flatten())
            dist = h1 - h2
            similarity = max(0.0, 1.0 - (dist / max_dist))
            return round(float(similarity), 4)
        except Exception as e:
            logger.warning(f"Error calculating hash similarity: {e}")
            return 0.0

    @classmethod
    def calculate_composite_similarity(cls, hashes1: Dict[str, str], hashes2: Dict[str, str]) -> float:
        """
        Calculates multi-hash composite perceptual similarity combining
        dHash (gradient/edge), pHash (frequency DCT), and aHash (average).
        """
        sim_p = cls.calculate_similarity(hashes1.get("phash", ""), hashes2.get("phash", ""))
        sim_d = cls.calculate_similarity(hashes1.get("dhash", ""), hashes2.get("dhash", ""))
        sim_a = cls.calculate_similarity(hashes1.get("ahash", ""), hashes2.get("ahash", ""))
        return round(0.4 * sim_d + 0.4 * sim_p + 0.2 * sim_a, 4)

    @staticmethod
    def classify_similarity_tier(similarity: float) -> str:
        """Classifies similarity score into configurable audit tiers."""
        if similarity >= settings.SIMILARITY_VERY_HIGH:
            return "VERY_HIGH"
        elif similarity >= settings.SIMILARITY_HIGH:
            return "HIGH"
        elif similarity >= settings.SIMILARITY_MODERATE:
            return "MODERATE"
        else:
            return "LOW"
