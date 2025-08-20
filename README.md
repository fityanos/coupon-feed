# Alcoupon Scraper (Node.js)

Scrape coupon codes from AlCoupon merchant pages such as:

- `https://uae.alcoupon.com/en/discount-codes/shein`
- `https://uae.alcoupon.com/en/discount-codes/adidas`
- `https://uae.alcoupon.com/en/discount-codes/storeus`

and export them as an **extension-ready `coupons.json`** grouped by merchant host.

> Notes: Be respectful of the website's Terms and robots. Use a small slug list and a delay between requests.

## Quick Start

```bash
# 1) Create a folder and unzip the package contents here
cd alcoupon-scraper

# 2) Install deps
npm install

# 3) Run (default slugs: shein, adidas, storeus)
node index.js --slugs shein,adidas,storeus --out coupons.json

# Optional flags
# --country uae --lang en --delay 1200
```

The output `coupons.json` looks like this:

```json
{
  "shein.com": [
    { "code": "ALCP", "description": "SHEIN 15% OFF", "successRate": 0.6 }
  ],
  "adidas.com": [
    { "code": "RAN15", "description": "Adidas 10% full price / 7% sale", "successRate": 0.5 }
  ]
}
```

> Drop this file straight into your extension, replacing the existing `coupons.json`.

## How it Works

- Fetches each merchant page and parses for likely coupon codes (uppercase alphanumeric tokens near “Copy / Coupon / Code” blocks).
- Tries to infer a description and any percentage mentioned to seed a `successRate` (you can override later with feedback).
- Adds a polite delay between requests (default `1200ms`).

## Legal & Ethical

- Check `robots.txt` / T&Cs and ensure scraping is permitted for your use case.
- Keep request volume small; cache output.
- If you later need fresh, frequent updates, consider contacting the site for API access or partnership.
