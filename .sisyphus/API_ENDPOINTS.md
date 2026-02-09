# Torre Tempo V4 - API Endpoints Documentation

**Version**: 4.0.0  
**Base URL**: `https://time.lsltgroup.es/api` (Production)  
**Local**: `http://localhost:3000/api`

---

## Authentication

All endpoints require authentication via Better Auth session cookies or Bearer token.

```bash
# Cookie-based (browser)
Cookie: better-auth.session_token=...

# Bearer token (API clients)
Authorization: Bearer <session_token>
```

---

## Time Entries

### Clock In
**POST** `/v1/org/:slug/time-entries/clock-in`

Start a new time entry (clock in).

**Request Body:**
```json
{
  "timestamp": "2026-02-08T09:00:00Z",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "accuracy": 10,
  "method": "tap"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| timestamp | ISO 8601 | Yes | Clock-in time |
| latitude | number | Yes | GPS latitude (-90 to 90) |
| longitude | number | Yes | GPS longitude (-180 to 180) |
| accuracy | number | No | GPS accuracy in meters |
| method | string | No | Clock-in method: `tap`, `gps`, `nfc`, `qr`, `pin` |

**Response (201 Created):**
```json
{
  "id": "entry_abc123",
  "userId": "user_xyz",
  "clockIn": "2026-02-08T09:00:00Z",
  "clockOut": null,
  "breakMinutes": 0,
  "method": "tap",
  "location": {
    "name": "Madrid Office",
    "distance": 25
  }
}
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | Already clocked in |
| 400 | Outside geofence (distance: Xm, max: 50m) |
| 401 | Unauthorized |
| 403 | Not a member of this organization |

---

### Clock Out
**POST** `/v1/org/:slug/time-entries/clock-out`

End the current time entry (clock out).

**Request Body:**
```json
{
  "timestamp": "2026-02-08T17:00:00Z",
  "latitude": 40.4168,
  "longitude": -3.7038
}
```

**Response (200 OK):**
```json
{
  "id": "entry_abc123",
  "clockIn": "2026-02-08T09:00:00Z",
  "clockOut": "2026-02-08T17:00:00Z",
  "breakMinutes": 30,
  "totalHours": 7.5,
  "compliance": {
    "violations": 0,
    "warnings": 1,
    "checks": 12,
    "results": [
      {
        "rule": "approaching_weekly_limit",
        "severity": "low",
        "message": "38/40 weekly hours used"
      }
    ]
  }
}
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | Not clocked in |
| 400 | Compliance violation: Daily limit exceeded (9.5h > 9h max) |
| 401 | Unauthorized |

**Manager Override:**
```
POST /v1/org/:slug/time-entries/clock-out?override=true&reason=Manager%20approved
```

---

### List Time Entries
**GET** `/v1/org/:slug/time-entries`

List time entries for the current user or team (managers).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| startDate | ISO 8601 | 7 days ago | Filter start date |
| endDate | ISO 8601 | today | Filter end date |
| userId | string | current user | Filter by user (managers only) |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "entry_abc123",
      "userId": "user_xyz",
      "userName": "Juan Garcia",
      "clockIn": "2026-02-08T09:00:00Z",
      "clockOut": "2026-02-08T17:00:00Z",
      "breakMinutes": 30,
      "totalHours": 7.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### Get Single Time Entry
**GET** `/v1/org/:slug/time-entries/:id`

Get details of a specific time entry.

**Response (200 OK):**
```json
{
  "id": "entry_abc123",
  "userId": "user_xyz",
  "clockIn": "2026-02-08T09:00:00Z",
  "clockOut": "2026-02-08T17:00:00Z",
  "breakMinutes": 30,
  "breaks": [
    {
      "id": "break_1",
      "startTime": "2026-02-08T13:00:00Z",
      "endTime": "2026-02-08T13:30:00Z",
      "durationMinutes": 30,
      "isPaid": false
    }
  ],
  "compliance": {
    "checks": [...]
  }
}
```

---

## Breaks

### Start Break
**POST** `/v1/org/:slug/breaks/start`

Start a break during an active shift.

**Request Body:**
```json
{
  "isPaid": false,
  "timestamp": "2026-02-08T13:00:00Z"
}
```

**Response (201 Created):**
```json
{
  "id": "break_abc123",
  "timeEntryId": "entry_xyz",
  "startTime": "2026-02-08T13:00:00Z",
  "endTime": null,
  "isPaid": false
}
```

**Errors:**
| Code | Message |
|------|---------|
| 400 | Not clocked in |
| 400 | Already on break |

---

### End Break
**POST** `/v1/org/:slug/breaks/end`

End the current break.

**Request Body:**
```json
{
  "timestamp": "2026-02-08T13:30:00Z"
}
```

**Response (200 OK):**
```json
{
  "id": "break_abc123",
  "startTime": "2026-02-08T13:00:00Z",
  "endTime": "2026-02-08T13:30:00Z",
  "durationMinutes": 30,
  "isPaid": false
}
```

---

### List Breaks
**GET** `/v1/org/:slug/breaks`

List breaks for a time entry.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| timeEntryId | string | Filter by time entry |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "break_1",
      "startTime": "2026-02-08T10:00:00Z",
      "endTime": "2026-02-08T10:15:00Z",
      "durationMinutes": 15,
      "isPaid": true
    },
    {
      "id": "break_2",
      "startTime": "2026-02-08T13:00:00Z",
      "endTime": "2026-02-08T13:30:00Z",
      "durationMinutes": 30,
      "isPaid": false
    }
  ]
}
```

---

## Correction Requests

### Create Correction Request
**POST** `/v1/org/:slug/corrections`

Request a correction to a time entry.

**Request Body:**
```json
{
  "time_entry_id": "entry_abc123",
  "requested_clock_in": "2026-02-08T08:45:00Z",
  "requested_clock_out": "2026-02-08T17:15:00Z",
  "reason": "Forgot to clock in on time, was in meeting"
}
```

**Response (201 Created):**
```json
{
  "id": "correction_xyz",
  "timeEntryId": "entry_abc123",
  "status": "pending",
  "requestedClockIn": "2026-02-08T08:45:00Z",
  "requestedClockOut": "2026-02-08T17:15:00Z",
  "reason": "Forgot to clock in on time, was in meeting",
  "createdAt": "2026-02-08T18:00:00Z"
}
```

---

### List Correction Requests
**GET** `/v1/org/:slug/corrections`

List correction requests (employees see own, managers see all).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter: `pending`, `approved`, `rejected` |
| userId | string | Filter by user (managers only) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "correction_xyz",
      "timeEntryId": "entry_abc123",
      "userId": "user_123",
      "userName": "Juan Garcia",
      "status": "pending",
      "requestedClockIn": "2026-02-08T08:45:00Z",
      "requestedClockOut": "2026-02-08T17:15:00Z",
      "reason": "Forgot to clock in",
      "createdAt": "2026-02-08T18:00:00Z"
    }
  ]
}
```

---

### Approve Correction
**PATCH** `/v1/org/:slug/corrections/:id/approve`

Approve a correction request (managers only).

**Request Body:**
```json
{
  "managerNote": "Approved - verified with security logs"
}
```

**Response (200 OK):**
```json
{
  "id": "correction_xyz",
  "status": "approved",
  "approvedBy": "manager_abc",
  "approvedAt": "2026-02-08T19:00:00Z",
  "managerNote": "Approved - verified with security logs"
}
```

---

### Reject Correction
**PATCH** `/v1/org/:slug/corrections/:id/reject`

Reject a correction request (managers only).

**Request Body:**
```json
{
  "rejectionReason": "No supporting evidence provided"
}
```

**Response (200 OK):**
```json
{
  "id": "correction_xyz",
  "status": "rejected",
  "rejectedBy": "manager_abc",
  "rejectedAt": "2026-02-08T19:00:00Z",
  "rejectionReason": "No supporting evidence provided"
}
```

---

## Audit Verification

### Verify Audit Chain
**GET** `/v1/org/:slug/audit/verify/:entryId`

Verify the SHA-256 hash chain integrity for a time entry.

**Response (200 OK):**
```json
{
  "valid": true,
  "chainLength": 156,
  "lastHash": "a1b2c3d4e5f6...",
  "verifiedAt": "2026-02-08T20:00:00Z"
}
```

**Response (400 - Tampered):**
```json
{
  "valid": false,
  "error": "Hash mismatch at entry 45",
  "expectedHash": "abc123...",
  "actualHash": "xyz789..."
}
```

---

## Compliance

### Compliance Rules

The system validates 12 Spanish labor law compliance rules:

| Rule | Limit | Severity | Reference |
|------|-------|----------|-----------|
| Daily hours | 9h max | violation | Estatuto Art. 34.3 |
| Weekly hours | 40h regular | warning | Estatuto Art. 34.1 |
| Rest period | 12h between shifts | violation | Estatuto Art. 34.3 |
| Mandatory break | 15min for >6h shifts | warning | Estatuto Art. 34.4 |
| Continuous work | 9h max without break | violation | Estatuto Art. 34.4 |
| Weekly rest | 35h continuous/week | violation | Estatuto Art. 37.1 |
| Night work | 8h max (20:00-06:00) | violation | Estatuto Art. 36.1 |
| Overtime | 40-48h weekly | warning | Estatuto Art. 35.2 |
| Absolute max | 48h weekly | violation | Estatuto Art. 35.2 |
| Adolescent | 8h/day, 40h/week | violation | Estatuto Art. 6.2 |
| Geofence | 50m radius | violation | Company policy |

---

## WebSocket Events

Connect to WebSocket for live attendance updates (managers only).

**Connection:**
```
ws://localhost:3000?token=<session_token>
wss://time.lsltgroup.es?token=<session_token>
```

**Events:**
```json
// Connection established
{ "event": "connected", "payload": { "userId": "...", "orgId": "...", "role": "manager" } }

// Employee clocked in
{ "event": "attendance:clock-in", "payload": { "userId": "...", "userName": "Juan", "timestamp": "...", "location": "Madrid Office" } }

// Employee clocked out
{ "event": "attendance:clock-out", "payload": { "userId": "...", "userName": "Juan", "timestamp": "..." } }

// Break started
{ "event": "attendance:break-start", "payload": { "userId": "...", "userName": "Juan", "timestamp": "..." } }

// Break ended
{ "event": "attendance:break-end", "payload": { "userId": "...", "userName": "Juan", "timestamp": "..." } }
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| Clock in/out | 10 requests/minute |
| List endpoints | 60 requests/minute |
| WebSocket | 1 connection/user |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Not authenticated |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource state conflict |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

**Last Updated**: February 8, 2026  
**Maintainer**: LSLT Group Development Team
