BEGIN;

CREATE TABLE IF NOT EXISTS client_ticket_counter (
  client_id uuid PRIMARY KEY REFERENCES client(id) ON DELETE CASCADE,
  last_number integer NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ticket' AND column_name = 'client_ticket_number'
  ) THEN
    ALTER TABLE ticket ADD COLUMN client_ticket_number text;
  END IF;
END$$;

WITH numbered AS (
  SELECT
    t.id,
    c.id AS client_id,
    COALESCE(NULLIF(UPPER(REGEXP_REPLACE(c.name, '[^A-Z0-9]', '', 'g')), ''), 'XXX') AS prefix_base,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY t.created_at, t.id) AS rn
  FROM ticket t
  JOIN project p ON p.id = t.project_id
  JOIN client c ON c.id = p.client_id
)
UPDATE ticket AS t
SET client_ticket_number = CONCAT(
      LEFT(numbered.prefix_base || 'XXX', 3),
      LPAD(numbered.rn::text, 4, '0')
    )
FROM numbered
WHERE t.id = numbered.id
  AND (t.client_ticket_number IS NULL OR t.client_ticket_number = '');

INSERT INTO client_ticket_counter (client_id, last_number)
SELECT client_id, MAX(rn)
FROM (
  SELECT
    c.id AS client_id,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY t.created_at, t.id) AS rn
  FROM ticket t
  JOIN project p ON p.id = t.project_id
  JOIN client c ON c.id = p.client_id
) as counts
GROUP BY client_id
ON CONFLICT (client_id) DO UPDATE SET last_number = EXCLUDED.last_number;

ALTER TABLE ticket
  ALTER COLUMN client_ticket_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ticket_client_ticket_number ON ticket(client_ticket_number);

COMMIT;

