-- Board names are stored already trimmed by the API.
-- Uniqueness uses that exact text and remains case-sensitive.

DO $$
DECLARE
    duplicate_report text;
BEGIN
    SELECT string_agg(
        format('"%s" (%s)', name, ids),
        '; ' ORDER BY name
    )
    INTO duplicate_report
    FROM (
        SELECT name, string_agg(id::text, ', ' ORDER BY id) AS ids
        FROM boards
        GROUP BY name
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_report IS NOT NULL THEN
        RAISE EXCEPTION
            'Duplicate board names must be resolved before uniqueness can be enforced: %',
            duplicate_report;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'boards_name_key'
          AND conrelid = 'boards'::regclass
    ) THEN
        ALTER TABLE boards
            ADD CONSTRAINT boards_name_key UNIQUE (name);
    END IF;
END $$;
