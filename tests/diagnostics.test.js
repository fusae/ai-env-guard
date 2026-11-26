// Prevent private-address leaks, fabricated clean scans and identifying data in copied reports.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLanguage, messages } from '../public/assets/i18n.js';
import { isPublicIp, assess, hardwareSignals, buildReport, detectWebRTC, detectHardware } from '../public/assets/diagnostics.js';
const valid=()=>({ip:{ip:'8.8.8.8',asn:'AS15169',org:'SECRET_ISP',country:'SECRET_COUNTRY',isDatacenter:false,isProxyOrVpn:false,timezone:'SECRET_TIMEZONE',lookupStatus:'complete'},rtc:{status:'complete',ips:['8.8.8.8']},hardware:{webdriver:false,cores:12,renderer:'SECRET_GPU',vendor:'SECRET_VENDOR',os:'MacIntel',rendererExposed:true},timezone:'SECRET_TIMEZONE',languages:'SECRET_LANGUAGE'});
test('URL overrides saved preference; foreign browser locales default to English',()=>{
 assert.equal(chooseLanguage('?lang=en','zh','zh-CN'),'en');assert.equal(chooseLanguage('?lang=zh','en','en-US'),'zh');
 assert.equal(chooseLanguage('',null,'de-DE'),'en');assert.equal(chooseLanguage('',null,'zh-TW'),'zh');assert.equal(chooseLanguage('?lang=bad',null,'ja-JP'),'en');
 assert.deepEqual(Object.keys(messages.en).sort(),Object.keys(messages.zh).sort());
});
test('172 is not entirely private and IPv6 private ranges are filtered',()=>{
 for(const ip of ['10.1.1.1','172.16.0.1','172.31.255.255','192.168.1.1','169.254.1.1','127.0.0.1','100.64.0.1','fd12::1','fe80::a','::1','::ffff:192.168.1.1'])assert.equal(isPublicIp(ip),false,ip);
 for(const ip of ['172.15.1.1','172.32.1.1','172.100.1.1','8.8.8.8','2606:4700:4700::1111'])assert.equal(isPublicIp(ip),true,ip);
});
test('IP unavailability blocks scoring while blocked WebRTC and hidden GPU still score honestly',()=>{
 assert.equal(assess(valid()).score,100);
 const missingIp=assess({...valid(),ip:null});assert.equal(missingIp.score,null);assert.equal(missingIp.completed<4,true);
 const s=valid();s.ip.lookupStatus='unavailable';assert.equal(assess(s).cards[0].level,'unknown');assert.equal(assess(s).score,null);
 const blockedRtc=assess({...valid(),rtc:{status:'timeout',ips:[]}});assert.equal(blockedRtc.cards[1].level,'ok');assert.equal(blockedRtc.cards[1].result,'rtcProtected');assert.equal(blockedRtc.score,100);
 const leakedOnTimeout=assess({...valid(),rtc:{status:'timeout',ips:['1.1.1.1']}});assert.equal(leakedOnTimeout.cards[1].level,'danger');assert.equal(leakedOnTimeout.score,70);
 const hiddenGpu=assess({...valid(),hardware:{webdriver:false,rendererExposed:false,renderer:''}});assert.equal(hiddenGpu.cards[3].level,'unknown');assert.equal(hiddenGpu.completed,3);assert.equal(hiddenGpu.score,100);
});
test('hardware flags are evidence-based; low CPU count and hidden GPU do not imply abuse',()=>{
 assert.deepEqual(hardwareSignals({cores:1,webdriver:false}),[]);
 assert.deepEqual(hardwareSignals({renderer:'Google SwiftShader',os:'Linux',webdriver:true}),['automation','software']);
 assert.deepEqual(hardwareSignals({renderer:'ANGLE Direct3D11',os:'MacIntel'}),['mismatch']);
 assert.deepEqual(hardwareSignals({renderer:'ANGLE Direct3D11',os:'Win32'}),[]);
 const s=valid();s.hardware.webdriver=true;assert.equal(assess(s).cards[3].level,'danger');assert.equal(assess(s).score,90);assert.equal(assess(s).verdict,'caution');
 s.hardware.webdriver=false;s.hardware.cores=1;assert.equal(assess(s).score,100);
});
test('different public addresses are reported, private candidates are ignored',()=>{
 const s=valid();s.rtc.ips=['10.0.0.1','172.20.0.2','fd00::1','172.40.1.2'];const c=assess(s).cards[1];assert.equal(c.level,'danger');assert.deepEqual(c.extraIps,['172.40.1.2']);
});
test('report has a fixed clean link and never includes raw identifying fields',()=>{
 const s=valid();s.rtc.ips=['1.1.1.1'];const r=assess(s);
 for(const lang of ['zh','en']){const report=buildReport(r,lang);for(const secret of ['8.8.8.8','1.1.1.1','SECRET_ISP','SECRET_COUNTRY','SECRET_TIMEZONE','SECRET_GPU','SECRET_VENDOR','SECRET_LANGUAGE'])assert(!report.includes(secret),secret);assert(report.endsWith(`https://envguard.dev/?ref=report&lang=${lang}`));}
});
test('WebRTC timeout and offer failures close the connection',async()=>{
 let closed=0;
 class Peer{createDataChannel(){}createOffer(){return Promise.resolve({});}setLocalDescription(){}close(){closed++;}}
 assert.equal((await detectWebRTC(Peer,5)).status,'timeout');assert.equal(closed,1);
 class Broken extends Peer{createOffer(){return Promise.reject(Error('blocked'));}}
 assert.equal((await detectWebRTC(Broken,1000)).status,'error');assert.equal(closed,2);
});
test('WebGL privacy restriction is handled without throwing',()=>{
 const h=detectHardware({webdriver:false,hardwareConcurrency:4},{createElement:()=>({getContext:()=>null})});assert.equal(h.rendererExposed,false);assert.equal(h.cores,4);
});
