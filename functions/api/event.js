export async function onRequestPost(context) {
  const { request, env } = context;
  if (env.FEISHU_WEBHOOK_URL) {
    try {
      const body = await request.json();
      const cf = request.cf || {};
      context.waitUntil(
        fetch(env.FEISHU_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'text',
            content: {
              text: `🎯 [复制专属折扣码] 动作: ${body.action || 'copy'} | 来源: ${body.ref || 'organic'} | 地区: ${cf.country || 'Unknown'}`
            }
          })
        }).catch(() => {})
      );
    } catch (_) {}
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
