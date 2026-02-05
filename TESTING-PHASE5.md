# Torre Tempo V4 - Phase 5 Testing Guide

**Version**: 4.0.0  
**Phase**: 5 (Reports + Inspector API)  
**Updated**: February 5, 2026

---

## 🎯 Overview

This document provides comprehensive testing procedures for Phase 5 features:
- Reports API (tenant-facing endpoints)
- Inspector API (ITSS read-only access)
- Inspector Token Management
- Report Generation & PDF Workers
- Reports Frontend (pages and components)

**Prerequisites**:
- Docker and Docker Compose running
- PostgreSQL with test data seeded
- Redis running
- API server on port 3000
- Web app on port 5173

---

## 📋 Test Coverage

### Integration Tests (11 test suites)
1. ✅ Report Generation Flow
2. ✅ Report Calculation Accuracy
3. ✅ Inspector API Access Control
4. ✅ Inspector Token Lifecycle
5. ✅ RLS Isolation Verification
6. ✅ PDF Worker Processing
7. ✅ Monthly Worker Automation
8. ✅ Report Download Flow
9. ✅ Compliance Violation Detection
10. ✅ Variance Calculation
11. ✅ Payroll Calculation

---

## 🔐 Test Data Setup

### 1. Create Test Organization & Users

```bash
# SSH into production or use local Docker
docker-compose exec api npx tsx scripts/seed-test-data.ts
```

**Manual Setup** (if script doesn't exist):

```sql
-- Connect to PostgreSQL
psql -U torretempo -d torretempo

-- Create test organization
INSERT INTO organization (id, name, slug, created_at)
VALUES ('test_org_001', 'Test Organization', 'test-org', NOW());

-- Create test users
INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
VALUES 
  ('test_user_001', 'Test Employee', 'employee@test.com', true, NOW(), NOW()),
  ('test_user_002', 'Test Manager', 'manager@test.com', true, NOW(), NOW()),
  ('test_user_003', 'Test Admin', 'admin@test.com', true, NOW(), NOW());

-- Create members with roles
INSERT INTO member ("userId", "organizationId", role, "createdAt")
VALUES 
  ('test_user_001', 'test_org_001', 'employee', NOW()),
  ('test_user_002', 'test_org_001', 'manager', NOW()),
  ('test_user_003', 'test_org_001', 'tenantAdmin', NOW());

-- Create test location
INSERT INTO locations (id, organization_id, name, address, latitude, longitude, geofence_radius, created_at)
VALUES ('test_loc_001', 'test_org_001', 'Test Location', '123 Test St', 40.7128, -74.0060, 100, NOW());

-- Create test shifts (January 2026)
INSERT INTO shifts (id, organization_id, user_id, location_id, start_time, end_time, break_minutes, status, created_by, created_at)
VALUES 
  ('shift_001', 'test_org_001', 'test_user_001', 'test_loc_001', '2026-01-06 09:00:00+00', '2026-01-06 17:00:00+00', 30, 'completed', 'test_user_002', NOW()),
  ('shift_002', 'test_org_001', 'test_user_001', 'test_loc_001', '2026-01-07 09:00:00+00', '2026-01-07 17:00:00+00', 30, 'completed', 'test_user_002', NOW()),
  ('shift_003', 'test_org_001', 'test_user_001', 'test_loc_001', '2026-01-08 09:00:00+00', '2026-01-08 17:00:00+00', 30, 'completed', 'test_user_002', NOW()),
  ('shift_004', 'test_org_001', 'test_user_001', 'test_loc_001', '2026-01-09 09:00:00+00', '2026-01-09 17:00:00+00', 30, 'completed', 'test_user_002', NOW()),
  ('shift_005', 'test_org_001', 'test_user_001', 'test_loc_001', '2026-01-10 09:00:00+00', '2026-01-10 17:00:00+00', 30, 'completed', 'test_user_002', NOW());

-- Create test time entries (actual worked time)
INSERT INTO time_entries (id, organization_id, user_id, linked_shift_id, entry_date, clock_in, clock_out, break_minutes, total_minutes, status, created_at)
VALUES 
  ('entry_001', 'test_org_001', 'test_user_001', 'shift_001', '2026-01-06', '2026-01-06 09:00:00+00', '2026-01-06 17:30:00+00', 30, 480, 'completed', NOW()),
  ('entry_002', 'test_org_001', 'test_user_001', 'shift_002', '2026-01-07', '2026-01-07 09:00:00+00', '2026-01-07 17:00:00+00', 30, 450, 'completed', NOW()),
  ('entry_003', 'test_org_001', 'test_user_001', 'shift_003', '2026-01-08', '2026-01-08 09:00:00+00', '2026-01-08 17:00:00+00', 30, 450, 'completed', NOW()),
  ('entry_004', 'test_org_001', 'test_user_001', 'shift_004', '2026-01-09', '2026-01-09 09:00:00+00', '2026-01-09 18:00:00+00', 30, 510, 'completed', NOW()),
  ('entry_005', 'test_org_001', 'test_user_001', 'shift_005', '2026-01-10', '2026-01-10 09:00:00+00', '2026-01-10 17:00:00+00', 30, 450, 'completed', NOW());
```

**Expected Test Data**:
- 1 organization (test-org)
- 3 users (employee, manager, admin)
- 1 location
- 5 shifts (8 hours each, 30 min break = 7.5h worked)
- 5 time entries (30 min overtime on day 1, 1h overtime on day 4)
- Total hours: 39.5 hours (shift 1: 8h, shift 2-3-5: 7.5h, shift 4: 8.5h)

---

## 🧪 Test Suite 1: Report Generation Flow

### Test 1.1: Generate Monthly Report (Happy Path)

**Endpoint**: `POST /api/v1/org/test-org/reports/generate`

**Setup**:
1. Get session token for test_user_003 (admin)
2. Ensure January 2026 has time entry data

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/org/test-org/reports/generate \
  -H "Cookie: better-auth.session_token=<session_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_001",
    "year": 2026,
    "month": 1
  }'
```

**Expected Response** (201):
```json
{
  "reportId": "<uuid>",
  "message": "Report generation started",
  "status": "generating"
}
```

**Verify Database**:
```sql
SELECT * FROM monthly_summaries 
WHERE organization_id = 'test_org_001' 
  AND user_id = 'test_user_001' 
  AND year = 2026 
  AND month = 1;
```

**Expected**:
- `total_hours`: 39.50
- `total_days`: 5
- `overtime_hours`: 1.50 (30 min + 1 hour overtime)
- `pdf_url`: NULL (initially)
- `generated_at`: NOT NULL

**Verify PDF Queue**:
```sql
-- Check Redis for pdfQueue job
redis-cli KEYS "bull:pdf:*"
```

---

### Test 1.2: Generate Report (Permission Check - Employee)

**Endpoint**: `POST /api/v1/org/test-org/reports/generate`

**Setup**: Get session token for test_user_001 (employee)

**Request**:
```bash
curl -X POST http://localhost:3000/api/v1/org/test-org/reports/generate \
  -H "Cookie: better-auth.session_token=<employee_session>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_002",
    "year": 2026,
    "month": 1
  }'
```

**Expected Response** (403):
```json
{
  "error": "Forbidden"
}
```

**Rationale**: Employee can only generate own reports, not other users'

---

### Test 1.3: Fetch Monthly Report

**Endpoint**: `GET /api/v1/org/test-org/reports/monthly/2026/1`

**Setup**: Use admin session, report already generated

**Request**:
```bash
curl http://localhost:3000/api/v1/org/test-org/reports/monthly/2026/1?user_id=test_user_001 \
  -H "Cookie: better-auth.session_token=<admin_session>"
```

**Expected Response** (200):
```json
{
  "report": {
    "id": "<uuid>",
    "organizationId": "test_org_001",
    "userId": "test_user_001",
    "year": 2026,
    "month": 1,
    "totalHours": "39.50",
    "totalDays": 5,
    "overtimeHours": "1.50",
    "pdfUrl": null,
    "generatedAt": "2026-02-05T13:00:00.000Z",
    "deliveredAt": null,
    "deliveryMethod": null,
    "createdAt": "2026-02-05T13:00:00.000Z"
  }
}
```

---

## 🧪 Test Suite 2: Report Calculation Accuracy

### Test 2.1: Variance Report Calculation

**Expected Behavior**:
- Scheduled: 5 shifts × 7.5 hours = 37.5 hours
- Actual: 39.5 hours (from time entries)
- Variance: +2 hours (5.3% over)

**Endpoint**: Generate report and verify `variance` field

**Verification SQL**:
```sql
-- Calculate scheduled hours
SELECT 
  SUM(
    EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 
    - (break_minutes / 60.0)
  ) as scheduled_hours
FROM shifts
WHERE organization_id = 'test_org_001'
  AND user_id = 'test_user_001'
  AND start_time >= '2026-01-01'
  AND start_time < '2026-02-01'
  AND status = 'completed';

-- Calculate actual hours
SELECT 
  SUM(total_minutes / 60.0) as actual_hours
FROM time_entries
WHERE organization_id = 'test_org_001'
  AND user_id = 'test_user_001'
  AND entry_date >= '2026-01-01'
  AND entry_date < '2026-02-01'
  AND status = 'completed';
```

**Expected**:
- Scheduled: 37.5 hours
- Actual: 39.5 hours
- Variance: +2.0 hours

---

### Test 2.2: Overtime Calculation

**Expected Behavior**:
- Week 1 (Jan 6-10): 39.5 hours worked
- Overtime: 0 hours (under 40h/week)

**Note**: Test data needs to exceed 40h/week to trigger overtime. Modify test data:

```sql
-- Add 6th shift to exceed 40h/week
INSERT INTO time_entries (id, organization_id, user_id, entry_date, clock_in, clock_out, break_minutes, total_minutes, status, created_at)
VALUES ('entry_006', 'test_org_001', 'test_user_001', '2026-01-11', '2026-01-11 09:00:00+00', '2026-01-11 17:00:00+00', 30, 450, 'completed', NOW());
```

**Now**:
- Week 2 (Jan 11-17): 7.5 hours worked
- Total week hours: 47 hours
- Overtime: 7 hours (47 - 40)

---

### Test 2.3: Compliance Violation Detection

**Test Scenario**: 12-hour rest violation

**Setup**:
```sql
-- Create shift ending at 22:00
INSERT INTO shifts (id, organization_id, user_id, location_id, start_time, end_time, break_minutes, status, created_by, created_at)
VALUES ('shift_late', 'test_org_001', 'test_user_001', 'test_loc_001', '2026-01-13 14:00:00+00', '2026-01-13 22:00:00+00', 30, 'completed', 'test_user_002', NOW());

-- Create shift starting at 07:00 next day (9 hours rest - VIOLATION)
INSERT INTO shifts (id, organization_id, user_id, location_id, start_time, end_time, break_minutes, status, created_by, created_at)
VALUES ('shift_early', 'test_org_001', 'test_user_001', 'test_loc_001', '2026-01-14 07:00:00+00', '2026-01-14 15:00:00+00', 30, 'completed', 'test_user_002', NOW());
```

**Generate Compliance Report**:
```bash
# Call report generation with compliance check
# Verify violations array includes:
```

**Expected Violation**:
```json
{
  "type": "12h_rest",
  "date": "2026-01-14",
  "severity": "error",
  "message": "Only 9 hours rest between shifts (minimum 12 hours required)",
  "affectedShifts": ["shift_late", "shift_early"],
  "correctionStatus": "pending"
}
```

---

## 🔐 Test Suite 3: Inspector API Access Control

### Test 3.1: Generate Inspector Token

**Endpoint**: `POST /api/admin/test-org/inspector-tokens`

**Setup**: Get admin session token

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/test-org/inspector-tokens \
  -H "Cookie: better-auth.session_token=<admin_session>" \
  -H "Content-Type: application/json" \
  -d '{
    "issued_to": "ITSS Inspector Madrid",
    "expires_in_days": 30
  }'
```

**Expected Response** (201):
```json
{
  "token": "itt_<64-hex-characters>",
  "expires_at": "2026-03-07T13:00:00.000Z",
  "token_id": "<uuid>",
  "message": "Token generated successfully. Save this token - it cannot be retrieved again."
}
```

**⚠️ CRITICAL**: Save the `token` value - it's shown only once!

**Verify Database**:
```sql
SELECT id, organization_id, issued_to, expires_at, revoked_at, created_at 
FROM inspector_tokens 
WHERE organization_id = 'test_org_001'
ORDER BY created_at DESC LIMIT 1;
```

**Verify SHA-256 Hashing**:
```javascript
// Token should be hashed
const crypto = require('crypto');
const token = 'itt_<64-hex-from-response>';
const hash = crypto.createHash('sha256').update(token).digest('hex');
console.log(hash); // Should match token_hash in database
```

---

### Test 3.2: Access Inspector API with Valid Token

**Endpoint**: `GET /api/inspector/v1/time-entries`

**Setup**: Use token from Test 3.1

**Request**:
```bash
curl http://localhost:3000/api/inspector/v1/time-entries \
  -H "Authorization: Bearer <inspector_token>"
```

**Expected Response** (200):
```json
{
  "data": [
    {
      "id": "entry_005",
      "organizationId": "test_org_001",
      "userId": "test_user_001",
      "userName": "Test Employee",
      "entryDate": "2026-01-10",
      "clockIn": "2026-01-10T09:00:00.000Z",
      "clockOut": "2026-01-10T17:00:00.000Z",
      "breakMinutes": 30,
      "totalMinutes": 450,
      "status": "completed"
    },
    // ... more entries
  ],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

**Verify Admin Audit Log**:
```sql
SELECT * FROM admin_audit_log 
WHERE action = 'inspector_access'
ORDER BY created_at DESC LIMIT 1;
```

**Expected**: Log entry with inspector token ID and accessed endpoint

---

### Test 3.3: Access Denied - Expired Token

**Setup**: 
1. Generate token with `expires_in_days: 1`
2. Manually update database to expire immediately:

```sql
UPDATE inspector_tokens 
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE id = '<token_id>';
```

**Request**:
```bash
curl http://localhost:3000/api/inspector/v1/time-entries \
  -H "Authorization: Bearer <expired_token>"
```

**Expected Response** (401):
```json
{
  "error": "Token expired"
}
```

---

### Test 3.4: Access Denied - Revoked Token

**Setup**: Revoke token via admin endpoint

**Request**:
```bash
curl -X DELETE http://localhost:3000/api/admin/test-org/inspector-tokens/<token_id> \
  -H "Cookie: better-auth.session_token=<admin_session>"
```

**Then try to use revoked token**:
```bash
curl http://localhost:3000/api/inspector/v1/time-entries \
  -H "Authorization: Bearer <revoked_token>"
```

**Expected Response** (401):
```json
{
  "error": "Token revoked"
}
```

---

## 🔒 Test Suite 4: RLS Isolation Verification

### Test 4.1: Inspector Cannot Access Other Organizations

**Setup**:
1. Create second test organization (`test_org_002`)
2. Generate inspector token for `test_org_001`
3. Try to access `test_org_002` data

**Request**:
```bash
curl "http://localhost:3000/api/inspector/v1/time-entries?organization_id=test_org_002" \
  -H "Authorization: Bearer <test_org_001_token>"
```

**Expected Behavior**:
- Query parameter `organization_id` should be ignored
- RLS automatically filters by token's organization
- Returns empty array or only `test_org_001` data

**Verification**:
```sql
-- Check RLS is active
SHOW row_security;  -- Should be 'on'

-- Check time_entries policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'time_entries';
```

**Expected Policy**:
```sql
(organization_id = current_setting('app.organization_id'::text))
```

---

### Test 4.2: Cross-Tenant Isolation Verification

**Setup**:
1. Create time entries for both organizations
2. Generate inspector token for org 1
3. Verify can only see org 1 data

**Verification SQL** (as superuser):
```sql
-- Disable RLS to see all data
SET row_security = off;

SELECT organization_id, COUNT(*) 
FROM time_entries 
GROUP BY organization_id;

-- Re-enable RLS
SET row_security = on;

-- Set org context (simulating inspector middleware)
SET LOCAL app.organization_id = 'test_org_001';

-- This should only return test_org_001 data
SELECT organization_id, COUNT(*) 
FROM time_entries 
GROUP BY organization_id;
```

**Expected**: Only `test_org_001` rows visible with RLS enabled

---

## 📄 Test Suite 5: PDF Worker Processing

### Test 5.1: PDF Generation for Monthly Summary

**Setup**:
1. Generate monthly report (creates PDF queue job)
2. Start PDF worker: `npx tsx apps/api/src/workers/pdf.worker.ts`

**Verify Job Processing**:
```bash
# Check Redis for job
redis-cli
> KEYS "bull:pdf:*"
> HGETALL "bull:pdf:<job_id>"
```

**Expected Job Data**:
```json
{
  "type": "monthly_summary",
  "organizationId": "test_org_001",
  "data": {
    "summaryId": "<uuid>",
    "userName": "Test Employee",
    "month": 1,
    "year": 2026,
    "totalHours": "39.50",
    "totalDays": 5,
    "overtimeHours": "1.50"
  }
}
```

**Verify PDF Created**:
```bash
ls -lh apps/api/public/pdfs/
# Should see: monthly_summary_test_org_001_<timestamp>.pdf
```

**Verify Database Updated**:
```sql
SELECT pdf_url, generated_at 
FROM monthly_summaries 
WHERE id = '<report_id>';
```

**Expected**:
- `pdf_url`: `/api/public/pdfs/monthly_summary_test_org_001_<timestamp>.pdf`
- `generated_at`: NOT NULL

**Test PDF Download**:
```bash
curl http://localhost:3000<pdf_url> -o test_report.pdf
# Open test_report.pdf to verify content
```

---

### Test 5.2: PDF Worker Error Handling

**Setup**: Queue job with invalid data

**Request**:
```javascript
// Use BullMQ client or API
await pdfQueue.add('invalid-job', {
  type: 'monthly_summary',
  organizationId: 'test_org_001',
  data: {
    // Missing required fields
    summaryId: null
  }
});
```

**Expected Behavior**:
- Job fails with error message
- BullMQ retries job (3 attempts)
- After 3 failures, job moved to 'failed' set

**Verify**:
```bash
redis-cli
> KEYS "bull:pdf:failed"
> LRANGE "bull:pdf:failed" 0 -1
```

---

## 🔄 Test Suite 6: Monthly Worker Automation

### Test 6.1: Generate All Monthly Summaries

**Setup**: Start monthly worker: `npx tsx apps/api/src/workers/monthly.worker.ts`

**Queue Job**:
```javascript
import { monthlyQueue } from './apps/api/src/lib/queue.js';

await monthlyQueue.add('generate-summaries', {
  type: 'generate_summaries',
  year: 2026,
  month: 1
  // No organizationId = process all orgs
});
```

**Expected Behavior**:
1. Queries all organizations
2. For each org, queries all active members
3. Processes users in batches of 10
4. Generates report for each user with time entries
5. Queues PDF job for each report
6. Logs progress to console

**Verify**:
```sql
-- Check reports generated for all users
SELECT user_id, COUNT(*) 
FROM monthly_summaries 
WHERE year = 2026 AND month = 1
GROUP BY user_id;
```

**Check Worker Logs**:
```
🗓️  Monthly worker: Processing generate_summaries for 2026-1
📊 Processing organization test_org_001...
👤 Processing batch 1/1 (3 users)
✅ Generated report for test_user_001: 39.50 hours
⏭️  Skipped test_user_002: 0 hours worked
⏭️  Skipped test_user_003: 0 hours worked
✅ Organization test_org_001 complete: 1 reports generated
```

---

### Test 6.2: Send Monthly Reports via Email

**Setup**: Ensure reports have `delivery_method = 'email'`

```sql
UPDATE monthly_summaries 
SET delivery_method = 'email'
WHERE year = 2026 AND month = 1;
```

**Queue Job**:
```javascript
await monthlyQueue.add('send-reports', {
  type: 'send_reports',
  year: 2026,
  month: 1
});
```

**Expected Behavior**:
1. Queries reports with `delivery_method = 'email'` and `delivered_at IS NULL`
2. For each report, queues email job
3. Updates `delivered_at` timestamp

**Verify**:
```sql
SELECT user_id, delivered_at 
FROM monthly_summaries 
WHERE year = 2026 AND month = 1 AND delivery_method = 'email';
```

**Check Email Queue**:
```bash
redis-cli KEYS "bull:email:*"
```

---

## 🌐 Test Suite 7: Frontend Report Pages

### Test 7.1: Reports Index Page

**URL**: `http://localhost:5173/t/test-org/reports`

**Setup**: Login as admin (test_user_003)

**Test Cases**:
1. **Initial Load**
   - ✅ Page renders without errors
   - ✅ Shows "Reports" header
   - ✅ Displays year/month filter dropdowns
   - ✅ Shows "Generate Report" button

2. **Filter Functionality**
   - ✅ Change year dropdown → refetches reports
   - ✅ Change month dropdown → refetches reports
   - ✅ User selector visible for manager/admin only
   - ✅ Filter state persists in URL query params

3. **Report Cards**
   - ✅ Displays ReportCard for each report
   - ✅ Shows total hours, overtime badge
   - ✅ Status indicator (generating/ready/error)
   - ✅ Download PDF button (when ready)
   - ✅ Hover animation (scale 1.02)

4. **Empty State**
   - ✅ Shows friendly message when no reports
   - ✅ "Generate Report" CTA button visible
   - ✅ Empty state has proper glassmorphism styling

5. **Loading State**
   - ✅ Skeleton cards while fetching
   - ✅ Skeletons match glassmorphism theme
   - ✅ Smooth transition to actual cards

6. **Mobile Responsiveness**
   - ✅ Cards stack on mobile (1 column)
   - ✅ Filters collapse into panel
   - ✅ Touch targets ≥ 44px
   - ✅ Bottom nav bar visible

**Browser Console Checks**:
- ❌ No React errors
- ❌ No API errors (404, 500)
- ❌ No TypeScript errors

---

### Test 7.2: Report Detail Page

**URL**: `http://localhost:5173/t/test-org/reports/<report_id>`

**Test Cases**:
1. **Tab Navigation**
   - ✅ 4 tabs visible: Summary, Variance, Payroll, Compliance
   - ✅ Click tab → smooth transition
   - ✅ Active tab highlighted (emerald-500)
   - ✅ Tab content changes with animation

2. **Summary Tab**
   - ✅ Shows total hours card
   - ✅ Shows total days card
   - ✅ Shows overtime hours card
   - ✅ Cards have glassmorphism styling

3. **Variance Tab**
   - ✅ VarianceChart renders (Recharts bar chart)
   - ✅ Two bars per date: Scheduled (emerald), Actual (amber)
   - ✅ Tooltip shows details on hover
   - ✅ Summary stats below chart

4. **Payroll Tab**
   - ✅ PayrollBreakdown table renders
   - ✅ Rows: Regular hours, Overtime hours, Gross pay, Deductions, Net pay
   - ✅ Numbers right-aligned
   - ✅ Net pay highlighted (larger, bold)

5. **Compliance Tab**
   - ✅ Circular progress shows compliance score
   - ✅ Violations list grouped by type
   - ✅ Color-coded by severity (red/amber)
   - ✅ Shows "100% Compliant" if no violations

6. **Download Button**
   - ✅ "Download PDF" button visible in header
   - ✅ Button disabled if PDF not ready
   - ✅ Click → downloads PDF file
   - ✅ Loading spinner while downloading

---

### Test 7.3: Generate Report Modal

**Trigger**: Click "Generate Report" button on index page

**Test Cases**:
1. **Modal Opens**
   - ✅ Modal appears with animation
   - ✅ Backdrop blur visible
   - ✅ Modal centered on screen

2. **Form Fields**
   - ✅ Year dropdown (current year default)
   - ✅ Month dropdown (current month default)
   - ✅ User selector (admin only)
   - ✅ Report type selector (optional)

3. **Validation**
   - ✅ Submit without selection → error message
   - ✅ Invalid year → error message
   - ✅ Invalid month → error message

4. **Submit Flow**
   - ✅ Click "Generate" → loading spinner
   - ✅ Success → modal closes with animation
   - ✅ Success message toast appears
   - ✅ Reports list refetches automatically
   - ✅ New report appears with "generating" status

5. **Cancel Button**
   - ✅ Click "Cancel" → modal closes
   - ✅ No API call made
   - ✅ Form resets

---

## 📊 Test Suite 8: Report Calculations Deep Dive

### Test 8.1: Weekly Overtime Calculation

**Scenario**: Employee works 45 hours in one week

**Setup**:
```sql
-- Clear existing entries
DELETE FROM time_entries WHERE user_id = 'test_user_001';

-- Week starting Monday Jan 6, 2026
INSERT INTO time_entries (id, organization_id, user_id, entry_date, clock_in, clock_out, break_minutes, total_minutes, status, created_at)
VALUES 
  ('w1_mon', 'test_org_001', 'test_user_001', '2026-01-06', '2026-01-06 09:00:00+00', '2026-01-06 18:00:00+00', 30, 510, 'completed', NOW()), -- 8.5h
  ('w1_tue', 'test_org_001', 'test_user_001', '2026-01-07', '2026-01-07 09:00:00+00', '2026-01-07 18:00:00+00', 30, 510, 'completed', NOW()), -- 8.5h
  ('w1_wed', 'test_org_001', 'test_user_001', '2026-01-08', '2026-01-08 09:00:00+00', '2026-01-08 18:00:00+00', 30, 510, 'completed', NOW()), -- 8.5h
  ('w1_thu', 'test_org_001', 'test_user_001', '2026-01-09', '2026-01-09 09:00:00+00', '2026-01-09 18:00:00+00', 30, 510, 'completed', NOW()), -- 8.5h
  ('w1_fri', 'test_org_001', 'test_user_001', '2026-01-10', '2026-01-10 09:00:00+00', '2026-01-10 18:30:00+00', 30, 540, 'completed', NOW()); -- 9h
```

**Total Week Hours**: 8.5 + 8.5 + 8.5 + 8.5 + 9 = 43 hours  
**Expected Overtime**: 3 hours (43 - 40)

**Generate Report**:
```bash
curl -X POST http://localhost:3000/api/v1/org/test-org/reports/generate \
  -H "Cookie: better-auth.session_token=<admin_session>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user_001", "year": 2026, "month": 1}'
```

**Verify**:
```sql
SELECT overtime_hours FROM monthly_summaries 
WHERE user_id = 'test_user_001' AND year = 2026 AND month = 1;
```

**Expected**: `overtime_hours = 3.00`

---

### Test 8.2: Multi-Week Overtime Aggregation

**Scenario**: 4 weeks in January, some with overtime

**Setup**:
```sql
-- Week 1: 43 hours (3h OT)
-- Week 2: 38 hours (0h OT)
-- Week 3: 42 hours (2h OT)
-- Week 4: 40 hours (0h OT)
-- Total: 163 hours worked, 5 hours overtime
```

**Expected Monthly Report**:
- `total_hours`: 163.00
- `overtime_hours`: 5.00
- `total_days`: 20

---

## 🎯 Success Criteria Summary

### Integration Tests (Pass/Fail)

| Test Suite | Test Cases | Critical | Status |
|------------|------------|----------|--------|
| Report Generation Flow | 3 | ✅ | ⏳ |
| Calculation Accuracy | 3 | ✅ | ⏳ |
| Inspector Access Control | 4 | ✅ | ⏳ |
| RLS Isolation | 2 | ✅ | ⏳ |
| PDF Worker | 2 | 🟡 | ⏳ |
| Monthly Worker | 2 | 🟡 | ⏳ |
| Frontend Pages | 3 | 🟡 | ⏳ |
| Calculation Deep Dive | 2 | ✅ | ⏳ |

**Legend**:
- ✅ Critical (must pass)
- 🟡 Important (should pass)
- ⏳ Pending execution

---

## 🚀 Running All Tests (Manual Execution)

### Quick Test Script

```bash
#!/bin/bash
# test-phase5.sh

echo "🧪 Torre Tempo Phase 5 - Integration Tests"
echo "=========================================="

# Setup
export API_URL="http://localhost:3000"
export SESSION_TOKEN="<your_admin_session_token>"
export ORG_SLUG="test-org"

# Test 1: Generate Report
echo "\n📊 Test 1: Generate Monthly Report"
curl -X POST "$API_URL/api/v1/org/$ORG_SLUG/reports/generate" \
  -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "test_user_001", "year": 2026, "month": 1}' \
  | jq .

# Test 2: Fetch Report
echo "\n📄 Test 2: Fetch Monthly Report"
curl "$API_URL/api/v1/org/$ORG_SLUG/reports/monthly/2026/1?user_id=test_user_001" \
  -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
  | jq .

# Test 3: Generate Inspector Token
echo "\n🔐 Test 3: Generate Inspector Token"
TOKEN_RESPONSE=$(curl -X POST "$API_URL/api/admin/$ORG_SLUG/inspector-tokens" \
  -H "Cookie: better-auth.session_token=$SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"issued_to": "Test Inspector", "expires_in_days": 30}')

INSPECTOR_TOKEN=$(echo $TOKEN_RESPONSE | jq -r .token)
echo "Token: $INSPECTOR_TOKEN"

# Test 4: Access Inspector API
echo "\n🔍 Test 4: Inspector API Access"
curl "$API_URL/api/inspector/v1/time-entries?limit=5" \
  -H "Authorization: Bearer $INSPECTOR_TOKEN" \
  | jq .

echo "\n✅ All tests complete!"
```

**Usage**:
```bash
chmod +x test-phase5.sh
./test-phase5.sh
```

---

## 📝 Test Report Template

After running tests, document results:

```markdown
# Phase 5 Test Execution Report

**Date**: YYYY-MM-DD  
**Tester**: [Name]  
**Environment**: [Local/Production]

## Test Results

### Report Generation Flow
- ✅ Test 1.1: Generate Monthly Report - PASSED
- ✅ Test 1.2: Permission Check - PASSED
- ✅ Test 1.3: Fetch Report - PASSED

### Calculation Accuracy
- ✅ Test 2.1: Variance Calculation - PASSED
- ❌ Test 2.2: Overtime Calculation - FAILED
  - Expected: 5.00 hours
  - Actual: 3.00 hours
  - Issue: Week boundary calculation error

... [continue for all tests]

## Critical Issues
1. [Issue description]
2. [Issue description]

## Non-Critical Issues
1. [Issue description]

## Overall Status: ✅ PASSED / ❌ FAILED
```

---

## 🔍 Debugging Tips

### Common Issues

1. **RLS Not Working**
   - Check `row_security` is ON
   - Verify `app.organization_id` is set
   - Check policy definitions

2. **PDF Generation Fails**
   - Check `pdfkit` is installed
   - Verify `public/pdfs/` directory exists
   - Check worker logs for errors

3. **Inspector Token Invalid**
   - Verify token format: `itt_<64-hex-chars>`
   - Check token not expired/revoked
   - Verify SHA-256 hash matches database

4. **Report Calculations Wrong**
   - Verify timezone handling (all UTC)
   - Check week start (Monday)
   - Verify break minutes subtracted

---

## ✅ Phase 5 Testing Complete

All tests documented. Execute manually using procedures above.

**Next Steps**:
1. Run tests against local development environment
2. Document any failures
3. Fix issues and re-test
4. Run tests against staging environment
5. Sign off for production deployment

---

**Version**: 4.0.0  
**Phase**: 5 (Reports + Inspector API)  
**Status**: Testing procedures documented ✅
