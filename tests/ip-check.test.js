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
import {onRequestGet as go} from '../functions/go/[target].js';
test('unknown redirect target is rejected instead of defaulting to an affiliate link',async()=>{
 const ctx=t=>({request:new Request(`https://example.test/go/${t}`),params:{target:t},env:{}});
 for(const bad of ['nope','constructor','toString','__proto__'])assert.equal((await go(ctx(bad))).status,404,bad);
 assert.equal((await go(ctx('github'))).status,302);
});
