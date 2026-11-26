// Prevent duplicate-host indexing and ensure redirects preserve pathname and query params.
import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/_middleware.js';

test('redirects legacy pages.dev and www hosts with 301 while preserving path and query', async () => {
  for (const raw of [
    'https://ai-env-guard.pages.dev/?ref=x&lang=zh',
    'https://ai-env-guard.pages.dev/claude-ban-check/?ref=github',
    'https://www.envguard.dev/stripe-decline-check/?lang=en&ref=devto'
  ]) {
    let calledNext = false;
    const res = await onRequest({
      request: new Request(raw),
      next: () => { calledNext = true; return new Response('ok'); }
    });
    assert.equal(calledNext, false);
    assert.equal(res.status, 301);
    const src = new URL(raw);
    assert.equal(res.headers.get('location'), `https://envguard.dev${src.pathname}${src.search}`);
  }
});

test('passes through primary domain and local dev hosts', async () => {
  for (const raw of ['https://envguard.dev/', 'http://127.0.0.1:8788/api/ip-check']) {
    let calledNext = false;
    const res = await onRequest({
      request: new Request(raw),
      next: () => { calledNext = true; return new Response('ok'); }
    });
    assert.equal(calledNext, true);
    assert.equal(res.status, 200);
  }
});
