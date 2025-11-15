-- Migration: Replace "Resolved" status with "On Hold"
-- This updates existing databases to replace the "Resolved" status with "On Hold"

-- First, update any tickets that have the "Resolved" status to "On Hold"
-- We need to find the status IDs first
DO $$
DECLARE
  resolved_status_id uuid;
  on_hold_status_id uuid;
BEGIN
  -- Find the "Resolved" status
  SELECT id INTO resolved_status_id FROM status WHERE name = 'Resolved' AND active = true;

  -- Check if "On Hold" already exists
  SELECT id INTO on_hold_status_id FROM status WHERE name = 'On Hold' AND active = true;

  IF resolved_status_id IS NOT NULL THEN
    -- If "On Hold" doesn't exist, create it
    IF on_hold_status_id IS NULL THEN
      INSERT INTO status (name, is_closed, sequence)
      VALUES ('On Hold', false, 30)
      RETURNING id INTO on_hold_status_id;

      RAISE NOTICE 'Created "On Hold" status with ID: %', on_hold_status_id;
    ELSE
      RAISE NOTICE 'On Hold status already exists with ID: %', on_hold_status_id;
    END IF;

    -- Update all tickets that reference "Resolved" to use "On Hold"
    UPDATE ticket
    SET status_id = on_hold_status_id
    WHERE status_id = resolved_status_id;

    RAISE NOTICE 'Updated tickets from "Resolved" to "On Hold"';

    -- Update ticket_event records that reference the old status
    UPDATE ticket_event
    SET new_value = jsonb_set(
      new_value,
      '{statusId}',
      to_jsonb(on_hold_status_id::text)
    )
    WHERE event_type = 'STATUS_CHANGED'
      AND new_value->>'statusId' = resolved_status_id::text;

    UPDATE ticket_event
    SET old_value = jsonb_set(
      old_value,
      '{statusId}',
      to_jsonb(on_hold_status_id::text)
    )
    WHERE event_type = 'STATUS_CHANGED'
      AND old_value->>'statusId' = resolved_status_id::text;

    RAISE NOTICE 'Updated ticket_event records';

    -- Deactivate or delete the "Resolved" status
    -- We'll deactivate it rather than delete to maintain referential integrity
    UPDATE status
    SET active = false
    WHERE id = resolved_status_id;

    RAISE NOTICE 'Deactivated "Resolved" status';
  ELSE
    RAISE NOTICE 'No "Resolved" status found - migration may have already been run or schema is new';

    -- Ensure "On Hold" exists even if "Resolved" doesn't
    IF on_hold_status_id IS NULL THEN
      INSERT INTO status (name, is_closed, sequence)
      VALUES ('On Hold', false, 30)
      ON CONFLICT (name) DO UPDATE SET active = true;

      RAISE NOTICE 'Ensured "On Hold" status exists';
    END IF;
  END IF;
END $$;

