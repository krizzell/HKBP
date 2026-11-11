from functools import lru_cache
import os
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


@lru_cache
def get_settings() -> dict[str, str]:
    values = dotenv_values(ROOT / ".env")
    return {
        "internal_key": os.getenv("INTERNAL_KEY", values.get("INTERNAL_KEY", "")),
        "mongo_uri": os.getenv("MONGO_URI", values.get("MONGO_URI", "mongodb://127.0.0.1:27017")),
        "mongo_db": os.getenv("MONGO_DB", values.get("MONGO_DB", "HKBP")),
        # Data warehouse (SQLite) hasil ETL: python -m etl.build_warehouse
        "warehouse_path": os.getenv("WAREHOUSE_PATH", values.get("WAREHOUSE_PATH", str(ROOT / "data" / "warehouse.db"))),
        # Artefak model ML (joblib + metrics.json) hasil: python -m app.ml.train
        "models_dir": os.getenv("MODELS_DIR", values.get("MODELS_DIR", str(ROOT / "models"))),
    }
