const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),a=html.indexOf('const API_CACHE=new Map()'),b=html.indexOf('\nasync function hfcReadOverviewRows',a);
let resolveRaw,resolveAggregate,calls=0,aggregations=0;
const raw=new Promise(r=>resolveRaw=r),aggregated=new Promise(r=>resolveAggregate=r);
const context={structuredClone,Map,Set,Date,sessionToken:'test',state:{boot:null},BACKEND_NAME:'Google Sheets',$:()=>null,showLogin:()=>{},gasCall:()=>{calls++;throw new Error("Cannot read properties of undefined (reading 'appropriate')");},hfcUnifiedDashboard:async()=>{aggregations++;return aggregated;}};
vm.createContext(context);vm.runInContext(html.slice(a,b),context);
(async()=>{
 const prefetch=vm.runInContext("api('getDashboard',{start:'2025-10-01',end:'2026-11-30'})",context);
 const visible=vm.runInContext("api('getDashboard',{start:'2025-10-01',end:'2026-11-30'})",context);
 let visibleDone=false;visible.then(()=>visibleDone=true);resolveRaw({total:389});await new Promise(setImmediate);assert.equal(visibleDone,false,'Visible page must wait for aggregation, not the raw response');assert.equal(calls,0);assert.equal(aggregations,1);
 resolveAggregate({total:389,review:{appropriate:389,assessed:389},limitationAnalysis:{total:636}});
 const [x,y]=await Promise.all([prefetch,visible]);assert.deepEqual(x,y);assert.equal(y.review.appropriate,389);x.review.appropriate=-1;assert.equal(y.review.appropriate,389,'Callers receive separate clones');
 const cached=await vm.runInContext("api('getDashboard',{start:'2025-10-01',end:'2026-11-30'})",context);assert.equal(cached.review.appropriate,389);assert.equal(calls,0);
 vm.runInContext('clearApiCache()',context);context.gasCall=()=>{throw new Error("legacy dashboard is broken");};context.hfcUnifiedDashboard=()=>Promise.reject(new Error('incomplete registry'));const rejected=await Promise.allSettled([vm.runInContext("api('getDashboard',{})",context),vm.runInContext("api('getDashboard',{})",context)]);assert.ok(rejected.every(r=>r.status==='rejected'));assert.equal(vm.runInContext('API_INFLIGHT.size',context),0);assert.equal(vm.runInContext('API_CACHE.size',context),0);
 console.log('API concurrency passed: login prefetch and visible page both wait for aggregation; cache is processed; failures are not cached.');
})().catch(e=>{console.error(e);process.exitCode=1;});
