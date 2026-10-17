# HF Clinic Cloud SQL performance pilot

This pilot is an isolated, read-only aggregate service for **synthetic data only**. It does not connect to the clinic spreadsheet, accept patient data, or change the current Apps Script deployment.

## Purpose

Measure whether indexed PostgreSQL aggregates on Cloud SQL reduce backend response time compared with the current authenticated Apps Script calls. Compare the same aggregate definitions and the same synthetic row counts. Do not compare unrelated requests.

## Included

- `schema.sql`: minimal visit-level schema and indexes for performance testing.
- `seed.sql`: deterministic synthetic data generator (10,000 rows by default; change the series upper bound for larger trials).
- `service.py`: read-only aggregate endpoint.
- `benchmark.py`: reports median and p95 HTTP latency.
- `summary.py` and `test_summary.py`: testable response formatting logic.

The schema preserves repeated visits as separate rows. It uses synthetic keys only. Field names and calculations are a benchmark fixture, not a replacement for the approved production data dictionary.

## Test protocol

1. Record baseline response times for the current app's dashboard summary and GDMT summary using the same account, network, device, filters, and 30 repeated requests. Record cold start separately from warm requests. Do not place session tokens or patient data in logs.
2. Provision a **separate non-production** Cloud SQL PostgreSQL instance and a Cloud Run service in the same region. Use a region close to Roi Et and confirm data residency/security requirements with the hospital before any real data is considered.
3. Create the pilot database, run `schema.sql` then `seed.sql`, and deploy the service with Cloud Run IAM authentication enabled. Store the database password in Secret Manager; never commit credentials.
4. Run `benchmark.py` against the authenticated Cloud Run endpoint for 30 samples after 3 warmups. Also test 100,000+ synthetic rows and a small concurrent load.
5. Compare p50/p95 latency, error rate, result equivalence, instance utilization, and estimated monthly cost. Keep the current system as the source of truth during the pilot.
6. Only consider production migration after security review, data dictionary mapping, backup/restore test, access audit, cost approval, and a tested rollback plan.

## Local checks

```sh
python -m unittest -v cloud-pilot/test_summary.py
```

The unit tests validate response calculations without requiring Google Cloud. Actual Cloud SQL latency can only be measured after a pilot instance and Cloud Run service exist.

## Important

Do not export identifiable health data into this pilot. It intentionally has no import endpoint and returns aggregate counts only. A production design must also preserve the existing authentication checks and must not make a database endpoint public.
