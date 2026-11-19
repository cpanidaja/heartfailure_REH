/* Aggregate authenticated records in memory only. No patient data or snapshots. */
(function(root){
'use strict';
const tests=[
 ['cr','Creatinine','mg/dL','BV',.7,1.2,'0.7–1.2; ทวนช่วงอ้างอิงตามเพศ'],
 ['egfr','eGFR','mL/min/1.73 m²','BW',60,null,'ต่ำกว่า 60 (ไม่ใช่การยืนยัน CKD)'],
 ['k','Potassium','mmol/L','BX',3.5,5.1,'3.5–5.1'],
 ['fbs','FBS','mg/dL','BY',74,109,'74–109; ยืนยันอดอาหาร'],
 ['bun','BUN','mg/dL','CA',6,20,'6–20'],
 ['na','Sodium','mmol/L','CB',136,145,'136–145'],
 ['cl','Chloride','mmol/L','CC',98,107,'98–107'],
 ['co2','CO2','mmol/L','CD',22,29,'22–29'],
 ['tc','Cholesterol','mg/dL','CH',null,200,'สูง ≥200',true],
 ['tg','Triglyceride','mg/dL','CI',null,150,'สูง ≥150',true],
 ['ldl','LDL','mg/dL','CK',null,100,'สูง ≥100; เป้าหมายขึ้นกับความเสี่ยง',true],
 ['hb','Hb','g/dL','CN',null,null,'ชาย <13 หญิง <12; อายุ 15–65 ปี ไม่ตั้งครรภ์'],
 ['plt','Platelet','10³/µL','CO',140,400,'140–400']
].map(([id,label,unit,key,lo,hi,rule,inclusive])=>({id,label,unit,key,lo,hi,rule,inclusive}));
function iso(v){let s=String(v??'').trim(),m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),out='';if(m){let y=+m[3];if(y>2400)y-=543;out=`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}else if(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s))out=s.slice(0,10);if(!out)return '';const d=new Date(out+'T00:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===out?out:'';}
function number(v){return /^\d+(?:\.\d+)?$/.test(String(v??'').trim())?Number(v):null;}
function columns(schema){const fields=schema?.fields||[],find=(pattern,fallback)=>fields.find(f=>pattern.test(String(f.label||'').replace(/\s+/g,' ')))?.key||fallback;return {date:find(/วันที่อ้างอิงผลตรวจ/,'BU'),note:find(/^หมายเหตุ$/,'AS'),tests:tests.map(t=>({...t,key:find(new RegExp('^'+t.label+'(?:[ (]|$)','i'),t.key)}))};}
function aggregate(records,schema,{asOf,days=0}={}){
 asOf=iso(asOf);if(!asOf)throw Error('วันที่สรุปไม่ถูกต้อง');const cols=columns(schema),patients=new Map(),cutoff=days?new Date(+new Date(asOf+'T00:00:00Z')-days*86400000).toISOString().slice(0,10):'';
 const quality={future:0,undated:0,noteReview:0,noteOverrides:0,invalidVisit:0};
 for(const r of records){const v=r.values||{},hn=String(v.D??'').trim().replace(/^0+(?=\d)/,''),visit=iso(v.B);if(!hn)continue;if(!visit){quality.invalidVisit++;continue;}if(visit>asOf){quality.future++;continue;}if(!patients.has(hn))patients.set(hn,{});const p=patients.get(hn);
 const add=(id,d,value,age=v.F,sex=v.G)=>{if(!d||d>asOf)return;let prev=p[id];if(!prev||d>prev.date)p[id]={date:d,value,age:number(age),sex:String(sex||'').trim()};else if(d===prev.date&&(value!==prev.value||id==='hb'&&(number(age)!==prev.age||sex!==prev.sex)))p[id].value=null;};
 const d=iso(v[cols.date]);for(const t of cols.tests){const raw=v[t.key];if(raw===undefined||raw===null||String(raw).trim()==='')continue;if(!d){quality.undated++;continue;}add(t.id,d,number(raw));}
 // Only explicit dated current-lab blocks are parsed. Never infer a lab date from a visit.
 const note=String(v[cols.note]||'');let parsed=false;
 const explicit=note.match(/(?:ผลแล็บวันที่|ผลตรวจครั้งนี้)\s*(\d{1,2}\/\d{1,2}\/\d{4})?\s*:/);
 if(explicit){let nd=iso(explicit[1]);if(!nd&&/^รับบริการ\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(note))nd=iso(note.match(/^รับบริการ\s+(\S+)/)[1]);const block=note.slice(explicit.index+explicit[0].length).split(/คงผล|ค่าใช้จ่าย/)[0];if(nd){
  for(const [id,re]of [['cr',/(?:Creatinine|\bCr)\s*([\d.]+)/i],['egfr',/eGFR\s*([\d.]+)/i],['k',/\bK\s*([\d.]+)/]]){const m=block.match(re);if(m){add(id,nd,number(m[1]));parsed=true;}}
  if(/\bK\s*ผลลำดับ/.test(block)){add('k',nd,null);parsed=true;}
 }}
 if(parsed)quality.noteOverrides++;else if(/(?:ผลแล็บ|ผลตรวจ).*วันที่|คงผล.*(?:แล็บ|ผลตรวจ)/.test(note))quality.noteReview++;
 }
 const result={asOf,days,total:patients.size,stages:[0,0,0,0,0,0],any:0,measured:0,hbMeasured:0,hbExcluded:0,quality,latestDate:'',labs:cols.tests.map(t=>({...t,n:0,low:0,high:0,conflict:0,old:0,first:'',last:''}))};
 for(const p of patients.values()){let abnormal=false,measured=false;for(const t of result.labs){const o=p[t.id];if(!o)continue;if(o.date<cutoff){t.old++;continue;}if(o.value===null){t.conflict++;continue;}measured=true;result.latestDate=result.latestDate>o.date?result.latestDate:o.date;
  if(t.id==='hb'){result.hbMeasured++;if(!(o.age>=15&&o.age<=65&&['ชาย','หญิง'].includes(o.sex))){result.hbExcluded++;continue;}}
  t.n++;t.first=!t.first||o.date<t.first?o.date:t.first;t.last=o.date>t.last?o.date:t.last;
  const lo=t.id==='hb'?(o.sex==='ชาย'?13:12):t.lo;
  if(lo!==null&&o.value<lo){t.low++;abnormal=true;}if(t.hi!==null&&(t.inclusive?o.value>=t.hi:o.value>t.hi)){t.high++;abnormal=true;}
  if(t.id==='egfr'){const g=o.value;result.stages[g>=90?0:g>=60?1:g>=45?2:g>=30?3:g>=15?4:5]++;}
 }if(abnormal)result.any++;if(measured)result.measured++;}
 return result;
}
const exported={aggregate,columns,iso,tests};if(typeof module!=='undefined')module.exports=exported;root.HFLab=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
