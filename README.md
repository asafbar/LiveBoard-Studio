# LiveBoard-Studio
Visual digital signage editor with realtime display management

## Media storage

Image bytes are stored as files. PostgreSQL keeps metadata only, in `media_assets`. The default directory is `server/storage/media`, which Git ignores. Set `MEDIA_DIR` in `server/.env` to move it. The directory must stay outside `client/public`.

`compose.yaml` is unchanged. When the API is containerized, add a volume that is separate from the PostgreSQL data volume:

- Volume name: `liveboard_studio_media`
- Container path: `/app/storage/media`
- Environment: `MEDIA_DIR=/app/storage/media`

The existing Tech Summit images in `client/public/media/tech-summit/` stay static assets.

`GET /api/media`, `GET /api/media/:id`, and `GET /api/media/:id/file` stay public. `POST /api/media` accepts one JPEG, PNG, or WebP image from an administrator session and requires `X-LiveBoard-Request: 1`. The server decodes the upload, rejects animated or oversized images, re-encodes it in the same format, and stores only those processed bytes. Deletion is not implemented. A crash after the file is written and before the metadata insert can leave an unreferenced file, because the filesystem write is not part of the database transaction. A failed insert removes the file it just wrote.

## Administrator account

There is one administrator. Create it once from `server/` with `ADMIN_USERNAME` and `ADMIN_PASSWORD` set in the environment, then run `npm run admin:bootstrap`. The command stores a scrypt hash and refuses to run again. Unset `ADMIN_PASSWORD` afterward. Do not commit the password.

Login uses `POST /api/auth/login`. The session is an HttpOnly `liveboard.sid` cookie. PostgreSQL stores only the SHA-256 of the token, so a normal API restart keeps the session until it expires or the administrator signs out. `COOKIE_SECURE` defaults to true when `NODE_ENV=production` and should stay false for local HTTP. Keep the admin UI and API on the same site so `SameSite=Lax` applies.

State-changing requests must send `X-LiveBoard-Request: 1`. A browser `Origin` that is not `CLIENT_URL` is rejected. `/boards`, `/displays`, `/media`, and `/studio/:boardId` require the session. `/media` is the administrator media library. `/login` collects the username and password and keeps the session in the HttpOnly cookie. `/display/:boardId` and `/screens/:displayId` stay public.

`GET /api/boards/:id/published` is public and returns the published snapshot, or `published: null` when the board exists but has not been published. It does not return the draft. `GET /api/displays/:id` is public so a screen can resolve its assignment. It returns the display id, name, and assigned board id.

Any client that knows a display UUID can register as that screen and appear online. That presence check is not device authentication, and it does not allow board or display edits. Device pairing is not implemented.

Upload rules enforced by `POST /api/media`:

- Allow only JPEG, PNG, and WebP after a full decode, then store a re-encoded image of that same format.
- Reject files larger than 10 MB, including the processed output.
- Do not trust the browser-supplied type or filename. The filename is display metadata only. Multipart header bytes are read as Latin-1, while browsers send UTF-8 filenames. The server restores that UTF-8 when the bytes are valid, strips control characters, and stores at most 255 characters. A name that still fails the filename constraint is stored as `image.jpg`, `image.png`, or `image.webp`.
- Asset references should use the asset id. `fileUrl` is `/api/media/:id/file` and changes only if the id changes. The display filename and `storage_key` are not stable references, and `storage_key` must stay out of board JSON. An Image widget can store that relative `fileUrl` in `settings.src`. Studio, Preview, and Display resolve only that media path against the API base URL when rendering. External URLs and static paths such as `/media/tech-summit/` stay unchanged, and the saved board does not contain a host or port. Before Replace or Delete exists, decide how draft and published snapshots that contain an asset id or file URL are updated or blocked. Remove the stored file only together with its row. Replacing bytes under the same id keeps existing file URLs valid. Creating a new id requires updating every snapshot that stored the old id or URL.
- Generate a random storage key on the server. Never use a client path.
- Reject path traversal, symlinks that leave the storage root, and non-image content.
- A storage quota is not enforced yet.
- Treat stored metadata as a label, not as proof that the bytes are safe.
