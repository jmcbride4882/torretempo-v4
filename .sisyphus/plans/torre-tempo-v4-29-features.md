# Torre Tempo V4 - 29 Features Parallel Execution Plan

## TL;DR

> **Quick Summary**: Implement 25 features across admin panel enhancements (17) and dual payment processor integration (8) using maximum parallelization. Features 1-4 (pagination) already complete.
> 
> **Deliverables**:
> - 7 new admin pages/modals (Sessions, Feature Flags, Billing Ops, Notification Center, enhanced filtering, bulk ops, exports)
> - Complete Stripe + GoCardless payment infrastructure
> - 8 new API route files, 4 new service files, 2 database migrations
> - Full webhook handling with signature verification
> - Customer self-service billing portal
> 
> **Estimated Effort**: Large (~40-50 hours with parallelization, ~80+ hours sequential)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Wave 1 → Wave 2 (Payment Foundation) → Wave 3 (Core Billing) → Wave 4 (Advanced) → Wave 5 (Integration)

---

## Context

### Original Request
User requested 29 features split into two groups:
- **GROUP A**: Admin Panel Enhancements (21 features, 4 complete = 17 remaining)
- **GROUP B**: Payment Processor Integration (8 features - Stripe + GoCardless)

Execution mode: Maximum parallelization - both groups simultaneously.

### Interview Summary
**Key Discussions**:
- Test Strategy: **Tests-after** - Implement with Agent-Executed QA first, add automated tests in follow-up wave
- Environment Config: **Include in plan** - Create .env.example templates for all API keys
- UI Language: **English** - Match existing admin panel language

**Confirmed Defaults**:
- Trial period: 14 days
- Dunning retry: 3 attempts (Day 1, Day 3, Day 7, then suspend)
- GoCardless routing: SEPA zone (EU + UK + CH + NO)
- Invoice email: Basic professional HTML
- Admin audit log: Full detail with before/after data

### Research Findings
**Admin Panel Patterns** (from codebase exploration):
- 8 existing admin pages using consistent patterns
- PaginationControls component ready for reuse
- Glass-morphism UI, 10-second auto-refresh, Framer Motion animations
- API pattern: requireAdmin middleware → Drizzle ORM → logAdminAction()

**Express/Webhook Integration**:
- CRITICAL: Webhooks MUST register BEFORE express.json() (line 57 pattern)
- BullMQ: 6 queues exist, add `paymentQueue` for webhook processing
- Error handling: asyncHandler wrapper, errorLogger middleware

**Database Schema Ready**:
- `subscription_details`: stripe_customer_id, gocardless_customer_id, gocardless_mandate_id fields exist
- `subscription_plans`: pricing, limits, modules configured

### Gap Analysis (Self-Reviewed)
**Gaps Identified and Resolved**:
1. **Missing payment queue**: Will add `paymentQueue` to lib/queue.ts
2. **No webhook routes**: Will create apps/api/src/routes/webhooks/ directory
3. **No payment services**: Will create stripe.service.ts, gocardless.service.ts, billing.service.ts
4. **No feature_flags table**: Will create migration
5. **No admin_sessions table**: Better Auth provides session access via API

---

## Work Objectives

### Core Objective
Deliver 25 production-ready features enabling complete admin operations and dual payment processor billing with maximum parallel execution.

### Concrete Deliverables

**Admin Panel (17 features)**:
- Enhanced search/filtering UI across all admin pages
- User impersonation endpoint + UI button
- Email actions (password reset, verification resend)
- Session management (list, force logout)
- CSV data exports (users, tenants, audit logs)
- Bulk operations (multi-select, bulk ban/delete)
- SessionsPage with active session monitoring
- Feature flags system (database + CRUD + admin UI)
- FeatureFlagsPage for flag management
- Billing operations UI (invoices, refunds, credits)
- Notification center (broadcast messages)

**Payment Integration (8 features)**:
- Stripe + GoCardless SDK integration with smart routing
- Subscription billing (monthly/annual recurring)
- Webhook handling with signature verification
- Customer self-service portal
- Admin manual billing operations
- Trial period handling (14-day → paid conversion)
- Usage-based billing (employee count)
- Invoice generation with email delivery
- Payment failed recovery (dunning logic)

### Definition of Done
- [ ] All 25 features implemented and functional
- [ ] All new endpoints respond correctly (verified via curl/Playwright)
- [ ] All new pages render without errors (verified via Playwright)
- [ ] Webhook signature verification working
- [ ] Payment flow tested end-to-end (test mode)
- [ ] All mutations logged to admin_audit_log
- [ ] TypeScript strict mode passes (no `any` types)

### Must Have
- Real data - NO mock/placeholder implementations
- Production-ready error handling
- Audit logging for all admin mutations
- HMAC signature verification for all webhooks
- Idempotency handling for payment events

### Must NOT Have (Guardrails)
- NO `any` types (TypeScript strict mode)
- NO console.log in production code (use proper logging)
- NO hardcoded API keys (use environment variables)
- NO synchronous webhook processing (use BullMQ queues)
- NO raw SQL queries (use Drizzle ORM)
- NO skipping audit logs for mutations
- NO storing full card numbers (use Stripe tokens)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks MUST be verifiable WITHOUT any human action.
> ALL verification is executed by the agent using tools (Playwright, curl, tmux).

### Test Decision
- **Infrastructure exists**: NO (no test framework configured)
- **Automated tests**: Tests-after (add in follow-up wave)
- **Framework**: Will use Vitest (modern, fast, Vite-compatible)

### Agent-Executed QA (PRIMARY VERIFICATION)

| Deliverable Type | Tool | Verification Method |
|------------------|------|---------------------|
| Admin Pages | Playwright | Navigate, interact, assert DOM, screenshot |
| API Endpoints | curl/httpie | Send requests, parse JSON, assert fields |
| Webhooks | curl + signature | POST with computed signature, verify processing |
| Database Changes | Drizzle queries | Query tables, verify schema |
| Email Delivery | BullMQ inspection | Check queue job completion |

### Evidence Requirements
- Screenshots: `.sisyphus/evidence/task-{N}-{scenario}.png`
- API responses: Logged in acceptance criteria
- Webhook payloads: Captured in queue jobs

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately) - 8 tasks, ~10 hours:
├── Task 5: Search/filtering UI enhancements
├── Task 9: Data exports (CSV)
├── Task 10: Bulk operations
├── Task 11: SessionsPage
├── Task P1: Payment SDK installation + env setup
├── Task P2: Stripe service foundation
├── Task P3: GoCardless service foundation
└── Task P4: Payment queue + webhook route skeleton

Wave 2 (After Wave 1) - 6 tasks, ~8 hours:
├── Task 6: User impersonation
├── Task 7: Email actions
├── Task 12: Feature flags database + API
├── Task 16: Subscription billing (Stripe)
├── Task 17: Webhook handling (Stripe + GoCardless)
└── Task 20: Trial period handling

Wave 3 (After Wave 2) - 5 tasks, ~8 hours:
├── Task 8: Session management (force logout)
├── Task 13: FeatureFlagsPage UI
├── Task 18: Customer portal
├── Task 21: Usage-based billing
└── Task 22: Invoice generation

Wave 4 (After Wave 3) - 4 tasks, ~6 hours:
├── Task 14: Billing operations UI
├── Task 15: Notification center
├── Task 19: Admin manual billing
└── Task 23: Payment failed recovery (dunning)

Wave 5 (Final Integration) - 2 tasks, ~4 hours:
├── Task T1: Integration testing all flows
└── Task T2: Add automated tests (Vitest)

Critical Path: P1 → P2/P3 → 16/17 → 18/21 → 23
Parallel Speedup: ~50% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 5 | None | None | 9, 10, 11, P1-P4 |
| 6 | None | 8 | 5, 7, 9-11 |
| 7 | None | None | 5, 6, 9-11 |
| 8 | 6 | None | 12, 13 |
| 9 | None | None | 5, 10, 11 |
| 10 | None | None | 5, 9, 11 |
| 11 | None | 8 | 5, 9, 10 |
| 12 | None | 13 | 16, 17, 20 |
| 13 | 12 | None | 18, 21 |
| 14 | 16, 19 | None | 15 |
| 15 | None | None | 14 |
| P1 | None | P2, P3 | 5, 9-11 |
| P2 | P1 | 16, 17 | P3, P4 |
| P3 | P1 | 16, 17 | P2, P4 |
| P4 | P1 | 17 | P2, P3 |
| 16 | P2, P3 | 18, 21 | 17, 20 |
| 17 | P4 | 23 | 16, 20 |
| 18 | 16 | 14 | 21, 22 |
| 19 | 16 | 14 | 22, 23 |
| 20 | 16 | 21 | 17, 12 |
| 21 | 20 | 22 | 18, 13 |
| 22 | 21 | None | 19, 23 |
| 23 | 17 | None | 22 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Dispatch |
|------|-------|---------------------|
| 1 | 5, 9, 10, 11, P1-P4 | 4-6 parallel agents (visual-engineering, ultrabrain) |
| 2 | 6, 7, 12, 16, 17, 20 | 4-5 parallel agents after Wave 1 completes |
| 3 | 8, 13, 18, 21, 22 | 4-5 parallel agents after Wave 2 completes |
| 4 | 14, 15, 19, 23 | 3-4 parallel agents after Wave 3 completes |
| 5 | T1, T2 | 2 sequential agents (integration must precede tests) |

---

## TODOs

### WAVE 1 - Foundation (No Dependencies)

---

- [ ] 5. Enhanced Search/Filtering UI

  **What to do**:
  - Add date range picker component to admin pages (start date, end date filters)
  - Add multi-select dropdown for status/tier/role filters
  - Implement filter persistence in URL search params
  - Add "Clear all filters" button
  - Apply to: TenantsPage, UsersPage, AuditPage, ErrorLogsPage

  **Must NOT do**:
  - Don't create new filter components from scratch (use Radix UI DatePicker, MultiSelect)
  - Don't modify pagination logic (already working)
  - Don't add filters that don't exist in API (check API supports the filter first)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component work requiring visual understanding and React expertise
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Date pickers and multi-select are complex UI patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 9, 10, 11, P1-P4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/web/src/pages/admin/TenantsPage.tsx:1-50` - Current filter implementation pattern
  - `apps/web/src/pages/admin/AuditPage.tsx` - Date-based filtering example
  - `apps/web/src/components/ui/` - Existing UI components to extend
  - `apps/api/src/routes/admin/tenants.ts:15-45` - API filter support (search, status, tier)
  - Radix UI DatePicker: https://www.radix-ui.com/primitives/docs/components/popover (for date picker)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Date range filter works on AuditPage
    Tool: Playwright
    Preconditions: Dev server running, admin logged in, audit logs exist
    Steps:
      1. Navigate to: http://localhost:5173/admin/audit
      2. Wait for: [data-testid="date-from"] visible (timeout: 5s)
      3. Click: [data-testid="date-from"]
      4. Select: Date 7 days ago
      5. Click: [data-testid="date-to"]
      6. Select: Today's date
      7. Wait for: Table to refresh (loading indicator disappears)
      8. Assert: All visible rows have dates within selected range
      9. Screenshot: .sisyphus/evidence/task-5-date-filter.png
    Expected Result: Only audit logs within date range displayed
    Evidence: .sisyphus/evidence/task-5-date-filter.png

  Scenario: Multi-select status filter on TenantsPage
    Tool: Playwright
    Preconditions: Dev server running, tenants with different tiers exist
    Steps:
      1. Navigate to: http://localhost:5173/admin/tenants
      2. Click: [data-testid="tier-filter"]
      3. Select: "starter" AND "professional" (multi-select)
      4. Wait for: Table refresh
      5. Assert: All visible tenants have tier "starter" OR "professional"
      6. Click: "Clear all filters" button
      7. Assert: All tiers now visible
      8. Screenshot: .sisyphus/evidence/task-5-multiselect.png
    Expected Result: Multi-select filtering works correctly
    Evidence: .sisyphus/evidence/task-5-multiselect.png

  Scenario: Filter state persists in URL
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:5173/admin/tenants
      2. Apply filter: tier=professional, search="test"
      3. Assert: URL contains ?tier=professional&search=test
      4. Refresh page (F5)
      5. Assert: Filters still applied after refresh
    Expected Result: Filters persist across page refresh
    Evidence: URL state verification
  ```

  **Commit**: YES
  - Message: `feat(admin): add date range and multi-select filters to admin pages`
  - Files: `apps/web/src/pages/admin/*.tsx`, `apps/web/src/components/ui/date-range-picker.tsx`, `apps/web/src/components/ui/multi-select.tsx`

---

- [ ] 9. Data Exports (CSV)

  **What to do**:
  - Create export API endpoints: GET /api/admin/export/users, /tenants, /audit
  - Add query params for filtering exported data (same filters as list endpoints)
  - Generate CSV with proper headers and escaped values
  - Add "Export CSV" button to UsersPage, TenantsPage, AuditPage
  - Stream large exports to prevent memory issues

  **Must NOT do**:
  - Don't export sensitive data (password hashes, API keys)
  - Don't allow export without admin authentication
  - Don't load entire dataset into memory (use streaming)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Backend streaming logic requires careful implementation
  - **Skills**: []
    - No special skills needed - standard Express/Node streaming

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 5, 10, 11, P1-P4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/api/src/routes/admin/users.ts` - User list endpoint pattern
  - `apps/api/src/routes/admin/tenants.ts` - Tenant list endpoint with filters
  - `apps/api/src/routes/admin/audit.ts` - Audit log list endpoint
  - Node.js streams: https://nodejs.org/api/stream.html
  - CSV generation: Use `fast-csv` package (lightweight, streaming)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Export users to CSV
    Tool: Bash (curl)
    Preconditions: API server running, admin session cookie available
    Steps:
      1. curl -s -o users.csv "http://localhost:3000/api/admin/export/users" \
           -H "Cookie: better-auth.session_token=<session>"
      2. Assert: File users.csv exists and size > 0
      3. Assert: First line contains headers (id,email,name,role,createdAt)
      4. Assert: CSV has at least 2 data rows
      5. Assert: No password hashes in file (grep -v "password")
    Expected Result: Valid CSV file with user data
    Evidence: users.csv file contents

  Scenario: Export filtered tenants
    Tool: Bash (curl)
    Steps:
      1. curl -s -o tenants.csv "http://localhost:3000/api/admin/export/tenants?tier=professional" \
           -H "Cookie: better-auth.session_token=<session>"
      2. Assert: All rows have tier="professional"
    Expected Result: Only professional tier tenants exported
    Evidence: tenants.csv file contents

  Scenario: Large export streams correctly
    Tool: Bash (curl + time)
    Steps:
      1. time curl -s "http://localhost:3000/api/admin/export/audit?limit=10000" \
           -H "Cookie: <session>" > audit.csv
      2. Assert: Response starts within 1 second (streaming, not buffered)
      3. Assert: Memory usage stable (no spike)
    Expected Result: Large exports stream without memory issues
    Evidence: Timing and file size
  ```

  **Commit**: YES
  - Message: `feat(admin): add CSV export endpoints for users, tenants, audit logs`
  - Files: `apps/api/src/routes/admin/export.ts`, `apps/web/src/pages/admin/*.tsx`

---

- [ ] 10. Bulk Operations

  **What to do**:
  - Add checkbox column to UsersPage and TenantsPage tables
  - Implement "Select all" / "Select page" functionality
  - Add bulk action dropdown: Ban Selected, Delete Selected, Change Tier (tenants)
  - Create bulk API endpoints: POST /api/admin/users/bulk, /tenants/bulk
  - Show confirmation modal with count of affected items
  - Log each individual action to audit log

  **Must NOT do**:
  - Don't allow bulk delete without confirmation (require typing "DELETE")
  - Don't skip audit logging for bulk operations
  - Don't process more than 100 items in single request

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex UI state management (selection) + backend bulk logic
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Checkbox selection UX patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 5, 9, 11, P1-P4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/web/src/pages/admin/TenantsPage.tsx:100-200` - Table rendering pattern
  - `apps/api/src/routes/admin/tenants.ts:DELETE` - Single delete with confirmation
  - `apps/api/src/services/adminAudit.service.ts` - logAdminAction pattern

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Select multiple users and ban
    Tool: Playwright
    Preconditions: Dev server running, multiple test users exist
    Steps:
      1. Navigate to: http://localhost:5173/admin/users
      2. Click: Checkbox for user row 1
      3. Click: Checkbox for user row 2
      4. Assert: "2 selected" indicator visible
      5. Click: Bulk actions dropdown
      6. Click: "Ban Selected"
      7. Assert: Confirmation modal appears with "Ban 2 users?"
      8. Type: "BAN" in confirmation input
      9. Click: Confirm button
      10. Wait for: Success toast "2 users banned"
      11. Assert: Both users now show "Banned" badge
      12. Screenshot: .sisyphus/evidence/task-10-bulk-ban.png
    Expected Result: Multiple users banned in single operation
    Evidence: .sisyphus/evidence/task-10-bulk-ban.png

  Scenario: Bulk delete requires confirmation
    Tool: Playwright
    Steps:
      1. Select 3 tenants via checkboxes
      2. Click: Bulk actions → Delete Selected
      3. Assert: Modal requires typing "DELETE"
      4. Type: "delete" (lowercase)
      5. Assert: Confirm button remains disabled
      6. Clear and type: "DELETE"
      7. Assert: Confirm button now enabled
    Expected Result: Strict confirmation prevents accidental deletion
    Evidence: Modal state verification

  Scenario: Audit log records each bulk action
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/users/bulk with action="ban", ids=["id1","id2","id3"]
      2. GET /api/admin/audit?action=user.ban
      3. Assert: 3 separate audit entries created (one per user)
    Expected Result: Individual audit trail maintained
    Evidence: Audit log response
  ```

  **Commit**: YES
  - Message: `feat(admin): add bulk operations for users and tenants`
  - Files: `apps/web/src/pages/admin/UsersPage.tsx`, `apps/web/src/pages/admin/TenantsPage.tsx`, `apps/api/src/routes/admin/users.ts`, `apps/api/src/routes/admin/tenants.ts`

---

- [ ] 11. SessionsPage (Admin Panel)

  **What to do**:
  - Create new admin page: SessionsPage.tsx
  - Display all active sessions across platform (user, device, IP, created, last activity)
  - Add session filtering (by user, by tenant, active only)
  - Add "Terminate Session" button per row
  - Add "Terminate All" for specific user
  - Register route in AdminLayout.tsx navigation

  **Must NOT do**:
  - Don't expose session tokens in UI
  - Don't allow terminating own session
  - Don't create new session table (Better Auth provides session access)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: New admin page following established patterns
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Session management UI patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 5, 9, 10, P1-P4)
  - **Blocks**: Task 8 (Session management API)
  - **Blocked By**: None

  **References**:
  - `apps/web/src/pages/admin/UsersPage.tsx` - Page structure template
  - `apps/web/src/pages/admin/AdminLayout.tsx:50-80` - Navigation registration
  - Better Auth session API: https://www.better-auth.com/docs/concepts/session-management
  - `apps/api/src/db/schema.ts` - Check if session table exists

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: SessionsPage displays active sessions
    Tool: Playwright
    Preconditions: Dev server running, admin logged in, other sessions exist
    Steps:
      1. Navigate to: http://localhost:5173/admin/sessions
      2. Wait for: Session table visible (timeout: 5s)
      3. Assert: Table headers include (User, Device, IP, Created, Last Activity, Actions)
      4. Assert: At least 1 session row visible (current admin session)
      5. Assert: Session tokens NOT visible in any column
      6. Screenshot: .sisyphus/evidence/task-11-sessions-page.png
    Expected Result: Sessions page loads with session data
    Evidence: .sisyphus/evidence/task-11-sessions-page.png

  Scenario: Terminate other user's session
    Tool: Playwright
    Preconditions: Another user has active session
    Steps:
      1. Navigate to: http://localhost:5173/admin/sessions
      2. Find: Row with user != current admin
      3. Click: "Terminate" button on that row
      4. Assert: Confirmation modal appears
      5. Click: Confirm
      6. Wait for: Success toast
      7. Assert: Row removed from table
    Expected Result: Session terminated successfully
    Evidence: Toast message and table state

  Scenario: Cannot terminate own session
    Tool: Playwright
    Steps:
      1. Navigate to: http://localhost:5173/admin/sessions
      2. Find: Row with current admin user
      3. Assert: "Terminate" button is disabled or hidden
    Expected Result: Self-termination prevented
    Evidence: Button state
  ```

  **Commit**: YES
  - Message: `feat(admin): add SessionsPage for platform-wide session management`
  - Files: `apps/web/src/pages/admin/SessionsPage.tsx`, `apps/web/src/pages/admin/AdminLayout.tsx`, `apps/api/src/routes/admin/sessions.ts`

---

- [ ] P1. Payment SDK Installation + Environment Setup

  **What to do**:
  - Install Stripe SDK: `npm install stripe --workspace=api`
  - Install GoCardless SDK: `npm install gocardless-nodejs --workspace=api`
  - Add environment variables to .env.example:
    - STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
    - GOCARDLESS_ACCESS_TOKEN, GOCARDLESS_WEBHOOK_SECRET, GOCARDLESS_ENVIRONMENT
  - Create config file: apps/api/src/config/payment.ts
  - Add payment queue to lib/queue.ts

  **Must NOT do**:
  - Don't add actual API keys (only placeholders)
  - Don't initialize SDKs at module level (lazy init for testability)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration and package installation - straightforward
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 5, 9, 10, 11)
  - **Blocks**: P2, P3, P4, Tasks 16-23
  - **Blocked By**: None

  **References**:
  - `apps/api/package.json` - Current dependencies
  - `.env.example` - Environment template
  - `apps/api/src/lib/queue.ts` - Queue configuration pattern
  - Stripe SDK: https://stripe.com/docs/api?lang=node
  - GoCardless SDK: https://developer.gocardless.com/api-reference/#overview

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: SDKs installed and importable
    Tool: Bash
    Steps:
      1. cd apps/api && npm ls stripe
      2. Assert: stripe@latest listed
      3. npm ls gocardless-nodejs
      4. Assert: gocardless-nodejs@latest listed
      5. node -e "require('stripe'); require('gocardless-nodejs'); console.log('OK')"
      6. Assert: "OK" printed (no import errors)
    Expected Result: Both SDKs installed and importable
    Evidence: npm ls output

  Scenario: Environment variables documented
    Tool: Bash
    Steps:
      1. grep "STRIPE_SECRET_KEY" .env.example
      2. Assert: Variable present with placeholder
      3. grep "GOCARDLESS_ACCESS_TOKEN" .env.example
      4. Assert: Variable present with placeholder
      5. grep "STRIPE_WEBHOOK_SECRET" .env.example
      6. Assert: Variable present
    Expected Result: All payment env vars documented
    Evidence: grep output

  Scenario: Payment queue configured
    Tool: Bash
    Steps:
      1. grep "paymentQueue" apps/api/src/lib/queue.ts
      2. Assert: Queue exported
      3. grep "PaymentJob" apps/api/src/lib/queue.ts
      4. Assert: Job interface defined
    Expected Result: Payment queue ready for use
    Evidence: grep output
  ```

  **Commit**: YES
  - Message: `chore(api): install Stripe and GoCardless SDKs, add payment config`
  - Files: `apps/api/package.json`, `.env.example`, `apps/api/src/config/payment.ts`, `apps/api/src/lib/queue.ts`

---

- [ ] P2. Stripe Service Foundation

  **What to do**:
  - Create apps/api/src/services/stripe.service.ts
  - Implement: createCustomer, getCustomer, updateCustomer
  - Implement: createSubscription, getSubscription, cancelSubscription
  - Implement: createPaymentIntent, listPaymentMethods
  - Implement: verifyWebhookSignature (HMAC-SHA256)
  - Add proper TypeScript types for all returns
  - Handle Stripe errors with custom error class

  **Must NOT do**:
  - Don't process webhooks in this service (separate handler)
  - Don't store full card details
  - Don't use `any` types

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Payment service requires careful error handling and type safety
  - **Skills**: []
    - No special skills - standard TypeScript/SDK work

  **Parallelization**:
  - **Can Run In Parallel**: YES (after P1)
  - **Parallel Group**: Wave 1 continued (with P3, P4)
  - **Blocks**: Tasks 16, 17, 18, 19, 22, 23
  - **Blocked By**: P1

  **References**:
  - `apps/api/src/services/subscription.service.ts` - Service pattern
  - Stripe SDK docs: https://stripe.com/docs/api/customers/create
  - Stripe subscription docs: https://stripe.com/docs/billing/subscriptions/overview
  - `apps/api/src/db/schema.ts:subscription_details` - stripe_customer_id field

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Create Stripe customer
    Tool: Bash (Node REPL)
    Preconditions: STRIPE_SECRET_KEY set to test key
    Steps:
      1. node -e "
         const { createStripeCustomer } = require('./dist/services/stripe.service.js');
         createStripeCustomer({ email: 'test@example.com', name: 'Test User' })
           .then(c => console.log('ID:', c.id))
           .catch(e => console.error('ERROR:', e.message));
         "
      2. Assert: Output contains "ID: cus_" (Stripe customer ID format)
    Expected Result: Customer created in Stripe test mode
    Evidence: Customer ID output

  Scenario: Verify webhook signature
    Tool: Bash (Node REPL)
    Steps:
      1. Generate test signature using stripe CLI or manual HMAC
      2. Call verifyWebhookSignature(payload, signature)
      3. Assert: Returns true for valid signature
      4. Call with invalid signature
      5. Assert: Returns false or throws
    Expected Result: Signature verification works correctly
    Evidence: Function return values

  Scenario: TypeScript types compile
    Tool: Bash
    Steps:
      1. cd apps/api && npx tsc --noEmit
      2. Assert: No type errors in stripe.service.ts
    Expected Result: Service is properly typed
    Evidence: tsc output
  ```

  **Commit**: YES
  - Message: `feat(api): add Stripe service with customer and subscription methods`
  - Files: `apps/api/src/services/stripe.service.ts`, `apps/api/src/types/payment.ts`

---

- [ ] P3. GoCardless Service Foundation

  **What to do**:
  - Create apps/api/src/services/gocardless.service.ts
  - Implement: createCustomer, getCustomer
  - Implement: createMandate (SEPA Direct Debit), getMandateStatus
  - Implement: createPayment, listPayments
  - Implement: createSubscription (recurring payments)
  - Implement: verifyWebhookSignature
  - Add SEPA country routing logic (determine if customer should use GoCardless)

  **Must NOT do**:
  - Don't process webhooks in this service
  - Don't hardcode country lists (use config)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Payment service with SEPA-specific logic
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (after P1)
  - **Parallel Group**: Wave 1 continued (with P2, P4)
  - **Blocks**: Tasks 16, 17
  - **Blocked By**: P1

  **References**:
  - GoCardless SDK: https://developer.gocardless.com/api-reference/
  - GoCardless Node.js SDK: https://github.com/gocardless/gocardless-nodejs
  - SEPA countries list: https://www.europeanpaymentscouncil.eu/what-we-do/sepa-payment-scheme-management/sepa-scheme-countries
  - `apps/api/src/config/payment.ts` - Config pattern (from P1)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Create GoCardless customer
    Tool: Bash (Node REPL)
    Preconditions: GOCARDLESS_ACCESS_TOKEN set to sandbox token
    Steps:
      1. node -e "
         const { createGocardlessCustomer } = require('./dist/services/gocardless.service.js');
         createGocardlessCustomer({ email: 'test@example.com', country: 'ES' })
           .then(c => console.log('ID:', c.id))
           .catch(e => console.error('ERROR:', e.message));
         "
      2. Assert: Output contains customer ID
    Expected Result: Customer created in GoCardless sandbox
    Evidence: Customer ID output

  Scenario: SEPA routing logic
    Tool: Bash (Node REPL)
    Steps:
      1. node -e "
         const { shouldUseGocardless } = require('./dist/services/gocardless.service.js');
         console.log('ES:', shouldUseGocardless('ES'));
         console.log('DE:', shouldUseGocardless('DE'));
         console.log('US:', shouldUseGocardless('US'));
         console.log('JP:', shouldUseGocardless('JP'));
         "
      2. Assert: ES=true, DE=true, US=false, JP=false
    Expected Result: SEPA countries route to GoCardless
    Evidence: Function outputs
  ```

  **Commit**: YES
  - Message: `feat(api): add GoCardless service with SEPA mandate and payment methods`
  - Files: `apps/api/src/services/gocardless.service.ts`, `apps/api/src/config/payment.ts`

---

- [ ] P4. Payment Queue + Webhook Route Skeleton

  **What to do**:
  - Add paymentQueue to lib/queue.ts (if not done in P1)
  - Create apps/api/src/routes/webhooks/stripe.ts
  - Create apps/api/src/routes/webhooks/gocardless.ts
  - Register webhook routes BEFORE express.json() in index.ts
  - Use express.raw({ type: 'application/json' }) for webhooks
  - Implement signature verification in route handlers
  - Queue events for async processing (don't process inline)

  **Must NOT do**:
  - Don't register webhooks AFTER express.json() (signatures will fail)
  - Don't process webhook logic inline (use queue)
  - Don't return non-200 for duplicate events (idempotency)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Critical middleware ordering and webhook security
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES (after P1)
  - **Parallel Group**: Wave 1 continued (with P2, P3)
  - **Blocks**: Task 17 (webhook handling logic)
  - **Blocked By**: P1

  **References**:
  - `apps/api/src/index.ts:55-65` - Better Auth raw body pattern (BEFORE express.json)
  - `apps/api/src/lib/queue.ts` - Queue configuration
  - Stripe webhooks: https://stripe.com/docs/webhooks/signatures
  - GoCardless webhooks: https://developer.gocardless.com/api-reference/#webhooks-overview

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Webhook routes registered before express.json
    Tool: Bash (grep)
    Steps:
      1. grep -n "webhooks" apps/api/src/index.ts
      2. grep -n "express.json" apps/api/src/index.ts
      3. Assert: Webhook registration line number < express.json line number
    Expected Result: Webhooks registered before body parsing
    Evidence: Line numbers comparison

  Scenario: Stripe webhook accepts valid signature
    Tool: Bash (curl)
    Steps:
      1. Generate valid test signature using:
         stripe trigger payment_intent.succeeded --api-key sk_test_xxx
         OR manually compute HMAC-SHA256
      2. curl -X POST http://localhost:3000/api/webhooks/stripe \
           -H "Content-Type: application/json" \
           -H "Stripe-Signature: <computed_signature>" \
           -d '{"type":"test","data":{}}'
      3. Assert: HTTP 200 returned
    Expected Result: Valid signature accepted
    Evidence: curl response

  Scenario: Webhook rejects invalid signature
    Tool: Bash (curl)
    Steps:
      1. curl -X POST http://localhost:3000/api/webhooks/stripe \
           -H "Content-Type: application/json" \
           -H "Stripe-Signature: invalid_signature" \
           -d '{"type":"test","data":{}}'
      2. Assert: HTTP 401 or 400 returned
    Expected Result: Invalid signature rejected
    Evidence: curl response status

  Scenario: Webhook queues event for processing
    Tool: Bash
    Steps:
      1. Send valid webhook event
      2. Check Redis: redis-cli LLEN bull:payment:wait
      3. Assert: Queue length increased by 1
    Expected Result: Event queued, not processed inline
    Evidence: Redis queue length
  ```

  **Commit**: YES
  - Message: `feat(api): add webhook routes for Stripe and GoCardless with signature verification`
  - Files: `apps/api/src/routes/webhooks/stripe.ts`, `apps/api/src/routes/webhooks/gocardless.ts`, `apps/api/src/index.ts`

---

### WAVE 2 - Core Features (After Wave 1)

---

- [ ] 6. User Impersonation

  **What to do**:
  - Create API endpoint: POST /api/admin/users/:id/impersonate
  - Generate temporary impersonation token (15-minute expiry)
  - Store original admin session for "return to admin" functionality
  - Create frontend button on UsersPage user cards
  - Add "Impersonating [user]" banner to layout
  - Add "Return to Admin" button in banner
  - Log all impersonation events to audit log with reason field

  **Must NOT do**:
  - Don't impersonate other admins
  - Don't allow impersonation without reason
  - Don't extend impersonation beyond 15 minutes automatically

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Security-sensitive feature with session management
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 12, 16, 17, 20)
  - **Blocks**: Task 8 (session management extends this)
  - **Blocked By**: Task 11 (needs session understanding)

  **References**:
  - Better Auth impersonation: https://www.better-auth.com/docs/plugins/impersonation
  - `apps/api/src/middleware/requireAdmin.ts` - Admin middleware
  - `apps/api/src/services/adminAudit.service.ts` - Audit logging
  - `apps/web/src/pages/admin/UsersPage.tsx` - User card actions

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Impersonate user successfully
    Tool: Playwright
    Preconditions: Admin logged in, non-admin user exists
    Steps:
      1. Navigate to: http://localhost:5173/admin/users
      2. Find: User card for non-admin user
      3. Click: "Impersonate" button
      4. Fill: Reason field with "Testing user flow"
      5. Click: Confirm
      6. Assert: Banner appears "Impersonating [username]"
      7. Assert: User sees non-admin dashboard
      8. Assert: URL redirected to user's default page
      9. Screenshot: .sisyphus/evidence/task-6-impersonating.png
    Expected Result: Admin now viewing as impersonated user
    Evidence: .sisyphus/evidence/task-6-impersonating.png

  Scenario: Return to admin from impersonation
    Tool: Playwright
    Preconditions: Currently impersonating a user
    Steps:
      1. Click: "Return to Admin" button in banner
      2. Assert: Banner disappears
      3. Assert: Admin dashboard visible
      4. Navigate to: /admin/users
      5. Assert: Admin features accessible
    Expected Result: Successfully returned to admin session
    Evidence: Admin page access

  Scenario: Cannot impersonate other admins
    Tool: Playwright
    Steps:
      1. Navigate to: /admin/users
      2. Find: User card for another admin
      3. Assert: "Impersonate" button disabled or hidden
    Expected Result: Admin impersonation blocked
    Evidence: Button state

  Scenario: Impersonation logged to audit
    Tool: Bash (curl)
    Steps:
      1. Perform impersonation via API
      2. GET /api/admin/audit?action=user.impersonate
      3. Assert: Entry exists with adminId, targetUserId, reason
    Expected Result: Audit trail maintained
    Evidence: Audit log entry
  ```

  **Commit**: YES
  - Message: `feat(admin): add user impersonation with audit logging`
  - Files: `apps/api/src/routes/admin/users.ts`, `apps/web/src/pages/admin/UsersPage.tsx`, `apps/web/src/components/ImpersonationBanner.tsx`

---

- [ ] 7. Email Actions

  **What to do**:
  - Create API endpoint: POST /api/admin/users/:id/send-password-reset
  - Create API endpoint: POST /api/admin/users/:id/resend-verification
  - Queue emails via existing emailQueue (don't send synchronously)
  - Add action buttons to UsersPage user dropdown menu
  - Show toast confirmation when email queued
  - Log email actions to audit log

  **Must NOT do**:
  - Don't send emails synchronously (use queue)
  - Don't allow spam (rate limit to 1 email per type per 15 minutes)
  - Don't expose email templates to frontend

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple API endpoints using existing email infrastructure
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 12, 16, 17, 20)
  - **Blocks**: None
  - **Blocked By**: None (uses existing emailQueue)

  **References**:
  - `apps/api/src/lib/queue.ts` - emailQueue configuration
  - Better Auth password reset: https://www.better-auth.com/docs/concepts/password-reset
  - Better Auth email verification: https://www.better-auth.com/docs/concepts/email-verification
  - `apps/api/src/routes/admin/users.ts` - User admin routes

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Send password reset email
    Tool: Playwright
    Preconditions: User exists with verified email
    Steps:
      1. Navigate to: /admin/users
      2. Find: User card, click dropdown menu
      3. Click: "Send Password Reset"
      4. Assert: Confirmation modal appears
      5. Click: Confirm
      6. Assert: Success toast "Password reset email queued"
    Expected Result: Email action triggered
    Evidence: Toast message

  Scenario: Email queued in BullMQ
    Tool: Bash (curl + Redis)
    Steps:
      1. POST /api/admin/users/:id/send-password-reset
      2. Assert: HTTP 200 with { queued: true }
      3. redis-cli LRANGE bull:email:wait 0 -1
      4. Assert: Job exists with type=password_reset
    Expected Result: Email job in queue
    Evidence: Redis queue contents

  Scenario: Rate limiting prevents spam
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/users/:id/send-password-reset
      2. Assert: HTTP 200
      3. POST /api/admin/users/:id/send-password-reset (immediately)
      4. Assert: HTTP 429 "Rate limit exceeded. Try again in X minutes"
    Expected Result: Spam prevention works
    Evidence: Rate limit response
  ```

  **Commit**: YES
  - Message: `feat(admin): add email actions for password reset and verification resend`
  - Files: `apps/api/src/routes/admin/users.ts`, `apps/web/src/pages/admin/UsersPage.tsx`

---

- [ ] 12. Feature Flags Database + API

  **What to do**:
  - Create migration: feature_flags table (id, key, name, description, enabled, percentage, rules JSON, created_at, updated_at)
  - Create migration: feature_flag_overrides table (flag_id, entity_type, entity_id, enabled)
  - Create service: apps/api/src/services/featureFlags.service.ts
  - Implement: getFlag, getAllFlags, setFlag, checkFlag (with rules evaluation)
  - Create CRUD routes: /api/admin/feature-flags
  - Support percentage rollouts (e.g., 10% of users)
  - Support entity overrides (enable for specific tenant)

  **Must NOT do**:
  - Don't use hardcoded flags
  - Don't skip audit logging for flag changes
  - Don't evaluate rules on every request (cache with TTL)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Database design + rule evaluation logic
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 16, 17, 20)
  - **Blocks**: Task 13 (FeatureFlagsPage UI)
  - **Blocked By**: None

  **References**:
  - `apps/api/src/db/schema.ts` - Schema patterns
  - `apps/api/src/services/subscription.service.ts` - Service pattern
  - Feature flag best practices: https://docs.launchdarkly.com/guides/best-practices
  - `apps/api/drizzle/` - Migration directory

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Create feature flag via API
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/feature-flags
         Body: { "key": "new_dashboard", "name": "New Dashboard", "enabled": false }
      2. Assert: HTTP 201 with flag ID
      3. GET /api/admin/feature-flags/new_dashboard
      4. Assert: Flag returned with correct values
    Expected Result: Flag created and retrievable
    Evidence: API responses

  Scenario: Percentage rollout works
    Tool: Bash (Node REPL)
    Steps:
      1. Create flag with percentage=50
      2. Run 100 times: checkFlag('flag_key', userId)
      3. Count true results
      4. Assert: Between 40-60 results are true (statistical tolerance)
    Expected Result: ~50% rollout achieved
    Evidence: Distribution counts

  Scenario: Entity override takes precedence
    Tool: Bash (curl)
    Steps:
      1. Create flag with enabled=false
      2. Create override for tenant_123 with enabled=true
      3. checkFlag('key', { entityType: 'tenant', entityId: 'tenant_123' })
      4. Assert: Returns true (override applies)
      5. checkFlag('key', { entityType: 'tenant', entityId: 'tenant_other' })
      6. Assert: Returns false (no override, uses default)
    Expected Result: Overrides work correctly
    Evidence: Flag evaluation results

  Scenario: Migration runs successfully
    Tool: Bash
    Steps:
      1. npx drizzle-kit generate
      2. npx drizzle-kit migrate
      3. Query: SELECT * FROM feature_flags LIMIT 1
      4. Assert: No errors, table exists
    Expected Result: Tables created
    Evidence: SQL query success
  ```

  **Commit**: YES
  - Message: `feat(api): add feature flags system with percentage rollouts and entity overrides`
  - Files: `apps/api/src/db/schema.ts`, `apps/api/drizzle/*.sql`, `apps/api/src/services/featureFlags.service.ts`, `apps/api/src/routes/admin/feature-flags.ts`

---

- [ ] 16. Subscription Billing (Stripe + GoCardless)

  **What to do**:
  - Create billing.service.ts that orchestrates Stripe + GoCardless
  - Implement smart routing: shouldUseGocardless(countryCode) → route to correct processor
  - Implement: createSubscription(orgId, planId, paymentMethod)
  - Implement: upgradeSubscription, downgradeSubscription
  - Implement: cancelSubscription with proration handling
  - Update subscription_details record with processor IDs
  - Create billing routes: /api/billing/subscribe, /upgrade, /cancel

  **Must NOT do**:
  - Don't bypass smart routing
  - Don't allow direct processor calls from routes (use billing.service)
  - Don't store card details in database

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Core billing orchestration with multiple processors
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 12, 17, 20)
  - **Blocks**: Tasks 18, 19, 21, 22, 23
  - **Blocked By**: P2, P3

  **References**:
  - `apps/api/src/services/stripe.service.ts` - Stripe service (from P2)
  - `apps/api/src/services/gocardless.service.ts` - GoCardless service (from P3)
  - `apps/api/src/db/schema.ts:subscription_details` - Storage schema
  - `apps/api/src/db/schema.ts:subscription_plans` - Plan definitions
  - Stripe subscriptions: https://stripe.com/docs/billing/subscriptions/overview
  - GoCardless subscriptions: https://developer.gocardless.com/api-reference/#subscriptions-create-a-subscription

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Create subscription with Stripe (non-SEPA country)
    Tool: Bash (curl)
    Preconditions: Stripe test mode, org exists, plan exists
    Steps:
      1. POST /api/billing/subscribe
         Body: { "organizationId": "org_123", "planId": "pro_monthly", "country": "US", "paymentMethodId": "pm_card_visa" }
      2. Assert: HTTP 200 with { processor: "stripe", subscriptionId: "sub_xxx" }
      3. Query: SELECT stripe_customer_id FROM subscription_details WHERE organization_id = 'org_123'
      4. Assert: stripe_customer_id is set
    Expected Result: Stripe subscription created
    Evidence: API response and DB state

  Scenario: Create subscription with GoCardless (SEPA country)
    Tool: Bash (curl)
    Preconditions: GoCardless sandbox, org exists, mandate exists
    Steps:
      1. POST /api/billing/subscribe
         Body: { "organizationId": "org_456", "planId": "pro_monthly", "country": "ES" }
      2. Assert: HTTP 200 with { processor: "gocardless", subscriptionId: "SB_xxx" }
      3. Query: SELECT gocardless_customer_id, gocardless_mandate_id FROM subscription_details
      4. Assert: GoCardless IDs are set
    Expected Result: GoCardless subscription created
    Evidence: API response and DB state

  Scenario: Upgrade subscription with proration
    Tool: Bash (curl)
    Steps:
      1. Create starter subscription
      2. POST /api/billing/upgrade
         Body: { "organizationId": "org_123", "newPlanId": "enterprise_monthly" }
      3. Assert: HTTP 200 with proration details
      4. Query: SELECT tier FROM subscription_details
      5. Assert: tier = "enterprise"
    Expected Result: Subscription upgraded
    Evidence: DB tier change

  Scenario: Cancel subscription
    Tool: Bash (curl)
    Steps:
      1. POST /api/billing/cancel
         Body: { "organizationId": "org_123", "reason": "Testing" }
      2. Assert: HTTP 200 with { canceledAt: "...", effectiveDate: "..." }
      3. Verify: Stripe/GoCardless subscription status = "canceled"
    Expected Result: Subscription canceled
    Evidence: Processor status
  ```

  **Commit**: YES
  - Message: `feat(api): add unified billing service with Stripe/GoCardless smart routing`
  - Files: `apps/api/src/services/billing.service.ts`, `apps/api/src/routes/billing.ts`

---

- [ ] 17. Webhook Handling (Stripe + GoCardless)

  **What to do**:
  - Create payment queue worker: apps/api/src/workers/payment.worker.ts
  - Handle Stripe events: payment_intent.succeeded, payment_intent.failed, invoice.paid, invoice.payment_failed, customer.subscription.updated/deleted
  - Handle GoCardless events: payments.confirmed, payments.failed, mandates.cancelled, subscriptions.cancelled
  - Update subscription_details based on events
  - Send notification emails on payment failure
  - Implement idempotency (store processed event IDs)

  **Must NOT do**:
  - Don't process duplicate events (check idempotency)
  - Don't block on email sending (use emailQueue)
  - Don't skip logging failed events

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Event-driven architecture with idempotency
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 12, 16, 20)
  - **Blocks**: Task 23 (dunning depends on webhook events)
  - **Blocked By**: P4 (webhook routes)

  **References**:
  - `apps/api/src/routes/webhooks/stripe.ts` - Webhook route (from P4)
  - `apps/api/src/lib/queue.ts` - Queue patterns
  - Stripe webhook events: https://stripe.com/docs/api/events/types
  - GoCardless webhook events: https://developer.gocardless.com/api-reference/#events-event-actions

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Process Stripe payment_intent.succeeded
    Tool: Bash
    Steps:
      1. Add job to paymentQueue with Stripe payment_intent.succeeded event
      2. Wait for worker to process (poll queue)
      3. Query: SELECT last_payment_at FROM subscription_details
      4. Assert: Timestamp updated
    Expected Result: Payment recorded in database
    Evidence: DB update

  Scenario: Process payment_intent.failed triggers email
    Tool: Bash
    Steps:
      1. Add job with payment_intent.failed event
      2. Wait for processing
      3. Check emailQueue for payment_failed email job
      4. Assert: Email job exists with correct template
    Expected Result: Failure notification queued
    Evidence: Email queue job

  Scenario: Idempotency prevents duplicate processing
    Tool: Bash
    Steps:
      1. Process event with id=evt_123
      2. Process same event again (id=evt_123)
      3. Check logs or DB updates
      4. Assert: Second processing skipped (no duplicate update)
    Expected Result: Duplicate events ignored
    Evidence: Single DB update

  Scenario: GoCardless mandate cancellation updates subscription
    Tool: Bash
    Steps:
      1. Process mandates.cancelled event for org
      2. Query: SELECT status FROM subscription_details WHERE organization_id = 'org_xxx'
      3. Assert: status = 'payment_method_invalid' or similar
    Expected Result: Subscription status reflects mandate loss
    Evidence: DB status
  ```

  **Commit**: YES
  - Message: `feat(api): add webhook event processing worker for Stripe and GoCardless`
  - Files: `apps/api/src/workers/payment.worker.ts`, `apps/api/src/db/schema.ts` (add processed_webhook_events table)

---

- [ ] 20. Trial Period Handling

  **What to do**:
  - Set trial_ends_at = NOW + 14 days on new org creation
  - Create scheduled job: check-trial-expiry (runs daily)
  - 3 days before expiry: Send reminder email
  - On expiry: Downgrade to free tier OR prompt for payment
  - Create trial extension API for admin: POST /api/admin/organizations/:id/extend-trial
  - Track trial-to-paid conversion metrics

  **Must NOT do**:
  - Don't extend trial without audit logging
  - Don't block app access during grace period (2-day grace after expiry)
  - Don't send reminder if user already has payment method

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Scheduled job logic with state management
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 12, 16, 17)
  - **Blocks**: Task 21 (usage billing)
  - **Blocked By**: Task 16 (billing service)

  **References**:
  - `apps/api/src/db/schema.ts:subscription_details` - trial_ends_at field
  - `apps/api/src/lib/queue.ts` - BullMQ scheduler patterns
  - BullMQ repeatable jobs: https://docs.bullmq.io/guide/jobs/repeatable

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: New org gets 14-day trial
    Tool: Bash (curl)
    Steps:
      1. Create new organization via API
      2. Query: SELECT trial_ends_at FROM subscription_details WHERE organization_id = 'new_org'
      3. Calculate: expected_date = NOW + 14 days
      4. Assert: trial_ends_at within 1 minute of expected_date
    Expected Result: Trial automatically set
    Evidence: DB timestamp

  Scenario: Trial reminder sent 3 days before expiry
    Tool: Bash
    Steps:
      1. Set org trial_ends_at to NOW + 3 days
      2. Run check-trial-expiry job manually
      3. Check emailQueue for trial_reminder job
      4. Assert: Email job exists for org owner
    Expected Result: Reminder email queued
    Evidence: Email queue job

  Scenario: Admin extends trial
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/organizations/org_123/extend-trial
         Body: { "days": 7, "reason": "Customer request" }
      2. Assert: HTTP 200
      3. Query: SELECT trial_ends_at FROM subscription_details
      4. Assert: trial_ends_at extended by 7 days
      5. Check audit log for trial.extend action
    Expected Result: Trial extended with audit
    Evidence: DB and audit log

  Scenario: Expired trial downgrades to free
    Tool: Bash
    Steps:
      1. Set trial_ends_at to yesterday, no payment method
      2. Run check-trial-expiry job
      3. Query: SELECT tier FROM subscription_details
      4. Assert: tier = 'free'
    Expected Result: Automatic downgrade
    Evidence: DB tier change
  ```

  **Commit**: YES
  - Message: `feat(api): add trial period handling with expiry reminders and automatic conversion`
  - Files: `apps/api/src/workers/trial.worker.ts`, `apps/api/src/routes/admin/organizations.ts`

---

### WAVE 3 - Intermediate Features (After Wave 2)

---

- [ ] 8. Session Management (Force Logout)

  **What to do**:
  - Create API endpoint: DELETE /api/admin/sessions/:sessionId (terminate single session)
  - Create API endpoint: DELETE /api/admin/users/:userId/sessions (terminate all user sessions)
  - Implement session invalidation in Better Auth
  - Add "Force Logout" button to SessionsPage (from Task 11)
  - Add "Logout All Sessions" button to UsersPage user dropdown
  - Log all session terminations to audit log

  **Must NOT do**:
  - Don't terminate admin's own session (unless explicitly requested)
  - Don't expose session tokens during termination

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Session invalidation requires Better Auth integration
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13, 18, 21, 22)
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 11 (impersonation and sessions page)

  **References**:
  - Better Auth session management: https://www.better-auth.com/docs/concepts/session-management
  - `apps/api/src/routes/admin/sessions.ts` - Sessions route (from Task 11)
  - `apps/web/src/pages/admin/SessionsPage.tsx` - Sessions UI (from Task 11)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Force logout single session
    Tool: Playwright
    Preconditions: Other user has active session
    Steps:
      1. Navigate to: /admin/sessions
      2. Find: Session row for other user
      3. Click: "Force Logout" button
      4. Assert: Confirmation modal appears
      5. Click: Confirm
      6. Assert: Success toast "Session terminated"
      7. Assert: Row removed from table
    Expected Result: Session terminated
    Evidence: UI state change

  Scenario: Force logout terminates actual session
    Tool: Playwright (2 browser contexts)
    Steps:
      1. Context A: Admin at /admin/sessions
      2. Context B: User logged in, at dashboard
      3. Context A: Force logout user's session
      4. Context B: Perform any action (e.g., click button)
      5. Context B: Assert redirected to login page
    Expected Result: User's session actually invalidated
    Evidence: Redirect to login

  Scenario: Force logout all user sessions
    Tool: Bash (curl)
    Steps:
      1. DELETE /api/admin/users/user_123/sessions
      2. Assert: HTTP 200 with { terminatedCount: N }
      3. Query: SELECT COUNT(*) FROM sessions WHERE user_id = 'user_123'
      4. Assert: Count = 0
    Expected Result: All user sessions removed
    Evidence: DB state
  ```

  **Commit**: YES
  - Message: `feat(admin): add session termination with force logout capability`
  - Files: `apps/api/src/routes/admin/sessions.ts`, `apps/web/src/pages/admin/SessionsPage.tsx`, `apps/web/src/pages/admin/UsersPage.tsx`

---

- [ ] 13. FeatureFlagsPage (Admin UI)

  **What to do**:
  - Create new admin page: FeatureFlagsPage.tsx
  - Display all feature flags in table (key, name, status, percentage, rules count)
  - Add create/edit modal with: key, name, description, enabled toggle, percentage slider, JSON rules editor
  - Add override management: view/add/remove entity overrides
  - Add "Quick Toggle" for fast enable/disable
  - Register route in AdminLayout.tsx

  **Must NOT do**:
  - Don't allow editing flag key after creation (immutable)
  - Don't validate JSON rules on frontend only (server must validate too)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: New admin page with complex UI (JSON editor, sliders)
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Form components, JSON editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 18, 21, 22)
  - **Blocks**: None
  - **Blocked By**: Task 12 (feature flags API)

  **References**:
  - `apps/web/src/pages/admin/TenantsPage.tsx` - Admin page pattern
  - `apps/api/src/routes/admin/feature-flags.ts` - API (from Task 12)
  - Monaco Editor for JSON: https://microsoft.github.io/monaco-editor/ (or use textarea for simplicity)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: View feature flags list
    Tool: Playwright
    Preconditions: Feature flags exist in database
    Steps:
      1. Navigate to: /admin/feature-flags
      2. Wait for: Table visible (timeout: 5s)
      3. Assert: Table headers (Key, Name, Status, Percentage, Overrides, Actions)
      4. Assert: At least 1 flag row visible
      5. Screenshot: .sisyphus/evidence/task-13-flags-list.png
    Expected Result: Flags displayed correctly
    Evidence: .sisyphus/evidence/task-13-flags-list.png

  Scenario: Create new feature flag
    Tool: Playwright
    Steps:
      1. Click: "Create Flag" button
      2. Fill: key = "dark_mode_v2"
      3. Fill: name = "Dark Mode V2"
      4. Toggle: enabled = true
      5. Set: percentage = 25 (slider)
      6. Click: Save
      7. Assert: Success toast
      8. Assert: New flag appears in table
    Expected Result: Flag created successfully
    Evidence: Table update

  Scenario: Quick toggle flag status
    Tool: Playwright
    Steps:
      1. Find: Flag row with enabled=false
      2. Click: Toggle switch in row
      3. Assert: Toggle switches to enabled
      4. Assert: API called (check network)
      5. Refresh page
      6. Assert: Toggle still enabled
    Expected Result: Quick toggle persists
    Evidence: State after refresh

  Scenario: Add entity override
    Tool: Playwright
    Steps:
      1. Click: Flag row to open details
      2. Click: "Add Override" button
      3. Select: Entity type = "tenant"
      4. Fill: Entity ID = "org_special"
      5. Select: enabled = true
      6. Click: Save override
      7. Assert: Override appears in list
    Expected Result: Override created
    Evidence: Override list update
  ```

  **Commit**: YES
  - Message: `feat(admin): add FeatureFlagsPage with CRUD and override management`
  - Files: `apps/web/src/pages/admin/FeatureFlagsPage.tsx`, `apps/web/src/pages/admin/AdminLayout.tsx`

---

- [ ] 18. Customer Portal

  **What to do**:
  - Create frontend page: /settings/billing (in tenant app, not admin)
  - Show current plan, billing cycle, next invoice date
  - Show payment method summary (last 4 digits, expiry)
  - Integrate Stripe Customer Portal for payment method updates
  - Integrate GoCardless hosted pages for SEPA mandate updates
  - Show invoice history with download links
  - Add upgrade/downgrade CTAs linking to plan selection

  **Must NOT do**:
  - Don't build custom card input (use Stripe Elements or hosted)
  - Don't store full card numbers
  - Don't show portal to users without billing access

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Customer-facing billing UI
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Billing UX patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 13, 21, 22)
  - **Blocks**: Task 14 (admin billing UI)
  - **Blocked By**: Task 16 (billing service)

  **References**:
  - Stripe Customer Portal: https://stripe.com/docs/billing/subscriptions/integrating-customer-portal
  - GoCardless hosted pages: https://developer.gocardless.com/getting-started/partners/hosted-payment-pages/
  - `apps/web/src/pages/settings/` - Settings page patterns
  - `apps/api/src/services/billing.service.ts` - Billing service (from Task 16)

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: View billing overview
    Tool: Playwright
    Preconditions: User logged in, org has active subscription
    Steps:
      1. Navigate to: /settings/billing
      2. Wait for: Billing page loads
      3. Assert: Current plan name displayed
      4. Assert: Next invoice date shown
      5. Assert: Payment method (last 4 digits) shown
      6. Screenshot: .sisyphus/evidence/task-18-billing-overview.png
    Expected Result: Billing information displayed
    Evidence: .sisyphus/evidence/task-18-billing-overview.png

  Scenario: Access Stripe Customer Portal
    Tool: Playwright
    Preconditions: Org uses Stripe
    Steps:
      1. Navigate to: /settings/billing
      2. Click: "Manage Payment Method" button
      3. Assert: Redirect to Stripe hosted portal OR modal opens
      4. Assert: URL contains stripe.com or Stripe Elements visible
    Expected Result: Stripe portal accessible
    Evidence: Portal redirect/display

  Scenario: View invoice history
    Tool: Playwright
    Steps:
      1. Navigate to: /settings/billing
      2. Scroll to: Invoice history section
      3. Assert: List of invoices with dates and amounts
      4. Click: "Download" on most recent invoice
      5. Assert: PDF download initiated
    Expected Result: Invoices viewable and downloadable
    Evidence: Download trigger

  Scenario: Upgrade CTA visible
    Tool: Playwright
    Preconditions: Org on starter plan
    Steps:
      1. Navigate to: /settings/billing
      2. Assert: "Upgrade" button visible
      3. Click: Upgrade button
      4. Assert: Navigated to plan selection page
    Expected Result: Upgrade flow accessible
    Evidence: Navigation
  ```

  **Commit**: YES
  - Message: `feat(web): add customer billing portal with plan overview and payment management`
  - Files: `apps/web/src/pages/settings/BillingPage.tsx`, `apps/api/src/routes/billing.ts`

---

- [ ] 21. Usage-Based Billing

  **What to do**:
  - Track employee count changes via existing incrementEmployeeCount/decrementEmployeeCount
  - Calculate prorated charges when employee count changes mid-cycle
  - Create metered billing records: POST /api/billing/report-usage
  - Integrate with Stripe metered billing OR GoCardless variable amounts
  - Send usage summary before each billing cycle
  - Add employee usage chart to admin subscription page

  **Must NOT do**:
  - Don't charge for employee additions retroactively beyond current cycle
  - Don't allow exceeding plan employee limit without upgrade prompt

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex billing calculations with proration
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 13, 18, 22)
  - **Blocks**: Task 22 (invoice generation)
  - **Blocked By**: Task 20 (trial handling establishes baseline)

  **References**:
  - `apps/api/src/services/subscription.service.ts` - Employee count methods
  - Stripe metered billing: https://stripe.com/docs/billing/subscriptions/usage-based
  - `apps/api/src/db/schema.ts:subscription_details` - current_employee_count field

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Employee count increase triggers usage report
    Tool: Bash
    Steps:
      1. Record initial employee_count for org
      2. Call incrementEmployeeCount (simulate member invite)
      3. Assert: Usage record created in billing system
      4. Check Stripe: stripe usage records list --subscription sub_xxx
      5. Assert: Usage record with quantity +1
    Expected Result: Usage tracked automatically
    Evidence: Stripe usage record

  Scenario: Proration calculated correctly
    Tool: Bash (Node REPL)
    Steps:
      1. Set org to mid-billing-cycle (15 days remaining of 30)
      2. Calculate expected proration: (price_per_employee * 1) * (15/30)
      3. Call calculateProration(orgId, 1)
      4. Assert: Result matches expected (within $0.01)
    Expected Result: Accurate proration
    Evidence: Calculation result

  Scenario: Employee limit enforced
    Tool: Bash (curl)
    Steps:
      1. Set org to plan with employee_limit=5
      2. Set current_employee_count=5
      3. POST /api/v1/org/slug/members (invite 6th member)
      4. Assert: HTTP 402 or 403 with "Employee limit reached"
      5. Assert: Upgrade prompt in response
    Expected Result: Limit enforced with upgrade path
    Evidence: API response
  ```

  **Commit**: YES
  - Message: `feat(api): add usage-based billing with employee count tracking and proration`
  - Files: `apps/api/src/services/billing.service.ts`, `apps/api/src/services/subscription.service.ts`

---

- [ ] 22. Invoice Generation

  **What to do**:
  - Create invoice generation service: generateInvoice(orgId, periodStart, periodEnd)
  - Calculate line items: base plan + usage charges
  - Apply any credits or adjustments
  - Generate PDF invoice (use existing pdfQueue)
  - Store invoice records in database (invoices table migration)
  - Email invoice to billing contact
  - Create admin endpoint to list/view invoices: GET /api/admin/invoices

  **Must NOT do**:
  - Don't generate duplicate invoices for same period
  - Don't send invoice email if PDF generation fails

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Invoice calculations and PDF generation
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 13, 18, 21)
  - **Blocks**: None
  - **Blocked By**: Task 21 (usage billing for line items)

  **References**:
  - `apps/api/src/lib/queue.ts` - pdfQueue for PDF generation
  - Stripe invoices: https://stripe.com/docs/invoicing
  - `apps/api/src/services/billing.service.ts` - Billing service

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Generate monthly invoice
    Tool: Bash
    Steps:
      1. Call generateInvoice(orgId, '2025-01-01', '2025-01-31')
      2. Assert: Invoice record created in database
      3. Assert: Line items include base plan price
      4. Assert: Line items include usage charges (if any)
      5. Assert: Total = sum of line items
    Expected Result: Invoice generated correctly
    Evidence: Invoice record

  Scenario: PDF generated and stored
    Tool: Bash
    Steps:
      1. Generate invoice
      2. Wait for pdfQueue job to complete
      3. Assert: invoice.pdf_url is set
      4. curl invoice.pdf_url
      5. Assert: Valid PDF file downloaded
    Expected Result: PDF accessible
    Evidence: PDF download

  Scenario: Invoice email sent
    Tool: Bash
    Steps:
      1. Generate invoice
      2. Wait for processing
      3. Check emailQueue for invoice_generated job
      4. Assert: Email job contains PDF attachment reference
    Expected Result: Email queued
    Evidence: Email queue job

  Scenario: No duplicate invoices
    Tool: Bash
    Steps:
      1. Generate invoice for Jan 2025
      2. Generate invoice for Jan 2025 again
      3. Assert: Second call returns existing invoice (not new)
      4. Query: SELECT COUNT(*) FROM invoices WHERE org_id AND period_start='2025-01-01'
      5. Assert: Count = 1
    Expected Result: Duplicates prevented
    Evidence: Single invoice record
  ```

  **Commit**: YES
  - Message: `feat(api): add invoice generation with PDF and email delivery`
  - Files: `apps/api/src/services/invoice.service.ts`, `apps/api/src/db/schema.ts`, `apps/api/drizzle/*.sql`, `apps/api/src/routes/admin/invoices.ts`

---

### WAVE 4 - Advanced Features (After Wave 3)

---

- [ ] 14. Billing Operations UI (Admin)

  **What to do**:
  - Create admin page section: BillingOperationsPage.tsx or add to SubscriptionsPage
  - Display subscription details for selected tenant
  - Add "Create Manual Invoice" form
  - Add "Issue Refund" button with amount and reason
  - Add "Apply Credit" form for account credits
  - Show payment history (charges, refunds, credits)
  - Link to Stripe/GoCardless dashboard for each transaction

  **Must NOT do**:
  - Don't process refunds without confirmation
  - Don't allow credits exceeding original payment
  - Don't expose full card numbers

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Admin financial operations UI
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Financial UI patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 19, 23)
  - **Blocks**: None
  - **Blocked By**: Tasks 16, 18, 19

  **References**:
  - `apps/web/src/pages/admin/SubscriptionsPage.tsx` - Current subscriptions view
  - `apps/api/src/routes/admin/billing.ts` - Admin billing routes (from Task 19)
  - `apps/api/src/services/billing.service.ts` - Billing operations

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: View tenant billing details
    Tool: Playwright
    Preconditions: Admin logged in, tenant has active subscription
    Steps:
      1. Navigate to: /admin/subscriptions
      2. Click: Tenant row to expand details
      3. Assert: Subscription info visible (plan, status, next billing)
      4. Assert: Payment method info visible (processor, last 4)
      5. Assert: Payment history table visible
      6. Screenshot: .sisyphus/evidence/task-14-billing-details.png
    Expected Result: Complete billing view
    Evidence: .sisyphus/evidence/task-14-billing-details.png

  Scenario: Issue refund
    Tool: Playwright
    Steps:
      1. Navigate to tenant billing details
      2. Find: Recent charge in payment history
      3. Click: "Refund" button
      4. Fill: Amount = 50.00
      5. Fill: Reason = "Service credit"
      6. Click: Confirm refund
      7. Assert: Confirmation modal with amount
      8. Click: Confirm
      9. Assert: Success toast "Refund of €50.00 issued"
      10. Assert: Refund appears in payment history
    Expected Result: Refund processed
    Evidence: History update

  Scenario: Apply account credit
    Tool: Playwright
    Steps:
      1. Click: "Apply Credit" button
      2. Fill: Amount = 25.00
      3. Fill: Reason = "Referral bonus"
      4. Click: Apply
      5. Assert: Credit balance updated
      6. Assert: Credit appears in history
    Expected Result: Credit applied
    Evidence: Balance update
  ```

  **Commit**: YES
  - Message: `feat(admin): add billing operations UI for refunds, credits, and manual invoices`
  - Files: `apps/web/src/pages/admin/SubscriptionsPage.tsx` or `apps/web/src/pages/admin/BillingOperationsPage.tsx`

---

- [ ] 15. Notification Center

  **What to do**:
  - Create admin page: NotificationCenterPage.tsx
  - Create broadcast message form: title, body, target (all users, specific tier, specific tenant)
  - Create scheduled message feature (send at specific time)
  - Use existing notificationQueue for delivery
  - Create notification templates for common messages
  - Show message history and delivery status
  - Create API: POST /api/admin/notifications/broadcast

  **Must NOT do**:
  - Don't send without preview/confirmation
  - Don't allow targeting single user (use email actions for that)
  - Don't spam (rate limit broadcasts)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: New admin page with form builder
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Message composition UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 19, 23)
  - **Blocks**: None
  - **Blocked By**: None (uses existing notification queue)

  **References**:
  - `apps/api/src/lib/queue.ts` - notificationQueue
  - `apps/web/src/pages/admin/TenantsPage.tsx` - Admin page pattern
  - Push notification patterns: https://web.dev/notifications/

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Create broadcast message
    Tool: Playwright
    Steps:
      1. Navigate to: /admin/notifications
      2. Click: "New Broadcast"
      3. Fill: Title = "System Maintenance"
      4. Fill: Body = "Scheduled maintenance on Sunday..."
      5. Select: Target = "All Users"
      6. Click: Preview
      7. Assert: Preview shows formatted message
      8. Click: Send Now
      9. Assert: Confirmation modal
      10. Click: Confirm
      11. Assert: Success toast
      12. Assert: Message appears in history
      13. Screenshot: .sisyphus/evidence/task-15-broadcast.png
    Expected Result: Broadcast sent
    Evidence: .sisyphus/evidence/task-15-broadcast.png

  Scenario: Schedule message for future
    Tool: Playwright
    Steps:
      1. Create broadcast message
      2. Select: "Schedule for later"
      3. Set: Date/time = tomorrow 9:00 AM
      4. Click: Schedule
      5. Assert: Message appears in history with "Scheduled" status
      6. Assert: Scheduled time displayed
    Expected Result: Message scheduled
    Evidence: History status

  Scenario: Target specific tier
    Tool: Playwright
    Steps:
      1. Create broadcast
      2. Select: Target = "Professional tier only"
      3. Send message
      4. Check notification queue
      5. Assert: Only users from professional tier orgs in queue
    Expected Result: Targeting works
    Evidence: Queue contents

  Scenario: Rate limiting prevents spam
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/notifications/broadcast (message 1)
      2. POST /api/admin/notifications/broadcast (message 2, immediately)
      3. Assert: Second request returns 429
    Expected Result: Rate limit enforced
    Evidence: HTTP status
  ```

  **Commit**: YES
  - Message: `feat(admin): add notification center for broadcast messages`
  - Files: `apps/web/src/pages/admin/NotificationCenterPage.tsx`, `apps/api/src/routes/admin/notifications.ts`, `apps/web/src/pages/admin/AdminLayout.tsx`

---

- [ ] 19. Admin Manual Billing Operations

  **What to do**:
  - Create API: POST /api/admin/billing/create-invoice (manual invoice)
  - Create API: POST /api/admin/billing/refund (process refund)
  - Create API: POST /api/admin/billing/credit (apply credit)
  - Create API: POST /api/admin/billing/charge (one-time charge)
  - All operations must log to admin_audit_log with before/after state
  - Support both Stripe and GoCardless operations
  - Add reason field requirement for all manual operations

  **Must NOT do**:
  - Don't process without reason field
  - Don't allow negative credits
  - Don't bypass audit logging

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Financial operations API with dual processor support
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 15, 23)
  - **Blocks**: Task 14 (billing UI uses these APIs)
  - **Blocked By**: Task 16 (billing service)

  **References**:
  - `apps/api/src/services/billing.service.ts` - Billing service
  - `apps/api/src/services/stripe.service.ts` - Stripe operations
  - `apps/api/src/services/gocardless.service.ts` - GoCardless operations
  - `apps/api/src/services/adminAudit.service.ts` - Audit logging

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Create manual invoice
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/billing/create-invoice
         Body: { "organizationId": "org_123", "amount": 10000, "description": "Consulting fee", "reason": "Custom work" }
      2. Assert: HTTP 201 with invoice details
      3. Assert: Invoice created in processor (Stripe/GoCardless)
      4. Check audit log for billing.invoice.create
    Expected Result: Invoice created with audit
    Evidence: API response and audit

  Scenario: Process refund
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/billing/refund
         Body: { "chargeId": "ch_xxx", "amount": 5000, "reason": "Partial refund for downtime" }
      2. Assert: HTTP 200 with refund details
      3. Verify in processor: refund exists
      4. Check audit log for billing.refund
    Expected Result: Refund processed
    Evidence: Processor state

  Scenario: Reason required
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/billing/credit without reason field
      2. Assert: HTTP 400 "Reason is required"
    Expected Result: Validation enforced
    Evidence: Error response

  Scenario: Audit log captures before/after
    Tool: Bash
    Steps:
      1. Apply credit to org
      2. GET /api/admin/audit?action=billing.credit
      3. Assert: Entry contains before_state (old credit balance)
      4. Assert: Entry contains after_state (new credit balance)
    Expected Result: Full audit trail
    Evidence: Audit entry content
  ```

  **Commit**: YES
  - Message: `feat(api): add admin manual billing APIs for invoices, refunds, credits, and charges`
  - Files: `apps/api/src/routes/admin/billing.ts`

---

- [ ] 23. Payment Failed Recovery (Dunning)

  **What to do**:
  - Create dunning service: apps/api/src/services/dunning.service.ts
  - Implement retry schedule: Day 1, Day 3, Day 7 after failure
  - Send email notifications at each stage with increasing urgency
  - Create scheduled job: process-dunning (runs daily)
  - After final retry failure: suspend account (restrict access, don't delete)
  - Create admin endpoint to manually retry: POST /api/admin/billing/retry-payment
  - Create admin endpoint to restore: POST /api/admin/billing/restore-account
  - Track dunning status in subscription_details

  **Must NOT do**:
  - Don't delete data on payment failure (only suspend)
  - Don't retry more than 3 times automatically
  - Don't skip notification emails

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex retry logic with state machine
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 15, 19)
  - **Blocks**: None (final payment feature)
  - **Blocked By**: Task 17 (webhook handling for payment failures)

  **References**:
  - `apps/api/src/workers/payment.worker.ts` - Payment event handling (from Task 17)
  - `apps/api/src/lib/queue.ts` - Scheduled job patterns
  - Stripe dunning: https://stripe.com/docs/billing/revenue-recovery
  - `apps/api/src/db/schema.ts:subscription_details` - Add dunning_status field

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: First retry after payment failure
    Tool: Bash
    Steps:
      1. Simulate payment_intent.failed webhook
      2. Assert: dunning_status = 'retry_1'
      3. Assert: next_retry_at = NOW + 1 day
      4. Check emailQueue for payment_failed_retry_1 email
    Expected Result: First dunning stage initiated
    Evidence: DB state and email queue

  Scenario: Automatic retry on scheduled day
    Tool: Bash
    Steps:
      1. Set dunning_status = 'retry_1', next_retry_at = NOW - 1 hour
      2. Run process-dunning job
      3. Assert: Payment retry attempted in processor
      4. If fails: dunning_status = 'retry_2', next_retry_at = NOW + 2 days
    Expected Result: Retry executed on schedule
    Evidence: Processor retry attempt

  Scenario: Account suspended after final failure
    Tool: Bash
    Steps:
      1. Set dunning_status = 'retry_3'
      2. Simulate final retry failure
      3. Assert: dunning_status = 'suspended'
      4. Assert: subscription status = 'past_due' or 'suspended'
      5. Attempt org API call
      6. Assert: HTTP 402 with suspension message
    Expected Result: Account access restricted
    Evidence: API rejection

  Scenario: Admin restores suspended account
    Tool: Bash (curl)
    Steps:
      1. POST /api/admin/billing/restore-account
         Body: { "organizationId": "org_123", "reason": "Manual payment received" }
      2. Assert: HTTP 200
      3. Assert: dunning_status = null
      4. Assert: subscription status = 'active'
      5. Attempt org API call
      6. Assert: HTTP 200 (access restored)
    Expected Result: Account restored
    Evidence: API access works

  Scenario: Dunning emails sent with increasing urgency
    Tool: Bash
    Steps:
      1. Process retry_1 → check email template = "friendly reminder"
      2. Process retry_2 → check email template = "urgent notice"
      3. Process retry_3 → check email template = "final warning"
      4. Process suspension → check email template = "account suspended"
    Expected Result: Escalating email tone
    Evidence: Email templates used
  ```

  **Commit**: YES
  - Message: `feat(api): add payment failed recovery with dunning logic and account suspension`
  - Files: `apps/api/src/services/dunning.service.ts`, `apps/api/src/workers/dunning.worker.ts`, `apps/api/src/routes/admin/billing.ts`, `apps/api/src/db/schema.ts`

---

### WAVE 5 - Integration & Testing (After Wave 4)

---

- [ ] T1. Integration Testing All Flows

  **What to do**:
  - Test complete subscription flow: signup → trial → payment → active
  - Test upgrade/downgrade flow with proration
  - Test payment failure → dunning → recovery flow
  - Test admin operations: impersonation, bulk actions, exports
  - Test webhook handling with real Stripe/GoCardless test events
  - Verify audit log completeness for all operations
  - Document any issues found for immediate fix

  **Must NOT do**:
  - Don't skip any major flow
  - Don't test with production credentials

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Comprehensive testing across all systems
  - **Skills**: [`playwright`]
    - `playwright`: End-to-end flow testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (must complete before T2)
  - **Blocks**: T2 (automated tests)
  - **Blocked By**: All Wave 1-4 tasks

  **References**:
  - All previous task acceptance criteria
  - Stripe CLI for webhook testing: https://stripe.com/docs/stripe-cli
  - `.sisyphus/evidence/` - Screenshot evidence from all tasks

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Complete subscription lifecycle
    Tool: Playwright + curl
    Steps:
      1. Create new organization
      2. Verify: 14-day trial started
      3. Navigate to billing settings
      4. Add payment method (Stripe test card)
      5. Select professional plan
      6. Verify: Subscription active
      7. Verify: Stripe subscription created
      8. Wait for webhook processing
      9. Verify: subscription_details updated
      10. Screenshot: .sisyphus/evidence/T1-subscription-flow.png
    Expected Result: Full flow works
    Evidence: Screenshot series

  Scenario: Payment failure and recovery
    Tool: Bash
    Steps:
      1. Create subscription with Stripe test card: 4000000000000341 (decline after attach)
      2. Trigger billing cycle
      3. Verify: payment_intent.failed webhook received
      4. Verify: dunning_status = 'retry_1'
      5. Skip to Day 7 (adjust next_retry_at)
      6. Run dunning job
      7. Verify: Account suspended
      8. Admin: Restore account
      9. Verify: Access restored
    Expected Result: Dunning flow complete
    Evidence: State transitions

  Scenario: Admin feature completeness
    Tool: Playwright
    Steps:
      1. Login as admin
      2. Visit each new admin page (Sessions, Feature Flags, Notifications)
      3. Verify: Page loads without errors
      4. Perform one action on each page
      5. Verify: Action succeeds
      6. Export CSV from each relevant page
      7. Verify: CSV valid
    Expected Result: All admin features work
    Evidence: Screenshot per page
  ```

  **Commit**: NO (testing only, no code changes unless bugs found)

---

- [ ] T2. Add Automated Tests (Vitest)

  **What to do**:
  - Install Vitest: `npm install -D vitest @testing-library/react` in relevant workspaces
  - Create test config: vitest.config.ts
  - Write unit tests for billing calculations (proration, usage)
  - Write unit tests for dunning state machine
  - Write unit tests for webhook signature verification
  - Write integration tests for key API endpoints
  - Aim for >80% coverage on new services

  **Must NOT do**:
  - Don't test external API calls (mock Stripe/GoCardless)
  - Don't test UI components exhaustively (QA scenarios cover this)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Test architecture and coverage
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None (final)
  - **Blocked By**: T1 (integration testing confirms what to test)

  **References**:
  - Vitest docs: https://vitest.dev/
  - `apps/api/src/services/*.ts` - Services to test
  - Testing best practices: https://kentcdodds.com/blog/write-tests

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Test suite runs successfully
    Tool: Bash
    Steps:
      1. cd apps/api && npm test
      2. Assert: All tests pass
      3. Assert: Coverage report generated
      4. Assert: Coverage > 80% for services/billing.service.ts
      5. Assert: Coverage > 80% for services/dunning.service.ts
    Expected Result: Tests pass with good coverage
    Evidence: Test output and coverage report

  Scenario: Proration calculation tests
    Tool: Bash
    Steps:
      1. Run: npm test -- --filter=proration
      2. Assert: Tests cover mid-cycle upgrade
      3. Assert: Tests cover mid-cycle downgrade
      4. Assert: Tests cover edge cases (first day, last day)
    Expected Result: Proration logic verified
    Evidence: Test names and results

  Scenario: Webhook verification tests
    Tool: Bash
    Steps:
      1. Run: npm test -- --filter=webhook
      2. Assert: Tests for valid signature
      3. Assert: Tests for invalid signature
      4. Assert: Tests for expired timestamp
    Expected Result: Security tested
    Evidence: Test results
  ```

  **Commit**: YES
  - Message: `test(api): add Vitest test suite for billing, dunning, and webhook services`
  - Files: `apps/api/vitest.config.ts`, `apps/api/src/**/*.test.ts`

---

## Commit Strategy

| Wave | After Tasks | Message | Key Files |
|------|-------------|---------|-----------|
| 1 | 5, 9, 10, 11, P1-P4 | See individual task commits | Admin UI, Payment foundation |
| 2 | 6, 7, 12, 16, 17, 20 | See individual task commits | Auth features, Core billing |
| 3 | 8, 13, 18, 21, 22 | See individual task commits | Customer portal, Invoicing |
| 4 | 14, 15, 19, 23 | See individual task commits | Admin billing, Dunning |
| 5 | T1, T2 | See individual task commits | Tests only |

---

## Success Criteria

### Verification Commands
```bash
# Build passes
npm run build

# TypeScript strict mode
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit

# All tests pass (after T2)
npm test

# Dev servers start
npm run dev

# Webhook endpoint responds
curl -X POST http://localhost:3000/api/webhooks/stripe -H "Stripe-Signature: test" -d '{}'
# Should return 401 (invalid signature) not 404

# Admin pages load
# Via Playwright: navigate to /admin/sessions, /admin/feature-flags, /admin/notifications
```

### Final Checklist
- [ ] All 25 features implemented (Tasks 5-23 + P1-P4 + T1-T2)
- [ ] Payment flow works end-to-end (Stripe and GoCardless)
- [ ] Webhooks verify signatures correctly
- [ ] Trial → Paid conversion works
- [ ] Dunning flow handles payment failures
- [ ] All admin pages functional
- [ ] CSV exports work
- [ ] Bulk operations work
- [ ] Feature flags work
- [ ] All mutations logged to audit
- [ ] No TypeScript errors
- [ ] Test coverage > 80% on billing services

---

## Risk Mitigation

### High-Risk Tasks (Recommend Extra Review)

| Task | Risk | Mitigation |
|------|------|------------|
| P4 | Webhook middleware ordering critical | Test signature verification before proceeding |
| 17 | Idempotency edge cases | Store processed event IDs, test duplicate handling |
| 23 | Dunning state machine complexity | Clear state diagram, test all transitions |
| 16 | Dual processor billing | Test both paths independently first |

### Rollback Strategy
- All database changes via migrations (can rollback)
- Feature flags can disable new features if issues found
- Payment processors have test modes for safe iteration

### Dependencies to Monitor
- Stripe SDK version compatibility
- GoCardless SDK version compatibility
- Better Auth session API changes
- BullMQ version for scheduled jobs
