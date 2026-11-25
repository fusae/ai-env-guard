const DATACENTER_KEYWORDS = [
  'amazon', 'aws', 'google', 'gcp', 'microsoft', 'azure', 'digitalocean',
  'linode', 'akamai', 'vultr', 'choopa', 'hetzner', 'ovh', 'contabo',
  'alibaba', 'aliyun', 'tencent', 'oracle', 'cloudflare', 'bandwagon',
  'it7', 'dmit', 'racknerd', 'multacom', 'zenlayer', 'cogent', 'hurricane',
  'leaseweb', 'm247', 'tzulo', 'psychz', 'hostwinds', 'datacamp', 'cdn77'
];

export async function onRequestGet(context) {
  const { request, env } = context;
  const cf = request.cf || {};
  const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
  const asn = cf.asn || 0;
  const asOrg = cf.asOrganization || 'Unknown ISP';
  const country = cf.country || '';
  const region = cf.region || '';
  const city = cf.city || '';
  const timezone = cf.timezone || '';

  // 先用 Cloudflare 原生 ASN 做毫秒级初筛
  const lowerOrg = asOrg.toLowerCase();
  let isDatacenter = DATACENTER_KEYWORDS.some(k => lowerOrg.includes(k));
  let isProxyOrVpn = false;
  let abuserScore = isDatacenter ? 'High (Datacenter ASN)' : 'Low';
  let ipType = isDatacenter ? 'hosting' : 'unknown';
  let lookupStatus = isDatacenter ? 'asn-only' : 'unavailable';

  // Reputation belongs to the exact IP; neighboring addresses may differ.
  const subnetKey = `ip_${clientIp}`;

  try {
    let cached = env.IP_CACHE ? await env.IP_CACHE.get(subnetKey, 'json') : null;
    if (!cached && clientIp !== '127.0.0.1') {
      const resp = await fetch(`https://api.ipapi.is/?q=${clientIp}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000),
        cf: { cacheTtl: 86400, cacheEverything: true }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.error || typeof data.is_datacenter !== 'boolean' || typeof data.is_vpn !== 'boolean' || typeof data.is_proxy !== 'boolean') throw new Error('Incomplete reputation response');
        cached = {
          is_datacenter: Boolean(data.is_datacenter),
          is_vpn: Boolean(data.is_vpn),
          is_proxy: Boolean(data.is_proxy || data.is_tor),
          type: data.company?.type || ipType,
          abuser_score: data.company?.abuser_score || abuserScore
        };
        if (env.IP_CACHE) {
          context.waitUntil(env.IP_CACHE.put(subnetKey, JSON.stringify(cached), { expirationTtl: 86400 }));
        }
      }
    }
    if (cached) {
      lookupStatus = 'complete';
      isDatacenter = isDatacenter || cached.is_datacenter || cached.type === 'hosting';
      isProxyOrVpn = cached.is_vpn || cached.is_proxy;
      ipType = cached.type || ipType;
      abuserScore = cached.abuser_score || abuserScore;
    }
  } catch (_) {
    // Preserve an explicit unavailable status instead of inventing a clean result.
  }

  return new Response(JSON.stringify({
    ip: clientIp,
    asn: `AS${asn}`,
    org: asOrg,
    country,
    region,
    city,
    timezone,
    ipType,
    isDatacenter,
    isProxyOrVpn,
    abuserScore,
    lookupStatus
  }), {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}
