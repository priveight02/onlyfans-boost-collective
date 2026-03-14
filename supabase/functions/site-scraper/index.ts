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

function detectPlatforms(html: string, scripts: string[], stylesheets: string[], externalLinks: string[]) {
  const all = html + " " + scripts.join(" ") + " " + stylesheets.join(" ") + " " + externalLinks.join(" ");
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
    ["Polar.sh", ["polar.sh", "api.polar.sh", "sandbox-api.polar.sh", "polar-sh"]],
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
    ["SendOwl", ["sendownl.com"]],
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
    ["SendOwl", ["sendownl.com"]],
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

function extractMetadata(html: string, url: string, securityHeaders: Record<string, string>) {
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

  // Detect platforms
  const detectedPlatforms = detectPlatforms(html, scripts, stylesheets, externalLinks);

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

  const advancedMetrics = {
    // Document & markup
    metric_total_tags: totalTagCount,
    metric_unique_tags: uniqueTagCount,
    metric_meta_tags: metaTags.length,
    metric_title_length: title.length,
    metric_description_length: description.length,
    metric_keywords_count: keywordList.length,
    metric_keyword_words_total: keywordWordCount,
    metric_language_declared: boolToNumber(Boolean(language)),
    metric_charset_declared: boolToNumber(Boolean(charset)),
    metric_viewport_declared: boolToNumber(Boolean(viewport)),
    metric_theme_color_declared: boolToNumber(Boolean(themeColor)),
    metric_generator_declared: boolToNumber(Boolean(generator)),

    // SEO structure
    metric_h1_count: h1s.length,
    metric_h2_count: h2s.length,
    metric_h3_count: h3s.length,
    metric_headings_total: headingCount,
    metric_heading_depth_score: headingDepthScore,
    metric_heading_hierarchy_issues: headingHierarchyIssues,
    metric_canonical_count: canonicalCount,
    metric_hreflang_count: hreflangCount,
    metric_alternate_link_count: alternateLinkCount,
    metric_og_tags_count: ogMetaCount,
    metric_twitter_tags_count: twitterMetaCount,
    metric_json_ld_blocks: structuredData.length,
    metric_favicon_count: faviconCount,
    metric_rss_feed_links: rssFeedCount,
    metric_amp_links: ampLinkCount,
    metric_sitemap_mentions: sitemapMentionCount,

    // Content quality
    metric_word_count: wordCount,
    metric_sentence_count: sentenceCount,
    metric_avg_words_per_sentence: round2(sentenceCount ? wordCount / sentenceCount : 0),
    metric_paragraph_count: paragraphCount,
    metric_list_items_count: listItemCount,
    metric_table_count: tableCount,
    metric_blockquote_count: blockquoteCount,
    metric_unique_word_count: uniqueWords.size,
    metric_unique_word_ratio_percent: round2(wordCount ? (uniqueWords.size / wordCount) * 100 : 0),
    metric_long_word_ratio_percent: round2(wordCount ? (longWordCount / wordCount) * 100 : 0),
    metric_text_to_html_ratio_percent: round2(html.length ? (textContent.length / html.length) * 100 : 0),
    metric_keyword_to_word_ratio_percent: round2(wordCount ? (keywordWordCount / wordCount) * 100 : 0),

    // Link intelligence
    metric_anchor_tags_count: anchorTags.length,
    metric_internal_links: internalLinks.length,
    metric_external_links: externalLinks.length,
    metric_internal_link_ratio_percent: round2((internalLinks.length + externalLinks.length) ? (internalLinks.length / (internalLinks.length + externalLinks.length)) * 100 : 0),
    metric_external_link_ratio_percent: round2((internalLinks.length + externalLinks.length) ? (externalLinks.length / (internalLinks.length + externalLinks.length)) * 100 : 0),
    metric_external_domains_count: externalDomains.size,
    metric_social_platforms_found: Object.keys(socialLinks).length,
    metric_mailto_links_count: mailtoLinkCount,
    metric_tel_links_count: telLinkCount,
    metric_javascript_links_count: javascriptLinkCount,
    metric_fragment_links_count: fragmentLinkCount,
    metric_nofollow_links_count: nofollowLinkCount,
    metric_noopener_links_count: noopenerLinkCount,
    metric_noreferrer_links_count: noreferrerLinkCount,
    metric_target_blank_links_count: targetBlankCount,

    // Media
    metric_images_total: imageTags.length,
    metric_images_with_alt: imagesWithAlt.filter(i => i.hasAlt && i.alt).length,
    metric_images_without_alt: imagesWithAlt.filter(i => !i.hasAlt || !i.alt).length,
    metric_image_alt_coverage_percent: round2(imageTags.length ? (imagesWithAlt.filter(i => i.hasAlt && i.alt).length / imageTags.length) * 100 : 0),
    metric_lazy_images_count: lazyImageCount,
    metric_lazy_image_coverage_percent: round2(imageTags.length ? (lazyImageCount / imageTags.length) * 100 : 0),
    metric_responsive_images_count: responsiveImageCount,
    metric_responsive_image_coverage_percent: round2(imageTags.length ? (responsiveImageCount / imageTags.length) * 100 : 0),
    metric_images_with_dimensions_count: imageWithWidthHeightCount,
    metric_picture_tags_count: pictureTagCount,
    metric_source_tags_count: sourceTagCount,
    metric_video_tags_count: videoTagCount,
    metric_audio_tags_count: audioTagCount,
    metric_iframe_count: iframes.length,
    metric_embed_tags_count: embedTagCount,
    metric_svg_tags_count: svgTagCount,

    // Scripts & styles
    metric_script_tags_total: scriptTags.length,
    metric_external_script_tags: externalScriptTags.length,
    metric_inline_script_tags: inlineScriptTags.length,
    metric_defer_script_count: deferScriptCount,
    metric_async_script_count: asyncScriptCount,
    metric_module_script_count: moduleScriptCount,
    metric_defer_script_ratio_percent: round2(scriptTags.length ? (deferScriptCount / scriptTags.length) * 100 : 0),
    metric_async_script_ratio_percent: round2(scriptTags.length ? (asyncScriptCount / scriptTags.length) * 100 : 0),
    metric_stylesheet_links: stylesheets.length,
    metric_inline_style_tags: styleTags.length,
    metric_estimated_request_assets: imageTags.length + externalScriptTags.length + stylesheets.length + iframes.length,

    // Performance flags
    metric_has_service_worker: boolToNumber(hasServiceWorker),
    metric_has_manifest: boolToNumber(hasManifest),
    metric_has_preconnect: boolToNumber(hasPreconnect),
    metric_has_preload: boolToNumber(hasPreload),
    metric_has_defer_scripts: boolToNumber(hasDeferScripts),
    metric_has_async_scripts: boolToNumber(hasAsyncScripts),
    metric_has_lazy_images: boolToNumber(hasLazyImages),
    metric_has_responsive_images: boolToNumber(hasResponsiveImages),
    metric_has_webp: boolToNumber(hasWebP),
    metric_has_avif: boolToNumber(hasAVIF),
    metric_page_size_kb: pageSizeKB,

    // Accessibility
    metric_form_count: formCount,
    metric_input_count: inputCount,
    metric_select_count: selectCount,
    metric_textarea_count: textareaCount,
    metric_form_field_count: inputCount + selectCount + textareaCount,
    metric_labels_count: inputsWithLabels,
    metric_aria_attribute_count: ariaCount,
    metric_aria_label_count: ariaLabelCount,
    metric_aria_describedby_count: ariaDescribedByCount,
    metric_role_attribute_count: roleCount,
    metric_tabindex_count: tabIndexCount,
    metric_alt_attribute_count: altAttributeCount,
    metric_button_count: buttonCount,
    metric_landmark_tags_count: mainCount + navCount + headerCount + footerCount + asideCount,
    metric_skip_nav_present: boolToNumber(hasSkipNav),
    metric_focus_style_present: boolToNumber(hasFocusStyles),

    // Security
    metric_https_enabled: boolToNumber(url.startsWith("https://")),
    metric_hsts_header_present: boolToNumber(Boolean(securityHeaders?.strictTransportSecurity && securityHeaders.strictTransportSecurity !== "")),
    metric_csp_header_present: boolToNumber(securityHeaders?.contentSecurityPolicy === "Present"),
    metric_xframe_header_present: boolToNumber((securityHeaders?.xFrameOptions || "") !== "Missing"),
    metric_xcontent_type_options_present: boolToNumber((securityHeaders?.xContentTypeOptions || "") !== "Missing"),
    metric_referrer_policy_present: boolToNumber((securityHeaders?.referrerPolicy || "") !== "Missing"),
    metric_permissions_policy_present: boolToNumber(securityHeaders?.permissionsPolicy === "Present"),
    metric_security_headers_present_count: secureHeadersPresent,

    // Platform intelligence
    metric_platform_categories_detected: platformCategoryCount,
    metric_platform_detections_total: totalPlatformDetections,
    metric_crm_tools_detected: detectedPlatforms.crm.length,
    metric_payment_tools_detected: detectedPlatforms.payments.length,
    metric_analytics_tools_detected: detectedPlatforms.analytics.length,
    metric_marketing_tools_detected: detectedPlatforms.marketing.length,
    metric_support_tools_detected: detectedPlatforms.support.length,
    metric_ecommerce_tools_detected: detectedPlatforms.ecommerce.length,
    metric_hosting_tools_detected: detectedPlatforms.hosting.length,
    metric_framework_tools_detected: detectedPlatforms.frameworks.length,
    metric_ads_tools_detected: detectedPlatforms.ads.length,
    metric_security_tools_detected: detectedPlatforms.security.length,
    metric_scheduling_tools_detected: detectedPlatforms.scheduling.length,
    metric_forms_tools_detected: detectedPlatforms.forms.length,
    metric_engagement_tools_detected: detectedPlatforms.engagement.length,
    metric_social_proof_tools_detected: detectedPlatforms.socialProof.length,
    metric_seo_tools_detected: detectedPlatforms.seoTools.length,
    metric_productivity_tools_detected: detectedPlatforms.productivity.length,
    metric_social_media_integrations_detected: detectedPlatforms.socialMedia.length,
    metric_database_baas_detected: detectedPlatforms.database.length,
    metric_ai_ml_tools_detected: detectedPlatforms.aiTools.length,
    metric_affiliate_tools_detected: detectedPlatforms.affiliate.length,
    metric_personalization_tools_detected: detectedPlatforms.personalization.length,

    // Content depth
    metric_avg_heading_length: round2(headingCount ? ([...h1s, ...h2s, ...h3s].reduce((a, h) => a + h.length, 0)) / headingCount : 0),
    metric_content_density_per_kb: round2(pageSizeKB ? wordCount / pageSizeKB : 0),
    metric_reading_time_minutes: round2(wordCount / 200),
    metric_flesch_word_complexity: round2(wordCount ? (longWordCount / wordCount) * 100 : 0),
    metric_link_density_percent: round2(totalTagCount ? (anchorTags.length / totalTagCount) * 100 : 0),
    metric_image_density_per_1000_words: round2(wordCount ? (imageTags.length / wordCount) * 1000 : 0),
    metric_script_density_per_1000_words: round2(wordCount ? (scriptTags.length / wordCount) * 1000 : 0),

    // Tech stack depth
    metric_has_spa_framework: boolToNumber(lc.includes("__next") || lc.includes("__nuxt") || lc.includes("__gatsby") || lc.includes("__react") || lc.includes("__vue")),
    metric_has_pwa: boolToNumber(hasServiceWorker && hasManifest),
    metric_has_ssr_indicators: boolToNumber(lc.includes("__next_data__") || lc.includes("__nuxt__") || lc.includes("__gatsby")),
    metric_has_graphql: boolToNumber(lc.includes("graphql")),
    metric_has_websocket: boolToNumber(lc.includes("websocket") || lc.includes("wss://")),
    metric_has_webrtc: boolToNumber(lc.includes("webrtc") || lc.includes("rtcpeerconnection")),
    metric_has_web_components: boolToNumber(lc.includes("customelements") || lc.includes("shadow-root") || lc.includes("shadowdom")),
    metric_has_wasm: boolToNumber(lc.includes("webassembly") || lc.includes(".wasm")),
    metric_has_web_workers: boolToNumber(lc.includes("new worker(") || lc.includes("web worker")),

    // Social & engagement depth
    metric_social_share_buttons: boolToNumber(lc.includes("share") && (lc.includes("facebook") || lc.includes("twitter") || lc.includes("linkedin"))),
    metric_social_login_present: boolToNumber(lc.includes("social-login") || lc.includes("oauth") || lc.includes("g_id_onload") || lc.includes("fb-login")),
    metric_has_comments_system: boolToNumber(lc.includes("disqus") || lc.includes("comments") || lc.includes("comment-form")),
    metric_has_newsletter_signup: boolToNumber(lc.includes("newsletter") || lc.includes("subscribe") || lc.includes("mailing-list")),
    metric_has_cookie_consent: boolToNumber(lc.includes("cookie") && (lc.includes("consent") || lc.includes("accept") || lc.includes("gdpr"))),
    metric_has_gdpr_notice: boolToNumber(lc.includes("gdpr") || lc.includes("privacy-policy") || lc.includes("data-protection")),
    metric_has_live_chat: boolToNumber(detectedPlatforms.support.length > 0),
    metric_has_search_bar: boolToNumber(lc.includes("search") && (lc.includes('type="search"') || lc.includes("search-input") || lc.includes("search-form"))),
    metric_has_dark_mode: boolToNumber(lc.includes("dark-mode") || lc.includes("theme-toggle") || lc.includes("color-scheme")),
    metric_has_i18n: boolToNumber(hreflangCount > 0 || lc.includes("i18n") || lc.includes("intl") || lc.includes("translate")),
    metric_has_breadcrumbs: boolToNumber(lc.includes("breadcrumb")),
    metric_has_pagination: boolToNumber(lc.includes("pagination") || lc.includes("page-numbers")),
    metric_has_infinite_scroll: boolToNumber(lc.includes("infinite-scroll") || lc.includes("load-more")),
    metric_has_sticky_header: boolToNumber(lc.includes("sticky") && lc.includes("header")),
    metric_has_back_to_top: boolToNumber(lc.includes("back-to-top") || lc.includes("scroll-top")),
    metric_has_modal_popup: boolToNumber(lc.includes("modal") || lc.includes("popup") || lc.includes("dialog")),
    metric_has_carousel_slider: boolToNumber(lc.includes("carousel") || lc.includes("slider") || lc.includes("swiper")),
    metric_has_accordion_tabs: boolToNumber(lc.includes("accordion") || lc.includes("tab-panel") || lc.includes("tabpanel")),
    metric_has_animation_library: boolToNumber(lc.includes("gsap") || lc.includes("framer-motion") || lc.includes("animate.css") || lc.includes("lottie")),
    metric_has_map_embed: boolToNumber(lc.includes("maps.google") || lc.includes("mapbox") || lc.includes("leaflet")),
    metric_has_video_player: boolToNumber(videoTagCount > 0 || lc.includes("video-js") || lc.includes("plyr") || lc.includes("videojs")),
    metric_has_audio_player: boolToNumber(audioTagCount > 0),
    metric_has_file_upload: boolToNumber(lc.includes('type="file"') || lc.includes("dropzone") || lc.includes("file-upload")),
    metric_has_pricing_page: boolToNumber(lc.includes("pricing") || lc.includes("plans")),
    metric_has_testimonials: boolToNumber(lc.includes("testimonial") || lc.includes("review") || lc.includes("client-says")),
    metric_has_faq_section: boolToNumber(lc.includes("faq") || lc.includes("frequently-asked")),
    metric_has_blog: boolToNumber(lc.includes("/blog") || lc.includes("blog-post") || lc.includes("article")),
    metric_has_sitemap_link: boolToNumber(lc.includes("sitemap.xml")),
    metric_has_robots_meta: boolToNumber(Boolean(robots)),
    metric_has_print_stylesheet: boolToNumber(lc.includes('media="print"')),
    metric_has_minified_assets: boolToNumber(lc.includes(".min.js") || lc.includes(".min.css")),
    metric_has_cdn_assets: boolToNumber(lc.includes("cdn.") || lc.includes("cloudfront.net") || lc.includes("cloudflare")),
    metric_third_party_script_count: scripts.filter(s => { try { return new URL(s, url).hostname !== domain; } catch { return false; } }).length,
    metric_data_attribute_count: (html.match(/\sdata-[a-z]/gi) || []).length,
    metric_css_custom_property_count: (html.match(/--[a-z][a-z0-9-]*/gi) || []).length,
    metric_total_external_domains: externalDomains.size,
    metric_dom_nesting_depth_estimate: (() => { const depths = html.split("\n").slice(0, 500).map(l => (l.match(/^\s*/)?.[0]?.length || 0) / 2); return depths.length ? Math.min(50, Math.max(...depths)) : 0; })(),

    // ── Financial & Monetization Metrics ──
    metric_payment_providers_count: detectedPlatforms.payments.length,
    metric_crypto_payment_detected: boolToNumber(detectedPlatforms.payments.some((p: any) => ["Cryptomus","NOWPayments","CoinGate","BTCPay Server","Plisio","CoinPayments","Coinbase Commerce","BitPay","Crypto.com Pay","TripleA","Binance Pay","MoonPay","Transak","Ramp Network","OpenNode","CoinsPaid","Blockonomics","Confirmo","Utrust","Alchemy Pay","GoCoin","GoURL","Coinremitter","SpicePay"].includes(p.name))),
    metric_fiat_payment_detected: boolToNumber(detectedPlatforms.payments.some((p: any) => ["Stripe","PayPal","Square","Braintree","Adyen","Razorpay","Mollie","Authorize.net","Worldpay","Checkout.com","GoCardless","Paysafe"].includes(p.name))),
    metric_bnpl_detected: boolToNumber(detectedPlatforms.payments.some((p: any) => ["Klarna","Afterpay","Affirm","Sezzle","Zip (QuadPay)"].includes(p.name))),
    metric_wallet_pay_detected: boolToNumber(detectedPlatforms.payments.some((p: any) => ["Apple Pay","Google Pay","Amazon Pay","Venmo","Cash App"].includes(p.name))),
    metric_subscription_billing_detected: boolToNumber(detectedPlatforms.payments.some((p: any) => ["Chargebee","Recurly","Zuora","Chargify/Maxio","Aria Systems","RevenueCat","Paddle","Polar.sh","Lemon Squeezy"].includes(p.name))),
    metric_creator_monetization_detected: boolToNumber(detectedPlatforms.payments.some((p: any) => ["Patreon","Buy Me a Coffee","Ko-fi","Gumroad","Whop","Payhip"].includes(p.name))),
    metric_has_checkout_flow: boolToNumber(lc.includes("checkout") || lc.includes("cart") || lc.includes("add-to-cart") || lc.includes("buy-now")),
    metric_has_subscription_ui: boolToNumber(lc.includes("subscription") || lc.includes("recurring") || lc.includes("monthly") || lc.includes("annually")),
    metric_has_free_trial: boolToNumber(lc.includes("free trial") || lc.includes("free-trial") || lc.includes("try free") || lc.includes("start free")),
    metric_has_money_back_guarantee: boolToNumber(lc.includes("money-back") || lc.includes("money back") || lc.includes("refund") || lc.includes("guarantee")),
    metric_has_coupon_discount: boolToNumber(lc.includes("coupon") || lc.includes("discount") || lc.includes("promo code") || lc.includes("promo-code")),
    metric_has_currency_symbols: boolToNumber(/[\$€£¥₹₿]/.test(html)),
    metric_price_points_found: (html.match(/[\$€£]\s?\d+[\.,]?\d{0,2}/g) || []).length,
    metric_has_payment_form: boolToNumber(lc.includes("card-number") || lc.includes("cardnumber") || lc.includes("cc-number") || lc.includes("payment-form")),
    metric_has_invoice_billing: boolToNumber(lc.includes("invoice") || lc.includes("billing")),
    metric_has_revenue_model_indicators: boolToNumber(lc.includes("saas") || lc.includes("marketplace") || lc.includes("freemium") || lc.includes("enterprise")),
    metric_ecommerce_platforms_count: detectedPlatforms.ecommerce.length,
    metric_ad_monetization_count: detectedPlatforms.ads.length,
    metric_affiliate_tools_count: detectedPlatforms.affiliate.length,
    metric_has_donation_widget: boolToNumber(lc.includes("donate") || lc.includes("donation") || lc.includes("tip jar")),
    metric_has_paywall: boolToNumber(lc.includes("paywall") || lc.includes("premium-content") || lc.includes("members-only") || lc.includes("subscriber-only")),
    metric_has_membership: boolToNumber(lc.includes("membership") || lc.includes("member-area") || lc.includes("members")),
    metric_has_waitlist: boolToNumber(lc.includes("waitlist") || lc.includes("wait-list") || lc.includes("join the list")),
    metric_has_lead_magnet: boolToNumber(lc.includes("lead-magnet") || lc.includes("free download") || lc.includes("free ebook") || lc.includes("free guide")),
    metric_has_upsell_crosssell: boolToNumber(lc.includes("upsell") || lc.includes("cross-sell") || lc.includes("you may also like") || lc.includes("recommended for you")),
    metric_has_abandoned_cart: boolToNumber(lc.includes("abandoned") || lc.includes("cart-recovery")),
    metric_has_loyalty_rewards: boolToNumber(lc.includes("loyalty") || lc.includes("rewards") || lc.includes("points") || lc.includes("cashback")),

    // ── Social & Community Depth ──
    metric_social_platforms_linked: Object.keys(socialLinks).length,
    metric_social_share_implementations: detectedPlatforms.socialMedia.filter((p: any) => p.name.includes("Share")).length,
    metric_social_login_implementations: detectedPlatforms.socialMedia.filter((p: any) => p.name.includes("Login") || p.name.includes("Sign-In")).length,
    metric_social_embed_implementations: detectedPlatforms.socialMedia.filter((p: any) => p.name.includes("Embed")).length,
    metric_social_sdk_implementations: detectedPlatforms.socialMedia.filter((p: any) => p.name.includes("SDK") || p.name.includes("API")).length,
    metric_has_community_features: boolToNumber(lc.includes("community") || lc.includes("forum") || lc.includes("discussion")),
    metric_has_user_generated_content: boolToNumber(lc.includes("user-generated") || lc.includes("ugc") || lc.includes("submit your")),
    metric_has_referral_program: boolToNumber(lc.includes("referral") || lc.includes("refer a friend") || lc.includes("invite friends")),
    metric_has_gamification: boolToNumber(lc.includes("badge") || lc.includes("leaderboard") || lc.includes("achievement") || lc.includes("streak")),
    metric_has_notification_system: boolToNumber(lc.includes("notification") || lc.includes("push-notification") || detectedPlatforms.engagement.length > 0),
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
    accessibility: { formCount, inputsWithLabels, ariaCount, roleCount, tabIndexCount, hasSkipNav, hasFocusStyles },
    fonts: { googleFonts, customFonts, adobeFonts },
    iframes,
    contactInfo: { phoneNumbers, emailAddresses },
    content: { wordCount, textPreview: textContent.slice(0, 500) },
    advancedMetrics,
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

    const metadata = extractMetadata(html, finalUrl, securityHeaders);
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
