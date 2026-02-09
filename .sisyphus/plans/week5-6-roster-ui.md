# Week 5-6 Roster Management UI Completion

## TL;DR

> **Quick Summary**: Complete remaining frontend UI components for roster management (employee selector, publish dialog, employee sidebar) and add Jest test infrastructure to both API and Web workspaces.
> 
> **Deliverables**:
> - Enhanced CreateShiftModal with employee selector + validation
> - PublishDialog component for roster publishing confirmation
> - EmployeeSidebar component with drag-to-assign functionality
> - Jest test setup in both apps/api and apps/web
> - Compliance scenario tests
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 4 (modal before sidebar integration)

---

## Context

### Original Request
Continue Week 5-6 Roster Management work, specifically UI tasks 3.4–3.6 and testing task 3.13.

### Interview Summary
**Key Discussions**:
- Employee selection: OPTIONAL (allow unassigned shifts)
- Publish behavior: ALL shifts in range, but skip already-published (draft→published only)
- Drag-and-drop: Assignment to existing shifts ONLY (no create-on-drop)
- Testing: Add Jest to BOTH api and web workspaces

### Research Findings
- API already has Vitest configured (`apps/api/package.json` has vitest)
- Web has no test runner configured
- Members API: `GET /api/v1/org/:slug/members` returns `{ members: [{ id, userId, role, user }] }`
- Roster validation hook exists: `useRosterValidation`
- ValidationIndicator component exists
- @dnd-kit already integrated in RosterGrid

---

## Work Objectives

### Core Objective
Complete roster management UI components and establish test infrastructure for compliance validation.

### Concrete Deliverables
- `apps/web/src/components/roster/CreateShiftModal.tsx` (enhanced)
- `apps/web/src/components/roster/PublishDialog.tsx` (new)
- `apps/web/src/components/roster/EmployeeSidebar.tsx` (new)
- `apps/web/jest.config.js` + test setup
- `apps/web/src/__tests__/roster/*.test.tsx` (component tests)
- `apps/api/src/__tests__/roster-validation.test.ts` (API tests)

### Definition of Done
- [ ] `cd apps/web && npx tsc --noEmit` passes
- [ ] `cd apps/api && npx tsc --noEmit` passes
- [ ] `npm run test --workspace=web` passes
- [ ] `npm run test --workspace=api` passes

### Must Have
- Optional employee selector in CreateShiftModal
- Real-time validation indicator when employee selected
- Publish dialog with shift count and employee list
- Employee sidebar with draggable cards
- Jest configuration for web workspace

### Must NOT Have (Guardrails)
- Do NOT create shifts on drag-drop (assignment only)
- Do NOT re-publish already-published shifts
- Do NOT require employee selection (optional)
- Do NOT add unnecessary dependencies

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> ALL verification via TypeScript compiler and Jest test runs.

### Test Decision
- **API Infrastructure exists**: YES (Vitest)
- **Web Infrastructure exists**: NO (need Jest setup)
- **Automated tests**: YES (Jest for both)
- **Framework**: Vitest (API), Jest + RTL (Web)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Enhance CreateShiftModal (no deps)
├── Task 2: Create PublishDialog (no deps)
└── Task 5: Setup Jest for Web (no deps)

Wave 2 (After Wave 1):
├── Task 3: Create EmployeeSidebar (benefits from Task 1 patterns)
├── Task 4: Write API compliance tests (needs Task 5 setup)
└── Task 6: Write Web component tests (needs Task 5 setup)

Critical Path: Task 5 → Task 6
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2, 5 |
| 2 | None | 6 | 1, 5 |
| 3 | 1 | 6 | 4 |
| 4 | None | None | 3, 6 |
| 5 | None | 4, 6 | 1, 2 |
| 6 | 5, 2, 3 | None | 4 |

---

## TODOs

- [ ] 1. Enhance CreateShiftModal with Employee Selector

  **What to do**:
  - Add `user_id` to ShiftFormData interface
  - Add state for members list, loading, error
  - Fetch members from `GET /api/v1/org/${slug}/members` on modal open
  - Add Select dropdown for employee (with "Unassigned" option, value="")
  - Import and use `useRosterValidation` hook
  - Import and render `ValidationIndicator` next to employee label
  - Trigger validation when user_id + valid times are set
  - Include `user_id` in POST body (null when empty)

  **Must NOT do**:
  - Do NOT require employee selection
  - Do NOT modify other files

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 5)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `apps/web/src/components/roster/CreateShiftModal.tsx` - Current implementation
  - `apps/web/src/hooks/useRosterValidation.ts` - Validation hook API
  - `apps/web/src/components/roster/ValidationIndicator.tsx` - Validation UI
  - `apps/api/src/routes/members.ts:14-41` - Members API response shape
  - `apps/web/src/types/roster.ts:25-31` - TeamMember type

  **Acceptance Criteria**:
  - [ ] Employee selector dropdown renders with "Unassigned" + member list
  - [ ] ValidationIndicator appears next to employee label
  - [ ] Selecting employee triggers validation API call
  - [ ] Form submits with user_id in body
  - [ ] `cd apps/web && npx tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Employee selector shows members
    Tool: Playwright
    Steps:
      1. Navigate to roster page
      2. Click "Create Shift" button
      3. Wait for modal to open
      4. Click employee dropdown
      5. Assert: "Unassigned" option visible
      6. Assert: At least one member name visible (if org has members)
    Evidence: Screenshot .sisyphus/evidence/task-1-employee-selector.png

  Scenario: Validation fires on employee selection
    Tool: Playwright
    Steps:
      1. Open CreateShiftModal
      2. Select a location
      3. Set valid start/end times
      4. Select an employee from dropdown
      5. Wait for ValidationIndicator to appear (loading state)
      6. Wait for validation result (check/warning/error icon)
    Evidence: Screenshot .sisyphus/evidence/task-1-validation.png
  ```

  **Commit**: YES
  - Message: `feat(web): add employee selector with validation to CreateShiftModal`
  - Files: `apps/web/src/components/roster/CreateShiftModal.tsx`
  - Pre-commit: `cd apps/web && npx tsc --noEmit`

---

- [ ] 2. Create PublishDialog Component

  **What to do**:
  - Create new file `apps/web/src/components/roster/PublishDialog.tsx`
  - Props: `{ open, onOpenChange, onSuccess, organizationSlug, weekStart, weekEnd, shifts }`
  - Show week date range, draft shift count, unique employees to notify
  - Show warning if any shifts have compliance issues
  - Call `POST /api/v1/org/${slug}/roster/publish` with weekStart/weekEnd
  - Handle loading, success, error states
  - Success animation on completion

  **Must NOT do**:
  - Do NOT re-publish already published shifts (handled by API)
  - Do NOT modify existing files

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 5)
  - **Blocks**: Task 6
  - **Blocked By**: None

  **References**:
  - `apps/web/src/components/roster/CreateShiftModal.tsx` - Modal pattern
  - `apps/web/src/components/ui/dialog.tsx` - Dialog primitives
  - `apps/api/src/routes/v1/roster.ts:130-195` - Publish endpoint
  - `apps/web/src/types/roster.ts:33-55` - Shift type

  **Acceptance Criteria**:
  - [ ] New file created at specified path
  - [ ] Dialog shows week range (formatted dates)
  - [ ] Shows count of draft shifts to publish
  - [ ] Shows list/count of employees to be notified
  - [ ] Confirm button calls publish API
  - [ ] Shows success state after publish
  - [ ] `cd apps/web && npx tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Publish dialog shows correct counts
    Tool: Playwright
    Steps:
      1. Navigate to roster page with draft shifts
      2. Click "Publish Week" button (or equivalent trigger)
      3. Wait for PublishDialog to open
      4. Assert: Week range displayed correctly
      5. Assert: Draft count matches expected
      6. Assert: Employee count shown
    Evidence: Screenshot .sisyphus/evidence/task-2-publish-dialog.png

  Scenario: Publish succeeds and shows confirmation
    Tool: Playwright
    Steps:
      1. Open PublishDialog with draft shifts
      2. Click "Publish" confirm button
      3. Wait for loading state
      4. Wait for success state
      5. Assert: Success message visible
      6. Assert: Published count shown
    Evidence: Screenshot .sisyphus/evidence/task-2-publish-success.png
  ```

  **Commit**: YES
  - Message: `feat(web): add PublishDialog for roster publishing confirmation`
  - Files: `apps/web/src/components/roster/PublishDialog.tsx`
  - Pre-commit: `cd apps/web && npx tsc --noEmit`

---

- [ ] 3. Create EmployeeSidebar Component

  **What to do**:
  - Create new file `apps/web/src/components/roster/EmployeeSidebar.tsx`
  - Props: `{ organizationSlug, weekStart, className? }`
  - Fetch members from `/api/v1/org/${slug}/members`
  - Fetch weekly hours from `/api/v1/org/${slug}/roster/user-hours` for each member
  - Display employee cards with: avatar/initial, name, role badge, weekly hours bar
  - Hours bar color: green (<32h), amber (32-38h), red (>38h)
  - Make cards draggable using `useDraggable` from @dnd-kit/core
  - Add search filter for employee name
  - Show loading skeleton while fetching

  **Must NOT do**:
  - Do NOT implement create-on-drop (assignment only)
  - Do NOT modify RosterGrid (that's a separate integration task)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1 (patterns)

  **References**:
  - `apps/web/src/components/roster/RosterGrid.tsx:174-197` - DraggableShift pattern
  - `apps/web/src/components/roster/StaffRosterGrid.tsx:96-119` - useDraggable usage
  - `apps/api/src/routes/v1/roster.ts:240-280` - user-hours endpoint
  - `apps/web/src/components/ui/input.tsx` - Input for search

  **Acceptance Criteria**:
  - [ ] New file created at specified path
  - [ ] Sidebar fetches and displays members
  - [ ] Each card shows name, role, hours progress bar
  - [ ] Hours bar changes color based on threshold
  - [ ] Cards are draggable (cursor changes, opacity on drag)
  - [ ] Search input filters employee list
  - [ ] `cd apps/web && npx tsc --noEmit` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Sidebar displays employees with hours
    Tool: Playwright
    Steps:
      1. Navigate to roster page
      2. Assert: EmployeeSidebar visible
      3. Assert: Employee cards rendered
      4. Assert: Each card shows name and hours bar
    Evidence: Screenshot .sisyphus/evidence/task-3-sidebar.png

  Scenario: Drag employee card
    Tool: Playwright
    Steps:
      1. Locate first employee card
      2. Start drag on employee card
      3. Assert: Card has opacity change / visual feedback
      4. Assert: Cursor is 'grabbing'
      5. Release drag
    Evidence: Screenshot .sisyphus/evidence/task-3-drag.png

  Scenario: Search filters employees
    Tool: Playwright
    Steps:
      1. Type employee name in search input
      2. Assert: Only matching employees shown
      3. Clear search
      4. Assert: All employees shown again
    Evidence: Screenshot .sisyphus/evidence/task-3-search.png
  ```

  **Commit**: YES
  - Message: `feat(web): add EmployeeSidebar with draggable cards and hours display`
  - Files: `apps/web/src/components/roster/EmployeeSidebar.tsx`
  - Pre-commit: `cd apps/web && npx tsc --noEmit`

---

- [ ] 4. Write API Compliance Tests (Vitest)

  **What to do**:
  - Create/update `apps/api/src/__tests__/roster-validation.test.ts`
  - Test RosterValidator.validateShiftAssignment for:
    - Daily hour limit (9h max)
    - Weekly hour limit (40h max)
    - Rest period (12h between shifts)
    - Valid shift (no violations)
  - Test RosterValidator.validateRosterForPublish
  - Mock database calls as needed

  **Must NOT do**:
  - Do NOT modify production code
  - Do NOT add new dependencies (Vitest already installed)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 6)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `apps/api/src/services/roster-validator.ts` - Validation service
  - `apps/api/src/routes/v1/__tests__/time-tracking-flow.test.ts` - Test patterns
  - `apps/api/package.json:11-13` - Vitest scripts

  **Acceptance Criteria**:
  - [ ] Test file created/updated
  - [ ] Tests cover 9h daily limit
  - [ ] Tests cover 40h weekly limit
  - [ ] Tests cover 12h rest rule
  - [ ] Tests cover valid shift (passes all rules)
  - [ ] `npm run test --workspace=api` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Run API tests
    Tool: Bash
    Steps:
      1. cd apps/api && npm run test
      2. Assert: Exit code 0
      3. Assert: Output shows all tests passing
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `test(api): add compliance scenario tests for roster validation`
  - Files: `apps/api/src/__tests__/roster-validation.test.ts`
  - Pre-commit: `npm run test --workspace=api`

---

- [ ] 5. Setup Jest for Web Workspace

  **What to do**:
  - Install Jest + RTL: `npm install -D jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest --workspace=web`
  - Create `apps/web/jest.config.js` with jsdom environment
  - Create `apps/web/src/setupTests.ts` with @testing-library/jest-dom import
  - Add "test" script to `apps/web/package.json`
  - Create example test to verify setup

  **Must NOT do**:
  - Do NOT modify production components

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 6
  - **Blocked By**: None

  **References**:
  - `apps/web/package.json` - Current scripts
  - `apps/web/tsconfig.json` - TypeScript config
  - Jest docs: https://jestjs.io/docs/getting-started

  **Acceptance Criteria**:
  - [ ] Jest + RTL dependencies installed
  - [ ] jest.config.js created with proper config
  - [ ] setupTests.ts created
  - [ ] "test" script added to package.json
  - [ ] `npm run test --workspace=web` runs without error

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Jest setup works
    Tool: Bash
    Steps:
      1. cd apps/web && npm run test -- --passWithNoTests
      2. Assert: Exit code 0
      3. Assert: Jest runs successfully
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `chore(web): setup Jest + React Testing Library`
  - Files: `apps/web/package.json`, `apps/web/jest.config.js`, `apps/web/src/setupTests.ts`
  - Pre-commit: `npm run test --workspace=web -- --passWithNoTests`

---

- [ ] 6. Write Web Component Tests

  **What to do**:
  - Create `apps/web/src/__tests__/roster/CreateShiftModal.test.tsx`
  - Create `apps/web/src/__tests__/roster/PublishDialog.test.tsx`
  - Create `apps/web/src/__tests__/roster/EmployeeSidebar.test.tsx`
  - Test rendering, user interactions, API calls (mocked)

  **Must NOT do**:
  - Do NOT modify production components

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3, 5

  **References**:
  - Components created in Tasks 1-3
  - RTL docs: https://testing-library.com/docs/react-testing-library/intro

  **Acceptance Criteria**:
  - [ ] Test files created
  - [ ] Tests pass: `npm run test --workspace=web`
  - [ ] Coverage includes render + interaction tests

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Run Web tests
    Tool: Bash
    Steps:
      1. cd apps/web && npm run test
      2. Assert: Exit code 0
      3. Assert: All tests passing
    Evidence: Terminal output captured
  ```

  **Commit**: YES
  - Message: `test(web): add component tests for roster management`
  - Files: `apps/web/src/__tests__/roster/*.test.tsx`
  - Pre-commit: `npm run test --workspace=web`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(web): add employee selector with validation to CreateShiftModal` | CreateShiftModal.tsx | tsc --noEmit |
| 2 | `feat(web): add PublishDialog for roster publishing confirmation` | PublishDialog.tsx | tsc --noEmit |
| 3 | `feat(web): add EmployeeSidebar with draggable cards and hours display` | EmployeeSidebar.tsx | tsc --noEmit |
| 4 | `test(api): add compliance scenario tests for roster validation` | roster-validation.test.ts | npm test |
| 5 | `chore(web): setup Jest + React Testing Library` | jest.config.js, setupTests.ts, package.json | npm test |
| 6 | `test(web): add component tests for roster management` | __tests__/roster/*.test.tsx | npm test |

---

## Success Criteria

### Verification Commands
```bash
cd apps/web && npx tsc --noEmit  # Expected: no errors
cd apps/api && npx tsc --noEmit  # Expected: no errors
npm run test --workspace=api     # Expected: all tests pass
npm run test --workspace=web     # Expected: all tests pass
```

### Final Checklist
- [ ] CreateShiftModal has optional employee selector
- [ ] ValidationIndicator shows real-time compliance feedback
- [ ] PublishDialog confirms and executes roster publish
- [ ] EmployeeSidebar displays employees with hours and drag support
- [ ] All TypeScript compiles without errors
- [ ] All tests pass
