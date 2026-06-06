CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('follower', 'delegate', 'admin', 'leader');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM (
      'pending_review',
      'assigned_to_delegate',
      'scheduled_delegate',
      'scheduled_leader',
      'sla_expired',
      'resolved'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_visibility') THEN
    CREATE TYPE slot_visibility AS ENUM ('public_event', 'appointment');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  role user_role DEFAULT 'follower',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  delegate_tier_active BOOLEAN DEFAULT FALSE,
  sla_hours_threshold INT DEFAULT 24,
  min_character_count_business INT DEFAULT 150,
  min_character_count_outcome INT DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curated_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Curated availability',
  visibility slot_visibility NOT NULL DEFAULT 'appointment',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_capacity INT DEFAULT 1 CHECK (max_capacity > 0),
  current_occupancy INT DEFAULT 0 CHECK (current_occupancy >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (current_occupancy <= max_capacity)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_reference TEXT UNIQUE NOT NULL,
  guest_full_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  registered_follower_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  slot_id UUID REFERENCES curated_slots(id) ON DELETE SET NULL,
  assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('Crisis', 'Legal/Admin', 'Guidance', 'Counseling')),
  statement_of_business TEXT NOT NULL,
  desired_outcome TEXT NOT NULL,
  status appointment_status DEFAULT 'pending_review',
  preferred_windows TEXT[] NOT NULL,
  is_time_sensitive BOOLEAN DEFAULT FALSE,
  sla_expires_at TIMESTAMPTZ,
  reschedule_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delegate_assignment_state (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  last_delegate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_settings (id, delegate_tier_active, sla_hours_threshold, min_character_count_business, min_character_count_outcome)
VALUES (1, FALSE, 24, 150, 100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO delegate_assignment_state (id) VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'leader')
  );
$$;

CREATE OR REPLACE FUNCTION generate_tracking_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
BEGIN
  LOOP
    candidate := '#NX' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM appointments WHERE tracking_reference = candidate);
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION assign_next_agent(p_is_time_sensitive BOOLEAN DEFAULT FALSE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delegate_active BOOLEAN;
  selected_id UUID;
  previous_id UUID;
BEGIN
  SELECT delegate_tier_active INTO delegate_active FROM system_settings WHERE id = 1;

  IF NOT COALESCE(delegate_active, FALSE) THEN
    RETURN NULL;
  END IF;

  SELECT last_delegate_id INTO previous_id
  FROM delegate_assignment_state
  WHERE id = TRUE
  FOR UPDATE;

  WITH delegates AS (
    SELECT p.id,
      row_number() OVER (ORDER BY p.created_at, p.id) AS rn
    FROM profiles p
    WHERE p.role = 'delegate'
  ),
  previous AS (
    SELECT rn FROM delegates WHERE id = previous_id
  ),
  load AS (
    SELECT assigned_agent_id, count(*) AS open_count
    FROM appointments
    WHERE status IN ('assigned_to_delegate', 'scheduled_delegate')
    GROUP BY assigned_agent_id
  )
  SELECT d.id INTO selected_id
  FROM delegates d
  LEFT JOIN previous p ON TRUE
  LEFT JOIN load l ON l.assigned_agent_id = d.id
  ORDER BY COALESCE(l.open_count, 0), CASE WHEN d.rn > COALESCE(p.rn, 0) THEN 0 ELSE 1 END, d.rn
  LIMIT 1;

  UPDATE delegate_assignment_state
  SET last_delegate_id = selected_id,
      updated_at = now()
  WHERE id = TRUE;

  RETURN selected_id;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_delegate_toggle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delegate_tier_active = TRUE AND NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'delegate') THEN
    RAISE EXCEPTION 'Cannot activate delegate tier without at least one delegate';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_delegate_toggle ON system_settings;
CREATE TRIGGER trg_enforce_delegate_toggle
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION enforce_delegate_toggle();

CREATE OR REPLACE FUNCTION maintain_slot_occupancy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.slot_id IS NOT NULL THEN
    UPDATE curated_slots SET current_occupancy = current_occupancy + 1 WHERE id = NEW.slot_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.slot_id IS DISTINCT FROM OLD.slot_id THEN
    IF OLD.slot_id IS NOT NULL THEN
      UPDATE curated_slots SET current_occupancy = greatest(current_occupancy - 1, 0) WHERE id = OLD.slot_id;
    END IF;
    IF NEW.slot_id IS NOT NULL THEN
      UPDATE curated_slots SET current_occupancy = current_occupancy + 1 WHERE id = NEW.slot_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_maintain_slot_occupancy ON appointments;
CREATE TRIGGER trg_maintain_slot_occupancy
AFTER INSERT OR UPDATE OF slot_id ON appointments
FOR EACH ROW
EXECUTE FUNCTION maintain_slot_occupancy();

CREATE OR REPLACE FUNCTION reset_expired_delegate_slas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE appointments
  SET status = 'sla_expired',
      assigned_agent_id = NULL,
      sla_expires_at = NULL,
      reschedule_count = reschedule_count + 1
  WHERE status = 'assigned_to_delegate'
    AND sla_expires_at IS NOT NULL
    AND sla_expires_at < now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION queue_status_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO notification_outbox (appointment_id, channel, recipient, payload)
    VALUES (
      NEW.id,
      'sms',
      NEW.guest_phone,
      jsonb_build_object(
        'type', 'status_changed',
        'tracking_reference', NEW.tracking_reference,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_status_notification ON appointments;
CREATE TRIGGER trg_queue_status_notification
AFTER UPDATE OF status ON appointments
FOR EACH ROW
EXECUTE FUNCTION queue_status_notification();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read public events" ON curated_slots;
DROP POLICY IF EXISTS "Public can read active slots" ON curated_slots;
CREATE POLICY "Public can read active slots"
ON curated_slots FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage slots" ON curated_slots;
CREATE POLICY "Admins can manage slots"
ON curated_slots FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles"
ON profiles FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Authenticated users can read settings" ON system_settings;
CREATE POLICY "Authenticated users can read settings"
ON system_settings FOR SELECT
USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Admins can update settings" ON system_settings;
CREATE POLICY "Admins can update settings"
ON system_settings FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Followers can read linked appointments" ON appointments;
CREATE POLICY "Followers can read linked appointments"
ON appointments FOR SELECT
USING (registered_follower_id = auth.uid() OR assigned_agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Guests can submit appointments" ON appointments;
CREATE POLICY "Guests can submit appointments"
ON appointments FOR INSERT
WITH CHECK (
  char_length(statement_of_business) >= 150
  AND char_length(desired_outcome) >= 100
);

DROP POLICY IF EXISTS "Agents can update assigned appointments" ON appointments;
CREATE POLICY "Agents can update assigned appointments"
ON appointments FOR UPDATE
USING (assigned_agent_id = auth.uid() OR is_admin())
WITH CHECK (assigned_agent_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage notification outbox" ON notification_outbox;
CREATE POLICY "Admins can manage notification outbox"
ON notification_outbox FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_agent ON appointments(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(guest_phone);
CREATE INDEX IF NOT EXISTS idx_curated_slots_start ON curated_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

INSERT INTO curated_slots (title, visibility, start_time, end_time, max_capacity, current_occupancy, is_active)
SELECT 'Community Healing Gathering', 'public_event', now() + interval '4 days', now() + interval '4 days 2 hours', 600, 124, TRUE
WHERE NOT EXISTS (SELECT 1 FROM curated_slots WHERE title = 'Community Healing Gathering');

INSERT INTO curated_slots (title, visibility, start_time, end_time, max_capacity, current_occupancy, is_active)
SELECT 'Legal Aid Clinic', 'public_event', now() + interval '9 days', now() + interval '9 days 3 hours', 120, 43, TRUE
WHERE NOT EXISTS (SELECT 1 FROM curated_slots WHERE title = 'Legal Aid Clinic');

INSERT INTO curated_slots (title, visibility, start_time, end_time, max_capacity, current_occupancy, is_active)
SELECT 'Counseling Outreach Evening', 'public_event', now() + interval '15 days', now() + interval '15 days 2 hours', 250, 91, TRUE
WHERE NOT EXISTS (SELECT 1 FROM curated_slots WHERE title = 'Counseling Outreach Evening');

INSERT INTO curated_slots (title, visibility, start_time, end_time, max_capacity, current_occupancy, is_active)
SELECT 'Morning appointment block', 'appointment', date_trunc('day', now()) + interval '1 day 9 hours', date_trunc('day', now()) + interval '1 day 12 hours', 8, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM curated_slots WHERE title = 'Morning appointment block');

INSERT INTO curated_slots (title, visibility, start_time, end_time, max_capacity, current_occupancy, is_active)
SELECT 'Afternoon appointment block', 'appointment', date_trunc('day', now()) + interval '1 day 14 hours', date_trunc('day', now()) + interval '1 day 17 hours', 8, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM curated_slots WHERE title = 'Afternoon appointment block');
