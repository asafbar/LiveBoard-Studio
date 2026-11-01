-- One administrator account and its server-side sessions.
-- Passwords and raw session tokens are never stored.

CREATE TABLE admin_account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    singleton BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_account_username_key UNIQUE (username),
    CONSTRAINT admin_account_singleton_key UNIQUE (singleton),
    CONSTRAINT admin_account_singleton_true CHECK (singleton),
    CONSTRAINT admin_account_username_safe CHECK (
        char_length(username) BETWEEN 1 AND 64
        AND username = btrim(username)
        AND username !~ '[[:cntrl:]]'
    ),
    CONSTRAINT admin_account_password_hash_format CHECK (
        password_hash ~ '^scrypt\$16384\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$'
    )
);

CREATE TABLE admin_sessions (
    token_hash TEXT PRIMARY KEY,
    account_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT admin_sessions_account_id_fkey
        FOREIGN KEY (account_id)
        REFERENCES admin_account (id)
        ON DELETE CASCADE,
    CONSTRAINT admin_sessions_token_hash_format CHECK (
        token_hash ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT admin_sessions_expiry_after_create CHECK (
        expires_at > created_at
    )
);

CREATE INDEX admin_sessions_account_id_idx ON admin_sessions (account_id);
CREATE INDEX admin_sessions_expires_at_idx ON admin_sessions (expires_at);
