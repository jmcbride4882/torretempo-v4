# Torre Tempo v4 — Locked Product Specification

**Version:** 4.0.0 ("The Deputy Killer")
**Date:** February 4, 2026
**Status:** LOCKED FOR DEVELOPMENT

---

## ⚠️ DEVELOPMENT ENVIRONMENT — READ FIRST

```
┌──────────────────────────────────────────────────────────────────┐
│  ALL development happens on the VPS. No exceptions.              │
│                                                                  │
│  SSH:    ssh root@lsltgroup.es       (key pre-configured)        │
│  Repo:   /root/torretempo-v4                                     │
│  Prod:   Same machine (Docker Compose)                           │
│  Domain: https://time.lsltgroup.es                               │
│                                                                  │
│  There is NO local development environment.                      │
│  The VPS is dev, staging, AND production.                        │
│  Every npm, docker, git, tsx, and curl command runs on the VPS.  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. What We're Building

A Sleek & Robust Workforce Management platform for Spanish SMBs.
Deputy-grade rostering + rigid Spanish labor law compliance.

- **Problem:** Spanish businesses use WhatsApp for shifts, Excel for compliance. Fines up to €10,000/worker.
- **Solution:** Mobile-first platform where the Roster IS the Time Clock.
- **Edge:** Native-feel PWA + proactive compliance guardrails + "Compliance by Design."
- **Moat:** Spanish Workers' Statute baked into schema and UI. Inspector-Ready from day one.

---

## 2. Regulatory Context (2026)

### RDL 8/2019 + 2025 Royal Decree Requirements
| Requirement | Statutory Standard | Our Implementation |
|-------------|-------------------|-------------------|
| Objectivity | Impartial recording | Geofenced event-only clock-ins |
| Reliability | Tamper-proof records | SHA-256 hash chain audit log |
| Accessibility | Real-time access for ITSS | **Read-only Inspector API** |
| Integrity | Unequivocal worker ID | Auth-locked session, phone biometrics |
| Retention | 4-year minimum | Append-only, never deleted |
| Inalterability | VeriFactu-standard immutability | REVOKE UPDATE/DELETE + hash chain |
| Monthly Summaries | Auto-generate with payslips | BullMQ cron job, PDF per employee |
| Remote ITSS Access | Inspector can query without employer | Dedicated `/api/inspector/` endpoints |

### Key Legal Facts
- LISOS fines: up to **€10,000 per affected worker**
- 37.5h workweek: active via many convenios colectivos (configurable per tenant)
- Right to Disconnect: Organic Law 3/2018 Art. 88 — fines €1,500+
- Biometric ban: AEPD triple test makes fingerprint disproportionate
- VeriFactu precedent: immutability extending to labor records
- DPIA required if using geolocation (we provide template)
- Registry Protocol must be negotiated with worker reps (we provide template)

### Certification Roadmap
| Certification | Purpose | Priority |
|--------------|---------|----------|
| ISO/IEC 27001 | Data security management | Phase 2 (post-launch) |
| ENS (Esquema Nacional de Seguridad) | Public admin interop | Phase 2 |
| ISO 9001 | Development lifecycle quality | Phase 3 |

---

## 3. Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | React 18 + Vite + TypeScript | Fast HMR, industry standard |
| **Styling** | TailwindCSS + shadcn/ui | Consistent, accessible, premium |
| **Motion** | Framer Motion | Native-feel layout transitions |
| **Font** | Geist Sans | Technical, crisp |
| **Scheduling** | dnd-kit + TanStack Virtual | 60FPS drag-drop, virtualized rosters |
| **Client State** | TanStack Query + Zustand | Server sync + local roster draft |
| **Toasts** | Sonner | Sleek, stackable |
| **Charts** | Recharts | Admin analytics |
| **Backend** | Express + TypeScript | Battle-tested |
| **Auth** | **Better Auth** | Multi-tenant org plugin, RBAC, 2FA, admin plugin |
| **Database** | PostgreSQL 16 + Drizzle ORM | RLS fortress, type-safe |
| **Queue** | Redis 7 + **BullMQ** | Background jobs |
| **Validation** | Zod | Shared schemas |
| **Email** | Resend | Transactional |
| **Payments** | Stripe + GoCardless | Cards + SEPA |
| **Backup** | **pgBackRest** → Backblaze B2 | Real-time WAL streaming |
| **Hosting** | Hetzner VPS (`lsltgroup.es`) + Cloudflare | EU residency, €18/mo |
| **Deploy** | Docker Compose + Nginx on VPS | Single machine |

---

## 4. Auth & Multi-Tenancy (Better Auth)

### Three Auth Layers

#### 1. Platform Admin (`/admin/*`)
Better Auth `admin()` plugin. God mode. Manages all tenants, users, inspector tokens, subscriptions, system health, impersonation.

#### 2. Tenant Roles (`/t/:slug/*`)
Better Auth `organization()` plugin. Organization = Tenant. Member = Employee.

| Role | Shifts | Roster | Swaps | Reports | Billing |
|------|--------|--------|-------|---------|---------|
| **Owner** | Full | Full | Approve | Full | Full |
| **Admin** | Full | Full | Approve | Full | Read |
| **Manager** | Full | Edit+Publish | Approve | Read+Export | — |
| **Employee** | Read own | Read own | Request+Accept | Read own | — |

#### 3. Inspector API (`/api/inspector/*`)
Time-limited bearer tokens. READ-ONLY. For ITSS labor inspectors. All access logged.

### URL Pattern
```
https://time.lsltgroup.es/admin/*           → Platform Admin
https://time.lsltgroup.es/t/{org-slug}/*    → Tenant App
https://time.lsltgroup.es/api/inspector/*   → ITSS Access
```

---

## 5. Platform Admin Dashboard

| Feature | Description |
|---------|-------------|
| Tenant List | Browse all orgs: name, slug, plan, seats, status |
| Tenant Detail | Members, subscription, last activity, compliance |
| User Management | Search all users, ban/unban, force password reset |
| Impersonation | "Login as" any user (logged to admin_audit_log) |
| Subscriptions | Override plans, extend trials, MRR/churn |
| System Health | DB size, sessions, queues, backups, errors |
| Inspector Tokens | Generate/revoke time-limited ITSS tokens |
| Audit Viewer | Global audit, verify hash chain integrity |
| Analytics | DAU/MAU, clock-ins/day, funnel (Recharts) |

---

## 6. Inspector API (ITSS Remote Access)

1. Platform Admin generates time-limited bearer token scoped to one org
2. Token given to ITSS inspector via secure channel
3. Inspector queries read-only endpoints (GET only)
4. All access logged to admin_audit_log
5. Token auto-expires (default 30 days)
6. Tenant owner notified when token generated

---

## 7. Database Schema

### Better Auth Managed
`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`

### Business Tables
`locations`, `skills`, `member_skills`, `availability`, `shifts`, `swap_requests`, `time_entries`, `break_entries`, `correction_requests`, `monthly_summaries`, `audit_log`, `inspector_tokens`, `admin_audit_log`, `subscription_details`

(Full DDL in OpenCode prompt)

### Security
- RLS on ALL business tables
- SHA-256 hash chain on audit_log
- REVOKE UPDATE/DELETE on audit_log + admin_audit_log

---

## 8. Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | €29/mo flat | Time tracking + legal reports + Inspector-Ready |
| **Growth** | €3/user/mo | + Rostering + swaps + skills |
| **Pro** | €5/user/mo | + Open shifts + auto-scheduling + payroll |

---

## 9. Build Phases

| Phase | Weeks | Deliverable |
|-------|-------|-------------|
| 1: Foundation | 1-2 | Docker, Better Auth, schema, RLS, React, admin shell |
| 2: Roster Engine | 3-5 | dnd-kit grid, shifts, compliance guardrails |
| 3: Time Clock + PWA | 6-7 | Clock in/out, geofence, offline, haptics |
| 4: Swaps + Notifications | 8-9 | Swap engine, BullMQ, SSE, Right to Disconnect |
| 5: Reports + Inspector | 10-11 | Variance, payroll, Inspector API, monthly summaries |
| 6: Admin + Payments | 12-14 | Platform Admin, Stripe, GoCardless, i18n, launch |

---

## 10. Infrastructure

| Item | Monthly |
|------|---------|
| Hetzner VPS (lsltgroup.es) | €15 |
| Backblaze B2 | €2 |
| Domain | €1 |
| Cloudflare | Free |
| **Total** | **€18/month** |

**The VPS at `root@lsltgroup.es` is the single machine for dev, build, test, and production.**
