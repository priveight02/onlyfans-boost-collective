# Polar.sh Integration Backup
> Saved on 2026-02-19 — Full reference of all Polar products, configuration, and integration logic.
> **Replaced by Lemon Squeezy integration.**

## Overview
Polar.sh was used as the Merchant of Record (MoR) for the platform, handling credit package purchases, subscription management, custom credit purchases, and checkout overlay via `@polar-sh/checkout` SDK.

## Credit Packages (20 Products — 4 base × 5 discount tiers)
| Package | Discount Tier | Credits | Bonus | Price | Metadata: base_package | Metadata: discount_tier |
|---------|--------------|---------|-------|-------|----------------------|------------------------|
| Starter Credits | Base | 350 | 0 | $9.00 | starter | none |
| Starter Credits — 10% Loyalty | 10% | 350 | 0 | $8.10 | starter | loyalty_10 |
| Starter Credits — 20% Loyalty | 20% | 350 | 0 | $7.20 | starter | loyalty_20 |
| Starter Credits — 30% Loyalty | 30% | 350 | 0 | $6.30 | starter | loyalty_30 |
| Starter Credits — 50% Retention | 50% | 350 | 0 | $4.50 | starter | retention_50 |
| Pro Credits | Base | 1,650 | 350 | $29.00 | pro | none |
| Pro Credits — 10% Loyalty | 10% | 1,650 | 350 | $26.10 | pro | loyalty_10 |
| Pro Credits — 20% Loyalty | 20% | 1,650 | 350 | $23.20 | pro | loyalty_20 |
| Pro Credits — 30% Loyalty | 30% | 1,650 | 350 | $20.30 | pro | loyalty_30 |
| Pro Credits — 50% Retention | 50% | 1,650 | 350 | $14.50 | pro | retention_50 |
| Studio Credits | Base | 3,300 | 550 | $49.00 | studio | none |
| Studio Credits — 10% Loyalty | 10% | 3,300 | 550 | $44.10 | studio | loyalty_10 |
| Studio Credits — 20% Loyalty | 20% | 3,300 | 550 | $39.20 | studio | loyalty_20 |
| Studio Credits — 30% Loyalty | 30% | 3,300 | 550 | $34.30 | studio | loyalty_30 |
| Studio Credits — 50% Retention | 50% | 3,300 | 550 | $24.50 | studio | retention_50 |
| Power User Credits | Base | 11,500 | 2,000 | $149.00 | power | none |
| Power User Credits — 10% Loyalty | 10% | 11,500 | 2,000 | $134.10 | power | loyalty_10 |
| Power User Credits — 20% Loyalty | 20% | 11,500 | 2,000 | $119.20 | power | loyalty_20 |
| Power User Credits — 30% Loyalty | 30% | 11,500 | 2,000 | $104.30 | power | loyalty_30 |
| Power User Credits — 50% Retention | 50% | 11,500 | 2,000 | $74.50 | power | retention_50 |

## Custom Credits (1 Product)
- Name: Custom Credits
- Pricing: ad-hoc (custom amount at checkout)
- Metadata: `{ type: "custom_credits" }`
- Min 500 credits, volume discounts up to 40%

## Subscription Plans (6 Products)
| Plan | Cycle | Price | Credits/Month | Metadata: plan | Metadata: cycle |
|------|-------|-------|--------------|----------------|----------------|
| Starter Plan (Monthly) | monthly | $9.00/mo | 215 | starter | monthly |
| Starter Plan (Yearly) | yearly | $91.80/yr | 215 | starter | yearly |
| Pro Plan (Monthly) | monthly | $29.00/mo | 1,075 | pro | monthly |
| Pro Plan (Yearly) | yearly | $243.60/yr | 1,075 | pro | yearly |
| Business Plan (Monthly) | monthly | $79.00/mo | 4,300 | business | monthly |
| Business Plan (Yearly) | yearly | $635.16/yr | 4,300 | business | yearly |

## Product Images (Hosted in product-images bucket)
| Product | Image File |
|---------|-----------|
| Starter Credits | credits-starter.png |
| Pro Credits | credits-pro.png |
| Studio Credits | credits-studio.png |
| Power User Credits | credits-power.png |
| Custom Credits | credits-custom.png |
| Starter Plan | plan-starter.png |
| Pro Plan | plan-pro.png |
| Business Plan | plan-business.png |

## Polar API Configuration
- **API Base**: `https://api.polar.sh/v1`
- **Auth**: Bearer token via `POLAR_ACCESS_TOKEN` secret
- **SDK**: `@polar-sh/checkout` (PolarEmbedCheckout for embedded overlay)
- **Product images**: Uploaded via Polar File API (S3 presigned URLs)
- **Customer identification**: `external_customer_id` mapped to Supabase user ID

## Product Metadata Schema
- Credit packages: `{ type: "credit_package", base_package: string, discount_tier: string, credits: string, bonus_credits: string, original_price: string }`
- Subscriptions: `{ type: "subscription", plan: string, cycle: string, credits_per_month: string }`
- Custom: `{ type: "custom_credits" }`

## Discount Strategy
- **Loyalty discounts** (10%/20%/30%): Pre-baked product variants on Polar, selected via `findProductVariant()` helper
- **Retention discount** (50%): Pre-baked variant, one-time use for eligible users
- **Volume discounts**: Calculated server-side for custom credits (5-40%)
- **Discounts are NOT stacked** — retention overrides loyalty

## Pricing Logic
- **Volume discounts** (custom credits): 5% (10k+), 15% (15k+), 20% (20k+), 25% (30k+), 30% (50k+), 35% (75k+), 40% (100k+)
- **Loyalty discounts** (ascending): 10% (1st repurchase), 20% (2nd), 30% (3rd+)
- **Retention discount**: 50% one-time for eligible Pro/Business users
- **Base price per credit**: 1.816¢

## Edge Functions (Polar)
1. `polar-setup` — Creates 26+ products with images on Polar, maps to credit_packages table
2. `purchase-credits` — Creates Polar checkout for credit packages or custom credits
3. `create-checkout` — Creates Polar checkout for subscriptions (handles upgrade/downgrade)
4. `verify-credit-purchase` — Verifies Polar orders and credits wallet (idempotent)
5. `billing-info` — Fetches subscription, payments, retention eligibility from Polar
6. `customer-portal` — Creates Polar customer session for portal access

## Checkout Flow
1. Frontend calls `purchase-credits` or `create-checkout` edge function
2. Edge function creates Polar checkout → returns `checkoutUrl`
3. Frontend opens checkout via `PolarEmbedCheckout.create(url, { theme: "dark" })`
4. On success event, frontend calls `verify-credit-purchase` to credit wallet
5. Success/cancel UI displayed in CheckoutModal component

## Checkout Success URLs
- Credits: `{origin}/pricing?success=true`
- Subscriptions: `{origin}/profile?subscription=success&plan={planId}`

## Plan Credits Mapping
| Plan | Credits/Month |
|------|--------------|
| Starter | 215 |
| Pro | 1,075 |
| Business | 4,300 |
