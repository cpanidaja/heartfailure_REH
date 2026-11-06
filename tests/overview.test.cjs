const assert=require('node:assert/strict');const {aggregate,iso,hn,classify}=require('../overview-core');
const record=(row,v)=>({row,values:{B:'2026-10-01',C:'HF',D:'1',AU:'HFrEF',I:'ใช่',L:'ใช่',O:'ข้อจำกัด',R:'ข้อจำกัด',X:'ใช่',Y:'ใช่',AV:'Eligible',BB:'เหมาะสม',...v}});
const f={start:'2025-10-01',end:'2026-11-30',clinic:'ทั้งหมด'};
assert.equal(iso('01/10/2568'),'2025-10-01');assert.equal(iso(46051),'2026-01-29');assert.equal(iso('30/11/2026'),'2026-11-30');assert.equal(hn('000123'),'123');assert.equal(classify('ไม่ใช่','ข้อจำกัด'),'limited');assert.equal(classify('ไม่ใช่',''),'missing');
const rows=[record(6,{D:'0001',B:'01/10/2568'}),record(7,{D:1,I:'ไม่ใช่'}),record(8,{D:'2',B:'30/11/2569',I:'ไม่ใช่',J:'ข้อจำกัด'}),record(9,{D:'3',B:'2026-11-30',R:''}),record(10,{D:'4',B:'2026-12-01'}),record(11,{D:'5',B:'',R:'ใช่'})];
const d=aggregate(rows,[record(6,{D:'0001',M:'แก้ไขสำเร็จ'}),record(7,{D:'1',M:'รอติดตาม'})],[],f);
assert.equal(d.total,4);assert.equal(d.patientCount,3);assert.equal(d.patientFmt.completePatients,1);assert.equal(d.patientFmt.assessedPatients,2);assert.equal(d.eligibleCount,3);assert.equal(d.eligibleComplete,2);assert.equal(d.gdmt.length,4);
for(let i=0;i<4;i++){const a=d.gdmt[i],b=d.gap[i];assert.equal(a.total,b.total);if(a.total)assert.ok(Math.abs(a.percent+b.percent-100)<1e-9);assert.equal(a.count+a.missing+a.limited+a.unknown,d.hfrCount);}
assert.equal(d.drpEvents,2);assert.equal(d.drpPatients,1);assert.equal(d.drpEventResolution,50);assert.equal(d.adherenceDenominator,4);assert.equal(d.trend.reduce((n,r)=>n+r.visits,0),d.total);assert.equal(d.trend.length,14);
const empty=aggregate([],[],[],f);assert.equal(empty.drpPatients,0);assert.equal(empty.patientCount,0);assert.equal(empty.drpEventResolution,null);assert.equal(empty.gdmt[0].percent,null);
const zero=aggregate([record(6,{I:'ข้อจำกัด',L:'ข้อจำกัด',O:'ข้อจำกัด',R:'ข้อจำกัด'})],[],[],f);assert.equal(zero.eligibleCount,0);assert.equal(zero.patientFmt.noEligibleClass,1);
const clinic=aggregate(rows,[],[],{...f,clinic:'other'});assert.equal(clinic.total,0);
console.log('Overview tests passed: dates, boundaries, padded HN, latest visit, limitations, pending data, empty denominators, clinic and event units.');
