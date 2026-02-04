# Draft: Torre Tempo V4 - Phase 1: Foundation

## Requirements (confirmed)
- **Monorepo Structure**: apps/api, apps/web, packages/shared
- **Backend**: Express + TypeScript + Better Auth + Drizzle ORM + PostgreSQL + BullMQ
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + Framer Motion
- **Auth**: Better Auth with organization() and admin() plugins
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Constraint**: app.all("/api/auth/*") BEFORE express.json()
- **Constraint**: REVOKE UPDATE, DELETE on audit tables
- **Constraint**: TypeScript strict mode

## Technical Decisions (CONFIRMED)

### Package Manager
- [x] **pnpm workspaces** (industry standard, strict isolation)

### PostgreSQL Setup
- [x] **Docker Compose** (PostgreSQL + Redis services)
- Connection: `postgres://postgres:postgres@localhost:5432/torretempo`

### Better Auth Configuration
- [x] **Email/Password only** (Phase 1 - OAuth can be added later)
- Email verification: disabled for Phase 1

### Admin Seed Credentials
- [x] **Prompt at runtime** (secure - no hardcoded credentials)

### CORS Configuration
- [x] Origins: `http://localhost:5173`, `http://localhost:3000`
- Credentials: true

### Rate Limiting
- Global: 100 requests/15min
- Auth routes: 5 attempts/15min (stricter for security)

### Docker Compose Contents
- PostgreSQL 16 (port 5432)
- Redis 7 (port 6379 for BullMQ)
- Volumes for persistence

### Testing Strategy
- [x] **TDD** - Tests alongside implementation
- Framework: bun test (built into bun, works with pnpm)
- Coverage: Auth flows, middleware, services

## Research Findings (COMPLETED)

### Monorepo Patterns (bg_28f8107e)
**Recommendation: pnpm workspaces**
- Industry standard (Next.js, Vue, Nuxt, Vite, Prisma use pnpm)
- Strict dependency isolation (no phantom dependencies)
- Content-addressable store with hard-linking
- `workspace:*` protocol ensures local packages always used

**TypeScript Config Structure:**
- `tsconfig.base.json` - Shared strict compiler options
- `tsconfig.json` (root) - Solution file with project references
- Each package extends base with `composite: true`

**Critical strict options:**
- `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`
- `composite: true` for project references
- `moduleResolution: "Bundler"` for modern ESM

### Better Auth + Express (bg_23637d1e)
**CRITICAL: Middleware Order**
```typescript
// 1. CORS first
app.use(cors({ origin, credentials: true }));

// 2. Better Auth handler BEFORE express.json()
app.all("/api/auth/*", toNodeHandler(auth));

// 3. Body parser AFTER auth handler
app.use(express.json());
```

**Why this order?**
- `toNodeHandler` reads RAW request body directly
- `express.json()` CONSUMES the body stream
- If json() comes first, auth routes hang in "pending" state

**Plugin Configuration:**
- `organization()` - multi-tenancy (orgs, members, roles)
- `admin()` - user management (ban, impersonate)
- Both plugins work together without conflicts
- JWT plugin optional - only for external service auth

**Session vs JWT:**
- Better Auth uses cookie-based sessions by default
- JWT plugin is for external APIs, not session replacement
- Use `session.expiresIn` for cookie session duration

### User's Librarian Agents (referenced)
- Better Auth org + admin plugins: bg_a23de3dc
- Drizzle RLS patterns: bg_6788fd4e
- BullMQ setup: bg_d38cd9b3

## Scope Boundaries (confirmed)
### INCLUDE
- Project scaffolding (all directories, configs)
- Express server with health endpoint
- Better Auth integration (org + admin plugins)
- Drizzle schema with ALL tables listed
- RLS policies + REVOKE statements
- All middleware (tenant, requireAdmin, inspectorAuth, requireRole)
- Audit services (hash chain logging)
- BullMQ queue setup
- Admin seed script
- Frontend scaffolding (Vite, React Router v7)
- Auth pages (SignUp, SignIn)
- Onboarding flow (CreateTenant)
- AppShell + AdminLayout
- Docker Compose for local dev

### EXCLUDE
- Actual CRUD endpoints (beyond health)
- Business logic implementation
- Shift scheduling features
- Time tracking features
- Production deployment
- CI/CD pipeline
- E2E tests (Playwright)

## Open Questions
1. Package manager preference?
2. PostgreSQL: Docker or external?
3. Auth: Email only or OAuth too?
4. Admin seed credentials?
5. CORS origins for local dev?
6. Testing strategy for Phase 1?
