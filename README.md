# LiveBoard-Studio
Visual digital signage editor with realtime display management

## Media storage

Image bytes are stored as files. PostgreSQL keeps metadata only, in `media_assets`. The default directory is `server/storage/media`, which Git ignores. Set `MEDIA_DIR` in `server/.env` to move it. The directory must stay outside `client/public`.

`compose.yaml` is unchanged. When the API is containerized, add a volume that is separate from the PostgreSQL data volume:

- Volume name: `liveboard_studio_media`
- Container path: `/app/storage/media`
- Environment: `MEDIA_DIR=/app/storage/media`

The existing Tech Summit images in `client/public/media/tech-summit/` stay static assets.

`GET /api/media`, `GET /api/media/:id`, and `GET /api/media/:id/file` are read-only. Upload and deletion are not exposed, because administrative authentication does not exist yet.

Planned upload rules, to be enforced on the server when a protected upload endpoint is added:

- Allow only JPEG, PNG, and WebP.
- Reject files larger than 10 MB.
- Verify the bytes (file signature), not the browser-supplied type or filename.
- Generate a random storage key on the server. Never use a client path.
- Reject path traversal, symlinks that leave the storage root, and non-image content.
- Enforce a configurable storage quota with `SUM(size_bytes)` before writing.
- Treat stored metadata as a label, not as proof that the bytes are safe.
