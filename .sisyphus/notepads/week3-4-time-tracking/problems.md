# Week 3-4 Time Tracking Enhancement - Unresolved Problems

## Blockers

*None currently - all dependencies from Week 1-2 are complete*

---

## Open Questions

### 1. Break Payment Rules
- **Question**: How to determine if a break is paid vs unpaid?
- **Context**: Spanish law requires 15min break for 6h+ shifts, but doesn't specify if paid
- **Impact**: Affects payroll calculations
- **Status**: Needs clarification from user/business rules

### 2. Manager Override Permissions
- **Question**: Can any manager override compliance violations, or only tenantAdmin+?
- **Context**: Task 2.2 mentions manager override with `?override=true&reason=...`
- **Impact**: Security and audit trail
- **Status**: Assume manager+ for now, can restrict later

### 3. Geofence Radius Configuration
- **Question**: Should geofence radius be configurable per location or global?
- **Context**: Architecture doc says 50m, but some locations might need different radius
- **Impact**: Database schema (add `geofence_radius_meters` to locations table?)
- **Status**: Use global 50m for now, add per-location config in Week 5-6 if needed

### 4. Offline Queue Expiry
- **Question**: What happens to queued actions older than 7 days?
- **Context**: Task 2.10 says purge after 7 days, but should user be notified?
- **Impact**: Data loss if user doesn't sync for a week
- **Status**: Purge silently for now, add notification in Week 7-8

---

## [TIMESTAMP] Task: {task-id}
{Append unresolved problems discovered during implementation}
