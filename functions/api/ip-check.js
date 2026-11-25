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
  const country = cf.country || 'US';
  const region = cf.region || '';
  const city = cf.city || '';
  const timezone = cf.timezone || 'America/Los_Angeles';

  // 先用 Cloudflare 原生 ASN 做毫秒级初筛
  const lowerOrg = asOrg.toLowerCase();
  let isDatacenter = DATACENTER_KEYWORDS.some(k => lowerOrg.includes(k));
  let isProxyOrVpn = false;
  let abuserScore = isDatacenter ? 'High (Datacenter ASN)' : 'Low';
  let ipType = isDatacenter ? 'hosting' : 'isp';

  // 计算 /24 网段 Key 用于缓存外部高精度 API 结果
  const subnetKey = clientIp.includes('.')
    ? `subnet_${clientIp.split('.').slice(0, 3).join('.')}.0`
    : `ip_${clientIp}`;

  try {
    let cached = env.IP_CACHE ? await env.IP_CACHE.get(subnetKey, 'json') : null;
    if (!cached && clientIp !== '127.0.0.1') {
      const resp = await fetch(`https://api.ipapi.is/?q=${clientIp}`, {
        headers: { 'Accept': 'application/json' },
        cf: { cacheTtl: 86400, cacheEverything: true }
      });
      if (resp.ok) {
        const data = await resp.json();
        cached = {
          is_datacenter: Boolean(data.is_datacenter),
          is_vpn: Boolean(data.is_vpn),
          is_proxy: Boolean(data.is_proxy || data.is_tor),
          type: data.company?.type || ipType,
          abuser_score: data.company?.abuser_score || abuserScore
        };
        if (env.IP_CACHE) {
          context.waitUntil(env.IP_CACHE.put(subnetKey, JSON.stringify(cached), { expirationTtl: 604800 }));
        }
      }
    }
    if (cached) {
      isDatacenter = isDatacenter || cached.is_datacenter || cached.type === 'hosting';
      isProxyOrVpn = cached.is_vpn || cached.is_proxy;
      ipType = cached.type || ipType;
      abuserScore = cached.abuser_score || abuserScore;
    }
  } catch (_) {
    // 外部接口超时自动降级回 Cloudflare 原生判断，保证 100% 可用
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
    abuserScore
  }), {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}
