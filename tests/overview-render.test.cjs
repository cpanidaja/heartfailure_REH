const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {aggregate}=require('../overview-core');const html=fs.readFileSync('index.html','utf8');
for(const [i,s] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].entries())new vm.Script(s[1],{filename:'inline-'+i});
const sandbox={state:{dash:null},HFC_EXECUTIVE_FEED:{},HFC_EXEC_FEED_SOURCE:'',Number,Date,Math,fmt:v=>v===null||v===undefined?'—':String(v),percent:v=>v===null?'—':String(v)+'%',esc:v=>String(v??''),icon:()=>'',dateTH:v=>v,panel:(title,sub,body)=>title+' '+sub+' '+body};vm.createContext(sandbox);
sandbox.metric=(label,value,sub)=>label+' '+value+' '+sub;sandbox.hfcEmpty=v=>v;
const names=['hfcLimitationAnalysisHTML','hfcSetOverviewFeed','hfcExecKpis','hfcExecGdmt','hfcExecVerifiedLabel','hfcPeriodLabel','hfcExecPeriodLabel','hfcEligibilityDetail','hfcExecutiveKpiChart','hfcExecutiveGdmtChart','hfcExecutiveDashboardSnapshot'];
// Each definition ends at the next top-level function declaration.
for(const name of names){const start=html.indexOf('function '+name+'(');assert.ok(start>=0);let end=html.indexOf('\nfunction ',start+10);const asyncEnd=html.indexOf('\nasync function ',start+10);if(asyncEnd>=0&&(end<0||asyncEnd<end))end=asyncEnd;vm.runInContext(html.slice(start,end),sandbox);}
const v={B:'2026-10-01',D:'1',AU:'HFrEF',I:'ใช่',L:'ใช่',O:'ข้อจำกัด',R:'ข้อจำกัด',X:'ใช่',Y:'ใช่',AV:'Eligible',BB:'เหมาะสม'};
const d=aggregate([{row:6,values:v}],[],[],{start:'2025-10-01',end:'2026-11-30',clinic:'ทั้งหมด'});sandbox.state.dash=d;
const rendered=vm.runInContext('hfcExecutiveDashboardSnapshot()',sandbox);assert.ok(rendered.includes('2025-10-01'));assert.ok(rendered.includes('2026-11-30'));assert.ok(rendered.includes('1 / 1 ครั้ง'));assert.ok(!rendered.includes('02/11/2026'));assert.equal(sandbox.HFC_EXECUTIVE_FEED.kpis[0].actual,100);assert.equal(sandbox.HFC_EXECUTIVE_FEED.kpis[3].actual,null);assert.equal(sandbox.HFC_EXECUTIVE_FEED.gdmt.length,4);
sandbox.state.dash=null;assert.equal(vm.runInContext('hfcExecutiveDashboardSnapshot()',sandbox),'');console.log('Overview rendering passed: shared scope, same counts, empty rates, no historical fallback, inline JavaScript syntax.');

sandbox.state.dash=d;const limitations=vm.runInContext('hfcLimitationAnalysisHTML(state.dash)',sandbox);assert.ok(limitations.includes('สาเหตุข้อจำกัดที่บันทึก'));assert.ok(limitations.includes('<details'));assert.ok(limitations.includes('ไม่ระบุสาเหตุ'));
