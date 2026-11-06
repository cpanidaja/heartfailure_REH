const assert=require('node:assert/strict'),{aggregate}=require('../overview-core');
const row=(i,v)=>({row:i,values:{B:'2026-10-01',C:'HF',D:String(i),AU:'HFrEF',I:'ใช่',L:'ใช่',O:'ข้อจำกัด',R:'ข้อจำกัด',...v}});
const d=aggregate([row(6,{}),row(7,{I:'ข้อจำกัด',J:'CKD'}),row(8,{AU:'HFpEF'})],[],[],{start:'2026-10-01',end:'2026-10-31',clinic:'ทั้งหมด'});
assert.equal(d.total,3);assert.equal(d.actualUse.length,4);assert.equal(d.actualUse[0].count,2);assert.equal(d.actualUse[0].total,3);assert.ok(Math.abs(d.actualUse[0].percent-200/3)<1e-9);assert.equal(d.gdmt[0].total,1);assert.equal(d.gdmt[0].percent,100);
assert.equal(d.actualLimitations.classes[0].count,1);assert.equal(d.actualLimitations.classes[0].total,3);assert.equal(d.actualLimitations.classes[2].count,3);assert.equal(d.actualLimitations.classes[2].percent,100);
for(const r of d.actualUse)assert.equal(r.total,d.total);for(const r of d.actualLimitations.classes)assert.equal(r.total,d.total);
const empty=aggregate([],[],[],{});assert.equal(empty.actualUse[0].percent,null);assert.equal(empty.actualLimitations.classes[0].percent,null);
console.log('Actual use passed: all phenotypes, shared visit denominator includes limitations and unknowns, kept separate from eligibility-adjusted rates.');
