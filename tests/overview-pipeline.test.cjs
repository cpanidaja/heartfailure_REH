const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');const HFOverview=require('../overview-core');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('const API_CACHE=new Map()'),end=html.indexOf('async function hfcLoadOverviewSupplement',start);
const fixture={B:'2026-10-01',C:'HF',D:'0001',I:'ใช่',J:'',L:'ใช่',M:'',O:'ข้อจำกัด',P:'ข้อจำกัด CKD',R:'ข้อจำกัด',S:'ข้อจำกัดสิทธิการรักษา',X:'ใช่',Y:'ใช่',AU:'HFrEF',AV:'Eligible',BB:'เหมาะสม'};const calls=[];
const context={HFOverview,structuredClone,Map,Set,Date,Number,Object,Promise,setTimeout,clearTimeout,sessionToken:'test-token',state:{boot:null},BACKEND_NAME:'Google Sheets',$:()=>null,showLogin:()=>{},gasCall:async(method,req)=>{
 calls.push(req.method);
 if(req.method==='getDashboard')throw new Error("Cannot read properties of undefined (reading 'appropriate')");
 assert.equal(req.method,'listRecords');const [name,,page]=req.args;assert.equal(page,1);
 return name==='HF_Patient_Data'?{total:1,pages:1,rows:[{row:6,values:fixture}]}:{total:0,pages:0,rows:[]};
}};vm.createContext(context);vm.runInContext(html.slice(start,end),context);
(async()=>{
 const [a,b]=await Promise.all([vm.runInContext("api('getDashboard',{start:'2025-10-01',end:'2026-11-30'})",context),vm.runInContext("api('getDashboard',{start:'2025-10-01',end:'2026-11-30'})",context)]);
 assert.equal(calls.filter(m=>m==='getDashboard').length,0);assert.equal(calls.length,3);assert.equal(a.review.appropriate,1);assert.equal(b.review.appropriate,1);assert.equal(a.total,1);assert.equal(a.limitationAnalysis.total,2);assert.equal(a.summaryAvailable,false);assert.equal(a.planEvents,null);assert.equal(a.eligibleComplete,1);
 const empty=await vm.runInContext("api('getDashboard',{start:'2020-01-01',end:'2020-12-31'})",context);assert.equal(empty.total,0);assert.equal(empty.review.appropriate,0);assert.equal(empty.drpEventResolution,null);
 console.log('Full API-to-aggregation pipeline passed with the legacy getDashboard deliberately throwing the exact reported appropriate error.');
})().catch(e=>{console.error(e);process.exitCode=1;});
