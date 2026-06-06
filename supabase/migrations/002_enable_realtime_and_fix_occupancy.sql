-- Enable realtime on required tables
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE curated_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;

-- Drop the old trigger that increments occupancy on insert
DROP TRIGGER IF EXISTS trg_maintain_slot_occupancy ON appointments;
DROP FUNCTION IF EXISTS maintain_slot_occupancy();

-- Create new trigger that only increments occupancy when status changes to scheduled
CREATE OR REPLACE FUNCTION maintain_slot_occupancy_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only increment occupancy when status changes to scheduled (approved)
  IF TG_OP = 'UPDATE' 
    AND NEW.status IN ('scheduled_delegate', 'scheduled_leader')
    AND OLD.status NOT IN ('scheduled_delegate', 'scheduled_leader')
    AND NEW.slot_id IS NOT NULL
  THEN
    UPDATE curated_slots SET current_occupancy = current_occupancy + 1 WHERE id = NEW.slot_id;
  END IF;

  -- Decrement occupancy when status changes from scheduled to something else
  IF TG_OP = 'UPDATE'
    AND OLD.status IN ('scheduled_delegate', 'scheduled_leader')
    AND NEW.status NOT IN ('scheduled_delegate', 'scheduled_leader')
    AND OLD.slot_id IS NOT NULL
  THEN
    UPDATE curated_slots SET current_occupancy = greatest(current_occupancy - 1, 0) WHERE id = OLD.slot_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintain_slot_occupancy_on_approval
AFTER UPDATE OF status ON appointments
FOR EACH ROW
EXECUTE FUNCTION maintain_slot_occupancy_on_approval();
