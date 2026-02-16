# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Torre Tempo V4 is a multi-tenant workforce management system built for Spanish SMBs (hospitality, retail, service). It handles time tracking, shift scheduling, roster management, compliance with Spanish labor law (Estatuto de los Trabajadores), and ITSS inspector audits. The system is mobile-first, offline-capable, and compliance-obsessed.

Production domain: `time.lsltgroup.es`

## Monorepo Structure

npm workspaces + Turborepo monorepo with three packages:

- **`apps/api`** - Express.js REST API + WebSocket server (port 3000)
- **`apps/web`** - React SPA with Vite + PWA (port 5173)
- **`packages/shared`** - Shared types, Zod schemas, role/permission definitions

## Build & Dev Commands

```bash
# Root-level (runs all workspaces via Turborepo)
npm run dev          # Start all apps in dev mode
npm run build        # Build all (shared must build first - handled by turbo pipeline)
npm run lint         # Lint all
npm run test         # Test all

# API-specific (run from apps/api)
npm run dev          # tsx watch src/index.ts
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
npm run build        # tsc

# Web-specific (run from apps/web)
npm run dev          # vite --host 0.0.0.0
npm run build        # tsc && vite build

# Database (run from apps/api)
npx drizzle-kit push       # Push schema changes to DB
npx drizzle-kit generate   # Generate migration SQL
npx drizzle-kit studio     # Open Drizzle Studio GUI
```

## Infrastructure

Docker Compose provides local Postgres 16 and Redis 7:
```bash
docker-compose up -d     # Start postgres + redis
```
- PostgreSQL: `localhost:5432` (user: torretempo, db: torretempo)
- Redis: `localhost:6379` (used by BullMQ job queues)

Copy `.env.example` to `.env` at the project root.

## Environment Variables (`.env.example`)

- **Database**: `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **Redis**: `REDIS_URL`
- **Auth**: `AUTH_BASE_URL`, `AUTH_SECRET`
- **Admin Seed**: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- **Email**: `RESEND_API_KEY`, `RESEND_FROM`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **GoCardless**: `GOCARDLESS_ACCESS_TOKEN`, `GOCARDLESS_WEBHOOK_SECRET`, `GOCARDLESS_ENVIRONMENT`
- **Billing**: `PAYMENT_CURRENCY` (default: EUR)
- **Frontend**: `VITE_API_URL`, `VITE_STRIPE_PUBLISHABLE_KEY`

## Architecture

### API (`apps/api`)

- **Framework**: Express.js with TypeScript (ESM modules, `tsx` for dev)
- **Database**: Drizzle ORM with `postgres` driver. Schema in `src/db/schema.ts`, connection in `src/db/index.ts`
- **Auth**: Better Auth v1.1.5 with organization + admin plugins. Auth handler is mounted BEFORE `express.json()` middleware (critical ordering)
- **Multi-tenancy**: Tenant isolation via `tenantMiddleware` which extracts session, verifies org membership, and sets `req.session` + `req.organizationId`. All tenant routes use URL pattern `/api/v1/org/:slug/...`
- **Job Queues**: BullMQ with Redis. Queues defined in `src/lib/queue.ts` (email, pdf, notification, compliance, monthly, backup, trial). Workers in `src/workers/`
- **WebSocket**: `ws` library for real-time attendance updates (managers)
- **Middleware**: `src/middleware/` - tenant isolation, role checking, admin auth, compliance validation, error logging, right-to-disconnect enforcement
- **Encryption**: AES-256-GCM application-level encryption for PII in employee_profiles (`src/lib/encryption.ts`)
- **Logging**: Winston (`src/lib/logger.ts`) — `import logger from '@/lib/logger.js'; logger.info('msg', { meta })`

### Middleware Execution Order (Critical)

In `apps/api/src/index.ts`, order matters:
1. Helmet → CORS → Rate limiting (100 req/min)
2. Better Auth handler (`/api/auth/*`) — BEFORE body parsing
3. Webhook routes with `express.raw()` — BEFORE body parsing
4. `express.json()` + `express.urlencoded()`
5. Route handlers with middleware chains
6. Error logger middleware (MUST be last)

### Route Organization

- `/api/auth/*` - Better Auth (handled before body parsing)
- `/api/webhooks/stripe` - Stripe webhooks (uses `express.raw()` before body parsing)
- `/api/webhooks/gocardless` - GoCardless webhooks
- `/api/admin/*` - Platform admin routes (require admin role on `user.role`)
- `/api/admin/:slug/*` - Tenant-scoped admin routes (use tenantMiddleware)
- `/api/inspector/v1/*` - Read-only ITSS inspector access via tokens
- `/api/v1/org/:slug/*` - All tenant routes (require tenantMiddleware)

### Service Layer (`apps/api/src/services/`)

Services export functions (NOT classes). Key services:
- `audit.service.ts` / `adminAudit.service.ts` — hash-chain audit logging
- `compliance-validator.ts` — Spanish labor law validation
- `roster-validator.ts` — shift assignment validation
- `auto-scheduler.ts` — automatic shift scheduling
- `billing.service.ts` / `payment.service.ts` / `subscription.service.ts` — billing lifecycle
- `geofencing.service.ts` — location-based clock-in validation
- `notification.service.ts` / `push-notification.service.ts` — notifications
- `payrollExport.service.ts` — payroll CSV generation
- `errorLog.service.ts` — error persistence to `error_logs` table

### Background Workers (`apps/api/src/workers/`)

BullMQ workers imported at server start:
- `email.worker.ts` — Email via Resend
- `pdf.worker.ts` — PDF report/payslip generation
- `monthly.worker.ts` — Monthly summary calculations
- `payment.worker.ts` — Payment processing
- `trial.worker.ts` / `trial-scheduler.worker.ts` — Trial expiration

### Payment Processing

- **Dual provider**: Stripe (global) + GoCardless (SEPA Direct Debit for EU)
- **Routing logic** (`services/payment.service.ts`): `shouldUseGoCardless(countryCode)` checks 35-country SEPA zone; Spain (`ES`) routes to GoCardless
- **GoCardless**: `gocardless-nodejs` v7 — uses `.js` extension in ESM imports (critical)
- **Stripe webhooks**: `routes/webhooks/stripe.ts` (uses `express.raw()` before body parsing)
- **GoCardless webhooks**: `routes/webhooks/gocardless.ts`

### Web (`apps/web`)

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with light theme, orange primary color (`#f97316`), Inter font
- **UI Components**: Radix UI primitives in `src/components/ui/`, styled with `class-variance-authority` + `tailwind-merge` + `clsx`
- **State**: Zustand for client state, TanStack React Query for server state (5-min stale time)
- **Routing**: React Router v7 with path alias `@/` -> `src/`
- **Auth Client**: Better Auth React client in `src/lib/auth-client.ts`
- **Offline**: IndexedDB-based offline queue (`src/lib/offline-queue.ts`), PWA with Workbox service worker
- **Maps**: Leaflet + React Leaflet for geofencing
- **Charts**: Recharts for data visualization
- **Drag & Drop**: dnd-kit for roster/shift management
- **Animations**: Framer Motion
- **Toasts**: Sonner (top-center)

### Internationalization (i18n)

- **Library**: i18next + react-i18next + browser language detector
- **Default language**: Spanish (`es`), also supports English (`en`)
- **Translation files**: `apps/web/src/i18n/{es,en}.json` (nested JSON with namespaces like `common`, `nav`, `errors`, etc.)
- **Config**: `apps/web/src/i18n/index.ts`, persists to localStorage key `i18nextLng`
- **Usage**: `const { t } = useTranslation(); t('common.save')`
- **Language switcher**: `components/common/LanguageSwitcher.tsx`

### Frontend Patterns

- **Forms**: Native React state + `useState` (no react-hook-form). Inline validation, error via `setError()` + Sonner toasts
- **API Client**: Modular files in `apps/web/src/lib/api/` (one per domain: `corrections.ts`, `employees.ts`, `leave.ts`, etc.). Custom error classes with `status` + `data`. Shared `handleResponse<T>()` helper. All calls use `credentials: 'include'`
- **Base URL**: `import.meta.env.VITE_API_URL`
- **Custom Hooks** (`apps/web/src/hooks/`): `useAuth`, `useOrganization`, `useIsManager`, `useOfflineQueue`, `useWebSocket`, `useGeolocation`, `useHaptic`, `useNFC`, `useQRScanner`, `useRosterValidation`, `usePushNotifications`
- **Layout**: `AppShell.tsx` (tenant wrapper with sidebar + outlet), `ProtectedRoute.tsx`, `AdminRoute.tsx`, `OnboardingRedirect.tsx`
- **Mobile touch targets**: `min-h-touch` (48px), `min-h-touch-lg` (60px)

### Frontend Route Structure

- `/` - Landing page
- `/auth/*` - Sign in, sign up, reset password, verify email
- `/onboarding/*` - Org selection, creation
- `/t/:slug/*` - Tenant app shell (all tenant pages nested), default landing: `dashboard`
- `/admin/*` - Platform admin panel

### PWA Configuration

- **Plugin**: vite-plugin-pwa with Workbox
- **API caching**: Network-first strategy for `/api/*` with 10s timeout, 5-min cache expiration
- **Background sync**: Enabled for offline operations
- **Precache**: Max 5MB file size, skip waiting + clients claim
- **Offline queue**: IndexedDB at `apps/web/src/lib/offline-queue.ts`, sync at `apps/web/src/lib/background-sync.ts`

### Shared Package (`packages/shared`)

Exports role/permission definitions and TypeScript types. The `ac` (access control) helper uses a role-permission matrix with four roles: `employee`, `manager`, `tenantAdmin`, `owner`. Permissions follow `action:scope` pattern (e.g., `create:own`, `read:any`).

**Exports** (`packages/shared/src/index.ts`):
- **Permissions**: `ac.can(role, resource, action)` → boolean. 11 resources (`organization`, `member`, `invitation`, `location`, `skill`, `shift`, `roster`, `swap`, `timeEntry`, `report`, `billing`)
- **Types**: `EmployeeProfile`, `LeaveRequest`, `GeneratedReport`, `ComplianceCheck`, `NotificationPreferences`, `OrganizationSettings`
- **Constants**: `EMPLOYMENT_TYPES`, `LEAVE_TYPES`, `LEAVE_STATUSES`, `REPORT_TYPES`, `COMPLIANCE_SEVERITIES`, `DEFAULT_ORGANIZATION_SETTINGS`, `DEFAULT_NOTIFICATION_PREFERENCES`
- **No Zod schemas exported** — validation schemas are defined per-package

## Database Schema

Defined in `apps/api/src/db/schema.ts` using Drizzle ORM. Key table groups:

- **Better Auth tables**: `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation` (text IDs)
- **Business tables**: `locations`, `shifts`, `shift_templates`, `swap_requests`, `time_entries`, `break_entries`, `correction_requests`, `notifications` (UUID IDs)
- **Compliance**: `compliance_checks`, `organization_settings` (Spanish labor law defaults: 9h/day, 40h/week, 12h rest)
- **Employee data**: `employee_profiles` (6 AES-256-GCM encrypted PII fields), `leave_requests`
- **Reporting**: `generated_reports`, `monthly_summaries` (SHA-256 integrity verification)
- **Audit**: `audit_log` (SHA-256 hash chain, immutable), `admin_audit_log`
- **Billing**: `subscription_details`, `subscription_plans` (Stripe + GoCardless)
- **Admin**: `feature_flags`, `admin_broadcast_messages`, `error_logs`, `inspector_tokens`

Migrations output to `apps/api/drizzle/` with timestamp prefix format.

## TypeScript Configuration

- API: `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, strict mode with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- All packages use ESM (`"type": "module"` in package.json)
- API uses `.js` extension in imports (required for ESM with TypeScript)
- Express request types extended in `apps/api/src/types/express.d.ts` (adds `req.session`, `req.organizationId`, `req.inspectorToken`)

## Spanish Labor Law Context

This system enforces Spanish labor regulations automatically:
- **Estatuto de los Trabajadores Art. 34**: Max 9h/day, 40h/week, 12h rest between shifts
- **Art. 34.4**: 15-min break required after 6h continuous work
- **Art. 37.1**: 35h continuous weekly rest
- **Ley Orgánica 3/2018**: Right to Disconnect (DND during off-hours)
- **ITSS**: Labor inspector read-only API access via time-limited tokens
- Employee profiles store Spanish-specific fields: DNI/NIE, Social Security Number, employment types (indefinido, temporal, practicas, formacion)

## Testing

Tests use Vitest. API tests are in `apps/api/src/__tests__/` and `apps/api/src/services/`. Run a single test file:
```bash
cd apps/api && npx vitest run src/lib/encryption.test.ts
```

## Key Patterns

- Route handlers access tenant context via `req.organizationId` (set by tenantMiddleware)
- Audit logging via `logAudit()` from `services/audit.service.ts` with SHA-256 hash chain
- Background jobs enqueued to BullMQ queues, processed by workers in `src/workers/`
- All RLS-protected business tables include `organization_id` column for tenant isolation
- Drizzle queries build conditions dynamically with `and()` and array of conditions
- Actor extraction pattern in routes: `const actor = (req.user ?? (req.session?.user as any)) as any;`

## Documentation

Detailed system architecture, API endpoint specs, database schema diagrams, and implementation checklists are in the `docs/` directory.
