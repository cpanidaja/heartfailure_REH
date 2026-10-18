# HFrEF FMT coverage – unique HN, eligible-adjusted (18 Oct 2026)

## Scope of the hero statistic
The hero's **117** is the number of unique HN among *all* HF phenotypes in the selected period. The hero's HFrEF FMT indicator uses a **different denominator**:

- Select the latest source row (service date, then row number) for each HN **within the selected date/clinic filters**.
- Restrict to `AU = HFrEF`.
- Per patient, inspect the four drug-group status/name pairs: `I/J`, `L/M`, `O/P`, `R/S`.
- `ใช่` = received, and remains in eligible denominator.
- `ไม่ใช่` = eligible but not received, unless the drug-name/reason cell documents `ข้อจำกัด`.
- `ข้อจำกัด` in status OR `ข้อจำกัด` recorded in the drug-name/reason field when the status is `ไม่ใช่` = **excluded from eligible drug denominator**; ambiguous name/status entries are flagged for review.
- An empty/unrecognized status makes the patient's coverage not assessable; none of the four eligible classes makes coverage not assessable.
- A patient is **complete** if eligible class count > 0, all drug statuses are assessable, and received count equals eligible count.
- **Patient KPI** = complete HFrEF unique HN / assessable HFrEF unique HN × 100. This is not a measure of MTD and not the visit-based AV Eligible rate.

## 1–31 Oct 2026 verification from HF_Patient_Data (snapshot checked 18 Oct 2026)
| Item | Count |
| --- | ---: |
| All unique HN | 117 |
| HFrEF unique HN | 106 |
| HFrEF assessable for coverage | 100 |
| Complete HFrEF eligible-adjusted FMT | **86** |
| HFrEF with FMT gap | 14 |
| HFrEF with no eligible class | 5 |
| HFrEF with missing/unknown drug-group status | 1 |
| Provisional coverage | **86.0%** |

**Caution:** October 19–31 is in the future as at the audit date. Figures covering the whole calendar month are provisional recorded entries, not yet completed care.

## Deployment
1. The frontend is published from `main/index.html` through GitHub Pages. It no longer renders the server's visit-based `d.eligibleComplete / d.eligibleCount` beside unique-HN patient count.
2. For efficient **live** patient aggregation, copy the contents of `AppsScript_FMTEligibility.gs` into the existing protected Apps Script project for the HF Clinic. Do **not** create a public unauthenticated API route.
3. Add the following case **inside the existing authenticated dispatch**, after token verification and alongside the other authenticated methods:

   ```javascript
   case 'getFmtPatientCoverage':
     return hfReadFmtPatientCoverage_(args[0] || {});
   ```

4. Deploy the **existing** Web app via Manage deployments → Edit → New version → Deploy. Do not publish a separate unprotected deployment.
5. Log in to the HF Clinic web app, select 01/10/2026–31/10/2026 and clinic `ทั้งหมด`, and press the main refresh button. The hero should show `86 / 100` (`86.0%`) **if the source rows remain unchanged**. For other date filters, the counts must be recomputed. UI distinguishes `ข้อมูลสดจากทะเบียน` from an audited, dated fallback.
6. Confirm results against the source independently after fixing any data-quality discrepancies. Three latest HFrEF rows had `ข้อจำกัด` documented in name/reason although the status was `ไม่ใช่`, so these cases need pharmacist review. Do not silently rewrite patient source rows without assessment.

## Validation performed
- 18 Oct: independently recomputed 117 unique HNs / 106 HFrEF / 86 complete / 100 assessable using source rows (duplicates counted only once using latest service date).
- Backend syntax compiled and synthetic test passed covering duplicate HN, eligible-adjusted 2/2, gaps, no eligible class, missing status, and non-HFrEF exclusion.
- Both HTML inline scripts compiled without JavaScript syntax errors.
- GitHub Pages deployment succeeded for the `main` update commit; **protected login and runtime Apps Script deployment require a separate authenticated production check**.

## Security
The published GitHub repository contains only **aggregate** data and UI logic for this KPI; do not add HN, CID, patient names, row-level records, access tokens, or API keys to public files.
