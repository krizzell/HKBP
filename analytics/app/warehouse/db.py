"""Koneksi baca-saja ke data warehouse SQLite hasil ETL."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path

from app.config import get_settings


class WarehouseNotReady(RuntimeError):
    """Warehouse belum dibangun (jalankan: python -m etl.build_warehouse)."""


def warehouse_path() -> Path:
    return Path(get_settings()["warehouse_path"])


@contextmanager
def connect():
    path = warehouse_path()
    if not path.exists():
        raise WarehouseNotReady(
            f"Data warehouse belum ada di {path}. Jalankan: python -m etl.build_warehouse"
        )
    conn = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def query(sql: str, params: tuple | dict = ()) -> list[dict]:
    with connect() as conn:
        return [dict(row) for row in conn.execute(sql, params).fetchall()]
