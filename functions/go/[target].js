const TARGET_MAP = {
  proxy: 'https://proxy-seller.com/?partner=F6F5FDFC472746E9',
  adspower: 'https://www.adspower.net/share/YtPJkN',
  github: 'https://github.com/fusae/claude-env-check'
};

export async function onRequestGet(context) {
  const { request, params, env } = context;
  const targetKey = params.target;
  const destUrl = TARGET_MAP[targetKey] || TARGET_MAP.proxy;

  const url = new URL(request.url);
  const fromIssue = url.searchParams.get('from') || 'direct';
  const refChannel = url.searchParams.get('ref') || 'organic';
  const cf = request.cf || {};

  // 异步推送飞书高意向转化提醒（不阻塞用户跳转速度）
  if (env.FEISHU_WEBHOOK_URL) {
    const msg = {
      msg_type: 'text',
      content: {
        text: `💰 [独立站高意向点击]\n目标联盟: ${targetKey.toUpperCase()}\n触发痛点: ${fromIssue}\n流量来源: ${refChannel}\n访客地区: ${cf.country || 'Unknown'} (${cf.asOrganization || 'Unknown ASN'})`
      }
    };
    context.waitUntil(
      fetch(env.FEISHU_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      }).catch(() => {})
    );
  }

  return Response.redirect(destUrl, 302);
}
