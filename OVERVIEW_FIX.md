# Overview reporting consistency

All overview panels now use one authenticated, paginated read of HF_Patient_Data,
DRP_Log, and ADR_TypeA_Log and one selected date/clinic scope. Login and write routes
are unchanged. Source rows are aggregated in memory and are never written to the
public repository or device storage. If any registry page is missing, the overview
fails explicitly instead of substituting historical snapshots.

- Service dates: inclusive start/end, Gregorian/Buddhist text dates and Sheets serials.
- Unique patients: normalize leading zeroes; latest date and row wins per HN.
- Drug coverage and gaps: HFrEF only, the same per-class denominator (received + missing).
  A recorded limitation, including a limitation recorded in the drug-name field when
  status is “ไม่ใช่”, is excluded from that class's denominator. Unknown stays unknown.
- Visit FMT: all four statuses assessed and at least one eligible class; n/n is complete,
  including 1/1, 2/2, and 3/3. Hero is separately labeled latest-per-HN, not visit FMT.
- MTD: yes / all visits with HN in scope. Adherence: yes / yes-or-no assessments.
- DRP: one log row is one event; patient count and visit count have separate units.
- Future-dated service rows are included if selected and explicitly flagged for review.
- Executive KPI and review panels no longer load static or all-registry snapshots.

## Validation

Run `node tests/overview.test.cjs`. Tests cover inclusive boundaries, Thai dates,
serial dates, leading-zero HN, latest visits, limitations, unknown statuses, empty
rates, clinic filtering, event units and monthly totals. Every inline script is also
syntax-checked. The real workbook's Dashboard and Executive_Dashboard aggregates
were compared with the same engine without exporting identifying records.

The deployed application remains authenticated; an authenticated browser session is
required to visually verify all production panels. No credentials are embedded.
