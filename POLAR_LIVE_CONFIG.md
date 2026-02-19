# Polar LIVE Mode Configuration Backup
> Saved on 2026-02-19 — DO NOT DELETE. Restore this when switching back from sandbox.

## Live API Endpoint
```
https://api.polar.sh/v1
```

## Live Secret Names
- `POLAR_ACCESS_TOKEN` — Live access token (currently set)
- `POLAR_WEBHOOK_SECRET` — Live webhook secret (currently set)

## Live Products (from POLAR_BACKUP.md)

### Credit Packages (20 Products — 4 base × 5 discount tiers)
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

### Custom Credits (1 Product)
- Name: Custom Credits
- Metadata: `{ type: "custom_credits" }`

### Subscription Plans (6 Products)
| Plan | Cycle | Price | Credits/Month | Metadata: plan | Metadata: cycle |
|------|-------|-------|--------------|----------------|----------------|
| Starter Plan (Monthly) | monthly | $9.00/mo | 215 | starter | monthly |
| Starter Plan (Yearly) | yearly | $91.80/yr | 215 | starter | yearly |
| Pro Plan (Monthly) | monthly | $29.00/mo | 1,075 | pro | monthly |
| Pro Plan (Yearly) | yearly | $243.60/yr | 1,075 | pro | yearly |
| Business Plan (Monthly) | monthly | $79.00/mo | 4,300 | business | monthly |
| Business Plan (Yearly) | yearly | $635.16/yr | 4,300 | business | yearly |

### Discount Codes (Live)
| Code | Discount | Used For |
|------|----------|----------|
| YEARLY15 | 15% | Starter yearly |
| YEARLY30 | 30% | Pro yearly |
| YEARLY33 | 33% | Business yearly |
| SPECIAL50 | 50% | Retention (one-time) |

## How to Switch Back to Live
1. Update `POLAR_ACCESS_TOKEN` secret back to the live token
2. Update `POLAR_WEBHOOK_SECRET` secret back to the live webhook secret
3. Change `POLAR_MODE` secret to `live` (or delete it — defaults to live)
