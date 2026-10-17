import os
from contextlib import contextmanager

import psycopg
from fastapi import FastAPI, HTTPException

app = FastAPI(title="HF Clinic Synthetic Performance Pilot", docs_url=None, redoc_url=None)


@contextmanager
def connection():
    instance = os.environ.get("INSTANCE_CONNECTION_NAME")
    if not instance:
        raise RuntimeError("INSTANCE_CONNECTION_NAME is not configured")
    conn = psycopg.connect(
        host=f"/cloudsql/{instance}",
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        connect_timeout=5,
        options="-c default_transaction_read_only=on",
    )
    try:
        yield conn
    finally:
        conn.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/summary")
def summary():
    query = """
      SELECT
        COUNT(*)::bigint AS visits,
        COUNT(DISTINCT synthetic_patient_key)::bigint AS unique_patients,
        COUNT(*) FILTER (WHERE fmt_eligibility = 'Eligible')::bigint
          AS eligibility_numerator,
        COUNT(*) FILTER (WHERE fmt_eligibility <> 'ไม่ระบุ')::bigint
          AS eligibility_denominator,
        COUNT(*) FILTER (WHERE gdmt_appropriateness = 'เหมาะสม')::bigint
          AS appropriate,
        COUNT(*) FILTER (WHERE gdmt_appropriateness = 'ไม่เหมาะสม')::bigint
          AS inappropriate
      FROM hf_visit
    """
    try:
        with connection() as conn, conn.cursor() as cur:
            cur.execute(query)
            row = cur.fetchone()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc

    visits, unique_patients, eligible, assessed, appropriate, inappropriate = row
    return {
        "visits": visits,
        "uniquePatients": unique_patients,
        "fmtEligibility": {
            "numerator": eligible,
            "denominator": assessed,
            "percent": round(100 * eligible / assessed, 2) if assessed else 0,
        },
        "gdmtAppropriateness": {
            "appropriate": appropriate,
            "inappropriate": inappropriate,
        },
        "dataClass": "synthetic-only",
    }
