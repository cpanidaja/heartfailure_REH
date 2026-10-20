CREATE TABLE IF NOT EXISTS hf_visit (
  visit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  synthetic_patient_key TEXT NOT NULL
    CHECK (synthetic_patient_key ~ '^SYN-[0-9]{5,}$'),
  visit_date DATE NOT NULL,
  phenotype TEXT NOT NULL CHECK (phenotype IN ('HFrEF', 'HFpEF', 'Unclassified')),
  gdmt_appropriateness TEXT NOT NULL CHECK (
    gdmt_appropriateness IN ('เหมาะสม', 'ไม่เหมาะสม', 'รอประเมิน', 'ไม่ระบุ')
  ),
  fmt_eligibility TEXT NOT NULL CHECK (
    fmt_eligibility IN ('Eligible', 'ข้อจำกัด', 'ต้องประเมินเพิ่ม', 'ไม่ระบุ')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supports date-window dashboard reads and patient history lookup.
CREATE INDEX IF NOT EXISTS hf_visit_date_idx ON hf_visit (visit_date);
CREATE INDEX IF NOT EXISTS hf_visit_patient_date_idx
  ON hf_visit (synthetic_patient_key, visit_date DESC);
CREATE INDEX IF NOT EXISTS hf_visit_dashboard_idx
  ON hf_visit (visit_date, phenotype, gdmt_appropriateness);

ANALYZE hf_visit;
