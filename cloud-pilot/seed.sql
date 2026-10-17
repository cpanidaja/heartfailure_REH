-- Deterministic, non-identifiable fixture. Adjust 10000 to test larger volumes.
INSERT INTO hf_visit (
  synthetic_patient_key, visit_date, phenotype, gdmt_appropriateness, fmt_eligibility
)
SELECT
  'SYN-' || lpad((1 + ((n * 37) % 1800))::text, 5, '0'),
  DATE '2022-10-01' + ((n * 13) % 1460)::int,
  CASE WHEN n % 3 = 0 THEN 'HFrEF'
       WHEN n % 3 = 1 THEN 'HFpEF'
       ELSE 'Unclassified' END,
  CASE WHEN n % 5 = 0 THEN 'เหมาะสม'
       WHEN n % 5 = 1 THEN 'ไม่เหมาะสม'
       WHEN n % 5 = 2 THEN 'รอประเมิน'
       ELSE 'ไม่ระบุ' END,
  CASE WHEN n % 4 = 0 THEN 'Eligible'
       WHEN n % 4 = 1 THEN 'ข้อจำกัด'
       WHEN n % 4 = 2 THEN 'ต้องประเมินเพิ่ม'
       ELSE 'ไม่ระบุ' END
FROM generate_series(1, 10000) AS n;
