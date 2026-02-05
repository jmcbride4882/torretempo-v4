CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" text,
	"details" jsonb,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"prev_hash" varchar(64),
	"entry_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"type" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "break_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"time_entry_id" uuid NOT NULL,
	"break_start" timestamp with time zone NOT NULL,
	"break_end" timestamp with time zone,
	"break_type" varchar(20) DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"time_entry_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"original_data" jsonb NOT NULL,
	"requested_data" jsonb NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspector_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"issued_by" uuid NOT NULL,
	"issued_to" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"lat" numeric(10, 8),
	"lng" numeric(11, 8),
	"geofence_radius" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_skills" (
	"member_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "member_skills_member_id_skill_id_pk" PRIMARY KEY("member_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "monthly_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"total_hours" numeric(8, 2) NOT NULL,
	"total_days" integer NOT NULL,
	"overtime_hours" numeric(8, 2) NOT NULL,
	"pdf_url" text,
	"generated_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"delivery_method" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"location_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"break_minutes" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"color" varchar(7),
	"required_skill_id" uuid,
	"created_by" uuid NOT NULL,
	"published_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"tier" varchar(20) DEFAULT 'starter' NOT NULL,
	"seat_count" integer DEFAULT 0,
	"stripe_customer_id" varchar(255),
	"gocardless_customer_id" varchar(255),
	"gocardless_mandate_id" varchar(255),
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_details_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "swap_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"offered_shift_id" uuid NOT NULL,
	"recipient_id" uuid,
	"desired_shift_id" uuid,
	"status" varchar(30) DEFAULT 'pending_peer' NOT NULL,
	"manager_id" uuid,
	"resolved_at" timestamp with time zone,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_shift_id" uuid,
	"entry_date" timestamp with time zone NOT NULL,
	"clock_in" timestamp with time zone NOT NULL,
	"clock_in_location" jsonb,
	"clock_in_method" varchar(20) DEFAULT 'tap' NOT NULL,
	"clock_out" timestamp with time zone,
	"clock_out_location" jsonb,
	"clock_out_method" varchar(20),
	"break_minutes" integer DEFAULT 0,
	"total_minutes" integer,
	"is_verified" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_idx" ON "admin_audit_log" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_org_idx" ON "audit_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "availability_org_idx" ON "availability" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "availability_user_idx" ON "availability" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "break_entries_org_idx" ON "break_entries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "break_entries_time_entry_idx" ON "break_entries" USING btree ("time_entry_id");--> statement-breakpoint
CREATE INDEX "correction_requests_org_idx" ON "correction_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "correction_requests_time_entry_idx" ON "correction_requests" USING btree ("time_entry_id");--> statement-breakpoint
CREATE INDEX "correction_requests_status_idx" ON "correction_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inspector_tokens_org_idx" ON "inspector_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inspector_tokens_token_idx" ON "inspector_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "locations_org_idx" ON "locations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_skills_skill_idx" ON "member_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_summaries_org_user_year_month_unique" ON "monthly_summaries" USING btree ("organization_id","user_id","year","month");--> statement-breakpoint
CREATE INDEX "monthly_summaries_org_idx" ON "monthly_summaries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "monthly_summaries_user_idx" ON "monthly_summaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shifts_org_idx" ON "shifts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "shifts_user_idx" ON "shifts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shifts_location_idx" ON "shifts" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "shifts_status_idx" ON "shifts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "skills_org_idx" ON "skills" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscription_details_org_idx" ON "subscription_details" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "swap_requests_org_idx" ON "swap_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "swap_requests_requester_idx" ON "swap_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "swap_requests_status_idx" ON "swap_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "time_entries_org_idx" ON "time_entries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_idx" ON "time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entries_entry_date_idx" ON "time_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "time_entries_status_idx" ON "time_entries" USING btree ("status");