CREATE TABLE displays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    board_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT displays_name_not_blank CHECK (
        char_length(btrim(name)) > 0
        AND char_length(name) <= 200
    ),
    CONSTRAINT displays_board_id_fkey
        FOREIGN KEY (board_id)
        REFERENCES boards (id)
        ON DELETE SET NULL
);

CREATE INDEX displays_board_id_idx ON displays (board_id);
