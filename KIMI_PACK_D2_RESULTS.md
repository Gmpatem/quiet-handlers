# Pack D2 Results: Credit Mode and Debtors Foundation

**Date:** 2026-04-09  
**Status:** COMPLETED  
**Scope:** Credit mode implementation, debtors tracking, admin foundation

---

## Summary

Pack D2 adds credit mode support and debtors foundation to the FDS system while preserving all existing order/payment/checkout flows.

### Key Decisions
- **Credit is admin-initiated only** (safe for V1)
- **Balance tracking via `balance_due_cents`** column
- **Purple visual theme** for credit (distinct from blue proof/green paid)

---

## Files Changed

| File | Changes |
|------|---------|
| `lib/supabase.ts` | Added `credit` to payment_method_type enum |
| `app/admin/(protected)/orders/OrdersClient.tsx` | Credit actions, badges, balance display |
| `app/admin/(protected)/orders/page.tsx` | Added balance_due_cents to query |
| `app/admin/(protected)/page.tsx` | Added DebtorsSummary component |
| `app/admin/(protected)/DebtorsSummary.tsx` | NEW - Dashboard credit summary |
| `app/admin/(protected)/debtors/page.tsx` | NEW - Full debtors list page |

---

## Database Changes

Run in Supabase SQL Editor:

```sql
-- 1. Extend enum
ALTER TYPE payment_method_type ADD VALUE IF NOT EXISTS 'credit';

-- 2. Add balance column
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS balance_due_cents INTEGER DEFAULT NULL;

-- 3. Create index
CREATE INDEX IF NOT EXISTS idx_payments_credit_balance 
ON payments(method, balance_due_cents) 
WHERE method = 'credit' AND balance_due_cents > 0;
```

---

## Features Implemented

### Admin Orders Page
- **Convert to Credit** button on eligible orders
- **Record Full Repayment** button on credit orders
- **Purple credit badge** for unpaid credit
- **Balance Due** display in payment section

### Debtors Summary (Dashboard)
- Active debtor count
- Total outstanding amount
- Link to full debtors page

### Debtors Page (/admin/debtors)
- Aggregated by customer name
- Total owed per customer
- Order count and last order date
- Sorted by highest debt

---

## Credit States

| State | Method | Status | Balance | Badge |
|-------|--------|--------|---------|-------|
| Credit Unpaid | credit | pending | >0 | Purple "Credit" |
| Credit Settled | credit | paid | 0 | Green "Paid" |

---

## Test Checklist

- [ ] Convert pending order to credit
- [ ] Verify purple badge and balance display
- [ ] Record repayment on credit order
- [ ] Verify green badge and zero balance
- [ ] Check debtors summary on dashboard
- [ ] Check debtors page shows correct totals

---

## Future Enhancements (V2+)

- Partial repayments
- Repayment history/audit trail
- Customer credit limits
- Automated payment reminders
- Interest calculation

---

## Ready for Next Pack

✅ YES - The system now supports credit mode and debtors tracking while maintaining clean separation from existing flows.
