# Lemon Squeezy Integration Backup
> Saved on 2026-02-19 — Full reference of all LS products, configuration, and integration logic.
> **Replaced by Polar.sh integration.**

## Overview
Lemon Squeezy was used as the Merchant of Record (MoR) for the platform, handling credit package purchases, subscription management, custom credit purchases, and checkout overlay via embedded iframe.

## Credit Packages (20 Products — 4 base × 5 discount tiers)
| Package | Discount Tier | Variant ID | Product ID | Price (cents) |
|---------|--------------|-----------|------------|---------------|
| Starter Credits | Base | 1324008 | 840259 | 900 |
| Starter Credits | 10% | 1324031 | 840275 | 810 |
| Starter Credits | 20% | 1324035 | 840277 | 720 |
| Starter Credits | 30% | 1324037 | 840279 | 630 |
| Starter Credits | 50% | 1324043 | 840283 | 450 |
| Pro Credits | Base | 1324011 | 840262 | 2900 |
| Pro Credits | 10% | 1324045 | 840285 | 2610 |
| Pro Credits | 20% | 1324046 | 840286 | 2320 |
| Pro Credits | 30% | 1324054 | 840290 | 2030 |
| Pro Credits | 50% | 1324056 | 840292 | 1450 |
| Studio Credits | Base | 1324015 | 840264 | 4900 |
| Studio Credits | 10% | 1324066 | 840298 | 4410 |
| Studio Credits | 20% | 1324074 | 840305 | 3920 |
| Studio Credits | 30% | 1324075 | 840306 | 3430 |
| Studio Credits | 50% | 1324085 | 840311 | 2450 |
| Power User Credits | Base | 1324028 | 840272 | 14900 |
| Power User Credits | 10% | 1324087 | 840313 | 13410 |
| Power User Credits | 20% | 1324094 | 840318 | 11920 |
| Power User Credits | 30% | 1324097 | 840321 | 10430 |
| Power User Credits | 50% | 1324099 | 840323 | 7450 |

## Custom Credits (1 Product)
- Product ID: 840329
- Variant ID: 1324110
- Pricing: custom_price (pay-what-you-want)
- Min 500 credits, volume discounts up to 40%

## Subscription Plans (6 Products)
| Plan | Cycle | Product ID | Variant ID | Price (cents) |
|------|-------|-----------|-----------|---------------|
| Starter | Monthly | 840231 | 1323972 | 900 |
| Starter | Yearly | 840234 | 1323977 | 10800 |
| Pro | Monthly | 840240 | 1323985 | 2900 |
| Pro | Yearly | 840246 | 1323992 | 34800 |
| Business | Monthly | 840249 | 1323995 | 7900 |
| Business | Yearly | 840253 | 1324000 | 94800 |

## Yearly Discount Codes
| Plan | Code |
|------|------|
| Starter | YEARLY15 (15% off) |
| Pro | YEARLY30 (30% off) |
| Business | YEARLY33 (33% off) |

## API Configuration
- **API Base**: `https://api.lemonsqueezy.com/v1`
- **Auth**: Bearer token via `LEMONSQUEEZY_API_KEY` secret
- **Webhook Secret**: `LEMONSQUEEZY_WEBHOOK_SECRET`
- **Checkout**: Embedded iframe in CheckoutModal (max-w-6xl, 95vh)
- **Customer identification**: `custom_data.user_id` in checkout, fallback to `user_email`

## Discount Strategy
- **Loyalty discounts** (30%/20%/10%): Pre-baked LS product variants, selected by `getDiscountTier()` based on `wallet.purchase_count`
- **Retention discount** (50%): Pre-baked variant, one-time use per user (`wallet.retention_credits_used`)
- **Volume discounts**: Calculated server-side for custom credits (5-40%)
- **Yearly discounts**: Auto-applied via LS coupon codes resolved to discount IDs

## Pricing Logic
- **Volume discounts** (custom credits): 5% (10k+), 15% (15k+), 20% (20k+), 25% (30k+), 30% (50k+), 35% (75k+), 40% (100k+)
- **Loyalty discounts** (descending): 30% (1st repurchase), 20% (2nd), 10% (3rd), 0% after
- **Retention discount**: 50% one-time for eligible users
- **Base price per credit**: 1.816¢

## Edge Functions (LS)
1. `purchase-credits` — Creates LS checkout for credit packages or custom credits (variant-based)
2. `create-checkout` — Creates LS checkout for subscriptions (handles upgrade/downgrade via PATCH /subscriptions)
3. `verify-credit-purchase` — Dual strategy: DB check + LS orders API polling
4. `billing-info` — Fetches subscription, payments, retention eligibility from LS API
5. `customer-portal` — Resolves LS customer portal URL from subscriptions/orders
6. `ls-webhook` — HMAC-SHA256 verified webhook handling 19 LS events

## Webhook Events Handled
order_created, order_refunded, subscription_created, subscription_updated, subscription_cancelled, subscription_resumed, subscription_unpaused, subscription_paused, subscription_expired, subscription_payment_success, subscription_payment_failed, subscription_payment_recovered, subscription_plan_changed

## Checkout Flow
1. Frontend calls `purchase-credits` or `create-checkout`
2. Edge function creates LS checkout → returns `checkoutUrl`
3. Frontend embeds URL in full-screen iframe (CheckoutModal)
4. On success event via `window.postMessage`, frontend calls `verify-credit-purchase`
5. 5-stage retry mechanism with toast notifications
6. Success/cancel UI displayed in CheckoutModal

## Checkout Options
```json
{
  "embed": true,
  "dark": true,
  "media": true,
  "logo": true,
  "discount": false
}
```

## Webhook URL
`https://ufsnuobtvkciydftsyff.supabase.co/functions/v1/ls-webhook`

## Plan Credits Mapping
| Plan | Credits/Month |
|------|--------------|
| Starter | 215 |
| Pro | 1,075 |
| Business | 4,300 |
