-- Multi-organization support: each admin owns an isolated organization.
-- Leaders and delegates join via invite token; data is scoped by organization_id.

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE curated_slots ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Per-organization delegate round-robin state
CREATE TABLE IF NOT EXISTS organization_delegate_state (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  last_delegate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_org ON system_settings(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_curated_slots_org ON curated_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organization_id);

-- Backfill organizations for existing admin accounts
DO $$
DECLARE
  admin_rec RECORD;
  new_org_id UUID;
BEGIN
  FOR admin_rec IN
    SELECT id, full_name FROM profiles WHERE role = 'admin' AND organization_id IS NULL
  LOOP
    INSERT INTO organizations (name, created_by)
    VALUES (admin_rec.full_name || '''s Organization', admin_rec.id)
    RETURNING id INTO new_org_id;

    UPDATE profiles SET organization_id = new_org_id WHERE id = admin_rec.id;

    INSERT INTO system_settings (
      organization_id, delegate_tier_active, sla_hours_threshold,
      min_character_count_business, min_character_count_outcome
    ) VALUES (new_org_id, FALSE, 24, 150, 100);

    INSERT INTO organization_delegate_state (organization_id) VALUES (new_org_id);
  END LOOP;
END $$;

-- Remove demo seed slots from initial migration
DELETE FROM curated_slots WHERE title IN (
  'Community Healing Gathering',
  'Legal Aid Clinic',
  'Counseling Outreach Evening',
  'Morning appointment block',
  'Afternoon appointment block'
);

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION assign_next_agent(
  p_is_time_sensitive BOOLEAN DEFAULT FALSE,
  p_organization_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delegate_active BOOLEAN;
  selected_id UUID;
  previous_id UUID;
  org_id UUID;
BEGIN
  org_id := p_organization_id;
  IF org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT delegate_tier_active INTO delegate_active
  FROM system_settings
  WHERE organization_id = org_id
  LIMIT 1;

  IF NOT COALESCE(delegate_active, FALSE) THEN
    RETURN NULL;
  END IF;

  SELECT last_delegate_id INTO previous_id
  FROM organization_delegate_state
  WHERE organization_id = org_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO organization_delegate_state (organization_id) VALUES (org_id)
    ON CONFLICT (organization_id) DO NOTHING;
    previous_id := NULL;
  END IF;

  WITH delegates AS (
    SELECT p.id,
      row_number() OVER (ORDER BY p.created_at, p.id) AS rn
    FROM profiles p
    WHERE p.role = 'delegate'
      AND p.organization_id = org_id
  ),
  previous AS (
    SELECT rn FROM delegates WHERE id = previous_id
  ),
  load AS (
    SELECT a.assigned_agent_id, count(*) AS open_count
    FROM appointments a
    WHERE a.organization_id = org_id
      AND a.status IN ('assigned_to_delegate', 'scheduled_delegate')
    GROUP BY a.assigned_agent_id
  )
  SELECT d.id INTO selected_id
  FROM delegates d
  LEFT JOIN previous p ON TRUE
  LEFT JOIN load l ON l.assigned_agent_id = d.id
  ORDER BY COALESCE(l.open_count, 0), CASE WHEN d.rn > COALESCE(p.rn, 0) THEN 0 ELSE 1 END, d.rn
  LIMIT 1;

  INSERT INTO organization_delegate_state (organization_id, last_delegate_id, updated_at)
  VALUES (org_id, selected_id, now())
  ON CONFLICT (organization_id) DO UPDATE
  SET last_delegate_id = EXCLUDED.last_delegate_id,
      updated_at = now();

  RETURN selected_id;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_delegate_toggle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delegate_tier_active = TRUE AND NEW.organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE role = 'delegate' AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Cannot activate delegate tier without at least one delegate in this organization';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
