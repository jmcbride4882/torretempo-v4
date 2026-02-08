import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  inet,
  uniqueIndex,
  index,
  primaryKey,
  numeric,
  smallint,
} from 'drizzle-orm/pg-core';

// ============================================================================
// BETTER AUTH TABLES (Auto-generated)
// ============================================================================
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  role: text('role'), // Better Auth admin plugin
  banned: boolean('banned'), // Better Auth admin plugin
  banReason: text('banReason'), // Better Auth admin plugin
  banExpires: timestamp('banExpires'), // Better Auth admin plugin
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonatedBy'), // Better Auth admin plugin impersonation
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
});

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  createdAt: timestamp('createdAt').notNull(),
  metadata: text('metadata'),
});

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId')
    .notNull()
    .references(() => organization.id),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  clock_in_pin: text('clock_in_pin'), // Hashed 4-digit PIN for clock-in authentication
});

export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId')
    .notNull()
    .references(() => organization.id),
  email: text('email').notNull(),
  role: text('role'),
  status: text('status').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  inviterId: text('inviterId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
});

// ============================================================================
// LOCATIONS TABLE
// ============================================================================
export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    address: text('address'),
    lat: numeric('lat', { precision: 10, scale: 8 }),
    lng: numeric('lng', { precision: 11, scale: 8 }),
    geofence_radius: integer('geofence_radius'), // in meters
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('locations_org_idx').on(table.organization_id),
  })
);

// ============================================================================
// FEATURE_FLAGS TABLE
// ============================================================================
export const feature_flags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flag_key: varchar('flag_key', { length: 100 }).notNull().unique(),
    description: text('description'),
    enabled_globally: boolean('enabled_globally').notNull().default(false),
    enabled_for_orgs: text('enabled_for_orgs').array(),
    disabled_for_orgs: text('disabled_for_orgs').array(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    flag_key_idx: uniqueIndex('feature_flags_flag_key_idx').on(table.flag_key),
  })
);


// ============================================================================
// MEMBER_SKILLS JUNCTION TABLE
// ============================================================================
export const member_skills = pgTable(
  'member_skills',
  {
    member_id: text('member_id').notNull(),
    skill_id: uuid('skill_id').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.member_id, table.skill_id] }),
    skill_idx: index('member_skills_skill_idx').on(table.skill_id),
  })
);

// ============================================================================
// AVAILABILITY TABLE
// ============================================================================
export const availability = pgTable(
  'availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    user_id: text('user_id').notNull(),
    day_of_week: smallint('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
    start_time: varchar('start_time', { length: 5 }).notNull(), // HH:MM
    end_time: varchar('end_time', { length: 5 }).notNull(), // HH:MM
    type: varchar('type', { length: 20 }).notNull(), // 'available', 'unavailable', 'preferred'
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('availability_org_idx').on(table.organization_id),
    user_idx: index('availability_user_idx').on(table.user_id),
  })
);

// ============================================================================
// SHIFT_TEMPLATES TABLE
// ============================================================================
export const shift_templates = pgTable(
  'shift_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(), // "Morning Shift", "Afternoon Shift", etc.
    start_time: varchar('start_time', { length: 5 }).notNull(), // HH:mm format (e.g., "08:00")
    end_time: varchar('end_time', { length: 5 }).notNull(), // HH:mm format (e.g., "16:00")
    break_minutes: integer('break_minutes').notNull().default(0),
    location_id: uuid('location_id'), // Default location (nullable)
    color: varchar('color', { length: 7 }), // hex color
    required_skill_id: uuid('required_skill_id'), // nullable
    is_active: boolean('is_active').notNull().default(true), // Soft delete
    created_by: text('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('shift_templates_org_idx').on(table.organization_id),
    is_active_idx: index('shift_templates_is_active_idx').on(table.is_active),
    location_idx: index('shift_templates_location_idx').on(table.location_id),
  })
);

// ============================================================================
// SHIFTS TABLE
// ============================================================================
export const shifts = pgTable(
  'shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    user_id: text('user_id'), // nullable - shift can be unassigned
    location_id: uuid('location_id').notNull(),
    template_id: uuid('template_id'), // Reference to shift_templates (nullable)
    start_time: timestamp('start_time', { withTimezone: true }).notNull(),
    end_time: timestamp('end_time', { withTimezone: true }).notNull(),
    break_minutes: integer('break_minutes').default(0),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, published, completed, cancelled
    is_published: boolean('is_published').notNull().default(false), // Draft/publish workflow
    notes: text('notes'),
    color: varchar('color', { length: 7 }), // hex color
    required_skill_id: uuid('required_skill_id'), // nullable
    created_by: text('created_by').notNull(),
    published_at: timestamp('published_at', { withTimezone: true }),
    acknowledged_at: timestamp('acknowledged_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('shifts_org_idx').on(table.organization_id),
    user_idx: index('shifts_user_idx').on(table.user_id),
    location_idx: index('shifts_location_idx').on(table.location_id),
    status_idx: index('shifts_status_idx').on(table.status),
    template_idx: index('shifts_template_idx').on(table.template_id),
    published_idx: index('shifts_published_idx').on(table.is_published, table.organization_id, table.user_id),
  })
);

// ============================================================================
// SWAP_REQUESTS TABLE
// ============================================================================
export const swap_requests = pgTable(
  'swap_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    requester_id: text('requester_id').notNull(),
    offered_shift_id: uuid('offered_shift_id').notNull(),
    recipient_id: text('recipient_id'), // nullable - can be open request
    desired_shift_id: uuid('desired_shift_id'), // nullable - can be open request
    status: varchar('status', { length: 30 }).notNull().default('pending_peer'), // pending_peer, pending_manager, approved, rejected, completed
    manager_id: text('manager_id'), // nullable
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    reason: text('reason'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('swap_requests_org_idx').on(table.organization_id),
    requester_idx: index('swap_requests_requester_idx').on(table.requester_id),
    status_idx: index('swap_requests_status_idx').on(table.status),
  })
);

// ==========================================================================
// NOTIFICATIONS TABLE
// ==========================================================================
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    user_id: text('user_id').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    link: text('link'),
    read: boolean('read').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('notifications_org_idx').on(table.organization_id),
    user_idx: index('notifications_user_idx').on(table.user_id),
    read_idx: index('notifications_read_idx').on(table.read),
  })
);

// ============================================================================
// TIME_ENTRIES TABLE
// ============================================================================
export const time_entries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    user_id: text('user_id').notNull(),
    linked_shift_id: uuid('linked_shift_id'), // nullable
    entry_date: timestamp('entry_date', { withTimezone: true }).notNull(),
    clock_in: timestamp('clock_in', { withTimezone: true }).notNull(),
    clock_in_location: jsonb('clock_in_location'), // { lat, lng, accuracy }
    clock_in_method: varchar('clock_in_method', { length: 20 })
      .notNull()
      .default('tap'), // tap, nfc, qr, pin
    clock_out: timestamp('clock_out', { withTimezone: true }),
    clock_out_location: jsonb('clock_out_location'), // { lat, lng, accuracy }
    clock_out_method: varchar('clock_out_method', { length: 20 }),
    break_minutes: integer('break_minutes').default(0),
    total_minutes: integer('total_minutes'), // calculated
    is_verified: boolean('is_verified').default(false),
    status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, disputed
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('time_entries_org_idx').on(table.organization_id),
    user_idx: index('time_entries_user_idx').on(table.user_id),
    entry_date_idx: index('time_entries_entry_date_idx').on(table.entry_date),
    status_idx: index('time_entries_status_idx').on(table.status),
  })
);

// ============================================================================
// BREAK_ENTRIES TABLE
// ============================================================================
export const break_entries = pgTable(
  'break_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    time_entry_id: uuid('time_entry_id').notNull(),
    break_start: timestamp('break_start', { withTimezone: true }).notNull(),
    break_end: timestamp('break_end', { withTimezone: true }),
    break_type: varchar('break_type', { length: 20 }).notNull().default('unpaid'), // paid, unpaid
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('break_entries_org_idx').on(table.organization_id),
    time_entry_idx: index('break_entries_time_entry_idx').on(table.time_entry_id),
  })
);

// ============================================================================
// CORRECTION_REQUESTS TABLE
// ============================================================================
export const correction_requests = pgTable(
  'correction_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    time_entry_id: uuid('time_entry_id').notNull(),
    requested_by: text('requested_by').notNull(),
    reviewed_by: text('reviewed_by'), // nullable
    original_data: jsonb('original_data').notNull(),
    requested_data: jsonb('requested_data').notNull(),
    reason: text('reason').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('correction_requests_org_idx').on(table.organization_id),
    time_entry_idx: index('correction_requests_time_entry_idx').on(table.time_entry_id),
    status_idx: index('correction_requests_status_idx').on(table.status),
  })
);

// ============================================================================
// MONTHLY_SUMMARIES TABLE
// ============================================================================
export const monthly_summaries = pgTable(
  'monthly_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    user_id: text('user_id').notNull(),
    year: smallint('year').notNull(),
    month: smallint('month').notNull(), // 1-12
    total_hours: numeric('total_hours', { precision: 8, scale: 2 }).notNull(),
    total_days: integer('total_days').notNull(),
    overtime_hours: numeric('overtime_hours', { precision: 8, scale: 2 }).notNull(),
    pdf_url: text('pdf_url'),
    generated_at: timestamp('generated_at', { withTimezone: true }),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    delivery_method: varchar('delivery_method', { length: 20 }), // email, download
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_user_year_month_unique: uniqueIndex('monthly_summaries_org_user_year_month_unique').on(
      table.organization_id,
      table.user_id,
      table.year,
      table.month
    ),
    org_idx: index('monthly_summaries_org_idx').on(table.organization_id),
    user_idx: index('monthly_summaries_user_idx').on(table.user_id),
  })
);

// ============================================================================
// AUDIT_LOG TABLE
// ============================================================================
export const audit_log = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    actor_id: text('actor_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(), // create, read, update, delete
    entity_type: varchar('entity_type', { length: 50 }).notNull(), // shift, timeEntry, etc.
    entity_id: uuid('entity_id'), // nullable
    old_data: jsonb('old_data'),
    new_data: jsonb('new_data'),
    ip_address: inet('ip_address'),
    user_agent: text('user_agent'),
    prev_hash: varchar('prev_hash', { length: 64 }), // SHA-256 of previous entry
    entry_hash: varchar('entry_hash', { length: 64 }).notNull(), // SHA-256 of this entry
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('audit_log_org_idx').on(table.organization_id),
    actor_idx: index('audit_log_actor_idx').on(table.actor_id),
    entity_idx: index('audit_log_entity_idx').on(table.entity_type, table.entity_id),
    created_at_idx: index('audit_log_created_at_idx').on(table.created_at),
  })
);

// ============================================================================
// ADMIN_AUDIT_LOG TABLE
// ============================================================================
export const admin_audit_log = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    admin_id: text('admin_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(), // create, read, update, delete, suspend, etc.
    target_type: varchar('target_type', { length: 50 }), // organization, user, etc.
    target_id: text('target_id'), // nullable
    details: jsonb('details'),
    ip_address: inet('ip_address'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    admin_idx: index('admin_audit_log_admin_idx').on(table.admin_id),
    action_idx: index('admin_audit_log_action_idx').on(table.action),
    created_at_idx: index('admin_audit_log_created_at_idx').on(table.created_at),
  })
);

// ============================================================================
// ERROR_LOGS TABLE (Platform-wide error logging)
// ============================================================================
export const error_logs = pgTable(
  'error_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    level: varchar('level', { length: 20 }).notNull(), // error, warning, info
    message: text('message').notNull(),
    source: varchar('source', { length: 50 }).notNull(), // api, web, system, queue, database
    stack: text('stack'), // Stack trace (optional)
    user_id: text('user_id'), // User who triggered the error (optional)
    organization_id: text('organization_id'), // Organization context (optional)
    request_id: varchar('request_id', { length: 100 }), // Request ID for tracing
    http_method: varchar('http_method', { length: 10 }), // GET, POST, etc.
    http_path: text('http_path'), // Request path
    http_status: integer('http_status'), // HTTP status code
    metadata: jsonb('metadata'), // Additional context (user agent, IP, etc.)
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    level_idx: index('error_logs_level_idx').on(table.level),
    source_idx: index('error_logs_source_idx').on(table.source),
    created_at_idx: index('error_logs_created_at_idx').on(table.created_at),
    org_idx: index('error_logs_org_idx').on(table.organization_id),
  })
);

// ============================================================================
// INSPECTOR_TOKENS TABLE
// ============================================================================
export const inspector_tokens = pgTable(
  'inspector_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull(),
    token_hash: varchar('token_hash', { length: 64 }).notNull(),
    issued_by: text('issued_by').notNull(),
    issued_to: varchar('issued_to', { length: 255 }), // nullable - can be issued to email
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    revoked_at: timestamp('revoked_at', { withTimezone: true }),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('inspector_tokens_org_idx').on(table.organization_id),
    token_idx: index('inspector_tokens_token_idx').on(table.token_hash),
  })
);

// ============================================================================
// SUBSCRIPTION_DETAILS TABLE
// ============================================================================
export const subscription_details = pgTable(
  'subscription_details',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id').notNull().unique(),
    tier: varchar('tier', { length: 20 }).notNull().default('starter'), // starter, professional, enterprise
    seat_count: integer('seat_count').default(0),
    subscription_status: varchar('subscription_status', { length: 20 }).notNull().default('active'), // active, past_due, cancelled, suspended
    stripe_customer_id: varchar('stripe_customer_id', { length: 255 }),
    stripe_subscription_id: varchar('stripe_subscription_id', { length: 255 }),
    gocardless_customer_id: varchar('gocardless_customer_id', { length: 255 }),
    gocardless_mandate_id: varchar('gocardless_mandate_id', { length: 255 }),
    gocardless_subscription_id: varchar('gocardless_subscription_id', { length: 255 }),
    trial_ends_at: timestamp('trial_ends_at', { withTimezone: true }),
    plan_id: uuid('plan_id').references(() => subscription_plans.id),
    plan_price_cents: integer('plan_price_cents'),
    plan_employee_limit: integer('plan_employee_limit'),
    grandfathered_plan_code: varchar('grandfathered_plan_code', { length: 20 }),
    current_employee_count: integer('current_employee_count').default(0),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('subscription_details_org_idx').on(table.organization_id),
  })
);

// ============================================================================
// SUBSCRIPTION_PLANS TABLE
// ============================================================================
export const subscription_plans = pgTable(
  'subscription_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 20 }).notNull().unique(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    price_cents: integer('price_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('EUR'),
    billing_period: varchar('billing_period', { length: 20 }).notNull().default('monthly'),
    employee_limit: integer('employee_limit'), // NULL = unlimited
    included_modules: jsonb('included_modules').notNull().default('{}'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    code_idx: index('subscription_plans_code_idx').on(table.code),
    active_idx: index('subscription_plans_active_idx').on(table.is_active),
  })
);

// ============================================================================
// ADMIN BROADCAST MESSAGES
// ============================================================================
export const admin_broadcast_messages = pgTable(
  'admin_broadcast_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    admin_id: text('admin_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    severity: varchar('severity', { length: 20 }).notNull().default('info'), // info, warning, urgent
    target_type: varchar('target_type', { length: 50 }).notNull(), // all, organization, user
    target_ids: text('target_ids').array(), // Array of user/org IDs if targeted
    expires_at: timestamp('expires_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    admin_idx: index('admin_broadcast_admin_idx').on(table.admin_id),
    target_idx: index('admin_broadcast_target_idx').on(table.target_type),
    created_idx: index('admin_broadcast_created_idx').on(table.created_at),
  })
);

// ============================================================================
// EMPLOYEE_PROFILES TABLE
// ============================================================================
/**
 * Employee Profiles
 * 
 * Stores employment data separately from auth for security.
 * Contains PII with encrypted fields for compliance.
 * 
 * Spanish law: Stores contract info, working hours, leave balance per Estatuto de los Trabajadores
 */
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

    // Personal Information (ENCRYPTED - stored as Base64 strings)
    dni_nie_encrypted: text('dni_nie_encrypted').notNull(),
    social_security_number_encrypted: text('social_security_number_encrypted').notNull(),
    date_of_birth: timestamp('date_of_birth', { withTimezone: true }).notNull(),
    nationality: varchar('nationality', { length: 3 }), // ISO 3166-1 alpha-3
    tax_id_encrypted: text('tax_id_encrypted'),
    phone_number_encrypted: text('phone_number_encrypted'),
    address_encrypted: text('address_encrypted'), // JSONB stored as encrypted text
    emergency_contact_encrypted: text('emergency_contact_encrypted'), // JSONB stored as encrypted text

    // Employment Information
    employee_number: varchar('employee_number', { length: 50 }),
    job_title: varchar('job_title', { length: 100 }).notNull(),
    department: varchar('department', { length: 100 }),
    employment_type: varchar('employment_type', { length: 50 }).notNull(), // indefinido, temporal, practicas, formacion
    contract_start_date: timestamp('contract_start_date', { withTimezone: true }).notNull(),
    contract_end_date: timestamp('contract_end_date', { withTimezone: true }),
    base_salary_cents: integer('base_salary_cents'),
    working_hours_per_week: numeric('working_hours_per_week', { precision: 4, scale: 2 }).notNull(),
    work_location_id: uuid('work_location_id').references(() => locations.id, { onDelete: 'set null' }),

    // Leave Balance
    vacation_days_accrued: numeric('vacation_days_accrued', { precision: 4, scale: 1 }).default('0'),
    vacation_days_used: numeric('vacation_days_used', { precision: 4, scale: 1 }).default('0'),
    sick_days_used: integer('sick_days_used').default(0),

    // Compliance
    health_safety_training_date: timestamp('health_safety_training_date', { withTimezone: true }),
    work_permit_number_encrypted: text('work_permit_number_encrypted'),
    work_permit_expiry: timestamp('work_permit_expiry', { withTimezone: true }),

    // GDPR
    gdpr_consent_date: timestamp('gdpr_consent_date', { withTimezone: true }),
    data_processing_consent: boolean('data_processing_consent').default(false),

    // Metadata
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    user_org_unique: uniqueIndex('employee_profiles_user_org_unique').on(
      table.user_id,
      table.organization_id
    ),
    org_idx: index('employee_profiles_org_idx').on(table.organization_id),
    dni_idx: index('employee_profiles_dni_idx').on(table.dni_nie_encrypted),
  })
);

// ============================================================================
// LEAVE_REQUESTS TABLE
// ============================================================================
/**
 * Leave Requests
 * 
 * Tracks vacation, sick leave, personal days, and unpaid leave.
 * Supports half-days and manager approval workflow.
 * 
 * Spanish law: Vacation days per Estatuto Art. 38 (30 calendar days = 22 working days)
 */
export const leave_requests = pgTable(
  'leave_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organization_id: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),

    // Leave Details
    leave_type: varchar('leave_type', { length: 50 }).notNull(), // vacation, sick, personal, unpaid
    start_date: timestamp('start_date', { withTimezone: true }).notNull(),
    end_date: timestamp('end_date', { withTimezone: true }).notNull(),
    days_count: numeric('days_count', { precision: 3, scale: 1 }).notNull(), // 5.0, 2.5 (half days)

    // Request Info
    reason: text('reason'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected, cancelled
    requested_at: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Approval
    approved_by: text('approved_by').references(() => user.id, { onDelete: 'set null' }),
    approved_at: timestamp('approved_at', { withTimezone: true }),
    rejection_reason: text('rejection_reason'),

    // Sick Leave Specific
    doctors_note_url: text('doctors_note_url'),
    doctors_note_verified: boolean('doctors_note_verified').default(false),

    // Metadata
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    user_idx: index('leave_requests_user_idx').on(table.user_id),
    org_idx: index('leave_requests_org_idx').on(table.organization_id),
    dates_idx: index('leave_requests_dates_idx').on(table.start_date, table.end_date),
    status_idx: index('leave_requests_status_idx').on(table.status),
  })
);

// ============================================================================
// GENERATED_REPORTS TABLE
// ============================================================================
/**
 * Generated Reports
 * 
 * Audit trail for all generated reports with SHA-256 integrity verification.
 * Links to inspector tokens for ITSS access control.
 */
export const generated_reports = pgTable(
  'generated_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),

    // Report Details
    report_type: varchar('report_type', { length: 50 }).notNull(), // monthly_timesheet, compliance, variance, inspector
    report_name: varchar('report_name', { length: 255 }).notNull(),
    period_start: timestamp('period_start', { withTimezone: true }),
    period_end: timestamp('period_end', { withTimezone: true }),

    // Generation Info
    generated_by: text('generated_by')
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    generated_at: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // File Info
    file_path: text('file_path').notNull(),
    file_size_bytes: integer('file_size_bytes'),
    file_hash: varchar('file_hash', { length: 64 }).notNull(), // SHA-256

    // Access Control
    access_level: varchar('access_level', { length: 20 })
      .notNull()
      .default('internal'), // internal, inspector, public
    inspector_token_id: uuid('inspector_token_id').references(() => inspector_tokens.id, { onDelete: 'set null' }),
    expires_at: timestamp('expires_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata'), // Additional data (employee count, hours, etc.)
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('generated_reports_org_idx').on(table.organization_id),
    type_idx: index('generated_reports_type_idx').on(table.report_type),
    period_idx: index('generated_reports_period_idx').on(table.period_start, table.period_end),
  })
);

// ============================================================================
// COMPLIANCE_CHECKS TABLE
// ============================================================================
/**
 * Compliance Checks
 * 
 * Logs all automated compliance checks against Spanish labor law.
 * Tracks violations and resolutions.
 * 
 * Spanish law references: Estatuto de los Trabajadores Art. 34 (working time limits)
 */
export const compliance_checks = pgTable(
  'compliance_checks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    user_id: text('user_id').references(() => user.id, { onDelete: 'cascade' }),

    // Check Details
    check_type: varchar('check_type', { length: 50 }).notNull(), // daily_limit, weekly_limit, rest_period, break_required
    check_result: varchar('check_result', { length: 20 }).notNull(), // pass, warning, violation
    severity: varchar('severity', { length: 20 }), // low, medium, high, critical

    // Context
    time_entry_id: uuid('time_entry_id').references(() => time_entries.id, { onDelete: 'set null' }),
    shift_id: uuid('shift_id').references(() => shifts.id, { onDelete: 'set null' }),
    related_data: jsonb('related_data'),

    // Violation Details
    rule_reference: varchar('rule_reference', { length: 255 }), // "Estatuto Art. 34.3"
    message: text('message').notNull(),
    recommended_action: text('recommended_action'),

    // Resolution
    resolved: boolean('resolved').default(false),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    resolved_by: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
    resolution_notes: text('resolution_notes'),

    // Metadata
    checked_at: timestamp('checked_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('compliance_checks_org_idx').on(table.organization_id),
    user_idx: index('compliance_checks_user_idx').on(table.user_id),
    result_idx: index('compliance_checks_result_idx').on(table.check_result),
    unresolved_idx: index('compliance_checks_unresolved_idx').on(table.resolved, table.organization_id),
  })
);

// ============================================================================
// NOTIFICATION_PREFERENCES TABLE
// ============================================================================
/**
 * Notification Preferences
 * 
 * User-specific notification settings including Do Not Disturb (DND).
 * 
 * Spanish law: Right to Disconnect (Ley Orgánica 3/2018) - DND during off-hours
 */
export const notification_preferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' })
      .unique(),

    // Do Not Disturb
    dnd_enabled: boolean('dnd_enabled').default(false),
    dnd_start_time: varchar('dnd_start_time', { length: 5 }), // "22:00"
    dnd_end_time: varchar('dnd_end_time', { length: 5 }), // "08:00"
    dnd_days: text('dnd_days').array(), // ['saturday', 'sunday']
    dnd_urgent_override: boolean('dnd_urgent_override').default(true),

    // Metadata
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// ============================================================================
// ORGANIZATION_SETTINGS TABLE
// ============================================================================
/**
 * Organization Settings
 * 
 * Per-organization compliance policies and defaults.
 * 
 * Spanish law defaults:
 * - Max 9 hours/day (Estatuto Art. 34.3)
 * - Max 40 hours/week (Estatuto Art. 34.1)
 * - Min 12 hours rest between shifts (Estatuto Art. 34.3)
 */
export const organization_settings = pgTable(
  'organization_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' })
      .unique(),

    // Compliance Policies (Spanish Labor Law)
    max_daily_hours: numeric('max_daily_hours', { precision: 3, scale: 1 }).notNull().default('9.0'),
    max_weekly_hours: numeric('max_weekly_hours', { precision: 4, scale: 1 }).notNull().default('40.0'),
    min_rest_hours: numeric('min_rest_hours', { precision: 3, scale: 1 }).notNull().default('12.0'),
    break_required_after_hours: numeric('break_required_after_hours', { precision: 3, scale: 1 }).notNull().default('6.0'),
    min_break_minutes: integer('min_break_minutes').notNull().default(15),

    // Clock In/Out Settings
    clock_in_tolerance_minutes: integer('clock_in_tolerance_minutes').notNull().default(5),
    clock_out_tolerance_minutes: integer('clock_out_tolerance_minutes').notNull().default(5),
    require_manager_approval_corrections: boolean('require_manager_approval_corrections').default(true),

    // Geofencing
    geofence_enabled: boolean('geofence_enabled').default(true),
    geofence_radius_meters: integer('geofence_radius_meters').default(100),
    strict_geofence_enforcement: boolean('strict_geofence_enforcement').default(false),

    // Notification Defaults
    notify_shift_published: boolean('notify_shift_published').default(true),
    notify_swap_request: boolean('notify_swap_request').default(true),
    notify_compliance_violation: boolean('notify_compliance_violation').default(true),
    notification_advance_hours: integer('notification_advance_hours').default(24), // Notify 24h before shift

    // Extensible Settings
    metadata: jsonb('metadata'), // Additional custom settings

    // Metadata
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);
