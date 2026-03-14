import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAllMatches(html: string, regex: RegExp): string[] {
  const results: string[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) results.push(m[1]);
  return results;
}

function getMeta(html: string, attr: string, val: string): string {
  const patterns = [
    new RegExp(`<meta[^>]*${attr}=["']${val}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${val}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return "";
}

function getTag(html: string, name: string): string {
  const m = html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m?.[1]?.trim() || "";
}

const SCRAPE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0",
};

type DeepScanCorpus = {
  combinedHtml: string;
  combinedScripts: string[];
  combinedStylesheets: string[];
  combinedExternalLinks: string[];
  combinedIframes: string[];
  scannedUrls: string[];
  pagesScanned: number;
  sitemapUrls: string[];
  subdomainsFound: string[];
};

const SUBDOMAIN_SEEDS = ["www", "app", "api", "checkout", "pay", "billing", "portal", "shop", "store", "m", "help", "docs"];
const HIGH_INTENT_PATH_PROBES = [
  "/pricing", "/plans", "/checkout", "/cart", "/billing", "/pay", "/subscribe", "/subscription", "/store", "/shop",
  "/products", "/product", "/api", "/developers", "/docs", "/integrations", "/partners", "/about", "/contact",
];
const SENSITIVE_FILE_PATHS = ["/.env", "/.env.local", "/.env.production", "/.env.backup", "/.htaccess", "/.git/config", "/.git/HEAD"];

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, "");
}

function getRegistrableDomain(host: string): string {
  const normalized = normalizeHost(host);
  const parts = normalized.split(".").filter(Boolean);
  if (parts.length <= 2) return normalized;

  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  const commonSecondLevel = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);

  if (tld.length === 2 && commonSecondLevel.has(sld) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function isSameSiteHost(rootDomain: string, testHost: string): boolean {
  return getRegistrableDomain(testHost) === getRegistrableDomain(rootDomain);
}

function buildOriginCandidates(startUrl: string, rootDomain: string): string[] {
  const start = new URL(startUrl);
  const candidates = new Set<string>([start.origin]);
  const normalizedRoot = normalizeHost(rootDomain);

  candidates.add(`https://${normalizedRoot}`);
  candidates.add(`https://www.${normalizedRoot}`);

  for (const sub of SUBDOMAIN_SEEDS) {
    candidates.add(`https://${sub}.${normalizedRoot}`);
  }

  return [...candidates];
}

function buildProbeUrls(origins: string[]): string[] {
  const urls = new Set<string>();
  for (const origin of origins) {
    for (const path of HIGH_INTENT_PATH_PROBES) {
      urls.add(`${origin}${path}`);
    }
  }
  return [...urls];
}

function extractInternalPageLinks(html: string, baseUrl: string, rootDomain: string): string[] {
  const hrefs = getAllMatches(html, /<a[^>]*href=["']([^"'#]+)["']/gi);
  const links = new Set<string>();
  const excludedFileExt = /\.(jpg|jpeg|png|gif|svg|webp|avif|mp4|mp3|pdf|zip|rar|css|js|ico|woff2?|ttf|eot)(\?|#|$)/i;

  for (const href of hrefs) {
    try {
      const parsed = new URL(href, baseUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) continue;
      if (!isSameSiteHost(rootDomain, parsed.hostname)) continue;
      if (excludedFileExt.test(parsed.pathname)) continue;
      links.add(parsed.href);
    } catch {
      // skip
    }
  }
  return [...links];
}

function prioritizeLinks(links: string[]): string[] {
  const highIntentKeywords = [
    "checkout", "payment", "billing", "pricing", "plans", "subscribe", "subscription",
    "cart", "buy", "upgrade", "portal", "invoice", "pay", "donate", "shop", "store",
    "product", "membership", "account", "settings", "integrations", "partners",
    "tools", "features", "api", "developers", "docs", "about", "contact",
  ];

  return [...new Set(links)].sort((a, b) => {
    const al = a.toLowerCase();
    const bl = b.toLowerCase();
    const aScore = highIntentKeywords.reduce((acc, kw) => acc + (al.includes(kw) ? 10 : 0), 0) - al.length / 500;
    const bScore = highIntentKeywords.reduce((acc, kw) => acc + (bl.includes(kw) ? 10 : 0), 0) - bl.length / 500;
    return bScore - aScore;
  });
}

async function fetchHtmlForDeepScan(targetUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(targetUrl, { headers: SCRAPE_HEADERS, redirect: "follow", signal: controller.signal });
    if (!response.ok) return null;
    const ct = (response.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("application/xhtml+xml") && !ct.includes("text/xml") && !ct.includes("application/xml")) return null;
    return await response.text();
  } catch { return null; }
  finally { clearTimeout(timeout); }
}

async function fetchTextForDeepScanAsset(assetUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(assetUrl, { headers: SCRAPE_HEADERS, redirect: "follow", signal: controller.signal });
    if (!response.ok) return "";
    const ct = (response.headers.get("content-type") || "").toLowerCase();
    if (["image/", "video/", "audio/", "font/", "application/octet-stream"].some(p => ct.startsWith(p))) return "";
    return (await response.text()).slice(0, 250_000);
  } catch { return ""; }
  finally { clearTimeout(timeout); }
}

async function fetchSitemapUrls(candidateOrigins: string[], rootDomain: string): Promise<{ urls: string[]; sitemapSources: string[] }> {
  const defaultSitemapPaths = [
    "/sitemap.xml",
    "/sitemap_index.xml",
    "/sitemap-index.xml",
    "/wp-sitemap.xml",
    "/sitemap1.xml",
    "/sitemap-pages.xml",
    "/page-sitemap.xml",
    "/post-sitemap.xml",
    "/product-sitemap.xml",
    "/sitemaps/sitemap.xml",
  ];

  const sitemapQueue: string[] = [];
  const sitemapQueued = new Set<string>();
  const sitemapSources = new Set<string>();
  const discoveredUrls = new Set<string>();

  const addSitemapCandidate = (candidate: string, fallbackOrigin?: string) => {
    if (!candidate) return;
    try {
      const parsed = fallbackOrigin ? new URL(candidate, fallbackOrigin) : new URL(candidate);
      if (!["http:", "https:"].includes(parsed.protocol)) return;
      if (!isSameSiteHost(rootDomain, parsed.hostname)) return;
      if (sitemapQueued.has(parsed.href)) return;
      sitemapQueued.add(parsed.href);
      sitemapQueue.push(parsed.href);
    } catch {
      // ignore invalid URL
    }
  };

  for (const origin of candidateOrigins) {
    defaultSitemapPaths.forEach(path => addSitemapCandidate(path, origin));
  }

  await Promise.all(candidateOrigins.slice(0, 16).map(async (origin) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const robotsRes = await fetch(`${origin}/robots.txt`, { headers: SCRAPE_HEADERS, signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);
      if (!robotsRes.ok) return;
      const robotsTxt = await robotsRes.text();
      const sitemapLines = robotsTxt.match(/^Sitemap:\s*(.+)$/gmi) || [];
      for (const line of sitemapLines) {
        const value = line.replace(/^Sitemap:\s*/i, "").trim();
        addSitemapCandidate(value, origin);
      }
    } catch {
      // ignore
    }
  }));

  while (sitemapQueue.length > 0 && sitemapSources.size < 120) {
    const batch = sitemapQueue.splice(0, 8);
    const batchResults = await Promise.all(batch.map(async (sitemapUrl) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5500);
        const res = await fetch(sitemapUrl, { headers: SCRAPE_HEADERS, signal: controller.signal, redirect: "follow" });
        clearTimeout(timeout);
        if (!res.ok) return;

        const finalUrl = res.url || sitemapUrl;
        if (!isSameSiteHost(rootDomain, new URL(finalUrl).hostname)) return;

        const text = await res.text();
        if (!text.includes("<loc")) return;
        sitemapSources.add(finalUrl);

        const locMatches = text.match(/<loc>\s*(.*?)\s*<\/loc>/gi) || [];
        for (const loc of locMatches) {
          const value = loc.replace(/<\/?loc>/gi, "").trim();
          if (!value) continue;
          if (value.endsWith(".xml") || value.endsWith(".xml.gz") || /sitemap/i.test(value)) {
            addSitemapCandidate(value, finalUrl);
          } else {
            try {
              const pageUrl = new URL(value, finalUrl);
              if (["http:", "https:"].includes(pageUrl.protocol) && isSameSiteHost(rootDomain, pageUrl.hostname)) {
                discoveredUrls.add(pageUrl.href);
              }
            } catch {
              // ignore bad loc URL
            }
          }
        }
      } catch {
        // ignore single sitemap failure
      }
    }));

    if (!batchResults) break;
  }

  return {
    urls: prioritizeLinks([...discoveredUrls]).slice(0, 500),
    sitemapSources: [...sitemapSources],
  };
}

async function buildDeepScanCorpus(startUrl: string, seedHtml: string): Promise<DeepScanCorpus> {
  const maxPages = 25;
  const maxBatchSize = 5;
  const rootUrl = new URL(startUrl);
  const rootHost = rootUrl.hostname.replace(/^www\./, "");
  const baseOrigin = rootUrl.origin;

  const visited = new Set<string>([startUrl]);
  const scannedUrls: string[] = [startUrl];
  const pageHtmls: { url: string; html: string }[] = [{ url: startUrl, html: seedHtml }];
  const subdomainsFound = new Set<string>();

  // 1) Fetch sitemap URLs in parallel with initial link extraction
  const [sitemapResult, _] = await Promise.all([
    fetchSitemapUrls(baseOrigin, rootHost),
    Promise.resolve(null), // placeholder for parallelism
  ]);

  console.log(`Sitemap discovery: ${sitemapResult.urls.length} URLs from ${sitemapResult.sitemapSources.length} sitemaps`);

  // Track subdomains from sitemap
  for (const u of sitemapResult.urls) {
    try {
      const h = new URL(u).hostname;
      if (h !== rootUrl.hostname && isSameSiteHost(rootHost, h)) subdomainsFound.add(h);
    } catch { /* skip */ }
  }

  // Build initial queue: page links + sitemap URLs (prioritized)
  const pageLinks = extractInternalPageLinks(seedHtml, startUrl, rootHost);
  const combinedQueue = [...new Set([...sitemapResult.urls, ...pageLinks])].filter(u => !visited.has(u));
  let queue = prioritizeLinks(combinedQueue).slice(0, 300);

  while (queue.length > 0 && pageHtmls.length < maxPages) {
    const batch: string[] = [];
    const remainingQueue: string[] = [];

    for (const link of queue) {
      if (visited.has(link)) continue;
      if (batch.length < maxBatchSize) batch.push(link);
      else remainingQueue.push(link);
    }

    if (batch.length === 0) break;

    const fetched = await Promise.all(batch.map(async (link) => ({ link, html: await fetchHtmlForDeepScan(link) })));

    for (const { link, html } of fetched) {
      visited.add(link);
      if (!html) continue;
      pageHtmls.push({ url: link, html });
      scannedUrls.push(link);

      // Track subdomains
      try {
        const h = new URL(link).hostname;
        if (h !== rootUrl.hostname && isSameSiteHost(rootHost, h)) subdomainsFound.add(h);
      } catch { /* skip */ }

      if (pageHtmls.length >= maxPages) break;

      const discovered = extractInternalPageLinks(html, link, rootHost).filter(next => !visited.has(next));
      remainingQueue.push(...discovered);
    }

    queue = prioritizeLinks(remainingQueue).slice(0, 300);
  }

  // Collect scripts, stylesheets, external links from all pages
  const scriptUrlSet = new Set<string>();
  const stylesheetUrlSet = new Set<string>();
  const externalLinkSet = new Set<string>();

  for (const page of pageHtmls) {
    for (const src of getAllMatches(page.html, /<script[^>]*src=["']([^"']+)["']/gi)) {
      try { const r = new URL(src, page.url); if (["http:", "https:"].includes(r.protocol)) scriptUrlSet.add(r.href); } catch { /* skip */ }
    }
    for (const href of getAllMatches(page.html, /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi)) {
      try { const r = new URL(href, page.url); if (["http:", "https:"].includes(r.protocol)) stylesheetUrlSet.add(r.href); } catch { /* skip */ }
    }
    for (const href of getAllMatches(page.html, /<a[^>]*href=["']([^"'#]+)["']/gi)) {
      try {
        const p = new URL(href, page.url);
        if (["http:", "https:"].includes(p.protocol) && !isSameSiteHost(rootHost, p.hostname)) externalLinkSet.add(p.href);
      } catch { /* skip */ }
    }
  }

  const combinedScripts = [...scriptUrlSet].slice(0, 200);
  const combinedStylesheets = [...stylesheetUrlSet].slice(0, 120);

  // Fetch same-site JS bundles for deep detection
  const sameSiteScriptUrls = combinedScripts
    .filter(s => { try { return isSameSiteHost(rootHost, new URL(s).hostname); } catch { return false; } })
    .slice(0, 12);

  const scriptBodies = (await Promise.all(sameSiteScriptUrls.map(s => fetchTextForDeepScanAsset(s))))
    .filter(Boolean)
    .map((body, i) => `\n/* deep-script-${i + 1} */\n${body}\n`);

  const combinedHtml = [
    pageHtmls.map(p => p.html).join("\n\n<!-- deep-scan-page -->\n\n"),
    scriptBodies.join("\n"),
  ].join("\n\n");

  return {
    combinedHtml,
    combinedScripts,
    combinedStylesheets,
    combinedExternalLinks: [...externalLinkSet].slice(0, 300),
    scannedUrls,
    pagesScanned: pageHtmls.length,
    sitemapUrls: sitemapResult.urls.slice(0, 100),
    subdomainsFound: [...subdomainsFound],
  };
}

function detectPlatforms(html: string, scripts: string[], stylesheets: string[], externalLinks: string[], iframes?: string[]) {
  const all = html + " " + scripts.join(" ") + " " + stylesheets.join(" ") + " " + externalLinks.join(" ") + " " + (iframes || []).join(" ");
  const lc = all.toLowerCase();

  // CRM Systems
  const crm: { name: string; confidence: string }[] = [];
  const crmChecks: [string, string[]][] = [
    ["Salesforce", ["salesforce.com", "force.com", "pardot", "salesforce-"]],
    ["HubSpot", ["hubspot.com", "hs-scripts.com", "hs-analytics", "hbspt", "hubspot"]],
    ["Zoho CRM", ["zoho.com/crm", "zohocdn.com", "zsalesiq", "zoho"]],
    ["Pipedrive", ["pipedrive.com", "pd-analytics"]],
    ["Freshsales", ["freshsales.io", "freshworks.com", "freshchat"]],
    ["Monday CRM", ["monday.com"]],
    ["Copper CRM", ["copper.com", "prosperworks"]],
    ["Insightly", ["insightly.com"]],
    ["Keap/Infusionsoft", ["keap.com", "infusionsoft.com", "infusionsoft"]],
    ["ActiveCampaign", ["activecampaign.com", "trackcmp.net"]],
    ["Close CRM", ["close.com", "close.io"]],
    ["Zendesk Sell", ["zendesk.com/sell", "getbase.com"]],
    ["Bitrix24", ["bitrix24", "b24-"]],
    ["SugarCRM", ["sugarcrm.com"]],
    ["Microsoft Dynamics", ["dynamics.com", "dynamics365"]],
    ["Vtiger", ["vtiger.com"]],
    ["Nimble", ["nimble.com"]],
    ["Agile CRM", ["agilecrm.com"]],
    ["Capsule CRM", ["capsulecrm.com"]],
    ["Less Annoying CRM", ["lessannoyingcrm.com"]],
  ];
  for (const [name, sigs] of crmChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) crm.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Payment Platforms (comprehensive as of March 2026)
  const payments: { name: string; confidence: string }[] = [];
  const payChecks: [string, string[]][] = [
    ["Stripe", ["stripe.com", "js.stripe.com", "stripe-js", "stripe.js", "stripe_"]],
    ["PayPal", ["paypal.com", "paypalobjects.com", "paypal-"]],
    ["Square", ["squareup.com", "square.site", "squarecdn.com"]],
    ["Braintree", ["braintreegateway.com", "braintree-web", "braintree"]],
    ["Adyen", ["adyen.com", "adyencheckout"]],
    ["Shopify Payments", ["shopify.com/payments", "shopifycdn.com"]],
    ["Klarna", ["klarna.com", "klarna-"]],
    ["Afterpay", ["afterpay.com", "afterpay"]],
    ["Affirm", ["affirm.com", "affirm-"]],
    ["Apple Pay", ["apple-pay", "applepay"]],
    ["Google Pay", ["google-pay", "googlepay", "gpay"]],
    ["Amazon Pay", ["amazonpay", "amazon-pay", "payments.amazon"]],
    ["Razorpay", ["razorpay.com", "razorpay"]],
    ["Mollie", ["mollie.com", "mollie-"]],
    ["2Checkout/Verifone", ["2checkout.com", "2co.com", "verifone.com"]],
    ["Authorize.net", ["authorize.net", "authorizenet"]],
    ["Paddle", ["paddle.com", "paddle.js", "cdn.paddle.com"]],
    ["Lemon Squeezy", ["lemonsqueezy.com", "lmsqueezy", "lemon-squeezy"]],
    ["Polar.sh", ["polar.sh", "api.polar.sh", "sandbox-api.polar.sh", "checkout.polar.sh", "@polar-sh", "polar-checkout", "polar_sh"]],
    ["Gumroad", ["gumroad.com"]],
    ["Chargebee", ["chargebee.com", "cbinstance"]],
    ["Recurly", ["recurly.com", "recurly-"]],
    ["FastSpring", ["fastspring.com"]],
    ["Wise/TransferWise", ["wise.com", "transferwise.com"]],
    ["Venmo", ["venmo.com"]],
    ["Cash App", ["cash.app"]],
    ["Sezzle", ["sezzle.com"]],
    ["Zip (QuadPay)", ["zip.co", "quadpay.com"]],
    ["Coinbase Commerce", ["commerce.coinbase.com", "coinbase.com/commerce"]],
    ["BitPay", ["bitpay.com"]],
    ["Crypto.com Pay", ["crypto.com/pay", "pay.crypto.com"]],
    ["Cryptomus", ["cryptomus.com", "pay.cryptomus.com"]],
    ["NOWPayments", ["nowpayments.io", "api.nowpayments.io"]],
    ["CoinGate", ["coingate.com"]],
    ["BTCPay Server", ["btcpayserver.org", "btcpay"]],
    ["Plisio", ["plisio.net"]],
    ["CoinPayments", ["coinpayments.net"]],
    ["TripleA", ["triple-a.io"]],
    ["Binance Pay", ["pay.binance.com", "binance.com/pay"]],
    ["MoonPay", ["moonpay.com", "buy.moonpay.com"]],
    ["Transak", ["transak.com"]],
    ["Ramp Network", ["ramp.network"]],
    ["Wyre", ["sendwyre.com"]],
    ["Alchemy Pay", ["alchemypay.org"]],
    ["SpicePay", ["spicepay.com"]],
    ["Coinremitter", ["coinremitter.com"]],
    ["PayKickstart", ["paykickstart.com"]],
    ["GoURL", ["gourl.io"]],
    ["Blockonomics", ["blockonomics.co"]],
    ["OpenNode", ["opennode.com"]],
    ["GoCoin", ["gocoin.com"]],
    ["CoinsPaid", ["coinspaid.com"]],
    ["Confirmo", ["confirmo.net"]],
    ["Utrust", ["utrust.com"]],
    ["Payeer", ["payeer.com"]],
    ["Perfect Money", ["perfectmoney.com"]],
    ["WebMoney", ["webmoney.com", "wmtransfer.com"]],
    ["Patreon", ["patreon.com"]],
    ["Buy Me a Coffee", ["buymeacoffee.com"]],
    ["Ko-fi", ["ko-fi.com"]],
    ["Flutterwave", ["flutterwave.com", "rave.flutterwave"]],
    ["Paystack", ["paystack.com", "paystack.co"]],
    ["Worldpay", ["worldpay.com"]],
    ["Checkout.com", ["checkout.com/js"]],
    ["GoCardless", ["gocardless.com"]],
    ["Paysafe", ["paysafe.com", "paysafecard"]],
    ["Skrill", ["skrill.com"]],
    ["Neteller", ["neteller.com"]],
    ["iDEAL", ["ideal.nl"]],
    ["Bancontact", ["bancontact"]],
    ["SEPA", ["sepa"]],
    ["ACH", ["plaid.com"]],
    ["Plaid", ["plaid.com", "cdn.plaid.com"]],
    ["ThriveCart", ["thrivecart.com"]],
    ["SamCart", ["samcart.com"]],
    ["SendOwl", ["sendowl.com"]],
    ["Payhip", ["payhip.com"]],
    ["Sellfy", ["sellfy.com"]],
    ["Podia Payments", ["podia.com"]],
    ["Whop", ["whop.com"]],
    ["Lemfi", ["lemfi.com"]],
    ["Mercado Pago", ["mercadopago.com", "mercadolibre.com"]],
    ["iZettle/Zettle", ["zettle.com", "izettle.com"]],
    ["SumUp", ["sumup.com"]],
    ["Bolt Payments", ["bolt.com/checkout"]],
    ["RevenueCat", ["revenuecat.com"]],
    ["Zuora", ["zuora.com"]],
    ["Chargify/Maxio", ["chargify.com", "maxio.com"]],
    ["Aria Systems", ["ariasystems.com"]],
    ["Spring (Teespring)", ["spri.ng", "teespring.com"]],
    ["Printful", ["printful.com"]],
    ["Printify", ["printify.com"]],
  ];
  for (const [name, sigs] of payChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) payments.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Analytics & Tracking
  const analytics: { name: string; confidence: string }[] = [];
  const analyticsChecks: [string, string[]][] = [
    ["Google Analytics (GA4)", ["gtag(", "googletagmanager.com", "google-analytics.com", "analytics.js"]],
    ["Google Tag Manager", ["googletagmanager.com/gtm", "gtm.js", "GTM-"]],
    ["Meta Pixel", ["fbq(", "facebook.net/en_US/fbevents", "connect.facebook.net"]],
    ["TikTok Pixel", ["analytics.tiktok.com", "ttq.load"]],
    ["Hotjar", ["hotjar.com", "hj(", "hjSiteSettings"]],
    ["Mixpanel", ["mixpanel.com", "mixpanel.init"]],
    ["Amplitude", ["amplitude.com", "amplitude.getInstance"]],
    ["Segment", ["segment.com", "analytics.load", "cdn.segment.com"]],
    ["Heap", ["heap-analytics", "heap.load"]],
    ["FullStory", ["fullstory.com", "fs.identify"]],
    ["Mouseflow", ["mouseflow.com"]],
    ["Lucky Orange", ["luckyorange.com"]],
    ["Clarity", ["clarity.ms", "microsoft clarity"]],
    ["Pendo", ["pendo.io", "pendo-"]],
    ["PostHog", ["posthog.com", "posthog.init"]],
    ["Plausible", ["plausible.io"]],
    ["Fathom", ["usefathom.com"]],
    ["Matomo/Piwik", ["matomo", "piwik"]],
    ["Kissmetrics", ["kissmetrics.com"]],
    ["Crazy Egg", ["crazyegg.com"]],
    ["VWO", ["visualwebsiteoptimizer.com", "vwo_"]],
    ["Optimizely", ["optimizely.com", "optimizely"]],
    ["AB Tasty", ["abtasty.com"]],
    ["Snap Pixel", ["sc-static.net/scevent"]],
    ["Pinterest Tag", ["pintrk", "pinimg.com/ct"]],
    ["LinkedIn Insight", ["snap.licdn.com", "_linkedin_partner_id"]],
    ["Twitter/X Pixel", ["static.ads-twitter.com", "twq("]],
    ["Reddit Pixel", ["rdt(", "alb.reddit.com"]],
  ];
  for (const [name, sigs] of analyticsChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) analytics.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Marketing & Email
  const marketing: { name: string; confidence: string }[] = [];
  const marketingChecks: [string, string[]][] = [
    ["Mailchimp", ["mailchimp.com", "chimpstatic.com", "mc.us"]],
    ["Klaviyo", ["klaviyo.com", "klviyo"]],
    ["SendGrid", ["sendgrid.net", "sendgrid.com"]],
    ["Mailgun", ["mailgun.com"]],
    ["ConvertKit", ["convertkit.com", "ck.page"]],
    ["Drip", ["getdrip.com", "drip.com"]],
    ["Constant Contact", ["constantcontact.com"]],
    ["AWeber", ["aweber.com"]],
    ["GetResponse", ["getresponse.com"]],
    ["Omnisend", ["omnisend.com", "omnisrc"]],
    ["Brevo/Sendinblue", ["brevo.com", "sendinblue.com", "sib-"]],
    ["Campaign Monitor", ["createsend.com"]],
    ["Beehiiv", ["beehiiv.com"]],
    ["Substack", ["substack.com", "substackcdn.com"]],
    ["MailerLite", ["mailerlite.com"]],
    ["Moosend", ["moosend.com"]],
    ["Customer.io", ["customer.io", "customerioforms"]],
  ];
  for (const [name, sigs] of marketingChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) marketing.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Customer Support & Chat
  const support: { name: string; confidence: string }[] = [];
  const supportChecks: [string, string[]][] = [
    ["Intercom", ["intercom.com", "intercomcdn.com", "intercom-"]],
    ["Zendesk", ["zendesk.com", "zdassets.com", "zopim"]],
    ["Drift", ["drift.com", "js.driftt.com"]],
    ["Crisp", ["crisp.chat", "crisp.im"]],
    ["LiveChat", ["livechatinc.com", "livechat-"]],
    ["Tawk.to", ["tawk.to", "embed.tawk"]],
    ["Freshdesk", ["freshdesk.com", "freshworks.com"]],
    ["Olark", ["olark.com"]],
    ["HelpScout", ["helpscout.net", "beacon-v2"]],
    ["Tidio", ["tidio.co", "tidiochat"]],
    ["Gorgias", ["gorgias.chat", "gorgias.io"]],
    ["Front", ["frontapp.com"]],
    ["Chatwoot", ["chatwoot.com"]],
    ["Re:amaze", ["reamaze.com"]],
    ["Chatbot", ["chatbot.com"]],
    ["Kommunicate", ["kommunicate.io"]],
    ["LiveAgent", ["ladesk.com"]],
  ];
  for (const [name, sigs] of supportChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) support.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // E-commerce Platforms (comprehensive — strict matching to avoid false positives)
  const ecommerce: { name: string; confidence: string }[] = [];
  const ecomChecks: [string, string[]][] = [
    ["Shopify", ["cdn.shopify.com", "shopifycdn.com", "myshopify.com", "shopify-buy"]],
    ["WooCommerce", ["woocommerce", "wc-ajax", "wp-content/plugins/woocommerce"]],
    ["Magento", ["magento.com", "mage/cookies", "magento-", "/static/version", "mage/translate", "Magento_"]],
    ["BigCommerce", ["bigcommerce.com", "mybigcommerce"]],
    ["Squarespace Commerce", ["squarespace.com/commerce", "static1.squarespace.com"]],
    ["Wix eCommerce", ["wix.com", "wixsite.com", "parastorage.com"]],
    ["PrestaShop", ["prestashop.com", "prestashop"]],
    ["OpenCart", ["opencart.com", "route=product"]],
    ["Ecwid", ["ecwid.com", "app.ecwid.com"]],
    ["Volusion", ["volusion.com"]],
    ["Shift4Shop (3dcart)", ["3dcart.com", "shift4shop"]],
    ["Sellfy", ["sellfy.com"]],
    ["ThriveCart", ["thrivecart.com"]],
    ["SamCart", ["samcart.com"]],
    ["Kajabi", ["kajabi.com", "kajabi-"]],
    ["Teachable", ["teachable.com"]],
    ["Podia", ["podia.com"]],
    ["Gumroad", ["gumroad.com"]],
    ["Etsy Pattern", ["etsy.com", "etsystatic.com"]],
    ["Snipcart", ["snipcart.com", "cdn.snipcart.com"]],
    ["Medusa", ["medusajs.com"]],
    ["Saleor", ["saleor.io"]],
    ["Spree Commerce", ["spreecommerce.org"]],
    ["nopCommerce", ["nopcommerce.com"]],
    ["osCommerce", ["oscommerce.com"]],
    ["CS-Cart", ["cs-cart.com"]],
    ["X-Cart", ["x-cart.com"]],
    ["Zen Cart", ["zen-cart.com"]],
    ["Shopware", ["shopware.com", "shopware"]],
    ["Lightspeed", ["lightspeedhq.com", "webshopapp.com"]],
    ["Square Online", ["squareonline.com", "square.site"]],
    ["Webflow Ecommerce", ["webflow.com/ecommerce"]],
    ["Lemon Squeezy Store", ["lemonsqueezy.com"]],
    ["Polar Store", ["polar.sh"]],
    ["Whop", ["whop.com"]],
    ["Payhip", ["payhip.com"]],
    ["SendOwl", ["sendowl.com"]],
    ["Spring (Teespring)", ["spri.ng", "teespring.com"]],
    ["Printful", ["printful.com"]],
    ["Printify", ["printify.com"]],
    ["Redbubble", ["redbubble.com"]],
    ["Teemill", ["teemill.com"]],
    ["Fourthwall", ["fourthwall.com"]],
    ["Pietra", ["pietrastudio.com"]],
    ["CommerceJS", ["commercejs.com"]],
    ["Crystallize", ["crystallize.com"]],
    ["Swell", ["swell.is"]],
    ["Elastic Path", ["elasticpath.com"]],
    ["Fabric", ["fabric.inc"]],
    ["Salesforce Commerce Cloud", ["demandware.net", "salesforce.com/commerce"]],
    ["Oracle Commerce", ["oracle.com/commerce"]],
    ["SAP Commerce", ["sap.com/commerce", "hybris"]],
    ["Adobe Commerce", ["adobe.com/commerce", "magento.com"]],
    ["Wix Stores", ["wixstores"]],
    ["Amazon Storefront", ["amazon.com/stores"]],
  ];
  for (const [name, sigs] of ecomChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) ecommerce.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Hosting & CDN
  const hosting: { name: string; confidence: string }[] = [];
  const hostChecks: [string, string[]][] = [
    ["Cloudflare", ["cloudflare.com", "cdnjs.cloudflare.com", "cf-ray", "__cfduid"]],
    ["AWS CloudFront", ["cloudfront.net", "amazonaws.com"]],
    ["Vercel", ["vercel.app", "vercel.com", "v0.dev"]],
    ["Netlify", ["netlify.app", "netlify.com"]],
    ["Fastly", ["fastly.net", "fastly.com"]],
    ["Akamai", ["akamaized.net", "akamai.net"]],
    ["Google Cloud CDN", ["storage.googleapis.com", "googleusercontent.com"]],
    ["DigitalOcean", ["digitaloceanspaces.com"]],
    ["Heroku", ["herokuapp.com"]],
    ["Render", ["onrender.com"]],
    ["Railway", ["railway.app"]],
    ["Fly.io", ["fly.dev"]],
    ["Firebase Hosting", ["firebaseapp.com", "web.app"]],
    ["GitHub Pages", ["github.io"]],
    ["Surge", ["surge.sh"]],
    ["Bunny CDN", ["b-cdn.net"]],
    ["KeyCDN", ["kxcdn.com"]],
    ["StackPath", ["stackpathdns.com"]],
    ["Sucuri", ["sucuri.net"]],
  ];
  for (const [name, sigs] of hostChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) hosting.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Frameworks & CMS
  const frameworks: { name: string; confidence: string }[] = [];
  const fwChecks: [string, string[]][] = [
    ["React", ["react", "reactdom", "__REACT"]],
    ["Vue.js", ["vue.js", "vuejs.org", "__VUE"]],
    ["Angular", ["angular", "ng-version"]],
    ["Next.js", ["__NEXT_DATA__", "_next/", "nextjs"]],
    ["Nuxt", ["__NUXT__", "_nuxt/"]],
    ["Svelte", ["svelte", "__svelte"]],
    ["Gatsby", ["gatsby", "__gatsby"]],
    ["Remix", ["remix.run", "__remix"]],
    ["Astro", ["astro.build", "astro-"]],
    ["WordPress", ["wordpress", "wp-content", "wp-includes", "wp-json"]],
    ["Drupal", ["drupal", "sites/default/files"]],
    ["Joomla", ["joomla", "/components/com_"]],
    ["Ghost", ["ghost.org", "ghost-"]],
    ["Webflow", ["webflow.com", "webflow.io", "wf-"]],
    ["Framer", ["framer.com", "framerusercontent"]],
    ["Bubble", ["bubble.io"]],
    ["Carrd", ["carrd.co"]],
    ["Typedream", ["typedream.com"]],
    ["Duda", ["duda.co", "dudaone.com"]],
    ["Weebly", ["weebly.com"]],
    ["Strikingly", ["strikingly.com"]],
    ["Unbounce", ["unbounce.com"]],
    ["Instapage", ["instapage.com"]],
    ["ClickFunnels", ["clickfunnels.com"]],
    ["Leadpages", ["leadpages.com", "leadpages.net"]],
    ["Tailwind CSS", ["tailwind", "tailwindcss"]],
    ["Bootstrap", ["bootstrap.min", "getbootstrap.com"]],
    ["Material UI", ["mui.com", "@mui/"]],
    ["Chakra UI", ["chakra-ui.com"]],
    ["Bulma", ["bulma.io", "bulma.min"]],
    ["Foundation", ["foundation.zurb"]],
    ["jQuery", ["jquery.min", "jquery.com", "jquery-"]],
    ["Alpine.js", ["alpinejs", "x-data"]],
    ["HTMX", ["htmx.org", "hx-"]],
    ["Stimulus", ["stimulus"]],
    ["Turbo", ["turbo.hotwired"]],
    ["Lit", ["lit-element", "lit.dev"]],
  ];
  for (const [name, sigs] of fwChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) frameworks.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Ads & Monetization
  const ads: { name: string; confidence: string }[] = [];
  const adChecks: [string, string[]][] = [
    ["Google Ads", ["googleads.g.doubleclick", "googlesyndication", "adservice.google"]],
    ["Google AdSense", ["pagead2.googlesyndication", "adsbygoogle"]],
    ["Amazon Ads", ["amazon-adsystem.com"]],
    ["Taboola", ["taboola.com"]],
    ["Outbrain", ["outbrain.com"]],
    ["Criteo", ["criteo.com", "criteo.net"]],
    ["AdRoll", ["adroll.com"]],
    ["MediaVine", ["mediavine.com"]],
    ["Ezoic", ["ezoic.net", "ezoic.com"]],
    ["Raptive/AdThrive", ["adthrive.com", "raptive.com"]],
    ["Carbon Ads", ["carbonads.com", "cdn.carbonads"]],
    ["BuySellAds", ["buysellads.com"]],
  ];
  for (const [name, sigs] of adChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) ads.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Security & Auth
  const security: { name: string; confidence: string }[] = [];
  const secChecks: [string, string[]][] = [
    ["reCAPTCHA", ["recaptcha", "google.com/recaptcha"]],
    ["hCaptcha", ["hcaptcha.com"]],
    ["Cloudflare Turnstile", ["turnstile", "challenges.cloudflare.com"]],
    ["Auth0", ["auth0.com", "auth0-"]],
    ["Firebase Auth", ["firebase.google.com/auth", "firebaseauth"]],
    ["Supabase Auth", ["supabase.co/auth", "supabase"]],
    ["Okta", ["okta.com"]],
    ["OneLogin", ["onelogin.com"]],
    ["Clerk", ["clerk.com", "clerk.dev"]],
    ["Stytch", ["stytch.com"]],
    ["AWS Cognito", ["cognito-idp", "cognito-identity"]],
    ["Sentry", ["sentry.io", "sentry-"]],
    ["Datadog", ["datadoghq.com", "dd-rum"]],
    ["New Relic", ["newrelic.com", "nr-data"]],
    ["LogRocket", ["logrocket.com", "lr-"]],
    ["Bugsnag", ["bugsnag.com"]],
    ["Rollbar", ["rollbar.com"]],
  ];
  for (const [name, sigs] of secChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) security.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Scheduling & Booking
  const scheduling: { name: string; confidence: string }[] = [];
  const schedChecks: [string, string[]][] = [
    ["Calendly", ["calendly.com"]],
    ["Cal.com", ["cal.com"]],
    ["Acuity", ["acuityscheduling.com"]],
    ["Booksy", ["booksy.com"]],
    ["Square Appointments", ["squareup.com/appointments"]],
    ["SimplyBook.me", ["simplybook.me"]],
    ["HoneyBook", ["honeybook.com"]],
    ["Dubsado", ["dubsado.com"]],
  ];
  for (const [name, sigs] of schedChecks) {
    if (sigs.some(s => lc.includes(s))) scheduling.push({ name, confidence: "medium" });
  }

  // Forms & Surveys
  const forms: { name: string; confidence: string }[] = [];
  const formChecks: [string, string[]][] = [
    ["Typeform", ["typeform.com"]],
    ["JotForm", ["jotform.com"]],
    ["Google Forms", ["docs.google.com/forms"]],
    ["Tally", ["tally.so"]],
    ["Formspree", ["formspree.io"]],
    ["Netlify Forms", ["netlify"]],
    ["Basin", ["usebasin.com"]],
    ["SurveyMonkey", ["surveymonkey.com"]],
    ["Paperform", ["paperform.co"]],
  ];
  for (const [name, sigs] of formChecks) {
    if (sigs.some(s => lc.includes(s))) forms.push({ name, confidence: "medium" });
  }

  // Notifications & Engagement
  const engagement: { name: string; confidence: string }[] = [];
  const engChecks: [string, string[]][] = [
    ["OneSignal", ["onesignal.com"]],
    ["Pusher", ["pusher.com", "js.pusher.com"]],
    ["Firebase Cloud Messaging", ["firebase-messaging"]],
    ["Beamer", ["getbeamer.com"]],
    ["Appcues", ["appcues.com"]],
    ["UserPilot", ["userpilot.com"]],
    ["WalkMe", ["walkme.com"]],
    ["Chameleon", ["chameleon.io"]],
    ["Product Fruits", ["productfruits.com"]],
    ["Loom", ["loom.com"]],
    ["Wistia", ["wistia.com", "wistia.net"]],
    ["Vimeo", ["vimeo.com", "player.vimeo"]],
    ["YouTube Embed", ["youtube.com/embed", "youtube-nocookie.com"]],
    ["Calendly Embed", ["assets.calendly.com"]],
  ];
  for (const [name, sigs] of engChecks) {
    if (sigs.some(s => lc.includes(s))) engagement.push({ name, confidence: "medium" });
  }

  // Social proof & Reviews
  const socialProof: { name: string; confidence: string }[] = [];
  const proofChecks: [string, string[]][] = [
    ["Trustpilot", ["trustpilot.com"]],
    ["G2", ["g2.com"]],
    ["Capterra", ["capterra.com"]],
    ["Yotpo", ["yotpo.com"]],
    ["Judge.me", ["judge.me"]],
    ["Loox", ["loox.io"]],
    ["Stamped.io", ["stamped.io"]],
    ["Bazaarvoice", ["bazaarvoice.com"]],
    ["Feefo", ["feefo.com"]],
    ["Reviews.io", ["reviews.io"]],
    ["ProveSource", ["provesrc.com"]],
    ["FOMO", ["fomo.com"]],
    ["Proof", ["useproof.com"]],
    ["TrustSwiftly", ["trustswiftly.com"]],
  ];
  for (const [name, sigs] of proofChecks) {
    if (sigs.some(s => lc.includes(s))) socialProof.push({ name, confidence: "medium" });
  }

  // SEO & Content tools
  const seoTools: { name: string; confidence: string }[] = [];
  const seoChecks: [string, string[]][] = [
    ["Yoast SEO", ["yoast", "yoast-schema"]],
    ["Rank Math", ["rankmath"]],
    ["All in One SEO", ["aioseo"]],
    ["SEMrush", ["semrush.com"]],
    ["Ahrefs", ["ahrefs.com"]],
    ["Schema Pro", ["schema-pro"]],
    ["Elementor", ["elementor"]],
    ["Divi", ["divi", "et-boc"]],
    ["Gutenberg", ["wp-block-"]],
    ["ContentSquare", ["contentsquare.com"]],
    ["Cookiebot", ["cookiebot.com"]],
    ["OneTrust", ["onetrust.com", "optanon"]],
    ["CookieYes", ["cookieyes.com"]],
    ["Iubenda", ["iubenda.com"]],
    ["Termly", ["termly.io"]],
  ];
  for (const [name, sigs] of seoChecks) {
    if (sigs.some(s => lc.includes(s))) seoTools.push({ name, confidence: "medium" });
  }

  // Project Management / Productivity (embedded links)
  const productivity: { name: string; confidence: string }[] = [];
  const prodChecks: [string, string[]][] = [
    ["Notion", ["notion.so", "notion.com"]],
    ["Airtable", ["airtable.com"]],
    ["Slack", ["slack.com"]],
    ["Discord", ["discord.com", "discord.gg"]],
    ["Trello", ["trello.com"]],
    ["Asana", ["asana.com"]],
    ["Linear", ["linear.app"]],
    ["ClickUp", ["clickup.com"]],
    ["Miro", ["miro.com"]],
    ["Figma", ["figma.com"]],
    ["Canva", ["canva.com"]],
  ];
  for (const [name, sigs] of prodChecks) {
    if (sigs.some(s => lc.includes(s))) productivity.push({ name, confidence: "medium" });
  }

  // Social Media Integrations (SDKs, embeds, share buttons, login)
  const socialMedia: { name: string; confidence: string }[] = [];
  const socialChecks: [string, string[]][] = [
    ["Facebook SDK", ["connect.facebook.net", "fb-root", "facebook-jssdk", "fb.init"]],
    ["Facebook Login", ["facebook.com/dialog/oauth", "fb-login", "login/facebook"]],
    ["Facebook Share", ["facebook.com/sharer", "fb-share"]],
    ["Instagram Embed", ["instagram.com/embed", "instgrm.Embeds"]],
    ["Instagram API", ["graph.instagram.com", "instagram-api"]],
    ["Twitter/X Embed", ["platform.twitter.com/widgets", "twitter-timeline", "twitter-tweet"]],
    ["Twitter/X Share", ["twitter.com/intent/tweet", "twitter.com/share"]],
    ["TikTok Embed", ["tiktok.com/embed", "tiktok-embed"]],
    ["TikTok SDK", ["analytics.tiktok.com"]],
    ["YouTube Embed", ["youtube.com/embed", "youtube-nocookie.com"]],
    ["YouTube API", ["youtube.googleapis.com"]],
    ["LinkedIn Share", ["linkedin.com/shareArticle", "in/share"]],
    ["LinkedIn SDK", ["platform.linkedin.com"]],
    ["Pinterest Widget", ["assets.pinterest.com/js/pinit", "pinterest.com/pin/create"]],
    ["Reddit Embed", ["embed.reddit.com"]],
    ["Discord Widget", ["discord.com/widget", "discordapp.com/widget"]],
    ["Telegram Widget", ["telegram.org/js/telegram-widget"]],
    ["WhatsApp Share", ["api.whatsapp.com", "wa.me"]],
    ["Snapchat Embed", ["snapkit.com", "snap-connected"]],
    ["Threads Share", ["threads.net"]],
    ["Bluesky", ["bsky.app", "atproto"]],
    ["Tumblr Share", ["tumblr.com/share", "tumblr.com/widgets"]],
    ["Twitch Embed", ["player.twitch.tv", "embed.twitch.tv"]],
    ["Spotify Embed", ["open.spotify.com/embed"]],
    ["SoundCloud Embed", ["w.soundcloud.com/player"]],
    ["ShareThis", ["sharethis.com", "platform-api.sharethis.com"]],
    ["AddThis", ["addthis.com", "addthiscdn.com"]],
    ["Google Sign-In", ["accounts.google.com/gsi", "google-signin", "g_id_onload"]],
    ["Apple Sign-In", ["appleid.apple.com"]],
    ["GitHub Login", ["github.com/login/oauth"]],
  ];
  for (const [name, sigs] of socialChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) socialMedia.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Database & Backend-as-a-Service
  const database: { name: string; confidence: string }[] = [];
  const dbChecks: [string, string[]][] = [
    ["Supabase", ["supabase.co", "supabase.com"]],
    ["Firebase", ["firebase.google.com", "firebaseio.com", "firebaseapp.com"]],
    ["MongoDB Realm", ["realm.mongodb.com"]],
    ["AWS Amplify", ["aws-amplify", "amplifyapp.com"]],
    ["Appwrite", ["appwrite.io"]],
    ["Convex", ["convex.dev", "convex.cloud"]],
    ["Neon", ["neon.tech"]],
    ["PlanetScale", ["planetscale.com"]],
    ["Upstash", ["upstash.com"]],
    ["Hasura", ["hasura.io", "hasura.app"]],
    ["Sanity", ["sanity.io", "cdn.sanity.io"]],
    ["Contentful", ["contentful.com", "ctfassets.net"]],
    ["Strapi", ["strapi.io"]],
    ["Storyblok", ["storyblok.com"]],
    ["Builder.io", ["builder.io", "cdn.builder.io"]],
    ["Algolia", ["algolia.com", "algolianet.com", "algoliasearch"]],
    ["Xata", ["xata.io"]],
  ];
  for (const [name, sigs] of dbChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) database.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // AI & ML Tools
  const aiTools: { name: string; confidence: string }[] = [];
  const aiChecks: [string, string[]][] = [
    ["OpenAI/ChatGPT", ["openai.com", "api.openai.com"]],
    ["Anthropic/Claude", ["anthropic.com"]],
    ["Google AI/Gemini", ["generativelanguage.googleapis.com"]],
    ["Replicate", ["replicate.com", "replicate.delivery"]],
    ["Hugging Face", ["huggingface.co"]],
    ["ElevenLabs", ["elevenlabs.io"]],
    ["Deepgram", ["deepgram.com"]],
    ["Jasper AI", ["jasper.ai"]],
    ["Synthesia", ["synthesia.io"]],
    ["Algolia AI", ["algolia.com"]],
    ["Pinecone", ["pinecone.io"]],
  ];
  for (const [name, sigs] of aiChecks) {
    const matched = sigs.filter(s => lc.includes(s));
    if (matched.length > 0) aiTools.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
  }

  // Affiliate & Referral
  const affiliate: { name: string; confidence: string }[] = [];
  const affChecks: [string, string[]][] = [
    ["ReferralCandy", ["referralcandy.com"]],
    ["PartnerStack", ["partnerstack.com"]],
    ["Impact", ["impact.com", "impactradius.com"]],
    ["CJ Affiliate", ["cj.com"]],
    ["ShareASale", ["shareasale.com"]],
    ["Awin", ["awin.com", "awin1.com"]],
    ["Refersion", ["refersion.com"]],
    ["Tapfiliate", ["tapfiliate.com"]],
    ["FirstPromoter", ["firstpromoter.com"]],
    ["Rewardful", ["rewardful.com"]],
  ];
  for (const [name, sigs] of affChecks) {
    if (sigs.some(s => lc.includes(s))) affiliate.push({ name, confidence: "medium" });
  }

  // Personalization & A/B Testing
  const personalization: { name: string; confidence: string }[] = [];
  const persChecks: [string, string[]][] = [
    ["Optimizely", ["optimizely.com"]],
    ["VWO", ["visualwebsiteoptimizer.com", "vwo_"]],
    ["AB Tasty", ["abtasty.com"]],
    ["LaunchDarkly", ["launchdarkly.com"]],
    ["Statsig", ["statsig.com"]],
    ["GrowthBook", ["growthbook.io"]],
    ["Dynamic Yield", ["dynamicyield.com"]],
    ["Nosto", ["nosto.com"]],
  ];
  for (const [name, sigs] of persChecks) {
    if (sigs.some(s => lc.includes(s))) personalization.push({ name, confidence: "medium" });
  }

  return { crm, payments, analytics, marketing, support, ecommerce, hosting, frameworks, ads, security, scheduling, forms, engagement, socialProof, seoTools, productivity, socialMedia, database, aiTools, affiliate, personalization };
}

function extractMetadata(html: string, url: string, securityHeaders: Record<string, string>, deepScan?: DeepScanCorpus) {
  const lc = html.toLowerCase();
  const title = getTag(html, "title");
  const description = getMeta(html, "name", "description") || getMeta(html, "property", "og:description");
  const keywords = getMeta(html, "name", "keywords");
  const author = getMeta(html, "name", "author");
  const robots = getMeta(html, "name", "robots");
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || "";
  const language = html.match(/<html[^>]*lang=["']([^"']*)["']/i)?.[1] || "";
  const charset = html.match(/<meta[^>]*charset=["']?([^"'\s>]+)/i)?.[1] || "";
  const viewport = getMeta(html, "name", "viewport");
  const generator = getMeta(html, "name", "generator");
  const themeColor = getMeta(html, "name", "theme-color");

  const og = {
    title: getMeta(html, "property", "og:title"),
    description: getMeta(html, "property", "og:description"),
    image: getMeta(html, "property", "og:image"),
    url: getMeta(html, "property", "og:url"),
    type: getMeta(html, "property", "og:type"),
    siteName: getMeta(html, "property", "og:site_name"),
    locale: getMeta(html, "property", "og:locale"),
  };

  const twitter = {
    card: getMeta(html, "name", "twitter:card") || getMeta(html, "property", "twitter:card"),
    site: getMeta(html, "name", "twitter:site") || getMeta(html, "property", "twitter:site"),
    creator: getMeta(html, "name", "twitter:creator") || getMeta(html, "property", "twitter:creator"),
    title: getMeta(html, "name", "twitter:title") || getMeta(html, "property", "twitter:title"),
    description: getMeta(html, "name", "twitter:description") || getMeta(html, "property", "twitter:description"),
    image: getMeta(html, "name", "twitter:image") || getMeta(html, "property", "twitter:image"),
  };

  const h1s = getAllMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
  const h2s = getAllMatches(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
  const h3s = getAllMatches(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);

  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  const allAnchors = getAllMatches(html, /<a[^>]*href=["']([^"'#]+)["']/gi);
  const domain = new URL(url).hostname;
  for (const href of allAnchors) {
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === domain || linkUrl.hostname.endsWith("." + domain)) {
        if (!internalLinks.includes(linkUrl.href)) internalLinks.push(linkUrl.href);
      } else {
        if (!externalLinks.includes(linkUrl.href)) externalLinks.push(linkUrl.href);
      }
    } catch { /* skip */ }
  }

  const imagesWithAlt: { src: string; alt: string; hasAlt: boolean }[] = [];
  const imgRegex = /<img[^>]*>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const tag = imgMatch[0];
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1] || "";
    const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1] || "";
    const hasAlt = /alt=["']/i.test(tag);
    if (src) imagesWithAlt.push({ src, alt, hasAlt });
  }

  const scripts = getAllMatches(html, /<script[^>]*src=["']([^"']+)["']/gi).slice(0, 50);
  const stylesheets = getAllMatches(html, /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi).slice(0, 30);
  const inlineScriptCount = (html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length;
  const inlineStyleCount = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).length;

  const hasServiceWorker = html.includes("serviceWorker") || html.includes("service-worker");
  const hasManifest = /<link[^>]*rel=["']manifest["']/i.test(html);
  const hasPreconnect = /<link[^>]*rel=["']preconnect["']/i.test(html);
  const hasPreload = /<link[^>]*rel=["']preload["']/i.test(html);
  const hasDeferScripts = /<script[^>]*defer/i.test(html);
  const hasAsyncScripts = /<script[^>]*async/i.test(html);
  const hasLazyImages = /loading=["']lazy["']/i.test(html);
  const hasResponsiveImages = /srcset=["']/i.test(html);
  const hasWebP = /\.webp/i.test(html);
  const hasAVIF = /\.avif/i.test(html);

  const jsonLdBlocks = getAllMatches(html, /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const structuredData = jsonLdBlocks.map(b => { try { return JSON.parse(b); } catch { return null; } }).filter(Boolean);

  const socialPatterns: Record<string, RegExp> = {
    facebook: /facebook\.com\/[^"'\s)]+/gi,
    twitter: /(?:twitter|x)\.com\/[^"'\s)]+/gi,
    instagram: /instagram\.com\/[^"'\s)]+/gi,
    linkedin: /linkedin\.com\/[^"'\s)]+/gi,
    youtube: /youtube\.com\/[^"'\s)]+/gi,
    tiktok: /tiktok\.com\/@[^"'\s)]+/gi,
    pinterest: /pinterest\.com\/[^"'\s)]+/gi,
    github: /github\.com\/[^"'\s)]+/gi,
    reddit: /reddit\.com\/[^"'\s)]+/gi,
    discord: /discord\.gg\/[^"'\s)]+/gi,
    telegram: /t\.me\/[^"'\s)]+/gi,
    whatsapp: /wa\.me\/[^"'\s)]+/gi,
    snapchat: /snapchat\.com\/add\/[^"'\s)]+/gi,
    threads: /threads\.net\/@[^"'\s)]+/gi,
    mastodon: /mastodon\.[^"'\s)]+\/@[^"'\s)]+/gi,
  };
  const socialLinks: Record<string, string[]> = {};
  for (const [platform, regex] of Object.entries(socialPatterns)) {
    const matches = [...new Set(html.match(regex) || [])].map(m => m.startsWith("http") ? m : `https://${m}`);
    if (matches.length) socialLinks[platform] = matches.slice(0, 5);
  }

  // Detect platforms using deep multi-page corpus when available
  const detectionHtml = deepScan?.combinedHtml || html;
  const detectionScripts = deepScan?.combinedScripts?.length ? deepScan.combinedScripts : scripts;
  const detectionStylesheets = deepScan?.combinedStylesheets?.length ? deepScan.combinedStylesheets : stylesheets;
  const detectionExternalLinks = deepScan?.combinedExternalLinks?.length ? deepScan.combinedExternalLinks : externalLinks;
  const detectedPlatforms = detectPlatforms(detectionHtml, detectionScripts, detectionStylesheets, detectionExternalLinks, iframes);

  // Accessibility checks
  const formCount = (html.match(/<form/gi) || []).length;
  const inputsWithLabels = (html.match(/<label/gi) || []).length;
  const ariaCount = (html.match(/aria-/gi) || []).length;
  const roleCount = (html.match(/role=["']/gi) || []).length;
  const tabIndexCount = (html.match(/tabindex/gi) || []).length;
  const hasSkipNav = /skip.*(nav|content|main)/i.test(html);
  const hasFocusStyles = /focus/i.test(html);

  // Font detection
  const googleFonts = [...new Set(getAllMatches(html, /fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi))];
  const customFonts = [...new Set(getAllMatches(html, /font-family:\s*['"]?([^;'"]+)/gi))].slice(0, 10);
  const adobeFonts = html.includes("use.typekit.net") || html.includes("adobe");

  // iFrames
  const iframes = getAllMatches(html, /<iframe[^>]*src=["']([^"']+)["']/gi).slice(0, 15);

  // Text content
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  // Phone numbers & emails on page
  const phoneNumbers = [...new Set(textContent.match(/(?:\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g) || [])].slice(0, 5);
  const emailAddresses = [...new Set(html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])].slice(0, 10);

  // SEO score
  let seoScore = 0;
  if (title) seoScore += 10;
  if (title.length >= 30 && title.length <= 60) seoScore += 5;
  if (description) seoScore += 10;
  if (description.length >= 120 && description.length <= 160) seoScore += 5;
  if (h1s.length === 1) seoScore += 10; else if (h1s.length > 1) seoScore += 3;
  if (canonical) seoScore += 5;
  if (og.title && og.description && og.image) seoScore += 10;
  if (twitter.card) seoScore += 5;
  if (structuredData.length > 0) seoScore += 10;
  if (viewport) seoScore += 5;
  if (hasLazyImages) seoScore += 5;
  if (language) seoScore += 5;
  if (robots && !robots.includes("noindex")) seoScore += 5;
  if (hasResponsiveImages) seoScore += 3;
  if (hasWebP || hasAVIF) seoScore += 2;
  if (imagesWithAlt.length > 0) {
    const altRatio = imagesWithAlt.filter(i => i.hasAlt && i.alt).length / imagesWithAlt.length;
    seoScore += Math.round(altRatio * 10);
  }

  const pageSizeKB = Math.round(new TextEncoder().encode(html).length / 1024);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const anchorTags = html.match(/<a\b[^>]*>/gi) || [];
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const tagMatches = [...html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)(\s|>|\/)/g)].map(m => m[1].toLowerCase());
  const uniqueTagCount = new Set(tagMatches).size;
  const totalTagCount = tagMatches.length;
  const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
  const inlineScriptTags = scriptTags.filter(t => !/\ssrc\s*=|^<script[^>]*src=/i.test(t));
  const externalScriptTags = scriptTags.filter(t => /\ssrc\s*=|^<script[^>]*src=/i.test(t));
  const styleTags = html.match(/<style\b[^>]*>/gi) || [];
  const deferScriptCount = scriptTags.filter(t => /\sdefer(\s|>|=)/i.test(t)).length;
  const asyncScriptCount = scriptTags.filter(t => /\sasync(\s|>|=)/i.test(t)).length;
  const moduleScriptCount = scriptTags.filter(t => /type=["']module["']/i.test(t)).length;

  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const lazyImageCount = imageTags.filter(t => /loading=["']lazy["']/i.test(t)).length;
  const responsiveImageCount = imageTags.filter(t => /srcset=["']/i.test(t)).length;
  const imageWithWidthHeightCount = imageTags.filter(t => /\swidth=["']/i.test(t) && /\sheight=["']/i.test(t)).length;
  const pictureTagCount = (html.match(/<picture\b/gi) || []).length;
  const sourceTagCount = (html.match(/<source\b/gi) || []).length;
  const videoTagCount = (html.match(/<video\b/gi) || []).length;
  const audioTagCount = (html.match(/<audio\b/gi) || []).length;
  const embedTagCount = (html.match(/<embed\b/gi) || []).length;
  const svgTagCount = (html.match(/<svg\b/gi) || []).length;

  const headingCount = h1s.length + h2s.length + h3s.length;
  const headingDepthScore = round2((h1s.length * 3) + (h2s.length * 2) + h3s.length);

  const keywordList = keywords
    ? keywords.split(",").map(k => k.trim()).filter(Boolean)
    : [];

  const keywordWordCount = keywordList.reduce((acc, item) => acc + item.split(/\s+/).filter(Boolean).length, 0);
  const sentenceCount = textContent.split(/[.!?]+/).map(s => s.trim()).filter(Boolean).length;
  const words = textContent.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const longWordCount = words.filter(w => w.replace(/[^a-zA-Z]/g, "").length >= 8).length;
  const paragraphCount = (html.match(/<p\b/gi) || []).length;
  const listItemCount = (html.match(/<li\b/gi) || []).length;
  const tableCount = (html.match(/<table\b/gi) || []).length;
  const blockquoteCount = (html.match(/<blockquote\b/gi) || []).length;

  const mailtoLinkCount = allAnchors.filter(h => /^mailto:/i.test(h)).length;
  const telLinkCount = allAnchors.filter(h => /^tel:/i.test(h)).length;
  const javascriptLinkCount = allAnchors.filter(h => /^javascript:/i.test(h)).length;
  const fragmentLinkCount = (html.match(/<a[^>]*href=["']#[^"']*["']/gi) || []).length;
  const nofollowLinkCount = anchorTags.filter(t => /rel=["'][^"']*nofollow/i.test(t)).length;
  const noopenerLinkCount = anchorTags.filter(t => /rel=["'][^"']*noopener/i.test(t)).length;
  const noreferrerLinkCount = anchorTags.filter(t => /rel=["'][^"']*noreferrer/i.test(t)).length;
  const targetBlankCount = anchorTags.filter(t => /target=["']_blank["']/i.test(t)).length;

  const externalDomains = new Set(
    externalLinks
      .map(link => {
        try { return new URL(link).hostname; } catch { return ""; }
      })
      .filter(Boolean)
  );

  const ogMetaCount = (html.match(/<meta[^>]*(property|name)=["']og:/gi) || []).length;
  const twitterMetaCount = (html.match(/<meta[^>]*(property|name)=["']twitter:/gi) || []).length;
  const canonicalCount = (html.match(/<link[^>]*rel=["']canonical["']/gi) || []).length;
  const hreflangCount = (html.match(/<link[^>]*hreflang=["']/gi) || []).length;
  const alternateLinkCount = (html.match(/<link[^>]*rel=["']alternate["']/gi) || []).length;
  const faviconCount = (html.match(/<link[^>]*rel=["'][^"']*icon[^"']*["']/gi) || []).length;
  const rssFeedCount = (html.match(/<link[^>]*type=["']application\/(rss|atom)\+xml["']/gi) || []).length;
  const ampLinkCount = (html.match(/<link[^>]*rel=["']amphtml["']/gi) || []).length;
  const sitemapMentionCount = ((html.match(/sitemap\.xml/gi) || []).length + (robots.match(/sitemap/i) ? 1 : 0));

  const mainCount = (html.match(/<main\b/gi) || []).length;
  const navCount = (html.match(/<nav\b/gi) || []).length;
  const headerCount = (html.match(/<header\b/gi) || []).length;
  const footerCount = (html.match(/<footer\b/gi) || []).length;
  const asideCount = (html.match(/<aside\b/gi) || []).length;
  const buttonCount = (html.match(/<button\b/gi) || []).length;
  const inputCount = (html.match(/<input\b/gi) || []).length;
  const selectCount = (html.match(/<select\b/gi) || []).length;
  const textareaCount = (html.match(/<textarea\b/gi) || []).length;
  const ariaLabelCount = (html.match(/aria-label=["']/gi) || []).length;
  const ariaDescribedByCount = (html.match(/aria-describedby=["']/gi) || []).length;
  const altAttributeCount = (html.match(/\salt=["']/gi) || []).length;
  const headingHierarchyIssues = (h1s.length === 0 ? 1 : 0) + (h1s.length > 1 ? 1 : 0);

  const platformCategoryCount = Object.values(detectedPlatforms).filter(v => Array.isArray(v) && v.length > 0).length;
  const totalPlatformDetections = Object.values(detectedPlatforms).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);

  const boolToNumber = (value: boolean) => (value ? 1 : 0);
  const secureHeadersPresent = [
    securityHeaders?.strictTransportSecurity && securityHeaders.strictTransportSecurity !== "",
    securityHeaders?.contentSecurityPolicy === "Present",
    (securityHeaders?.xFrameOptions || "") !== "Missing",
    (securityHeaders?.xContentTypeOptions || "") !== "Missing",
    (securityHeaders?.referrerPolicy || "") !== "Missing",
    securityHeaders?.permissionsPolicy === "Present",
  ].filter(Boolean).length;


  // Build screenshot URL using free public screenshot API
  const screenshotUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodeURIComponent(url)}`;

  // Curated advanced metrics - only the most important visual ones grouped by category
  const curatedMetrics = {
    contentQuality: {
      label: "Content Quality",
      items: {
        "Word Count": wordCount,
        "Reading Time": `${round2(wordCount / 200)} min`,
        "Sentences": sentenceCount,
        "Paragraphs": paragraphCount,
        "Unique Word Ratio": `${round2(wordCount ? (uniqueWords.size / wordCount) * 100 : 0)}%`,
        "Text/HTML Ratio": `${round2(html.length ? (textContent.length / html.length) * 100 : 0)}%`,
        "Content Density": `${round2(pageSizeKB ? wordCount / pageSizeKB : 0)} words/KB`,
      },
    },
    seoSignals: {
      label: "SEO Signals",
      items: {
        "Title Length": `${title.length}/60`,
        "Description Length": `${description.length}/160`,
        "H1 Tags": h1s.length,
        "H2 Tags": h2s.length,
        "Canonical": canonicalCount > 0 ? "✓" : "✗",
        "Hreflang Tags": hreflangCount,
        "JSON-LD Blocks": structuredData.length,
        "RSS/Atom Feeds": rssFeedCount,
        "Sitemap Reference": sitemapMentionCount > 0 ? "✓" : "✗",
      },
    },
    mediaAssets: {
      label: "Media & Assets",
      items: {
        "Total Images": imageTags.length,
        "Alt Coverage": `${round2(imageTags.length ? (imagesWithAlt.filter(i => i.hasAlt && i.alt).length / imageTags.length) * 100 : 0)}%`,
        "Lazy Loaded": `${lazyImageCount}/${imageTags.length}`,
        "Responsive (srcset)": responsiveImageCount,
        "WebP Used": hasWebP ? "✓" : "✗",
        "AVIF Used": hasAVIF ? "✓" : "✗",
        "Videos": videoTagCount,
        "SVG Elements": svgTagCount,
        "iFrames": iframes.length,
      },
    },
    techStack: {
      label: "Tech Stack",
      items: {
        "External Scripts": externalScriptTags.length,
        "Inline Scripts": inlineScriptTags.length,
        "Stylesheets": stylesheets.length,
        "Module Scripts": moduleScriptCount,
        "Page Size": `${pageSizeKB} KB`,
        "SPA Framework": (lc.includes("__next") || lc.includes("__nuxt") || lc.includes("__gatsby") || lc.includes("__react") || lc.includes("__vue")) ? "✓" : "✗",
        "PWA Ready": (hasServiceWorker && hasManifest) ? "✓" : "✗",
        "GraphQL": lc.includes("graphql") ? "✓" : "✗",
        "WebSocket": (lc.includes("websocket") || lc.includes("wss://")) ? "✓" : "✗",
      },
    },
    monetization: {
      label: "Monetization & Commerce",
      items: {
        "Payment Providers": detectedPlatforms.payments.length,
        "E-commerce Platforms": detectedPlatforms.ecommerce.length,
        "Checkout Flow": (lc.includes("checkout") || lc.includes("cart") || lc.includes("add-to-cart")) ? "✓" : "✗",
        "Subscription UI": (lc.includes("subscription") || lc.includes("recurring") || lc.includes("monthly")) ? "✓" : "✗",
        "Free Trial": (lc.includes("free trial") || lc.includes("free-trial") || lc.includes("start free")) ? "✓" : "✗",
        "Price Points Found": (html.match(/[\$€£]\s?\d+[\.,]?\d{0,2}/g) || []).length,
        "Pricing Page": (lc.includes("pricing") || lc.includes("plans")) ? "✓" : "✗",
        "Ad Networks": detectedPlatforms.ads.length,
        "Affiliate Tools": detectedPlatforms.affiliate.length,
      },
    },
    uxFeatures: {
      label: "UX & Features",
      items: {
        "Dark Mode": (lc.includes("dark-mode") || lc.includes("theme-toggle") || lc.includes("color-scheme")) ? "✓" : "✗",
        "Search Bar": (lc.includes("search") && (lc.includes('type="search"') || lc.includes("search-input"))) ? "✓" : "✗",
        "Live Chat": detectedPlatforms.support.length > 0 ? "✓" : "✗",
        "Newsletter Signup": (lc.includes("newsletter") || lc.includes("subscribe") || lc.includes("mailing-list")) ? "✓" : "✗",
        "Cookie Consent": (lc.includes("cookie") && (lc.includes("consent") || lc.includes("gdpr"))) ? "✓" : "✗",
        "FAQ Section": (lc.includes("faq") || lc.includes("frequently-asked")) ? "✓" : "✗",
        "Testimonials": (lc.includes("testimonial") || lc.includes("review") || lc.includes("client-says")) ? "✓" : "✗",
        "Blog": (lc.includes("/blog") || lc.includes("blog-post")) ? "✓" : "✗",
        "i18n Support": (hreflangCount > 0 || lc.includes("i18n") || lc.includes("intl")) ? "✓" : "✗",
      },
    },
    linkProfile: {
      label: "Link Profile",
      items: {
        "Internal Links": internalLinks.length,
        "External Links": externalLinks.length,
        "External Domains": externalDomains.size,
        "Nofollow Links": nofollowLinkCount,
        "Target Blank": targetBlankCount,
        "Mailto Links": mailtoLinkCount,
        "Tel Links": telLinkCount,
        "Social Platforms Linked": Object.keys(socialLinks).length,
      },
    },
    securityScore: {
      label: "Security & Privacy",
      items: {
        "HTTPS": url.startsWith("https://") ? "✓" : "✗",
        "HSTS": (securityHeaders?.strictTransportSecurity && securityHeaders.strictTransportSecurity !== "") ? "✓" : "✗",
        "CSP": securityHeaders?.contentSecurityPolicy === "Present" ? "✓" : "✗",
        "X-Frame-Options": (securityHeaders?.xFrameOptions || "") !== "Missing" ? "✓" : "✗",
        "Referrer Policy": (securityHeaders?.referrerPolicy || "") !== "Missing" ? "✓" : "✗",
        "Permissions Policy": securityHeaders?.permissionsPolicy === "Present" ? "✓" : "✗",
        "Security Headers": `${secureHeadersPresent}/6`,
      },
    },
  };

  return {
    basic: { title, description, keywords, author, robots, canonical, language, charset, viewport, generator, themeColor },
    openGraph: og,
    twitterCard: twitter,
    headings: { h1: h1s, h2: h2s, h3: h3s },
    links: { internal: internalLinks.slice(0, 50), external: externalLinks.slice(0, 50), totalInternal: internalLinks.length, totalExternal: externalLinks.length },
    images: { total: imagesWithAlt.length, withAlt: imagesWithAlt.filter(i => i.hasAlt && i.alt).length, withoutAlt: imagesWithAlt.filter(i => !i.hasAlt || !i.alt).length, samples: imagesWithAlt.slice(0, 15) },
    scripts: { external: scripts, inlineCount: inlineScriptCount, stylesheets, inlineStyleCount },
    performance: { hasServiceWorker, hasManifest, hasPreconnect, hasPreload, hasDeferScripts, hasAsyncScripts, hasLazyImages, hasResponsiveImages, hasWebP, hasAVIF, pageSizeKB },
    structuredData,
    socialLinks,
    detectedPlatforms,
    screenshotUrl,
    scanCoverage: {
      pagesScanned: deepScan?.pagesScanned || 1,
      scannedUrls: (deepScan?.scannedUrls || [url]).slice(0, 30),
      sitemapUrlsFound: deepScan?.sitemapUrls?.length || 0,
      sitemapSample: (deepScan?.sitemapUrls || []).slice(0, 20),
      subdomainsFound: deepScan?.subdomainsFound || [],
    },
    accessibility: { formCount, inputsWithLabels, ariaCount, roleCount, tabIndexCount, hasSkipNav, hasFocusStyles },
    fonts: { googleFonts, customFonts, adobeFonts },
    iframes,
    contactInfo: { phoneNumbers, emailAddresses },
    content: { wordCount, textPreview: textContent.slice(0, 500) },
    curatedMetrics,
    seoScore: Math.min(seoScore, 100),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) throw new Error("URL is required");

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let parsedUrl: URL;
    try { parsedUrl = new URL(formattedUrl); } catch { throw new Error("Invalid URL format"); }

    const hostname = parsedUrl.hostname;
    if (hostname === "localhost" || hostname.startsWith("127.") || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname === "0.0.0.0") {
      throw new Error("Cannot scrape internal/private addresses");
    }

    console.log("Scraping:", formattedUrl);

    const response = await fetch(formattedUrl, {
      headers: SCRAPE_HEADERS,
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`Site returned HTTP ${response.status} ${response.statusText}`);

    const html = await response.text();
    const finalUrl = response.url;
    const server = response.headers.get("server") || "";
    const xPoweredBy = response.headers.get("x-powered-by") || "";

    const securityHeaders = {
      strictTransportSecurity: response.headers.get("strict-transport-security") || "",
      contentSecurityPolicy: response.headers.get("content-security-policy") ? "Present" : "Missing",
      xFrameOptions: response.headers.get("x-frame-options") || "Missing",
      xContentTypeOptions: response.headers.get("x-content-type-options") || "Missing",
      referrerPolicy: response.headers.get("referrer-policy") || "Missing",
      permissionsPolicy: response.headers.get("permissions-policy") ? "Present" : "Missing",
    };

    const deepScan = await buildDeepScanCorpus(finalUrl, html);
    console.log(`Deep scan: ${deepScan.pagesScanned} pages, ${deepScan.sitemapUrls.length} sitemap URLs, ${deepScan.subdomainsFound.length} subdomains`);
    const metadata = extractMetadata(html, finalUrl, securityHeaders, deepScan);
    const isHttps = finalUrl.startsWith("https://");

    return new Response(JSON.stringify({
      success: true,
      url: formattedUrl,
      finalUrl,
      contentType: response.headers.get("content-type") || "",
      server: server || xPoweredBy || "Unknown",
      isHttps,
      securityHeaders,
      ...metadata,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("site-scraper error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
