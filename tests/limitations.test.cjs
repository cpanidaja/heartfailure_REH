const assert=require('node:assert/strict');const {aggregate,limitationReason}=require('../overview-core');
const f={start:'2026-10-01',end:'2026-11-30',clinic:'ทั้งหมด'};
const record=(row,v)=>({row,values:{B:'2026-10-01',C:'HF',D:String(row),AU:'HFrEF',I:'ใช่',L:'ใช่',O:'ใช่',R:'ใช่',...v}});
const d=aggregate([record(6,{I:'ข้อจำกัด',J:'ข้อจำกัด CKD',R:'ข้อจำกัด',S:'ข้อจำกัดสิทธิการรักษา'}),record(7,{O:'ไม่ใช่',P:'ข้อจำกัด Hyperkalemia'}),record(8,{R:'ข้อจำกัด',S:'Spironolactone'}),record(9,{AU:'HFpEF',R:'ข้อจำกัด',S:'ข้อจำกัดสิทธิการรักษา'}),record(10,{B:'2026-12-01',R:'ข้อจำกัด',S:'ข้อจำกัดสิทธิการรักษา'})],[],[],f);
const a=d.limitationAnalysis;assert.equal(a.visits,3);assert.equal(a.limitedVisits,3);assert.equal(a.total,4);assert.equal(a.missingReason,1);assert.equal(a.classes.reduce((n,g)=>n+g.count,0),a.total);assert.equal(a.reasons.reduce((n,g)=>n+g.count,0),a.total);
for(const g of a.classes){assert.equal(g.total,3);assert.equal(g.reasons.reduce((n,r)=>n+r.count,0),g.count);}
assert.equal(a.reasons.find(r=>r.label.includes('สิทธิ')).count,1);assert.equal(d.gap[2].count,0);assert.equal(limitationReason('Spironolactone'),'ไม่ระบุสาเหตุที่จำแนกได้');assert.equal(limitationReason('ข้้อจำกัด Hypotension'),'ความดันต่ำ / Hypotension');assert.equal(limitationReason('CKD และ Hyperkalemia'),'ระบุหลายสาเหตุในรายการเดียว');
const empty=aggregate([],[],[],f).limitationAnalysis;assert.equal(empty.total,0);assert.equal(empty.classes[0].percent,null);
console.log('Limitations passed: reason categories, no inferred diagnoses, unknown reasons, per-class totals, multiple limits, HFrEF scope and date filter.');
