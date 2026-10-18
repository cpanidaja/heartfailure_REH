/**
 * HFrEF eligible-adjusted FMT patient coverage (unique HN).
 *
 * Install into the EXISTING authenticated Apps Script project; never expose
 * this function as a public doGet/doPost endpoint.
 *
 * Inside dispatch() AFTER verifying the user's session token, add:
 *
 *   case 'getFmtPatientCoverage':
 *     return hfReadFmtPatientCoverage_(args[0] || {});
 *
 * This routine returns AGGREGATE COUNTS ONLY; it never returns patient data.
 * It measures receipt of eligible FMT classes, not MTD or a prescribing order.
 */
function hfReadFmtPatientCoverage_(filters) {
  var ss = SpreadsheetApp.openById('11JO_Cnil70XzP7ACDmW00IPYvtS0QCwPhRuftFYts7U');
  var sheet = ss.getSheetByName('HF_Patient_Data');
  if (!sheet) throw new Error('FMT_COVERAGE_MISSING_SHEET');
  var tz = ss.getSpreadsheetTimeZone() || 'Asia/Bangkok';
  var now = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  filters = filters || {};
  var start = String(filters.start || '');
  var end = String(filters.end || '');
  var clinic = String(filters.clinic || 'ทั้งหมด');
  if ((start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) ||
      (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) ||
      (start && end && start > end)) {
    throw new Error('FMT_COVERAGE_INVALID_DATE_FILTER');
  }

  function iso(s) {
    s = String(s == null ? '' : s).trim();
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) {
      var y = Number(m[3]);
      if (y > 2400) y -= 543;
      return y+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }
  function classify(status, drugName) {
    status = String(status == null ? '' : status).trim();
    drugName = String(drugName == null ? '' : drugName).trim();
    if (status.indexOf('ข้อจำกัด') >= 0) return 'limited';
    if (status === 'ใช่') return 'received';
    if (status === 'ไม่ใช่' && drugName.indexOf('ข้อจำกัด') >= 0) return 'limited-in-name';
    if (status === 'ไม่ใช่') return 'missing';
    return 'unknown';
  }

  var first = 6;
  var last = Math.min(sheet.getLastRow(), sheet.getMaxRows());
  // B:BC includes service date B, clinic C, HN D, four drug status/name
  // pairs (I/J, L/M, O/P, R/S), phenotype AU and HF confirmation BC.
  var values = last >= first ? sheet.getRange(first, 2, last-first+1, 54).getDisplayValues() : [];
  var latest = new Map();
  var matchedVisits = 0;
  var futureVisits = 0;
  values.forEach(function(v, i) {
    var hn = String(v[2] || '').trim();
    if (!hn) return;
    var date = iso(v[0]);
    if ((start || end) && !date) return;
    if (start && date < start || end && date > end) return;
    if (clinic !== 'ทั้งหมด' && clinic !== String(v[1] || '').trim()) return;
    matchedVisits++;
    if (date && date > now) futureVisits++;
    var previous = latest.get(hn);
    if (!previous || date > previous.date || (date === previous.date && i > previous.order)) {
      latest.set(hn, {date:date, order:i, row:v});
    }
  });

  var summary = {
    schemaVersion:1, definitionVersion:'HFR-EA-HN-20261018',
    source:'HF_Patient_Data', mode:'live', unit:'unique-patients',
    checkedAt:Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ss"),
    filters:{start:start,end:end,clinic:clinic},
    totalPatients:latest.size, totalVisits:matchedVisits,
    hfrEFPatients:0, assessedPatients:0, completePatients:0,
    gapPatients:0, noEligibleClass:0, incompleteDrugStatus:0,
    limitationPatients:0, contradictionPatients:0, futureVisits:futureVisits,
    pct:null
  };
  latest.forEach(function(v) {
    var row = v.row;
    if (String(row[45] || '').trim() !== 'HFrEF') return; // AU
    summary.hfrEFPatients++;
    var states = [
      classify(row[7],row[8]),   // I/J: RAASi
      classify(row[10],row[11]), // L/M: beta-blocker
      classify(row[13],row[14]), // O/P: MRA
      classify(row[16],row[17])  // R/S: SGLT2i
    ];
    var got=0, eligible=0;
    states.forEach(function(s) {
      if (s === 'received') {got++; eligible++;}
      if (s === 'missing') eligible++;
    });
    if (states.some(function(s){return s==='limited'||s==='limited-in-name';})) summary.limitationPatients++;
    if (states.some(function(s){return s==='limited-in-name';})) summary.contradictionPatients++;
    if (states.indexOf('unknown')>=0) {
      summary.incompleteDrugStatus++;
      return;
    }
    if (!eligible) {summary.noEligibleClass++;return;}
    summary.assessedPatients++;
    if (got===eligible) summary.completePatients++;
    else summary.gapPatients++;
  });
  if (summary.hfrEFPatients !== summary.assessedPatients + summary.noEligibleClass + summary.incompleteDrugStatus) {
    throw new Error('FMT_COVERAGE_BASIS_MISMATCH');
  }
  summary.pct = summary.assessedPatients
    ? 100*summary.completePatients/summary.assessedPatients : null;
  return summary;
}
