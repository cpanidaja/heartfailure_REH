/* One reporting definition for every overview chart. No patient data is embedded. */
(function(root){
'use strict';
const text=v=>String(v??'').trim();
const hn=v=>text(v).replace(/^0+(?=\d)/,'');
function iso(v){
 if(typeof v==='number'&&Number.isFinite(v)&&v>0)return new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000).toISOString().slice(0,10);
 const s=text(v),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/);
 let out=m?`${+m[3]>2400?+m[3]-543:+m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s)?s.slice(0,10):'');
 const date=out?new Date(out+'T12:00:00Z'):null;return date&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===out?out:'';
}
function classify(status,reason){
 const s=text(status);if(s.includes('ข้อจำกัด'))return 'limited';
 if(s==='ใช่')return 'got';
 if(s==='ไม่ใช่')return text(reason).includes('ข้อจำกัด')?'limited':'missing';
 return 'unknown';
}
const defs=[['ACEi/ARB/ARNI','I','J'],['β-blocker','L','M'],['MRA','O','P'],['SGLT2i','R','S']];
const rate=(a,b)=>b?100*a/b:null;
const values=r=>r.values||r;
const phenotype=v=>['HFrEF','HFpEF'].includes(text(v.AU))?text(v.AU):(text(v.AT)!==''&&Number.isFinite(Number(v.AT))?(Number(v.AT)<50?'HFrEF':'HFpEF'):'');
const states=v=>defs.map(([,k,n])=>classify(v[k],v[n]));
function complete(st){const n=st.filter(x=>x==='got').length,d=st.filter(x=>x==='got'||x==='missing').length;return {n,d,assessed:!st.includes('unknown')&&d>0,unknown:st.includes('unknown'),full:!st.includes('unknown')&&d>0&&n===d};}
function limitationReason(value){
 const s=text(value).toLowerCase();
 const rules=[['สิทธิการรักษา / การเข้าถึงยา',/สิทธิ|ราคา|ค่าใช้จ่าย|เข้าไม่ถึง|access|cost/],['โพแทสเซียมสูง / Hyperkalemia',/hyperkal|โพแทสเซียมสูง|potassium high/],['ความดันต่ำ / Hypotension',/hypoten|ความดันต่ำ/],['ไต / CKD',/\bckd\b|renal|ไต|egfr/],['ชีพจรช้า / Bradycardia',/brady|ชีพจรช้า/],['หอบหืด / Bronchospasm',/asthma|bronchospasm|หอบหืด/],['ความเสี่ยง UTI',/\buti\b|urinary|ทางเดินปัสสาวะ/],['Gynecomastia',/gynecomastia|เต้านมโต/]];
 const found=rules.filter(([,pattern])=>pattern.test(s)).map(([label])=>label);
 return found.length>1?'ระบุหลายสาเหตุในรายการเดียว':found[0]||'ไม่ระบุสาเหตุที่จำแนกได้';
}
function limitationSummary(rows){
 const reasons=new Map(),classes=defs.map(([label])=>({label,count:0,reasons:new Map()}));let visits=0,total=0;
 rows.forEach(v=>{let limited=false;defs.forEach(([,k,n],i)=>{if(classify(v[k],v[n])!=='limited')return;limited=true;total++;const reason=limitationReason(v[n]),g=classes[i];g.count++;g.reasons.set(reason,(g.reasons.get(reason)||0)+1);reasons.set(reason,(reasons.get(reason)||0)+1);});if(limited)visits++;});
 const list=(m,total)=>[...m].map(([label,count])=>({label,count,total,percent:rate(count,total)})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
 return {scope:'HFrEF',visits:rows.length,limitedVisits:visits,total,missingReason:reasons.get('ไม่ระบุสาเหตุที่จำแนกได้')||0,classes:classes.map(g=>({...g,total:rows.length,percent:rate(g.count,rows.length),reasons:list(g.reasons,g.count)})),reasons:list(reasons,total)};
}
function aggregate(patients,drps,adrs,filters={},base={}){
 const f={start:filters.start||'',end:filters.end||'',clinic:filters.clinic||'ทั้งหมด'};
 const matches=r=>{const v=values(r),date=iso(v.B);return hn(v.D)&&(!(f.start||f.end)||date)&&(!f.start||date>=f.start)&&(!f.end||date<=f.end)&&(f.clinic==='ทั้งหมด'||text(v.C)===f.clinic);};
 const rows=patients.filter(matches),events=drps.filter(matches),adverse=adrs.filter(matches),vs=rows.map(values),hfr=vs.filter(v=>phenotype(v)==='HFrEF'),hfp=vs.filter(v=>phenotype(v)==='HFpEF');
 const unique=a=>new Set(a.map(v=>hn(v.D))).size;
 const count=(a,k,val)=>a.filter(v=>text(v[k])===val).length;
 const groups=(a,k)=>{const m=new Map();for(const r of a){const label=text(values(r)[k])||'ยังไม่ระบุ';m.set(label,(m.get(label)||0)+1);}return [...m].map(([label,count])=>({label,count,total:a.length,percent:rate(count,a.length)})).sort((a,b)=>b.count-a.count);};
 const gdmt=defs.map(([label,k,n])=>{let got=0,missing=0,limited=0,unknown=0;for(const v of hfr){const s=classify(v[k],v[n]);if(s==='got')got++;else if(s==='missing')missing++;else if(s==='limited')limited++;else unknown++;}return {label,count:got,total:got+missing,percent:rate(got,got+missing),missing,limited,unknown};});
 const fs=hfr.map(v=>complete(states(v))),scores=new Map();hfr.forEach(v=>{const c=complete(states(v)),label=c.unknown?'รอประเมิน':c.d?c.n+'/'+c.d:'ไม่มี eligible class';scores.set(label,(scores.get(label)||0)+1);});
 const assessed=fs.filter(c=>c.assessed).length,full=fs.filter(c=>c.full).length;
 const latest=new Map();rows.forEach((r,i)=>{const v=values(r),id=hn(v.D),date=iso(v.B),order=Number(r.row)||i,prev=latest.get(id);if(!prev||date>prev.date||date===prev.date&&order>prev.order)latest.set(id,{v,date,order});});
 const pv=[...latest.values()].map(r=>r.v),phfr=pv.filter(v=>phenotype(v)==='HFrEF'),pcs=phfr.map(v=>complete(states(v)));
 const patientFmt={schemaVersion:1,definitionVersion:'HFR-EA-HN-20261018',source:'HF_Patient_Data',mode:'record-aggregate',unit:'unique-patients',filters:f,checkedAt:new Date().toISOString(),totalPatients:pv.length,totalVisits:rows.length,hfrEFPatients:phfr.length,assessedPatients:pcs.filter(c=>c.assessed).length,completePatients:pcs.filter(c=>c.full).length,gapPatients:pcs.filter(c=>c.assessed&&!c.full).length,noEligibleClass:pcs.filter(c=>!c.unknown&&!c.d).length,incompleteDrugStatus:pcs.filter(c=>c.unknown).length};
 patientFmt.pct=rate(patientFmt.completePatients,patientFmt.assessedPatients);
 const ev=events.map(values),av=adverse.map(values),resolved=v=>[v.M,v.P,v.O].some(x=>['แก้ไขสำเร็จ','Resolved'].includes(text(x))),resolvedEvents=ev.filter(resolved).length;
 const review={visits:vs.length,assessed:count(vs,'BB','เหมาะสม')+count(vs,'BB','ไม่เหมาะสม'),appropriate:count(vs,'BB','เหมาะสม'),inappropriate:count(vs,'BB','ไม่เหมาะสม'),limitations:defs.map(([,k,n])=>vs.filter(v=>classify(v[k],v[n])==='limited').length),phenotypes:{},readMode:'live-aggregate',asOf:new Date().toISOString()};review.pending=review.visits-review.assessed;for(const p of ['HFrEF','HFpEF']){const a=vs.filter(v=>phenotype(v)===p);review.phenotypes[p]={good:count(a,'BB','เหมาะสม'),bad:count(a,'BB','ไม่เหมาะสม')};}
 const average=k=>{const a=vs.map(v=>v[k]).filter(v=>text(v)!==''&&Number.isFinite(Number(v))).map(Number);return {n:a.length,value:a.length?a.reduce((a,b)=>a+b,0)/a.length:null};};
 const months=new Map();if(f.start&&f.end){for(let m=f.start.slice(0,7),i=0;m<=f.end.slice(0,7)&&i<1200;i++){months.set(m,{label:m,visits:0,newCases:0});const d=new Date(m+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);m=d.toISOString().slice(0,7);}}
 for(const v of vs){const key=iso(v.B).slice(0,7);if(!key)continue;if(!months.has(key))months.set(key,{label:key,visits:0,newCases:0});const m=months.get(key);m.visits++;if(text(v.H)==='New case')m.newCases++;}
 const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const d={...base,definitionVersion:'HF-FILTERED-20261106',filters:f,updatedAt:new Date().toISOString(),total:rows.length,patientCount:unique(vs),newVisits:count(vs,'H','New case'),newPatients:unique(vs.filter(v=>text(v.H)==='New case')),gdmt,gap:gdmt.map(g=>({label:g.label,count:g.missing,total:g.total,percent:rate(g.missing,g.total)})),fmtScores:[...scores].map(([label,count])=>({label,count})),eligibleCount:assessed,eligibleComplete:full,hfrCount:hfr.length,hfpCount:hfp.length,hfpComplete:hfp.filter(v=>complete(states(v).slice(2)).full).length,patientFmt,review,
 mtdNumerator:count(vs,'X','ใช่'),mtdDenominator:vs.length,adherenceNumerator:count(vs,'Y','ใช่'),adherenceDenominator:count(vs,'Y','ใช่')+count(vs,'Y','ไม่ใช่'),eligibilityNumerator:count(vs,'AV','Eligible'),eligibilityDenominator:vs.filter(v=>text(v.AV)!=='').length,
 drpEvents:ev.length,drpPatients:unique(ev),drpResolvedEvents:resolvedEvents,drpVisits:vs.filter(v=>text(v.Z)==='ใช่').length,drpEventResolution:rate(resolvedEvents,ev.length),drpResolution:rate(resolvedEvents,ev.length),drpPatientResolution:rate(unique(ev.filter(resolved)),unique(ev)),drpTypes:groups(ev,'F'),interventions:groups(ev,'I'),outcomes:groups(ev,'P'),acceptance:groups(ev,'Q'),adrEvents:av.length,typeAEvents:count(av,'J','ใช่'),preventableEvents:count(av,'K','ใช่'),adrGroups:groups(av,'F'),
 readmissionCount:count(vs,'AN','ใช่'),readmission:rate(count(vs,'AN','ใช่'),vs.length),mortality:rate(count(vs,'AO','ใช่'),vs.length),kccq:average('AQ'),satisfaction:average('AP'),trend:[...months.values()].sort((a,b)=>a.label.localeCompare(b.label)),trendMode:'monthly',
 actualUse:defs.map(([label,k,n])=>{const count=vs.filter(v=>classify(v[k],v[n])==='got').length;return {label,count,total:vs.length,percent:rate(count,vs.length)};}),actualLimitations:{...limitationSummary(vs),scope:'ทุก phenotype'},limitationAnalysis:limitationSummary(hfr),quality:{...base.quality,missingPhenotype:vs.filter(v=>!phenotype(v)).length,missingEligibility:vs.filter(v=>!text(v.AV)).length,missingAdherence:vs.filter(v=>!['ใช่','ไม่ใช่'].includes(text(v.Y))).length,unknownDrugStatus:hfr.filter(v=>states(v).includes('unknown')).length,missingKccq:vs.filter(v=>text(v.AQ)==='').length,unassessedPreventable:av.filter(v=>!['ใช่','ไม่ใช่'].includes(text(v.K))).length,missingDate:patients.filter(r=>hn(values(r).D)&&!iso(values(r).B)).length,futureDatedRows:vs.filter(v=>iso(v.B)>now).length},overdue:base.overdue||rows.filter(r=>iso(values(r).AZ)&&iso(values(r).AZ)<now).map(r=>({row:r.row,hn:text(values(r).D),date:iso(values(r).AZ),action:text(values(r).AY)})),priorities:base.priorities||[],reviewStatus:base.reviewStatus||[],summaryAvailable:Object.prototype.hasOwnProperty.call(base,'summary'),planEvents:base.planEvents??null,doseEvents:base.doseEvents??null,summary:base.summary||''};
 return d;
}
root.HFOverview={aggregate,iso,hn,classify,complete,limitationReason,limitationSummary};if(typeof module!=='undefined')module.exports=root.HFOverview;
})(globalThis);
