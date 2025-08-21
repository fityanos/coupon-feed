// index.js
// Scrapes coupons from https://<country>.alcoupon.com/<lang>/discount-codes/<merchant-slug>
// Outputs an extension-ready coupons.json grouped by merchant host (e.g., shein.com).

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('country', { type: 'string', default: 'uae', describe: 'Country subdomain (uae, saudi, etc.)' })
  .option('lang', { type: 'string', default: 'en', describe: 'Language path (en or ar)' })
  .option('slugs', { type: 'string', default: 'shein,adidas,storeus', describe: 'Comma-separated merchant slugs to scrape' })
  .option('out', { type: 'string', default: './coupons.json', describe: 'Output path for extension-ready coupons.json' })
  .option('delay', { type: 'number', default: 1200, describe: 'Politeness delay (ms) between requests' })
  .help()
  .argv;

const HOST_MAP = {
  shein: 'shein.com',
  adidas: 'adidas.com',
  storeus: 'storeus.com',
  babystore: 'babystore.ae',
  noon: 'noon.com',
  trendyol: 'trendyol.com',
  groupon: 'groupon.ae',
  eoutlet: 'eoutlet.com'
};

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 (alcoupon-scraper)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractCodesFromText(text) {
  // Codes are typically uppercase letters/numbers 3-12 chars, not words like OFF/SALE
  const regex = /\b([A-Z0-9]{3,12})\b/g;
  const bad = new Set(['OFF','SALE','VALID','COUPON','CODE','ALCOUPON','ALCOUPONCOM','COPY']);
  const found = new Set();
  let m;
  while ((m = regex.exec(text)) !== null) {
    const code = m[1];
    if (bad.has(code)) continue;
    // Skip pure numbers of length >= 4 that are likely prices
    if (/^\d{4,}$/.test(code)) continue;
    found.add(code);
  }
  return Array.from(found);
}

function normalizePct(s) {
  const m = /([1-9]\d?)\s?%/.exec(s);
  return m ? parseInt(m[1], 10) : null;
}

async function fetchMerchant(country, lang, slug) {
  const url = `https://${country}.alcoupon.com/${lang}/discount-codes/${slug}`;
  const res = await axios.get(url, { headers: { 'User-Agent': USER_AGENT } });
  return { url, html: res.data };
}

function parseCoupons(html) {
  const $ = cheerio.load(html);
  const coupons = [];

  // Heuristics:
  // - Many pages have code near a "Copy" button or shown in headings/blocks.
  // - We capture text around elements that contain "Copy" or "Coupon"/"Code".
  const blocks = [];
  $('*').each((_, el) => {
    const t = $(el).text().trim();
    if (!t) return;
    if (/copy/i.test(t) || /coupon|code|promo/i.test(t)) {
      blocks.push($(el).closest('section, article, div').first());
    }
  });

  const uniqBlocks = Array.from(new Set(blocks.map(b => b.get(0)))).map(el => $(el));
  for (const b of uniqBlocks) {
    const text = b.text().replace(/\s+/g, ' ').trim();
    const codes = extractCodesFromText(text);
    if (codes.length === 0) continue;

    // Try to get a brief description and a percentage
    const header = b.find('h1,h2,h3').first().text().trim();
    const desc = header || text.slice(0, 140);
    const pct = normalizePct(text);

    for (const code of codes) {
      coupons.push({
        code,
        description: desc || 'Coupon code',
        successRate: pct ? Math.min(0.9, Math.max(0.2, pct / 100)) : 0.33
      });
    }
  }

  // Fallback: whole-page scan if nothing matched
  if (coupons.length === 0) {
    const text = $('body').text().replace(/\s+/g, ' ');
    const codes = extractCodesFromText(text);
    for (const code of codes) {
      coupons.push({ code, description: 'Coupon code', successRate: 0.33 });
    }
  }

  // Deduplicate by code keeping first
  const seen = new Set();
  const clean = [];
  for (const c of coupons) {
    if (seen.has(c.code)) continue;
    seen.add(c.code);
    clean.push(c);
  }
  return clean;
}

async function run() {
  const slugs = argv.slugs.split(',').map(s => s.trim()).filter(Boolean);
  const outPath = path.resolve(argv.out);
  const byHost = {};

  for (const slug of slugs) {
    try {
      const { url, html } = await fetchMerchant(argv.country, argv.lang, slug);
      const list = parseCoupons(html);
      const host = HOST_MAP[slug] || `${slug}.com`;
      if (!byHost[host]) byHost[host] = [];
      // Keep top few
      for (const c of list.slice(0, 8)) {
        byHost[host].push(c);
      }
      console.log(`[ok] ${slug}: ${list.length} codes (${url})`);
    } catch (e) {
      console.error(`[fail] ${slug}:`, e.message);
    }
    await sleep(argv.delay);
  }

  // Sort each host by successRate, desc
  for (const host of Object.keys(byHost)) {
    byHost[host].sort((a, b) => (b.successRate ?? 0) - (a.successRate ?? 0));
  }

  fs.writeFileSync(outPath, JSON.stringify(byHost, null, 2), 'utf8');
  console.log(`
Wrote ${outPath}`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
