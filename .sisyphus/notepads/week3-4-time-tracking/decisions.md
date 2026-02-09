# Week 3-4 Time Tracking Enhancement - Architectural Decisions

## Technology Choices

### Compliance Validation
- **Decision**: Synchronous validation service (no database I/O)
- **Rationale**: Sub-millisecond response time, pure calculation based on time entries
- **Trade-off**: Must pass all time entries to validator, but acceptable for <1000 entries

### Offline Queue
- **Decision**: IndexedDB via `idb` package
- **Rationale**: Persistent storage across page reloads, 50MB+ capacity
- **Trade-off**: More complex than localStorage, but necessary for reliability

### WebSocket vs Polling
- **Decision**: WebSocket for live attendance
- **Rationale**: Real-time updates without polling overhead, better UX for managers
- **Trade-off**: More complex server setup, but worth it for live dashboard

### Geofencing
- **Decision**: Haversine formula client-side
- **Rationale**: No external API costs, works offline, <1ms calculation
- **Trade-off**: ±5m accuracy vs GPS precision, acceptable for 50m radius

### Break Tracking
- **Decision**: Separate `break_entries` table (not embedded in time_entries)
- **Rationale**: Multiple breaks per shift, detailed audit trail, easier reporting
- **Trade-off**: Additional table, but cleaner data model

---

## [TIMESTAMP] Task: {task-id}
{Append decisions here after each task completion}
