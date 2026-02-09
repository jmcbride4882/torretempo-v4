# Week 3-4 Time Tracking Enhancement - Issues & Gotchas

## Known Issues

### From Week 1-2
- **PostgreSQL Not Running**: Need `docker-compose up -d` before testing APIs
- **Migration Pending**: `apps/api/drizzle/migrations/20260208_add_six_new_tables.sql` ready but not applied
- **Seed Script Not Run**: `scripts/seed-development-data.ts` ready but not executed

### Potential Gotchas

#### Timezone Handling
- **Issue**: Spanish labor law calculations must use local time (Europe/Madrid)
- **Solution**: Store timestamps in UTC, convert to Europe/Madrid for compliance checks
- **Watch Out**: DST transitions (last Sunday in March/October)

#### Midnight Crossing
- **Issue**: Shifts that cross midnight (e.g., 22:00-06:00) complicate daily limit calculations
- **Solution**: Split shift into two days for compliance checks
- **Watch Out**: Weekly rest period calculation across week boundaries

#### Geolocation Accuracy
- **Issue**: GPS accuracy varies (5-50m typical, worse indoors)
- **Solution**: Use `enableHighAccuracy: true`, 10-second timeout
- **Watch Out**: User denies permission → fallback to manual location selection

#### Offline Queue Conflicts
- **Issue**: User clocks in offline, another device clocks in online → conflict
- **Solution**: Last-write-wins with conflict notification to user
- **Watch Out**: Queue processing order matters (FIFO)

#### WebSocket Reconnection
- **Issue**: Mobile browsers suspend WebSocket connections when app backgrounded
- **Solution**: Exponential backoff reconnection, resume on app foreground
- **Watch Out**: Don't spam reconnection attempts (max 5 retries)

---

## [TIMESTAMP] Task: {task-id}
{Append issues discovered during implementation}
