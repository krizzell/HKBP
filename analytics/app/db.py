from functools import lru_cache

from pymongo import MongoClient

from app.config import get_settings


@lru_cache
def get_client() -> MongoClient:
    return MongoClient(get_settings()["mongo_uri"])


def get_database():
    return get_client()[get_settings()["mongo_db"]]
