const PRIMARY_ORIGIN = 'https://envguard.dev';
const REDIRECT_HOSTS = new Set(['ai-env-guard.pages.dev', 'www.envguard.dev']);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (REDIRECT_HOSTS.has(url.hostname.toLowerCase())) {
    const dest = new URL(`${url.pathname}${url.search}`, PRIMARY_ORIGIN);
    return Response.redirect(dest.toString(), 301);
  }
  return context.next();
}
