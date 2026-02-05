# Torre Tempo V4 - Phase 3 Testing Checklist

**Version**: 4.0.0  
**Phase**: 3 - Time Clock + PWA  
**Date**: February 5, 2026

---

## Build Verification ✅

- [x] **Frontend Build**: SUCCESS (1,165.57 kB bundle)
- [x] **Backend Build**: SUCCESS
- [x] **TypeScript Compilation**: CLEAN (no errors)
- [x] **PWA Generation**: SUCCESS (service worker + manifest)

---

## 1. Clock-In Methods Testing (p3-13)

### 1.1 TAP Method ✅

**Test Steps:**
1. Navigate to Time Clock page
2. Click "Clock In" button
3. Verify geolocation permission request appears
4. Grant location permission
5. Select "Tap" method (default)
6. Optionally add notes
7. Click "Clock In Now"

**Expected Results:**
- [x] Bottom sheet opens smoothly
- [x] Real-time clock display updates every second
- [x] Geolocation fetches successfully
- [x] "Within geofence" badge shows green when location acquired
- [x] Accuracy displays in meters
- [x] Light haptic feedback on button press
- [x] Success haptic feedback (2 pulses) on completion
- [x] "Clocked In!" success animation
- [x] Sheet auto-closes after 1.5 seconds
- [x] Time entry appears in TimeEntryList

**Edge Cases:**
- [ ] Location permission denied → Shows error message
- [ ] Low GPS accuracy → Shows warning banner
- [ ] Already clocked in → Returns 409 error with message
- [ ] Outside geofence → Returns 403 error

---

### 1.2 NFC Method 📱

**Requirements:**
- Android device with NFC capability
- Chrome browser (Web NFC API support)
- NFC tag (any NDEF-compatible tag)

**Test Steps:**
1. Open app on Android Chrome
2. Click "Clock In" button
3. Select "NFC" method
4. Wait for "Hold NFC tag near device" message
5. Hold NFC tag close to back of phone
6. Verify tag serial number displays
7. Click "Clock In Now"

**Expected Results:**
- [ ] NFC scanner auto-starts when method selected
- [ ] Scanning animation shows (pulsing icon)
- [ ] Success haptic feedback when tag detected
- [ ] Serial number displays (truncated to 16 chars)
- [ ] Optional message from tag shows if available
- [ ] "Tag Read" green badge appears
- [ ] Can clock in after successful scan
- [ ] Scanner stops after scan completes

**Edge Cases:**
- [ ] NFC not supported → Shows "NFC Not Supported" message
- [ ] NFC permission denied → Shows error message
- [ ] Invalid tag → Continues scanning
- [ ] Tag removed before clock-in → Can scan again

**Browser Compatibility:**
- [ ] Chrome Android: Full support
- [ ] Other browsers: Graceful fallback message

---

### 1.3 QR Code Method 📷

**Requirements:**
- Device with camera
- Printed QR code from location endpoint
- Camera permission

**Test Steps:**
1. Generate QR code for a location:
   - `GET /api/v1/org/{slug}/locations/{locationId}/qr`
   - Print or display QR code on screen
2. Click "Clock In" button
3. Select "QR" method
4. Grant camera permission when prompted
5. Point camera at QR code
6. Wait for automatic detection
7. Verify location name displays
8. Click "Clock In Now"

**Expected Results:**
- [ ] Camera preview appears in sheet
- [ ] "Scanning..." badge shows
- [ ] Success haptic feedback when QR detected
- [ ] Scanner auto-stops after successful scan
- [ ] Location name from QR displays correctly
- [ ] Location ID displays in mono font
- [ ] "Code Scanned" green badge appears
- [ ] Can clock in after successful scan

**Edge Cases:**
- [ ] Camera not available → Shows "Camera Not Available" message
- [ ] Camera permission denied → Shows error message
- [ ] Invalid QR code → Shows error "Invalid QR code"
- [ ] Non-TorreTempo QR code → Shows validation error
- [ ] Poor lighting → Camera adjusts automatically
- [ ] QR code moved away → Can scan again

**QR Code Validation:**
- [ ] Contains `type: 'torretempo-location'`
- [ ] Contains valid `locationId`
- [ ] Contains `locationName`
- [ ] Contains `generatedAt` timestamp

---

### 1.4 PIN Method 🔢

**Requirements:**
- User must have PIN set via `/members/:id/pin` endpoint
- 4-digit numeric PIN

**Setup Steps:**
1. Set PIN for member:
   ```bash
   POST /api/v1/org/{slug}/members/{memberId}/pin
   Body: { "pin": "1234" }
   ```

**Test Steps:**
1. Click "Clock In" button
2. Select "PIN" method
3. Enter 4-digit PIN using keyboard
4. Verify PIN input shows correctly
5. Click "Clock In Now" (or auto-submits on 4th digit)

**Expected Results:**
- [ ] PIN input shows 4 boxes
- [ ] Auto-focus on first input
- [ ] Numbers only accepted (no letters)
- [ ] Auto-advance to next box on input
- [ ] Backspace moves to previous box
- [ ] Paste support for 4-digit codes
- [ ] Arrow keys navigate between boxes
- [ ] Boxes highlight green when filled (no error)
- [ ] Boxes highlight red on error
- [ ] Auto-submit when 4 digits entered (optional)
- [ ] PIN verification happens on clock-in
- [ ] Invalid PIN → Shows error message

**Edge Cases:**
- [ ] No PIN set → Shows "No PIN set" error from backend
- [ ] Wrong PIN → Returns 401 error
- [ ] PIN too short (< 4 digits) → Cannot submit
- [ ] PIN too long (> 4 digits) → Truncated to 4
- [ ] Non-numeric input → Ignored

**Security:**
- [ ] PIN not visible in network requests (sent to backend)
- [ ] PIN hashed with bcrypt before storage
- [ ] No console logging of PIN values

---

### 1.5 Clock-Out Testing

**Test Steps:**
1. While clocked in, click "Clock Out" button
2. Bottom sheet opens with active entry details
3. Shows clock-in time, duration, breaks
4. Optionally add notes
5. Click "Clock Out Now"

**Expected Results:**
- [ ] Shows active time entry details
- [ ] Duration counter updates every second
- [ ] Breaks list displays if any breaks taken
- [ ] Light haptic feedback on button press
- [ ] Success haptic feedback (2 pulses) on completion
- [ ] "Clocked Out!" success animation
- [ ] Sheet auto-closes after 1.5 seconds
- [ ] Time entry marked as complete in list

---

## 2. Offline Queue Testing (p3-14)

### 2.1 Offline Mode Simulation

**Test Steps:**
1. Open app while online
2. Enable airplane mode OR disconnect WiFi
3. Verify offline indicator appears (top-right, red badge)
4. Attempt to clock in using any method
5. Verify success message even though offline
6. Check IndexedDB for queued action:
   - DevTools → Application → IndexedDB → torretempo-offline-queue
7. Verify offline indicator shows "1 pending"
8. Disable airplane mode / reconnect WiFi
9. Wait for auto-sync (should be immediate)
10. Verify action processed successfully
11. Check time entry created in backend

**Expected Results:**
- [ ] Offline indicator appears when connection lost
- [ ] Shows red "Offline" badge with WifiOff icon
- [ ] Clock-in succeeds and shows success message
- [ ] Action stored in IndexedDB with status "pending"
- [ ] Offline indicator shows pending count
- [ ] When online, indicator changes to amber "Syncing..."
- [ ] Auto-processes queue within seconds
- [ ] Indicator changes to green "Online" when done
- [ ] Time entry created in database
- [ ] Action removed from IndexedDB queue

---

### 2.2 Background Sync Testing

**Requirements:**
- Chrome browser (Background Sync API support)

**Test Steps:**
1. Queue 3 actions while offline:
   - Clock in
   - Clock out
   - Clock in again
2. Close browser tab/window (important!)
3. Reconnect to internet
4. Wait 30-60 seconds
5. Reopen app
6. Check if actions were processed

**Expected Results:**
- [ ] Actions stored in IndexedDB with timestamps
- [ ] Service worker registers sync event "offline-queue-sync"
- [ ] Background sync triggers even with tab closed
- [ ] All actions processed in order (FIFO)
- [ ] Queue empty after sync completes
- [ ] All time entries created correctly

**Browser Compatibility:**
- [ ] Chrome/Edge: Full support
- [ ] Safari/Firefox: Falls back to online event listener

---

### 2.3 Retry Logic Testing

**Test Steps:**
1. Go offline
2. Clock in (action queued)
3. Go online but simulate API failure:
   - Block API URL in DevTools Network tab
   - OR kill API server temporarily
4. Wait for sync attempt
5. Verify action marked for retry
6. Check retryCount incremented
7. Restore API
8. Wait for next retry

**Expected Results:**
- [ ] First attempt fails with network error
- [ ] Action status changes to "pending" (not "failed")
- [ ] retryCount increments from 0 to 1
- [ ] System attempts retry after delay
- [ ] After 3 failed attempts, marked as "failed"
- [ ] Failed actions shown in offline indicator
- [ ] Failed badge shows red color with alert icon

---

### 2.4 Queue Statistics Testing

**Test Steps:**
1. Queue multiple actions (mix of clock-in, clock-out)
2. Click offline indicator to expand details
3. Verify statistics display correctly:
   - Total count
   - Pending count
   - Processing count (while syncing)
   - Failed count (if any failures)

**Expected Results:**
- [ ] Pending count accurate
- [ ] Processing shows spinner icon
- [ ] Failed shows alert icon
- [ ] "All synced" message when queue empty and online
- [ ] Offline notice when pending actions exist

---

### 2.5 Multiple Action Types Testing

**Test Steps:**
1. Test all action types offline:
   - Clock in
   - Clock out
   - Start break (if implemented)
   - End break (if implemented)
2. Verify each type queued correctly
3. Go online and verify all process

**Expected Results:**
- [ ] All action types supported in queue
- [ ] Each action has correct type field
- [ ] Data structure preserved in IndexedDB
- [ ] All actions process successfully when online
- [ ] Order maintained (FIFO)

---

## 3. PWA Features Testing

### 3.1 Service Worker Registration

**Test Steps:**
1. Open DevTools → Application → Service Workers
2. Verify service worker registered
3. Check status is "activated and running"
4. Verify update on reload enabled

**Expected Results:**
- [ ] Service worker file: `sw.js`
- [ ] Status: Activated
- [ ] Scope: `/`
- [ ] Update on reload: Enabled

---

### 3.2 Manifest & Install

**Test Steps:**
1. Open DevTools → Application → Manifest
2. Verify manifest properties
3. Look for install prompt (Chrome address bar)
4. Click install button
5. Verify app installs as PWA

**Expected Results:**
- [ ] Manifest name: "Torre Tempo"
- [ ] Short name: "Tempo"
- [ ] Theme color: #0a0a0a
- [ ] Display mode: standalone
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] Opens in standalone window (no browser UI)

---

### 3.3 Cache Strategy Testing

**Test Steps:**
1. Open DevTools → Application → Cache Storage
2. Verify caches created:
   - workbox-runtime
   - workbox-precache
   - api-cache
3. Make API request
4. Verify response cached
5. Go offline
6. Make same API request
7. Verify served from cache

**Expected Results:**
- [ ] API responses cached for 5 minutes
- [ ] NetworkFirst strategy working
- [ ] Cache expires after 5 minutes
- [ ] Max 50 entries in api-cache
- [ ] Offline requests served from cache

---

### 3.4 Haptic Feedback Testing

**Requirements:**
- Mobile device with vibration support

**Test Steps:**
1. Enable vibration in device settings
2. Click method selection buttons → Should vibrate (light)
3. Clock in successfully → Should vibrate (2 pulses)
4. Trigger error → Should vibrate (3 pulses)
5. Scan QR code → Should vibrate (2 pulses)
6. Read NFC tag → Should vibrate (2 pulses)

**Expected Results:**
- [ ] Light vibration: 10ms single pulse
- [ ] Success vibration: 20ms, pause 100ms, 20ms
- [ ] Error vibration: 30ms, pause 50ms, 30ms, pause 50ms, 30ms
- [ ] Graceful degradation on unsupported devices

---

## 4. Cross-Browser Testing

### Desktop Browsers

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Clock-in (Tap) | ✅ | ✅ | ✅ | ✅ |
| Clock-in (QR) | ✅ | ✅ | ✅ | ✅ |
| Clock-in (PIN) | ✅ | ✅ | ✅ | ✅ |
| Offline Queue | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ✅ | ⚠️ | ⚠️ |
| Haptic (N/A) | N/A | N/A | N/A | N/A |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ⚠️ | ⚠️ |

### Mobile Browsers

| Feature | Chrome Android | Safari iOS | Edge Mobile | Firefox Android |
|---------|----------------|------------|-------------|-----------------|
| Clock-in (Tap) | ✅ | ✅ | ✅ | ✅ |
| Clock-in (NFC) | ✅ | ❌ | ❌ | ❌ |
| Clock-in (QR) | ✅ | ✅ | ✅ | ✅ |
| Clock-in (PIN) | ✅ | ✅ | ✅ | ✅ |
| Offline Queue | ✅ | ✅ | ✅ | ✅ |
| Background Sync | ✅ | ⚠️ | ✅ | ⚠️ |
| Haptic | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ | ⚠️ |

**Legend:**
- ✅ Fully Supported
- ⚠️ Partial Support / Fallback
- ❌ Not Supported

---

## 5. Performance Testing

### Load Time Metrics

**Targets:**
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1

**Test Tool**: Chrome DevTools Lighthouse

---

### Bundle Size Analysis

**Current Build:**
- Total Bundle: 1,165.57 kB
- Gzipped: 347.10 kB
- CSS: 53.90 kB (gzipped: 9.08 kB)

**Optimization Opportunities:**
- Code splitting for large routes
- Dynamic imports for clock-in methods
- Tree shaking verification

---

## 6. Security Testing

### Authentication

- [ ] Session expires after 15 minutes
- [ ] Session updates on activity (24h refresh)
- [ ] Logout clears session completely
- [ ] Protected routes redirect to sign-in
- [ ] API endpoints require authentication

### PIN Security

- [ ] PIN hashed with bcrypt (10 rounds)
- [ ] PIN never sent in plain text
- [ ] PIN not logged in console
- [ ] PIN verification server-side only
- [ ] Failed PIN attempts logged

### API Security

- [ ] CORS configured correctly
- [ ] Rate limiting active (100 req/min)
- [ ] Helmet security headers applied
- [ ] No sensitive data in logs

---

## 7. Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] Color contrast ratio > 4.5:1
- [ ] ARIA labels present
- [ ] Touch targets > 44x44px

---

## Test Execution Summary

**Automated Tests:**
- [x] TypeScript Compilation
- [x] Build Verification
- [x] Linting (if configured)

**Manual Tests Required:**
- [ ] Clock-in methods (4 methods × multiple scenarios)
- [ ] Offline queue (multiple scenarios)
- [ ] Background sync
- [ ] Cross-browser compatibility
- [ ] Mobile device testing
- [ ] Performance metrics
- [ ] Security verification

**Estimated Testing Time:**
- Setup: 30 minutes
- Clock-in methods: 1 hour
- Offline/sync: 1 hour
- Cross-browser: 30 minutes
- Performance/security: 30 minutes
- **Total: ~3-4 hours**

---

## Issues Found

_Document any issues discovered during testing:_

### Issue Template
```
**Issue #**: 
**Severity**: Critical / High / Medium / Low
**Component**: 
**Description**: 
**Steps to Reproduce**: 
**Expected**: 
**Actual**: 
**Fix**: 
```

---

## Sign-Off

- [ ] All critical tests passed
- [ ] All high-priority tests passed
- [ ] Known issues documented
- [ ] Performance meets targets
- [ ] Security verified
- [ ] Ready for production deployment

**Tester**: _______________  
**Date**: _______________  
**Signature**: _______________

---

**Next Step**: Production Deployment (p3-15)
