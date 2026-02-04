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
// LOCATIONS TABLE
// ============================================================================
export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id').notNull(),
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
// SKILLS TABLE
// ============================================================================
export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    color: varchar('color', { length: 7 }), // hex color
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    org_idx: index('skills_org_idx').on(table.organization_id),
  })
);

// ============================================================================
// MEMBER_SKILLS JUNCTION TABLE
// ============================================================================
export const member_skills = pgTable(
  'member_skills',
  {
    member_id: uuid('member_id').notNull(),
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
    organization_id: uuid('organization_id').notNull(),
    user_id: uuid('user_id').notNull(),
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
// SHIFTS TABLE
// ============================================================================
export const shifts = pgTable(
  'shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id').notNull(),
    user_id: uuid('user_id'), // nullable - shift can be unassigned
    location_id: uuid('location_id').notNull(),
    start_time: timestamp('start_time', { withTimezone: true }).notNull(),
    end_time: timestamp('end_time', { withTimezone: true }).notNull(),
    break_minutes: integer('break_minutes').default(0),
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, published, completed, cancelled
    notes: text('notes'),
    color: varchar('color', { length: 7 }), // hex color
    required_skill_id: uuid('required_skill_id'), // nullable
    created_by: uuid('created_by').notNull(),
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
  })
);

// ============================================================================
// SWAP_REQUESTS TABLE
// ============================================================================
export const swap_requests = pgTable(
  'swap_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id').notNull(),
    requester_id: uuid('requester_id').notNull(),
    offered_shift_id: uuid('offered_shift_id').notNull(),
    recipient_id: uuid('recipient_id'), // nullable - can be open request
    desired_shift_id: uuid('desired_shift_id'), // nullable - can be open request
    status: varchar('status', { length: 30 }).notNull().default('pending_peer'), // pending_peer, pending_manager, approved, rejected, completed
    manager_id: uuid('manager_id'), // nullable
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

// ============================================================================
// TIME_ENTRIES TABLE
// ============================================================================
export const time_entries = pgTable(
  'time_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id').notNull(),
    user_id: uuid('user_id').notNull(),
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
    organization_id: uuid('organization_id').notNull(),
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
    organization_id: uuid('organization_id').notNull(),
    time_entry_id: uuid('time_entry_id').notNull(),
    requested_by: uuid('requested_by').notNull(),
    reviewed_by: uuid('reviewed_by'), // nullable
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
    organization_id: uuid('organization_id').notNull(),
    user_id: uuid('user_id').notNull(),
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
    organization_id: uuid('organization_id').notNull(),
    actor_id: uuid('actor_id').notNull(),
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
    admin_id: uuid('admin_id').notNull(),
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
// INSPECTOR_TOKENS TABLE
// ============================================================================
export const inspector_tokens = pgTable(
  'inspector_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organization_id: uuid('organization_id').notNull(),
    token_hash: varchar('token_hash', { length: 64 }).notNull(),
    issued_by: uuid('issued_by').notNull(),
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
    organization_id: uuid('organization_id').notNull().unique(),
    tier: varchar('tier', { length: 20 }).notNull().default('starter'), // starter, professional, enterprise
    seat_count: integer('seat_count').default(0),
    stripe_customer_id: varchar('stripe_customer_id', { length: 255 }),
    gocardless_customer_id: varchar('gocardless_customer_id', { length: 255 }),
    gocardless_mandate_id: varchar('gocardless_mandate_id', { length: 255 }),
    trial_ends_at: timestamp('trial_ends_at', { withTimezone: true }),
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
