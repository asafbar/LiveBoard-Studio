# LiveBoard-Studio
Visual digital signage editor with realtime display management

## Media storage

Image bytes are stored as files. PostgreSQL keeps metadata only, in `media_assets`. The default directory is `server/storage/media`, which Git ignores. Set `MEDIA_DIR` in `server/.env` to move it. The directory must stay outside `client/public`.

`compose.yaml` is unchanged. When the API is containerized, add a volume that is separate from the PostgreSQL data volume:

- Volume name: `liveboard_studio_media`
- Container path: `/app/storage/media`
- Environment: `MEDIA_DIR=/app/storage/media`

The existing Tech Summit images in `client/public/media/tech-summit/` stay static assets.

`GET /api/media`, `GET /api/media/:id`, and `GET /api/media/:id/file` are read-only. Upload and deletion are not implemented. When they are added, they must require an administrator session.

## Administrator account

There is one administrator. Create it once from `server/` with `ADMIN_USERNAME` and `ADMIN_PASSWORD` set in the environment, then run `npm run admin:bootstrap`. The command stores a scrypt hash and refuses to run again. Unset `ADMIN_PASSWORD` afterward. Do not commit the password.

Login uses `POST /api/auth/login`. The session is an HttpOnly `liveboard.sid` cookie. PostgreSQL stores only the SHA-256 of the token, so a normal API restart keeps the session until it expires or the administrator signs out. `COOKIE_SECURE` defaults to true when `NODE_ENV=production` and should stay false for local HTTP. Keep the admin UI and API on the same site so `SameSite=Lax` applies.

State-changing requests must send `X-LiveBoard-Request: 1`. A browser `Origin` that is not `CLIENT_URL` is rejected. `/boards`, `/displays`, and `/studio/:boardId` require the session. `/login` collects the username and password and keeps the session in the HttpOnly cookie. `/display/:boardId` and `/screens/:displayId` stay public.

`GET /api/boards/:id/published` is public and returns the published snapshot, or `published: null` when the board exists but has not been published. It does not return the draft. `GET /api/displays/:id` is public so a screen can resolve its assignment. It returns the display id, name, and assigned board id.

Any client that knows a display UUID can register as that screen and appear online. That presence check is not device authentication, and it does not allow board or display edits. Device pairing is not implemented.

Planned upload rules, to be enforced on the server when a protected upload endpoint is added:

- Allow only JPEG, PNG, and WebP.
- Reject files larger than 10 MB.
- Verify the bytes (file signature), not the browser-supplied type or filename.
- Generate a random storage key on the server. Never use a client path.
- Reject path traversal, symlinks that leave the storage root, and non-image content.
- Enforce a configurable storage quota with `SUM(size_bytes)` before writing.
- Treat stored metadata as a label, not as proof that the bytes are safe.
