#!/bin/sh
# Menyiapkan warehouse & model bila belum ada, lalu menjalankan API.
set -e
if [ ! -f data/warehouse.db ]; then
  echo "Warehouse belum ada -> jalankan ETL dari MongoDB"
  python -m etl.build_warehouse --source mongo
fi
if [ ! -f models/model.joblib ]; then
  echo "Model belum ada -> latih model"
  python -m app.ml.train
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
