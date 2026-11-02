# LiveBoard-Studio
Visual digital signage editor with realtime display management

## Deployment profiles

Local Docker installation uses `compose.fresh.yaml`. It creates new empty database and media volumes for a first-time setup. Web is published on `127.0.0.1` only. The API and PostgreSQL stay on the Compose network. The commands are in Fresh Docker installation below.

Existing-data deployment uses `compose.prod.yaml`. It also publishes web only on `127.0.0.1`, and it attaches the external database and media volumes named in that file. `compose.yaml` remains the development PostgreSQL file. Do not start `compose.prod.yaml` while the development database container is running. Do not run `docker compose down -v`. Do not point `compose.fresh.yaml` at the existing volumes.

Future public HTTPS deployment is not configured. It requires `COOKIE_SECURE=true`, the exact `https` origin in `CLIENT_URL`, and a deliberate decision to publish the web port beyond loopback. The current localhost HTTP configuration, including `COOKIE_SECURE=false`, is not intended for direct internet exposure.

## Media storage

Image bytes are stored as files. PostgreSQL keeps metadata only, in `media_assets`. The default directory is `server/storage/media`, which Git ignores. Set `MEDIA_DIR` in `server/.env` to move it. The directory must stay outside `client/public`.

Before copying media or attaching an existing database volume, back up that volume and keep the backup outside the Git repository. Do not store the backup path or database credentials in this file.

For an existing-data deployment, the API mounts the external media volume at `/app/storage/media` and sets `MEDIA_DIR=/app/storage/media`. To copy host files into that volume, use a one-off container. Mount the host media directory read-only and the named media volume read-write. Override the image entrypoint so PostgreSQL does not start, and do not mount the database volume. Copy a file only when that filename is absent. If it is present and the checksum differs, stop. Do not overwrite a destination file with different bytes. After a matching copy, change ownership to uid 1000, gid 1000, so the API user can read and write. Leave the host files in place.

After the existing database is the only PostgreSQL process attached to its volume, apply migrations once with `node src/db/migrate.js`. Do not run that command on API startup. Do not run `src/db/seed.js` or `src/db/bootstrapAdmin.js` against that database.

The Tech Summit images in `client/public/media/tech-summit/` stay static assets.

`GET /api/media` and `GET /api/media/:id` require an administrator session. `GET /api/media/:id/file` stays public so a published display can load an image whose file URL is already stored in the board. `POST /api/media` accepts one JPEG, PNG, or WebP image from an administrator session and requires `X-LiveBoard-Request: 1`. The server decodes the upload, rejects animated or oversized images, re-encodes it in the same format, and stores only those processed bytes. Deletion is not implemented. A crash after the file is written and before the metadata insert can leave an unreferenced file, because the filesystem write is not part of the database transaction. A failed insert removes the file it just wrote.

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

## Fresh Docker installation

Use this path for a new, empty installation. It does not read the development database, the production database, or the copied media volume. Keep using `compose.prod.yaml` only for the existing local data. Do not point `compose.fresh.yaml` at `liveboard-studio_liveboard_studio_db` or `liveboard-studio_liveboard_studio_media`.

The fresh project name is `liveboard-studio-fresh`. Its database volume is `liveboard-studio-fresh_db`, mounted at `/var/lib/postgresql`. Its media volume is `liveboard-studio-fresh_media`, mounted at `/app/storage/media`. Web is published on `127.0.0.1` only. The API and PostgreSQL stay on the `liveboard-studio-fresh` network. Images are tagged `liveboard-studio-web:fresh` and `liveboard-studio-api:fresh`, so building them does not replace the `:prod` tags.

Copy `compose.fresh.env.example` to `.env.fresh` and choose a new database password. `.env.fresh` is ignored by Git. Do not commit it, and do not put the administrator password in it. Every command below passes `--env-file .env.fresh` so Compose does not interpolate a different `.env` from the repository root. `CLIENT_URL` must be the exact origin opened in the browser, including the port. Use `http://127.0.0.1` rather than `http://localhost`. If port 8080 is already taken, change `WEB_PORT` and `CLIENT_URL` together. `COOKIE_SECURE=false` is only for this loopback HTTP setup. This localhost HTTP configuration is not intended for direct internet exposure. A later HTTPS site needs `COOKIE_SECURE=true`, the exact `https` origin, and a deliberate decision to publish the web port beyond loopback. This Compose file does not make that change.

PostgreSQL applies `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` only while `liveboard-studio-fresh_db` is empty. Changing them later does not rewrite an initialized cluster.

Build the images:

    docker compose --env-file .env.fresh -f compose.fresh.yaml build

Start only PostgreSQL and wait until `liveboard-studio-fresh-db-1` is healthy:

    docker compose --env-file .env.fresh -f compose.fresh.yaml up -d db

Apply migrations once. This creates the schema. It does not insert boards, displays, media, or an administrator:

    docker compose --env-file .env.fresh -f compose.fresh.yaml run --rm --no-deps --entrypoint node api src/db/migrate.js

Create the single administrator. The password must be 12 to 128 characters and must not contain a null character. The username must be 1 to 64 characters without control characters. The command stores a scrypt hash and refuses to run when an account already exists. There is no public registration route.

    printf 'Username: '
    read -r ADMIN_USERNAME
    printf 'Password: '
    read -rs ADMIN_PASSWORD
    printf '\n'
    export ADMIN_USERNAME ADMIN_PASSWORD
    docker compose --env-file .env.fresh -f compose.fresh.yaml run --rm --no-deps \
        -e ADMIN_USERNAME \
        -e ADMIN_PASSWORD \
        --entrypoint node api src/db/bootstrapAdmin.js
    unset ADMIN_PASSWORD

Start the web and API containers:

    docker compose --env-file .env.fresh -f compose.fresh.yaml up -d --no-build

Open `http://127.0.0.1:8080` when `WEB_PORT` is 8080, or the origin stored in `CLIENT_URL`. Sign in with the account just created. Studio routes require that session. `/display/:boardId` and `/screens/:displayId` stay public. State-changing requests still require `X-LiveBoard-Request: 1`, and the browser `Origin` must match `CLIENT_URL`.

The sample board is optional. Run it only after migrations and only with `compose.fresh.yaml`. It inserts the Tech Summit sample when that board id is absent, leaves an existing row unchanged, and does not publish the board. Its images are the static files built into the web image. It does not read or write the existing media volume.

    docker compose --env-file .env.fresh -f compose.fresh.yaml run --rm --no-deps --entrypoint node api src/db/seed.js

Stop the fresh stack with `stop`. The named volumes remain, and the next start does not need another migration or bootstrap:

    docker compose --env-file .env.fresh -f compose.fresh.yaml stop
    docker compose --env-file .env.fresh -f compose.fresh.yaml up -d --no-build

Update the application by building again and starting the same project. Compose may recreate the fresh containers, but the named volumes keep the database and uploaded files. Do not add `-v`.

    docker compose --env-file .env.fresh -f compose.fresh.yaml build
    docker compose --env-file .env.fresh -f compose.fresh.yaml up -d

`docker compose down` without `-v` removes the fresh containers and keeps the volumes. `docker compose down -v` deletes `liveboard-studio-fresh_db` and `liveboard-studio-fresh_media`. Do not use `-v` unless the fresh installation should be erased. Never run a removal command against `compose.prod.yaml` or `compose.yaml` from these steps.
