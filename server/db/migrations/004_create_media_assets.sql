-- Media bytes stay on the filesystem. This table stores metadata only.

CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_filename TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT media_assets_storage_key_key UNIQUE (storage_key),
    CONSTRAINT media_assets_original_filename_safe CHECK (
        char_length(btrim(original_filename)) > 0
        AND char_length(original_filename) <= 255
        AND original_filename !~ '[[:cntrl:]]'
        AND strpos(original_filename, '/') = 0
        AND strpos(original_filename, E'\\') = 0
    ),
    CONSTRAINT media_assets_storage_key_format CHECK (
        storage_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    ),
    CONSTRAINT media_assets_mime_type_allowed CHECK (
        mime_type IN ('image/jpeg', 'image/png', 'image/webp')
    ),
    CONSTRAINT media_assets_size_bytes_range CHECK (
        size_bytes > 0
        AND size_bytes <= 10485760
    )
);

CREATE INDEX media_assets_created_at_idx
    ON media_assets (created_at DESC, id ASC);
