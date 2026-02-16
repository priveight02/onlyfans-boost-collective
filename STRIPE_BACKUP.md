# Stripe Integration Backup
> Saved on 2026-02-16 — Full reference of all Stripe IDs, price maps, and integration logic.

## Stripe Products & Prices

### Subscription Plans (Live)
| Plan | Cycle | Product ID | Price ID |
|------|-------|------------|----------|
| Starter | Monthly | prod_TzAqP0zH90vzyR | price_1T1CVAP8Id8IBpd0heXxbsUk |
| Starter | Yearly | prod_TzAypr06as419B | price_1T1CcdP8Id8IBpd0AppiCEdo |
| Pro | Monthly | prod_TzArZUF2DIlzHq | price_1T1CVfP8Id8IBpd0B8EfZeGR |
| Pro | Yearly | prod_TzAywFFZ0SdhfZ | price_1T1CcuP8Id8IBpd0X5c5Nqbs |
| Business | Monthly | prod_TzAram9it2Kedf | price_1T1CVpP8Id8IBpd07EYina3g |
| Business | Yearly | prod_TzAzgoteaSHuDB | price_1T1Cd3P8Id8IBpd0Ds2Y7HoM |

### Subscription Plans (Test)
| Plan | Cycle | Product ID | Price ID |
|------|-------|------------|----------|
| Starter | Monthly | prod_TzQxzU5hz8sdwa | price_1T1S56AVBBvDGKKB8EV7ZvO1 |
| Starter | Yearly | prod_TzQxbSs93pQQtb | price_1T1S5fAVBBvDGKKBfv4Yzmvi |
| Pro | Monthly | prod_TzQxBoodMhERqW | price_1T1S5yAVBBvDGKKBhM9khxrJ |
| Pro | Yearly | prod_TzQyWX1DZuWpdA | price_1T1S6JAVBBvDGKKBMqAezmPe |
| Business | Monthly | prod_TzQyMmAEWuE1Ls | price_1T1S6YAVBBvDGKKBhYhs5Odi |
| Business | Yearly | prod_TzQyfPCDZvRxLn | price_1T1S6qAVBBvDGKKBiWitaZzY |

### Credit Packages (Live Base Prices)
| Package | Price ID |
|---------|----------|
| Starter (350 credits) | price_1T1AusP8Id8IBpd0HrNyaRWe |
| Pro (1650 credits) | price_1T1AvOP8Id8IBpd0jM8b94Al |
| Studio (3300 credits) | price_1T1AvlP8Id8IBpd03ocd2mOy |
| Power User (8250 credits) | price_1T1AwMP8Id8IBpd0PfrPX50i |

### Credit Packages (Test Base Prices)
| Package | Price ID |
|---------|----------|
| Starter | price_1T1S7FAVBBvDGKKBKHdQXRAW |
| Pro | price_1T1S7aAVBBvDGKKBJziRWeGQ |
| Studio | price_1T1S8MAVBBvDGKKBmVsmBN4P |
| Power User | price_1T1S8iAVBBvDGKKBKTMtxH4T |

## Discount Price Maps (Live)
```json
{
  "price_1T1AusP8Id8IBpd0HrNyaRWe": { "0": "price_1T1AusP8Id8IBpd0HrNyaRWe", "10": "price_1T1CycP8Id8IBpd0bQpuDaiR", "20": "price_1T1CyRP8Id8IBpd0yzku7LvD", "30": "price_1T1CyDP8Id8IBpd0TjT9sq9G" },
  "price_1T1AvOP8Id8IBpd0jM8b94Al": { "0": "price_1T1AvOP8Id8IBpd0jM8b94Al", "10": "price_1T1CzMP8Id8IBpd0SWdDvq6V", "20": "price_1T1CyyP8Id8IBpd0yihRkIU3", "30": "price_1T1CynP8Id8IBpd0MGCVyRhE" },
  "price_1T1AvlP8Id8IBpd03ocd2mOy": { "0": "price_1T1AvlP8Id8IBpd03ocd2mOy", "10": "price_1T1D06P8Id8IBpd0mhpxLZeK", "20": "price_1T1CzuP8Id8IBpd0e9rFMVKy", "30": "price_1T1CzkP8Id8IBpd0ZyAlES0z" },
  "price_1T1AwMP8Id8IBpd0PfrPX50i": { "0": "price_1T1AwMP8Id8IBpd0PfrPX50i", "10": "price_1T1D1RP8Id8IBpd0D0yBkzcL", "20": "price_1T1D0mP8Id8IBpd06fwa5Aqn", "30": "price_1T1D0KP8Id8IBpd0nm2nxxAe" }
}
```

## Discount Price Maps (Test)
```json
{
  "price_1T1S7FAVBBvDGKKBKHdQXRAW": { "0": "price_1T1S7FAVBBvDGKKBKHdQXRAW", "10": "price_1T1S8vAVBBvDGKKBRphrFbas", "20": "price_1T1S9BAVBBvDGKKBmIUnTNb6", "30": "price_1T1S9cAVBBvDGKKBW4XR7OSR" },
  "price_1T1S7aAVBBvDGKKBJziRWeGQ": { "0": "price_1T1S7aAVBBvDGKKBJziRWeGQ", "10": "price_1T1SASAVBBvDGKKBXom7jbyE", "20": "price_1T1SAkAVBBvDGKKBemFSv7qf", "30": "price_1T1SAvAVBBvDGKKBlciZJ82B" },
  "price_1T1S8MAVBBvDGKKBmVsmBN4P": { "0": "price_1T1S8MAVBBvDGKKBmVsmBN4P", "10": "price_1T1SBCAVBBvDGKKBUuPoFXyX", "20": "price_1T1SBPAVBBvDGKKBJGgBkUCt", "30": "price_1T1SBfAVBBvDGKKB5XXIXt76" },
  "price_1T1S8iAVBBvDGKKBKTMtxH4T": { "0": "price_1T1S8iAVBBvDGKKBKTMtxH4T", "10": "price_1T1SCLAVBBvDGKKBePfVZhRz", "20": "price_1T1SCeAVBBvDGKKBRzEnYVBo", "30": "price_1T1SCqAVBBvDGKKBqYirpM06" }
}
```

## Retention Price Maps (Live)
```json
{
  "price_1T1AusP8Id8IBpd0HrNyaRWe": "price_1T1EaQP8Id8IBpd02WQr8zhR",
  "price_1T1AvOP8Id8IBpd0jM8b94Al": "price_1T1EabP8Id8IBpd03miZJi8B",
  "price_1T1AvlP8Id8IBpd03ocd2mOy": "price_1T1EalP8Id8IBpd0DYdqUlCO",
  "price_1T1AwMP8Id8IBpd0PfrPX50i": "price_1T1EaxP8Id8IBpd0nU22G2sB"
}
```

## Retention Price Maps (Test)
```json
{
  "price_1T1S7FAVBBvDGKKBKHdQXRAW": "price_1T1SD6AVBBvDGKKB0UBK1Vi0",
  "price_1T1S7aAVBBvDGKKBJziRWeGQ": "price_1T1SDJAVBBvDGKKBbK5zOz1Y",
  "price_1T1S8MAVBBvDGKKBmVsmBN4P": "price_1T1SDTAVBBvDGKKBh1NFDcx8",
  "price_1T1S8iAVBBvDGKKBKTMtxH4T": "price_1T1SEpAVBBvDGKKB545n9TEY"
}
```

## Plan Credits
| Plan | Credits/Month |
|------|--------------|
| Starter | 215 |
| Pro | 1,075 |
| Business | 4,300 |

## Pricing Logic
- **Base price per credit**: $0.0999 (9.99 cents)
- **Frontend display rate**: 1.816 cents/credit (after 5.5x multiplier)
- **Volume discounts**: 5% (100+), 10% (200+), 15% (500+), 20% (1000+), 25% (2000+), 30% (3000+), 35% (5000+), 40% (10000+)
- **Loyalty discounts**: 30% (1st repurchase), 20% (2nd), 10% (3rd), 0% after
- **Retention discount**: 50% one-time offer for eligible Pro/Business users
- **Custom credits**: Min 10, volume + loyalty discounts stack

## Subscription Logic
- **Upgrades**: Prorated (charge difference immediately), credits granted instantly
- **Downgrades**: Scheduled for end of billing period, no refund
- **Same plan**: Blocked with error message

## Edge Functions
1. `purchase-credits` — Creates Stripe checkout for credit packages or custom credits
2. `create-checkout` — Creates Stripe checkout for subscriptions (handles upgrade/downgrade)
3. `customer-portal` — Opens Stripe billing portal
4. `billing-info` — Fetches subscription, payments, retention eligibility
5. `verify-credit-purchase` — Verifies Stripe sessions and credits wallet (idempotent)
6. `check-wallet` — Returns wallet balance (ensures wallet exists)

## Frontend Components
1. `src/pages/Pricing.tsx` — Credit packages page with retention offers
2. `src/components/profile/PlanCreditsTab.tsx` — Subscription plans + top-up dialog
3. `src/components/profile/BillingPaymentsTab.tsx` — Subscription management + payment history

## Eligible Retention Product IDs
Pro + Business (live + test): prod_TzArZUF2DIlzHq, prod_TzAywFFZ0SdhfZ, prod_TzAram9it2Kedf, prod_TzAzgoteaSHuDB, prod_TzQxBoodMhERqW, prod_TzQyWX1DZuWpdA, prod_TzQyMmAEWuE1Ls, prod_TzQyfPCDZvRxLn

## Checkout Success URLs
- Credits: `https://ozcagency.com/pricing?success=true&credits={N}`
- Subscriptions: `https://ozcagency.com/profile?subscription=success&plan={planId}`
