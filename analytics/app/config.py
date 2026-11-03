from functools import lru_cache
import os
from pathlib import Path

from dotenv import dotenv_values


@lru_cache
def get_settings() -> dict[str, str]:
    values = dotenv_values(Path(__file__).resolve().parents[1] / ".env")
    return {
        "internal_key": os.getenv("INTERNAL_KEY", values.get("INTERNAL_KEY", "")),
        "mongo_uri": os.getenv("MONGO_URI", values.get("MONGO_URI", "mongodb://127.0.0.1:27017")),
        "mongo_db": os.getenv("MONGO_DB", values.get("MONGO_DB", "HKBP")),
    }
