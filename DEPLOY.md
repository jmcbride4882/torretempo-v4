# 🚀 Torre Tempo V4 — Deployment Guide

**Target:** VPS at `root@lsltgroup.es:/root/torretempo-v4`  
**Production URL:** https://time.lsltgroup.es

---

## 📋 Pre-Deployment Checklist

- [ ] VPS accessible via SSH: `ssh root@lsltgroup.es`
- [ ] Docker & Docker Compose installed on VPS
- [ ] Domain `time.lsltgroup.es` points to VPS IP
- [ ] Cloudflare DNS configured (proxy enabled for SSL)
- [ ] Production secrets generated (see below)

---

## 🔐 Generate Production Secrets

```bash
# Better Auth Secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Strong PostgreSQL Password
openssl rand -base64 32

# Strong Admin Password
openssl rand -base64 24
```

---

## 🚢 Step 1: Push Code to VPS

### Option A: Git Clone (Recommended)

```bash
# On your local machine, push to GitHub/GitLab
cd C:\Users\j.mcbride.LSLT\Desktop\torretempo-v4
git add -A
git commit -m "feat: Phase 1 foundation complete"
git remote add origin <your-git-repo-url>
git push -u origin main

# On VPS
ssh root@lsltgroup.es
cd /root
git clone <your-git-repo-url> torretempo-v4
cd torretempo-v4
```

### Option B: SCP Transfer

```bash
# From local Windows machine (PowerShell)
scp -r C:\Users\j.mcbride.LSLT\Desktop\torretempo-v4 root@lsltgroup.es:/root/
```

---

## ⚙️ Step 2: Configure Production Environment

```bash
# On VPS
cd /root/torretempo-v4

# Create production .env
cp .env.example .env
nano .env
```

**Update these values in .env:**

```bash
# Database (use strong password!)
DATABASE_URL=postgresql://torretempo:CHANGE_THIS_PASSWORD@postgres:5432/torretempo
POSTGRES_USER=torretempo
POSTGRES_PASSWORD=CHANGE_THIS_PASSWORD
POSTGRES_DB=torretempo

# Redis
REDIS_URL=redis://redis:6379

# Better Auth (use generated secret!)
BETTER_AUTH_URL=https://time.lsltgroup.es
BETTER_AUTH_SECRET=YOUR_64_CHAR_SECRET_HERE

# Admin Seed
ADMIN_EMAIL=admin@lsltgroup.es
ADMIN_PASSWORD=YOUR_STRONG_PASSWORD_HERE

# Email (get from Resend.com)
RESEND_API_KEY=re_your_resend_key

# Frontend
VITE_API_URL=https://time.lsltgroup.es
```

---

## 🐳 Step 3: Build & Start Services

```bash
# On VPS
cd /root/torretempo-v4

# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d --build

# Check all containers are running
docker-compose -f docker-compose.prod.yml ps

# Expected output:
# torretempo-postgres-prod  Up (healthy)
# torretempo-redis-prod     Up (healthy)
# torretempo-api-prod       Up
# torretempo-web-prod       Up
# torretempo-nginx-prod     Up
```

---

## 🗄️ Step 4: Database Setup

```bash
# On VPS
cd /root/torretempo-v4

# Wait for Postgres to be healthy (check with docker ps)
sleep 10

# Run migrations (push schema to database)
docker exec -it torretempo-api-prod sh -c "cd apps/api && npx drizzle-kit push"

# Apply RLS policies
docker exec -it torretempo-postgres-prod psql -U torretempo -d torretempo -f /scripts/rls.sql

# Seed platform admin
docker exec -it torretempo-api-prod npx tsx scripts/seed-admin.ts
```

**Expected output:**
```
✅ Database connected: <timestamp>
✅ Pushed schema to database
✅ RLS policies applied
✅ Platform admin created: admin@lsltgroup.es
```

---

## ✅ Step 5: Verify Deployment

### Health Check

```bash
curl https://time.lsltgroup.es/api/health
```

**Expected:**
```json
{"status":"ok","version":"4.0.0","ts":1738713600000}
```

### Test Frontend

Open https://time.lsltgroup.es in browser:
- [ ] Page loads (React app renders)
- [ ] Sign Up page accessible at `/auth/signup`
- [ ] No console errors

### Test Admin Login

1. Go to https://time.lsltgroup.es/auth/signin
2. Login with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from .env
3. Navigate to https://time.lsltgroup.es/admin
4. Admin layout should render with "ADMIN" badge

### Test Database

```bash
# On VPS
docker exec -it torretempo-postgres-prod psql -U torretempo

# Inside psql:
\dt                                      # List all tables (should see 21+ tables)
SELECT COUNT(*) FROM "user";            # Should have 1 (admin)
SELECT email FROM "user";               # Should show admin email
\q
```

---

## 🔧 Troubleshooting

### Issue: API not responding

```bash
# Check API logs
docker logs torretempo-api-prod

# Common fixes:
# 1. Database connection failed → check DATABASE_URL in .env
# 2. Port conflict → change port in docker-compose.prod.yml
```

### Issue: Frontend shows blank page

```bash
# Check web logs
docker logs torretempo-web-prod

# Check nginx logs
docker logs torretempo-nginx-prod

# Verify VITE_API_URL is set correctly
docker exec torretempo-web-prod env | grep VITE
```

### Issue: Database connection refused

```bash
# Check Postgres is running and healthy
docker ps | grep postgres

# Check Postgres logs
docker logs torretempo-postgres-prod

# Restart Postgres
docker-compose -f docker-compose.prod.yml restart postgres
```

### Issue: RLS policies not working

```bash
# Manually apply RLS policies
docker cp apps/api/scripts/rls.sql torretempo-postgres-prod:/tmp/rls.sql
docker exec -it torretempo-postgres-prod psql -U torretempo -d torretempo -f /tmp/rls.sql
```

---

## 🔄 Updates & Redeployment

```bash
# On VPS
cd /root/torretempo-v4

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run new migrations (if any)
docker exec -it torretempo-api-prod sh -c "cd apps/api && npx drizzle-kit push"
```

---

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs -f torretempo-api-prod
docker logs -f torretempo-web-prod
docker logs -f torretempo-nginx-prod
```

### Check Service Health

```bash
# API health
curl https://time.lsltgroup.es/api/health

# Database connection
docker exec torretempo-api-prod npx tsx -e "
  import { testConnection } from './apps/api/src/db/index.js';
  await testConnection();
  process.exit(0);
"

# Redis connection
docker exec torretempo-redis-prod redis-cli PING
```

---

## 🛑 Stop Services

```bash
# On VPS
cd /root/torretempo-v4

# Stop all containers
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ DELETES DATA)
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🔐 SSL/HTTPS (via Cloudflare)

**Current Setup:** Cloudflare handles SSL (orange cloud enabled in DNS)

**nginx.conf** is configured for:
- Port 80 (HTTP)
- Cloudflare Flexible SSL (Cloudflare ↔ Client: HTTPS, Cloudflare ↔ Origin: HTTP)

**For Full SSL (origin certificate):**
1. Generate Cloudflare Origin Certificate
2. Add certificate files to `docker/ssl/`
3. Update `nginx.conf` to listen on port 443
4. Restart nginx

---

## 📈 Performance Tuning

### Database Connection Pooling

Edit `apps/api/src/db/index.ts`:
```typescript
const client = postgres(connectionString, {
  max: 20,              // Increase pool size
  idle_timeout: 20,
  connect_timeout: 10,
});
```

### Redis Max Memory

Edit `docker-compose.prod.yml`:
```yaml
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy noeviction
```

---

## 🔒 Security Hardening

### Change Default Passwords

```bash
# On VPS, after initial deploy
docker exec -it torretempo-postgres-prod psql -U torretempo

# Inside psql:
ALTER USER torretempo WITH PASSWORD 'new_secure_password';
\q

# Update .env with new password
nano .env
# Update POSTGRES_PASSWORD and DATABASE_URL

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Firewall Rules

```bash
# On VPS (if using ufw)
ufw allow 22/tcp          # SSH
ufw allow 80/tcp          # HTTP
ufw allow 443/tcp         # HTTPS
ufw enable
```

---

## 📞 Support

**Issues?** Check logs first:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**Contact:** admin@lsltgroup.es

---

**Production deployment complete! 🚀**
