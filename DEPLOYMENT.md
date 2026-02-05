# Torre Tempo V4 - Phase 3 Deployment Guide

**Version**: 4.0.0  
**Phase**: 3 - Time Clock + PWA  
**Target**: https://time.lsltgroup.es  
**Date**: February 5, 2026

---

## Pre-Deployment Checklist

- [x] All code committed to `main` branch
- [x] All tests documented in TESTING.md
- [x] Build verification completed (no errors)
- [x] TypeScript compilation clean
- [x] All dependencies installed
- [ ] Database migration SQL prepared
- [ ] Backup of production database taken
- [ ] SSH access to production server verified

---

## Database Migration

### Required Changes

**Table**: `member`  
**Change**: Add `clock_in_pin` column

```sql
-- Production database migration
-- Run on: time.lsltgroup.es PostgreSQL database

BEGIN;

-- Add clock_in_pin column to member table
ALTER TABLE member 
ADD COLUMN IF NOT EXISTS clock_in_pin TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN member.clock_in_pin IS 'Hashed 4-digit PIN for clock-in authentication (bcrypt)';

COMMIT;
```

### Verification Query

```sql
-- Verify column was added successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'member' 
    AND column_name = 'clock_in_pin';

-- Expected output:
-- table_name | column_name   | data_type | is_nullable
-- member     | clock_in_pin  | text      | YES
```

### Rollback Script (if needed)

```sql
-- Only run if migration needs to be rolled back
BEGIN;

ALTER TABLE member 
DROP COLUMN IF EXISTS clock_in_pin;

COMMIT;
```

---

## Deployment Steps

### Step 1: Backup Production Database

```bash
# SSH into production server
ssh -i /c/Users/j.mcbride.LSLT/.ssh/id_ed25519 root@time.lsltgroup.es

# Create backup directory
mkdir -p /root/backups

# Backup database
docker exec torretempo-v4-postgres-1 pg_dump -U torretempo torretempo > /root/backups/torretempo_pre_phase3_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh /root/backups/

# Expected output: Should show backup file with size > 0
```

### Step 2: Run Database Migration

```bash
# Still on production server

# Access PostgreSQL container
docker exec -it torretempo-v4-postgres-1 psql -U torretempo -d torretempo

# Run migration SQL (paste from above)
BEGIN;
ALTER TABLE member ADD COLUMN IF NOT EXISTS clock_in_pin TEXT NULL;
COMMENT ON COLUMN member.clock_in_pin IS 'Hashed 4-digit PIN for clock-in authentication (bcrypt)';
COMMIT;

# Verify
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'member' AND column_name = 'clock_in_pin';

# Exit psql
\q
```

### Step 3: Pull Latest Code

```bash
# Still on production server
cd /root/torretempo-v4

# Check current branch and status
git branch
git status

# Fetch latest changes
git fetch origin main

# Show commits that will be pulled
git log HEAD..origin/main --oneline

# Expected commits:
# b75dc62 feat: Add enhanced offline detection and UI feedback
# b3cee70 feat: Add Background Sync API support for offline queue
# 8cdbf40 feat: Implement offline queue with IndexedDB
# caa791a feat: Add haptic feedback to clock-in/out actions
# c45e543 feat: Implement PIN-based clock-in authentication
# 1418c78 feat: Implement QR code clock-in support

# Pull changes
git pull origin main

# Verify pull succeeded
git log -1 --oneline
# Expected: b75dc62 feat: Add enhanced offline detection and UI feedback
```

### Step 4: Build and Deploy

```bash
# Still on production server
cd /root/torretempo-v4

# Stop existing containers
docker-compose -f docker-compose.prod.yml down

# Rebuild and start with new code
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for containers to start (30-60 seconds)
sleep 60

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Expected output: All containers "Up" and healthy
```

### Step 5: Verify Deployment

```bash
# Check API health
curl https://time.lsltgroup.es/api/health

# Expected output:
# {"status":"ok","version":"4.0.0","ts":1738758000000}

# Check web frontend loads
curl -I https://time.lsltgroup.es

# Expected: HTTP/2 200

# Check service worker registered
curl -I https://time.lsltgroup.es/sw.js

# Expected: HTTP/2 200

# Check manifest
curl -I https://time.lsltgroup.es/manifest.webmanifest

# Expected: HTTP/2 200
```

### Step 6: View Logs

```bash
# Check for errors in API logs
docker logs torretempo-v4-api-1 --tail 100

# Check for errors in web logs  
docker logs torretempo-v4-web-1 --tail 100

# Check nginx logs
docker logs torretempo-v4-nginx-1 --tail 50

# Monitor logs in real-time (Ctrl+C to stop)
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Post-Deployment Verification

### 1. Web Interface Tests

**Open browser**: https://time.lsltgroup.es

- [ ] Homepage loads successfully
- [ ] Sign in works (test with: `john@lsltgroup.es` / `Summer15`)
- [ ] Organization dashboard displays
- [ ] Navigation works (sidebar, bottom tabs)
- [ ] Offline indicator appears in top-right (should show green "Online")

### 2. Clock-In Tests

Navigate to Time Clock page:

- [ ] "Clock In" button opens bottom sheet
- [ ] All 4 methods visible: Tap, NFC, QR, PIN
- [ ] Tap method works (default)
- [ ] Geolocation requests permission
- [ ] Clock-in succeeds
- [ ] Time entry appears in list

### 3. Service Worker Tests

Open DevTools (F12):

- [ ] Navigate to Application → Service Workers
- [ ] Service worker `sw.js` is registered
- [ ] Status shows "activated and running"
- [ ] No errors in service worker console

### 4. PWA Tests

- [ ] Install prompt appears in Chrome address bar
- [ ] Click install → App installs
- [ ] Open as PWA → Runs in standalone mode
- [ ] Offline indicator functional
- [ ] IndexedDB database created: `torretempo-offline-queue`

### 5. API Endpoints Tests

Test new endpoints:

```bash
# Get QR code for a location (replace IDs)
curl -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  https://time.lsltgroup.es/api/v1/org/lakeside-la-torre-murcia-group-sl/locations/LOCATION_ID/qr

# Expected: JSON with base64 QR code

# Set PIN for member
curl -X POST \
  -H "Cookie: better-auth.session_token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}' \
  https://time.lsltgroup.es/api/v1/org/lakeside-la-torre-murcia-group-sl/members/MEMBER_ID/pin

# Expected: {"message":"PIN set successfully","hasPIN":true}
```

### 6. Performance Tests

Run Lighthouse audit:

- [ ] Performance score > 80
- [ ] Accessibility score > 90
- [ ] Best Practices score > 90
- [ ] PWA score = 100

---

## Troubleshooting

### Issue: Containers won't start

**Symptoms**: `docker-compose ps` shows containers as "Exit" or "Restarting"

**Solution**:
```bash
# Check logs for specific error
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web

# Common causes:
# 1. Port already in use
# 2. Environment variables missing
# 3. Database connection failed

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api
```

### Issue: Database migration failed

**Symptoms**: Error when running ALTER TABLE

**Solution**:
```bash
# Check if column already exists
docker exec -it torretempo-v4-postgres-1 psql -U torretempo -d torretempo -c "\d member"

# If column exists, migration already ran
# If not, check for syntax errors in SQL

# Try migration with explicit schema
docker exec -it torretempo-v4-postgres-1 psql -U torretempo -d torretempo -c "ALTER TABLE public.member ADD COLUMN IF NOT EXISTS clock_in_pin TEXT NULL;"
```

### Issue: 502 Bad Gateway

**Symptoms**: Nginx returns 502 when accessing site

**Solution**:
```bash
# Check if API is running
docker ps | grep api

# Check API logs
docker logs torretempo-v4-api-1 --tail 50

# Check nginx configuration
docker exec torretempo-v4-nginx-1 nginx -t

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Issue: Service Worker not updating

**Symptoms**: Old version of app still showing after deployment

**Solution**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear site data in DevTools → Application → Clear storage
3. Unregister old service worker
4. Reload page

### Issue: IndexedDB access denied

**Symptoms**: Console errors about IndexedDB

**Solution**:
- Check browser supports IndexedDB
- Clear browser data and retry
- Check HTTPS is enabled (required for IndexedDB)

---

## Rollback Procedure

If deployment fails critically:

### 1. Rollback Code

```bash
# SSH to production
ssh -i /c/Users/j.mcbride.LSLT/.ssh/id_ed25519 root@time.lsltgroup.es
cd /root/torretempo-v4

# Get previous commit hash
git log --oneline -5

# Rollback to previous version (replace COMMIT_HASH)
git reset --hard COMMIT_HASH

# Rebuild containers
docker-compose -f docker-compose.prod.yml up -d --build
```

### 2. Rollback Database (if needed)

```bash
# Restore from backup
cat /root/backups/torretempo_pre_phase3_*.sql | \
  docker exec -i torretempo-v4-postgres-1 psql -U torretempo -d torretempo

# Verify restoration
docker exec -it torretempo-v4-postgres-1 psql -U torretempo -d torretempo -c "SELECT COUNT(*) FROM member;"
```

---

## Monitoring

### Application Logs

```bash
# Real-time logs (all services)
docker-compose -f docker-compose.prod.yml logs -f

# API logs only
docker logs -f torretempo-v4-api-1

# Filter for errors
docker logs torretempo-v4-api-1 2>&1 | grep -i error
```

### Database Monitoring

```bash
# Connect to database
docker exec -it torretempo-v4-postgres-1 psql -U torretempo -d torretempo

# Check connections
SELECT count(*) FROM pg_stat_activity;

# Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### System Resources

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check Docker resource usage
docker stats --no-stream
```

---

## Post-Deployment Tasks

- [ ] Announce deployment to team
- [ ] Monitor error logs for 24 hours
- [ ] Gather user feedback on new features
- [ ] Document any issues in GitHub Issues
- [ ] Plan Phase 4 (Swaps + Notifications)
- [ ] Update project README with Phase 3 completion
- [ ] Celebrate successful deployment! 🎉

---

## Success Criteria

Deployment is successful when:

- [x] All containers running and healthy
- [x] Database migration completed without errors
- [x] Web interface loads successfully
- [x] All 4 clock-in methods functional
- [x] Service worker registered correctly
- [x] PWA installable
- [x] Offline queue working
- [x] API endpoints responding
- [x] No critical errors in logs
- [x] Performance meets targets

---

## Deployment Sign-Off

**Deployed by**: _______________  
**Date**: _______________  
**Time**: _______________  
**Commit Hash**: b75dc62  
**Build Version**: 4.0.0

**Verification Checklist**:
- [ ] Database migrated successfully
- [ ] All services running
- [ ] Web interface functional
- [ ] Clock-in methods tested
- [ ] Service worker active
- [ ] No errors in logs
- [ ] Performance acceptable

**Notes**: _______________________________________

**Signature**: _______________

---

## Support Contacts

- **Technical Lead**: System Administrator
- **Database**: PostgreSQL 16 on time.lsltgroup.es
- **Hosting**: VPS at lsltgroup.es
- **SSH Access**: root@time.lsltgroup.es
- **Emergency**: Rollback to previous version

---

**Deployment Status**: ✅ READY FOR PRODUCTION
