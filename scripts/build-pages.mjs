import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://envguard.dev';

export const LANDING_PAGES = [
  {
    slug: 'claude-ban-check',
    title: 'Claude Account Banned Immediately? Check IP & Browser Signals | envguard.dev',
    description: 'Diagnose why Anthropic Claude accounts get disabled immediately after signup. Inspect shared VPN ASNs, datacenter IPs, WebRTC leaks, and browser signals in 3 seconds.',
    h1: 'Claude Account Banned Immediately? Scan Your IP & Browser Signals',
    guideTitle: 'Why Anthropic Disables New Claude Accounts Immediately',
    paragraphs: [
      'When an Anthropic Claude account is disabled minutes after signup or right after subscribing to Claude Pro, the root cause is almost always network reputation rather than the email provider itself. Anthropic evaluates your exit IP ASN, subnet abuse history, and browser environment consistency in real time. Most commercial VPNs and cheap VPS nodes route traffic through well-known datacenter ranges such as AWS, Google Cloud, DigitalOcean, Vultr, Hetzner, or Tencent Cloud. Because thousands of automated signups share those same IPv4 ranges, new accounts created from a flagged hosting or VPN ASN are auto-disabled on arrival.',
      'Even when you purchase a cleaner proxy, two secondary leaks routinely link your fresh account back to a restricted region or a previously banned browser session. First, WebRTC STUN requests can bypass standard HTTP or SOCKS browser proxy rules and reveal your true local ISP IPv4 or IPv6 address. Second, timezone and browser fingerprint mismatches—such as a US exit IP paired with an Asia/Shanghai OS clock or leftover cookies and WebGL/WebDriver automation markers—immediately raise risk scores during account creation and SMS verification.',
      'Run the live scanner above before registering or logging into another Claude account. Aim for a 100/100 score across all four checks: a non-hosting, non-proxy IP (ideally a dedicated <a href="/go/proxy?from=claude-ban-check" target="_blank" rel="noopener sponsored">Static Residential ISP Proxy</a>, discount code <code>GXQVUA_081067</code>), zero extra WebRTC public IPs, exact IP-to-browser timezone alignment, and clean hardware signals inside an isolated <a href="/go/adspower?from=claude-ban-check" target="_blank" rel="noopener sponsored">anti-detect browser profile</a> (invite code <code>YtPJkN</code>). If you also use Claude Code in the terminal, pair this check with <a href="/claude-code-proxy-test/">CLI proxy verification</a> so terminal requests never leak your real ISP.'
    ]
  },
  {
    slug: 'stripe-decline-check',
    title: 'Stripe Card Declined on AI Subscriptions? Check Radar Risk Signals | envguard.dev',
    description: 'Troubleshoot "Your card has been declined" on Claude Pro, Cursor, Kiro, and ChatGPT Plus. Check Stripe Radar IP ASN, timezone mismatch, WebRTC leaks, and US 0% tax states.',
    h1: 'Stripe Declining Your Card on AI Subscriptions? Run a Radar Risk Check',
    guideTitle: 'Why Stripe Radar Blocks Virtual & Credit Cards on AI Checkout',
    paragraphs: [
      'Seeing "Your card has been declined" or "Your card does not support this type of purchase" on Claude Pro, Cursor Pro, Kiro, or ChatGPT Plus is frequently a Stripe Radar risk rejection rather than an insufficient balance. Stripe scores every checkout request by correlating your exit IP classification, geolocation, device timezone, WebRTC candidates, and billing address. Submitting a virtual card or cross-border card from a datacenter hosting ASN or a heavily abused shared VPN endpoint triggers high-risk flags before the issuing bank even authorizes the charge.',
      'A second common trigger is geographic contradiction between checkout signals. If your exit IP geolocates to New York or Los Angeles while your browser reports <code>Asia/Shanghai</code> or another distant timezone, or if WebRTC leaks a second public IP from a different country, Stripe Radar treats the session as high-risk card testing. Repeated rapid retries after a decline compound the problem by putting the card fingerprint and IP subnet on temporary cooldown.',
      'Before attempting payment again, inspect all four checks above and wait until every risk signal is resolved. Use a clean <a href="/go/proxy?from=stripe-decline-check" target="_blank" rel="noopener sponsored">Static Residential ISP IP</a> (code <code>GXQVUA_081067</code>) that matches a supported US state, lock WebRTC and automatic timezone sync inside an <a href="/go/adspower?from=stripe-decline-check" target="_blank" rel="noopener sponsored">isolated browser container</a> (code <code>YtPJkN</code>), and enter a consistent US 0% sales-tax billing state from the reference table below—Oregon (OR), Delaware (DE), Montana (MT), or New Hampshire (NH)—aligned with your exit IP region and timezone. Never hammer the Pay button repeatedly while on a flagged hosting IP.'
    ]
  },
  {
    slug: 'claude-code-proxy-test',
    title: 'Claude Code Region Not Supported? Test Browser & CLI Proxy Leaks | envguard.dev',
    description: 'Fix "Region not supported" in Claude Code and AI CLIs. Audit browser proxy leaks here and verify terminal HTTP_PROXY / HTTPS_PROXY egress with claude-env-check.',
    h1: 'Claude Code Region Not Supported? Audit Browser & CLI Proxy Leaks',
    guideTitle: 'Why Browser Proxies Work While Claude Code CLI Still Leaks Your Real Region',
    paragraphs: [
      'One of the most confusing failures for developers is when Claude web chat opens cleanly in Chrome, yet running <code>claude</code> (Claude Code), Codex CLI, or Anthropic API scripts in the terminal immediately fails with a region restriction or account warning. The reason is architectural: browser extensions such as SwitchyOmega, Proxy Switchy, and anti-detect browser profiles only route traffic generated inside that browser process. Your shell—zsh, bash, PowerShell, Node.js, and Python—ignores browser-level proxy rules and sends HTTPS requests directly through your local ISP unless explicit terminal routing is configured.',
      'Even when you turn on a system-wide proxy client, subtle CLI leaks remain common. Some tools honor <code>HTTPS_PROXY</code> and <code>ALL_PROXY</code> while ignoring macOS/Windows system proxy settings; others leak DNS lookups locally or fail over to direct IPv6 egress when only IPv4 TUN routing is enabled. Mixing a US browser session with direct non-supported terminal API calls on the same Anthropic account creates an instant multi-country login anomaly.',
      'Use a two-layer audit before authenticating Claude Code. First, verify your browser profile right here on <a href="/">envguard.dev</a> to confirm your exit IP is a clean non-hosting ASN (use a dedicated <a href="/go/proxy?from=claude-code-proxy-test" target="_blank" rel="noopener sponsored">Static Residential ISP Proxy</a> with code <code>GXQVUA_081067</code> if flagged) with zero WebRTC leak and matching timezone. Second, run the open-source terminal checker <a href="/go/github?from=claude-code-proxy-test" target="_blank" rel="noopener"><code>github.com/fusae/claude-env-check</code></a> directly inside the exact shell where you launch Claude Code. Confirm both browser and terminal exit through the same clean IP and supported region before signing in.'
    ]
  },
  {
    slug: 'isp-vs-datacenter-ip',
    title: 'ISP vs Datacenter IP Test — Verify Static Residential Proxies | envguard.dev',
    description: 'Instantly test whether your proxy is a true Static Residential ISP IP or a mislabeled Datacenter hosting ASN using Cloudflare ASN and ipapi.is threat intelligence.',
    h1: 'ISP vs Datacenter IP Test: Verify Your Static Residential Proxy',
    guideTitle: 'How to Verify True Static Residential ISP Proxies vs Datacenter IPs',
    paragraphs: [
      'Many proxy vendors market cheap VPS ranges as "residential" or "native US IPs," yet AI platforms and Stripe Radar immediately classify them as hosting traffic. The difference comes down to ASN ownership and IP intelligence registries. A true Static Residential ISP IP is announced under a consumer or business internet service provider ASN (such as Comcast, AT&amp;T, Verizon, Cox, or RCN) and is tagged as <code>isp</code> or <code>business</code> with <code>is_datacenter: false</code>, <code>is_vpn: false</code>, and <code>is_proxy: false</code>. By contrast, datacenter IPs belong to cloud and colocation networks—AWS, Google Cloud, Azure, DigitalOcean, Vultr, Hetzner, OVH, Zenlayer, or Tencent Cloud—where automated bots and multi-account farms generate persistent abuse signals.',
      'When you run a scan on envguard.dev, the backend combines real-time Cloudflare edge ASN metadata with exact-IP reputation lookups from <code>ipapi.is</code>. Instead of guessing from neighboring IP subnets, each exact exit IP is checked individually for datacenter flags, VPN/proxy markers, company type (<code>isp</code>, <code>business</code>, or <code>hosting</code>), and ASN identity. If your proxy shows <code>Type: Hosting</code> or flags as a proxy/VPN, no amount of cookie clearing will make that IP look residential to Anthropic or Stripe.',
      'To pass strict AI signup and billing checks, verify every newly purchased proxy on this page before binding it to an account. Choose a dedicated <a href="/go/proxy?from=isp-vs-datacenter-ip" target="_blank" rel="noopener sponsored">Static Residential ISP Proxy</a> (discount code <code>GXQVUA_081067</code>) that passes the IP check with zero datacenter or proxy flags, then pair each static IP 1-to-1 with an <a href="/go/adspower?from=isp-vs-datacenter-ip" target="_blank" rel="noopener sponsored">isolated browser profile</a> (code <code>YtPJkN</code>) so timezone, WebRTC, and cookies stay permanently consistent.'
    ]
  }
];

function escapeAttr(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderLandingPage(template, page) {
  const url = `${ORIGIN}/${page.slug}/`;
  const guideHtml = [
    `<article class="panel landing-guide" aria-labelledby="guide-title">`,
    `<h2 id="guide-title">${page.guideTitle}</h2>`,
    ...page.paragraphs.map(p => `<p>${p}</p>`),
    `</article>`
  ].join('\n');

  let html = template;
  html = html.replace('<html lang="en">', '<html lang="en" data-landing="true">');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeAttr(page.description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeAttr(page.title)}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeAttr(page.description)}">`);
  html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeAttr(page.title)}">`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeAttr(page.description)}">`);
  html = html.replace(/<h1 data-i18n="title">[\s\S]*?<\/h1>/, `<h1>${page.h1}</h1>`);
  html = html.replace('<!-- LANDING_GUIDE_SLOT -->', guideHtml);
  return html;
}

function buildSitemap(lastmod) {
  const urls = [
    { loc: `${ORIGIN}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${ORIGIN}/?lang=zh`, changefreq: 'weekly', priority: '0.8' },
    ...LANDING_PAGES.map(p => ({ loc: `${ORIGIN}/${p.slug}/`, changefreq: 'weekly', priority: '0.9' }))
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`),
    '</urlset>',
    ''
  ].join('\n');
}

async function main() {
  const template = await readFile('public/index.html', 'utf8');
  for (const page of LANDING_PAGES) {
    const outDir = path.join('public', page.slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'index.html'), renderLandingPage(template, page), 'utf8');
  }
  const today = new Date().toISOString().slice(0, 10);
  await writeFile('public/sitemap.xml', buildSitemap(today), 'utf8');
  console.log(`BUILT: ${LANDING_PAGES.length} landing pages + public/sitemap.xml (${today})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
