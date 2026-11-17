const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const HFOverview=require('../overview-core');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('const API_CACHE=new Map()'),end=html.indexOf('async function hfcLoadOverviewSupplement',start);
const patient={B:'2026-11-01',C:'HF',D:'001',AU:'HFrEF'};
const calls=[];
const ctx={HFOverview,structuredClone,setTimeout,clearTimeout,sessionToken:'test',HF_WEB_BUILD:'test',BACKEND_NAME:'GS',state:{view:'dashboard',boot:{schemas:{HF_Patient_Data:{fields:Object.keys(patient).map(key=>({key}))}}}},document:{querySelector:()=>null},$:()=>null,showLogin:()=>{},gasCall:async(_,req)=>{
 calls.push(req);
 const [name,,page]=req.args;
 if(req.method==='listRecords'){
  if(name==='HF_Patient_Data')return {total:1,pages:1,rows:[{row:6,values:patient}]};
  if(name==='DRP_Log')return {total:0,pages:0,rows:[]};
  return {total:2,pages:2,rows:[{row:page+5,values:{D:'001'}}]};
 }
 assert.equal(req.method,'getRecord');
 return {values:{B:'2026-11-01',C:'HF',D:'001',F:'ADR',J:'ใช่',K:'ใช่'}};
}};
vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
(async()=>{
 const d=await vm.runInContext("api('getDashboard',{start:'2026-11-01',end:'2026-11-30'})",ctx);
 assert.equal(d.total,1);assert.equal(d.adrEvents,2);assert.equal(d.typeAEvents,2);assert.equal(d.preventableEvents,2);
 assert.equal(calls.filter(c=>c.method==='getRecord').length,2);
 // A failed full-record read must remain an error, never a fabricated zero ADR rate.
 vm.runInContext('clearApiCache()',ctx);
 ctx.gasCall=async(_,req)=>{if(req.method==='getRecord')throw Error('permission denied');return {total:1,pages:1,rows:[{row:6,values:patient}]};};
 await assert.rejects(vm.runInContext("api('getDashboard',{})",ctx),/permission denied/);
 const init=html.slice(html.indexOf('async function init()'),html.indexOf('// Authentication tokens stay'));
 assert.ok(init.indexOf("state.boot=await api('getBootstrap')")<init.indexOf("api('getDashboard',state.filters)"));
 console.log('Missing log schema: paginated ADR records hydrate, real events count, read failures propagate, bootstrap precedes prefetch.');
})().catch(e=>{console.error(e);process.exitCode=1;});
