# Torre Tempo V4 - Compliance & Billing Schema Design

**Version**: 1.0  
**Date**: February 8, 2026  
**Status**: Design Phase (Not Implemented)

---

## 🎯 Purpose

Add comprehensive compliance (Spanish labor law) and billing data collection to Torre Tempo to make it:
1. **Legally compliant** for Spanish workforce management
2. **Billing-ready** with proper subscription tracking
3. **GDPR compliant** with proper consent management
4. **ITSS audit-ready** with required employment data

---

## 📋 Table of Contents

1. [New Tables](#new-tables)
2. [Existing Table Modifications](#existing-table-modifications)
3. [Data Encryption Strategy](#data-encryption-strategy)
4. [Migration Strategy](#migration-strategy)
5. [Onboarding Flow](#onboarding-flow)
6. [API Changes](#api-changes)
7. [UI Requirements](#ui-requirements)

---

## 🆕 New Tables

### 1. `employee_profiles`

**Purpose**: Store employment and compliance data separately from auth (`user` table) for security and separation of concerns.

**Why separate table?**
- Encryption: PII needs different encryption than auth data
- Multi-tenant: Same user can have different employment data per organization
- Audit: Employment changes need detailed tracking
- GDPR: Easier to export/delete employee data separately

```typescript
export const employee_profiles = pgTable(
  'employee_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organization_id: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    
    // =====================================================================
    // PERSONAL INFORMATION (ENCRYPTED - P0 Critical)
    // =====================================================================
    dni_nie_encrypted: text('dni_nie_encrypted').notNull(),
    // DNI/NIE/Passport number - REQUIRED by Spanish labor law
    // Format: DNI (12345678A), NIE (X1234567A), Passport (AB123456)
    // Encrypted at application level before storage
    
    social_security_number_encrypted: text('social_security_number_encrypted').notNull(),
    // Número de Afiliación a la Seguridad Social - REQUIRED
    // Format: 12 digits (e.g., 281234567840)
    // Encrypted at application level
    
    date_of_birth: date('date_of_birth').notNull(),
    // For age verification, contract type eligibility
    // REQUIRED for Spanish labor law compliance
    
    nationality: varchar('nationality', { length: 3 }), // ISO 3166-1 alpha-3
    // Required for right-to-work checks
    
    tax_id_encrypted: text('tax_id_encrypted'),
    // NIF/NIE for tax purposes (may differ from DNI/NIE)
    // Encrypted at application level
    
    phone_number_encrypted: text('phone_number_encrypted'),
    // E.164 format (e.g., +34612345678)
    // Encrypted for privacy
    
    address_encrypted: jsonb('address_encrypted'),
    // { street, city, postal_code, province, country }
    // Full address encrypted as JSON
    
    emergency_contact_encrypted: jsonb('emergency_contact_encrypted'),
    // { name, phone, relationship }
    // Encrypted as JSON
    
    // =====================================================================
    // EMPLOYMENT INFORMATION (P0 Critical)
    // =====================================================================
    employee_number: varchar('employee_number', { length: 50 }),
    // Internal company employee ID (if used)
    // NOT the same as system user_id
    
    job_title: varchar('job_title', { length: 100 }).notNull(),
    // Puesto de trabajo - REQUIRED
    // Example: "Camarero", "Cocinero", "Gerente"
    
    department: varchar('department', { length: 100 }),
    // Departamento - Optional but recommended
    // Example: "Sala", "Cocina", "Administración"
    
    employment_type: varchar('employment_type', { length: 50 }).notNull(),
    // REQUIRED - One of:
    // - 'indefinido' (permanent/indefinite)
    // - 'temporal' (fixed-term)
    // - 'practicas' (internship)
    // - 'formacion' (training contract)
    // - 'obra_servicio' (specific work/service)
    
    contract_start_date: date('contract_start_date').notNull(),
    // Fecha de alta - REQUIRED for all employees
    
    contract_end_date: date('contract_end_date'),
    // Required for temporal contracts, NULL for indefinido
    
    base_salary_cents: integer('base_salary_cents'),
    // Annual salary in cents (e.g., 18000.00 EUR = 1800000)
    // Optional - may be sensitive, stored for payroll integration
    
    working_hours_per_week: numeric('working_hours_per_week', { precision: 4, scale: 2 }).notNull(),
    // Jornada laboral - REQUIRED
    // Example: 40.00 (full-time), 20.00 (part-time)
    // Used for compliance checks (max 40h/week standard)
    
    work_location_id: uuid('work_location_id').references(() => locations.id),
    // Primary work location (from locations table)
    
    probation_end_date: date('probation_end_date'),
    // Fin período de prueba
    // Typically 2-6 months depending on contract type
    
    termination_date: date('termination_date'),
    // Fecha de baja - when employment ended
    
    termination_reason: varchar('termination_reason', { length: 100 }),
    // Motivo de baja: 'resignation', 'dismissal', 'end_contract', 'retirement', etc.
    
    // =====================================================================
    // LEGAL/COMPLIANCE (P1 High)
    // =====================================================================
    work_permit_number_encrypted: text('work_permit_number_encrypted'),
    // For non-EU workers - Número de autorización de trabajo
    // Encrypted at application level
    
    work_permit_expiry: date('work_permit_expiry'),
    // Alert when expiring (60 days notice)
    
    health_safety_training_date: date('health_safety_training_date'),
    // Fecha formación PRL (Prevención de Riesgos Laborales) - REQUIRED
    // Must be within 3 months of contract start
    
    health_safety_training_expiry: date('health_safety_training_expiry'),
    // Some training requires renewal (e.g., food safety annually)
    
    collective_agreement: varchar('collective_agreement', { length: 100 }),
    // Convenio colectivo aplicable
    // Example: "Convenio de Hostelería de Murcia"
    
    professional_category: varchar('professional_category', { length: 100 }),
    // Categoría profesional según convenio
    // Example: "Grupo 2 - Oficial 1ª"
    
    // =====================================================================
    // GDPR/CONSENT (P1 High)
    // =====================================================================
    gdpr_consent_date: timestamp('gdpr_consent_date', { withTimezone: true }),
    // When employee accepted privacy policy
    
    gdpr_consent_version: varchar('gdpr_consent_version', { length: 20 }),
    // Track which version of privacy policy was accepted
    
    data_processing_consent: boolean('data_processing_consent').default(false),
    // Explicit consent for processing personal data
    
    marketing_consent: boolean('marketing_consent').default(false),
    // Consent for marketing communications
    
    consent_ip_address: inet('consent_ip_address'),
    // IP address when consent was given (audit trail)
    
    right_to_erasure_requested_at: timestamp('right_to_erasure_requested_at', { withTimezone: true }),
    // GDPR Article 17 - right to be forgotten
    
    // =====================================================================
    // METADATA
    // =====================================================================
    notes: text('notes'),
    // Internal notes (visible to admins/managers only)
    
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_by: text('created_by').references(() => user.id),
    updated_by: text('updated_by').references(() => user.id),
  },
  (table) => ({
    user_org_idx: uniqueIndex('employee_profiles_user_org_idx').on(
      table.user_id,
      table.organization_id
    ), // One profile per user per organization
    org_idx: index('employee_profiles_org_idx').on(table.organization_id),
    dni_idx: index('employee_profiles_dni_idx').on(table.dni_nie_encrypted), // For lookups
    ssn_idx: index('employee_profiles_ssn_idx').on(table.social_security_number_encrypted),
  })
);
```

---

### 2. `organization_legal_details`

**Purpose**: Store legal, billing, and operational information for organizations.

**Why separate table?**
- Security: Billing data separate from general org data
- Versioning: Legal details may need historical tracking
- Access control: Only owners/billing admins should see this

```typescript
export const organization_legal_details = pgTable(
  'organization_legal_details',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id')
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: 'cascade' }),
    
    // =====================================================================
    // LEGAL INFORMATION (P0 Critical)
    // =====================================================================
    legal_name: varchar('legal_name', { length: 255 }).notNull(),
    // Razón social - REQUIRED
    // Example: "Restaurante La Torre, S.L."
    
    cif: varchar('cif', { length: 20 }).notNull().unique(),
    // CIF/NIF empresa - REQUIRED, UNIQUE
    // Format: A12345678 (companies), 12345678A (self-employed)
    // Must be validated with Spanish Tax Agency format
    
    legal_address: jsonb('legal_address').notNull(),
    // Domicilio social - REQUIRED
    // { street, number, door, postal_code, city, province, country }
    
    mercantile_registration: varchar('mercantile_registration', { length: 255 }),
    // Registro Mercantil
    // Example: "Inscrita en el Registro Mercantil de Murcia, Tomo 1234, Folio 56, Hoja MU-12345"
    
    industry_sector: varchar('industry_sector', { length: 10 }),
    // CNAE code (Spanish industry classification)
    // Example: "5610" (Restaurantes y puestos de comidas)
    // Used for collective agreement determination
    
    company_size: integer('company_size'),
    // Current number of employees
    // Important for compliance thresholds (e.g., < 50 employees = simpler rules)
    
    collective_agreement_code: varchar('collective_agreement_code', { length: 50 }),
    // Código convenio colectivo aplicable
    // Example: "MU0001" (Convenio de Hostelería de Murcia)
    
    social_security_company_code: varchar('social_security_company_code', { length: 50 }),
    // Código de cuenta de cotización (CCC)
    // Format: 11 digits + 2 check digits (e.g., 28/123456/78)
    
    // =====================================================================
    // BILLING INFORMATION (P1 High)
    // =====================================================================
    billing_email: varchar('billing_email', { length: 255 }).notNull(),
    // Where to send invoices - REQUIRED
    
    billing_address: jsonb('billing_address'),
    // May differ from legal address
    // { street, number, door, postal_code, city, province, country }
    // If NULL, use legal_address
    
    vat_number: varchar('vat_number', { length: 20 }),
    // For EU B2B invoices (intra-community)
    // Format: ES + CIF (e.g., ESA12345678)
    
    invoice_language: varchar('invoice_language', { length: 2 }).default('es'),
    // ISO 639-1: 'es', 'en', 'ca'
    
    payment_terms_days: integer('payment_terms_days').default(30),
    // Payment due in X days from invoice date
    
    purchase_order_required: boolean('purchase_order_required').default(false),
    // Does company require PO numbers on invoices?
    
    billing_contact_name: varchar('billing_contact_name', { length: 100 }),
    billing_contact_phone: varchar('billing_contact_phone', { length: 20 }),
    
    // =====================================================================
    // OPERATIONAL SETTINGS (P1 High)
    // =====================================================================
    timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Madrid'),
    // IANA timezone
    
    default_language: varchar('default_language', { length: 2 }).notNull().default('es'),
    // ISO 639-1
    
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    // ISO 4217
    
    date_format: varchar('date_format', { length: 20 }).default('DD/MM/YYYY'),
    time_format: varchar('time_format', { length: 10 }).default('24h'),
    
    fiscal_year_start: varchar('fiscal_year_start', { length: 5 }).default('01-01'),
    // Format: MM-DD
    
    business_hours: jsonb('business_hours'),
    // { monday: { open: "09:00", close: "18:00" }, ... }
    
    // =====================================================================
    // COMPLIANCE & INSURANCE (P2 Medium)
    // =====================================================================
    itss_registration_number: varchar('itss_registration_number', { length: 50 }),
    // If registered with Inspección de Trabajo
    
    insurance_policy_number: varchar('insurance_policy_number', { length: 100 }),
    // Seguro de responsabilidad civil
    
    insurance_provider: varchar('insurance_provider', { length: 100 }),
    insurance_expiry_date: date('insurance_expiry_date'),
    
    mutua_code: varchar('mutua_code', { length: 50 }),
    // Mutua de accidentes de trabajo y enfermedades profesionales
    // Example: "Mutua Universal" code
    
    data_controller_name: varchar('data_controller_name', { length: 255 }),
    // For GDPR (typically company legal name)
    
    data_protection_officer_email: varchar('data_protection_officer_email', { length: 255 }),
    // If DPO appointed (required if > 250 employees or sensitive data)
    
    data_retention_policy_days: integer('data_retention_policy_days').default(2555),
    // Default: 7 years (Spanish labor law requirement)
    
    // =====================================================================
    // SYSTEM/OPERATIONAL (P2 Medium)
    // =====================================================================
    onboarding_completed_at: timestamp('onboarding_completed_at', { withTimezone: true }),
    // When setup wizard was finished
    
    onboarding_completed_by: text('onboarding_completed_by').references(() => user.id),
    
    last_audit_date: date('last_audit_date'),
    // Last ITSS inspection
    
    next_audit_due: date('next_audit_due'),
    // Proactive compliance reminder
    
    account_status: varchar('account_status', { length: 20 }).notNull().default('active'),
    // 'active', 'suspended', 'churned'
    
    suspension_reason: text('suspension_reason'),
    suspension_date: timestamp('suspension_date', { withTimezone: true }),
    
    churned_at: timestamp('churned_at', { withTimezone: true }),
    churn_reason: varchar('churn_reason', { length: 50 }),
    churn_feedback: text('churn_feedback'),
    
    // =====================================================================
    // METADATA
    // =====================================================================
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    created_by: text('created_by').references(() => user.id),
    updated_by: text('updated_by').references(() => user.id),
  },
  (table) => ({
    cif_idx: uniqueIndex('org_legal_cif_idx').on(table.cif),
    org_idx: uniqueIndex('org_legal_org_idx').on(table.organization_id),
  })
);
```

---

## 🔄 Existing Table Modifications

### 3. `subscription_details` (Add columns)

```sql
-- Usage Tracking (for billing)
ALTER TABLE subscription_details ADD COLUMN monthly_time_entries_used INTEGER DEFAULT 0;
ALTER TABLE subscription_details ADD COLUMN monthly_shifts_created INTEGER DEFAULT 0;
ALTER TABLE subscription_details ADD COLUMN monthly_reports_generated INTEGER DEFAULT 0;
ALTER TABLE subscription_details ADD COLUMN storage_used_mb INTEGER DEFAULT 0;
ALTER TABLE subscription_details ADD COLUMN api_calls_this_month INTEGER DEFAULT 0;
ALTER TABLE subscription_details ADD COLUMN usage_reset_date DATE; -- When to reset monthly counters

-- Payment History
ALTER TABLE subscription_details ADD COLUMN last_payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscription_details ADD COLUMN last_payment_amount_cents INTEGER;
ALTER TABLE subscription_details ADD COLUMN next_billing_date DATE;
ALTER TABLE subscription_details ADD COLUMN failed_payment_count INTEGER DEFAULT 0;
ALTER TABLE subscription_details ADD COLUMN last_failed_payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscription_details ADD COLUMN last_failed_payment_reason TEXT;
ALTER TABLE subscription_details ADD COLUMN mrr_cents INTEGER; -- Monthly Recurring Revenue
ALTER TABLE subscription_details ADD COLUMN arr_cents INTEGER; -- Annual Recurring Revenue

-- Discounts/Promotions
ALTER TABLE subscription_details ADD COLUMN discount_code VARCHAR(50);
ALTER TABLE subscription_details ADD COLUMN discount_percent NUMERIC(5,2); -- e.g., 25.00 for 25%
ALTER TABLE subscription_details ADD COLUMN discount_amount_cents INTEGER; -- or fixed amount
ALTER TABLE subscription_details ADD COLUMN discount_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscription_details ADD COLUMN referral_code VARCHAR(50) UNIQUE;
ALTER TABLE subscription_details ADD COLUMN referred_by_organization_id TEXT REFERENCES organization(id);
ALTER TABLE subscription_details ADD COLUMN referral_credit_cents INTEGER DEFAULT 0;

-- Lifecycle
ALTER TABLE subscription_details ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscription_details ADD COLUMN subscription_cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscription_details ADD COLUMN cancellation_reason VARCHAR(100);
ALTER TABLE subscription_details ADD COLUMN cancellation_feedback TEXT;
ALTER TABLE subscription_details ADD COLUMN downgrade_scheduled_to VARCHAR(20); -- Plan code
ALTER TABLE subscription_details ADD COLUMN downgrade_effective_date DATE;
ALTER TABLE subscription_details ADD COLUMN upgrade_scheduled_to VARCHAR(20);
ALTER TABLE subscription_details ADD COLUMN upgrade_effective_date DATE;

-- Add indexes
CREATE INDEX subscription_details_next_billing_idx ON subscription_details(next_billing_date);
CREATE INDEX subscription_details_referral_idx ON subscription_details(referred_by_organization_id);
```

---

### 4. `user` table (Add GDPR tracking)

**Note**: Better Auth manages this table, but we can extend it carefully.

```sql
-- GDPR/Privacy
ALTER TABLE "user" ADD COLUMN gdpr_consent_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE "user" ADD COLUMN gdpr_consent_version VARCHAR(20);
ALTER TABLE "user" ADD COLUMN privacy_policy_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE "user" ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
ALTER TABLE "user" ADD COLUMN marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE "user" ADD COLUMN consent_ip_address INET;

-- Account Lifecycle
ALTER TABLE "user" ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE "user" ADD COLUMN account_deletion_requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE "user" ADD COLUMN account_deletion_scheduled_for TIMESTAMP WITH TIME ZONE; -- 30 days grace period
ALTER TABLE "user" ADD COLUMN deletion_reason VARCHAR(100);

-- Communication Preferences
ALTER TABLE "user" ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}';
ALTER TABLE "user" ADD COLUMN language_preference VARCHAR(2) DEFAULT 'es';
ALTER TABLE "user" ADD COLUMN timezone VARCHAR(50) DEFAULT 'Europe/Madrid';
```

---

## 🔐 Data Encryption Strategy

### Encryption Requirements

**Fields requiring encryption** (PII/sensitive):
- `employee_profiles.dni_nie_encrypted`
- `employee_profiles.social_security_number_encrypted`
- `employee_profiles.tax_id_encrypted`
- `employee_profiles.phone_number_encrypted`
- `employee_profiles.address_encrypted`
- `employee_profiles.emergency_contact_encrypted`
- `employee_profiles.work_permit_number_encrypted`

### Implementation Options

#### **Option A: Application-Level Encryption (RECOMMENDED)**

**Why?**
- Key rotation without database downtime
- Encryption keys never touch database
- Works with any database (portable)
- Easier GDPR compliance (delete key = instant erasure)

**Implementation**:
```typescript
// apps/api/src/lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const key = crypto.pbkdf2Sync(KEY, salt, 100000, 32, 'sha512');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Format: salt:iv:tag:encrypted
  return salt.toString('hex') + ':' + 
         iv.toString('hex') + ':' + 
         tag.toString('hex') + ':' + 
         encrypted;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 4) throw new Error('Invalid encrypted data');
  
  const salt = Buffer.from(parts[0]!, 'hex');
  const iv = Buffer.from(parts[1]!, 'hex');
  const tag = Buffer.from(parts[2]!, 'hex');
  const encrypted = parts[3]!;
  
  const key = crypto.pbkdf2Sync(KEY, salt, 100000, 32, 'sha512');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Environment Variables**:
```bash
# Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=64_hex_characters_here
ENCRYPTION_KEY_BACKUP=another_64_hex_for_rotation
```

#### **Option B: Database-Level Encryption (pgcrypto)**

**Pros**: Database handles it, simpler code  
**Cons**: Key rotation harder, DB-specific, keys in DB

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt
INSERT INTO employee_profiles (dni_nie_encrypted) 
VALUES (pgp_sym_encrypt('12345678A', current_setting('app.encryption_key')));

-- Decrypt
SELECT pgp_sym_decrypt(dni_nie_encrypted::bytea, current_setting('app.encryption_key'))
FROM employee_profiles;
```

### Recommendation

**Use Application-Level Encryption (Option A)** for Torre Tempo because:
1. Better key management (rotate without DB downtime)
2. GDPR "Right to Erasure" easier (delete key = instant erasure)
3. Portable (works with any DB if you migrate)
4. More control over encryption algorithm

---

## 🚀 Migration Strategy

### Phase 1: Create New Tables (Week 1)

**Goal**: Add tables without breaking existing functionality

1. **Create `employee_profiles` table**
   - Migration: `20260210_create_employee_profiles.sql`
   - No data migration needed (new table)
   
2. **Create `organization_legal_details` table**
   - Migration: `20260210_create_org_legal_details.sql`
   - No data migration needed (new table)

3. **Add columns to `subscription_details`**
   - Migration: `20260210_enhance_subscription_details.sql`
   - Set default values for existing rows

4. **Add columns to `user` table**
   - Migration: `20260210_enhance_user_table.sql`
   - Set defaults carefully (Better Auth managed)

**Deployment**: Zero downtime, no existing features affected

---

### Phase 2: Build Onboarding Flow (Week 1-2)

**Goal**: UI to collect new data

1. **Multi-step onboarding wizard** for new organizations:
   - Step 1: Company Legal Info (CIF, legal address, etc.)
   - Step 2: Billing Setup (billing email, address, VAT)
   - Step 3: Operational Settings (timezone, language)
   - Step 4: First Employee (invite team members)

2. **Employee profile form** (for HR/managers):
   - Personal info (DNI, date of birth, address)
   - Employment info (contract dates, job title)
   - Legal compliance (work permits, training)

3. **Bulk import** for existing employees:
   - CSV upload template
   - Validation + error handling
   - Background job processing

**No forced migration**: Existing users can continue without filling new fields (add "Complete Profile" banner)

---

### Phase 3: Gradual Rollout (Week 2)

1. **New signups**: Required to complete onboarding
2. **Existing orgs**: Optional, with incentives
   - Banner: "Complete your company profile to unlock features"
   - Email campaign: "Ensure compliance with Spanish labor law"
3. **Grace period**: 90 days before making fields mandatory

---

### Phase 4: Data Migration Scripts (Week 3)

For any existing data that can be migrated:

```typescript
// Example: Migrate existing member data to employee_profiles
async function migrateExistingMembers() {
  const members = await db.select().from(member);
  
  for (const m of members) {
    // Check if profile already exists
    const existing = await db
      .select()
      .from(employee_profiles)
      .where(
        and(
          eq(employee_profiles.user_id, m.userId),
          eq(employee_profiles.organization_id, m.organizationId)
        )
      );
    
    if (existing.length === 0) {
      // Create minimal profile (user must complete later)
      await db.insert(employee_profiles).values({
        user_id: m.userId,
        organization_id: m.organizationId,
        job_title: 'Employee', // Default
        employment_type: 'indefinido', // Assume permanent
        contract_start_date: m.createdAt, // Use member creation date
        working_hours_per_week: 40, // Assume full-time
        
        // Critical fields left NULL - user MUST complete
        dni_nie_encrypted: null, // Will prompt user
        social_security_number_encrypted: null,
        date_of_birth: null,
      });
    }
  }
}
```

---

## 📝 Onboarding Flow

### New Organization Sign-Up

```
┌─────────────────────────────────────────────────┐
│  Step 1: Create Account (Better Auth)          │
│  - Name, email, password                        │
│  - Create organization name                     │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Step 2: Company Legal Information              │
│  ────────────────────────────────────────────   │
│  Legal Name: ___________________________        │
│  CIF/NIF:    ___________________________        │
│                                                  │
│  Legal Address:                                 │
│  Street:     ___________________________        │
│  City:       ___________________________        │
│  Postal Code: ______  Province: ________        │
│                                                  │
│  Industry Sector (CNAE): _______________        │
│  Company Size: [Dropdown: <10, 10-50, etc.]    │
│                                                  │
│  [Back]                   [Continue →]          │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Step 3: Billing Information                    │
│  ────────────────────────────────────────────   │
│  Billing Email: ________________________        │
│  VAT Number (optional): ________________        │
│                                                  │
│  Billing Address:                               │
│  [✓] Same as legal address                      │
│  [ ] Different address:                         │
│      Street: ___________________________        │
│                                                  │
│  Payment Terms: [30 days ▼]                     │
│                                                  │
│  [← Back]                 [Continue →]          │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Step 4: Operational Settings                   │
│  ────────────────────────────────────────────   │
│  Timezone: [Europe/Madrid ▼]                    │
│  Language: [Español ▼]                          │
│  Currency: [EUR ▼]                              │
│  Date Format: [DD/MM/YYYY ▼]                    │
│                                                  │
│  Collective Agreement (optional):               │
│  ___________________________________            │
│                                                  │
│  [← Back]           [Complete Setup →]          │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  🎉 Setup Complete!                             │
│                                                  │
│  Your organization is ready to use.             │
│                                                  │
│  Next steps:                                    │
│  • Invite team members                          │
│  • Add work locations                           │
│  • Create your first shift                      │
│                                                  │
│  [Go to Dashboard →]                            │
└─────────────────────────────────────────────────┘
```

---

### Add Employee Profile

**Accessed by**: Owner, Tenant Admin, Managers (with permission)

**Two modes**:
1. **Invite new user** → User completes profile after accepting
2. **Add existing member profile** → Admin completes for existing user

```
┌─────────────────────────────────────────────────┐
│  Add Employee Profile                           │
│  ────────────────────────────────────────────   │
│  Select User: [John Doe ▼] or [+ Invite New]   │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Personal Information                           │
│  ────────────────────────────────────────────   │
│  DNI/NIE/Passport: ______________________       │
│  Social Security Number: _______________ 🔒     │
│  Date of Birth: [DD] [MM] [YYYY]                │
│  Nationality: [España ▼]                        │
│                                                  │
│  Phone: +34 ___________________________         │
│  Address:                                       │
│  Street: _______________________________        │
│  City: ____________  Postal Code: ______        │
│                                                  │
│  Emergency Contact:                             │
│  Name: _________________________________        │
│  Phone: +34 ____________________________        │
│  Relationship: [Spouse ▼]                       │
│                                                  │
│  [Cancel]                   [Next →]            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Employment Information                         │
│  ────────────────────────────────────────────   │
│  Employee Number (optional): ___________        │
│  Job Title: ____________________________        │
│  Department: ___________________________        │
│                                                  │
│  Employment Type: [Indefinido ▼]                │
│  Contract Start Date: [DD/MM/YYYY]              │
│  Contract End Date: [DD/MM/YYYY] (if temporal)  │
│                                                  │
│  Working Hours/Week: [40.00]                    │
│  Base Salary (optional): € __________/year      │
│                                                  │
│  Primary Work Location: [Select ▼]              │
│                                                  │
│  [← Back]                   [Next →]            │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  Legal & Compliance                             │
│  ────────────────────────────────────────────   │
│  Collective Agreement: __________________       │
│  Professional Category: _________________       │
│                                                  │
│  Health & Safety Training:                      │
│  Date Completed: [DD/MM/YYYY]                   │
│  Expiry Date: [DD/MM/YYYY]                      │
│                                                  │
│  ── For non-EU workers only ──                  │
│  Work Permit Number: ___________________        │
│  Expiry Date: [DD/MM/YYYY]                      │
│                                                  │
│  [← Back]           [Create Profile →]          │
└─────────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────┐
│  ✓ Employee Profile Created                     │
│                                                  │
│  John Doe's profile has been saved.             │
│                                                  │
│  [View Profile]  [Add Another Employee]         │
└─────────────────────────────────────────────────┘
```

---

## 🔌 API Changes

### New Endpoints

#### Employee Profiles

```typescript
// Create employee profile
POST /api/v1/org/:slug/employees/profiles
Body: { user_id, dni_nie, ssn, dob, job_title, ... }

// Get employee profile
GET /api/v1/org/:slug/employees/profiles/:userId

// Update employee profile
PATCH /api/v1/org/:slug/employees/profiles/:userId

// List all employee profiles (admin/manager)
GET /api/v1/org/:slug/employees/profiles
Query: ?search=john&employment_type=indefinido

// Bulk import from CSV
POST /api/v1/org/:slug/employees/profiles/bulk-import
Body: FormData with CSV file

// Export employee data (GDPR compliance)
GET /api/v1/org/:slug/employees/profiles/:userId/export
Returns: JSON with all personal data
```

#### Organization Legal Details

```typescript
// Create/update legal details
PUT /api/v1/org/:slug/legal-details
Body: { legal_name, cif, legal_address, ... }

// Get legal details (owner/admin only)
GET /api/v1/org/:slug/legal-details

// Verify CIF with external service
POST /api/v1/org/:slug/legal-details/verify-cif
Body: { cif }
Returns: { valid: boolean, company_name: string }
```

#### Compliance

```typescript
// Get compliance status
GET /api/v1/org/:slug/compliance/status
Returns: {
  missing_employee_profiles: number,
  expired_work_permits: number,
  pending_health_safety_training: number,
  overall_status: 'compliant' | 'warnings' | 'critical'
}

// Generate compliance report (PDF)
GET /api/v1/org/:slug/compliance/report
Query: ?format=pdf
```

---

### Modified Endpoints

```typescript
// Existing endpoints need to JOIN with new tables

// Example: GET /api/v1/org/:slug/members
// NOW returns:
{
  id,
  userId,
  role,
  createdAt,
  user: { name, email, image },
  profile: {  // NEW - from employee_profiles
    job_title,
    department,
    employment_type,
    contract_start_date,
    working_hours_per_week
  }
}
```

---

## 🎨 UI Requirements

### 1. Onboarding Wizard (NEW)
- **Pages**: 4 steps as designed above
- **Components**:
  - `CompanyLegalForm.tsx`
  - `BillingInfoForm.tsx`
  - `OperationalSettingsForm.tsx`
  - `OnboardingProgress.tsx` (stepper)

### 2. Employee Profile Management (NEW)
- **Page**: `/t/:slug/employees/profiles`
- **Components**:
  - `EmployeeProfileList.tsx` (table view)
  - `EmployeeProfileForm.tsx` (multi-step form)
  - `EmployeeProfileDetail.tsx` (view/edit)
  - `BulkImportDialog.tsx` (CSV upload)

### 3. Organization Settings (ENHANCE)
- **Page**: `/t/:slug/settings` → Add "Legal & Billing" tab
- **Components**:
  - `LegalDetailsForm.tsx`
  - `BillingDetailsForm.tsx`
  - `ComplianceStatusCard.tsx`

### 4. Compliance Dashboard (NEW)
- **Page**: `/t/:slug/compliance`
- **Components**:
  - `ComplianceOverview.tsx` (status cards)
  - `ExpiringPermitsTable.tsx`
  - `MissingProfilesAlert.tsx`
  - `ComplianceReportGenerator.tsx`

### 5. Admin Panel Enhancements
- **Page**: `/admin/tenants/:id`
- **Components**:
  - Show legal details (CIF, legal address)
  - Show billing status (MRR, ARR, payment history)
  - Compliance flags

---

## 📋 Implementation Checklist

### Week 1: Database & Backend
- [ ] Create `employee_profiles` table migration
- [ ] Create `organization_legal_details` table migration
- [ ] Add columns to `subscription_details`
- [ ] Add columns to `user` table
- [ ] Implement encryption functions (`encrypt()`, `decrypt()`)
- [ ] Create API routes for employee profiles
- [ ] Create API routes for org legal details
- [ ] Add validation (CIF format, DNI format)
- [ ] Write unit tests for encryption
- [ ] Write API integration tests

### Week 2: Frontend - Onboarding
- [ ] Build onboarding wizard UI
- [ ] Implement `CompanyLegalForm` with validation
- [ ] Implement `BillingInfoForm`
- [ ] Implement `OperationalSettingsForm`
- [ ] Add CIF validation (Spanish format)
- [ ] Add address autocomplete (if using API)
- [ ] Connect forms to API
- [ ] Add loading states and error handling
- [ ] Test onboarding flow end-to-end

### Week 3: Frontend - Employee Profiles
- [ ] Build employee profile list page
- [ ] Implement `EmployeeProfileForm` (multi-step)
- [ ] Add DNI/NIE format validation
- [ ] Add date pickers with proper validation
- [ ] Implement CSV bulk import UI
- [ ] Build employee profile detail page
- [ ] Add edit/delete actions (with permissions)
- [ ] Add search/filter functionality
- [ ] Test profile creation/editing

### Week 4: Compliance & Reporting
- [ ] Build compliance dashboard
- [ ] Implement status checks (missing profiles, expired permits)
- [ ] Add alerts for expiring documents
- [ ] Build compliance report generator (PDF)
- [ ] Add legal details to org settings
- [ ] Enhance admin panel with new data
- [ ] Add GDPR data export functionality
- [ ] Write E2E tests for critical flows

### Week 5: Polish & Deploy
- [ ] Security audit (encryption, access control)
- [ ] Performance testing (encryption overhead)
- [ ] Update documentation
- [ ] Create migration guide for existing users
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for issues

---

## 🔒 Security Considerations

### Access Control

**Employee Profiles**:
- **Read**: Owner, Tenant Admin, Managers (for their team)
- **Write**: Owner, Tenant Admin, HR role
- **Sensitive fields** (salary): Owner, Tenant Admin only
- **Own profile**: Employees can VIEW but not EDIT sensitive fields

**Organization Legal Details**:
- **Read**: Owner, Tenant Admin
- **Write**: Owner only
- **Billing info**: Owner, Billing Admin role

### Audit Logging

All changes to sensitive data must be logged:
```typescript
// Log to admin_audit_log
await logAdminAction({
  adminId: actor.id,
  action: 'employee_profile.update',
  targetType: 'employee_profile',
  targetId: profileId,
  details: {
    changed_fields: ['dni_nie', 'contract_start_date'],
    old_values_hash: sha256(oldValues), // Don't log actual values
    organization_id: orgId,
  },
  ip: req.ip,
});
```

### Data Retention

**GDPR Article 17**: Right to Erasure
- User requests deletion → Queue job to delete after 30 days
- During grace period: Soft delete (flag account)
- After grace period: Hard delete encrypted data
- Audit logs: Keep metadata but remove PII

```typescript
async function processDataDeletion(userId: string) {
  // 1. Delete encrypted profile data
  await db.delete(employee_profiles).where(eq(employee_profiles.user_id, userId));
  
  // 2. Anonymize audit logs
  await db.update(admin_audit_log)
    .set({ targetId: 'DELETED_USER' })
    .where(eq(admin_audit_log.targetId, userId));
  
  // 3. Delete user account
  await db.delete(user).where(eq(user.id, userId));
}
```

---

## 📊 Validation Rules

### CIF Validation (Spanish Tax ID)

```typescript
function validateCIF(cif: string): boolean {
  // Format: 1 letter + 7-8 digits + 1 check digit
  // Letters: A-H, J, N, P-S, U, V, W (no I, O, K, X, Y, Z initially)
  const regex = /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/;
  if (!regex.test(cif)) return false;
  
  // TODO: Implement full check digit validation
  // https://es.wikipedia.org/wiki/C%C3%B3digo_de_identificaci%C3%B3n_fiscal
  return true;
}
```

### DNI/NIE Validation

```typescript
function validateDNINIE(dni: string): boolean {
  const dniRegex = /^\d{8}[A-Z]$/;
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
  
  if (!dniRegex.test(dni) && !nieRegex.test(dni)) return false;
  
  // Validate check letter
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  let number: number;
  
  if (dni.startsWith('X')) number = parseInt(dni.substring(1, 8));
  else if (dni.startsWith('Y')) number = parseInt(dni.substring(1, 8)) + 10000000;
  else if (dni.startsWith('Z')) number = parseInt(dni.substring(1, 8)) + 20000000;
  else number = parseInt(dni.substring(0, 8));
  
  const expectedLetter = letters[number % 23];
  return dni.charAt(dni.length - 1) === expectedLetter;
}
```

### Social Security Number Validation

```typescript
function validateSSN(ssn: string): boolean {
  // Format: 12 digits (e.g., 281234567840)
  // Structure: 2 digits province + 8 digits sequential + 2 check digits
  const regex = /^\d{12}$/;
  if (!regex.test(ssn)) return false;
  
  // Check digit validation (Módulo 97)
  const digits = ssn.substring(0, 10);
  const checkDigits = parseInt(ssn.substring(10, 12));
  const calculated = 97 - (parseInt(digits) % 97);
  
  return checkDigits === calculated;
}
```

---

## 🌍 Localization

All new forms/fields must support:
- **Spanish** (primary)
- **English** (secondary)
- **Catalan** (optional)

Translation keys structure:
```json
{
  "onboarding": {
    "company_legal": {
      "title": "Información Legal de la Empresa",
      "legal_name": {
        "label": "Razón Social",
        "placeholder": "Ej: Restaurante La Torre, S.L.",
        "help": "Nombre legal registrado en el Registro Mercantil"
      },
      "cif": {
        "label": "CIF/NIF",
        "placeholder": "A12345678",
        "error_invalid": "CIF no válido. Verifica el formato."
      }
    }
  },
  "employee_profile": {
    "personal_info": {
      "dni_nie": {
        "label": "DNI/NIE/Pasaporte",
        "placeholder": "12345678A o X1234567A",
        "help": "Documento de identidad oficial"
      },
      "ssn": {
        "label": "Número de Seguridad Social",
        "placeholder": "281234567840",
        "help": "12 dígitos de afiliación a la Seguridad Social"
      }
    }
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Encryption/decryption functions
- Validation functions (CIF, DNI, SSN)
- Data transformation helpers

### Integration Tests
- API endpoint: Create employee profile
- API endpoint: Update org legal details
- API endpoint: Bulk import employees
- Encryption round-trip (encrypt → store → retrieve → decrypt)

### E2E Tests (Playwright)
- Complete onboarding wizard flow
- Create employee profile (all steps)
- Edit employee profile
- Bulk import CSV
- Generate compliance report

### Security Tests
- SQL injection attempts on new endpoints
- Access control: Non-admin trying to access sensitive data
- Encryption key tampering
- GDPR data export completeness

---

## 📈 Success Metrics

### Technical
- [ ] All migrations run successfully
- [ ] Zero downtime deployment
- [ ] Encryption/decryption latency < 50ms
- [ ] New API endpoints response time < 200ms
- [ ] 100% test coverage on encryption functions

### Product
- [ ] 80% of new signups complete onboarding
- [ ] 50% of existing orgs add legal details within 30 days
- [ ] 60% of employees have complete profiles within 60 days
- [ ] Zero GDPR compliance incidents
- [ ] Compliance dashboard usage by 70% of admins

### Business
- [ ] Enable accurate billing (usage tracking)
- [ ] Enable tiered pricing based on employee count
- [ ] Reduce churn from "not compliant" concerns
- [ ] Enable enterprise sales (compliance proof point)

---

## 🔄 Rollback Plan

### If major issues arise:

**Database rollback**:
```sql
-- Drop new tables
DROP TABLE IF EXISTS employee_profiles CASCADE;
DROP TABLE IF EXISTS organization_legal_details CASCADE;

-- Remove new columns
ALTER TABLE subscription_details DROP COLUMN IF EXISTS monthly_time_entries_used;
-- ... (all added columns)

ALTER TABLE "user" DROP COLUMN IF EXISTS gdpr_consent_date;
-- ... (all added columns)
```

**Application rollback**:
- Deploy previous git commit
- New tables/columns exist but unused (no harm)
- Turn off onboarding wizard via feature flag

**Data safety**:
- All new data in separate tables
- No modification of existing data
- Can rollback without data loss

---

## 📞 Support Plan

### User Documentation
- [ ] Onboarding guide (video + written)
- [ ] Employee profile creation guide
- [ ] GDPR compliance FAQ
- [ ] CSV import template + instructions

### Admin Training
- [ ] Compliance dashboard walkthrough
- [ ] How to handle GDPR data requests
- [ ] Bulk import troubleshooting

### Customer Support
- [ ] Update support scripts with new FAQs
- [ ] Train support team on compliance features
- [ ] Create troubleshooting decision tree

---

## ✅ Final Pre-Implementation Checklist

Before starting implementation:

- [ ] Schema design reviewed by senior engineer
- [ ] Legal requirements verified with compliance expert
- [ ] Encryption approach approved by security team
- [ ] Database capacity checked (new tables, indexes)
- [ ] Backup strategy confirmed
- [ ] Rollback plan tested in staging
- [ ] Privacy policy updated to cover new data collection
- [ ] Data Processing Agreement (DPA) updated for clients
- [ ] Product team aligned on onboarding UX
- [ ] Support team trained on new features
- [ ] Marketing prepared for feature announcement

---

**Status**: 🟡 **DESIGN COMPLETE - AWAITING APPROVAL**

**Next Step**: Review this document, get stakeholder approval, then begin Week 1 implementation.

---

*Document maintained by: Development Team*  
*Last updated: February 8, 2026*  
*Version: 1.0*
