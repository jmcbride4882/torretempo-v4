# Plan: Trial Period Handling (Task 20)

## TL;DR

> **Quick Summary**: Implement scheduled trial period management with automated expiration checks, notifications, and grace period handling.
> 
> **Deliverables**: Daily trial worker, email notifications, trial extension API, status monitoring.
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (worker depends on existing services)
> **Critical Path**: Worker setup → Trial check logic → Email notifications → Admin endpoints

---

## Context

### Original Request
Task 20: Trial Period Handling - Need scheduled job for trial expiry checks and notifications

### Interview Summary
- Trial period: 14 days from organization creation
- Reminder: 3 days before expiry
- Grace period: 2 days after expiry before downgrade
- Existing schema has `trial_ends_at` field ready
- Email queue system available for notifications

### Research Findings
- `subscription_details` table has `trial_ends_at` and `subscription_status` fields
- Email queue system (`emailQueue`) already implemented
- Payment services exist for subscription cancellation
- Admin endpoints can be extended for trial management

---

## Work Objectives

### Core Objective
Implement automated trial period management with scheduled checks, notifications, and graceful transitions.

### Concrete Deliverables
- `apps/api/src/workers/trial.worker.ts` - Daily trial check worker
- Trial status API endpoints for admin monitoring
- Email notifications for trial reminders, expiry, and extensions
- Trial extension endpoint for admin use

### Definition of Done
- [ ] Daily scheduled job runs without errors
- [ ] Trial reminders sent 3 days before expiry
- [ ] Payment prompts sent after trial expiry (within 2 days)
- [ ] Downgrades to free tier after 2-day grace period
- [ ] Trial extension API works for admin users
- [ ] All trial status queries return accurate data

### Must Have
- Automated daily trial checks
- Email notifications for all trial lifecycle events
- Graceful downgrade to free tier
- Trial extension capability
- Comprehensive logging

### Must NOT Have (Guardrails)
- Manual trial management required
- Silent trial expirations without notifications
- Hard deletes of subscription data
- Inconsistent trial status across systems

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (emailQueue, payment services)
- **Automated tests**: NO (Tests-after - Agent-Executed QA)
- **Framework**: Agent-Executed QA Scenarios (mandatory)

### Agent-Executed QA Scenarios

**Scenario: Daily trial check runs successfully**
  Tool: interactive_bash (tmux)
  Preconditions: Worker scheduled, test organizations with various trial states
  Steps:
    1. tmux new-session: node apps/api/src/workers/trial.worker.js
    2. Wait for: "Trial worker setup complete" in output (timeout: 5s)
    3. Assert: No errors in console output
    4. Assert: Worker exits with code 0
    5. Check database: trial status updates applied
  Expected Result: Worker completes without errors, trial statuses updated
  Evidence: Terminal output captured

**Scenario: Trial reminder sent 3 days before expiry**
  Tool: interactive_bash (tmux)
  Preconditions: Test organization with trial ending in 3 days
  Steps:
    1. Run trial check manually: node -e "require('./apps/api/src/workers/trial.worker').checkTrialExpirations()"
    2. Wait for: "Sent trial reminder" in output (timeout: 10s)
    3. Check email queue: Verify 'trial-reminder' job exists
    4. Assert: Job contains correct daysUntilTrialEnds (3)
  Expected Result: Email job queued with correct parameters
  Evidence: Email queue inspection output

**Scenario: Trial extension works for admin**
  Tool: interactive_bash (tmux)
  Preconditions: Test organization in trial status
  Steps:
    1. tmux new-session: node -e "require('./apps/api/src/workers/trial.worker').extendTrialPeriod('test-org-id', 7)"
    2. Wait for: "Trial extended" in output (timeout: 5s)
    3. Check database: trial_ends_at increased by 7 days
    4. Check email queue: Verify 'trial-extended' job exists
  Expected Result: Trial extended by 7 days, email notification sent
  Evidence: Database query output, email queue inspection

---

## Execution Strategy

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4 | None |
| 3 | 1 | 4 | None |
| 4 | 2, 3 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 (Worker setup) | task(category="unspecified-high", load_skills=["typescript"], run_in_background=false) |
| 2 | 2 (Trial logic) | task(category="unspecified-high", load_skills=["typescript"], run_in_background=false) |
| 3 | 3 (Email integration) | task(category="unspecified-high", load_skills=["typescript"], run_in_background=false) |
| 4 | 4 (Admin endpoints) | task(category="unspecified-high", load_skills=["typescript"], run_in_background=false) |

---

## TODOs

- [ ] 1. Create trial worker file and basic structure

  **What to do**:
  - Create `apps/api/src/workers/trial.worker.ts`
  - Add worker setup and basic logging
  - Import required dependencies (db, emailQueue, logger)

  **Must NOT do**:
  - Add actual scheduled job execution (handled by queue system)
  - Hardcode trial logic

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `unspecified-high`
    - Reason: Complex business logic with multiple time-based conditions
  - **Skills**: [`typescript`]
    - `typescript`: Strong typing for date calculations and database operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (first task)
  - **Blocks**: 2, 3, 4
  - **Blocked By**: None (can start immediately)

  **References**:
  - `apps/api/src/workers/trial.worker.ts` - New file to create
  - `apps/api/src/lib/queue.ts` - Queue system pattern
  - `apps/api/src/lib/logger.js` - Logging pattern

  **Acceptance Criteria**:
  - [ ] File created at `apps/api/src/workers/trial.worker.ts`
  - [ ] Basic worker structure with logging
  - [ ] TypeScript compilation passes

  **Agent-Executed QA Scenarios**:
  
  **Scenario: Worker file created with basic structure**
    Tool: interactive_bash (tmux)
    Preconditions: None
    Steps:
      1. tmux new-session: ls apps/api/src/workers/trial.worker.ts
      2. Assert: File exists
      3. tmux new-session: head -10 apps/api/src/workers/trial.worker.ts
      4. Assert: Contains basic worker structure and imports
    Expected Result: File exists with proper structure
    Evidence: Terminal output captured

  **Evidence to Capture**:
  - [ ] File creation verification
  - [ ] Basic structure validation

  **Commit**: YES (first commit in wave)
  - Message: `feat: add trial period worker`
  - Files: `apps/api/src/workers/trial.worker.ts`
  - Pre-commit: `npm run lint && npm run build`

---

- [ ] 2. Implement trial expiration check logic

  **What to do**:
  - Add `checkTrialExpirations()` function
  - Implement 3-day reminder, 2-day grace period logic
  - Add database queries for trial status checks
  - Add comprehensive error handling

  **Must NOT do**:
  - Send actual emails (just queue them)
  - Modify existing subscription logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex date calculations and business logic
  - **Skills**: [`typescript`, `database`]
    - `typescript`: Type-safe date operations
    - `database`: Drizzle ORM queries and patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on task 1)
  - **Blocks**: 4
  - **Blocked By**: 1

  **References**:
  - `apps/api/src/workers/trial.worker.ts` - Add checkTrialExpirations function
  - `apps/api/src/db/schema.ts:subscription_details` - Trial fields
  - `apps/api/src/lib/queue.ts` - Email queue pattern

  **Acceptance Criteria**:
  - [ ] checkTrialExpirations function implemented
  - [ ] 3-day reminder logic works
  - [ ] 2-day grace period logic works
  - [ ] Database queries optimized
  - [ ] Error handling comprehensive

  **Agent-Executed QA Scenarios**:
  
  **Scenario: Trial check finds upcoming expirations**
    Tool: interactive_bash (tmux)
    Preconditions: Test database with trial ending in 3 days
    Steps:
      1. tmux new-session: node -e "require('./apps/api/src/workers/trial.worker').checkTrialExpirations()"
      2. Wait for: Trial check completion (timeout: 15s)
      3. Check database: Verify trial status logic applied
      4. Check email queue: Verify reminder job queued
    Expected Result: Trial check processes expirations correctly
    Evidence: Database query output, email queue inspection

  **Evidence to Capture**:
  - [ ] Database query results
  - [ ] Email queue inspection

  **Commit**: YES (groups with task 1)
  - Message: `feat: implement trial expiration check logic`
  - Files: `apps/api/src/workers/trial.worker.ts`
  - Pre-commit: `npm run lint && npm run build`

---

- [ ] 3. Add email notifications and trial extension API

  **What to do**:
  - Add email notification functions (sendTrialReminder, sendPaymentPrompt, downgradeToFreeTier)
  - Add trial extension API (extendTrialPeriod)
  - Add trial status queries (getTrialStatus, getUpcomingTrialExpirations)
  - Add setup function for worker integration

  **Must NOT do**:
  - Send actual emails (just queue them)
  - Modify existing email templates

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API design and email integration
  - **Skills**: [`typescript`, `api-design`]
    - `typescript`: Type-safe API responses
    - `api-design`: REST endpoint patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on task 2)
  - **Blocks**: 4
  - **Blocked By**: 2

  **References**:
  - `apps/api/src/workers/trial.worker.ts` - Add notification functions
  - `apps/api/src/lib/queue.ts` - Email queue pattern
  - `apps/api/src/db/schema.ts:subscription_details` - Email field

  **Acceptance Criteria**:
  - [ ] Email notification functions implemented
  - [ ] Trial extension API works
  - [ ] Trial status queries return accurate data
  - [ ] Worker setup function added

  **Agent-Executed QA Scenarios**:
  
  **Scenario: Trial extension works correctly**
    Tool: interactive_bash (tmux)
    Preconditions: Test organization in trial status
    Steps:
      1. tmux new-session: node -e "require('./apps/api/src/workers/trial.worker').extendTrialPeriod('test-org-id', 7)"
      2. Wait for: Extension completion (timeout: 10s)
      3. Check database: trial_ends_at increased by 7 days
      4. Check email queue: Verify extension notification queued
    Expected Result: Trial extended and notification sent
    Evidence: Database query output, email queue inspection

  **Evidence to Capture**:
  - [ ] Database query results
  - [ ] Email queue inspection

  **Commit**: YES (groups with tasks 1-2)
  - Message: `feat: add trial notifications and extension API`
  - Files: `apps/api/src/workers/trial.worker.ts`
  - Pre-commit: `npm run lint && npm run build`

---

- [ ] 4. Add admin endpoints for trial management

  **What to do**:
  - Add admin route file: `apps/api/src/routes/admin/trials.ts`
  - Implement endpoints: GET /trials/upcoming, POST /trials/:id/extend
  - Add trial status monitoring dashboard endpoint
  - Add proper authentication and authorization

  **Must NOT do**:
  - Expose trial management to non-admin users
  - Skip validation on extension requests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Admin API design with security
  - **Skills**: [`typescript`, `api-security`]
    - `typescript`: Type-safe request/response
    - `api-security`: Admin middleware usage

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None (final task)
  - **Blocked By**: 1, 2, 3

  **References**:
  - `apps/api/src/routes/admin/trials.ts` - New file to create
  - `apps/api/src/middleware/admin.ts` - Admin authentication
  - `apps/api/src/workers/trial.worker.ts` - Trial functions to expose

  **Acceptance Criteria**:
  - [ ] Admin trial endpoints implemented
  - [ ] Proper authentication enforced
  - [ ] Input validation in place
  - [ ] Error handling comprehensive

  **Agent-Executed QA Scenarios**:
  
  **Scenario: Admin can view upcoming trials**
    Tool: interactive_bash (tmux)
    Preconditions: Admin user authenticated, test organizations with trials
    Steps:
      1. tmux new-session: curl -H "Authorization: Bearer admin-token" http://localhost:3000/api/admin/trials/upcoming
      2. Wait for: Response (timeout: 5s)
      3. Assert: HTTP status 200
      4. Assert: Response contains trial data array
      5. Check each trial: has organization_id, email, trial_ends_at
    Expected Result: Admin can view upcoming trial expirations
    Evidence: API response capture

  **Scenario: Admin can extend trial**
    Tool: interactive_bash (tmux)
    Preconditions: Admin user authenticated, test organization in trial
    Steps:
      1. tmux new-session: curl -X POST -H "Authorization: Bearer admin-token" \
         -H "Content-Type: application/json" \
         -d '{"days": 14}' \
         http://localhost:3000/api/admin/trials/test-org-id/extend
      2. Wait for: Response (timeout: 5s)
      3. Assert: HTTP status 200
      4. Assert: Response contains newTrialEndsAt
      5. Check database: trial_ends_at increased by 14 days
    Expected Result: Admin can extend trial period
    Evidence: API response capture, database query output

  **Evidence to Capture**:
  - [ ] API response captures
  - [ ] Database query results

  **Commit**: YES (final commit)
  - Message: `feat: add admin trial management endpoints`
  - Files: `apps/api/src/routes/admin/trials.ts`
  - Pre-commit: `npm run lint && npm run build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat: add trial period worker` | `apps/api/src/workers/trial.worker.ts` | `npm run lint && npm run build` |
| 2 | `feat: implement trial expiration check logic` | `apps/api/src/workers/trial.worker.ts` | `npm run lint && npm run build` |
| 3 | `feat: add trial notifications and extension API` | `apps/api/src/workers/trial.worker.ts` | `npm run lint && npm run build` |
| 4 | `feat: add admin trial management endpoints` | `apps/api/src/routes/admin/trials.ts` | `npm run lint && npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Type check
cd apps/api && npx tsc --noEmit

# Build check
cd apps/api && npm run build

# Test worker (manual verification)
node apps/api/src/workers/trial.worker.js

# Test admin endpoints
curl -H "Authorization: Bearer admin-token" http://localhost:3000/api/admin/trials/upcoming
curl -X POST -H "Authorization: Bearer admin-token" -H "Content-Type: application/json" -d '{"days": 14}' http://localhost:3000/api/admin/trials/test-org-id/extend
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (TypeScript compilation)
- [ ] Agent-Executed QA Scenarios complete
- [ ] Email notifications working (queued)
- [ ] Trial extension API functional
- [ ] Admin endpoints secured

---

## Next Steps

Once this plan is complete, you can run `/start-work` to execute the trial period handling implementation. The plan includes:

1. **Daily trial checks** with automated notifications
2. **Graceful trial transitions** (reminder → payment prompt → downgrade)
3. **Admin trial management** with extension capability
4. **Comprehensive monitoring** for upcoming expirations

The trial worker will integrate with your existing email queue system and follow the same patterns as your Stripe/GoCardless services.

**Plan saved to**: `.sisyphus/plans/trial-period-handling.md`