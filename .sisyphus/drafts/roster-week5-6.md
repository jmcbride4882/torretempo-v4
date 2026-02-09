# Draft: Week 5-6 Roster Management (UI continuation)

## Context
- User asked to continue “Week 5-6 Roster Management” work, specifically UI tasks.
- User requested “use chat gpt for all” / “openai” (preference for OpenAI model/assistant).
- Current outstanding items mentioned in session:
  - Task 3.4: Enhance `CreateShiftModal` with employee selector
  - Task 3.5: Add roster publishing confirmation dialog
  - Task 3.6: Add employee sidebar with draggable employee cards + weekly hours
  - Task 3.13: Test compliance scenarios
  - Verify full project builds without errors

## Known Constraints
- Monorepo: React 18 + Vite (apps/web), Express API (apps/api)
- Members API exists: `GET /api/v1/org/:slug/members` returning `{ members: [{ id, userId, role, user: { id, name, email, image } }] }`
- Roster hours API exists: `GET /api/v1/org/:slug/roster/user-hours?weekStart=...&userId=...`
- Repo guide states: no test framework currently configured (tests may require adding infra if desired).

## Requirements (unconfirmed)
- Employee selector should allow assigning a shift to a user OR leaving unassigned.
- Publishing dialog should confirm week range, counts, and call publish endpoint.
- Employee sidebar should show weekly hours and support drag-and-drop assignment.

## Requirements (confirmed)
- CreateShiftModal: employee selection is OPTIONAL (allow unassigned shifts).
- Publish behavior: publish ALL shifts in the selected week range.
- EmployeeSidebar DnD: assignment via drag-and-drop onto existing shifts (NO create-on-drop).
- Testing strategy: add Jest (and related setup) and then implement automated tests for compliance scenarios.

## Decisions (confirmed)
- Publish all in range: **skip shifts already published/acknowledged**; only draft→published; notify only newly-published users.
- Dragging employee onto empty slot: **do not create shifts** (assignment-only DnD).

## Open Questions
- Employee assignment UX: should employee be required for new shifts, or optional?
- Publish dialog: should it publish only draft shifts or all shifts in range?
- Sidebar drag target: drag employee onto an existing shift to assign, or onto an empty slot to create/assign?
- Testing strategy: add automated test infrastructure now, or rely on agent-executed QA scenarios only?

## Scope Boundaries
- INCLUDE: UI/UX for roster management tasks 3.4–3.6, plus verification and test strategy for 3.13.
- EXCLUDE (unless user requests): broader refactors, new dependencies unrelated to these tasks.
