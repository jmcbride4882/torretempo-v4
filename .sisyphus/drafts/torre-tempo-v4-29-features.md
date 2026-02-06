# Draft: Torre Tempo V4 - 29 Features Implementation Plan

## User Request Summary

**Project**: Torre Tempo V4 - Spanish SaaS Workforce Management Platform
**Scope**: 29 features (4 complete, 25 remaining)
- GROUP A: Admin Panel Enhancements (21 features, 4 complete = 17 remaining)
- GROUP B: Payment Processor Integration (8 features)

**Execution Mode**: Maximum parallelization (both groups simultaneously)

**Quality Requirements**:
- NO mock/placeholder data
- NO simplified versions
- 100% complete implementation
- Production-ready

## Requirements (Confirmed)

- [x] Stack: React 18 + Vite + Express + PostgreSQL + Redis + BullMQ
- [x] Database schema for billing EXISTS (subscription_details, subscription_plans)
- [x] Payment processors: BOTH Stripe AND GoCardless
- [x] Smart routing: EU customers → GoCardless, International → Stripe
- [x] Parallel execution across both feature groups
- [x] TypeScript strict mode (no `any` types)
- [x] All mutations must log to admin_audit_log

## Technical Decisions

- Webhook routes must register BEFORE express.json() middleware
- Payment SDKs need installation: stripe, gocardless-nodejs
- New admin pages need routing in apps/web/src/App.tsx
- Database migrations required for new tables (feature_flags, etc.)

## Research Findings

### Admin Panel Patterns (from explore agent)
- **8 existing admin pages**: TenantsPage, UsersPage, SubscriptionsPage, SystemPage, ErrorLogsPage, InspectorTokensPage, AuditPage, AnalyticsPage
- **State pattern**: useState for data, loading, filters, pagination, modals
- **Data fetching**: useCallback with silent refresh, 10-second auto-refresh intervals
- **Pagination**: PaginationControls component, limit 12-50 items, page-based
- **UI**: Glass-morphism cards, gradient icons, Framer Motion animations
- **API pattern**: requireAdmin middleware, Drizzle ORM, logAdminAction() for audit

### Express/Webhook Integration (from explore agent)
- **CRITICAL**: Webhooks MUST be registered BEFORE express.json() middleware
- **Pattern**: Better Auth already uses this pattern (line 57 before line 60)
- **BullMQ**: 6 queues exist (email, pdf, notification, compliance, monthly, backup)
- **Error handling**: asyncHandler wrapper, errorLogger middleware, errorLog.service.ts
- **Env vars**: .env.example exists, need to add Stripe/GoCardless keys

### Database Schema (confirmed)
- `subscription_details`: stripe_customer_id, gocardless_customer_id, gocardless_mandate_id, tier, trial_ends_at
- `subscription_plans`: code, price_cents, billing_period, employee_limit, included_modules

### Key Files for Reference
- Admin page template: `apps/web/src/pages/admin/TenantsPage.tsx`
- Admin route template: `apps/api/src/routes/admin/tenants.ts`
- API client: `apps/web/src/lib/api/admin.ts`
- Queue setup: `apps/api/src/lib/queue.ts`
- Main app: `apps/api/src/index.ts`
- Error service: `apps/api/src/services/errorLog.service.ts`

## Open Questions

### Critical (Must Answer Before Plan)

1. **Test Strategy**: Should tasks include TDD (write tests first) or tests-after implementation, or no automated tests?

2. **Environment Variable Setup**: Should the plan include tasks for setting up Stripe/GoCardless API keys, or will those be configured separately by the team?

3. **Spanish Localization**: Is the admin panel UI in Spanish or English? Should new features match?

### Important (Defaults Available)

4. **Trial Period Duration**: What's the free trial length?
   - Default assumption: 14 days (industry standard)

5. **Dunning Logic Intervals**: How many retry attempts for failed payments?
   - Default assumption: 3 retries (day 1, day 3, day 7), then suspend

6. **Smart Routing Definition**: Which countries route to GoCardless?
   - Default assumption: SEPA zone countries (EU + UK + Switzerland + Norway)

7. **Invoice Email Templates**: Detailed design or basic functional HTML?
   - Default assumption: Basic professional HTML (styled but not custom branded)

## Scope Boundaries

**INCLUDE**:
- All 25 remaining features
- Database migrations
- API routes
- Frontend pages/components
- Service layer logic
- Webhook handlers
- BullMQ job processors

**EXCLUDE**:
- Infrastructure setup (Redis, PostgreSQL already running)
- CI/CD pipeline changes
- Production deployment steps
- Manual API key configuration
- Custom email template design (beyond basic)

---

*Updated*: Session start - awaiting clarifications and research results
