from abc import ABC, abstractmethod
from typing import Union, List, Dict, Any
from pathlib import Path
import numpy as np
from PIL import Image
import io

from backend.app.utils.logger import logger


class BaseVisionEncoder(ABC):
    """Abstract interface for replaceable vision encoder backends."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @property
    @abstractmethod
    def model_version(self) -> str:
        pass

    @property
    @abstractmethod
    def embedding_dim(self) -> int:
        pass

    @abstractmethod
    def encode(self, image: Image.Image) -> List[float]:
        pass


class SpatialColorVisionEncoder(BaseVisionEncoder):
    """
    Lightweight, deterministic, zero-GPU spatial feature encoder.
    Divides the normalized image into a 4x4 spatial grid and computes
    normalized color-spatial distribution moments (RGB mean + variance per cell).
    Outputs a 64-dimensional L2-normalized vector.
    Tolerates format shifts, moderate cropping, and color shifts.
    """

    @property
    def model_name(self) -> str:
        return "vision_spatial_v1.0"

    @property
    def model_version(self) -> str:
        return "1.0.0"

    @property
    def embedding_dim(self) -> int:
        return 64  # 4x4 grid * 4 features (R_mean, G_mean, B_mean, Luminance_var)

    def encode(self, image: Image.Image) -> List[float]:
        # Resize to standard analysis canvas
        img = image.convert("RGB").resize((128, 128), Image.Resampling.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0  # (128, 128, 3)

        features = []
        cell_size = 32  # 128 / 4 = 32

        for r in range(4):
            for c in range(4):
                cell = arr[r * cell_size : (r + 1) * cell_size, c * cell_size : (c + 1) * cell_size]
                # RGB Means
                r_mean = float(np.mean(cell[:, :, 0]))
                g_mean = float(np.mean(cell[:, :, 1]))
                b_mean = float(np.mean(cell[:, :, 2]))

                # Luminance variance
                lum = 0.299 * cell[:, :, 0] + 0.587 * cell[:, :, 1] + 0.114 * cell[:, :, 2]
                lum_var = float(np.var(lum))

                features.extend([r_mean, g_mean, b_mean, lum_var])

        vec = np.array(features, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm

        return [round(float(x), 6) for x in vec.tolist()]


class VisionEmbeddingEngine:
    """
    Manages embedding generation, vector storage formatting,
    and cosine similarity calculation. Pluggable encoder support.
    """

    def __init__(self, encoder: BaseVisionEncoder = None):
        self.encoder = encoder or SpatialColorVisionEncoder()

    def generate_embedding(self, image_or_path: Union[str, Path, bytes, Image.Image]) -> Dict[str, Any]:
        img = None
        should_close = False

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
                raise ValueError(f"Unsupported image input: {type(image_or_path)}")

            embedding = self.encoder.encode(img)

            return {
                "model_name": self.encoder.model_name,
                "model_version": self.encoder.model_version,
                "embedding_dim": self.encoder.embedding_dim,
                "embedding_vector": embedding,
            }
        except Exception as e:
            logger.warning(f"Error generating vision embedding: {e}")
            return {
                "model_name": self.encoder.model_name,
                "model_version": self.encoder.model_version,
                "embedding_dim": self.encoder.embedding_dim,
                "embedding_vector": [0.0] * self.encoder.embedding_dim,
            }
        finally:
            if should_close and img:
                img.close()

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """Calculates cosine similarity between two normalized vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        try:
            v1 = np.array(vec1, dtype=np.float32)
            v2 = np.array(vec2, dtype=np.float32)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            if norm1 == 0 or norm2 == 0:
                return 0.0
            cos = np.dot(v1, v2) / (norm1 * norm2)
            # Clip between 0 and 1 for audit metric reporting
            return round(float(np.clip(cos, 0.0, 1.0)), 4)
        except Exception as e:
            logger.warning(f"Cosine similarity error: {e}")
            return 0.0
