# Stripe Integration Backup
> Saved on 2026-02-16 — Full reference of all Stripe IDs, price maps, and integration logic.
> **REBUILT FROM SCRATCH** — All previous products archived, fresh products created.

## Credit Packages (One-Time)
| Package | Credits | Bonus | Price | Product ID | Price ID |
|---------|---------|-------|-------|------------|----------|
| Starter Credits | 350 | 0 | $9.00 | prod_TzUHXZe5486FpE | price_1T1VJCAMkMnyWeZ5PGyt5wQo |
| Pro Credits | 1,650 | 350 | $29.00 | prod_TzUHrWS3VQOpyU | price_1T1VJDAMkMnyWeZ5B4QPUiK8 |
| Studio Credits | 3,300 | 550 | $49.00 | prod_TzUHVIprcCKyNa | price_1T1VJEAMkMnyWeZ59YuPnyk6 |
| Power User Credits | 8,250 | 1,100 | $149.00 | prod_TzUH24OEZcqvQ4 | price_1T1VJEAMkMnyWeZ5CueVYThp |

## Subscription Plans
| Plan | Cycle | Price | Product ID | Price ID |
|------|-------|-------|------------|----------|
| Starter | Monthly | $9/mo | prod_TzUHCCIizN6I7f | price_1T1VJFAMkMnyWeZ5rs0aieC5 |
| Starter | Yearly | $91.80/yr ($7.65/mo) | prod_TzUH8Mt50ljrdU | price_1T1VJFAMkMnyWeZ5KDmUMmOr |
| Pro | Monthly | $29/mo | prod_TzUHWAwfmPq4tb | price_1T1VJGAMkMnyWeZ5smZK9UMZ |
| Pro | Yearly | $243.60/yr ($20.30/mo) | prod_TzUHaVlxICCGRQ | price_1T1VJHAMkMnyWeZ5AETKAFKj |
| Business | Monthly | $79/mo | prod_TzUHPwUI3oNubJ | price_1T1VJHAMkMnyWeZ5XYQZkunf |
| Business | Yearly | $635.16/yr ($52.93/mo) | prod_TzUHnPtQRoRlVA | price_1T1VJIAMkMnyWeZ5Vk21hN66 |

## Stripe Coupons (Auto-Applied at Checkout)
| Coupon | ID | Discount | Duration |
|--------|----|----------|----------|
| Loyalty 10% Off | j5jMOrlU | 10% | once |
| Loyalty 20% Off | r71MZDc7 | 20% | once |
| Loyalty 30% Off | DsXHlXrd | 30% | once |
| Retention 50% Off | 5P34jI5L | 50% | once |

## Plan Credits
| Plan | Credits/Month |
|------|--------------|
| Starter | 215 |
| Pro | 1,075 |
| Business | 4,300 |

## Product Images (Hosted in product-images bucket)
| Product | Image File |
|---------|-----------|
| Starter Credits | credits-starter.png |
| Pro Credits | img-pro-base.png |
| Studio Credits | img-studio-base.png |
| Power User Credits | img-power-base.png |
| Starter Plan | plan-starter-coins.png |
| Pro Plan | plan-pro-coins-fixed.png |
| Business Plan | plan-business-coins.png |
| Custom Credits | credits-custom.png |

## Discount Strategy
- **Loyalty discounts** (10%/20%/30%): Applied via Stripe coupons at checkout on base price
- **Retention discount** (50%): One-time offer for eligible Pro/Business users
- **Volume discounts**: Applied in purchase-credits edge function for custom credits (5-40%)
- **Coupons are NOT stacked** — retention overrides loyalty

## Pricing Logic
- **Volume discounts** (custom credits): 5% (10k+), 15% (15k+), 20% (20k+), 25% (30k+), 30% (50k+), 35% (75k+), 40% (100k+)
- **Loyalty discounts**: 30% (1st repurchase), 20% (2nd), 10% (3rd), 0% after
- **Retention discount**: 50% one-time offer for eligible Pro/Business users
- **Custom credits**: Min 500, volume + loyalty discounts stack

## Edge Functions
1. `purchase-credits` — Creates Stripe checkout for credit packages or custom credits
2. `create-checkout` — Creates Stripe checkout for subscriptions (handles upgrade/downgrade)
3. `customer-portal` — Opens Stripe billing portal
4. `billing-info` — Fetches subscription, payments, retention eligibility
5. `verify-credit-purchase` — Verifies Stripe sessions and credits wallet (idempotent)
6. `check-wallet` — Returns wallet balance (ensures wallet exists)

## Eligible Retention Product IDs
Pro + Business: prod_TzUHWAwfmPq4tb, prod_TzUHaVlxICCGRQ, prod_TzUHPwUI3oNubJ, prod_TzUHnPtQRoRlVA

## Checkout Success URLs
- Credits: `https://ozcagency.com/pricing?success=true&credits={N}`
- Subscriptions: `https://ozcagency.com/profile?subscription=success&plan={planId}`
