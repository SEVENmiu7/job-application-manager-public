BEGIN;

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(64) NOT NULL,
  application_id uuid,
  title varchar(255) NOT NULL,
  notes text,
  due_at timestamp,
  reminder_at timestamp,
  is_important boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  completed_at timestamp,
  reminded_at timestamp,
  reminder_claimed_at timestamp,
  reminder_attempts integer NOT NULL DEFAULT 0,
  last_reminder_error text,
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_at timestamp(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  ),
  _updated_at timestamp(3) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by user_profile DEFAULT (
    CASE
      WHEN current_setting('app.user_id', TRUE) = '' THEN NULL
      ELSE concat('(', current_setting('app.user_id', TRUE), ')')::user_profile
    END
  )
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_modify_all_policy ON todos;
DROP POLICY IF EXISTS public_read_policy ON todos;
DROP POLICY IF EXISTS owner_modify_policy ON todos;
DROP POLICY IF EXISTS service_role_bypass_policy ON todos;
DROP POLICY IF EXISTS authenticated_modify_own_policy ON todos;
DROP POLICY IF EXISTS authenticated_read_own_policy ON todos;
DROP POLICY IF EXISTS anon_denied_policy ON todos;

CREATE POLICY service_role_bypass_policy ON todos
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY authenticated_modify_own_policy ON todos
  AS PERMISSIVE FOR ALL TO authenticated
  USING (user_id = current_setting('app.user_id'::text, true))
  WITH CHECK (user_id = current_setting('app.user_id'::text, true));

CREATE POLICY authenticated_read_own_policy ON todos
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (user_id = current_setting('app.user_id'::text, true));

CREATE POLICY anon_denied_policy ON todos
  AS PERMISSIVE FOR SELECT TO anon
  USING (false);

CREATE INDEX IF NOT EXISTS idx_todos_user_id
  ON todos (user_id);

CREATE INDEX IF NOT EXISTS idx_todos_user_completed_due
  ON todos (user_id, completed_at, due_at);

CREATE INDEX IF NOT EXISTS idx_todos_pending_reminders
  ON todos (reminder_at)
  WHERE completed_at IS NULL AND reminded_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_todos_application'
  ) THEN
    ALTER TABLE todos
      ADD CONSTRAINT fk_todos_application
      FOREIGN KEY (application_id)
      REFERENCES applications (id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
