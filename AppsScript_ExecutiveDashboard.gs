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
  const dashboard = book.getSheetByName('Dashboard');
  if (!sheet || !metrics || !dashboard) {
    throw new Error('EXEC_DASHBOARD_MISSING: ไม่พบแท็บ Executive_Dashboard, _Executive_Metrics หรือ Dashboard');
  }

  // Bounded aggregate ranges only. getValues() returns percentage fractions
  // (e.g. 0.841) for numeric percentage cells; do not parse rounded display strings.
  const reg = sheet.getRange('A6:M6').getValues()[0];
  const kpiRows = sheet.getRange('A14:E21').getValues();
  const gdmtRows = sheet.getRange('A34:D37').getValues();
  const mtdRows = metrics.getRange('B2:B4').getValues();
  const eligibilityRow = dashboard.getRange('B31:D31').getValues()[0];
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

  // FMT eligibility counts EVERY assessed visit, including repeated HN.
  // Only source rows with nonblank HN and AV are included in Dashboard!B31:D31.
  const eligibilityNumerator = count(eligibilityRow[0], 'Dashboard!B31');
  const eligibilityDenominator = count(eligibilityRow[1], 'Dashboard!C31');
  const eligibilityPct = percentFraction(eligibilityRow[2], 'Dashboard!D31');
  if (!eligibilityDenominator || eligibilityNumerator > eligibilityDenominator ||
      Math.abs(eligibilityPct - 100*eligibilityNumerator/eligibilityDenominator) > 0.011) {
    throw new Error('EXEC_DASHBOARD_ELIGIBILITY_MISMATCH: ตรวจสอบ Dashboard!B31:D31');
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
  if (count(reg[0], 'Executive_Dashboard!A6') !== denominator ||
      eligibilityDenominator > denominator ||
      denominator - eligibilityDenominator < 0) {
    throw new Error('EXEC_DASHBOARD_BASIS_MISMATCH: MTD และ FMT eligibility ต้องอ้างอิงระเบียนที่มี HN ทั้งทะเบียน');
  }
  if (Math.abs(kpis[7].actual - eligibilityPct)>0.011) {
    throw new Error('EXEC_DASHBOARD_ELIGIBILITY_MISMATCH: Executive_Dashboard!B21 ไม่ตรง Dashboard!D31');
  }
  if (Math.abs(kpis[1].actual - mtdRate)>0.011) {
    throw new Error('EXEC_DASHBOARD_MTD_MISMATCH: Executive_Dashboard!B15 ไม่ตรง _Executive_Metrics');
  }

  return {
    schemaVersion:2,
    definitionVersion:'HF-ALL-ROWS-20261017',
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
    eligibility:{
      numerator:eligibilityNumerator,
      denominator:eligibilityDenominator,
      pct:eligibilityPct,
      pending:eligibilityDenominator-eligibilityNumerator,
      missing:Math.max(0,count(reg[0],'A6')-eligibilityDenominator),
      unit:'visits'
    },
    kpis:kpis,
    gdmt:gdmt,
    sourceCoordinates:{
      registry:'Executive_Dashboard!A6:M6',
      kpis:'Executive_Dashboard!A14:E21',
      gdmt:'Executive_Dashboard!A34:D37',
      mtd:'_Executive_Metrics!B2:B4',
      eligibility:'Dashboard!B31:D31'
    }
  };
}


/**
 * Read aggregate GDMT status from every registry row with a nonempty HN.
 *
 * All four drug limitation classes and BB appropriateness use the SAME
 * all-registry denominator; duplicates count as separate visit records.
 * This intentionally ignores dashboard date/clinic filters and MUST be shown
 * as "ทั้งทะเบียน" in the UI. No names/HNs/row-level records leave Apps Script.
 * Dispatch only AFTER authentication:
 *
 *   case 'getGdmtReviewSummary':
 *     return hfReadGdmtReviewSummary_();
 */
function hfReadGdmtReviewSummary_() {
  const SPREADSHEET_ID = '11JO_Cnil70XzP7ACDmW00IPYvtS0QCwPhRuftFYts7U';
  const book = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = book.getSheetByName('HF_Patient_Data');
  if (!sheet) {
    throw new Error('HF_GDMT_MISSING: ไม่พบแท็บ HF_Patient_Data');
  }

  const startRow = 6;
  const endRow = Math.min(sheet.getMaxRows(), Math.max(5, sheet.getLastRow()));
  const length = Math.max(0, endRow - startRow + 1);
  const rows = length
    ? sheet.getRange(startRow, 2, length, 53).getDisplayValues() // B:BB
    : [];
  // Offset inside B:BB: D=2, I=7, L=10, O=13, R=16, AU=45, BB=52
  // B is index 0, BB is column 54 (index 52). Do not read/display E (name).
  const result = {
    schemaVersion:2,
    definitionVersion:'HF-ALL-ROWS-20261017',
    source:'HF_Patient_Data',
    field:'BB',
    readMode:'live-aggregate',
    mode:'live',
    scope:'all_registry',
    asOf:Utilities.formatDate(new Date(), book.getSpreadsheetTimeZone() || 'Asia/Bangkok',"yyyy-MM-dd'T'HH:mm:ss"),
    visits:0,
    limitations:[0,0,0,0],
    assessed:0,
    appropriate:0,
    inappropriate:0,
    pending:0,
    unrecognized:0,
    bbDetected:true,
    constraintsDetected:true,
    phenotypes:{
      HFrEF:{good:0,bad:0},
      HFpEF:{good:0,bad:0}
    }
  };
  for (var i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hn = String(row[2] == null ? '' : row[2]).trim(); // D
    if (!hn) continue;
    result.visits++;
    [7,10,13,16].forEach(function(index,j) {
      if (String(row[index] == null ? '' : row[index]).trim() === 'ข้อจำกัด') {
        result.limitations[j]++;
      }
    });
    const assessment = String(row[52] == null ? '' : row[52]).trim(); // BB
    const phenotype = String(row[45] == null ? '' : row[45]).trim(); // AU
    if (assessment === 'เหมาะสม' || assessment === 'ไม่เหมาะสม') {
      result.assessed++;
      if (assessment === 'เหมาะสม') {
        result.appropriate++;
        if (result.phenotypes[phenotype]) result.phenotypes[phenotype].good++;
      } else {
        result.inappropriate++;
        if (result.phenotypes[phenotype]) result.phenotypes[phenotype].bad++;
      }
    } else {
      result.pending++;
      if (assessment) result.unrecognized++;
    }
  }
  if (result.visits !== result.assessed + result.pending ||
      result.assessed !== result.appropriate + result.inappropriate) {
    throw new Error('HF_GDMT_INVARIANT: จำนวนครั้งบริการไม่สอดคล้อง');
  }
  return result;
}
