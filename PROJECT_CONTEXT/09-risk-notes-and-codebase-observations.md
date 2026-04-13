# Risk Notes and Codebase Observations

## Critical Risks

### 1. Cart Storage Key Inconsistency

**Issue**: Different localStorage keys used for cart
- `lib/cart.ts`: `"tenpesorun_cart_v1"`
- `Storefront.tsx`: `"fds_cart_v1"`
- `CheckoutClient.tsx`: `"fds_cart_v1"`

**Impact**: Cart persistence may fail between pages
**Mitigation**: Standardize on one key across all files
**Priority**: HIGH

---

### 2. Build Error Suppression

**Issue**: `next.config.mjs` ignores TypeScript and ESLint errors
```javascript
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true }
```

**Impact**: Production builds may contain type errors or lint violations
**Mitigation**: Fix underlying errors, then remove these overrides
**Priority**: MEDIUM

---

### 3. No Middleware Protection

**Issue**: No `middleware.ts` file for route protection

**Current Protection**:
- Layout-level checks in `app/admin/(protected)/layout.tsx`
- Client-side checks in `AdminShell.tsx`

**Risk**: Potential race conditions or bypasses
**Mitigation**: Consider adding middleware for defense in depth
**Priority**: LOW (current protection appears adequate)

---

## Code Quality Issues

### 4. Inline Style Usage

**Issue**: Some components use inline styles for dynamic values
```tsx
// Example pattern found
style={{ width: `${progressPct}%` }}
style={{ height: `${Math.min(pullDistance, 80)}px` }}
```

**Impact**: Slightly harder to maintain, potential CSP issues
**Mitigation**: Use CSS variables or Tailwind arbitrary values where possible
**Priority**: LOW

---

### 5. Duplicated Peso Formatting

**Issue**: `peso()` function defined in multiple files
- `lib/utils.ts`: `formatPeso()` (canonical)
- `Storefront.tsx`: Inline `peso()`
- `CheckoutClient.tsx`: Inline `peso()`
- `OrderSuccessPage.tsx`: Inline `peso()`
- Various admin components: Inline `peso()`

**Impact**: Inconsistent formatting if changes needed
**Mitigation**: Standardize imports from `lib/utils.ts`
**Priority**: LOW

---

### 6. Mixed Client/Server Logic

**Issue**: Some files mix concerns
- `Storefront.tsx` is 886 lines (large component)
- `CheckoutClient.tsx` is 846 lines

**Impact**: Harder to test and maintain
**Mitigation**: Extract smaller components/hooks
**Priority**: LOW (working code)

---

## Schema and Data Risks

### 7. Unconfirmed Expense Table

**Issue**: Expense components exist but table not confirmed in schema

**Files:**
- `app/admin/(protected)/expenses/page.tsx`
- `app/admin/(protected)/expenses/actions.ts`
- `components/admin/AddExpenseForm.tsx`
- `components/admin/ExpenseTable.tsx`

**Risk**: May fail at runtime if table missing
**Mitigation**: Verify schema or implement table
**Priority**: MEDIUM

---

### 8. Service Request Tables Unclear

**Issue**: Printing, GCash, Delivery service forms exist but data storage unclear

**Risk**: Form submissions may not persist
**Mitigation**: Verify/create tables for service requests
**Priority**: MEDIUM

---

### 9. Hardcoded Pickup Locations

**Issue**: Pickup locations hardcoded as "Boys Dorm (Room 411)" and "Girls Dorm (Room 206)"

**Locations:**
- `CheckoutClient.tsx`
- `OrderSuccessPage.tsx`
- Database enum/validation

**Risk**: Difficult to change without code updates
**Mitigation**: Move to `app_settings` configuration
**Priority**: LOW

---

### 10. Timezone Hardcoding

**Issue**: `Asia/Manila` hardcoded throughout

**Locations:**
- `app/admin/(protected)/page.tsx`
- `app/api/admin/reports/route.ts`

**Risk**: App won't work correctly in other regions
**Mitigation**: Extract to environment variable or setting
**Priority**: LOW (appropriate for current use case)

---

## Performance Concerns

### 11. Large Component Files

| Component | Lines | Risk |
|-----------|-------|------|
| `Storefront.tsx` | 886 | Bundle size, render time |
| `CheckoutClient.tsx` | 846 | Bundle size, complexity |
| `ProductsClient.tsx` | ~500 | Maintainability |
| `OrdersClient.tsx` | ~600 | Maintainability |

**Mitigation**: Code splitting, lazy loading, component extraction
**Priority**: LOW (current performance appears acceptable)

---

### 12. No Pagination on Key Lists

**Issue**: Products and orders fetch all records

**Files:**
- `app/page.tsx`: `.limit(100)` on products
- `app/admin/(protected)/orders/page.tsx`: `.limit(200)` on orders

**Risk**: Performance degradation with growth
**Mitigation**: Implement pagination or virtual scrolling
**Priority**: MEDIUM (monitor growth)

---

## Security Observations

### 13. Client-Side Auth Verification Only

**Issue**: Admin protection relies on client checks

**Current:**
```tsx
// AdminShell.tsx
useEffect(() => {
  supabase.auth.getUser().then(({ data, error }) => {
    if (error || !data.user) router.replace("/admin/login");
  });
}, []);
```

**Note**: Server-side check exists in layout.tsx
**Risk**: Brief flash of protected content possible
**Mitigation**: Loading state prevents flash (implemented)
**Priority**: LOW

---

### 14. Missing Rate Limiting

**Issue**: No rate limiting on:
- Login attempts
- Order placement
- API endpoints

**Risk**: Brute force, spam
**Mitigation**: Implement Supabase rate limits or edge middleware
**Priority**: MEDIUM

---

## Technical Debt

### 15. Backup File in Repo

**Issue**: `app/checkout/page.tsx.backup` exists

**Mitigation**: Remove or add to .gitignore
**Priority**: LOW

---

### 16. Legacy Files

**Issue**: `backend-map/` directory with bundle

**Contents:**
- Appears to be experimental/legacy bundling
- Duplicates app code

**Mitigation**: Evaluate if needed, otherwise remove
**Priority**: LOW

---

### 17. Unused Imports/Variables

**Observation**: ESLint ignores during build may hide unused code

**Mitigation**: Run lint check locally, clean up
**Priority**: LOW

---

## Safe Areas for Refactoring

### ✅ Safe to Modify

1. **UI Polish**: Colors, spacing, animations (follow design system)
2. **New Admin Features**: Add new pages following existing patterns
3. **Settings**: Add new `app_settings` entries
4. **Reports**: Extend reporting API with new metrics
5. **Dashboard**: Add new KPI cards

### ⚠️ Modify with Care

1. **Checkout Flow**: Test thoroughly, affects revenue
2. **Order Status Workflow**: Ensure all transitions handled
3. **Inventory Receiving**: FIFO logic is complex
4. **Product Forms**: Image upload flow

### 🛑 Do Not Modify Without Deep Understanding

1. **FIFO Functions**: `consume_inventory_fifo` RPC
2. **Atomic Order Placement**: `place_order_atomic` RPC
3. **Profit Views**: Database views for analytics
4. **Auth Flow**: Session handling and admin checks

---

## Testing Gaps

**Current State**: No test files found in codebase

**Missing:**
- Unit tests
- Integration tests
- E2E tests

**Priority**: MEDIUM (recommend adding at least critical path tests)

---

## Documentation Gaps

**Missing:**
- API documentation for RPC functions
- Environment variable documentation
- Deployment guide
- Database migration guide

**Priority**: LOW (this context pack addresses some gaps)

---

## Recommended Actions (Prioritized)

### Immediate (Before Next Release)
1. ✅ Fix cart localStorage key inconsistency
2. ✅ Remove backup file from repo
3. ✅ Verify expense table exists or disable feature

### Short Term (Next Sprint)
1. 📋 Add basic error monitoring/logging
2. 📋 Implement rate limiting
3. 📋 Add pagination to orders list
4. 📋 Standardize peso formatting utility

### Medium Term (Next Quarter)
1. 📋 Add test coverage for critical paths
2. 📋 Document RPC functions
3. 📋 Extract large components
4. 📋 Remove build error suppressions (fix underlying issues)

### Long Term
1. 📋 Implement proper monitoring/alerting
2. 📋 Add multi-tenant support (if needed)
3. 📋 Internationalization (extract hardcoded text)
