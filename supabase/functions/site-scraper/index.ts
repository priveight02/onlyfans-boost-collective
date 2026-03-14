import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract meta tags, links, headers, text content, images, scripts, styles, etc.
function extractMetadata(html: string, url: string) {
  const getTag = (name: string): string => {
    const m = html.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    return m?.[1]?.trim() || "";
  };

  const getMeta = (attr: string, val: string): string => {
    const patterns = [
      new RegExp(`<meta[^>]*${attr}=["']${val}["'][^>]*content=["']([^"']*)["']`, "i"),
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${val}["']`, "i"),
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) return m[1];
    }
    return "";
  };

  const getAllMatches = (regex: RegExp): string[] => {
    const results: string[] = [];
    let m;
    while ((m = regex.exec(html)) !== null) results.push(m[1]);
    return results;
  };

  // Basic info
  const title = getTag("title");
  const description = getMeta("name", "description") || getMeta("property", "og:description");
  const keywords = getMeta("name", "keywords");
  const author = getMeta("name", "author");
  const robots = getMeta("name", "robots");
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] || "";
  const language = html.match(/<html[^>]*lang=["']([^"']*)["']/i)?.[1] || "";
  const charset = html.match(/<meta[^>]*charset=["']?([^"'\s>]+)/i)?.[1] || "";
  const viewport = getMeta("name", "viewport");
  const generator = getMeta("name", "generator");
  const themeColor = getMeta("name", "theme-color");

  // Open Graph
  const og = {
    title: getMeta("property", "og:title"),
    description: getMeta("property", "og:description"),
    image: getMeta("property", "og:image"),
    url: getMeta("property", "og:url"),
    type: getMeta("property", "og:type"),
    siteName: getMeta("property", "og:site_name"),
    locale: getMeta("property", "og:locale"),
  };

  // Twitter Card
  const twitter = {
    card: getMeta("name", "twitter:card") || getMeta("property", "twitter:card"),
    site: getMeta("name", "twitter:site") || getMeta("property", "twitter:site"),
    creator: getMeta("name", "twitter:creator") || getMeta("property", "twitter:creator"),
    title: getMeta("name", "twitter:title") || getMeta("property", "twitter:title"),
    description: getMeta("name", "twitter:description") || getMeta("property", "twitter:description"),
    image: getMeta("name", "twitter:image") || getMeta("property", "twitter:image"),
  };

  // Headings
  const h1s = getAllMatches(/<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
  const h2s = getAllMatches(/<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
  const h3s = getAllMatches(/<h3[^>]*>([\s\S]*?)<\/h3>/gi).map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);

  // Links
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  const allAnchors = getAllMatches(/<a[^>]*href=["']([^"'#]+)["']/gi);
  const domain = new URL(url).hostname;
  for (const href of allAnchors) {
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === domain || linkUrl.hostname.endsWith("." + domain)) {
        if (!internalLinks.includes(linkUrl.href)) internalLinks.push(linkUrl.href);
      } else {
        if (!externalLinks.includes(linkUrl.href)) externalLinks.push(linkUrl.href);
      }
    } catch { /* skip invalid */ }
  }

  // Images
  const images = getAllMatches(/<img[^>]*src=["']([^"']+)["']/gi).slice(0, 50);
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

  // Scripts & styles
  const scripts = getAllMatches(/<script[^>]*src=["']([^"']+)["']/gi).slice(0, 30);
  const stylesheets = getAllMatches(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi).slice(0, 20);
  const inlineScriptCount = (html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length;
  const inlineStyleCount = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).length;

  // Performance hints
  const hasServiceWorker = html.includes("serviceWorker") || html.includes("service-worker");
  const hasManifest = /<link[^>]*rel=["']manifest["']/i.test(html);
  const hasPreconnect = /<link[^>]*rel=["']preconnect["']/i.test(html);
  const hasPreload = /<link[^>]*rel=["']preload["']/i.test(html);
  const hasDeferScripts = /<script[^>]*defer/i.test(html);
  const hasAsyncScripts = /<script[^>]*async/i.test(html);
  const hasLazyImages = /loading=["']lazy["']/i.test(html);

  // Schema.org / JSON-LD
  const jsonLdBlocks = getAllMatches(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const structuredData = jsonLdBlocks.map(block => {
    try { return JSON.parse(block); } catch { return null; }
  }).filter(Boolean);

  // Social links detection
  const socialPatterns: Record<string, RegExp> = {
    facebook: /facebook\.com\/[^"'\s)]+/gi,
    twitter: /(?:twitter|x)\.com\/[^"'\s)]+/gi,
    instagram: /instagram\.com\/[^"'\s)]+/gi,
    linkedin: /linkedin\.com\/[^"'\s)]+/gi,
    youtube: /youtube\.com\/[^"'\s)]+/gi,
    tiktok: /tiktok\.com\/@[^"'\s)]+/gi,
    pinterest: /pinterest\.com\/[^"'\s)]+/gi,
    github: /github\.com\/[^"'\s)]+/gi,
  };
  const socialLinks: Record<string, string[]> = {};
  for (const [platform, regex] of Object.entries(socialPatterns)) {
    const matches = [...new Set(html.match(regex) || [])].map(m => m.startsWith("http") ? m : `https://${m}`);
    if (matches.length) socialLinks[platform] = matches.slice(0, 3);
  }

  // Technology detection
  const technologies: string[] = [];
  if (html.includes("react")) technologies.push("React");
  if (html.includes("vue")) technologies.push("Vue.js");
  if (html.includes("angular")) technologies.push("Angular");
  if (html.includes("next") || html.includes("__NEXT")) technologies.push("Next.js");
  if (html.includes("nuxt")) technologies.push("Nuxt");
  if (html.includes("svelte")) technologies.push("Svelte");
  if (html.includes("gatsby")) technologies.push("Gatsby");
  if (html.includes("wordpress") || html.includes("wp-content")) technologies.push("WordPress");
  if (html.includes("shopify")) technologies.push("Shopify");
  if (html.includes("wix")) technologies.push("Wix");
  if (html.includes("squarespace")) technologies.push("Squarespace");
  if (html.includes("webflow")) technologies.push("Webflow");
  if (html.includes("tailwind")) technologies.push("Tailwind CSS");
  if (html.includes("bootstrap")) technologies.push("Bootstrap");
  if (html.includes("jquery")) technologies.push("jQuery");
  if (html.includes("gtag") || html.includes("google-analytics") || html.includes("googletagmanager")) technologies.push("Google Analytics");
  if (html.includes("fbq(") || html.includes("facebook.net")) technologies.push("Facebook Pixel");
  if (html.includes("hotjar")) technologies.push("Hotjar");
  if (html.includes("intercom")) technologies.push("Intercom");
  if (html.includes("crisp")) technologies.push("Crisp Chat");
  if (html.includes("stripe")) technologies.push("Stripe");
  if (html.includes("recaptcha")) technologies.push("reCAPTCHA");
  if (html.includes("cloudflare")) technologies.push("Cloudflare");

  // Text content for word count
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  // SEO score
  let seoScore = 0;
  if (title) seoScore += 10;
  if (title.length >= 30 && title.length <= 60) seoScore += 5;
  if (description) seoScore += 10;
  if (description.length >= 120 && description.length <= 160) seoScore += 5;
  if (h1s.length === 1) seoScore += 10;
  if (h1s.length > 1) seoScore += 3;
  if (canonical) seoScore += 5;
  if (og.title && og.description && og.image) seoScore += 10;
  if (twitter.card) seoScore += 5;
  if (structuredData.length > 0) seoScore += 10;
  if (viewport) seoScore += 5;
  if (hasLazyImages) seoScore += 5;
  if (language) seoScore += 5;
  if (robots && !robots.includes("noindex")) seoScore += 5;
  if (imagesWithAlt.length > 0) {
    const altRatio = imagesWithAlt.filter(i => i.hasAlt && i.alt).length / imagesWithAlt.length;
    seoScore += Math.round(altRatio * 10);
  }

  // Page size
  const pageSizeKB = Math.round(new TextEncoder().encode(html).length / 1024);

  return {
    basic: { title, description, keywords, author, robots, canonical, language, charset, viewport, generator, themeColor },
    openGraph: og,
    twitterCard: twitter,
    headings: { h1: h1s, h2: h2s, h3: h3s },
    links: {
      internal: internalLinks.slice(0, 50),
      external: externalLinks.slice(0, 50),
      totalInternal: internalLinks.length,
      totalExternal: externalLinks.length,
    },
    images: {
      total: imagesWithAlt.length,
      withAlt: imagesWithAlt.filter(i => i.hasAlt && i.alt).length,
      withoutAlt: imagesWithAlt.filter(i => !i.hasAlt || !i.alt).length,
      samples: imagesWithAlt.slice(0, 15),
    },
    scripts: { external: scripts, inlineCount: inlineScriptCount, stylesheets, inlineStyleCount },
    performance: { hasServiceWorker, hasManifest, hasPreconnect, hasPreload, hasDeferScripts, hasAsyncScripts, hasLazyImages, pageSizeKB },
    structuredData,
    socialLinks,
    technologies: [...new Set(technologies)],
    content: { wordCount, textPreview: textContent.slice(0, 500) },
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

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(formattedUrl);
    } catch {
      throw new Error("Invalid URL format");
    }

    // Block private/internal IPs
    const hostname = parsedUrl.hostname;
    if (hostname === "localhost" || hostname.startsWith("127.") || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname === "0.0.0.0") {
      throw new Error("Cannot scrape internal/private addresses");
    }

    console.log("Scraping:", formattedUrl);

    // Fetch with realistic browser headers
    const response = await fetch(formattedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Site returned HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const finalUrl = response.url; // after redirects
    const contentType = response.headers.get("content-type") || "";
    const server = response.headers.get("server") || "";
    const xPoweredBy = response.headers.get("x-powered-by") || "";

    // Security headers
    const securityHeaders = {
      strictTransportSecurity: response.headers.get("strict-transport-security") || "",
      contentSecurityPolicy: response.headers.get("content-security-policy") ? "Present" : "Missing",
      xFrameOptions: response.headers.get("x-frame-options") || "Missing",
      xContentTypeOptions: response.headers.get("x-content-type-options") || "Missing",
      referrerPolicy: response.headers.get("referrer-policy") || "Missing",
      permissionsPolicy: response.headers.get("permissions-policy") ? "Present" : "Missing",
    };

    const metadata = extractMetadata(html, finalUrl);

    // DNS/SSL info from headers
    const isHttps = finalUrl.startsWith("https://");

    const result = {
      success: true,
      url: formattedUrl,
      finalUrl,
      contentType,
      server: server || xPoweredBy || "Unknown",
      isHttps,
      securityHeaders,
      ...metadata,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("site-scraper error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
