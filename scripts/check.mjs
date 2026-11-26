import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { messages } from '../public/assets/i18n.js';
import { LANDING_PAGES } from './build-pages.mjs';

const html = await readFile('public/index.html', 'utf8');
assert(!html.includes('cdn.tailwindcss.com'));
assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.zh).sort());
for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) assert(key in messages.en && key in messages.zh, `Missing translation: ${key}`);
for (const [, path] of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)) await access(`public${path}`);
for (const tag of ['og:title', 'og:image', 'og:description', 'twitter:card', 'twitter:image']) assert(html.includes(`="${tag}"`), `Missing ${tag}`);
assert(html.includes('summary_large_image'));
assert(html.includes('application/ld+json'), 'Missing JSON-LD');
assert(html.includes('id="geo-knowledge-matrix"'), 'Missing static GEO knowledge matrix');

for (const file of ['public/robots.txt', 'public/llms.txt', 'public/sitemap.xml']) await access(file);
for (const page of LANDING_PAGES) {
  const pageHtml = await readFile(`public/${page.slug}/index.html`, 'utf8');
  assert(!pageHtml.includes('cdn.tailwindcss.com'));
  assert(pageHtml.includes(`https://envguard.dev/${page.slug}/`), `Missing canonical for ${page.slug}`);
  assert(pageHtml.includes('class="panel landing-guide"'), `Missing guide section for ${page.slug}`);
}

const image = await readFile('public/assets/social-cover.png');
assert(image.length < 5_000_000, 'Social cover must remain below 5 MB');
assert.equal(image.readUInt32BE(16), 1732);
assert.equal(image.readUInt32BE(20), 908);
console.log('PASS: full translation keys, local assets, social metadata, GEO files and landing pages');
