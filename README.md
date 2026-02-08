# Torre Tempo V4 — 

**Workforce Management for Spanish SMBs**  
Inspector-Ready Compliance | Mobile-First PWA | SHA-256 Audit Chain

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Local Development

```bash
# 1. Clone repository
git clone <repo-url>
cd torretempo-v4

# 2. Install dependencies
npm install

# 3. Start services
docker-compose up -d

# 4. Run migrations
cd apps/api
npx drizzle-kit push

# 5. Seed admin
npx tsx ../../scripts/seed-admin.ts

# 6. Start dev servers
npm run dev --workspace=api     # API on :3000
npm run dev --workspace=web     # Web on :5173
```

Visit http://localhost:5173

---

## 📦 What's Built (Phase 1 Complete)

### ✅ Backend (Express + PostgreSQL + Redis)
- **Auth**: Better Auth with organization + admin plugins
- **Database**: 14 tables with Row-Level Security (RLS)
- **Audit**: SHA-256 hash chain (immutable, inspector-ready)
- **Queues**: BullMQ (email, PDF, notifications, compliance, monthly, backup)
- **Middleware**: Tenant isolation, admin, inspector, role-based
- **Security**: Helmet, CORS, rate limiting, RLS on all business tables

### ✅ Frontend (React 18 + Vite + TailwindCSS)
- **Auth**: Sign up, sign in, tenant creation
- **Layouts**: Tenant AppShell (sidebar + mobile tabs), Admin layout
- **Design**: Geist Sans, glassmorphism, Framer Motion, dark mode
- **PWA**: Installable, offline-capable (service worker)
- **Components**: 7 shadcn/ui components, protected routes

### 🔐 Security Features
- **RLS Fortress**: 12 tables with tenant isolation policies
- **Immutable Audit**: REVOKE UPDATE/DELETE on audit tables
- **Hash Chain**: SHA-256 verification for compliance
- **Inspector API**: Token-based read-only access for ITSS
- **Session Security**: 15-min expiry, 24h refresh

---

## 📂 Project Structure

```
torretempo-v4/
├── apps/
│   ├── api/              # Express backend
│   │   ├── src/
│   │   │   ├── db/           # Drizzle client + schema
│   │   │   ├── lib/          # Auth, queues
│   │   │   ├── middleware/   # Tenant, admin, inspector, role
│   │   │   ├── services/     # Audit (hash chain), admin audit
│   │   │   ├── types/        # Express type extensions
│   │   │   └── index.ts      # Express server
│   │   ├── scripts/      # RLS SQL policies
│   │   └── drizzle.config.ts
│   └── web/              # React frontend
│       ├── src/
│       │   ├── components/   # Layouts, UI (shadcn)
│       │   ├── hooks/        # useAuth, useOrganization
│       │   ├── lib/          # Auth client, utils
│       │   ├── pages/        # Auth, onboarding, admin
│       │   └── styles/       # Globals (glass utilities)
│       ├── vite.config.ts
│       └── tailwind.config.js
├── packages/
│   └── shared/           # Permissions (4 roles, 11 resources)
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── nginx.conf
│   └── nginx-web.conf
├── scripts/
│   └── seed-admin.ts     # Create platform admin
├── docker-compose.yml    # Dev (Postgres + Redis)
├── docker-compose.prod.yml  # Prod (all services + nginx)
└── .env                  # Environment variables
```

---

## 🗄️ Database Schema

**14 Business Tables** (all with `organization_id` for RLS):
1. `locations` — Sites with geofencing
2. `skills` — Employee skills/certifications
3. `member_skills` — Skills junction table
4. `availability` — Recurring availability patterns
5. `shifts` — Roster shifts (draft → published → acknowledged)
6. `swap_requests` — Peer + manager approval flow
7. `time_entries` — Clock in/out (tap, NFC, QR, PIN methods)
8. `break_entries` — Paid/unpaid breaks
9. `correction_requests` — Time entry corrections
10. `monthly_summaries` — Auto-generated monthly PDFs
11. `audit_log` — **SHA-256 hash chain** (immutable)
12. `admin_audit_log` — Platform admin actions (immutable)
13. `inspector_tokens` — Time-limited ITSS access
14. `subscription_details` — Billing tiers

**Better Auth Tables** (auto-generated):
- `user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`

---

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://torretempo:password@localhost:5432/torretempo
POSTGRES_USER=torretempo
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=torretempo

# Redis
REDIS_URL=redis://localhost:6379

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-64-char-secret

# Admin Seed
ADMIN_EMAIL=admin@lsltgroup.es
ADMIN_PASSWORD=your-admin-password

# Frontend
VITE_API_URL=http://localhost:3000
```

---

## 🚢 Deployment (Production)

### On VPS (lsltgroup.es)

```bash
# 1. Clone to VPS
ssh root@lsltgroup.es
cd /root
git clone <repo-url> torretempo-v4
cd torretempo-v4

# 2. Configure production .env
cp .env.example .env
nano .env  # Set production values

# 3. Build & run
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Verify
curl https://time.lsltgroup.es/api/health
```

**Production URLs:**
- Frontend: https://time.lsltgroup.es
- API: https://time.lsltgroup.es/api
- Health: https://time.lsltgroup.es/api/health

---

## 📋 API Routes

### Auth (Better Auth automatic)
```
POST   /api/auth/sign-up
POST   /api/auth/sign-in/email
POST   /api/auth/sign-out
GET    /api/auth/session
POST   /api/auth/organization/create
POST   /api/auth/organization/invite-member
```

### Placeholder Routes (Phase 2+)
```
/api/admin/*           — Platform admin routes
/api/inspector/v1/*    — ITSS inspector routes (read-only)
/api/v1/org/:slug/*    — Tenant routes (RLS-protected)
```

---

## 🔐 Roles & Permissions

**4 Roles:**
- `employee` — View own data, clock in/out, request swaps
- `manager` — Manage team, approve swaps, view reports
- `tenantAdmin` — Full org management, billing access
- `owner` — All tenantAdmin + delete organization

**11 Resources:**
- organization, member, invitation, location, skill, shift, roster, swap, timeEntry, report, billing

---

## 🧪 Testing

```bash
# Type check
npm run lint

# Build check
npm run build

# Start services
docker-compose up -d

# Test health
curl http://localhost:3000/api/health
```

---

## 📚 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, shadcn/ui, Framer Motion |
| **Backend** | Express, Better Auth, Drizzle ORM, PostgreSQL 16, Redis 7, BullMQ |
| **Auth** | Better Auth (organization + admin plugins) |
| **Database** | PostgreSQL with Row-Level Security (RLS) |
| **Queue** | BullMQ + Redis |
| **Deploy** | Docker Compose + Nginx + Cloudflare |
| **Monorepo** | npm workspaces + Turbo |

---

## 🎯 Next Steps (Phase 2+)

**Phase 2: Roster Engine** (Weeks 3-5)
- Shift CRUD, drag-drop roster grid
- Compliance guardrails (12h rest, weekly limits)
- Open shifts marketplace

**Phase 3: Time Clock + PWA** (Weeks 6-7)
- Clock in/out (tap, NFC, QR, PIN)
- Geofencing, haptic feedback
- Offline queue

**Phase 4: Swaps + Notifications** (Weeks 8-9)
- Swap engine, Right to Disconnect filter

**Phase 5: Reports + Inspector API** (Weeks 10-11)
- Variance, payroll, compliance reports
- Full Inspector API implementation

**Phase 6: Platform Admin + Payments** (Weeks 12-14)
- Admin dashboard, Stripe + GoCardless, launch

---

## 📄 License

Proprietary — LSLT Group

---

## 🤝 Support

- **Email**: admin@lsltgroup.es
- **Docs**: (TBD)
- **Status**: https://status.lsltgroup.es (TBD)

---

**Built with ULTRAWORK MODE** 🚀
