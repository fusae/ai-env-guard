import { translate as t } from './i18n.js';

export function normalizeIp(ip) {
  const value = String(ip || '').toLowerCase().replace(/%.+$/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(value)) return value;
  if (!value.includes(':')) return '';
  try { return new URL(`http://[${value}]/`).hostname.slice(1, -1); } catch { return ''; }
}
export function isPublicIp(input) {
  const ip = normalizeIp(input);
  if (ip.includes(':')) {
    if (ip.startsWith('::ffff:')) {
      const parts = ip.slice(7).split(':');
      if (parts.length !== 2) return false;
      const n = parts.map(x => parseInt(x, 16));
      return isPublicIp(`${n[0] >> 8}.${n[0] & 255}.${n[1] >> 8}.${n[1] & 255}`);
    }
    return !(/^(::|::1|fc|fd|fe[89ab]|ff|2001:db8)/.test(ip));
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a,b,c] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113));
}
export function hardwareSignals(h) {
  const signals = [];
  const renderer = `${h.vendor || ''} ${h.renderer || ''}`;
  if (h.webdriver === true) signals.push('automation');
  if (/swiftshader|llvmpipe|softpipe|software rasterizer|microsoft basic render/i.test(renderer)) signals.push('software');
  if (/vmware|virtualbox|virgl|parallels/i.test(renderer)) signals.push('virtual');
  if (/Mac|iPhone|iPad|Linux|Android/i.test(h.os || '') && /Direct3D|D3D11|D3D12/i.test(renderer)) signals.push('mismatch');
  return signals;
}
export function assess({ ip, rtc, hardware, timezone }) {
  const networkKnown = ip && typeof ip.isDatacenter === 'boolean' && typeof ip.isProxyOrVpn === 'boolean' && isPublicIp(ip.ip) && ip.lookupStatus !== 'unavailable';
  const badIp = Boolean(ip?.isDatacenter || ip?.isProxyOrVpn);
  const publicIps = (rtc.ips || []).map(normalizeIp).filter(isPublicIp);
  const extraIps = publicIps.filter(x => x !== normalizeIp(ip?.ip));
  const rtcKnown = Boolean(isPublicIp(ip?.ip) && rtc.status === 'complete');
  const tzKnown = Boolean(timezone && ip?.timezone);
  const tzMismatch = tzKnown && timezone !== ip.timezone;
  const signals = hardwareSignals(hardware);
  const hwKnown = signals.length > 0 || Boolean(hardware.renderer && hardware.rendererExposed && typeof hardware.webdriver === 'boolean');
  const hardwarePoints = signals.includes('automation') ? 10 : signals.length ? 5 : 0;
  const cards = [
    { id:'ip', title:'ipTitle', level:!networkKnown ? 'unknown' : badIp ? 'danger' : 'ok', points:networkKnown && badIp ? 45 : 0, result:!networkKnown ? 'ipUnknown' : badIp ? 'ipBad' : 'ipGood', advice:!networkKnown ? 'ipUnknownAdvice' : badIp ? 'ipAdvice' : null, target:'proxy' },
    { id:'rtc', title:'rtcTitle', level:!rtcKnown ? 'unknown' : extraIps.length ? 'danger' : 'ok', points:rtcKnown && extraIps.length ? 30 : 0, result:!rtcKnown ? 'rtcUnknown' : extraIps.length ? 'rtcBad' : 'rtcGood', advice:!rtcKnown ? 'rtcUnknownAdvice' : extraIps.length ? 'rtcAdvice' : null, target:'adspower', extraIps },
    { id:'timezone', title:'timezoneTitle', level:!tzKnown ? 'unknown' : tzMismatch ? 'warn' : 'ok', points:tzMismatch ? 15 : 0, result:!tzKnown ? 'timezoneUnknown' : tzMismatch ? 'timezoneBad' : 'timezoneGood', advice:'timezoneAdvice', target:'adspower' },
    { id:'hardware', title:'hardwareTitle', level:!hwKnown ? 'unknown' : signals.includes('automation') ? 'danger' : signals.length ? 'warn' : 'ok', points:hardwarePoints, result:!hwKnown ? 'hardwareUnknown' : signals.length ? 'hardwareBad' : 'hardwareGood', advice:!hwKnown ? 'hardwareUnknownAdvice' : 'hardwareAdvice', target:'adspower', signals },
  ];
  const completed = cards.filter(c => c.level !== 'unknown').length;
  const score = completed === 4 ? Math.max(0, 100 - cards.reduce((sum,c) => sum+c.points,0)) : null;
  return { cards, completed, score, verdict:score === null ? 'partial' : score < 60 ? 'risk' : score < 100 ? 'caution' : 'clean' };
}
export function buildReport(result, lang) {
  // Whitelist outcomes only: never serialize scan data, URLs, or hardware identifiers.
  return [t(lang,'reportTitle'), result.score === null ? t(lang,'reportNoScore') : t(lang,'reportScore',{score:result.score}),
    t(lang,'coverage',{count:result.completed}),
    ...result.cards.map((c,i) => `${t(lang,'reportLabels')[i]}: ${t(lang,c.level)}`),
    '',t(lang,'reportPrivacy'),
    `${t(lang,'reportLink')}: https://envguard.dev/?ref=report&lang=${lang === 'zh' ? 'zh' : 'en'}`].join('\n');
}
export function detectHardware(nav = navigator, doc = document) {
  const h = {webdriver:typeof nav.webdriver === 'boolean' ? nav.webdriver : null, cores:nav.hardwareConcurrency || null, os:nav.userAgentData?.platform || nav.platform || '', vendor:'', renderer:'', rendererExposed:false};
  let gl;
  try {
    const canvas = doc.createElement('canvas');
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      h.rendererExposed = Boolean(ext);
      h.vendor = gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR) || '';
      h.renderer = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '';
    }
  } catch {} finally { try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch {} }
  return h;
}
export function detectWebRTC(Peer = globalThis.RTCPeerConnection, timeoutMs = 3500) {
  return new Promise(resolve => {
    let pc, timer, finished = false;
    const ips = new Set();
    const finish = status => {if (finished) return;finished=true;clearTimeout(timer);try{pc?.close();}catch{}resolve({status,ips:[...ips]});};
    if (!Peer) return finish('unsupported');
    try {
      pc = new Peer({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
      timer = setTimeout(() => finish('timeout'), timeoutMs);
      pc.onicecandidate = event => {
        if (!event.candidate) return finish('complete');
        const address = event.candidate.address || event.candidate.candidate?.split(/\s+/)[4];
        const ip = normalizeIp(address); if (ip) ips.add(ip);
      };
      pc.onicegatheringstatechange = () => {if (pc.iceGatheringState === 'complete') finish('complete');};
      pc.createDataChannel('diagnostic');
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => finish('error'));
    } catch { finish('error'); }
  });
}
