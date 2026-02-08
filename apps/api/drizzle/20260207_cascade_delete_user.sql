-- Migration: Add CASCADE DELETE to user foreign keys
-- Date: 2026-02-07
-- Purpose: Allow user deletion without constraint violations

-- Drop existing foreign key constraints
ALTER TABLE session DROP CONSTRAINT IF EXISTS session_userId_user_id_fk;
ALTER TABLE account DROP CONSTRAINT IF EXISTS account_userId_user_id_fk;
ALTER TABLE member DROP CONSTRAINT IF EXISTS member_userId_user_id_fk;
ALTER TABLE invitation DROP CONSTRAINT IF EXISTS invitation_inviterId_user_id_fk;

-- Recreate with CASCADE DELETE
ALTER TABLE session
  ADD CONSTRAINT session_userId_user_id_fk
  FOREIGN KEY (userId) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE account
  ADD CONSTRAINT account_userId_user_id_fk
  FOREIGN KEY (userId) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE member
  ADD CONSTRAINT member_userId_user_id_fk
  FOREIGN KEY (userId) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE invitation
  ADD CONSTRAINT invitation_inviterId_user_id_fk
  FOREIGN KEY (inviterId) REFERENCES "user"(id) ON DELETE CASCADE;
