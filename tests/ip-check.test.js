// Prevent upstream quota/error responses from being displayed as a clean IP.
import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/ip-check.js';
const context=()=>({request:Object.assign(new Request('https://example.test/api/ip-check',{headers:{'CF-Connecting-IP':'8.8.8.8'}}),{cf:{asn:123,asOrganization:'Example ISP',timezone:'Etc/UTC',country:'US'}}),env:{},waitUntil(){}});
test('quota errors do not become a successful reputation result',async()=>{
 const old=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({error:'quota exceeded'});const data=await(await onRequestGet(context())).json();assert.equal(data.lookupStatus,'unavailable');assert.equal(data.ipType,'unknown');}finally{globalThis.fetch=old;}
});
test('completed lookup is marked available and bounded by an abort signal',async()=>{
 const old=globalThis.fetch;try{globalThis.fetch=async(_url,init)=>{assert(init.signal instanceof AbortSignal);return Response.json({is_datacenter:false,is_vpn:false,is_proxy:false,company:{type:'isp'}});};const data=await(await onRequestGet(context())).json();assert.equal(data.lookupStatus,'complete');assert.equal(data.isDatacenter,false);}finally{globalThis.fetch=old;}
});
test('upstream failure retains a positive datacenter ASN indication',async()=>{
 const old=globalThis.fetch;try{globalThis.fetch=async()=>{throw Error('timeout');};const ctx=context();ctx.request.cf.asOrganization='Amazon AWS';const data=await(await onRequestGet(ctx)).json();assert.equal(data.lookupStatus,'asn-only');assert.equal(data.isDatacenter,true);}finally{globalThis.fetch=old;}
});
test('IPAPI_IS_KEY is passed as key query param and never leaked in response',async()=>{
 const old=globalThis.fetch;let seenUrl='';try{globalThis.fetch=async(url)=>{seenUrl=String(url);return Response.json({is_datacenter:false,is_vpn:false,is_proxy:false,company:{type:'isp'}});};const ctx=context();ctx.env.IPAPI_IS_KEY='secret-test-key';const raw=await(await onRequestGet(ctx)).text();const parsed=new URL(seenUrl);assert.equal(parsed.searchParams.get('q'),'8.8.8.8');assert.equal(parsed.searchParams.get('key'),'secret-test-key');assert(!raw.includes('secret-test-key'));assert.equal(JSON.parse(raw).lookupStatus,'complete');}finally{globalThis.fetch=old;}
});
test('known cloud ASN number falls back to asn-only when org name is opaque',async()=>{
 const old=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({ip:'8.8.8.8',company:'6 COLLYER QUAY',docs:'https://ipapi.is/free-tier.html?ref=api'});const ctx=context();ctx.request.cf.asn=132203;ctx.request.cf.asOrganization='6 COLLYER QUAY';const data=await(await onRequestGet(ctx)).json();assert.equal(data.lookupStatus,'asn-only');assert.equal(data.isDatacenter,true);}finally{globalThis.fetch=old;}
});
import {onRequestGet as go} from '../functions/go/[target].js';
test('unknown redirect target is rejected instead of defaulting to an affiliate link',async()=>{
 const ctx=t=>({request:new Request(`https://example.test/go/${t}`),params:{target:t},env:{}});
 for(const bad of ['nope','constructor','toString','__proto__'])assert.equal((await go(ctx(bad))).status,404,bad);
 assert.equal((await go(ctx('github'))).status,302);
});
