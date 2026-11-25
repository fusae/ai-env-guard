import { messages, chooseLanguage, translate } from './i18n.js';
import { assess, buildReport, detectHardware, detectWebRTC } from './diagnostics.js';
const $ = id => document.getElementById(id);
let saved;
try { saved = localStorage.getItem('envguard-language'); } catch {}
let lang = chooseLanguage(location.search, saved, navigator.language);
let snapshot = null, result = null, scanning = false, toastTimer;
const ref = new URLSearchParams(location.search).get('ref') || 'organic';
const t = (key,vars) => translate(lang,key,vars);
const pools = {
 OR:[['1120 SW 5th Ave','Portland','97204'],['2450 Willamette St','Eugene','97405'],['380 Center St NE','Salem','97301']],
 DE:[['1209 Orange St','Wilmington','19801'],['410 Federal St','Dover','19901']],
 MT:[['201 W Main St','Missoula','59802'],['316 N 26th St','Billings','59101']],
 NH:[['900 Elm St','Manchester','03101'],['107 Storrs St','Concord','03301']],
};
let address = pools.OR[0];
function node(tag, className, text) { const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el; }
function toast(key) {clearTimeout(toastTimer);$('toast').textContent=t(key);$('toast').hidden=false;toastTimer=setTimeout(() => {$('toast').hidden=true;},3000);}
async function copy(text, key='copied', report=false) {
 try {await navigator.clipboard.writeText(text);toast(key);return true;}
 catch {
   if(report) {$('report-text').value=text;$('report-dialog').showModal();$('report-text').focus();$('report-text').select();}
   else toast('copyFailed');
   return false;
 }
}
function promoUrl(target, from) {const q=new URLSearchParams({from,ref});return `/go/${target}?${q}`;}
function applyLanguage() {
 document.documentElement.lang=lang==='zh'?'zh-CN':'en';
 document.title=t('pageTitle');
 document.querySelector('meta[name="description"]').content=t('description');
 for (const selector of ['meta[property="og:title"]','meta[name="twitter:title"]']) document.querySelector(selector).content=t('pageTitle');
 for (const selector of ['meta[property="og:description"]','meta[name="twitter:description"]']) document.querySelector(selector).content=t('description');
 document.querySelector('meta[property="og:locale"]').content=lang==='zh'?'zh_CN':'en_US';
 document.querySelector('meta[property="og:locale:alternate"]').content=lang==='zh'?'en_US':'zh_CN';
 for (const el of document.querySelectorAll('[data-i18n]')) el.textContent=t(el.dataset.i18n);
 $('lang-btn').textContent=lang==='en'?'中文':'English';$('lang-btn').setAttribute('aria-label',t('switchLabel'));
 $('cards').setAttribute('aria-label',t('checks'));
 $('report-text').setAttribute('aria-label',t('reportTitle'));
 for(const option of $('state-select').options) option.textContent=t(option.value);
 $('github-link').href=promoUrl('github','footer');
 $('toast').hidden=true;
 renderAddress();render();
 if($('report-dialog').open && result) $('report-text').value=buildReport(result,lang);
}
function renderAddress() {
 const state=$('state-select').value;
 $('address-box').replaceChildren(...[['street',address[0]],['city',`${address[1]}, ${state}`],['zip',address[2]]].map(([key,value]) => {
  const b=node('button','address-field');b.type='button';b.append(node('span','',t(key)),node('strong','',value));
  b.addEventListener('click',()=>copy(value));return b;
 }));
}
function newAddress() {const pool=pools[$('state-select').value];address=pool[Math.floor(Math.random()*pool.length)];renderAddress();}
function friendly(value) {return value && value !== 'Unknown' && value !== 'Unknown ISP' && value !== 'unknown' ? String(value) : t('unknownValue');}
function detail(card) {
 const {ip,rtc,hardware:h,timezone,languages}=snapshot;
 if(card.id==='ip') return ip ? t('ipDetail',{ip:friendly(ip.ip),asn:friendly(ip.asn),org:friendly(ip.org),type:ip.ipType==='hosting'?(lang==='zh'?'托管网络':'Hosting'):ip.ipType==='isp'?(lang==='zh'?'互联网服务商':'ISP'):friendly(ip.ipType)}) : t('ipUnknownAdvice');
 if(card.id==='rtc') return rtc.status!=='complete'?t('rtcUnknownAdvice'):card.extraIps.length?t('rtcDetail',{ips:card.extraIps.join(', ')}):t('rtcGoodDetail');
 if(card.id==='timezone') return t('timezoneDetail',{remote:friendly(ip?.timezone),local:friendly(timezone),languages:friendly(languages)});
 const data=t('hardwareDetail',{vendor:friendly(h.vendor),renderer:friendly(h.renderer),cores:h.cores||t('unknownValue'),webdriver:h.webdriver===true?t('yes'):h.webdriver===false?t('no'):t('unknownValue')});
 return data+(card.signals.length?`\n${card.signals.map(x=>t(x)).join(' · ')}`:'');
}
function renderCard(card) {
 const article=node('article',`card ${card.level}`);article.dataset.check=card.id;
 const head=node('div','card-head');head.append(node('h3','',t(card.title)),node('span','badge',t(card.level)));
 article.append(head,node('p','advice',t(card.result)+(card.points?` · ${t('pointLoss',{points:card.points})}`:'')),node('p','detail',detail(card)),node('p','advice',t(card.advice)));
 if(card.level==='warn'||card.level==='danger') {
   const cta=node('div','cta');const link=node('a','button offer',t(card.target==='proxy'?'proxyOffer':'browserOffer'));
   link.href=promoUrl(card.target,card.id);link.target='_blank';link.rel='noopener sponsored';
   const code=card.target==='proxy'?'GXQVUA_081067':'YtPJkN';
   const button=node('button','button',t('copyCode',{code}));
   button.addEventListener('click',async()=>{if(await copy(code,'codeCopied')) fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:`copy_${card.target}_${code}`,ref})}).catch(()=>{});});
   cta.append(link,button);article.append(cta);
 } else if(card.level==='ok') {
   const link=node('a','light-promo',t(card.target==='proxy'?'proxyLight':'browserLight'));
   link.href=promoUrl(card.target,card.id);link.target='_blank';link.rel='noopener sponsored';article.append(link);
 }
 return article;
}
function render() {
 $('scan-btn').disabled=scanning;$('report-btn').disabled=scanning||!result;
 if(scanning||!result){$('score-num').textContent='—';$('score-ring').className='score-ring scanning';$('verdict').textContent=t('scanning');$('coverage').textContent='';$('ip-summary').textContent='';$('cards').replaceChildren();return;}
 $('score-num').textContent=result.score===null?'—':String(result.score);
 $('score-ring').className=`score-ring ${result.score===null?'unknown':result.score<60?'danger':result.score<100?'warn':'ok'}`;
 $('verdict').textContent=t(result.verdict);
 $('coverage').textContent=t('coverage',{count:result.completed})+(result.score===null?` · ${t('partialScore')}`:'');
 $('ip-summary').textContent=snapshot.ip?t('ipSummary',{ip:friendly(snapshot.ip.ip),country:friendly(snapshot.ip.country),asn:friendly(snapshot.ip.asn),org:friendly(snapshot.ip.org)}):t('ipUnknown');
 $('cards').replaceChildren(...result.cards.map(renderCard));
}
async function runScan() {
 if(scanning)return;scanning=true;render();
 const ipPromise=fetch('/api/ip-check',{cache:'no-store',signal:AbortSignal.timeout(7000)}).then(r=>{if(!r.ok)throw Error('IP check unavailable');return r.json();}).catch(()=>null);
 const hardware=detectHardware();
 let timezone='';try{timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{}
 const [ip,rtc]=await Promise.all([ipPromise,detectWebRTC()]);
 snapshot={ip,rtc,hardware,timezone,languages:(navigator.languages||[navigator.language]).join(', ')};
 result=assess(snapshot);scanning=false;render();
}
$('lang-btn').addEventListener('click',()=>{
 lang=lang==='en'?'zh':'en';try{localStorage.setItem('envguard-language',lang);}catch{}
 const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);applyLanguage();
});
$('scan-btn').addEventListener('click',runScan);
$('report-btn').addEventListener('click',()=>{if(result&&!scanning)copy(buildReport(result,lang),'reportCopied',true);});
$('state-select').addEventListener('change',newAddress);$('address-btn').addEventListener('click',newAddress);
$('close-dialog').addEventListener('click',()=>$('report-dialog').close());
applyLanguage();runScan();
