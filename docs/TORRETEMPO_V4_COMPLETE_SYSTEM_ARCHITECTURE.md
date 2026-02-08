# Torre Tempo V4 - Complete System Architecture
## The Deputy Killer - Reimagined

**Version**: 2.0  
**Date**: February 8, 2026  
**Author**: System Architect  
**Status**: 🟢 Design Phase - Comprehensive Blueprint

---

## 📚 Table of Contents

**PART 1: PERSONAS & USER JOURNEYS** [Page 10]
- 1.1 Core Personas
- 1.2 Daily Workflows by Persona
- 1.3 Pain Points & Goals
- 1.4 UX Expectations

**PART 2: CORE WORKFLOWS** [Page 50]
- 2.1 Time Tracking Workflow
- 2.2 Roster Management Workflow
- 2.3 Shift Swap Workflow
- 2.4 Correction Request Workflow
- 2.5 Leave Request Workflow
- 2.6 Compliance Monitoring Workflow
- 2.7 Reporting Workflow
- 2.8 Payroll Export Workflow
- 2.9 Onboarding Workflow
- 2.10 Inspector Audit Workflow

**PART 3: COMPLETE DATABASE SCHEMA** [Page 130]
- 3.1 Schema Overview
- 3.2 Core Tables
- 3.3 New Tables Required
- 3.4 Relationships & Constraints
- 3.5 Indexes & Performance
- 3.6 Audit Trail Design

**PART 4: COMPLIANCE ENGINE** [Page 170]
- 4.1 Spanish Labor Law Rules
- 4.2 Validation Engine
- 4.3 Alert System
- 4.4 Inspector API
- 4.5 Compliance Reports

**PART 5: INTEGRATION ARCHITECTURE** [Page 200]
- 5.1 Event-Driven Design
- 5.2 Background Jobs
- 5.3 Real-Time Updates
- 5.4 Offline Sync Strategy

**PART 6: UX/UI DESIGN SYSTEM** [Page 220]
- 6.1 Mobile-First Principles
- 6.2 Interaction Patterns
- 6.3 Component Library
- 6.4 Accessibility & i18n

**PART 7: REPORTING SYSTEM** [Page 250]
- 7.1 Report Architecture
- 7.2 PDF Generation
- 7.3 Email Delivery
- 7.4 Report Templates

**PART 8: NOTIFICATION SYSTEM** [Page 270]
- 8.1 Notification Channels
- 8.2 Template Engine
- 8.3 Preferences & Right to Disconnect
- 8.4 Delivery Tracking

**PART 9: IMPLEMENTATION ROADMAP** [Page 285]
- 9.1 12-Week Implementation Plan
- 9.2 Dependencies & Risks
- 9.3 Testing Strategy
- 9.4 Deployment Phases

---

# EXECUTIVE SUMMARY

Torre Tempo V4 is a **mobile-first, offline-capable, compliance-obsessed workforce management system** designed specifically for Spanish SMBs in hospitality, retail, and service industries.

## The Vision

**What if time tracking was so simple that employees actually WANTED to use it?**

- 🟢 **Clock in**: One tap. Geofencing knows you're at work. Done in 2 seconds.
- 🔄 **Swap shift**: Tap colleague's name. They approve. Manager notified. Calendar updates. All in 30 seconds.
- 📊 **Manager review**: Visual timeline shows who's here, who's late, who clocked overtime. Approve corrections with a swipe.
- 📄 **Payroll export**: Click "Generate Report". PDF downloads with all hours, breaks, overtime, variances. Inspector-ready.

## The Problem We're Solving

**Current systems are built for offices, not restaurants.**

A waiter arrives at 7:55am for 8:00am shift:
- ❌ Current system: Navigate 3 menus, select location, select project, add notes, click clock in, wait for GPS... **45 seconds, frustrated**
- ✅ Torre Tempo: Open app (already on clock-in screen), tap giant button, haptic feedback. **2 seconds, delighted**

A manager needs Friday's timesheet for payroll:
- ❌ Current system: Export CSV, open Excel, calculate hours, find variances, create PDF, email to payroll... **45 minutes, error-prone**
- ✅ Torre Tempo: Open Reports → Tap "Weekly Timesheet" → Variance highlighted in red → Tap "Send to Payroll". **1 minute, accurate**

An ITSS inspector arrives for audit:
- ❌ Current system: Scramble to find 7 years of records, export from multiple systems, verify signatures... **2 hours, stressful**
- ✅ Torre Tempo: Generate inspector token (valid 7 days), send link, inspector has read-only access to everything SHA-256 verified. **5 minutes, confident**

## Core Principles

1. **Mobile-First**: 80% of interactions happen on phones in restaurants/shops
2. **Offline-First**: Bad wifi in kitchens, basements, retail back rooms
3. **One-Tap Actions**: Every frequent task should be completable in <5 seconds
4. **Compliance by Default**: Spanish labor law enforced automatically, not optional
5. **Beautiful UX**: Glassmorphism, smooth animations, haptic feedback - feels premium
6. **Inspector-Ready**: Every action logged, SHA-256 audit chain, read-only API
7. **No Surprises**: Predictable behavior, clear errors, undo capability

---

---

# PART 1: PERSONAS & USER JOURNEYS

## 1.1 Core Personas

### Persona 1: María (Employee - Waitress)

**Profile**:
- Age: 24
- Role: Waitress at "Restaurante La Torre" (70-seat restaurant in Murcia)
- Tech Savvy: Medium (uses Instagram, WhatsApp daily)
- Contract: Indefinido (permanent), 30 hours/week
- Work Schedule: Variable shifts (lunch & dinner service)
- Device: Personal Android phone (Samsung Galaxy A54)
- Language: Spanish native, basic English

**Daily Work Context**:
- Arrives 10 minutes before shift
- Clocks in from back room (often poor wifi)
- Works lunch service (12pm-4pm) or dinner (7pm-11pm)
- Takes mandated 15-min break during long shifts
- Sometimes asks colleagues to swap shifts (sick child, university exam)
- Clocks out after cleanup
- Checks schedule for next week on bus ride home

**Pain Points with Old Systems**:
- ❌ Clock-in system was clunky - had to type employee number every time
- ❌ Couldn't request shift swaps digitally - had to ask manager in person
- ❌ Didn't know if her hours were tracked correctly (fear of payroll errors)
- ❌ Manager sometimes scheduled her for 45 hours (illegal) and she didn't realize until payday
- ❌ Paper timesheets were in back office - couldn't check her hours during shift
- ❌ When she requested time off, manager forgot - no digital trail

**Goals with Torre Tempo**:
- ✅ Clock in/out in <5 seconds without thinking
- ✅ See her schedule for next 2 weeks on her phone
- ✅ Request shift swaps with colleagues instantly
- ✅ Get confirmation when manager approves/rejects requests
- ✅ Trust that her hours are accurate (see them in real-time)
- ✅ Never work illegal overtime (system warns her and manager)
- ✅ Request time off digitally with audit trail

**Key Interactions** (Frequency):
- Clock in/out: **2x per day** (10x/week)
- View schedule: **5x per week**
- Request shift swap: **1-2x per month**
- Check hours worked this week: **2x per week**
- Request time off: **1x per month**

**Device Context**:
- Always mobile phone (never desktop)
- Often in noisy restaurant environment
- Sometimes in basement with spotty wifi
- Hands may be wet/dirty (kitchen context)
- Needs large tap targets, clear UI

**Expected UX**:
- App opens directly to clock-in screen if near workplace
- Giant green button: "CLOCK IN" (can't miss it)
- Haptic feedback + sound when clocked successfully
- Visual confirmation: "Clocked in at 11:58am ✓"
- See today's shift highlighted on home screen
- Notifications: "Your shift starts in 30 minutes"

---

### Persona 2: Carlos (Manager - Shift Supervisor)

**Profile**:
- Age: 32
- Role: Shift Supervisor at "Restaurante La Torre"
- Tech Savvy: High (uses Slack, Google Sheets, manages Instagram)
- Contract: Indefinido (permanent), 40 hours/week + occasional overtime
- Work Schedule: Usually 11am-8pm (covers lunch+dinner prep)
- Devices: iPhone 14 Pro + MacBook Air (office)
- Language: Spanish native, fluent English

**Daily Work Context**:
- Arrives 30min early to prep for service
- Checks who clocked in (attendance tracking)
- During service: Monitors if anyone clocked overtime alerts
- Approves shift swaps from staff
- Handles "forgot to clock in/out" corrections
- End of day: Reviews timesheet, approves pending corrections
- Weekly: Creates next week's roster (Monday for following week)
- Monthly: Generates timesheet for payroll (last Friday of month)

**Pain Points with Old Systems**:
- ❌ Had to manually calculate hours from paper timesheets (2 hours/week wasted)
- ❌ Didn't know who was clocked in vs who was actually present (no live view)
- ❌ Staff forgot to clock in → had to remember who worked that day → errors
- ❌ Shift swap requests via WhatsApp → hard to track → conflicts
- ❌ Creating roster in Excel → copy-paste errors → staff showed up wrong days
- ❌ Compliance violations not caught until ITSS inspection (stressful)
- ❌ Couldn't see overtime building up in real-time → budget overruns

**Goals with Torre Tempo**:
- ✅ Live dashboard: Who's clocked in RIGHT NOW (real-time)
- ✅ See variance: Scheduled 8:00am, actually clocked 8:07am (visual timeline)
- ✅ Approve shift swaps with one tap (push notification → review → approve)
- ✅ Get alerts when someone approaching overtime (proactive)
- ✅ Roster creation with drag-drop + automatic compliance checks
- ✅ One-click timesheet export for payroll (zero manual work)
- ✅ Correction requests centralized (not via WhatsApp)

**Key Interactions** (Frequency):
- Check live attendance: **5x per day**
- Approve correction requests: **3-5x per week**
- Approve shift swaps: **2-3x per week**
- Create roster: **1x per week (Monday)**
- Generate timesheet: **1x per month (last Friday)**
- Review compliance alerts: **As they arrive (2-3x per week)**

**Device Context**:
- 60% mobile (iPhone in restaurant)
- 40% desktop (office for roster creation, reports)
- Needs quick actions on mobile, detailed views on desktop
- Interruptions frequent (service calls)

**Expected UX**:
- Home screen: Live attendance widget (green dots = clocked in)
- Red badge on "Corrections" if pending approvals
- Roster builder: Drag staff cards to shifts, red highlight if compliance issue
- Notifications: "María requests swap: Sunday 12pm → Sarah. Approve?"
- Swipe to approve/reject (like Tinder)
- Timesheet export: "Generate" → PDF downloads instantly

---

### Persona 3: Laura (HR Administrator / Payroll)

**Profile**:
- Age: 41
- Role: HR & Payroll Administrator for "Grupo Restaurantes Torre" (5 restaurants, 60 employees)
- Tech Savvy: Medium (uses Excel extensively, basic Sage accounting software)
- Contract: Indefinido (permanent), 40 hours/week
- Work Schedule: Office hours 9am-6pm
- Device: Desktop PC (Windows 11) + occasional laptop
- Language: Spanish native

**Daily Work Context**:
- Monday morning: Reviews last week's timesheets for anomalies
- Processes correction requests from managers
- Checks compliance alerts (missed breaks, overtime violations)
- Handles employee questions about hours/pay
- Last week of month: Generates payroll reports for all locations
- Quarterly: Prepares ITSS audit reports
- Monthly: Reviews labor cost vs budget
- Handles new employee onboarding (contracts, DNI, SSN entry)

**Pain Points with Old Systems**:
- ❌ Had to manually combine timesheets from 5 locations (Excel nightmare)
- ❌ Variances between scheduled vs actual hours not highlighted → errors
- ❌ No central view of compliance violations across locations
- ❌ Employee questions: "How many hours did I work in January?" → had to dig through files
- ❌ ITSS inspector requested 7 years of records → took 2 days to compile
- ❌ Break violations not tracked → fined €5,000 during inspection
- ❌ New employee onboarding: Paper forms → manual data entry → typos

**Goals with Torre Tempo**:
- ✅ Single dashboard: All locations, all employees, real-time status
- ✅ Automated payroll export: All data pre-calculated, ready for Sage import
- ✅ Compliance dashboard: Red flags for violations (breaks, rest, overtime)
- ✅ Employee self-service: Staff can check their own hours (reduces questions)
- ✅ Audit-ready reports: Generate inspector-compliant PDF with SHA-256 verification
- ✅ Digital onboarding: Collect DNI, SSN, contract info via forms (no paper)
- ✅ Historical data search: "Show me all of María's shifts in Q2 2025"

**Key Interactions** (Frequency):
- Review timesheets: **Daily (15 min/day)**
- Approve correction requests: **5-10x per week**
- Check compliance dashboard: **Daily**
- Generate payroll export: **1x per month (critical)**
- Generate compliance reports: **1x per quarter**
- Onboard new employee: **1-2x per month**
- Answer employee questions: **3-5x per week**

**Device Context**:
- 95% desktop (dual monitor setup)
- Needs detailed tables, filters, exports
- Works with multiple browser tabs open
- Requires keyboard shortcuts for speed

**Expected UX**:
- Dashboard: Cards for each location with compliance score (0-100)
- Red badge: "3 compliance issues require attention"
- Table view: All employees, sortable/filterable, inline edit for corrections
- Export button: "Generate Payroll CSV" → Sage-compatible format downloads
- Search: "Type employee name → See all history"
- Onboarding wizard: Step-by-step form, auto-validates DNI/SSN format

---

### Persona 4: Javier (Owner / CEO)

**Profile**:
- Age: 54
- Role: Owner of "Grupo Restaurantes Torre" (5 restaurants)
- Tech Savvy: Medium (uses iPad, prefers mobile apps)
- Contract: Self-employed (Autónomo)
- Work Schedule: Variable (visits locations, attends meetings, travels)
- Devices: iPad Pro + iPhone 14 Pro Max
- Language: Spanish native, business English

**Daily Work Context**:
- Morning: Checks key metrics on iPad over coffee (labor cost %, attendance)
- Visits restaurants: Walks through, chats with managers, observes operations
- Meetings with accountant: Reviews financials (labor is biggest variable cost)
- Strategic planning: Decides on new hires, budget allocation, expansion plans
- Quarterly: Reviews compliance status (ITSS risk mitigation)
- Annually: Strategic review of labor efficiency vs revenue

**Pain Points with Old Systems**:
- ❌ No visibility into real-time labor costs across locations
- ❌ Couldn't tell which locations were over/under staffed without calling managers
- ❌ Surprise overtime costs at month-end (no early warnings)
- ❌ ITSS fines were unexpected (no proactive compliance monitoring)
- ❌ Couldn't benchmark labor efficiency between locations
- ❌ Questions like "Who's our most reliable employee?" → no data
- ❌ Had to trust managers' paper timesheets (no verification)

**Goals with Torre Tempo**:
- ✅ Executive dashboard: KPIs at a glance (labor cost %, attendance rate, overtime %)
- ✅ Real-time visibility: Which locations are operational right now? Who's working?
- ✅ Trend analysis: Labor cost as % of revenue over time (by location)
- ✅ Compliance peace of mind: Green score = no ITSS risk, red = urgent action needed
- ✅ Benchmarking: Compare locations (hours per guest served, labor efficiency)
- ✅ Trusted data: SHA-256 audit trail = no disputes with employees or inspectors
- ✅ Strategic insights: Turnover rate, average tenure, training completion

**Key Interactions** (Frequency):
- Check executive dashboard: **Daily (5 min)**
- Review location performance: **Weekly (30 min)**
- Review compliance status: **Weekly**
- Deep dive into reports: **Monthly (quarterly board meetings)**
- Compare locations: **Monthly**

**Device Context**:
- 80% iPad (lounging on sofa, in car, at restaurant table)
- 20% iPhone (quick checks)
- Never desktop (delegates details to Laura)
- Wants high-level summaries, not details

**Expected UX**:
- Dashboard: Beautiful cards with key metrics + trend arrows (↑↓)
- Map view: All 5 locations with live status (green = operational, grey = closed)
- Tap location → Drill down to details (who's working, today's labor cost)
- Charts: Labor cost % trend over 6 months, comparing locations
- Compliance widget: Traffic light system (🟢 all good, 🟡 warnings, 🔴 urgent)
- One-tap reports: "Email me this month's summary" → PDF in inbox

---

### Persona 5: Inspector Carmen (ITSS Labor Inspector)

**Profile**:
- Age: 47
- Role: Labor Inspector at Inspección de Trabajo y Seguridad Social (ITSS)
- Tech Savvy: Medium (uses government systems, reads PDFs, basic Excel)
- Organization: Spanish Ministry of Labor
- Device: Government-issued laptop (Windows 10)
- Language: Spanish official, some English

**Work Context**:
- Conducts 3-5 business inspections per week
- Checks compliance with Spanish labor law (Estatuto de los Trabajadores)
- Requests documentation: Contracts, timesheets, break logs, rest periods
- Verifies: Working hours, overtime, breaks, rest between shifts
- Issues fines: For violations (€1,000-€10,000 per violation)
- Surprise inspections: No advance notice (business must provide data on-spot)

**What She Needs from Torre Tempo**:
- ✅ **Instant access**: Generate read-only token valid for 7 days (no account creation)
- ✅ **Complete records**: Last 7 years of data (legal requirement)
- ✅ **Immutable proof**: SHA-256 audit trail (can't be tampered)
- ✅ **Filtered views**: "Show me all shifts for María González in Q3 2024"
- ✅ **Export capability**: Download PDFs for official records
- ✅ **Compliance reports**: Pre-generated reports showing break compliance, rest periods
- ✅ **Audit log**: Who made changes, when, why (correction audit trail)

**Key Interactions** (Frequency):
- Access company data: **During inspection (1-2 hours)**
- Review time records: **Every shift for selected employees**
- Export reports: **Multiple PDFs for file**
- Verify compliance: **Cross-reference with legal requirements**

**Device Context**:
- Government laptop (slower performance)
- Prefers simple interfaces (no fancy animations)
- Needs printable reports (official documentation)
- Internet may be slow at inspection sites

**Expected UX**:
- Simple login: Enter token → Read-only access
- Clean interface: Tables, filters, search (no distractions)
- Quick filters: "Show only breaks < 15 minutes" → Violations highlighted
- Download button: "Export Selected Records" → PDF with official header
- Audit trail view: Timeline showing all corrections with reasons
- Compliance report: Pre-generated summary of violations with legal references

---

### Persona 6: Ana (New Employee - First Day)

**Profile**:
- Age: 19
- Role: New hire at "Restaurante La Torre" (first job)
- Tech Savvy: High (Gen Z, grew up with smartphones)
- Contract: Temporal (6 month trial), 20 hours/week (part-time student)
- Device: Personal iPhone 12
- Language: Spanish native, fluent English

**First Day Experience**:
- Arrives nervous, doesn't know anyone
- Needs to set up account, provide documents (DNI, SSN, bank details)
- Doesn't know how to clock in
- Doesn't know where to see her schedule
- Worried about making mistakes

**Pain Points with Old Systems**:
- ❌ Paper forms to fill out (confusing, no validation)
- ❌ Manager manually entered her details → typos → payroll issues
- ❌ Clock-in system not explained → clocked in wrong → correction needed
- ❌ Didn't receive login credentials → couldn't access schedule → showed up wrong day

**Goals with Torre Tempo**:
- ✅ **Digital onboarding**: Receive invitation email → Fill forms on phone → Auto-validated
- ✅ **Guided first clock-in**: Tutorial overlay: "Tap here to clock in"
- ✅ **Immediate access**: See her schedule for first week right away
- ✅ **Help available**: In-app help button, chat with manager
- ✅ **Confidence**: Clear UI, can't make mistakes (system guides her)

**Key Interactions** (First Week):
- Complete onboarding: **First day (15 min)**
- First clock-in: **First shift (with guidance)**
- View schedule: **Multiple times per day (anxiety about making mistake)**
- Ask questions: **Via in-app messaging**

**Expected UX**:
- Email invitation: "Welcome to Torre Tempo! Complete your profile"
- Onboarding wizard: Profile photo → Contact info → Documents (DNI scan)
- First login: Welcome tour (3 screens showing key features)
- Clock-in screen: Big tutorial overlay: "Welcome Ana! Tap this button when you arrive"
- Home screen: "Your shift today: 5:00pm-9:00pm at La Torre" (reassuring)
- Help button: Always visible, opens FAQ or chat with manager

---

## 1.2 Daily Workflows by Persona

### María (Employee) - Typical Tuesday

**6:30 AM** - Wakes up
- Opens Torre Tempo (muscle memory, like checking Instagram)
- Home screen shows: "Your shift today: 12:00pm - 4:00pm at La Torre"
- Feels calm (knows her schedule)

**11:45 AM** - On bus to work
- Notification arrives: "Your shift starts in 15 minutes"
- Taps notification → App opens to clock-in screen (pre-loaded)
- Sees: "Clock in when you arrive" button (disabled - not at location yet)

**11:55 AM** - Arrives at restaurant
- Enters through back door (still in parking lot)
- Geofence detects she's within 50m of restaurant
- Button changes from grey to GREEN: "CLOCK IN"
- Taps button → Haptic buzz → "Clocked in at 11:56 AM ✓"
- Screen shows: "Scheduled: 12:00pm | Early by 4 minutes ✓"
- Puts phone in locker, starts prep work

**12:00 PM - 3:45 PM** - Working lunch service
- Phone stays in locker (no distractions)
- Service goes well, busy day

**2:30 PM** - Mandated break
- Manager tells her: "Take your 15-minute break"
- Opens app → Big button now says "START BREAK"
- Taps → Timer starts (15:00 countdown visible)
- Scrolls TikTok for 15 minutes
- Notification: "Break ending in 1 minute"
- Taps "END BREAK" → Back to work

**4:02 PM** - Shift ending
- Finishes cleanup
- Opens app → "CLOCK OUT" button (now red)
- Taps → "Clocked out at 4:03 PM ✓"
- Screen shows: "Today's hours: 4 hours 7 minutes (includes 15-min break)"
- Satisfied (knows she got paid correctly)

**4:15 PM** - On bus home
- Opens app to check schedule for rest of week
- Sees Thursday 7pm shift
- Remembers she has university exam Friday morning
- Taps Thursday shift → "Request Swap" button
- Sees list of colleagues: Sarah, Diego, Carmen (who also work dinner shifts)
- Taps Sarah's name → "Request swap with Sarah?"
- Adds note: "Tengo examen el viernes 😅"
- Taps "Send Request"
- Notification sent to Sarah: "María wants to swap Thursday 7pm shift. Accept?"

**4:30 PM** - At home
- Notification arrives: "Sarah accepted your swap request!"
- Opens app → Sees green checkmark: "Swap pending manager approval"
- Relief (one less thing to worry about)

**6:00 PM** - Evening
- Final notification: "Carlos approved your shift swap ✓"
- Calendar updated automatically
- Thursday now shows: "Day Off" (green)
- Friday shows: No shift (can study for exam)
- Goes to bed stress-free

**Total time in app today**: ~3 minutes (perfect!)

---

### Carlos (Manager) - Typical Monday

**10:30 AM** - Arrives at restaurant
- Opens Torre Tempo on iPhone while walking to office
- Glances at home screen: Live Attendance widget
  - 3 green dots: "José, Carmen, Diego" (kitchen prep staff clocked in)
  - 1 grey dot: "María" (scheduled but not yet arrived for 12pm shift)
- Satisfied (everyone who should be here is here)

**10:45 AM** - In office, switches to MacBook
- Opens Torre Tempo desktop app
- Today's view: Timeline showing scheduled shifts vs actual clock-ins
  - José: Scheduled 10:00, Clocked 9:58 (green - early)
  - Carmen: Scheduled 10:00, Clocked 10:09 (yellow - late but acceptable)
  - Diego: Scheduled 10:30, Clocked 10:31 (green - on time)
- No action needed (all within 15-min tolerance)

**11:15 AM** - Notification arrives
- Red badge on Corrections tab: "1 new request"
- Opens: María submitted "Forgot to clock out yesterday"
  - Requested time: 4:00 PM (scheduled end)
  - Reason: "Se me olvidó, estaba ocupada limpiando"
  - Attached: Photo of her signing out in paper log book (backup proof)
- Carlos remembers: Yes, she worked until 4pm yesterday
- Swipes right to approve
- System creates correction entry with Carlos's approval timestamp
- María gets notification: "Your correction was approved ✓"

**11:30 AM** - Roster Planning Time
- Task: Create next week's roster (Week of Feb 10-16)
- Opens Roster Builder (desktop)
- Left panel: Staff cards (names, availability, hours worked this month)
- Right panel: Weekly calendar grid (Mon-Sun, each day split into shifts)
- Starts drag-dropping staff onto shifts:

**Monday Lunch (12-4pm)**:
- Drags María → Slot turns green (available, no conflicts)
- Drags Sarah → Slot turns RED: "Conflict: Sarah already scheduled 12-4pm at Torre Murcia location"
- Oops, wrong location. Undoes.
- Drags Diego instead → Green (good)

**Tuesday Dinner (7-11pm)**:
- Drags María → Slot turns YELLOW: "Warning: 39 hours this week, will exceed 40 if added"
- Hovers for details: "María: 36h confirmed + this 4h shift = 40h (within limit)"
- Green checkmark appears (compliance OK)
- Drops her on shift → Confirmed

**Friday Dinner (7-11pm)**:
- Tries to add José → Slot turns RED: "Violation: José clocked out 11:15pm yesterday, needs 12h rest. Earliest: 11:15am Friday"
- System blocks the action (can't violate rest period)
- Carlos picks someone else

**Roster complete**:
- All shifts filled, no red flags
- Clicks "Preview & Publish"
- Modal shows: "Ready to publish roster for Feb 10-16?"
  - "7 staff members will receive notifications"
  - "Roster locks Monday 12am (no changes without manager approval)"
- Clicks "Publish"
- System sends push notifications to all staff: "New roster published for next week 📅"

**12:30 PM** - Lunch service starting
- Monitors live dashboard on iPhone
- Sees María clocked in at 11:56 (early, good)
- Sarah clocked in at 12:01 (on time)
- Diego not clocked in yet (scheduled for 12:00, now 12:30)
- Red alert appears: "Diego is 30 minutes late (no clock-in)"
- Carlos calls Diego → He's sick, forgot to notify
- Carlos opens app → Marks Diego as "Absent - Sick"
- System logs absence, notifies HR (Laura)
- Carlos quickly reassigns Diego's tasks to other staff

**3:00 PM** - Shift Swap Notification
- Push notification: "María requests swap: Thursday 7pm → Sarah. Review?"
- Opens app → Sees swap request with note: "Tengo examen el viernes 😅"
- Checks Sarah's hours: 28 this week (within limit)
- Checks María's hours: Will be 36 after swap (fine)
- Both qualified for dinner service (compliance check passes)
- Swipes right to approve
- Both María and Sarah get instant notifications

**5:00 PM** - Reviewing Corrections
- 2 more correction requests pending:
  1. Carmen: "Clocked out 5 minutes early" (manager permission given verbally)
     - Approves with note: "Kitchen closed early, gave permission"
  2. Sarah: "Forgot to take break" (wants to add 15-min break retroactively)
     - REJECTS with note: "Please take breaks during shift, can't add retroactively"
- Sarah gets notification explaining rejection

**8:00 PM** - End of day review
- Opens Compliance tab
- Today's summary:
  - ✓ All staff took mandated breaks
  - ✓ No overtime violations
  - ⚠️ 1 warning: José approached 40h limit (39.5h this week)
  - Note for next week: Don't schedule José for extra shifts
- Satisfied (no issues)

**Total time in app today**: ~45 minutes (efficient!)

---

### Laura (HR Admin) - Typical Last Friday of Month (Payroll Day)

**9:00 AM** - Arrives at office, coffee in hand
- Opens Torre Tempo on desktop (dual monitors)
- Left monitor: Compliance Dashboard
- Right monitor: Payroll Prep workspace

**9:15 AM** - Compliance Review (Monthly)
- Compliance Dashboard shows:
  - 🟢 Overall Score: 94/100 (Excellent)
  - ⚠️ 3 warnings this month:
    1. José: 1 shift with <12h rest (approved by manager with justification)
    2. María: 1 missed break (doctor's note provided)
    3. Diego: Exceeded 40h in week 3 (overtime approved + paid)
  - 🔴 0 critical violations (relief!)
- Clicks "Generate Monthly Compliance Report"
  - PDF downloads: "Compliance_Report_January_2026.pdf"
  - 15 pages showing:
    - Summary of all shifts
    - Break compliance by employee
    - Rest period compliance
    - Overtime hours
    - Signed corrections
  - Saves to shared drive for quarterly ITSS audit prep

**9:45 AM** - Payroll Export
- Clicks "Payroll" tab → "Generate Monthly Report"
- Filter: "All locations, January 1-31, 2026"
- Clicks "Generate"
- System calculates (takes 10 seconds for 60 employees):
  - Regular hours
  - Overtime hours (1.5x rate)
  - Break time (deducted if unpaid)
  - Approved corrections included
  - Unapproved corrections excluded (flagged in red)
- Table appears showing all employees:

| Employee | Location | Regular Hours | OT Hours | Breaks | Gross Hours | Notes |
|----------|----------|---------------|----------|--------|-------------|-------|
| María G. | La Torre | 124.0 | 0 | 6.25 | 124.0 | ✓ Clean |
| José R.  | La Torre | 158.5 | 4.0 | 7.5 | 162.5 | ⚠️ 1 correction pending |
| Sarah M. | Murcia   | 132.0 | 2.0 | 6.0 | 134.0 | ✓ Clean |

- Sees José has pending correction (manager hasn't approved yet)
- Sends message to José's manager Carlos: "Please review José's correction before 12pm"

**10:15 AM** - Correction Review
- Opens Corrections tab → "Pending" filter
- 8 pending corrections across all locations
- Reviews each one:
  1. Carmen: "Clocked in 10 min late" - Approved by manager → Laura approves final
  2. Diego: "Forgot to clock out" - Manager approved, reasonable time → Laura approves
  3. María: "Add break that wasn't logged" - REJECTED 3 days ago by manager → Laura closes
  4. ...continues through list...
- By 10:45am: All corrections processed

**11:00 AM** - Carlos approves José's correction
- Notification arrives: "New approval from Carlos"
- Refreshes payroll table → José's row now green ✓
- All data ready

**11:15 AM** - Final Export
- Clicks "Export for Payroll"
- Select format: "Sage CSV" (compatible with their accounting software)
- Clicks "Download"
- CSV downloads instantly with columns:
  - Employee ID, Name, DNI, Location, Regular Hours, OT Hours, Gross Pay
- Opens Sage accounting software
- Imports CSV → All data flows in automatically (no manual entry!)
- Validates totals: 2,480 regular hours + 67 OT hours = €48,320 gross payroll
- Matches budget (relief!)

**11:30 AM** - Variance Analysis
- Opens Reports → "Variance Analysis - Monthly"
- Shows discrepancies between scheduled hours vs actual hours:
  - La Torre location: Scheduled 520h, Actual 498h (-22h = understaffed some shifts)
  - Murcia location: Scheduled 480h, Actual 492h (+12h = overstaffed)
- Makes note to discuss with managers: "La Torre needs more staff? Check absenteeism rate"

**12:00 PM** - New Employee Onboarding
- Email arrives: "New hire starting Monday - Ana Martínez"
- Clicks "Add Employee" in Torre Tempo
- Onboarding wizard starts:
  - Step 1: Basic Info (name, email, phone) → Sends invitation email to Ana
  - Step 2: Employment Details (location: La Torre, role: Waitress, contract: Temporal 6mo)
  - Step 3: Documents Required (list: DNI, SSN, Bank Details, Contract signed)
  - Step 4: Schedule (working hours: 20h/week, availability: evenings/weekends)
- Clicks "Send Invitation"
- Ana receives email: "Welcome to Torre Tempo! Complete your profile before Monday"

**2:00 PM** - Responding to Employee Questions
- Message from María: "How many hours did I work in Q4 2025? Need for tax return"
- Opens María's profile → "History" tab → Filter: Oct-Dec 2025
- System calculates: 312 hours total
- Clicks "Generate Employee Report" → PDF downloads showing detailed breakdown by month
- Sends PDF to María via email
- María replies: "Gracias! 😊"

**3:00 PM** - Compliance Alert
- Red notification: "⚠️ Work Permit Expiring Soon"
- Opens Compliance → "Documents" tab
- Sees: Diego's work permit expires in 45 days (March 25)
- System auto-generated alert (configured to notify 60 days before expiry)
- Sends email to Diego: "Please renew your work permit, we need updated documentation"
- Sets reminder to follow up in 2 weeks

**4:30 PM** - Monthly Reporting for Owner (Javier)
- Prepares executive summary for Javier
- Opens Reports → "Executive Dashboard - January 2026"
- Key metrics automatically calculated:
  - Total labor hours: 2,547 (all locations)
  - Labor cost: €48,320
  - Revenue: €185,000 (from POS integration)
  - Labor cost %: 26.1% (within target of <28%)
  - Average overtime: 1.1 hours/employee (low - good)
  - Compliance score: 94/100 (excellent)
  - Absenteeism rate: 3.2% (acceptable)
- Clicks "Email to Javier"
- System sends PDF report with charts to Javier's email

**5:30 PM** - End of day
- All payroll processed ✓
- All corrections resolved ✓
- Compliance checked ✓
- New employee onboarded ✓
- Closes laptop, satisfied (payroll day used to take 6 hours, now done in 3!)

**Total time in app today**: ~3 hours (50% time savings vs old system!)

---

### Javier (Owner) - Typical Wednesday Morning

**7:30 AM** - Morning coffee, checking phone
- Opens Torre Tempo on iPad
- Executive Dashboard loads instantly
- Top of screen: "5 Locations | 58 Active Employees | 94/100 Compliance"

**Key Metrics (Card View)**:
1. **Labor Cost This Week**
   - €11,240 (26.3% of revenue)
   - ↓ 1.2% vs last week (green arrow - good)
   - Chart: 7-day trend showing daily labor cost

2. **Live Operations**
   - La Torre: 🟢 3 staff clocked in (prep for lunch)
   - Murcia: 🟢 2 staff clocked in
   - Cartagena: ⚪ Closed (opens at 12pm)
   - Alicante: 🟢 4 staff clocked in
   - Valencia: ⚪ Closed

3. **This Month Overview**
   - Total hours worked: 1,847 (out of ~2,400 budgeted for month)
   - On track for labor budget ✓
   - 0 ITSS violations (green badge)

4. **Alerts**
   - ⚠️ 1 warning: Diego work permit expires in 42 days
   - 🟢 No critical issues

**Taps "La Torre" location** → Drill down view:
- Today: 8 staff scheduled (lunch + dinner service)
- This week: Labor cost €2,180 (25.9% of revenue - excellent)
- Top performers: María (4.8/5.0 attendance rating), José (4.9/5.0)
- Red flag: Sarah late 3 times this week (needs manager discussion)

**8:00 AM** - Quarterly Board Meeting Prep
- Needs Q1 2026 labor analytics for investors
- Taps "Reports" → "Quarterly Summary"
- Selects: Jan-Mar 2026, All locations
- System generates 12-page PDF report showing:
  - Labor cost trend by month (chart)
  - Revenue vs labor cost % (target: <28%, actual: 26.4% ✓)
  - Productivity: Hours per €1,000 revenue (efficiency metric)
  - Turnover: 2 employees left, 3 hired (net +1, low turnover - good)
  - Compliance: 95/100 average score (no fines, no violations)
  - Overtime: Minimal (1.2 hours/employee/month average)
- Taps "Email to Accountant"
- Report sent to accountant for board packet

**9:30 AM** - Strategic Decision: Expand Valencia Location?
- Considering hiring 5 more staff for Valencia (high demand)
- Opens Torre Tempo → "Scenario Planning" tool
- Current Valencia metrics:
  - 12 staff, 480 hours/month, €9,600 labor cost
  - Revenue: €38,000/month
  - Labor cost %: 25.3%
- Adds scenario: "+5 staff, +200 hours/month"
  - Projected labor cost: +€4,000 = €13,600 total
  - If revenue increases 30% → €49,400
  - New labor cost %: 27.5% (still within target)
  - ROI: Positive ✓
- Decides: Approve expansion, tells Laura to post job listings

**10:00 AM** - Manager Check-In (Carlos)
- Carlos sends message via Torre Tempo: "Need to discuss staffing for Easter weekend"
- Javier opens Messages tab
- Carlos: "Easter Sunday is busy, want to schedule extra staff but worried about overtime costs"
- Javier: "Show me the forecast"
- Carlos shares link to Easter roster draft
- Javier reviews: 15 staff scheduled, projected labor cost €3,200 (for €14,000 revenue = 22.9%)
- Javier: "Looks good, approve it. Make sure everyone confirms availability"

**11:00 AM** - Visiting La Torre Location
- Arrives at restaurant (physical visit)
- Opens Torre Tempo on iPhone while walking through
- Live view shows: 4 staff currently clocked in (kitchen prep)
- Chats with María who's prepping (asks how she likes new system)
- María: "Es mucho más fácil! Before I was always worried about my hours"
- Javier satisfied (employee happiness is key)

**12:00 PM** - Lunch meeting with accountant
- Accountant asks: "How confident are you in your labor data for Q1?"
- Javier: "100%. Every hour tracked, SHA-256 verified, audit-ready"
- Accountant: "Good, because last year's discrepancy cost you €12,000 in corrections"
- Javier: "That's why we switched to Torre Tempo. Zero disputes now"

**Total time in app today**: ~20 minutes (executive view, no deep dives needed)

---

## 1.3 Pain Points & Goals Summary

### Universal Pain Points (All Personas)

❌ **Old System**:
1. **No Real-Time Visibility**: Managers didn't know who was clocked in until end of day
2. **Manual Calculations**: HR spent hours in Excel calculating payroll
3. **Paper Trail Nightmare**: ITSS inspector requests → 2 days to compile records
4. **Compliance Reactive**: Violations discovered during inspection (too late)
5. **No Mobile-First**: Employees had to use clunky desktop kiosks
6. **Communication Gaps**: Shift swaps via WhatsApp → lost messages → conflicts
7. **No Trust**: Employees worried about payroll errors, no way to verify
8. **Time Waste**: Managers spent 5+ hours/week on timekeeping admin

### Universal Goals (All Personas)

✅ **Torre Tempo**:
1. **Real-Time Everything**: Live dashboard shows who's working right now
2. **Automation**: System calculates hours, overtime, breaks automatically
3. **Instant Audit Trail**: Generate inspector-ready PDF in 30 seconds
4. **Proactive Compliance**: Alerts before violations happen
5. **Mobile-First**: 80% of actions on phone in <5 seconds
6. **Centralized Communication**: All requests in-app with audit trail
7. **Transparency**: Employees see their hours in real-time, trust the system
8. **Time Savings**: Managers spend <1 hour/week on timekeeping

---

### Role-Specific Goals Matrix

| Goal | María (Employee) | Carlos (Manager) | Laura (HR) | Javier (Owner) |
|------|------------------|------------------|------------|----------------|
| **Quick clock in/out** | ⭐⭐⭐ Critical | ✓ Important | — | — |
| **See schedule** | ⭐⭐⭐ Critical | ✓ Important | — | — |
| **Request shift swaps** | ⭐⭐⭐ Critical | ⭐⭐ High | — | — |
| **Trust hours are accurate** | ⭐⭐⭐ Critical | ⭐⭐ High | ⭐⭐⭐ Critical | ⭐ Medium |
| **Live attendance view** | — | ⭐⭐⭐ Critical | ⭐⭐ High | ⭐⭐ High |
| **Approve corrections quickly** | — | ⭐⭐⭐ Critical | ⭐⭐⭐ Critical | — |
| **Create roster efficiently** | — | ⭐⭐⭐ Critical | — | — |
| **Automated compliance checks** | ⭐⭐ High | ⭐⭐⭐ Critical | ⭐⭐⭐ Critical | ⭐⭐ High |
| **One-click payroll export** | — | — | ⭐⭐⭐ Critical | — |
| **ITSS audit readiness** | — | ⭐⭐ High | ⭐⭐⭐ Critical | ⭐⭐ High |
| **Labor cost visibility** | — | ⭐⭐ High | ⭐⭐ High | ⭐⭐⭐ Critical |
| **Strategic insights** | — | — | ⭐⭐ High | ⭐⭐⭐ Critical |

---

## 1.4 UX Expectations by Device Context

### Mobile (Employee Primary Device)

**Context**: Restaurant environment, hands may be wet, noisy, poor wifi, standing/walking

**UX Requirements**:
1. **Giant Tap Targets**: Minimum 60px height (industry standard: 44px)
   - "CLOCK IN" button: Full-width, 80px height, can't miss it
   - All action buttons: Minimum 48px for accessibility

2. **High Contrast**: Works in bright sunlight (outdoor terraces) and dim lighting (wine cellars)
   - Dark mode by default (glassmorphism with high contrast text)
   - WCAG AAA contrast ratios

3. **Offline-First**: App works without internet
   - Clock-ins queued locally in IndexedDB
   - Auto-sync when connection restored
   - Clear offline indicator (yellow banner: "Offline - will sync when connected")

4. **One-Hand Operation**: Most actions reachable with thumb
   - Bottom tab navigation
   - Key actions in bottom 60% of screen
   - No top-right navigation (hard to reach on large phones)

5. **Haptic Feedback**: Confirms actions without looking at screen
   - Clock in: Success pattern (3 short buzzes)
   - Clock out: Different pattern (2 long buzzes)
   - Error: Distinct warning pattern (1 long + 1 short)

6. **Fast Load**: App opens in <1 second
   - PWA with service worker
   - Aggressive caching
   - Lazy load non-critical screens

7. **Minimal Text Entry**: Use pickers, dropdowns, tap-to-select
   - Avoid typing (restaurant context = dirty hands)
   - Voice input option for notes

8. **Clear Visual Feedback**: Always know what happened
   - Toast notifications (3 seconds, dismissible)
   - Loading states (skeleton screens, not spinners)
   - Error states (clear message + suggested action)

---

### Desktop (Manager/HR Primary Device)

**Context**: Office environment, dual monitors, keyboard+mouse, long sessions, multitasking

**UX Requirements**:
1. **Dense Information Display**: Utilize screen space
   - Tables with 8-10 columns visible
   - Side-by-side panels (roster on left, details on right)
   - Zoom levels (100%, 125%, 150%)

2. **Keyboard Shortcuts**: Power users need speed
   - `Cmd/Ctrl + K`: Quick search
   - `Cmd/Ctrl + N`: New shift
   - `Cmd/Ctrl + S`: Save roster
   - `Cmd/Ctrl + P`: Approve selected
   - `Escape`: Close modal
   - Arrow keys: Navigate table rows

3. **Bulk Actions**: Select multiple items, act once
   - Checkbox column in tables
   - "Select All" header checkbox
   - Bulk approve/reject/delete with confirmation

4. **Advanced Filters**: Narrow down data quickly
   - Multi-select dropdowns (Location + Role + Status)
   - Date range pickers
   - Search with autocomplete
   - Save filter presets ("My Favorites")

5. **Drag & Drop**: Intuitive roster building
   - Drag staff cards onto calendar slots
   - Drag shifts to reschedule
   - Visual feedback (drop zones highlight on hover)

6. **Tooltips & Help**: Inline documentation
   - Hover over field labels → tooltip explains
   - Help icon next to complex features
   - Inline validation errors below field

7. **Right-Click Context Menus**: Quick actions
   - Right-click employee row → "View Profile" | "Send Message" | "Edit"
   - Right-click shift → "Duplicate" | "Delete" | "Assign Staff"

8. **Window Management**: Support multitasking
   - Open links in new tab (Cmd/Ctrl + Click)
   - Modals don't block background (can still scroll/view data)
   - Breadcrumb navigation

---

### Tablet (Owner Primary Device)

**Context**: Casual review (sofa, car, restaurant table), touch-first, larger screen than phone

**UX Requirements**:
1. **Executive Summary Cards**: High-level overview
   - Large cards with key metrics (tap to drill down)
   - Charts visible at a glance
   - Traffic light indicators (🟢🟡🔴)

2. **Swipe Gestures**: Natural tablet interactions
   - Swipe between locations (carousel)
   - Swipe to approve/reject (like Tinder)
   - Pull-down to refresh

3. **Landscape Orientation**: Wide view for dashboards
   - 2-column layout (metrics on left, details on right)
   - Charts optimized for landscape (wider aspect ratio)

4. **Touch-Optimized**: Larger tap targets than desktop
   - 48px minimum (in between mobile 60px and desktop 40px)
   - Touch-friendly form controls (no tiny checkboxes)

5. **Presentation Mode**: Show reports to others
   - Full-screen chart view
   - Hide sensitive details (salary data)
   - "Share" button (email PDF, AirDrop)

---

### Inspector Token Access (Laptop)

**Context**: Government laptop (slower performance), official inspection, formal tone

**UX Requirements**:
1. **Simple, Professional Design**: No flashy animations
   - Clean white background (printable)
   - Standard fonts (Arial, system default)
   - Minimal colors (black text, blue links, red warnings)

2. **Table-Centric**: Familiar to inspectors
   - Traditional data tables (not cards)
   - Sortable columns (click header)
   - Pagination (not infinite scroll)

3. **Print-Friendly**: Everything exportable
   - "Print" button on every report
   - PDF download with official header
   - Page breaks at logical points

4. **Clear Legal References**: Cite laws
   - Violation table shows: "Article 34.4 - Descanso diario mínimo 12 horas"
   - Compliance report references Estatuto de los Trabajadores

5. **Audit Trail Visible**: Show who did what when
   - Correction history with timestamps
   - Manager approval signatures (digital)
   - SHA-256 hash displayed for verification

6. **No Account Required**: Token-based access
   - Simple URL: `time.lsltgroup.es/inspector/{token}`
   - No signup, no cookies, no tracking
   - Token expires after 7 days (security)

---

## 1.5 Emotional Journey Map

### María's Emotional Arc (First Week Using Torre Tempo)

**Monday - First Shift**:
- 😰 **Anxious** (7:50am): "Will I know how to clock in?"
- 😊 **Relieved** (8:00am): Sees giant "CLOCK IN" button, taps it, works instantly
- 🙂 **Satisfied** (8:01am): "That was easier than Instagram"

**Wednesday - Checking Schedule**:
- 😟 **Worried** (bus ride home): "When do I work this weekend?"
- 😌 **Calm** (opens app): Sees schedule for next 2 weeks clearly displayed
- 💚 **Trusting** (bedtime): Feels in control of her life

**Thursday - Requesting Swap**:
- 😬 **Stressed** (evening): "I have exam Friday, need to swap Thursday shift"
- 🤔 **Uncertain** (old way): "Do I WhatsApp Sarah? Text manager? What if they forget?"
- 😃 **Confident** (uses Torre Tempo): Taps "Request Swap", picks Sarah, sends in 10 seconds
- 🎉 **Delighted** (30 min later): Notification "Swap approved!" - instant relief

**Friday - Checking Hours**:
- 🤨 **Skeptical** (morning): "Are my hours tracked correctly?"
- 🧐 **Curious** (opens History tab): Sees every shift, exact minutes, break times
- 😍 **Loyal** (realization): "I'll never worry about payroll errors again"

**Emotional Shift**: 😰 Anxious → 😌 Calm → 💚 Trusting → 😍 Loyal

---

### Carlos's Emotional Arc (First Month Using Torre Tempo)

**Week 1 - Setup & Learning**:
- 😓 **Overwhelmed** (Monday): "Another new system to learn..."
- 🤔 **Curious** (Tuesday): "Wait, this roster builder is actually intuitive"
- 😯 **Surprised** (Wednesday): "It auto-checks compliance? That's... helpful"

**Week 2 - Building Confidence**:
- 🙂 **Satisfied** (Monday): Approved 5 corrections in 2 minutes (used to take 30 min)
- 😎 **Impressed** (Thursday): Live attendance view saved him (caught late employee immediately)
- 💡 **Realizing Value** (Friday): "I'm spending way less time on admin"

**Week 3 - Dependence**:
- 😬 **Concerned** (Monday): App down for 2 minutes during update → felt lost
- 😅 **Relieved** (app back online): "I rely on this now"
- 🚀 **Empowered** (Week end): Generated monthly report in 5 minutes (used to take 3 hours)

**Week 4 - Evangelizing**:
- 🤝 **Advocate** (telling other managers): "You need to see this system"
- 😊 **Grateful** (end of month): "Torre Tempo gave me my weekends back"

**Emotional Shift**: 😓 Overwhelmed → 🤔 Curious → 😎 Impressed → 🚀 Empowered → 🤝 Advocate

---

### Laura's Emotional Arc (Payroll Day Transformation)

**Before Torre Tempo (Old Payroll Friday)**:
- 😫 **Dreading** (Thursday night): "Tomorrow is payroll day... 6-hour Excel marathon"
- 😤 **Frustrated** (Friday 9am): Combining 5 spreadsheets, formulas breaking
- 😰 **Anxious** (Friday 2pm): Finding discrepancies, calling managers for clarification
- 😵 **Exhausted** (Friday 5pm): Finally done, but still worried about errors
- 😴 **Drained** (Friday evening): Too tired to enjoy weekend

**After Torre Tempo (First Payroll Friday)**:
- 😐 **Skeptical** (Thursday night): "This better work..."
- 😲 **Shocked** (Friday 9am): Clicks "Generate Payroll" → Done in 10 seconds
- 🤔 **Suspicious** (Friday 9:15am): "That was too easy, let me verify..."
- 😯 **Impressed** (Friday 10am): Spot-checked 10 employees → all accurate
- 🎊 **Jubilant** (Friday 11am): "I'm DONE with payroll by 11am?!"
- 😍 **Converted** (Friday 1pm): Tells owner "Best investment we ever made"
- 🍷 **Celebrating** (Friday evening): Enjoying long weekend, stress-free

**Emotional Shift**: 😫 Dreading → 😲 Shocked → 🎊 Jubilant → 😍 Converted

---

---

# PART 2: CORE WORKFLOWS

## 2.1 Time Tracking Workflow (Complete End-to-End)

### Overview
**Goal**: Accurately track when employees start/stop work and breaks, with minimal friction

**Key Actors**: Employee (María), Manager (Carlos), System

**Frequency**: 2x per day per employee (clock in + clock out)

**Success Metrics**:
- Clock-in time: <3 seconds average
- Accuracy: 99.9% (no missing clock-ins/outs)
- Employee satisfaction: >4.5/5.0
- Disputes: <1% of clock events

---

### State Machine: Time Entry Lifecycle

```
[No Entry] 
    ↓ (Employee arrives at work)
[Clocking In] 
    ↓ (Tap "CLOCK IN" button)
[Clocked In - Active]
    ↓ (Working)
[Taking Break] (optional)
    ↓ (Tap "START BREAK")
[On Break - Active]
    ↓ (15 minutes elapsed)
[Resuming Work]
    ↓ (Tap "END BREAK")
[Clocked In - Active]
    ↓ (Shift ending)
[Clocking Out]
    ↓ (Tap "CLOCK OUT")
[Clocked Out - Complete]
    ↓ (Manager reviews)
[Approved] or [Flagged for Correction]
    ↓ (If correction needed)
[Correction Requested]
    ↓ (Manager approves)
[Correction Approved - Final]
    ↓ (End of month)
[Exported to Payroll]
```

---

### Workflow Step-by-Step

#### **Step 1: Pre-Clock-In (Employee Approaching Work)**

**Trigger**: Employee opens app OR app auto-opens via geofence

**System Checks**:
1. Is employee within 50m of assigned work location? (Geofence)
   - YES → Enable "CLOCK IN" button (green)
   - NO → Disable button (grey) with message: "You're not at {Location Name} yet"
2. Does employee have a scheduled shift today?
   - YES → Show shift time: "Your shift: 12:00pm - 4:00pm"
   - NO → Show: "You're not scheduled today. Still need to clock in?"
3. Is employee already clocked in?
   - YES → Show "CLOCK OUT" button instead
   - NO → Show "CLOCK IN" button

**UI State**:
```
┌─────────────────────────────────┐
│  🟢 You're at La Torre          │ ← Geofence detected
├─────────────────────────────────┤
│  Your shift today:              │
│  12:00 PM - 4:00 PM             │
│  (Starts in 5 minutes)          │
├─────────────────────────────────┤
│                                 │
│    ┌─────────────────────┐     │
│    │   🟢 CLOCK IN       │     │ ← Giant button
│    └─────────────────────┘     │
│                                 │
│  Scheduled: 12:00 PM            │
│  Current time: 11:55 AM         │
└─────────────────────────────────┘
```

---

#### **Step 2: Clock In (Employee Taps Button)**

**User Action**: Tap "CLOCK IN"

**System Actions** (Synchronous, <500ms):
1. Capture exact timestamp: `2026-02-10T11:56:23.456Z`
2. Capture GPS coordinates: `lat: 37.9922, lng: -1.1307` (for geofence verification)
3. Create `time_entry` record:
   ```sql
   INSERT INTO time_entries (
     id, user_id, organization_id, location_id,
     clock_in_time, clock_in_method, clock_in_gps,
     scheduled_start_time, shift_id, status
   ) VALUES (
     uuid_generate_v4(),
     'user_maria_id',
     'org_la_torre_id',
     'location_la_torre_id',
     '2026-02-10T11:56:23.456Z',
     'mobile_app',  -- Method: mobile_app | nfc | qr | pin | manual
     '37.9922,-1.1307',
     '2026-02-10T12:00:00.000Z',  -- Scheduled time
     'shift_12345',  -- Link to shift
     'active'  -- Status: active | completed | flagged
   );
   ```
4. **Audit Log** (SHA-256 chain):
   ```sql
   INSERT INTO audit_log (
     id, organization_id, action, actor_id,
     target_type, target_id, details, hash, previous_hash
   ) VALUES (
     uuid_generate_v4(),
     'org_la_torre_id',
     'time_entry.clock_in',
     'user_maria_id',
     'time_entry',
     'time_entry_xyz',
     '{"method":"mobile_app","scheduled":"12:00","actual":"11:56"}',
     sha256(...),  -- Current hash
     'abc123...'   -- Previous entry hash (chain)
   );
   ```
5. Check compliance rules (async, don't block UI):
   - Has 12 hours passed since last clock-out? (Rest period law)
   - Is this employee approaching 40h/week limit?
   - Is this a valid shift (not deleted/cancelled)?
6. Send notification to manager (async):
   - Push notification: "María clocked in at 11:56am (4 min early)"
7. Update live attendance dashboard (WebSocket broadcast)

**UI Feedback** (Immediate, <100ms):
- Haptic feedback: Success pattern (3 short buzzes)
- Sound: Pleasant "ding" (if phone not on silent)
- Visual: Button changes to green checkmark
- Toast notification: "Clocked in at 11:56 AM ✓"
- Screen updates to show:
  ```
  ┌─────────────────────────────────┐
  │  ✓ You're clocked in            │
  ├─────────────────────────────────┤
  │  Started: 11:56 AM              │
  │  Scheduled: 12:00 PM            │
  │  Early by 4 minutes ✓           │
  ├─────────────────────────────────┤
  │  Current shift: 0h 3m           │
  │  (Elapsed time, live update)    │
  ├─────────────────────────────────┤
  │    ┌─────────────────────┐     │
  │    │  🔴 CLOCK OUT       │     │ ← Now shows clock out
  │    └─────────────────────┘     │
  └─────────────────────────────────┘
  ```

**Edge Cases Handled**:
1. **Employee clocks in too early** (>15 min before shift):
   - Warning toast: "⚠️ You're 25 minutes early. Clock in anyway?"
   - Requires confirmation tap (prevents accidental early clock-ins)
   
2. **Employee clocks in too late** (>15 min after shift):
   - Warning toast: "⚠️ You're 20 minutes late. Manager will be notified."
   - Still allows clock-in (don't punish employee with system)
   - Flags entry for manager review
   
3. **Employee not at location** (geofence fails):
   - Error: "You're not at La Torre. Are you at the right location?"
   - Show map with restaurant pin
   - Option: "I'm here but GPS is wrong" → Manual override (logs GPS issue)
   
4. **Employee already clocked in**:
   - Error: "You're already clocked in since 11:56am"
   - Show "CLOCK OUT" button instead
   
5. **Offline** (no internet):
   - Clock-in still works (stored locally in IndexedDB)
   - Yellow banner: "Offline - Will sync when connected"
   - Entry queued with UUID, syncs when online
   
6. **No scheduled shift today**:
   - Confirmation dialog: "You're not scheduled today. Clock in anyway?"
   - Options: "Yes, I'm covering" | "No, mistake"
   - If "Yes", flags for manager review (potential emergency coverage)

---

#### **Step 3: Active Shift (Employee Working)**

**System State**: `time_entry.status = 'active'`

**UI Display** (Home Screen While Clocked In):
```
┌─────────────────────────────────┐
│  🟢 Working Now                 │
│  La Torre - Waitress            │
├─────────────────────────────────┤
│  ⏱️ 2h 14m elapsed              │ ← Live timer (updates every minute)
│  Clocked in: 11:56 AM           │
│  Scheduled end: 4:00 PM         │
│  (1h 46m remaining)             │
├─────────────────────────────────┤
│  Today's breaks:                │
│  [No breaks taken yet]          │
│  ⚠️ You must take a 15-min      │
│     break (legal requirement)   │
├─────────────────────────────────┤
│    ┌─────────────────────┐     │
│    │  ☕ START BREAK     │     │
│    └─────────────────────┘     │
│    ┌─────────────────────┐     │
│    │  🔴 CLOCK OUT       │     │
│    └─────────────────────┘     │
└─────────────────────────────────┘
```

**Background Processes** (Running While Active):
1. **Compliance Monitoring** (Every 15 minutes):
   - Check if employee approaching 40h/week
   - Alert: "⚠️ You have 38.5h this week. Approaching limit."
   - Notify manager if employee hits 38h (proactive)

2. **Break Reminder** (Smart timing):
   - If shift > 6 hours AND no break taken after 3 hours:
     - Notification: "Take your 15-minute break soon (legal requirement)"
   - If shift > 4 hours AND 30 min before end:
     - Urgent notification: "⚠️ Take break now or you'll miss legal window"

3. **Attendance Sync** (Real-time via WebSocket):
   - Manager's dashboard shows green dot next to María's name
   - If María's phone goes offline > 5 min:
     - Yellow dot (connection issue, but still clocked in)

4. **Shift End Reminder** (15 min before scheduled end):
   - Notification: "Your shift ends in 15 minutes"
   - Prepares employee to wrap up tasks

---

#### **Step 4: Taking Break (Optional but Recommended)**

**Trigger**: Employee taps "START BREAK"

**System Actions**:
1. Create `break_entry` record:
   ```sql
   INSERT INTO break_entries (
     id, time_entry_id, user_id, organization_id,
     break_start_time, break_type, status
   ) VALUES (
     uuid_generate_v4(),
     'time_entry_xyz',
     'user_maria_id',
     'org_la_torre_id',
     '2026-02-10T14:30:00.000Z',
     'unpaid',  -- Type: paid | unpaid
     'active'   -- Status: active | completed
   );
   ```
2. Update `time_entry`:
   ```sql
   UPDATE time_entries 
   SET current_break_id = 'break_xyz'
   WHERE id = 'time_entry_xyz';
   ```
3. Audit log entry (SHA-256)
4. Notify manager (async): "María started break at 2:30pm"

**UI Updates**:
```
┌─────────────────────────────────┐
│  ☕ On Break                    │
│  Started: 2:30 PM               │
├─────────────────────────────────┤
│  ⏱️ 14:32 remaining              │ ← Countdown timer
│  (15 minutes mandated)          │
├─────────────────────────────────┤
│  Enjoy your break! 😊           │
│  You'll get a reminder when     │
│  it's time to return.           │
├─────────────────────────────────┤
│    ┌─────────────────────┐     │
│    │  ✓ END BREAK        │     │ ← Green when ready
│    └─────────────────────┘     │
└─────────────────────────────────┘
```

**Break Timer Logic**:
- Countdown: 15:00 → 14:59 → ... → 0:00
- At 1:00 remaining: Notification "Break ends in 1 minute"
- At 0:00: Notification "Break time complete" + Button turns green
- If employee doesn't end break:
  - After 5 min overtime: Gentle notification "Are you still on break?"
  - After 15 min overtime: Alert manager "María's break extended to 30 min"

**Edge Cases**:
1. **Employee forgets to end break**:
   - System auto-ends break after 60 minutes (safety limit)
   - Flags entry for manager review: "Break extended beyond normal"
   
2. **Employee ends break early** (e.g., 10 min instead of 15):
   - Allowed (employee choice)
   - Records actual break duration: 10 minutes
   - Payroll: Only 10 min deducted (not full 15)
   
3. **Multiple breaks**:
   - Allowed for long shifts (>8 hours typically have 2 breaks)
   - System tracks each break separately
   - Compliance check: Total break time meets legal minimums

---

#### **Step 5: End Break (Resume Work)**

**Trigger**: Employee taps "END BREAK"

**System Actions**:
1. Update `break_entry`:
   ```sql
   UPDATE break_entries
   SET break_end_time = '2026-02-10T14:45:30.000Z',
       status = 'completed',
       duration_minutes = 15.5  -- Calculated: (end - start) / 60
   WHERE id = 'break_xyz';
   ```
2. Clear active break from `time_entry`:
   ```sql
   UPDATE time_entries
   SET current_break_id = NULL
   WHERE id = 'time_entry_xyz';
   ```
3. Audit log entry
4. Notify manager: "María ended break at 2:45pm (15 min duration)"

**UI Updates**:
- Returns to "Active Shift" screen (Step 3)
- Toast: "Break complete. Back to work! ✓"
- Total break time shown: "15 minutes break taken today"

---

#### **Step 6: Clock Out (End of Shift)**

**Trigger**: Employee taps "CLOCK OUT"

**Pre-Clock-Out Validation** (Before allowing clock-out):
1. **Break Check** (If shift > 6 hours):
   - Has employee taken required break?
   - NO → Warning dialog:
     ```
     ⚠️ Legal Requirement
     
     You must take a 15-minute break for shifts over 6 hours.
     
     [Go Back - Take Break]  [Clock Out Anyway]
     ```
   - If "Clock Out Anyway": Flags for manager review, logs compliance violation

2. **Location Check**:
   - Is employee still at workplace? (Geofence)
   - NO → Warning: "You're away from {Location}. Clock out anyway?"
   - Logs GPS at clock-out (audit trail)

**System Actions** (On confirmed clock-out):
1. Update `time_entry`:
   ```sql
   UPDATE time_entries
   SET 
     clock_out_time = '2026-02-10T16:03:45.000Z',
     clock_out_method = 'mobile_app',
     clock_out_gps = '37.9922,-1.1307',
     scheduled_end_time = '2026-02-10T16:00:00.000Z',
     status = 'completed',
     total_minutes = 247,  -- Calculated: (clock_out - clock_in) / 60
     break_minutes = 15,   -- Sum of all breaks
     worked_minutes = 232  -- Total - breaks = 3h 52m
   WHERE id = 'time_entry_xyz';
   ```

2. **Automatic Calculations**:
   - Total time: Clock out - Clock in = 4h 7m
   - Break time: Sum of all breaks = 15m
   - Worked time: Total - Breaks = 3h 52m
   - Variance: Actual vs Scheduled = +3 min (worked 3 min extra)
   - Classification:
     - Regular hours: 3h 52m (within normal shift)
     - Overtime: 0 (didn't exceed 40h/week)

3. **Compliance Checks** (Post clock-out):
   - ✓ Break taken (15 min)
   - ✓ Shift duration < 12 hours (OK)
   - ✓ Rest period for next shift: Next shift is Thurs 12pm (>12h rest ✓)
   - ⚠️ Slight overtime: Worked 3 min extra (acceptable variance)

4. **Audit Log** (SHA-256 chain continues)

5. **Notifications**:
   - To Employee: "Clocked out at 4:03 PM. Today: 3h 52m worked ✓"
   - To Manager: "María clocked out at 4:03pm (3 min late, 3h 52m worked)"

**UI Feedback**:
```
┌─────────────────────────────────┐
│  ✓ Shift Complete               │
├─────────────────────────────────┤
│  Clocked in:  11:56 AM          │
│  Clocked out: 4:03 PM           │
│  Break: 15 minutes              │
├─────────────────────────────────┤
│  Total worked: 3h 52m           │
│  Scheduled: 4h 0m               │
│  Variance: +3 minutes           │
├─────────────────────────────────┤
│  This week: 19h 45m             │ ← Running total
│  (20h 15m remaining until 40h)  │
├─────────────────────────────────┤
│  Next shift: Thursday 12pm      │
└─────────────────────────────────┘
```

**Edge Cases**:
1. **Employee forgets to clock out**:
   - System detects: Clock-in but no clock-out after 14 hours
   - Auto-creates correction request: "Did you forget to clock out?"
   - Suggests clock-out time: Scheduled end time (4:00pm)
   - Manager reviews and approves actual end time

2. **Excessive overtime** (>2 hours past scheduled):
   - Dialog: "⚠️ You're clocking out 2h 15m late. Manager approval needed."
   - Entry flagged for manager review
   - Manager gets notification: "María worked significant overtime, please verify"

3. **Employee clocks out too early** (>15 min before scheduled end):
   - Dialog: "You're leaving 25 minutes early. Authorized by manager?"
   - Options: "Yes, manager approved" | "No, mistake"
   - If "Yes": Flags for manager confirmation
   - Manager must approve early departure

4. **Location mismatch at clock-out**:
   - Employee is 500m away from restaurant when clocking out
   - Warning: "You're not at La Torre. Did you leave already?"
   - Logs GPS discrepancy for review
   - Valid case: Delivery driver ends shift at last delivery location

---

#### **Step 7: Manager Review (End of Day)**

**Trigger**: Manager opens "Today's Timesheet" dashboard

**Manager View** (Desktop):
```
┌────────────────────────────────────────────────────────────────┐
│  Today's Timesheet - La Torre - Monday, Feb 10, 2026          │
├────────────────────────────────────────────────────────────────┤
│  Employee     │ Scheduled │ Actual      │ Variance │ Status    │
├───────────────┼───────────┼─────────────┼──────────┼───────────┤
│ María G.      │ 12-4pm    │ 11:56-4:03  │ +7 min   │ ✓ Clean   │
│ José R.       │ 10-6pm    │ 10:02-6:15  │ +13 min  │ ✓ Clean   │
│ Sarah M.      │ 12-8pm    │ 12:05-8:00  │ +5 min   │ ✓ Clean   │
│ Diego L.      │ 10-6pm    │ Not clocked │ ⚠️ Missing│ 🔴 Action │
│ Carmen S.     │ 5-11pm    │ 5:00-10:45  │ -15 min  │ ⚠️ Review │
└───────────────┴───────────┴─────────────┴──────────┴───────────┘
```

**Manager Actions**:
1. **Review Clean Entries** (María, José, Sarah):
   - No action needed
   - System auto-marks as `approved` after 48 hours if no manager action

2. **Missing Clock-In** (Diego):
   - Click row → "What happened?"
   - Options:
     - "Employee worked but forgot to clock" → Manual entry dialog
     - "Employee absent - sick day" → Mark absence
     - "Employee absent - unauthorized" → Disciplinary flag
   - If manual entry: Enter times, add note, approve
   - Audit trail: Manager manually created entry (logged)

3. **Early Departure** (Carmen clocked out 15 min early):
   - Click row → See details: "Left at 10:45pm (scheduled 11pm)"
   - Manager recalls: Kitchen closed early due to slow night, gave permission
   - Click "Approve" → Add note: "Kitchen closed early, authorized"
   - Entry marked as `approved`

**Variance Tolerance Settings** (Configurable per organization):
- Green (auto-approve): ±10 minutes variance
- Yellow (review but not critical): ±15 minutes
- Red (requires action): >15 minutes variance

---

#### **Step 8: Correction Workflow** (If Issues Found)

**Scenario**: Employee forgot to clock out, needs correction

**Employee View** (María realizes she forgot to clock out yesterday):
```
┌─────────────────────────────────┐
│  Request Correction             │
├─────────────────────────────────┤
│  Shift: Mon Feb 10, 12pm-4pm    │
│  Current: Clocked in 11:56am    │
│           No clock out 🔴       │
├─────────────────────────────────┤
│  What needs correcting?         │
│  [x] Add clock-out time         │
│  [ ] Change clock-in time       │
│  [ ] Add missed break           │
├─────────────────────────────────┤
│  Clock-out time:                │
│  [4][:][ 0][ 0] [PM]            │ ← Time picker
├─────────────────────────────────┤
│  Reason (required):             │
│  ┌─────────────────────────┐   │
│  │ Se me olvidó, estaba    │   │
│  │ ocupada limpiando       │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  Attach proof (optional):       │
│  [📷 Add Photo]                 │
├─────────────────────────────────┤
│  [Cancel]  [Submit Request]     │
└─────────────────────────────────┘
```

**System Creates Correction Request**:
```sql
INSERT INTO correction_requests (
  id, time_entry_id, user_id, organization_id,
  requested_at, request_type, details, status
) VALUES (
  uuid_generate_v4(),
  'time_entry_xyz',
  'user_maria_id',
  'org_la_torre_id',
  NOW(),
  'add_clock_out',
  '{"original_clock_out":null,"requested_clock_out":"2026-02-10T16:00:00Z","reason":"Se me olvidó, estaba ocupada limpiando","photo_url":"..."}',
  'pending'  -- Status: pending | approved | rejected
);
```

**Manager Notification**:
- Push: "María requested correction: Add clock-out 4:00pm"
- Opens correction review screen:

```
┌─────────────────────────────────┐
│  Correction Request #C-1234     │
├─────────────────────────────────┤
│  From: María González           │
│  Date: Mon Feb 10, 2026         │
│  Status: Pending Your Approval  │
├─────────────────────────────────┤
│  Original:                      │
│  Clock in:  11:56 AM ✓         │
│  Clock out: Missing 🔴          │
├─────────────────────────────────┤
│  Requested Change:              │
│  Add clock out: 4:00 PM         │
├─────────────────────────────────┤
│  Reason:                        │
│  "Se me olvidó, estaba ocupada  │
│   limpiando"                    │
├─────────────────────────────────┤
│  Evidence:                      │
│  📷 [View Photo]                │
├─────────────────────────────────┤
│  Manager Notes (optional):      │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  [← Swipe to Reject]            │
│  [Swipe to Approve →]           │
└─────────────────────────────────┘
```

**Manager Swipes Right to Approve**:
1. System updates `time_entry`:
   ```sql
   UPDATE time_entries
   SET 
     clock_out_time = '2026-02-10T16:00:00Z',
     status = 'completed',
     correction_applied = TRUE,
     correction_request_id = 'correction_xyz'
   WHERE id = 'time_entry_xyz';
   ```

2. Updates `correction_request`:
   ```sql
   UPDATE correction_requests
   SET 
     status = 'approved',
     approved_by = 'manager_carlos_id',
     approved_at = NOW(),
     manager_notes = 'Verified with CCTV, left at 4pm'
   WHERE id = 'correction_xyz';
   ```

3. **Audit Log** (CRITICAL for compliance):
   ```sql
   INSERT INTO audit_log (
     action, actor_id, target_type, target_id,
     details, hash, previous_hash
   ) VALUES (
     'time_entry.correction_approved',
     'manager_carlos_id',
     'time_entry',
     'time_entry_xyz',
     '{"correction_id":"correction_xyz","field":"clock_out_time","original":null,"new":"16:00","reason":"Forgot to clock out","approved_by":"Carlos M."}',
     sha256(...),  -- New hash includes correction
     'prev_hash'   -- Chain maintained
   );
   ```

4. Notify María: "Your correction was approved ✓"

**Correction Audit Trail** (Viewable by inspector):
- Shows WHO requested (María)
- Shows WHAT changed (Added clock-out 4:00pm)
- Shows WHY (Reason: Forgot, busy cleaning)
- Shows WHEN requested (Feb 11, 9:00am)
- Shows WHO approved (Carlos)
- Shows WHEN approved (Feb 11, 10:15am)
- Shows EVIDENCE (Photo attached)
- SHA-256 hash BEFORE and AFTER correction (immutable proof)

---

#### **Step 9: Payroll Export (End of Month)**

**Trigger**: HR (Laura) generates monthly payroll report

**System Actions**:
1. Query all `time_entries` for month:
   ```sql
   SELECT 
     u.id, u.name, u.email,
     ep.dni_nie_encrypted, ep.social_security_number_encrypted,
     SUM(te.worked_minutes) AS total_minutes,
     SUM(CASE WHEN te.worked_minutes > (40*60) THEN te.worked_minutes - (40*60) ELSE 0 END) AS overtime_minutes,
     COUNT(DISTINCT te.id) AS shift_count,
     COUNT(DISTINCT cr.id) AS correction_count
   FROM time_entries te
   JOIN "user" u ON te.user_id = u.id
   JOIN employee_profiles ep ON ep.user_id = u.id
   LEFT JOIN correction_requests cr ON cr.time_entry_id = te.id AND cr.status = 'approved'
   WHERE 
     te.organization_id = 'org_la_torre_id'
     AND te.clock_in_time >= '2026-02-01'
     AND te.clock_in_time < '2026-03-01'
     AND te.status IN ('completed', 'approved')
   GROUP BY u.id, u.name, u.email, ep.dni_nie_encrypted, ep.social_security_number_encrypted
   ORDER BY u.name;
   ```

2. Calculate pay (if salary data available):
   ```typescript
   for (const employee of employees) {
     const regularHours = Math.min(employee.total_minutes / 60, 40 * 4); // Max 40h/week * 4 weeks
     const overtimeHours = Math.max((employee.total_minutes / 60) - (40 * 4), 0);
     
     const regularPay = regularHours * employee.hourly_rate;
     const overtimePay = overtimeHours * employee.hourly_rate * 1.5; // 1.5x OT rate
     const grossPay = regularPay + overtimePay;
     
     payroll.push({
       employee_id: employee.id,
       employee_name: employee.name,
       dni: decrypt(employee.dni_nie_encrypted),
       ssn: decrypt(employee.social_security_number_encrypted),
       regular_hours: regularHours.toFixed(2),
       overtime_hours: overtimeHours.toFixed(2),
       regular_pay: regularPay.toFixed(2),
       overtime_pay: overtimePay.toFixed(2),
       gross_pay: grossPay.toFixed(2),
       corrections_count: employee.correction_count,
     });
   }
   ```

3. Generate CSV:
   ```csv
   Employee ID,Name,DNI,SSN,Regular Hours,OT Hours,Regular Pay,OT Pay,Gross Pay,Corrections
   user_maria_id,María González,12345678A,281234567840,124.00,0.00,1240.00,0.00,1240.00,1
   user_jose_id,José Ramírez,87654321B,281234567841,158.50,4.00,1585.00,60.00,1645.00,0
   ...
   ```

4. Log export in audit trail:
   ```sql
   INSERT INTO audit_log (
     action, actor_id, details, hash
   ) VALUES (
     'payroll.exported',
     'admin_laura_id',
     '{"period":"2026-02","employees":60,"total_hours":2547,"gross_pay":48320.00}',
     sha256(...)
   );
   ```

**Exported File Includes** (for full compliance):
- Employee details (name, DNI, SSN - decrypted for payroll)
- Hours breakdown (regular, overtime, breaks)
- Corrections applied (count + details)
- Manager approvals (verification)
- SHA-256 audit hash (integrity proof)

---

### Compliance Rules Enforced (Spanish Labor Law)

#### **Daily Limits**
1. **Maximum 9 hours per day** (unless collective agreement says otherwise)
   - System alerts if employee approaching 9h in single day
   - Blocks clock-in if would exceed (requires manager override + justification)

2. **Minimum 12 hours rest between shifts**
   - System checks: Last clock-out time + 12h < Next clock-in time
   - Blocks roster assignment if violates rest period
   - Example: Clocked out 11pm Monday → Cannot clock in before 11am Tuesday

3. **Mandatory break for shifts > 6 hours**
   - 15 minutes minimum (usually unpaid)
   - System reminds employee to take break
   - Flags shift if no break taken (compliance violation)

#### **Weekly Limits**
1. **Maximum 40 hours per week** (regular time)
   - System tracks running total each week (Mon-Sun)
   - Alerts employee at 38h: "Approaching weekly limit"
   - Alerts manager at 38h: "María near 40h limit, don't over-schedule"
   - Overtime allowed but requires explicit tracking + higher pay (1.5x)

2. **Maximum 80 hours overtime per year**
   - System tracks annual OT accumulation
   - Alerts at 70h: "Employee near annual OT limit"
   - Blocks OT scheduling at 80h (legal maximum)

3. **Minimum 1.5 days off per week**
   - System enforces: At least 1 full day off per 7-day period
   - Typical: 2 days off (Sat-Sun or other combo)
   - Blocks roster if employee scheduled 7 consecutive days

#### **Break Rules**
1. **15 minutes for shifts 6-9 hours** (unpaid)
2. **30 minutes for shifts > 9 hours** (unpaid)
3. **Break must be taken during middle portion of shift** (not at start/end)
   - System prevents: Clock in → immediate break
   - System prevents: Break → immediate clock out

#### **Young Workers (<18 years old)**
1. **Maximum 8 hours per day** (vs 9h for adults)
2. **No night work** (10pm-6am prohibited)
3. **30-minute break for shifts > 4.5 hours** (vs 6h for adults)
4. **System automatically applies stricter rules** if employee DOB indicates <18

---

### Edge Cases & Error Handling

#### **GPS/Geofence Issues**

**Problem**: Employee is at work but phone GPS says otherwise (common in basements, metal buildings)

**Detection**:
- Geofence check fails 3 times in a row
- Employee at scheduled shift time
- Employee taps "I'm here but GPS is wrong"

**Solution**:
1. Manager override mode:
   - Employee requests: "GPS not working, can I clock in?"
   - System sends push to manager: "María requests manual clock-in (GPS issue)"
   - Manager approves: "Allow María to clock in without geofence"
   - Entry logged as `clock_in_method: 'manual_override_gps_issue'`
   - Audit trail notes: "Manager Carlos approved due to GPS failure"

2. Fallback method:
   - NFC tag at entrance (as backup)
   - Employee taps phone to NFC → Clocks in
   - System logs: `clock_in_method: 'nfc'`

3. PIN entry (last resort):
   - Employee enters 4-digit PIN at kiosk/tablet
   - System logs: `clock_in_method: 'pin'`

**Prevention**:
- Wider geofence radius for problematic locations (100m vs 50m)
- Combine GPS + Wi-Fi detection (if connected to restaurant Wi-Fi → valid)

---

#### **Forgot to Clock In/Out**

**Problem**: Employee worked full shift but forgot to clock in/out

**Detection**:
- Scheduled shift: 12pm-4pm
- Current time: 6pm (2 hours after scheduled end)
- No clock-in recorded

**Automated Action**:
1. System creates draft correction request at 6pm:
   ```json
   {
     "type": "missing_clock_in_out",
     "scheduled_start": "12:00pm",
     "scheduled_end": "4:00pm",
     "suggested_clock_in": "12:00pm",
     "suggested_clock_out": "4:00pm",
     "status": "draft",
     "auto_created": true
   }
   ```

2. Notification to employee (next time they open app):
   ```
   ⚠️ Missing Timesheet Entry
   
   You were scheduled Mon 12pm-4pm but didn't clock in/out.
   Did you work this shift?
   
   [Yes, I worked] → Request correction
   [No, I was absent] → Mark as absence
   [Mistake, ignore] → Dismiss
   ```

3. If "Yes, I worked":
   - Pre-fills correction request with scheduled times
   - Employee adds reason + optional photo proof
   - Sends to manager for approval

4. Manager reviews:
   - Sees: Scheduled shift, no clock-in/out, employee confirms worked
   - Checks CCTV/paper logs (if available)
   - Approves or adjusts times based on evidence

**Prevention**:
- Reminder notification 15 min after scheduled start if not clocked in
- Reminder notification at scheduled end time if not clocked out
- Manager dashboard highlights: "3 employees clocked in but not out"

---

#### **Duplicate Clock-Ins** (Accidental Double-Tap)

**Problem**: Employee nervously taps "CLOCK IN" twice thinking it didn't register

**Prevention**:
1. Button disabled immediately after tap (prevent double-tap)
2. Debounce: Ignore taps within 2 seconds of first tap
3. Visual feedback is INSTANT (<100ms) so user knows it worked

**Detection** (if somehow still happens):
- Two clock-in records within 10 seconds
- Same user, same location, same method

**Automated Resolution**:
1. System auto-detects duplicate
2. Keeps first clock-in, marks second as `duplicate`
3. Logs in audit trail: "Duplicate entry detected and removed"
4. No user action needed (transparent fix)

---

#### **System Downtime During Shift**

**Problem**: Torre Tempo backend is down for maintenance, employees can't clock in/out

**Offline-First Architecture Handles This**:
1. Mobile app detects server is unreachable
2. Yellow banner: "Offline Mode - Data will sync when connected"
3. Clock-in/out stored locally in IndexedDB:
   ```typescript
   const offlineQueue = {
     actions: [
       {
         id: 'offline-action-uuid',
         type: 'clock_in',
         timestamp: '2026-02-10T12:00:23.456Z',
         gps: '37.9922,-1.1307',
         user_id: 'user_maria_id',
         synced: false,
       }
     ]
   };
   ```
4. When server is back online (detected via health check polling every 30 sec):
   - Green banner: "Back online - Syncing data..."
   - Sends all queued actions to server
   - Server processes in order (validates timestamps)
   - Confirms sync: "All data synced ✓"

**Edge Case**: Server down for extended period (hours)
- Employees clock in/out offline all day
- When back online: 50 queued actions to sync
- System processes chronologically
- If conflicts detected (e.g., two clock-ins with no clock-out):
  - Flags for manager review
  - Sends report: "10 entries synced, 2 need review"

---

#### **Time Zone Changes** (Rare: Restaurant opens location in different timezone)

**Problem**: Employee works at La Torre (Madrid, CET) one day, then covers at Valencia (also CET - no issue). But if covering Canary Islands (WET, -1 hour):

**System Handling**:
1. Clock-in captures timezone from phone: `Europe/Madrid` or `Atlantic/Canary`
2. All timestamps stored in UTC in database (universal)
3. Display converted to user's local timezone
4. Payroll calculations in UTC (no ambiguity)

**Example**:
- Employee in Madrid clocks in: 12:00 CET = 11:00 UTC (stored as UTC)
- Manager in Madrid sees: 12:00 (their local time)
- HR in database sees: 11:00 UTC (standardized)
- Payroll export: Converts to organization's primary timezone (CET)

**Edge Case**: Daylight Saving Time (DST) transition
- Spain: Last Sunday in March (spring forward), last Sunday in October (fall back)
- System handles automatically (UTC doesn't change)
- Display adjusts: 2am becomes 3am (spring) or 2am repeats (fall)
- No impact on hours calculation (always uses UTC duration)

---

---

## 2.2 Roster Management Workflow

### Overview
**Goal**: Manager creates weekly schedules, publishes to staff, handles changes

**Key Actors**: Manager (Carlos), System, Employees

**Frequency**: Weekly (typically Monday for following week)

**Success Metrics**:
- Roster creation time: <30 minutes for 20 employees
- Compliance violations: 0 before publish
- Employee satisfaction: >4.0/5.0 (schedule clarity)
- Last-minute changes: <5% of shifts

---

### State Machine: Shift Lifecycle

```
[Not Scheduled]
    ↓ (Manager creates shift)
[Draft]
    ↓ (Manager assigns employee)
[Assigned - Unpublished]
    ↓ (Manager publishes roster)
[Published]
    ↓ (Employee acknowledges)
[Acknowledged]
    ↓ (Shift day arrives)
[Active] (Employee clocks in)
    ↓ (Employee clocks out)
[Completed]
    ↓ (Manager reviews variance)
[Approved] or [Flagged]
```

---

### Workflow Step-by-Step

#### **Step 1: Roster Planning (Manager - Monday Morning)**

**Trigger**: Manager opens "Roster" → "Create New Week"

**System Shows**: Roster Builder Interface

**Desktop UI** (Drag & Drop Builder):
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Roster Builder - Week of Feb 17-23, 2026                                       │
│  La Torre Location                                                     [Publish]│
├───────────────┬─────────────────────────────────────────────────────────────────┤
│ STAFF POOL    │  CALENDAR GRID                                                  │
│               │                                                                  │
│ 🟢 María G.   │  Mon Feb 17     │ Tue Feb 18     │ Wed Feb 19     │ Thu Feb 20  │
│ 28h this week │ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐ │           │
│ Available ✓   │ │ 12pm-4pm    │ │ │ 12pm-4pm    │ │ │ OFF         │ │           │
│ [Drag me →]   │ │ [Empty]     │ │ │ [Empty]     │ │ │             │ │           │
│               │ └─────────────┘ │ └─────────────┘ │ └─────────────┘ │           │
│ 🟢 José R.    │ ┌─────────────┐ │ ┌─────────────┐ │                 │           │
│ 36h this week │ │ 5pm-11pm    │ │ │ 5pm-11pm    │ │                 │           │
│ Available ✓   │ │ [Empty]     │ │ │ [Empty]     │ │                 │           │
│ [Drag me →]   │ └─────────────┘ │ └─────────────┘ │                 │           │
│               │                                                                  │
│ 🔴 Sarah M.   │  (Grid continues for Fri-Sun...)                                │
│ 40h this week │                                                                  │
│ ⚠️ At limit   │                                                                  │
│               │                                                                  │
│ 🟢 Diego L.   │                                                                  │
│ 32h this week │                                                                  │
│ Available ✓   │                                                                  │
└───────────────┴─────────────────────────────────────────────────────────────────┘
```

**Manager Actions**:
1. **Drag María's card** → Drop on "Mon 12pm-4pm" slot
   - Slot background turns GREEN (valid assignment)
   - Shows María's photo + name in slot
   - Updates "Staff Pool": María 28h → 32h (after assignment)

2. **Drag Sarah's card** → Drop on "Mon 12pm-4pm" slot (different slot)
   - Slot background turns RED: "⚠️ Sarah at 40h weekly limit, cannot add shift"
   - Drop rejected, card bounces back to pool
   - Tooltip: "Sarah has 40h scheduled this week (limit reached)"

3. **Drag José's card** → Drop on "Mon 5pm-11pm" slot
   - Slot turns YELLOW: "⚠️ José clocked out Sun 11:15pm, needs 12h rest until Mon 11:15am"
   - System calculates: 11:15pm Sun + 12 hours = 11:15am Mon
   - Shift starts 5pm Mon (✓ 11:15am < 5pm, rest OK)
   - Slot turns GREEN after validation

4. **Try to schedule José for Mon 10am-2pm** (hypothetical)
   - Slot turns RED: "❌ Violation: José needs 12h rest (last out Sun 11:15pm, can't start until 11:15am Mon)"
   - System BLOCKS assignment (cannot override Spanish law)

5. **Create new shift** (if needed):
   - Click "+" button on empty day
   - Dialog: "Create Shift"
     - Location: La Torre ✓
     - Date: Feb 17
     - Start time: 12:00pm
     - End time: 4:00pm
     - Role required: Waitress
     - Notes: "Busy lunch expected"
   - Shift created in "Unassigned" state

---

#### **Step 2: Compliance Validation (Real-Time)**

**System Validates BEFORE allowing assignment**:

1. **Rest Period Check** (12-hour rule):
   ```typescript
   function validateRestPeriod(employee, proposedShift) {
     const lastShift = getLastCompletedShift(employee);
     if (!lastShift) return { valid: true };
     
     const restHours = (proposedShift.start - lastShift.clockOut) / 3600;
     if (restHours < 12) {
       return {
         valid: false,
         reason: `Needs 12h rest. Last out ${lastShift.clockOut}, can't start until ${lastShift.clockOut + 12h}`,
         earliestStart: lastShift.clockOut + 12h,
       };
     }
     return { valid: true };
   }
   ```

2. **Weekly Hour Limit Check** (40 hours):
   ```typescript
   function validateWeeklyHours(employee, proposedShift, weekStart) {
     const currentWeekHours = getTotalHoursThisWeek(employee, weekStart);
     const proposedShiftHours = (proposedShift.end - proposedShift.start) / 3600;
     
     if (currentWeekHours + proposedShiftHours > 40) {
       return {
         valid: false,
         reason: `Weekly limit: ${currentWeekHours}h scheduled + ${proposedShiftHours}h shift = ${currentWeekHours + proposedShiftHours}h (max 40h)`,
         remainingHours: 40 - currentWeekHours,
       };
     }
     return { valid: true };
   }
   ```

3. **Daily Limit Check** (9 hours per day):
   ```typescript
   function validateDailyHours(employee, proposedShift) {
     const shiftDuration = (proposedShift.end - proposedShift.start) / 3600;
     
     if (shiftDuration > 9) {
       return {
         valid: false,
         reason: `Shift is ${shiftDuration}h (max 9h per day)`,
         suggestedEnd: proposedShift.start + (9 * 3600),
       };
     }
     return { valid: true };
   }
   ```

4. **Availability Check** (Employee-declared availability):
   ```typescript
   function validateAvailability(employee, proposedShift) {
     const availability = getEmployeeAvailability(employee, proposedShift.date);
     
     if (availability.status === 'unavailable') {
       return {
         valid: false,
         reason: `Employee marked unavailable: "${availability.reason}"`,
         warning: true,  // Soft block (manager can override)
       };
     }
     return { valid: true };
   }
   ```

5. **Skill/Role Check** (If shift requires specific role):
   ```typescript
   function validateRole(employee, shift) {
     if (shift.requiredRole && !employee.roles.includes(shift.requiredRole)) {
       return {
         valid: false,
         reason: `Shift requires "${shift.requiredRole}" role, ${employee.name} is "${employee.roles.join(', ')}"`,
         warning: true,  // Soft block
       };
     }
     return { valid: true };
   }
   ```

**Visual Feedback** (Instant, as manager drags):
- Hovering over slot with employee card:
  - GREEN border: Valid, can drop
  - YELLOW border: Warning (can override), shows tooltip
  - RED border: Violation (cannot drop), shows error
- Drop zones pulse green when valid employee hovers

---

#### **Step 3: Publishing Roster**

**Trigger**: Manager clicks "Publish Roster"

**Pre-Publish Validation**:
1. System runs final compliance check on all shifts:
   - Any unassigned shifts? (empty slots)
   - Any compliance violations? (should be 0 if UI worked correctly)
   - Any employees with 0 shifts? (potential under-scheduling)

**Validation Dialog**:
```
┌─────────────────────────────────────────┐
│  Ready to Publish Roster?              │
├─────────────────────────────────────────┤
│  Week: Feb 17-23, 2026                  │
│  Location: La Torre                     │
│                                         │
│  ✓ 28 shifts assigned                  │
│  ✓ 0 compliance violations             │
│  ⚠️ 2 empty shifts (Mon 12pm, Wed 5pm) │
│                                         │
│  This roster will be sent to:          │
│  • 8 employees (push notifications)    │
│                                         │
│  After publishing:                      │
│  • Employees can view their schedule   │
│  • Changes require manager approval    │
│  • Roster locks Sunday 11:59pm         │
│                                         │
│  [Go Back]            [Publish Roster] │
└─────────────────────────────────────────┘
```

**On "Publish"**:
1. Update all shifts:
   ```sql
   UPDATE shifts
   SET 
     status = 'published',
     published_at = NOW(),
     published_by = 'manager_carlos_id'
   WHERE roster_week = '2026-W07' AND organization_id = 'org_la_torre_id';
   ```

2. Send notifications to all assigned employees:
   ```typescript
   for (const employee of assignedEmployees) {
     await sendPushNotification(employee.user_id, {
       title: '📅 New Roster Published',
       body: `Your schedule for Feb 17-23 is ready. You have ${employee.shiftCount} shifts.`,
       action: 'OPEN_SCHEDULE',
       data: { roster_week: '2026-W07' },
     });
   }
   ```

3. Audit log:
   ```sql
   INSERT INTO audit_log (
     action, actor_id, details, hash
   ) VALUES (
     'roster.published',
     'manager_carlos_id',
     '{"week":"2026-W07","shifts":28,"employees":8,"empty_shifts":2}',
     sha256(...)
   );
   ```

4. Create calendar events (optional integration):
   - Export to employee's phone calendar (iOS/Android)
   - Each shift becomes calendar event with location, notes

---

#### **Step 4: Employee Acknowledgement**

**Trigger**: Employee receives notification, opens app

**Employee View**:
```
┌─────────────────────────────────┐
│  New Roster Published           │
│  Week of Feb 17-23, 2026        │
├─────────────────────────────────┤
│  Your shifts:                   │
│                                 │
│  Mon Feb 17 · 12:00pm-4:00pm    │
│  📍 La Torre                    │
│  Role: Waitress                 │
│                                 │
│  Tue Feb 18 · 12:00pm-4:00pm    │
│  📍 La Torre                    │
│  Role: Waitress                 │
│                                 │
│  Wed Feb 19 · OFF               │
│  💚 Enjoy your day off!         │
│                                 │
│  ... (continues for week)       │
│                                 │
│  Total: 16 hours this week      │
├─────────────────────────────────┤
│  ℹ️ Roster locks Sunday 11:59pm │
│  Request changes before then.   │
├─────────────────────────────────┤
│  [❌ Report Issue]              │
│  [✓ Acknowledge Schedule]       │
└─────────────────────────────────┘
```

**Employee Actions**:
1. **Acknowledge** (happy with schedule):
   - Taps "✓ Acknowledge Schedule"
   - System updates:
     ```sql
     UPDATE shifts
     SET 
       acknowledged = TRUE,
       acknowledged_at = NOW()
     WHERE user_id = 'user_maria_id' AND roster_week = '2026-W07';
     ```
   - Manager sees green checkmark next to María's name
   - Toast: "Schedule acknowledged ✓"

2. **Report Issue** (can't work a shift):
   - Taps "❌ Report Issue"
   - Selects problematic shift: "Tue 12pm-4pm"
   - Options:
     - "I'm not available (personal conflict)"
     - "I requested time off (wasn't approved)"
     - "This is incorrect (wrong location/time)"
   - Adds note: "Tengo cita médica a las 2pm"
   - Sends notification to manager
   - Manager reviews and either:
     - Removes María from shift, assigns someone else
     - Discusses with María to find solution

**Manager Acknowledgement Dashboard**:
```
┌────────────────────────────────────────────────────┐
│  Roster Acknowledgements - Week Feb 17-23          │
├────────────────────────────────────────────────────┤
│  Employee      │ Shifts │ Status                   │
├────────────────┼────────┼──────────────────────────┤
│ María G.       │ 4      │ ✓ Acknowledged (Tue 3pm) │
│ José R.        │ 5      │ ✓ Acknowledged (Mon 8pm) │
│ Sarah M.       │ 0      │ - No shifts assigned     │
│ Diego L.       │ 3      │ ⚠️ Not yet acknowledged  │
│ Carmen S.      │ 4      │ 🔴 Reported issue (1)    │
└────────────────┴────────┴──────────────────────────┘
```

**Manager Follow-Up**:
- Green: All good, no action
- Yellow: Send reminder to Diego (notification not seen yet?)
- Red: Review Carmen's issue, reassign shift

---

#### **Step 5: Roster Changes (After Publish)**

**Scenario**: Manager needs to change a shift after publishing (employee got sick, emergency coverage needed)

**Change Request Flow**:
1. Manager edits shift:
   - Clicks shift in roster → "Edit Shift"
   - Changes María → Diego (replacing employee)
   - Adds note: "María sick, Diego covering"

2. System validation:
   - Checks Diego's availability: ✓ Available
   - Checks Diego's weekly hours: 32h + 4h = 36h ✓ Under 40h limit
   - Checks rest period: ✓ OK
   - Allows change

3. Notifications:
   - To María: "Your shift Tue 12pm-4pm has been cancelled (Reason: Sick day)"
   - To Diego: "You've been assigned to cover: Tue 12pm-4pm at La Torre. Accept?"

4. Diego must accept:
   - Push notification with "Accept" / "Decline" actions
   - If Accept: Shift assigned, calendar updated
   - If Decline: Manager must find another employee

5. Audit trail:
   ```sql
   INSERT INTO audit_log (
     action, actor_id, details
   ) VALUES (
     'shift.reassigned',
     'manager_carlos_id',
     '{"shift_id":"shift_xyz","original_employee":"María G.","new_employee":"Diego L.","reason":"Sick day","date":"2026-02-18","time":"12pm-4pm"}'
   );
   ```

**Lock Period**:
- Roster "locks" Sunday 11:59pm (day before first shift of week)
- After lock: Manager CAN still make changes, but:
  - Requires extra confirmation: "Roster is locked. Change anyway?"
  - Logs: "Emergency change after lock"
  - Notifies HR (if major changes)

---

---

## 2.3 Shift Swap Workflow

(To be continued... this document is getting long!)

I'll continue building out all the workflows. Should I:
1. **Keep going** with all workflows in this single file?
2. **Break into multiple files** (one per workflow)?
3. **Send what I have so far** for your review before continuing?

Let me know and I'll continue! 🚀

---

**[Document continues with remaining workflows - currently at page 50 of planned 300 pages]**

---

## 2.3 Shift Swap Workflow

### Overview
**Goal**: Enable employees to trade shifts with colleagues, with manager approval

**Key Actors**: Employee (María - requestor), Employee (Sarah - recipient), Manager (Carlos)

**Frequency**: 2-3x per month per employee

**Success Metrics**:
- Swap request completion time: <2 minutes
- Manager approval time: <10 minutes (via mobile)
- Swap success rate: >80% (approved)
- Employee satisfaction: >4.5/5.0

---

### State Machine: Swap Request Lifecycle

```
[No Swap]
    ↓ (Employee requests swap)
[Pending Recipient Response]
    ↓ (Colleague accepts)
[Pending Manager Approval]
    ↓ (Manager approves)
[Approved - Shifts Swapped]
    ↓ (Calendar updated)
[Completed]

Alternative paths:
- Recipient declines → [Declined by Recipient]
- Manager rejects → [Rejected by Manager]
- Timeout (48h no response) → [Expired]
```

---

### Workflow Step-by-Step

#### **Step 1: Employee Initiates Swap**

**Context**: María has university exam Friday morning, needs to swap Thursday evening shift

**UI Flow**:
```
┌─────────────────────────────────┐
│  Your Shifts - This Week        │
├─────────────────────────────────┤
│  Thu Feb 20 · 7:00pm-11:00pm    │
│  📍 La Torre · Waitress         │
│  [👥 Request Swap]              │ ← María taps this
└─────────────────────────────────┘
```

**System Shows**: Eligible swap partners

**Eligibility Criteria**:
1. Same location (can't swap La Torre ↔ Murcia shifts)
2. Same or compatible role (Waitress ↔ Waitress OK, Waitress ↔ Chef NO)
3. Not already working that day/time (no double-booking)
4. Within weekly hour limits after swap
5. Has worked with María before (trust factor - optional filter)

```
┌─────────────────────────────────┐
│  Who do you want to swap with?  │
├─────────────────────────────────┤
│  Suggested (same role):         │
│                                 │
│  🟢 Sarah M.                    │
│  Availability: Available ✓      │
│  Hours after swap: 24h (OK)     │
│  [Select]                       │
│                                 │
│  🟢 Carmen S.                   │
│  Availability: Available ✓      │
│  Hours after swap: 28h (OK)     │
│  [Select]                       │
│                                 │
│  🔴 Diego L.                    │
│  ❌ Already working Thu 7pm     │
│  (Cannot select)                │
│                                 │
│  🟡 José R.                     │
│  ⚠️ Different role (Kitchen)    │
│  [Select anyway]                │
└─────────────────────────────────┘
```

**María Selects Sarah**:
```
┌─────────────────────────────────┐
│  Swap Confirmation              │
├─────────────────────────────────┤
│  You give:                      │
│  Thu Feb 20 · 7pm-11pm          │
│  La Torre · Waitress            │
│                                 │
│  ⤷ Sarah will cover this shift  │
├─────────────────────────────────┤
│  You receive:                   │
│  [Select Sarah's shift to take] │
│  or [I don't need coverage]     │
├─────────────────────────────────┤
│  Sarah's available shifts:      │
│  ○ Fri Feb 21 · 12pm-4pm        │
│  ○ Sat Feb 22 · 5pm-9pm         │
│  ○ None - Just give away shift  │
├─────────────────────────────────┤
│  Message to Sarah (optional):   │
│  ┌─────────────────────────┐   │
│  │ Tengo examen el viernes │   │
│  │ 😅 ¿Me puedes ayudar?   │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  [Cancel]  [Send Request]       │
└─────────────────────────────────┘
```

**System Actions** (On "Send Request"):
1. Create swap request record:
```sql
INSERT INTO swap_requests (
  id, organization_id, 
  requestor_user_id, recipient_user_id,
  give_shift_id, receive_shift_id,
  status, requested_at, expires_at,
  requestor_message
) VALUES (
  uuid_generate_v4(),
  'org_la_torre_id',
  'user_maria_id',
  'user_sarah_id',
  'shift_thu_7pm',
  NULL,  -- María doesn't want a shift back
  'pending_recipient',
  NOW(),
  NOW() + INTERVAL '48 hours',  -- Auto-expire after 48h
  'Tengo examen el viernes 😅 ¿Me puedes ayudar?'
);
```

2. Send notification to Sarah:
```typescript
await sendPushNotification('user_sarah_id', {
  title: '🔄 Shift Swap Request',
  body: 'María wants to swap Thu 7pm shift. Tap to review.',
  action: 'OPEN_SWAP_REQUEST',
  data: { swap_request_id: 'swap_xyz' },
  priority: 'high',  // Important, needs timely response
});
```

3. Audit log
4. Show confirmation to María:
```
✓ Request sent to Sarah
Sarah will be notified. Request expires in 48 hours.
```

---

#### **Step 2: Recipient (Sarah) Reviews Request**

**Sarah receives push notification** → Opens app

**UI**:
```
┌─────────────────────────────────┐
│  Shift Swap Request from María  │
├─────────────────────────────────┤
│  María gives you:               │
│  Thu Feb 20 · 7:00pm-11:00pm    │
│  La Torre · Waitress            │
│                                 │
│  She asks for:                  │
│  Nothing in return              │
│  (She's giving away her shift)  │
├─────────────────────────────────┤
│  Message from María:            │
│  "Tengo examen el viernes 😅    │
│   ¿Me puedes ayudar?"           │
├─────────────────────────────────┤
│  Your schedule after swap:      │
│  Mon: 12pm-4pm                  │
│  Tue: 12pm-4pm                  │
│  Thu: 7pm-11pm (NEW)            │
│  Fri: OFF                       │
│  Sat: 5pm-9pm                   │
│                                 │
│  Total: 24 hours (within 40h)   │
├─────────────────────────────────┤
│  [Decline]          [Accept →]  │
└─────────────────────────────────┘
```

**Sarah's Decision Points**:
1. **Can she work that day?** (No conflicts in personal schedule)
2. **Does she want extra hours?** (24h → 28h, extra €40)
3. **Helping colleague?** (María has helped her before, good karma)

**If Sarah Accepts**:
```sql
UPDATE swap_requests
SET 
  status = 'pending_manager',
  recipient_accepted_at = NOW()
WHERE id = 'swap_xyz';
```

**Notifications**:
- To María: "Sarah accepted your swap request! Waiting for manager approval."
- To Manager (Carlos): "New swap request needs approval: María ↔ Sarah (Thu 7pm)"

**If Sarah Declines**:
```sql
UPDATE swap_requests
SET 
  status = 'declined_by_recipient',
  recipient_declined_at = NOW(),
  recipient_decline_reason = 'Not available that evening'
WHERE id = 'swap_xyz';
```

**Notifications**:
- To María: "Sarah declined your swap request. Try someone else?"
  - Shows list of other eligible employees
- To Manager: Notification dismissed (no approval needed)

---

#### **Step 3: Manager (Carlos) Reviews Swap**

**Carlos receives notification** → Opens app (mobile)

**Mobile UI** (Swipe to Approve/Reject):
```
┌─────────────────────────────────┐
│  Swap Request #S-1234           │
├─────────────────────────────────┤
│  María González                 │
│  ⤷ Gives: Thu 7pm-11pm          │
│                                 │
│  Sarah Martinez                 │
│  ⤷ Receives: Thu 7pm-11pm       │
│                                 │
│  Reason: "Tengo examen viernes" │
├─────────────────────────────────┤
│  Compliance Check:              │
│  ✓ Sarah available              │
│  ✓ Sarah within 40h limit       │
│  ✓ No schedule conflicts        │
│  ✓ Same role/skills             │
├─────────────────────────────────┤
│  ← Swipe to REJECT              │
│  Swipe to APPROVE →             │
└─────────────────────────────────┘
```

**Carlos Swipes Right (Approve)**:

**System Actions**:
1. Update swap request:
```sql
UPDATE swap_requests
SET 
  status = 'approved',
  approved_by = 'manager_carlos_id',
  approved_at = NOW()
WHERE id = 'swap_xyz';
```

2. **Update shifts** (atomic transaction):
```sql
BEGIN TRANSACTION;

-- Remove María from original shift
UPDATE shifts
SET 
  assigned_user_id = NULL,
  unassigned_reason = 'swap_approved',
  swap_request_id = 'swap_xyz'
WHERE id = 'shift_thu_7pm';

-- Assign Sarah to shift
UPDATE shifts
SET 
  assigned_user_id = 'user_sarah_id',
  assigned_at = NOW(),
  swap_request_id = 'swap_xyz'
WHERE id = 'shift_thu_7pm';

COMMIT;
```

3. **Update calendar** (for both employees):
   - María's calendar: Thu 7pm s

hift removed
   - Sarah's calendar: Thu 7pm shift added

4. **Send notifications**:
   - To María: "✓ Swap approved! You're off Thursday 7pm."
   - To Sarah: "✓ Swap approved! You're scheduled Thursday 7pm."
   - Calendar invites updated automatically

5. **Audit log**:
```sql
INSERT INTO audit_log (
  action, actor_id, details
) VALUES (
  'swap.approved',
  'manager_carlos_id',
  '{"swap_id":"swap_xyz","requestor":"María G.","recipient":"Sarah M.","shift":"Thu 7pm-11pm","reason":"Exam next day"}'
);
```

**If Carlos Rejects** (Swipe Left):
- Dialog: "Why are you rejecting?"
  - "Coverage needed on that shift"
  - "Too many swap requests"
  - "Other reason..."
- Notifications:
  - To María & Sarah: "Swap request rejected: [Reason]"
  - Shift stays assigned to María (original)

---

#### **Step 4: Post-Swap Execution**

**Thursday 7pm (Swap Day)**:

**Sarah clocks in**:
- System recognizes: Sarah clocking in for swapped shift
- Clock-in screen shows: "Covering for María (Swap #S-1234)"
- All normal time tracking applies
- Variance calculated against Sarah (not María)

**María does NOT clock in**:
- Her calendar shows: "Day Off (Swapped with Sarah)"
- If she accidentally tries to clock in:
  - Warning: "You swapped this shift with Sarah. Are you working anyway?"
  - Options: "No, mistake" | "Yes, also working" (rare edge case)

**Payroll Impact**:
- María: Thursday 7pm-11pm NOT counted in her hours
- Sarah: Thursday 7pm-11pm counted in her hours
- Automatic (no manual adjustment needed)

---

### Swap Workflow Edge Cases

#### **Scenario A: Chain Swaps** (María → Sarah → Carmen)

**Problem**: Sarah accepts María's shift, but now Sarah needs someone to cover HER original shift

**Solution**: Cascade swap system
```
María has: Thu 7pm (wants to give away)
Sarah has: Fri 12pm (wants to give away)
Carmen wants: Extra hours

Swap 1: María → Sarah (Thu 7pm)
Swap 2: Sarah → Carmen (Fri 12pm)

Result:
- María: Off Thu 7pm ✓
- Sarah: Works Thu 7pm, Off Fri 12pm ✓
- Carmen: Works Fri 12pm ✓
```

#### **Scenario B: Emergency Same-Day Swap**

**Problem**: María wakes up sick Thursday morning, shift starts in 4 hours

**Urgent Flow**:
1. María marks shift: "🚨 Emergency - Need Coverage"
2. Broadcast to all eligible: "Emergency Coverage Needed: Thu 7pm"
3. First to accept gets it (Sarah responds in 10 min)
4. Manager auto-notified, must approve within 1 hour
5. If no manager response → Auto-approve (emergency exception)

#### **Scenario C: Swap Cancellation**

**Problem**: Swap approved Monday for Thursday shift. Tuesday - María's exam cancelled, wants shift back.

**Cancellation Rules**:
- >24h before shift → Can request cancellation (requires recipient agreement)
- <24h before shift → CANNOT cancel (too late, unfair)

**Flow**:
1. María: "Cancel swap #S-1234"
2. Notification to Sarah: "María wants to cancel (take shift back). Agree?"
3. Sarah decides:
   - YES → Revert shifts, notify manager
   - NO → Swap stays (Sarah already planned around it)

---

---

## 2.6 Compliance Monitoring Workflow

### Overview
**Goal**: Automatically detect and prevent labor law violations in real-time

**Key Regulations** (Spanish Labor Law):
- Maximum 9 hours per day
- Maximum 40 hours per week
- Minimum 12 hours rest between shifts
- Mandatory breaks (15 min for >6h shifts)
- Maximum 80 hours overtime per year
- Minimum 1.5 days off per week

---

### Real-Time Compliance Checks

#### **Check 1: Daily Hour Limit (During Clock-Out)**

```typescript
async function validateDailyHours(timeEntry: TimeEntry) {
  const shiftDuration = (timeEntry.clockOut - timeEntry.clockIn) / 3600; // hours
  
  if (shiftDuration > 9) {
    return {
      violation: true,
      severity: 'critical',
      rule: 'daily_limit_exceeded',
      message: `Shift duration: ${shiftDuration.toFixed(1)}h exceeds 9h daily limit`,
      legalReference: 'Estatuto de los Trabajadores, Art. 34.3',
      action: 'Block clock-out until manager overrides with justification',
    };
  }
  
  if (shiftDuration > 8.5) {
    return {
      violation: false,
      warning: true,
      message: `Approaching daily limit: ${shiftDuration.toFixed(1)}h (max 9h)`,
    };
  }
  
  return { violation: false };
}
```

**UI When Violation Detected**:
```
┌─────────────────────────────────┐
│  ⚠️ Compliance Warning           │
├─────────────────────────────────┤
│  Cannot clock out yet:          │
│  Your shift is 9h 15m           │
│  (Maximum: 9h per day)          │
│                                 │
│  Legal: Estatuto Art. 34.3      │
├─────────────────────────────────┤
│  Options:                       │
│  1. Take unpaid break now       │
│  2. Request manager override    │
│     (requires justification)    │
├─────────────────────────────────┤
│  [Take Break]  [Request Override]│
└─────────────────────────────────┘
```

---

#### **Check 2: Weekly Hour Limit (During Roster Assignment)**

```typescript
async function validateWeeklyHours(employee: Employee, proposedShift: Shift) {
  const weekStart = getWeekStart(proposedShift.date);
  const weekEnd = getWeekEnd(proposedShift.date);
  
  const currentWeekHours = await db
    .select({ total: sum(time_entries.worked_minutes) })
    .from(time_entries)
    .where(
      and(
        eq(time_entries.user_id, employee.id),
        gte(time_entries.clock_in_time, weekStart),
        lte(time_entries.clock_in_time, weekEnd)
      )
    );
  
  const totalMinutes = (currentWeekHours.total || 0) + proposedShift.duration_minutes;
  const totalHours = totalMinutes / 60;
  
  if (totalHours > 40) {
    return {
      violation: true,
      severity: 'critical',
      rule: 'weekly_limit_exceeded',
      message: `${totalHours.toFixed(1)}h exceeds 40h weekly limit`,
      currentHours: (currentWeekHours.total || 0) / 60,
      proposedHours: proposedShift.duration_minutes / 60,
      legalReference: 'Estatuto de los Trabajadores, Art. 34.1',
      action: 'Block shift assignment',
    };
  }
  
  if (totalHours > 38) {
    return {
      violation: false,
      warning: true,
      message: `${totalHours.toFixed(1)}h approaching 40h limit`,
      remainingHours: 40 - totalHours,
    };
  }
  
  return { violation: false };
}
```

---

#### **Check 3: Rest Period (12-Hour Rule)**

```typescript
async function validateRestPeriod(employee: Employee, proposedShift: Shift) {
  const lastShift = await db
    .select()
    .from(time_entries)
    .where(eq(time_entries.user_id, employee.id))
    .orderBy(desc(time_entries.clock_out_time))
    .limit(1);
  
  if (!lastShift.length) return { violation: false };
  
  const lastClockOut = new Date(lastShift[0].clock_out_time);
  const proposedStart = new Date(proposedShift.start_time);
  
  const hoursBetween = (proposedStart - lastClockOut) / (1000 * 60 * 60);
  
  if (hoursBetween < 12) {
    return {
      violation: true,
      severity: 'critical',
      rule: 'insufficient_rest',
      message: `Only ${hoursBetween.toFixed(1)}h rest (requires 12h)`,
      lastClockOut: lastClockOut.toISOString(),
      earliestStart: new Date(lastClockOut.getTime() + 12*60*60*1000),
      legalReference: 'Estatuto de los Trabajadores, Art. 34.3',
      action: 'Block shift assignment',
    };
  }
  
  return { violation: false };
}
```

**Roster Builder Feedback**:
```
┌─────────────────────────────────┐
│  ❌ Cannot Assign                │
├─────────────────────────────────┤
│  José R. needs 12h rest:        │
│  Last out: Sun 11:15 PM         │
│  Earliest start: Mon 11:15 AM   │
│                                 │
│  Proposed shift: Mon 10:00 AM   │
│  (75 minutes too early)         │
├─────────────────────────────────┤
│  Legal: Estatuto Art. 34.3      │
│  "Descanso mínimo 12 horas"     │
└─────────────────────────────────┘
```

---

#### **Check 4: Mandatory Break**

```typescript
async function validateBreak(timeEntry: TimeEntry) {
  const shiftDuration = (timeEntry.clockOut - timeEntry.clockIn) / 3600;
  
  if (shiftDuration <= 6) {
    return { required: false }; // No break required
  }
  
  const breaks = await db
    .select()
    .from(break_entries)
    .where(eq(br

## 2.8 Notification System Workflow

### Overview
**Goal**: Inform employees and managers of important events via push, email, SMS

**Notification Types**:
1. **Schedule Notifications** - New roster published, shift reminders
2. **Action Notifications** - Swap requests, correction approvals
3. **Compliance Alerts** - Approaching limits, missing breaks
4. **System Notifications** - Forgot to clock out, timesheet ready

**Channels**:
- Push (primary) - Mobile app notifications
- Email (secondary) - For important actions requiring desktop
- SMS (urgent only) - Emergency coverage, critical compliance

---

### Notification Categories & Priority

#### **Priority 1: URGENT** (Immediate delivery, sound/vibration)
- Emergency shift coverage needed
- Critical compliance violation
- Forgot to clock out (>2 hours past shift)
- Inspector audit initiated

#### **Priority 2: HIGH** (Immediate delivery, silent)
- Shift swap request pending
- Correction request pending approval
- Shift starting in 15 minutes
- Weekly limit approaching (38h)

#### **Priority 3: NORMAL** (Delivered within 5 min)
- New roster published
- Swap request approved
- Timesheet available
- Schedule changed

#### **Priority 4: LOW** (Batched, delivered within 1 hour)
- Roster reminder (24h before)
- Monthly summary ready
- Tips and updates

---

### Notification Delivery Logic

```typescript
interface Notification {
  id: string;
  user_id: string;
  type: 'schedule' | 'action' | 'compliance' | 'system';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  body: string;
  action?: {
    type: 'open_screen' | 'approve_reject' | 'deep_link';
    data: Record<string, any>;
  };
  channels: ('push' | 'email' | 'sms')[];
  scheduled_for?: Date;
  expires_at?: Date;
}

async function sendNotification(notification: Notification) {
  // Check user preferences
  const prefs = await getUserNotificationPreferences(notification.user_id);
  
  // Respect "Do Not Disturb" (Right to Disconnect)
  if (shouldApplyDND(notification, prefs)) {
    // Delay until next allowed time (e.g., 8am next day)
    notification.scheduled_for = getNextAllowedTime(prefs);
  }
  
  // Queue notification by priority
  const queue = getQueueByPriority(notification.priority);
  await queue.add('send-notification', {
    notification_id: notification.id,
    user_id: notification.user_id,
    channels: notification.channels,
    data: notification,
  }, {
    priority: getPriorityWeight(notification.priority),
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
  
  // Store in database
  await db.insert(notifications).values({
    ...notification,
    status: 'queued',
    queued_at: new Date(),
  });
}
```

---

### Right to Disconnect (Spanish Law)

**Legal Requirement**: Employees have right to disconnect outside working hours

**Implementation**:
```typescript
interface DND_Settings {
  enabled: boolean;
  quiet_hours_start: string; // "22:00"
  quiet_hours_end: string;   // "08:00"
  quiet_days: string[];      // ["saturday", "sunday"]
  urgent_override: boolean;  // Allow urgent notifications?
  emergency_contact: string; // For true emergencies
}

function shouldApplyDND(notification: Notification, prefs: DND_Settings): boolean {
  if (!prefs.enabled) return false;
  
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.toLocaleLowerCase();
  
  // Check quiet hours
  const [quietStartHour] = prefs.quiet_hours_start.split(':').map(Number);
  const [quietEndHour] = prefs.quiet_hours_end.split(':').map(Number);
  
  const inQuietHours = (currentHour >= quietStartHour || currentHour < quietEndHour);
  const inQuietDay = prefs.quiet_days.includes(currentDay);
  
  if ((inQuietHours || inQuietDay) && notification.priority !== 'urgent') {
    return true; // Delay notification
  }
  
  // Urgent notifications bypass DND if enabled
  if (notification.priority === 'urgent' && prefs.urgent_override) {
    return false; // Send anyway
  }
  
  return false;
}
```

**UI** (Employee Settings):
```
┌─────────────────────────────────┐
│  Notification Preferences       │
├─────────────────────────────────┤
│  ☑ Enable Do Not Disturb        │
│                                 │
│  Quiet Hours:                   │
│  From: [22:00] To: [08:00]      │
│                                 │
│  Quiet Days:                    │
│  ☑ Saturday                     │
│  ☑ Sunday                       │
│  ☐ Holidays                     │
├─────────────────────────────────┤
│  Emergency Override:            │
│  ☑ Allow urgent notifications   │
│     during quiet hours          │
│  (Required for on-call staff)   │
├─────────────────────────────────┤
│  Notification Channels:         │
│  ☑ Push Notifications           │
│  ☑ Email                        │
│  ☐ SMS (charged separately)     │
└─────────────────────────────────┘
```

---


---

# PART 3: COMPLETE DATABASE SCHEMA

## 3.1 Schema Overview

**Total Tables**: 28 (14 existing + 14 new)

**Categories**:
1. **Auth & Users** (7 tables) - Better Auth managed
2. **Core Business** (12 tables) - Time tracking, roster, swaps
3. **Compliance** (5 tables) - Employee profiles, leave, documents
4. **Reporting** (2 tables) - Generated reports, exports
5. **System** (2 tables) - Notifications, settings

---

## 3.2 New Tables Required

### Table: `employee_profiles`

**Purpose**: Store employment data separately from auth for security

```sql
CREATE TABLE employee_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  
  -- Personal Information (ENCRYPTED)
  dni_nie_encrypted TEXT NOT NULL,
  social_security_number_encrypted TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  nationality VARCHAR(3), -- ISO 3166-1 alpha-3
  tax_id_encrypted TEXT,
  phone_number_encrypted TEXT,
  address_encrypted JSONB,
  emergency_contact_encrypted JSONB,
  
  -- Employment Information
  employee_number VARCHAR(50),
  job_title VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  employment_type VARCHAR(50) NOT NULL, -- indefinido, temporal, practicas, formacion
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  base_salary_cents INTEGER,
  working_hours_per_week NUMERIC(4,2) NOT NULL,
  work_location_id UUID REFERENCES locations(id),
  
  -- Leave Balance
  vacation_days_accrued NUMERIC(4,1) DEFAULT 0,
  vacation_days_used NUMERIC(4,1) DEFAULT 0,
  sick_days_used INTEGER DEFAULT 0,
  
  -- Compliance
  health_safety_training_date DATE,
  work_permit_number_encrypted TEXT,
  work_permit_expiry DATE,
  
  -- GDPR
  gdpr_consent_date TIMESTAMP WITH TIME ZONE,
  data_processing_consent BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_employee_profiles_org ON employee_profiles(organization_id);
CREATE INDEX idx_employee_profiles_dni ON employee_profiles(dni_nie_encrypted);
```

---

### Table: `leave_requests`

**Purpose**: Track vacation, sick leave, personal days

```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  
  -- Leave Details
  leave_type VARCHAR(50) NOT NULL, -- vacation, sick, personal, unpaid
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC(3,1) NOT NULL, -- 5.0, 2.5 (half days)
  
  -- Request Info
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Approval
  approved_by TEXT REFERENCES "user"(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Sick Leave Specific
  doctors_note_url TEXT,
  doctors_note_verified BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_org ON leave_requests(organization_id);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
```

---

### Table: `notifications`

**Purpose**: Store all notifications sent to users

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organization(id) ON DELETE CASCADE,
  
  -- Notification Details
  type VARCHAR(50) NOT NULL, -- schedule, action, compliance, system
  priority VARCHAR(20) NOT NULL, -- urgent, high, normal, low
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  
  -- Action
  action_type VARCHAR(50), -- open_screen, approve_reject, deep_link
  action_data JSONB,
  
  -- Delivery
  channels TEXT[] NOT NULL, -- ['push', 'email', 'sms']
  status VARCHAR(20) NOT NULL DEFAULT 'queued', -- queued, sent, delivered, failed, read
  
  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'queued';
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
```

---

### Table: `generated_reports`

**Purpose**: Track all generated reports for audit trail

```sql
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  
  -- Report Details
  report_type VARCHAR(50) NOT NULL, -- monthly_timesheet, compliance, variance, inspector
  report_name VARCHAR(255) NOT NULL,
  period_start DATE,
  period_end DATE,
  
  -- Generation Info
  generated_by TEXT NOT NULL REFERENCES "user"(id),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- File Info
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  file_hash VARCHAR(64) NOT NULL, -- SHA-256
  
  -- Access Control
  access_level VARCHAR(20) NOT NULL DEFAULT 'internal', -- internal, inspector, public
  inspector_token_id UUID REFERENCES inspector_tokens(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB, -- Additional data (employee count, hours, etc.)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_org ON generated_reports(organization_id);
CREATE INDEX idx_reports_type ON generated_reports(report_type);
CREATE INDEX idx_reports_period ON generated_reports(period_start, period_end);
```

---

### Table: `compliance_checks`

**Purpose**: Log all automated compliance checks

```sql
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  
  -- Check Details
  check_type VARCHAR(50) NOT NULL, -- daily_limit, weekly_limit, rest_period, break_required
  check_result VARCHAR(20) NOT NULL, -- pass, warning, violation
  severity VARCHAR(20), -- low, medium, high, critical
  
  -- Context
  time_entry_id UUID REFERENCES time_entries(id),
  shift_id UUID REFERENCES shifts(id),
  related_data JSONB,
  
  -- Violation Details
  rule_reference VARCHAR(255), -- "Estatuto Art. 34.3"
  message TEXT NOT NULL,
  recommended_action TEXT,
  
  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT REFERENCES "user"(id),
  resolution_notes TEXT,
  
  -- Metadata
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_checks_org ON compliance_checks(organization_id);
CREATE INDEX idx_compliance_checks_user ON compliance_checks(user_id);
CREATE INDEX idx_compliance_checks_result ON compliance_checks(check_result);
CREATE INDEX idx_compliance_checks_unresolved ON compliance_checks(resolved) WHERE resolved = FALSE;
```

---

### Table: `notification_preferences`

**Purpose**: User-specific notification settings

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE UNIQUE,
  
  -- Do Not Disturb
  dnd_enabled BOOLEAN DEFAULT FALSE,
  dnd_start_time TIME, -- 22:00
  dnd_end_time TIME,   -- 08:00
  dnd_days TEXT[],     -- ['saturday', 'sun
day', 'sunday']
  dnd_urgent_override BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

# PART 9: 12-WEEK IMPLEMENTATION ROADMAP

## Overview

**Total Duration**: 12 weeks (3 months)
**Team**: 2-3 developers + 1 designer + 1 QA
**Deployment**: Weekly releases to staging, bi-weekly to production

---

## WEEK 1-2: Foundation & Database

### Goals
- Complete database schema
- Set up encryption
- Create seed data
- Basic CRUD APIs

### Tasks

**Backend**:
- [ ] Create all new tables (employee_profiles, leave_requests, notifications, etc.)
- [ ] Implement application-level encryption (encrypt/decrypt functions)
- [ ] Write database migrations
- [ ] Create seed script with test data (10 employees, 50 shifts, 20 time entries)
- [ ] Build base API routes (CRUD for each table)

**Testing**:
- [ ] Unit tests for encryption (encrypt → decrypt = original)
- [ ] Integration tests for new endpoints
- [ ] Load test: 1000 concurrent time entry creations

**Deliverable**: Database ready, APIs functional, encryption working

**Success Metrics**:
- All migrations run without errors
- Encryption/decryption latency <50ms
- API response time <200ms average

---

## WEEK 3-4: Time Tracking Enhancement

### Goals
- Complete time tracking workflow
- Real-time compliance checks
- Break management

### Tasks

**Backend**:
- [ ] Implement real-time compliance validation (daily limit, weekly limit, rest period)
- [ ] Build break tracking system (start/end break endpoints)
- [ ] Create correction request workflow (full CRUD)
- [ ] Implement SHA-256 audit chain (hash generation on every entry)
- [ ] Build WebSocket server for live attendance updates

**Frontend**:
- [ ] Enhance clock-in/out UI (geofencing, offline support)
- [ ] Add break timer component
- [ ] Build correction request form
- [ ] Implement offline queue (IndexedDB)
- [ ] Add live attendance widget for managers

**Testing**:
- [ ] Test geofencing accuracy (50m radius)
- [ ] Test offline mode (queue 10 actions, sync when online)
- [ ] Test compliance rules (try to violate each rule, verify blocks)

**Deliverable**: Full time tracking system with compliance enforcement

**Success Metrics**:
- Clock-in time <3 seconds average
- Offline mode: 100% sync success rate
- Compliance violations: 0 slip through

---

## WEEK 5-6: Roster Management

### Goals
- Drag-and-drop roster builder
- Automated compliance checks during assignment
- Roster publishing workflow

### Tasks

**Frontend**:
- [ ] Build roster calendar grid (7 days x multiple shifts)
- [ ] Implement drag-and-drop (employee cards → slots)
- [ ] Add real-time validation (red/yellow/green visual feedback)
- [ ] Create shift creation modal
- [ ] Build roster publishing confirmation dialog

**Backend**:
- [ ] Implement roster validation API (check all compliance rules)
- [ ] Build roster publishing endpoint (bulk update shifts, send notifications)
- [ ] Create roster templates API (save/load common patterns)
- [ ] Implement shift duplication (copy week to next week)

**Testing**:
- [ ] Test all compliance scenarios (rest period, weekly limit, availability)
- [ ] Performance test: Create 100-shift roster in <2 seconds
- [ ] Test notification delivery (8 employees receive push within 30 sec)

**Deliverable**: Full roster management system

**Success Metrics**:
- Roster creation time <30 min for 20 employees
- Compliance violations caught: 100% before publish
- Manager satisfaction: >4.5/5.0

---

## WEEK 7-8: Shift Swaps & Leave

### Goals
- Shift swap workflow (request → approve → execute)
- Leave request system
- Calendar integration

### Tasks

**Frontend**:
- [ ] Build swap request flow (select colleague, add message, send)
- [ ] Create swap approval UI (swipe to approve/reject)
- [ ] Build leave request form (date picker, type selector, balance display)
- [ ] Implement calendar sync (export to iOS/Android calendar)

**Backend**:
- [ ] Build swap request API (create, approve, reject, cancel)
- [ ] Implement swap execution (atomic shift reassignment)
- [ ] Create leave request API (full workflow)
- [ ] Build leave balance calculation (accrual, usage tracking)
- [ ] Implement vacation policy checks (blackout dates, advance notice)

**Testing**:
- [ ] Test chain swaps (A→B→C)
- [ ] Test swap cancellation
- [ ] Test leave overlap detection (prevent double-booking)
- [ ] Test vacation balance calculations

**Deliverable**: Complete swap and leave systems

**Success Metrics**:
- Swap completion time: <2 minutes
- Manager approval time: <10 minutes
- Leave approval rate: >80%

---

## WEEK 9: Compliance Engine

### Goals
- Automated compliance monitoring
- Proactive alerts
- Compliance dashboard

### Tasks

**Backend**:
- [ ] Build compliance check service (runs every 15 minutes)
- [ ] Implement all validation rules (12 total checks)
- [ ] Create alert trigger system (approaching limits, violations)
- [ ] Build compliance scoring algorithm (0-100 scale)

**Frontend**:
- [ ] Build compliance dashboard (scores, violations, trends)
- [ ] Create alert inbox (show all active warnings)
- [ ] Implement proactive warnings (approaching 38h, missing break)
- [ ] Add compliance history chart (last 12 weeks trend)

**Testing**:
- [ ] Test each compliance rule independently
- [ ] Test alert delivery (email + push)
- [ ] Test scoring algorithm accuracy

**Deliverable**: Full compliance monitoring system

**Success Metrics**:
- Compliance violations detected: 100%
- False positive rate: <5%
- Alert delivery time: <1 minute

---

## WEEK 10: Reporting & Exports

### Goals
- Automated report generation
- PDF exports
- Inspector API

### Tasks

**Backend**:
- [ ] Build report generation engine (PDFKit integration)
- [ ] Create report templates (timesheet, compliance, variance, inspector)
- [ ] Implement CSV export (Sage-compatible format)
- [ ] Build inspector token system (time-limited read-only access)
- [ ] Create scheduled reports (auto-generate monthly timesheet last Friday)

**Frontend**:
- [ ] Build reports list page (all generated reports)
- [ ] Create report preview (view before download)
- [ ] Implement report scheduling UI
- [ ] Build inspector token generator

**Testing**:
- [ ] Test PDF generation (1000 entries = <10 seconds)
- [ ] Test inspector token expiry
- [ ] Test CSV compatibility with Sage accounting software

**Deliverable**: Full reporting system

**Success Metrics**:
- Report generation time: <30 seconds for monthly report
- Inspector satisfaction: >4.0/5.0 (audit ease)
- Payroll export accuracy: 100%

---

## WEEK 11: Notifications & Polish

### Goals
- Multi-channel notifications
- Right to Disconnect
- UX polish

### Tasks

**Backend**:
- [ ] Build notification service (BullMQ integration)
- [ ] Implement push notification delivery (Firebase/APNs)
- [ ] Add email notifications (Resend integration)
- [ ] Implement DND logic (quiet hours, urgent override)
- [ ] Build notification preferences API

**Frontend**:
- [ ] Add notification preferences screen
- [ ] Implement notification inbox (in-app)
- [ ] Add badge counts (unread notifications)
- [ ] Polish all animations (smooth transitions, haptic feedback)
- [ ] Implement loading skeletons (better perceived performance)

**Testing**:
- [ ] Test push delivery reliability (99.5% target)
- [ ] Test DND (no notifications during quiet hours except urgent)
- [ ] Test multi-channel delivery (push fails → email backup)

**Deliverable**: Notification system + polished UX

**Success Metrics**:
- Notification delivery rate: >99%
- Employee satisfaction: >4.5/5.0 (UX)
- Right to Disconnect compliance: 100%

---

## WEEK 12: Testing, Docs, Launch

### Goals
- E2E testing
- Documentation
- Production launch

### Tasks

**Testing**:
- [ ] E2E tests for all critical flows (Playwright)
  - Complete time tracking flow (clock in → break → clock out)
  - Roster creation and publishing
  - Shift swap workflow
  - Leave request workflow
  - Payroll export
- [ ] Security audit (encryption, access control, SQL injection attempts)
- [ ] Performance testing (load test: 100 concurrent users)
- [ ] ITSS co
