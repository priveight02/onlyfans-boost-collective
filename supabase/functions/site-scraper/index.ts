import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Safe helpers ─────────────────────────────────
function safeMatch(html: string, regex: RegExp): string[] {
  try {
    const results: string[] = [];
    let m;
    let i = 0;
    while ((m = regex.exec(html)) !== null && i++ < 500) results.push(m[1] || m[0]);
    return results;
  } catch { return []; }
}

function getMeta(html: string, attr: string, val: string): string {
  try {
    const patterns = [
      new RegExp(`<meta[^>]*${attr}=["']${val}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${val}["']`, "i"),
    ];
    for (const p of patterns) { const m = html.match(p); if (m) return m[1]; }
  } catch {}
  return "";
}

function getTag(html: string, name: string): string {
  try {
    const m = html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    return m?.[1]?.trim() || "";
  } catch { return ""; }
}

const SCRAPE_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

// ─── Domain helpers ───────────────────────────────
function normalizeHost(host: string): string { return host.trim().toLowerCase().replace(/^www\./, ""); }

function getRegistrableDomain(host: string): string {
  const n = normalizeHost(host);
  const parts = n.split(".").filter(Boolean);
  if (parts.length <= 2) return n;
  const commonSLD = new Set(["co", "com", "org", "net", "gov", "edu", "ac"]);
  if (parts[parts.length - 1].length === 2 && commonSLD.has(parts[parts.length - 2]) && parts.length >= 3) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

function isSameSite(root: string, test: string): boolean {
  try { return getRegistrableDomain(test) === getRegistrableDomain(root); } catch { return false; }
}

// ─── Safe fetch with timeout ──────────────────────
async function safeFetch(url: string, timeoutMs = 6000): Promise<Response | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: SCRAPE_HEADERS, redirect: "follow", signal: c.signal });
    return r;
  } catch { return null; }
  finally { clearTimeout(t); }
}

async function safeFetchText(url: string, timeoutMs = 6000, maxLen = 300_000): Promise<string> {
  try {
    const r = await safeFetch(url, timeoutMs);
    if (!r?.ok) return "";
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (["image/", "video/", "audio/", "font/"].some(p => ct.startsWith(p))) return "";
    return (await r.text()).slice(0, maxLen);
  } catch { return ""; }
}

async function safeFetchHtml(url: string): Promise<string | null> {
  try {
    const r = await safeFetch(url, 7000);
    if (!r?.ok) return null;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("xhtml") && !ct.includes("xml")) return null;
    return (await r.text()).slice(0, 500_000);
  } catch { return null; }
}

// ─── Deep scan corpus builder ─────────────────────
const SUB_SEEDS = ["www", "app", "api", "checkout", "pay", "billing", "portal", "shop", "store", "m", "help", "docs"];
const INTENT_PATHS = ["/pricing", "/plans", "/checkout", "/cart", "/billing", "/pay", "/subscribe", "/store", "/shop", "/products", "/api", "/docs", "/integrations", "/about", "/contact"];
const SENSITIVE_PATHS = ["/.env", "/.env.local", "/.env.production", "/.env.backup", "/.htaccess", "/.git/config", "/.git/HEAD", "/wp-config.php.bak", "/.aws/credentials", "/.docker/config.json", "/config.yml", "/database.yml"];

function extractLinks(html: string, base: string, rootDomain: string): string[] {
  const links = new Set<string>();
  try {
    for (const href of safeMatch(html, /<a[^>]*href=["']([^"'#]+)["']/gi)) {
      try {
        const u = new URL(href, base);
        if (["http:", "https:"].includes(u.protocol) && isSameSite(rootDomain, u.hostname)) {
          if (!/\.(jpg|jpeg|png|gif|svg|webp|avif|mp4|pdf|zip|css|js|ico|woff2?|ttf)(\?|#|$)/i.test(u.pathname))
            links.add(u.href);
        }
      } catch {}
    }
  } catch {}
  return [...links];
}

function prioritize(links: string[]): string[] {
  const kw = ["checkout", "payment", "billing", "pricing", "plans", "subscribe", "cart", "buy", "shop", "store", "product", "api", "docs"];
  return [...new Set(links)].sort((a, b) => {
    const as = kw.reduce((s, k) => s + (a.toLowerCase().includes(k) ? 10 : 0), 0);
    const bs = kw.reduce((s, k) => s + (b.toLowerCase().includes(k) ? 10 : 0), 0);
    return bs - as;
  });
}

function extractJsChunkUrls(jsBody: string, baseScriptUrl: string, rootDomain: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /["'`](\/assets\/[^"'`\s]+?\.js(?:\?[^"'`\s]*)?)["'`]/gi,
    /["'`]((?:https?:)?\/\/[^"'`\s]+?\.js(?:\?[^"'`\s]*)?)["'`]/gi,
    /import\(["'`]([^"'`\s]+?\.js(?:\?[^"'`\s]*)?)["'`]\)/gi,
  ];

  const add = (rawUrl: string) => {
    try {
      const resolved = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
      const u = new URL(resolved, baseScriptUrl);
      if (["http:", "https:"].includes(u.protocol) && isSameSite(rootDomain, u.hostname)) {
        found.add(u.href);
      }
    } catch {}
  };

  for (const p of patterns) {
    for (const match of safeMatch(jsBody, p)) add(match);
  }

  return [...found];
}

async function fetchSitemapUrls(origins: string[], rootDomain: string): Promise<{ urls: string[]; sources: string[] }> {
  const smPaths = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml", "/sitemap1.xml", "/page-sitemap.xml"];
  const queued = new Set<string>();
  const queue: string[] = [];
  const sources: string[] = [];
  const urls = new Set<string>();

  const addCandidate = (c: string, base?: string) => {
    try {
      const u = base ? new URL(c, base) : new URL(c);
      if (!queued.has(u.href) && isSameSite(rootDomain, u.hostname)) { queued.add(u.href); queue.push(u.href); }
    } catch {}
  };

  for (const o of origins) smPaths.forEach(p => addCandidate(p, o));

  // robots.txt
  await Promise.all(origins.slice(0, 8).map(async o => {
    try {
      const txt = await safeFetchText(`${o}/robots.txt`, 4000, 50_000);
      for (const line of txt.match(/^Sitemap:\s*(.+)$/gmi) || []) addCandidate(line.replace(/^Sitemap:\s*/i, "").trim(), o);
    } catch {}
  }));

  let processed = 0;
  while (queue.length > 0 && processed < 60) {
    const batch = queue.splice(0, 6);
    processed += batch.length;
    await Promise.all(batch.map(async smUrl => {
      try {
        const txt = await safeFetchText(smUrl, 5000, 200_000);
        if (!txt.includes("<loc")) return;
        sources.push(smUrl);
        for (const loc of txt.match(/<loc>\s*(.*?)\s*<\/loc>/gi) || []) {
          const v = loc.replace(/<\/?loc>/gi, "").trim();
          if (!v) continue;
          if (v.endsWith(".xml") || /sitemap/i.test(v)) addCandidate(v, smUrl);
          else { try { const u = new URL(v, smUrl); if (isSameSite(rootDomain, u.hostname)) urls.add(u.href); } catch {} }
        }
      } catch {}
    }));
  }

  return { urls: prioritize([...urls]).slice(0, 400), sources };
}

interface DeepCorpus {
  combined: string;
  scripts: string[];
  stylesheets: string[];
  externalLinks: string[];
  iframes: string[];
  scannedUrls: string[];
  pages: number;
  sitemapUrls: string[];
  subdomains: string[];
}

async function buildDeepCorpus(startUrl: string, seedHtml: string): Promise<DeepCorpus> {
  const MAX_PAGES = 40;
  const root = new URL(startUrl);
  const rootDomain = getRegistrableDomain(root.hostname);
  const origins = [...new Set([root.origin, `https://${normalizeHost(rootDomain)}`, `https://www.${normalizeHost(rootDomain)}`, ...SUB_SEEDS.map(s => `https://${s}.${normalizeHost(rootDomain)}`)])];

  const visited = new Set([startUrl]);
  const pages: { url: string; html: string }[] = [{ url: startUrl, html: seedHtml }];
  const subdomains = new Set<string>();
  const iframeSet = new Set<string>();

  for (const src of safeMatch(seedHtml, /<iframe[^>]*src=["']([^"']+)["']/gi)) {
    try { iframeSet.add(new URL(src, startUrl).href); } catch {}
  }

  let smResult: { urls: string[]; sources: string[] };
  try { smResult = await fetchSitemapUrls(origins, rootDomain); } catch { smResult = { urls: [], sources: [] }; }

  console.log(`Sitemap: ${smResult.urls.length} URLs from ${smResult.sources.length} sitemaps`);

  for (const u of smResult.urls) {
    try { const h = new URL(u).hostname; if (isSameSite(rootDomain, h) && normalizeHost(h) !== normalizeHost(root.hostname)) subdomains.add(h); } catch {}
  }

  const seedLinks = extractLinks(seedHtml, startUrl, rootDomain);
  const probes = origins.flatMap(o => INTENT_PATHS.map(p => `${o}${p}`));
  let queue = prioritize([...new Set([...smResult.urls, ...seedLinks, ...probes])].filter(u => !visited.has(u))).slice(0, 500);

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const batch = queue.splice(0, 6).filter(u => !visited.has(u));
    if (!batch.length) continue;

    const results = await Promise.all(batch.map(async u => {
      visited.add(u);
      const html = await safeFetchHtml(u);
      return { u, html };
    }));

    for (const { u, html } of results) {
      if (!html) continue;
      pages.push({ url: u, html });
      try { const h = new URL(u).hostname; if (isSameSite(rootDomain, h) && normalizeHost(h) !== normalizeHost(root.hostname)) subdomains.add(h); } catch {}
      for (const src of safeMatch(html, /<iframe[^>]*src=["']([^"']+)["']/gi)) {
        try { iframeSet.add(new URL(src, u).href); } catch {}
      }
      if (pages.length >= MAX_PAGES) break;
      const newLinks = extractLinks(html, u, rootDomain).filter(l => !visited.has(l));
      queue.push(...newLinks);
    }
    queue = prioritize([...new Set(queue)]).slice(0, 500);
  }

  const scriptSet = new Set<string>();
  const styleSet = new Set<string>();
  const extLinkSet = new Set<string>();

  for (const p of pages) {
    for (const s of safeMatch(p.html, /<script[^>]*src=["']([^"']+)["']/gi)) {
      try { const u = new URL(s, p.url); scriptSet.add(u.href); } catch {}
    }
    for (const h of safeMatch(p.html, /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi)) {
      try { const u = new URL(h, p.url); styleSet.add(u.href); } catch {}
    }
    for (const h of safeMatch(p.html, /<a[^>]*href=["']([^"'#]+)["']/gi)) {
      try { const u = new URL(h, p.url); if (!isSameSite(rootDomain, u.hostname)) extLinkSet.add(u.href); } catch {}
    }
  }

  // Fetch same-site JS bundles for deeper signature detection
  const sameScripts = [...scriptSet]
    .filter(s => { try { return isSameSite(rootDomain, new URL(s).hostname); } catch { return false; } })
    .slice(0, 24);

  const jsFetches = await Promise.all(sameScripts.map(async (s) => {
    const body = await safeFetchText(s, 7000, 900_000);
    return { url: s, body };
  }));

  const jsBodies = jsFetches.map(j => j.body).filter(Boolean);

  // Discover route-level chunk bundles referenced inside initial JS files
  const chunkCandidates = new Set<string>();
  for (const j of jsFetches) {
    if (!j.body) continue;
    for (const c of extractJsChunkUrls(j.body, j.url, rootDomain)) {
      if (!sameScripts.includes(c)) chunkCandidates.add(c);
    }
  }

  const chunkScripts = [...chunkCandidates].slice(0, 40);
  const chunkBodies = (await Promise.all(chunkScripts.map(c => safeFetchText(c, 7000, 500_000)))).filter(Boolean);

  const combined = pages.map(p => p.html).join("\n<!-- page -->\n") + "\n" + [...jsBodies, ...chunkBodies].join("\n");

  return {
    combined,
    scripts: [...scriptSet].slice(0, 200),
    stylesheets: [...styleSet].slice(0, 100),
    externalLinks: [...extLinkSet].slice(0, 400),
    iframes: [...iframeSet].slice(0, 100),
    scannedUrls: pages.map(p => p.url).slice(0, 80),
    pages: pages.length,
    sitemapUrls: smResult.urls.slice(0, 200),
    subdomains: [...subdomains].slice(0, 25),
  };
}

// ─── Sensitive file exposure probing ──────────────
async function probeSensitiveFiles(startUrl: string, rootDomain: string, knownSubs: string[]) {
  const hosts = [...new Set([normalizeHost(new URL(startUrl).hostname), normalizeHost(rootDomain), `www.${normalizeHost(rootDomain)}`, ...knownSubs.map(normalizeHost)])].filter(h => isSameSite(rootDomain, h)).slice(0, 6);
  const probes = hosts.flatMap(h => SENSITIVE_PATHS.map(p => ({ url: `https://${h}${p}`, path: p, host: h })));

  const findings: { url: string; path: string; host: string; status: number; exposed: boolean; snippet: string }[] = [];

  for (let i = 0; i < probes.length; i += 8) {
    const batch = probes.slice(i, i + 8);
    await Promise.all(batch.map(async probe => {
      try {
        const r = await safeFetch(probe.url, 4000);
        if (!r) return;
        const body = r.ok ? (await r.text()).slice(0, 3000) : "";
        const lc = body.toLowerCase();

        // Determine if actually exposed vs error page
        const isHtmlError = lc.includes("<html") || lc.includes("access denied") || lc.includes("forbidden") || lc.includes("not found") || lc.includes("404");
        const looksReal = !isHtmlError && body.length > 5 && (
          /^[A-Z_]+=.*/m.test(body) ||  // .env pattern
          /rewriteengine|authname|deny from|allow from/i.test(body) || // .htaccess
          /\[core\]|\[remote/i.test(body) || // .git/config
          /ref:/i.test(body) // .git/HEAD
        );

        findings.push({
          url: r.url || probe.url,
          path: probe.path,
          host: probe.host,
          status: r.status,
          exposed: r.ok && looksReal,
          snippet: looksReal ? body.slice(0, 500).replace(/[^\x20-\x7E\n\r]/g, "") : "",
        });
      } catch {}
    }));
  }

  return {
    totalChecked: findings.length,
    exposedFiles: findings.filter(f => f.exposed),
    allChecks: findings.map(f => ({ path: f.path, host: f.host, status: f.status, exposed: f.exposed })),
  };
}

// ─── Enhanced header-based tech detection ─────────
function detectFromHeaders(headers: Headers): { name: string; source: string }[] {
  const detected: { name: string; source: string }[] = [];
  const h = (name: string) => (headers.get(name) || "").toLowerCase();

  // Server header
  const server = h("server");
  if (server.includes("cloudflare")) detected.push({ name: "Cloudflare", source: "server" });
  if (server.includes("nginx")) detected.push({ name: "Nginx", source: "server" });
  if (server.includes("apache")) detected.push({ name: "Apache", source: "server" });
  if (server.includes("vercel")) detected.push({ name: "Vercel", source: "server" });
  if (server.includes("netlify")) detected.push({ name: "Netlify", source: "server" });
  if (server.includes("github.com")) detected.push({ name: "GitHub Pages", source: "server" });
  if (server.includes("deno")) detected.push({ name: "Deno Deploy", source: "server" });

  // X-Powered-By
  const xpb = h("x-powered-by");
  if (xpb.includes("express")) detected.push({ name: "Express.js", source: "x-powered-by" });
  if (xpb.includes("next")) detected.push({ name: "Next.js", source: "x-powered-by" });
  if (xpb.includes("php")) detected.push({ name: "PHP", source: "x-powered-by" });
  if (xpb.includes("asp.net")) detected.push({ name: "ASP.NET", source: "x-powered-by" });
  if (xpb.includes("wp engine")) detected.push({ name: "WP Engine", source: "x-powered-by" });

  // Specific headers
  if (h("x-vercel-id")) detected.push({ name: "Vercel", source: "x-vercel-id" });
  if (h("x-amz-cf-id") || h("x-amz-request-id")) detected.push({ name: "AWS", source: "header" });
  if (h("cf-ray")) detected.push({ name: "Cloudflare", source: "cf-ray" });
  if (h("x-shopify-stage")) detected.push({ name: "Shopify", source: "header" });
  if (h("x-wix-request-id")) detected.push({ name: "Wix", source: "header" });
  if (h("x-bubble-perf")) detected.push({ name: "Bubble", source: "header" });
  if (h("x-squarespace-version")) detected.push({ name: "Squarespace", source: "header" });
  if (h("x-github-request-id")) detected.push({ name: "GitHub", source: "header" });
  if (h("fly-request-id")) detected.push({ name: "Fly.io", source: "header" });
  if (h("x-railway-request-id")) detected.push({ name: "Railway", source: "header" });
  if (h("x-render-origin-server")) detected.push({ name: "Render", source: "header" });

  // Cookies / Set-Cookie for payment platforms
  const setCookie = (headers.get("set-cookie") || "").toLowerCase();
  if (setCookie.includes("__stripe")) detected.push({ name: "Stripe", source: "cookie" });
  if (setCookie.includes("_shopify")) detected.push({ name: "Shopify", source: "cookie" });
  if (setCookie.includes("wordpress") || setCookie.includes("wp-")) detected.push({ name: "WordPress", source: "cookie" });

  return detected;
}

// ─── Platform detection (signature-based) ─────────
function detectPlatforms(corpus: string, scripts: string[], stylesheets: string[], extLinks: string[], iframes: string[]) {
  const all = (corpus + " " + scripts.join(" ") + " " + stylesheets.join(" ") + " " + extLinks.join(" ") + " " + iframes.join(" ")).toLowerCase();

  type Category = { name: string; confidence: string }[];
  const detect = (checks: [string, string[]][]): Category => {
    const results: Category = [];
    for (const [name, sigs] of checks) {
      try {
        const matched = sigs.filter(s => all.includes(s));
        if (matched.length > 0) results.push({ name, confidence: matched.length >= 2 ? "high" : "medium" });
      } catch {}
    }
    return results;
  };

  const crm = detect([
    ["Salesforce", ["salesforce.com", "force.com", "pardot"]], ["HubSpot", ["hubspot.com", "hs-scripts.com", "hbspt"]],
    ["Zoho CRM", ["zoho.com/crm", "zsalesiq"]], ["Pipedrive", ["pipedrive.com"]], ["Freshsales", ["freshsales.io", "freshworks.com"]],
    ["Monday CRM", ["monday.com"]], ["Copper CRM", ["copper.com"]], ["ActiveCampaign", ["activecampaign.com", "trackcmp.net"]],
    ["Close CRM", ["close.com"]], ["Zendesk Sell", ["zendesk.com/sell"]], ["Bitrix24", ["bitrix24"]],
    ["Microsoft Dynamics", ["dynamics.com", "dynamics365"]], ["Keap/Infusionsoft", ["keap.com", "infusionsoft"]],
    ["Agile CRM", ["agilecrm.com"]], ["Capsule CRM", ["capsulecrm.com"]], ["Insightly", ["insightly.com"]],
  ]);

  const payments = detect([
    ["Stripe", ["stripe.com", "js.stripe.com", "stripe-js", "stripe.js", "stripe_", "__stripe"]],
    ["PayPal", ["paypal.com", "paypalobjects.com", "paypal-"]], ["Square", ["squareup.com", "square.site"]],
    ["Braintree", ["braintreegateway.com", "braintree-web"]], ["Adyen", ["adyen.com", "adyencheckout"]],
    ["Klarna", ["klarna.com", "klarna-"]], ["Afterpay", ["afterpay.com"]], ["Affirm", ["affirm.com"]],
    ["Apple Pay", ["apple-pay", "applepay"]], ["Google Pay", ["google-pay", "googlepay", "gpay"]],
    ["Amazon Pay", ["amazonpay", "payments.amazon"]], ["Razorpay", ["razorpay.com", "razorpay"]],
    ["Mollie", ["mollie.com"]], ["2Checkout/Verifone", ["2checkout.com", "verifone.com"]],
    ["Authorize.net", ["authorize.net"]], ["Paddle", ["paddle.com", "paddle.js", "cdn.paddle.com", "vendors.paddle.com", "paddle_checkout", "paddle billing"]],
    ["Lemon Squeezy", ["lemonsqueezy.com", "lmsqueezy", "lemon-squeezy", "store.lemonsqueezy.com", "lemonsqueezy", "app.lemonsqueezy.com/js/lemon.js"]],
    ["Polar.sh", [
      "polar.sh", "api.polar.sh", "sandbox-api.polar.sh", "checkout.polar.sh", "sandbox-checkout.polar.sh",
      "@polar-sh", "@polar_sh", "polar-checkout", "polar_sh", "polar_customer", "polar_checkout", "polar_access_token",
      "polar_access_token_sandbox", "polar_webhook", "polar_webhook_secret", "polar_mode", "polar-setup",
      "polar-setup-discounts", "polar-setup-first-order", "customer-sessions", "/customer-sessions", "/v1/checkouts",
      "benefit_grant", "polar.sh/", "polar source", "portal.polar.sh"
    ]],
    ["Gumroad", ["gumroad.com"]], ["Chargebee", ["chargebee.com"]], ["Recurly", ["recurly.com"]],
    ["FastSpring", ["fastspring.com"]], ["Wise", ["wise.com"]], ["Venmo", ["venmo.com"]], ["Cash App", ["cash.app"]],
    ["Sezzle", ["sezzle.com"]], ["Zip/QuadPay", ["zip.co", "quadpay.com"]],
    ["Coinbase Commerce", ["commerce.coinbase.com"]], ["BitPay", ["bitpay.com"]],
    ["Crypto.com Pay", ["pay.crypto.com"]], ["Cryptomus", ["cryptomus.com"]], ["NOWPayments", ["nowpayments.io"]],
    ["CoinGate", ["coingate.com"]], ["BTCPay Server", ["btcpayserver"]], ["Plisio", ["plisio.net"]],
    ["CoinPayments", ["coinpayments.net"]], ["Binance Pay", ["pay.binance.com"]],
    ["MoonPay", ["moonpay.com"]], ["Transak", ["transak.com"]], ["OpenNode", ["opennode.com"]],
    ["Patreon", ["patreon.com"]], ["Buy Me a Coffee", ["buymeacoffee.com"]], ["Ko-fi", ["ko-fi.com"]],
    ["Flutterwave", ["flutterwave.com"]], ["Paystack", ["paystack.com"]], ["Worldpay", ["worldpay.com"]],
    ["Checkout.com", ["checkout.com/js"]], ["GoCardless", ["gocardless.com"]], ["Skrill", ["skrill.com"]],
    ["ThriveCart", ["thrivecart.com"]], ["SamCart", ["samcart.com"]], ["SendOwl", ["sendowl.com"]],
    ["Payhip", ["payhip.com"]], ["Whop", ["whop.com"]], ["RevenueCat", ["revenuecat.com"]],
    ["Zuora", ["zuora.com"]], ["Chargify/Maxio", ["chargify.com", "maxio.com"]],
    ["Plaid", ["plaid.com", "cdn.plaid.com"]], ["Bolt", ["bolt.com/checkout"]],
    ["Shopify Payments", ["shopify.com/payments"]], ["Printful", ["printful.com"]], ["Printify", ["printify.com"]],
  ]);

  const analytics = detect([
    ["Google Analytics", ["gtag(", "googletagmanager.com", "google-analytics.com"]], ["Google Tag Manager", ["googletagmanager.com/gtm", "GTM-"]],
    ["Meta Pixel", ["fbq(", "facebook.net/en_US/fbevents"]], ["TikTok Pixel", ["analytics.tiktok.com", "ttq.load"]],
    ["Hotjar", ["hotjar.com"]], ["Mixpanel", ["mixpanel.com"]], ["Amplitude", ["amplitude.com"]],
    ["Segment", ["segment.com", "cdn.segment.com"]], ["Heap", ["heap-analytics"]], ["FullStory", ["fullstory.com"]],
    ["Clarity", ["clarity.ms"]], ["PostHog", ["posthog.com"]], ["Plausible", ["plausible.io"]],
    ["Fathom", ["usefathom.com"]], ["Matomo", ["matomo"]], ["Snap Pixel", ["sc-static.net/scevent"]],
    ["Pinterest Tag", ["pintrk"]], ["LinkedIn Insight", ["snap.licdn.com"]], ["Twitter Pixel", ["static.ads-twitter.com"]],
    ["Reddit Pixel", ["alb.reddit.com"]], ["Pendo", ["pendo.io"]], ["Mouseflow", ["mouseflow.com"]],
    ["Lucky Orange", ["luckyorange.com"]], ["Crazy Egg", ["crazyegg.com"]], ["VWO", ["visualwebsiteoptimizer.com"]],
  ]);

  const marketing = detect([
    ["Mailchimp", ["mailchimp.com", "chimpstatic.com"]], ["Klaviyo", ["klaviyo.com"]], ["SendGrid", ["sendgrid.net"]],
    ["ConvertKit", ["convertkit.com"]], ["Drip", ["getdrip.com"]], ["Omnisend", ["omnisend.com"]],
    ["Brevo/Sendinblue", ["brevo.com", "sendinblue.com"]], ["Beehiiv", ["beehiiv.com"]],
    ["Substack", ["substack.com"]], ["MailerLite", ["mailerlite.com"]], ["Customer.io", ["customer.io"]],
    ["AWeber", ["aweber.com"]], ["GetResponse", ["getresponse.com"]], ["Campaign Monitor", ["createsend.com"]],
    ["Moosend", ["moosend.com"]], ["Constant Contact", ["constantcontact.com"]], ["Mailgun", ["mailgun.com"]],
  ]);

  const support = detect([
    ["Intercom", ["intercom.com", "intercomcdn.com"]], ["Zendesk", ["zendesk.com", "zdassets.com"]],
    ["Drift", ["drift.com"]], ["Crisp", ["crisp.chat"]], ["LiveChat", ["livechatinc.com"]],
    ["Tawk.to", ["tawk.to"]], ["Freshdesk", ["freshdesk.com"]], ["HelpScout", ["helpscout.net"]],
    ["Tidio", ["tidio.co"]], ["Gorgias", ["gorgias.chat"]], ["Chatwoot", ["chatwoot.com"]],
    ["Olark", ["olark.com"]], ["Front", ["frontapp.com"]], ["Kommunicate", ["kommunicate.io"]],
  ]);

  const ecommerce = detect([
    ["Shopify", ["cdn.shopify.com", "myshopify.com", "shopify-buy"]], ["WooCommerce", ["woocommerce", "wc-ajax"]],
    ["Magento", ["magento.com", "mage/cookies", "Magento_"]], ["BigCommerce", ["bigcommerce.com"]],
    ["Squarespace", ["static1.squarespace.com"]], ["Wix", ["wix.com", "parastorage.com"]],
    ["PrestaShop", ["prestashop"]], ["Ecwid", ["ecwid.com"]], ["Snipcart", ["snipcart.com"]],
    ["Medusa", ["medusajs.com"]], ["Saleor", ["saleor.io"]], ["Shopware", ["shopware.com"]],
    ["Kajabi", ["kajabi.com"]], ["Teachable", ["teachable.com"]], ["Podia", ["podia.com"]],
    ["Gumroad", ["gumroad.com"]], ["Lemon Squeezy Store", ["lemonsqueezy.com"]],
    ["Polar Store", ["polar.sh"]], ["Whop", ["whop.com"]], ["Fourthwall", ["fourthwall.com"]],
    ["Spring", ["spri.ng", "teespring.com"]], ["Sellfy", ["sellfy.com"]],
    ["Lightspeed", ["lightspeedhq.com"]], ["Square Online", ["square.site"]],
    ["Webflow Ecommerce", ["webflow.com/ecommerce"]], ["Etsy", ["etsy.com"]],
  ]);

  const hosting = detect([
    ["Cloudflare", ["cloudflare.com", "cdnjs.cloudflare.com", "cf-ray"]], ["AWS CloudFront", ["cloudfront.net", "amazonaws.com"]],
    ["Vercel", ["vercel.app"]], ["Netlify", ["netlify.app"]], ["Fastly", ["fastly.net"]],
    ["Akamai", ["akamaized.net"]], ["Google Cloud CDN", ["storage.googleapis.com"]],
    ["DigitalOcean", ["digitaloceanspaces.com"]], ["Heroku", ["herokuapp.com"]],
    ["Render", ["onrender.com"]], ["Railway", ["railway.app"]], ["Fly.io", ["fly.dev"]],
    ["Firebase Hosting", ["firebaseapp.com", "web.app"]], ["GitHub Pages", ["github.io"]],
    ["Bunny CDN", ["b-cdn.net"]], ["Deno Deploy", ["deno.dev"]],
    ["Surge", ["surge.sh"]], ["StackPath", ["stackpathdns.com"]],
  ]);

  const frameworks = detect([
    ["React", ["react", "reactdom", "__REACT"]], ["Vue.js", ["vue.js", "__VUE"]], ["Angular", ["angular", "ng-version"]],
    ["Next.js", ["__NEXT_DATA__", "_next/"]], ["Nuxt", ["__NUXT__", "_nuxt/"]], ["Svelte", ["svelte"]],
    ["Gatsby", ["gatsby", "__gatsby"]], ["Remix", ["remix.run"]], ["Astro", ["astro.build"]],
    ["WordPress", ["wp-content", "wp-includes"]], ["Drupal", ["drupal"]], ["Ghost", ["ghost.org"]],
    ["Webflow", ["webflow.com", "wf-"]], ["Framer", ["framer.com", "framerusercontent"]],
    ["Bubble", ["bubble.io"]], ["Carrd", ["carrd.co"]], ["Tailwind CSS", ["tailwind", "tailwindcss"]],
    ["Bootstrap", ["bootstrap.min"]], ["Material UI", ["mui.com"]], ["jQuery", ["jquery.min"]],
    ["Alpine.js", ["alpinejs", "x-data"]], ["HTMX", ["htmx.org", "hx-"]],
    ["ClickFunnels", ["clickfunnels.com"]], ["Leadpages", ["leadpages.com"]],
    ["Unbounce", ["unbounce.com"]], ["Instapage", ["instapage.com"]],
  ]);

  const ads = detect([
    ["Google Ads", ["googleads.g.doubleclick", "googlesyndication"]], ["Google AdSense", ["pagead2.googlesyndication", "adsbygoogle"]],
    ["Amazon Ads", ["amazon-adsystem.com"]], ["Taboola", ["taboola.com"]], ["Outbrain", ["outbrain.com"]],
    ["Criteo", ["criteo.com"]], ["AdRoll", ["adroll.com"]], ["MediaVine", ["mediavine.com"]],
    ["Carbon Ads", ["carbonads.com"]], ["BuySellAds", ["buysellads.com"]],
  ]);

  const security = detect([
    ["reCAPTCHA", ["recaptcha"]], ["hCaptcha", ["hcaptcha.com"]], ["Cloudflare Turnstile", ["challenges.cloudflare.com"]],
    ["Auth0", ["auth0.com"]], ["Firebase Auth", ["firebaseauth"]], ["Supabase Auth", ["supabase.co/auth"]],
    ["Okta", ["okta.com"]], ["Clerk", ["clerk.com"]], ["Stytch", ["stytch.com"]],
    ["Sentry", ["sentry.io"]], ["Datadog", ["datadoghq.com"]], ["New Relic", ["newrelic.com"]],
    ["LogRocket", ["logrocket.com"]], ["Bugsnag", ["bugsnag.com"]], ["Rollbar", ["rollbar.com"]],
    ["AWS Cognito", ["cognito-idp"]],
  ]);

  const scheduling = detect([
    ["Calendly", ["calendly.com"]], ["Cal.com", ["cal.com"]], ["Acuity", ["acuityscheduling.com"]],
    ["HoneyBook", ["honeybook.com"]], ["Dubsado", ["dubsado.com"]],
  ]);

  const forms = detect([
    ["Typeform", ["typeform.com"]], ["JotForm", ["jotform.com"]], ["Google Forms", ["docs.google.com/forms"]],
    ["Tally", ["tally.so"]], ["Formspree", ["formspree.io"]], ["SurveyMonkey", ["surveymonkey.com"]],
  ]);

  const engagement = detect([
    ["OneSignal", ["onesignal.com"]], ["Pusher", ["pusher.com"]], ["Beamer", ["getbeamer.com"]],
    ["Appcues", ["appcues.com"]], ["UserPilot", ["userpilot.com"]], ["WalkMe", ["walkme.com"]],
    ["Loom", ["loom.com"]], ["Wistia", ["wistia.com"]], ["Vimeo", ["vimeo.com"]],
  ]);

  const socialProof = detect([
    ["Trustpilot", ["trustpilot.com"]], ["G2", ["g2.com"]], ["Capterra", ["capterra.com"]],
    ["Yotpo", ["yotpo.com"]], ["Judge.me", ["judge.me"]], ["Loox", ["loox.io"]],
    ["ProveSource", ["provesrc.com"]], ["FOMO", ["fomo.com"]], ["Reviews.io", ["reviews.io"]],
  ]);

  const seoTools = detect([
    ["Yoast SEO", ["yoast"]], ["Rank Math", ["rankmath"]], ["Elementor", ["elementor"]],
    ["Cookiebot", ["cookiebot.com"]], ["OneTrust", ["onetrust.com"]], ["CookieYes", ["cookieyes.com"]],
    ["Iubenda", ["iubenda.com"]], ["Termly", ["termly.io"]],
  ]);

  const productivity = detect([
    ["Notion", ["notion.so"]], ["Airtable", ["airtable.com"]], ["Slack", ["slack.com"]],
    ["Discord", ["discord.com"]], ["Linear", ["linear.app"]], ["Figma", ["figma.com"]], ["Canva", ["canva.com"]],
  ]);

  const socialMedia = detect([
    ["Facebook SDK", ["connect.facebook.net", "fb-root"]], ["Instagram Embed", ["instagram.com/embed"]],
    ["Twitter/X Embed", ["platform.twitter.com"]], ["TikTok Embed", ["tiktok.com/embed"]],
    ["YouTube Embed", ["youtube.com/embed"]], ["LinkedIn SDK", ["platform.linkedin.com"]],
    ["Pinterest Widget", ["assets.pinterest.com"]], ["Discord Widget", ["discord.com/widget"]],
    ["Telegram Widget", ["telegram.org/js"]], ["WhatsApp Share", ["api.whatsapp.com", "wa.me"]],
    ["Threads", ["threads.net"]], ["Bluesky", ["bsky.app"]], ["Twitch Embed", ["player.twitch.tv"]],
    ["Spotify Embed", ["open.spotify.com/embed"]], ["Google Sign-In", ["accounts.google.com/gsi"]],
    ["Apple Sign-In", ["appleid.apple.com"]], ["GitHub Login", ["github.com/login/oauth"]],
    ["ShareThis", ["sharethis.com"]], ["AddThis", ["addthis.com"]],
  ]);

  const backendProviders = detect([
    ["Supabase", [
      "supabase.co", "supabase.com", "supabase-js", "x-client-info=supabase-js", "@supabase/supabase-js",
      "/rest/v1/", "/auth/v1/", "/storage/v1/", "/functions/v1/", ".supabase.co/functions/v1"
    ]],
    ["Firebase", ["firebaseio.com", "firebaseapp.com", "gstatic.com/firebasejs", "firebasestorage.googleapis.com"]],
    ["Google Cloud", ["cloudfunctions.net", "run.app", "storage.googleapis.com", "googleapis.com"]],
    ["AWS", ["amazonaws.com", "execute-api", "amplifyapp.com", "aws-sdk"]],
    ["Azure", ["azurewebsites.net", "azure-api.net", "azure.com"]], ["Cloudflare Workers", ["workers.dev"]],
    ["Vercel Functions", ["vercel.app", "x-vercel-id"]], ["Netlify Functions", ["/.netlify/functions/", "netlify.app"]],
    ["Render", ["onrender.com"]], ["Railway", ["railway.app"]], ["Fly.io", ["fly.dev"]],
    ["Heroku", ["herokuapp.com"]], ["Appwrite", ["appwrite.io"]], ["Nhost", ["nhost.io"]],
    ["PocketBase", ["pocketbase"]], ["Hasura", ["hasura.io", "x-hasura"]], ["Convex", ["convex.dev"]],
    ["Neon", ["neon.tech"]], ["PlanetScale", ["planetscale.com"]], ["Upstash", ["upstash.com"]],
    ["Turso", ["turso.io"]], ["MongoDB Atlas", ["mongodb.net"]], ["Redis Cloud", ["redis.com"]],
    ["Sanity", ["sanity.io", "cdn.sanity.io"]], ["Contentful", ["contentful.com", "ctfassets.net"]],
    ["Strapi", ["strapi.io"]], ["Storyblok", ["storyblok.com"]], ["Builder.io", ["builder.io"]],
    ["Algolia", ["algolia.com", "algoliasearch"]], ["Clerk", ["clerk.com"]], ["Auth0", ["auth0.com"]],
    ["Prisma", ["prisma.io"]], ["Xata", ["xata.io"]], ["Deno Deploy", ["deno.dev"]],
  ]);

  const aiTools = detect([
    ["OpenAI/ChatGPT", ["openai.com", "api.openai.com"]], ["Anthropic/Claude", ["anthropic.com"]],
    ["Google AI/Gemini", ["generativelanguage.googleapis.com"]], ["Replicate", ["replicate.com"]],
    ["Hugging Face", ["huggingface.co"]], ["ElevenLabs", ["elevenlabs.io"]],
    ["Deepgram", ["deepgram.com"]], ["Pinecone", ["pinecone.io"]], ["Cohere", ["cohere.ai"]],
    ["Stability AI", ["stability.ai"]], ["Midjourney", ["midjourney.com"]],
  ]);

  const affiliate = detect([
    ["PartnerStack", ["partnerstack.com"]], ["Impact", ["impact.com"]], ["ShareASale", ["shareasale.com"]],
    ["Awin", ["awin.com"]], ["Refersion", ["refersion.com"]], ["Tapfiliate", ["tapfiliate.com"]],
    ["FirstPromoter", ["firstpromoter.com"]], ["Rewardful", ["rewardful.com"]],
  ]);

  const personalization = detect([
    ["Optimizely", ["optimizely.com"]], ["LaunchDarkly", ["launchdarkly.com"]],
    ["Statsig", ["statsig.com"]], ["GrowthBook", ["growthbook.io"]], ["AB Tasty", ["abtasty.com"]],
  ]);

  return { crm, payments, analytics, marketing, support, ecommerce, hosting, frameworks, ads, security, scheduling, forms, engagement, socialProof, seoTools, productivity, socialMedia, backendProviders, database: backendProviders, aiTools, affiliate, personalization };
}

// ─── Metadata extraction ──────────────────────────
function extractMetadata(html: string, url: string, secHeaders: Record<string, string>, headerTech: { name: string; source: string }[], deep?: DeepCorpus) {
  try {
    const title = getTag(html, "title");
    const description = getMeta(html, "name", "description") || getMeta(html, "property", "og:description");
    const keywords = getMeta(html, "name", "keywords");
    const author = getMeta(html, "name", "author");
    const robots = getMeta(html, "name", "robots");
    const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || "";
    const language = html.match(/<html[^>]*lang=["']([^"']*)["']/i)?.[1] || "";
    const viewport = getMeta(html, "name", "viewport");
    const generator = getMeta(html, "name", "generator");
    const themeColor = getMeta(html, "name", "theme-color");
    const charset = html.match(/<meta[^>]*charset=["']?([^"'\s>]+)/i)?.[1] || "";

    const og = {
      title: getMeta(html, "property", "og:title"), description: getMeta(html, "property", "og:description"),
      image: getMeta(html, "property", "og:image"), url: getMeta(html, "property", "og:url"),
      type: getMeta(html, "property", "og:type"), siteName: getMeta(html, "property", "og:site_name"),
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

    const h1s = safeMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
    const h2s = safeMatch(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
    const h3s = safeMatch(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);

    const domain = new URL(url).hostname;
    const allAnchors = safeMatch(html, /<a[^>]*href=["']([^"'#]+)["']/gi);
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];
    for (const href of allAnchors) {
      try {
        const u = new URL(href, url);
        if (u.hostname === domain || u.hostname.endsWith("." + domain)) { if (!internalLinks.includes(u.href)) internalLinks.push(u.href); }
        else { if (!externalLinks.includes(u.href)) externalLinks.push(u.href); }
      } catch {}
    }

    const imagesWithAlt: { src: string; alt: string; hasAlt: boolean }[] = [];
    for (const tag of safeMatch(html, /<img[^>]*>/gi)) {
      const src = tag.match(/src=["']([^"']+)["']/i)?.[1] || "";
      const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1] || "";
      const hasAlt = /alt=["']/i.test(tag);
      if (src) imagesWithAlt.push({ src, alt, hasAlt });
    }

    const scripts = safeMatch(html, /<script[^>]*src=["']([^"']+)["']/gi).slice(0, 50);
    const stylesheets = safeMatch(html, /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi).slice(0, 30);
    const iframes = safeMatch(html, /<iframe[^>]*src=["']([^"']+)["']/gi).slice(0, 30);

    const lc = html.toLowerCase();
    const hasServiceWorker = lc.includes("serviceworker");
    const hasManifest = /<link[^>]*rel=["']manifest["']/i.test(html);
    const hasPreconnect = /<link[^>]*rel=["']preconnect["']/i.test(html);
    const hasPreload = /<link[^>]*rel=["']preload["']/i.test(html);
    const hasDeferScripts = /<script[^>]*defer/i.test(html);
    const hasAsyncScripts = /<script[^>]*async/i.test(html);
    const hasLazyImages = /loading=["']lazy["']/i.test(html);
    const hasResponsiveImages = /srcset=["']/i.test(html);
    const hasWebP = /\.webp/i.test(html);
    const hasAVIF = /\.avif/i.test(html);

    const jsonLdBlocks = safeMatch(html, /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    const structuredData = jsonLdBlocks.map(b => { try { return JSON.parse(b); } catch { return null; } }).filter(Boolean);

    const socialPatterns: Record<string, RegExp> = {
      facebook: /facebook\.com\/[^"'\s)]+/gi, twitter: /(?:twitter|x)\.com\/[^"'\s)]+/gi,
      instagram: /instagram\.com\/[^"'\s)]+/gi, linkedin: /linkedin\.com\/[^"'\s)]+/gi,
      youtube: /youtube\.com\/[^"'\s)]+/gi, tiktok: /tiktok\.com\/@[^"'\s)]+/gi,
      pinterest: /pinterest\.com\/[^"'\s)]+/gi, github: /github\.com\/[^"'\s)]+/gi,
      reddit: /reddit\.com\/[^"'\s)]+/gi, discord: /discord\.gg\/[^"'\s)]+/gi,
      telegram: /t\.me\/[^"'\s)]+/gi, whatsapp: /wa\.me\/[^"'\s)]+/gi,
      threads: /threads\.net\/@[^"'\s)]+/gi, mastodon: /mastodon\.[^"'\s)]+\/@[^"'\s)]+/gi,
      bluesky: /bsky\.app\/profile\/[^"'\s)]+/gi,
    };
    const socialLinks: Record<string, string[]> = {};
    for (const [platform, regex] of Object.entries(socialPatterns)) {
      try {
        const matches = [...new Set(html.match(regex) || [])].map(m => m.startsWith("http") ? m : `https://${m}`);
        if (matches.length) socialLinks[platform] = matches.slice(0, 5);
      } catch {}
    }

    // Detection using deep corpus
    const dHtml = deep?.combined || html;
    const dScripts = deep?.scripts?.length ? deep.scripts : scripts;
    const dStyles = deep?.stylesheets?.length ? deep.stylesheets : stylesheets;
    const dExtLinks = deep?.externalLinks?.length ? deep.externalLinks : externalLinks;
    const dIframes = deep?.iframes?.length ? deep.iframes : iframes;
    const detectedPlatforms = detectPlatforms(dHtml, dScripts, dStyles, dExtLinks, dIframes);

    const upsertDetection = (
      bucket: { name: string; confidence: string }[],
      name: string,
      confidence: "high" | "medium" = "medium",
    ) => {
      const i = bucket.findIndex((x) => x.name.toLowerCase() === name.toLowerCase());
      if (i === -1) bucket.push({ name, confidence });
      else if (bucket[i].confidence !== "high" && confidence === "high") bucket[i].confidence = "high";
    };

    const deepLc = dHtml.toLowerCase();

    // Heuristics for hidden backend/payment providers in route chunks
    const supabaseStrong = /https?:\/\/[a-z0-9-]{10,}\.supabase\.co/i.test(dHtml) || deepLc.includes("@supabase/supabase-js") || deepLc.includes("x-client-info=supabase-js");
    const supabaseMedium = deepLc.includes("supabase-js") || (deepLc.includes("/rest/v1/") && deepLc.includes("/auth/v1/"));
    if (supabaseStrong) upsertDetection(detectedPlatforms.backendProviders, "Supabase", "high");
    else if (supabaseMedium) upsertDetection(detectedPlatforms.backendProviders, "Supabase", "medium");

    const polarStrong = /(?:api|sandbox-api|checkout|sandbox-checkout)\.polar\.sh/i.test(dHtml) || deepLc.includes("polar_access_token") || deepLc.includes("polar_webhook");
    const polarMedium = deepLc.includes("@polar-sh") || deepLc.includes("polar-setup") || deepLc.includes("/v1/checkouts") || (deepLc.includes("customer-sessions") && deepLc.includes("polar"));
    if (polarStrong) upsertDetection(detectedPlatforms.payments, "Polar.sh", "high");
    else if (polarMedium) upsertDetection(detectedPlatforms.payments, "Polar.sh", "medium");

    // Merge header-based detections
    if (headerTech.length > 0) {
      const backendServerSignals = new Set(["cloudflare", "vercel", "netlify", "aws", "render", "railway", "fly.io", "deno deploy", "github pages"]);

      for (const ht of headerTech) {
        const allNames = [...detectedPlatforms.hosting, ...detectedPlatforms.frameworks, ...detectedPlatforms.backendProviders].map(p => p.name.toLowerCase());
        if (!allNames.includes(ht.name.toLowerCase())) {
          detectedPlatforms.hosting.push({ name: `${ht.name} (via ${ht.source})`, confidence: "high" });
        }

        if (backendServerSignals.has(ht.name.toLowerCase())) {
          upsertDetection(detectedPlatforms.backendProviders, ht.name, "medium");
        }
      }
    }

    // Accessibility
    const formCount = (html.match(/<form/gi) || []).length;
    const inputsWithLabels = (html.match(/<label/gi) || []).length;
    const ariaCount = (html.match(/aria-/gi) || []).length;
    const roleCount = (html.match(/role=["']/gi) || []).length;
    const tabIndexCount = (html.match(/tabindex/gi) || []).length;
    const hasSkipNav = /skip.*(nav|content|main)/i.test(html);
    const hasFocusStyles = /focus/i.test(html);

    // Fonts
    const googleFonts = [...new Set(safeMatch(html, /fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/gi))];
    const customFonts = [...new Set(safeMatch(html, /font-family:\s*['"]?([^;'"]+)/gi))].slice(0, 10);
    const adobeFonts = lc.includes("use.typekit.net");

    // Text
    const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
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
    const r2 = (n: number) => Math.round(n * 100) / 100;

    const imageTags = html.match(/<img\b[^>]*>/gi) || [];
    const lazyImageCount = imageTags.filter(t => /loading=["']lazy["']/i.test(t)).length;
    const responsiveImageCount = imageTags.filter(t => /srcset=["']/i.test(t)).length;
    const videoTagCount = (html.match(/<video\b/gi) || []).length;
    const svgTagCount = (html.match(/<svg\b/gi) || []).length;
    const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
    const inlineScriptTags = scriptTags.filter(t => !/\ssrc\s*=/i.test(t));
    const externalScriptTags = scriptTags.filter(t => /\ssrc\s*=/i.test(t));
    const moduleScriptCount = scriptTags.filter(t => /type=["']module["']/i.test(t)).length;
    const sentenceCount = textContent.split(/[.!?]+/).filter(s => s.trim()).length;
    const uniqueWords = new Set(textContent.split(/\s+/).map(w => w.toLowerCase()));
    const canonicalCount = (html.match(/<link[^>]*rel=["']canonical["']/gi) || []).length;
    const hreflangCount = (html.match(/<link[^>]*hreflang=["']/gi) || []).length;
    const rssFeedCount = (html.match(/<link[^>]*type=["']application\/(rss|atom)\+xml["']/gi) || []).length;

    const secureHeadersPresent = [
      secHeaders?.strictTransportSecurity !== "", secHeaders?.contentSecurityPolicy === "Present",
      (secHeaders?.xFrameOptions || "") !== "Missing", (secHeaders?.xContentTypeOptions || "") !== "Missing",
      (secHeaders?.referrerPolicy || "") !== "Missing", secHeaders?.permissionsPolicy === "Present",
    ].filter(Boolean).length;

    const screenshotUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodeURIComponent(url)}`;

    const curatedMetrics = {
      contentQuality: {
        label: "Content Quality",
        items: {
          "Word Count": wordCount, "Reading Time": `${r2(wordCount / 200)} min`, "Sentences": sentenceCount,
          "Unique Word Ratio": `${r2(wordCount ? (uniqueWords.size / wordCount) * 100 : 0)}%`,
          "Text/HTML Ratio": `${r2(html.length ? (textContent.length / html.length) * 100 : 0)}%`,
        },
      },
      seoSignals: {
        label: "SEO Signals",
        items: {
          "Title Length": `${title.length}/60`, "Description Length": `${description.length}/160`,
          "H1 Tags": h1s.length, "H2 Tags": h2s.length, "Canonical": canonicalCount > 0 ? "✓" : "✗",
          "Hreflang Tags": hreflangCount, "JSON-LD Blocks": structuredData.length, "RSS/Atom Feeds": rssFeedCount,
        },
      },
      mediaAssets: {
        label: "Media & Assets",
        items: {
          "Total Images": imageTags.length, "Alt Coverage": `${r2(imageTags.length ? (imagesWithAlt.filter(i => i.hasAlt && i.alt).length / imageTags.length) * 100 : 0)}%`,
          "Lazy Loaded": `${lazyImageCount}/${imageTags.length}`, "Responsive": responsiveImageCount,
          "WebP": hasWebP ? "✓" : "✗", "AVIF": hasAVIF ? "✓" : "✗", "Videos": videoTagCount, "SVGs": svgTagCount,
        },
      },
      techStack: {
        label: "Tech Stack",
        items: {
          "External Scripts": externalScriptTags.length, "Inline Scripts": inlineScriptTags.length,
          "Stylesheets": stylesheets.length, "Module Scripts": moduleScriptCount, "Page Size": `${pageSizeKB} KB`,
          "PWA Ready": (hasServiceWorker && hasManifest) ? "✓" : "✗",
          "GraphQL": lc.includes("graphql") ? "✓" : "✗", "WebSocket": lc.includes("wss://") ? "✓" : "✗",
        },
      },
      monetization: {
        label: "Monetization & Commerce",
        items: {
          "Payment Providers": detectedPlatforms.payments.length, "E-commerce Platforms": detectedPlatforms.ecommerce.length,
          "Checkout Flow": (lc.includes("checkout") || lc.includes("cart")) ? "✓" : "✗",
          "Subscription UI": (lc.includes("subscription") || lc.includes("recurring")) ? "✓" : "✗",
          "Price Points": (html.match(/[\$€£]\s?\d+[\.,]?\d{0,2}/g) || []).length,
          "Ad Networks": detectedPlatforms.ads.length, "Affiliate Tools": detectedPlatforms.affiliate.length,
        },
      },
      uxFeatures: {
        label: "UX & Features",
        items: {
          "Dark Mode": (lc.includes("dark-mode") || lc.includes("theme-toggle")) ? "✓" : "✗",
          "Live Chat": detectedPlatforms.support.length > 0 ? "✓" : "✗",
          "Newsletter": (lc.includes("newsletter") || lc.includes("subscribe")) ? "✓" : "✗",
          "Cookie Consent": (lc.includes("cookie") && lc.includes("consent")) ? "✓" : "✗",
          "Blog": lc.includes("/blog") ? "✓" : "✗", "i18n": hreflangCount > 0 ? "✓" : "✗",
        },
      },
      linkProfile: {
        label: "Link Profile",
        items: {
          "Internal Links": internalLinks.length, "External Links": externalLinks.length,
          "Social Platforms": Object.keys(socialLinks).length,
        },
      },
      securityScore: {
        label: "Security & Privacy",
        items: {
          "HTTPS": url.startsWith("https://") ? "✓" : "✗",
          "HSTS": secHeaders?.strictTransportSecurity ? "✓" : "✗",
          "CSP": secHeaders?.contentSecurityPolicy === "Present" ? "✓" : "✗",
          "X-Frame-Options": (secHeaders?.xFrameOptions || "") !== "Missing" ? "✓" : "✗",
          "Referrer Policy": (secHeaders?.referrerPolicy || "") !== "Missing" ? "✓" : "✗",
          "Security Headers": `${secureHeadersPresent}/6`,
        },
      },
    };

    return {
      basic: { title, description, keywords, author, robots, canonical, language, charset, viewport, generator, themeColor },
      openGraph: og, twitterCard: twitter,
      headings: { h1: h1s, h2: h2s, h3: h3s },
      links: { internal: internalLinks.slice(0, 50), external: externalLinks.slice(0, 50), totalInternal: internalLinks.length, totalExternal: externalLinks.length },
      images: { total: imagesWithAlt.length, withAlt: imagesWithAlt.filter(i => i.hasAlt && i.alt).length, withoutAlt: imagesWithAlt.filter(i => !i.hasAlt || !i.alt).length, samples: imagesWithAlt.slice(0, 15) },
      scripts: { external: scripts, inlineCount: (html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length, stylesheets, inlineStyleCount: (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).length },
      performance: { hasServiceWorker, hasManifest, hasPreconnect, hasPreload, hasDeferScripts, hasAsyncScripts, hasLazyImages, hasResponsiveImages, hasWebP, hasAVIF, pageSizeKB },
      structuredData, socialLinks, detectedPlatforms, headerTechDetections: headerTech, screenshotUrl,
      scanCoverage: {
        pagesScanned: deep?.pages || 1, scannedUrls: (deep?.scannedUrls || [url]).slice(0, 30),
        sitemapUrlsFound: deep?.sitemapUrls?.length || 0, sitemapSample: (deep?.sitemapUrls || []).slice(0, 20),
        subdomainsFound: deep?.subdomains || [],
      },
      accessibility: { formCount, inputsWithLabels, ariaCount, roleCount, tabIndexCount, hasSkipNav, hasFocusStyles },
      fonts: { googleFonts, customFonts, adobeFonts }, iframes,
      contactInfo: { phoneNumbers, emailAddresses },
      content: { wordCount, textPreview: textContent.slice(0, 500) },
      curatedMetrics, seoScore: Math.min(seoScore, 100),
    };
  } catch (e) {
    console.error("extractMetadata error:", e);
    return {
      basic: {}, openGraph: {}, twitterCard: {}, headings: { h1: [], h2: [], h3: [] },
      links: { internal: [], external: [], totalInternal: 0, totalExternal: 0 },
      images: { total: 0, withAlt: 0, withoutAlt: 0, samples: [] },
      scripts: { external: [], inlineCount: 0, stylesheets: [], inlineStyleCount: 0 },
      performance: {}, structuredData: [], socialLinks: {}, detectedPlatforms: {},
      headerTechDetections: headerTech, screenshotUrl: "", scanCoverage: {},
      accessibility: {}, fonts: {}, iframes: [], contactInfo: {},
      content: { wordCount: 0, textPreview: "" }, curatedMetrics: {}, seoScore: 0,
    };
  }
}

// ─── Main handler ─────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const { url } = body || {};
    if (!url || typeof url !== "string") return new Response(JSON.stringify({ success: false, error: "URL is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) formattedUrl = `https://${formattedUrl}`;

    let parsedUrl: URL;
    try { parsedUrl = new URL(formattedUrl); } catch { return new Response(JSON.stringify({ success: false, error: "Invalid URL format" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

    const hostname = parsedUrl.hostname;
    if (["localhost", "0.0.0.0"].includes(hostname) || hostname.startsWith("127.") || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return new Response(JSON.stringify({ success: false, error: "Cannot scrape internal addresses" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Scraping:", formattedUrl);

    const response = await safeFetch(formattedUrl, 12000);
    if (!response) return new Response(JSON.stringify({ success: false, error: "Could not reach the website (timeout or DNS failure)" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) return new Response(JSON.stringify({ success: false, error: `Site returned HTTP ${response.status}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const html = (await response.text()).slice(0, 600_000);
    const finalUrl = response.url || formattedUrl;
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

    // Header-based tech detection
    const headerTech = detectFromHeaders(response.headers);

    // Deep scan - wrapped in try-catch for crash safety
    let deepScan: DeepCorpus | undefined;
    try {
      deepScan = await buildDeepCorpus(finalUrl, html);
      console.log(`Deep scan: ${deepScan.pages} pages, ${deepScan.sitemapUrls.length} sitemap URLs, ${deepScan.subdomains.length} subdomains`);
    } catch (e) {
      console.error("Deep scan failed (continuing with single page):", e);
    }

    // Sensitive file probing - wrapped in try-catch
    let sensitiveFiles: any = { totalChecked: 0, exposedFiles: [], allChecks: [] };
    try {
      const rootDomain = getRegistrableDomain(new URL(finalUrl).hostname);
      sensitiveFiles = await probeSensitiveFiles(finalUrl, rootDomain, deepScan?.subdomains || []);
    } catch (e) {
      console.error("Sensitive file probe failed:", e);
    }

    const metadata = extractMetadata(html, finalUrl, securityHeaders, headerTech, deepScan);
    const isHttps = finalUrl.startsWith("https://");

    return new Response(JSON.stringify({
      success: true, url: formattedUrl, finalUrl,
      contentType: response.headers.get("content-type") || "",
      server: server || xPoweredBy || "Unknown",
      isHttps, securityHeaders, sensitiveFiles,
      ...metadata,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("site-scraper error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown scraper error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
