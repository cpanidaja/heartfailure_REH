/**
 * HF Clinic: secure Executive_Dashboard aggregate read.
 *
 * Installation: paste this entire file into the EXISTING Apps Script project
 * that already implements dispatch() and session-token validation.
 * Add a dispatch case AFTER authentication:
 *
 *   case 'getExecutiveDashboardSummary':
 *     return hfReadExecutiveDashboardSummary_();
 *
 * Never add this as an unauthenticated doGet()/doPost() route. Never put
 * patient-level values or a Google API key into the public GitHub repository.
 */
function hfReadExecutiveDashboardSummary_() {
  const SPREADSHEET_ID = '11JO_Cnil70XzP7ACDmW00IPYvtS0QCwPhRuftFYts7U';
  const book = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = book.getSheetByName('Executive_Dashboard');
  const metrics = book.getSheetByName('_Executive_Metrics');
  if (!sheet || !metrics) {
    throw new Error('EXEC_DASHBOARD_MISSING: ไม่พบแท็บ Executive_Dashboard หรือ _Executive_Metrics');
  }

  // Bounded aggregate ranges only. getValues() returns percentage fractions
  // (e.g. 0.841) for numeric percentage cells; do not parse rounded display strings.
  const reg = sheet.getRange('A6:M6').getValues()[0];
  const kpiRows = sheet.getRange('A14:E20').getValues();
  const gdmtRows = sheet.getRange('A34:D37').getValues();
  const mtdRows = metrics.getRange('B2:B4').getValues();
  const stamp = sheet.getRange('A3').getDisplayValue();
  const timeZone = book.getSpreadsheetTimeZone() || 'Asia/Bangkok';

  function numeric(v, description) {
    if (typeof v !== 'number' || !isFinite(v)) {
      throw new Error('EXEC_DASHBOARD_INVALID: '+description+' ไม่มีค่าตัวเลข');
    }
    return v;
  }
  function text(v) { return String(v == null ? '' : v).slice(0,400); }
  function count(v, description) {
    const n = numeric(v, description);
    if (n < 0 || !Number.isInteger(n)) {
      throw new Error('EXEC_DASHBOARD_INVALID: '+description+' ไม่ใช่จำนวนเต็มที่ถูกต้อง');
    }
    return n;
  }
  function percentFraction(v, description) {
    const n = numeric(v, description);
    if (n < 0 || n > 1) {
      throw new Error('EXEC_DASHBOARD_INVALID: '+description+' อยู่นอกช่วง 0–100%');
    }
    return 100*n;
  }

  const denominator = count(mtdRows[0][0], '_Executive_Metrics!B2');
  const numerator = count(mtdRows[1][0], '_Executive_Metrics!B3');
  const mtdRate = percentFraction(mtdRows[2][0], '_Executive_Metrics!B4');
  if (!denominator || numerator > denominator ||
      Math.abs(mtdRate - 100*numerator/denominator) > 0.011) {
    throw new Error('EXEC_DASHBOARD_MTD_MISMATCH: ตรวจสอบ _Executive_Metrics!B2:B4');
  }

  const gdmt = gdmtRows.map(function(r, i) {
    const row = 34+i;
    const received = count(r[2], 'C'+row);
    const assessed = count(r[3], 'D'+row);
    const percentage = percentFraction(r[1], 'B'+row);
    if (assessed === 0 || received > assessed ||
        Math.abs(percentage - 100*received/assessed) > 0.011) {
      throw new Error('EXEC_DASHBOARD_GDMT_MISMATCH: ตรวจสอบแถว '+row);
    }
    return {label:text(r[0]),percent:percentage,
      received:received,assessed:assessed,sourceRow:row};
  });

  const kpis = kpiRows.map(function(r, i) {
    const row = 14+i;
    const isCount = row === 19;
    const rate = isCount
      ? count(r[1], 'B'+row)
      : percentFraction(r[1], 'B'+row);
    const target = (typeof r[2] === 'number' && isFinite(r[2]))
      ? percentFraction(r[2], 'C'+row) : null;
    return {label:text(r[0]),actual:rate,target:target,
      description:text(r[4]),status:text(r[3]),
      sourceRow:row,unit:isCount?'count':'percent',
      lowerIsBetter:row===18};
  });
  if (Math.abs(kpis[1].actual - mtdRate)>0.011) {
    throw new Error('EXEC_DASHBOARD_MTD_MISMATCH: Executive_Dashboard!B15 ไม่ตรง _Executive_Metrics');
  }

  return {
    schemaVersion:1,
    source:'Executive_Dashboard',
    mode:'live',
    checkedAt:Utilities.formatDate(new Date(),timeZone,"yyyy-MM-dd'T'HH:mm:ss"),
    asOf:text(stamp),
    registry:{
      registeredShown:count(reg[0],'A6'),
      octoberVisits:count(reg[4],'E6'),
      octoberUnique:count(reg[8],'I6'),
      mtdNumerator:numerator,
      mtdDenominator:denominator,
      mtdPct:mtdRate,
      mtdCountDifference:denominator-count(reg[0],'A6')
    },
    kpis:kpis,
    gdmt:gdmt,
    sourceCoordinates:{
      registry:'Executive_Dashboard!A6:M6',
      kpis:'Executive_Dashboard!A14:E20',
      gdmt:'Executive_Dashboard!A34:D37',
      mtd:'_Executive_Metrics!B2:B4'
    }
  };
}
