const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("pg");

const TEST_DATABASE = "liveboard_media_delete_test";
const APPLICATION_DATABASE = "liveboard_studio";
const TEST_PASSWORD = "delete-check-password";

require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
    quiet: true
});

if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error("Database test credentials are unavailable.");
}

const applicationDatabase = process.env.DB_NAME || APPLICATION_DATABASE;

if (applicationDatabase === TEST_DATABASE) {
    throw new Error("Refusing to treat the disposable database as the application database.");
}

const mediaDir = fs.mkdtempSync(path.join(os.tmpdir(), "liveboard-media-delete-"));
const applicationMediaDir = path.resolve(__dirname, "../../storage/media");

if (path.resolve(mediaDir) === applicationMediaDir) {
    throw new Error("Refusing to use the application media directory.");
}

process.env.DB_NAME = TEST_DATABASE;
process.env.MEDIA_DIR = mediaDir;
process.env.CLIENT_URL = "http://localhost:5173";

const { pool, closeDatabase } = require("../config/db");
const { createInitialAccount } = require("./authService");
const { MEDIA_REFERENCE_MISSING } = require("../repositories/boardRepository");
const boardRepository = require("../repositories/boardRepository");
const mediaRepository = require("../repositories/mediaRepository");
const mediaService = require("./mediaService");
const {
    createStorageKey,
    writeNewFile
} = require("../storage/mediaStorage");
const app = require("../app");

let baseline = null;
let server = null;
let serverPort = 0;

test.before(async () => {
    baseline = await readApplicationSnapshot();
    await recreateTestDatabase();
    await applyMigrations();
    await createInitialAccount("delete-check", TEST_PASSWORD);
    server = http.createServer(app);
    await new Promise((resolve) => {
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    serverPort = typeof address === "object" && address !== null ? address.port : 0;
});

test.after(async () => {
    if (server !== null) {
        await new Promise((resolve) => {
            server.close(resolve);
        });
    }

    await closeDatabase();
    await dropTestDatabase();
    await fs.promises.rm(mediaDir, {
        recursive: true,
        force: true
    });

    const current = await readApplicationSnapshot();
    assert.deepEqual(current, baseline);
});

test("anonymous, unverified, and missing deletes are rejected", async () => {
    const anonymous = await send("DELETE", `/api/media/${assetId(1)}`);
    assert.equal(anonymous.status, 401);

    const session = await signIn();
    const unverified = await send("DELETE", `/api/media/${assetId(1)}`, {
        cookie: session
    });
    assert.equal(unverified.status, 403);

    const missing = await send("DELETE", `/api/media/${assetId(1)}`, {
        cookie: session,
        csrf: true
    });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.message, "Media asset not found.");
});

test("deletes an unused asset and its file", async () => {
    const asset = await createAsset("unused.jpg");
    const session = await signIn();
    const response = await send("DELETE", `/api/media/${asset.id}`, {
        cookie: session,
        csrf: true
    });

    assert.equal(response.status, 200);
    assert.equal(await mediaRepository.findMediaAssetById(asset.id), null);
    await assert.rejects(fs.promises.stat(storedPath(asset.storage_key)));
});

test("blocks draft-only, published-only, hidden, and duplicate references", async () => {
    const asset = await createAsset("referenced.jpg");
    const draftOnly = await insertDocumentBoard("Draft Only", mediaDocument(asset.id, true), null);
    const session = await signIn();
    const draftResponse = await send("DELETE", `/api/media/${asset.id}`, {
        cookie: session,
        csrf: true
    });

    assert.equal(draftResponse.status, 409);
    assert.equal(draftResponse.body.data.referenced, true);
    assert.equal(draftResponse.body.data.boards[0].id, draftOnly);
    assert.equal(draftResponse.body.data.boards[0].inDraft, true);
    assert.equal(draftResponse.body.data.boards[0].inPublished, false);
    assert.equal(await mediaRepository.findMediaAssetById(asset.id) === null, false);
    await fs.promises.stat(storedPath(asset.storage_key));

    await pool.query("DELETE FROM boards WHERE id = $1::uuid", [draftOnly]);
    const publishedOnly = await insertDocumentBoard("Published Only", emptyDocument(), mediaDocument(asset.id, false));
    const publishedResponse = await send("DELETE", `/api/media/${asset.id}`, {
        cookie: session,
        csrf: true
    });

    assert.equal(publishedResponse.status, 409);
    assert.equal(publishedResponse.body.data.boards[0].inDraft, false);
    assert.equal(publishedResponse.body.data.boards[0].inPublished, true);
    await pool.query("DELETE FROM boards WHERE id = $1::uuid", [publishedOnly]);

    await insertDocumentBoard("Hidden Copy", mediaDocument(asset.id, true), null);
    await insertDocumentBoard("Second Copy", mediaDocument(asset.id, true), null);
    await insertDocumentBoard("Static Only", staticDocument(), null);
    const blocked = await send("DELETE", `/api/media/${asset.id}`, {
        cookie: session,
        csrf: true
    });
    const names = blocked.body.data.boards.map((board) => board.name);

    assert.equal(blocked.status, 409);
    assert.deepEqual(names, ["Hidden Copy", "Second Copy"]);
    assert.equal(await mediaRepository.findMediaAssetById(asset.id) === null, false);
    await fs.promises.stat(storedPath(asset.storage_key));
});

test("waits for an in-flight board write before deciding", async () => {
    const asset = await createAsset("racing.jpg");
    const boardId = await insertDocumentBoard("Race Board", emptyDocument(), null);
    const holder = await pool.connect();

    try {
        await holder.query("BEGIN");
        await holder.query("LOCK TABLE boards IN ROW EXCLUSIVE MODE");
        const pending = mediaService.deleteMediaAsset(asset.id);
        await waitForBoardLock();
        await holder.query(
            `UPDATE boards
             SET draft = $2::jsonb
             WHERE id = $1::uuid`,
            [boardId, JSON.stringify(mediaDocument(asset.id, true))]
        );
        await holder.query("COMMIT");
        await assert.rejects(pending, (error) => {
            assert.equal(error.statusCode, 409);
            assert.equal(error.usage.boards.length, 1);
            return true;
        });
    } finally {
        await holder.query("ROLLBACK").catch(() => {});
        holder.release();
    }

    assert.equal(await mediaRepository.findMediaAssetById(asset.id) === null, false);
    await fs.promises.stat(storedPath(asset.storage_key));
});

test("rejects a board write that still names a deleted asset", async () => {
    const asset = await createAsset("stale-write.jpg");
    const boardId = await insertDocumentBoard("Stale Board", emptyDocument(), null);

    await mediaService.deleteMediaAsset(asset.id);
    await assert.rejects(
        () => boardRepository.replaceDraft(boardId, mediaDocument(asset.id, false)),
        (error) => error.code === MEDIA_REFERENCE_MISSING
    );

    const stored = await boardRepository.findBoardById(boardId);
    assert.equal(JSON.stringify(stored.draft).includes(asset.id), false);
    await assert.rejects(fs.promises.stat(storedPath(asset.storage_key)));
});

test("lets one of two simultaneous deletes remove the asset", async () => {
    const asset = await createAsset("double.jpg");
    const results = await Promise.allSettled([
        mediaService.deleteMediaAsset(asset.id),
        mediaService.deleteMediaAsset(asset.id)
    ]);
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.statusCode, 404);
    assert.equal(await mediaRepository.findMediaAssetById(asset.id), null);
    await assert.rejects(fs.promises.stat(storedPath(asset.storage_key)));
});

test("reports file cleanup failure without hiding the storage key", async () => {
    const asset = await createAsset("cleanup.jpg");

    await fs.promises.chmod(mediaDir, 0o500);

    try {
        await assert.rejects(mediaService.deleteMediaAsset(asset.id), (error) => {
            assert.equal(error.statusCode, 422);
            assert.equal(error.message.includes(asset.storage_key), true);
            return true;
        });
        assert.equal(await mediaRepository.findMediaAssetById(asset.id), null);
        await fs.promises.stat(storedPath(asset.storage_key));
    } finally {
        await fs.promises.chmod(mediaDir, 0o750);
    }
});

function connection(database) {
    return {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT || 5433),
        database,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    };
}

async function readApplicationSnapshot() {
    const client = new Client(connection(applicationDatabase));

    await client.connect();

    try {
        const result = await client.query(
            `SELECT
                (SELECT COUNT(*)::int FROM boards) AS boards,
                (SELECT COUNT(*)::int FROM displays) AS displays,
                (SELECT COUNT(*)::int FROM media_assets) AS media_assets,
                (SELECT md5(COALESCE(string_agg(storage_key, ',' ORDER BY storage_key), ''))
                 FROM media_assets) AS media_keys`
        );

        return result.rows[0];
    } finally {
        await client.end();
    }
}

async function recreateTestDatabase() {
    const client = new Client(connection("postgres"));

    await client.connect();

    try {
        await client.query(
            `SELECT pg_terminate_backend(pid)
             FROM pg_stat_activity
             WHERE datname = $1
               AND pid <> pg_backend_pid()`,
            [TEST_DATABASE]
        );
        await client.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`);
        await client.query(`CREATE DATABASE ${TEST_DATABASE}`);
    } finally {
        await client.end();
    }
}

async function dropTestDatabase() {
    const client = new Client(connection("postgres"));

    await client.connect();

    try {
        await client.query(
            `SELECT pg_terminate_backend(pid)
             FROM pg_stat_activity
             WHERE datname = $1
               AND pid <> pg_backend_pid()`,
            [TEST_DATABASE]
        );
        await client.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`);
    } finally {
        await client.end();
    }
}

async function applyMigrations() {
    const client = new Client(connection(TEST_DATABASE));
    const directory = path.resolve(__dirname, "../../db/migrations");
    const filenames = (await fs.promises.readdir(directory))
        .filter((filename) => filename.endsWith(".sql"))
        .sort((left, right) => left.localeCompare(right, "en"));

    await client.connect();

    try {
        for (const filename of filenames) {
            const sql = await fs.promises.readFile(path.join(directory, filename), "utf8");
            await client.query(sql);
        }
    } finally {
        await client.end();
    }
}

async function createAsset(filename) {
    const storageKey = createStorageKey("image/jpeg");
    const bytes = Buffer.alloc(64, 7);

    await writeNewFile(storageKey, bytes);

    return mediaRepository.insertMediaAsset({
        originalFilename: filename,
        storageKey,
        mimeType: "image/jpeg",
        sizeBytes: bytes.length
    });
}

async function insertDocumentBoard(name, draft, published) {
    const result = await pool.query(
        `INSERT INTO boards (name, draft, published)
         VALUES ($1, $2::jsonb, $3::jsonb)
         RETURNING id`,
        [name, JSON.stringify(draft), published === null ? null : JSON.stringify(published)]
    );

    return result.rows[0].id;
}

function emptyDocument() {
    return {
        widgets: []
    };
}

function mediaDocument(id, hidden) {
    return {
        widgets: [{
            hidden,
            locked: hidden,
            settings: {
                src: `/api/media/${id}/file`
            }
        }]
    };
}

function staticDocument() {
    return {
        widgets: [{
            settings: {
                src: "/media/tech-summit/hero.png"
            }
        }]
    };
}

function storedPath(storageKey) {
    return path.join(mediaDir, storageKey);
}

function assetId(suffix) {
    return `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
}

async function waitForBoardLock() {
    const started = Date.now();

    while (Date.now() - started < 4000) {
        const result = await pool.query(
            `SELECT COUNT(*)::int AS waiting
             FROM pg_stat_activity
             WHERE datname = current_database()
               AND wait_event_type = 'Lock'`
        );

        if (result.rows[0].waiting > 0) {
            return;
        }

        await new Promise((resolve) => {
            setTimeout(resolve, 40);
        });
    }

    throw new Error("Timed out waiting for the media deletion lock.");
}

async function signIn() {
    const response = await send("POST", "/api/auth/login", {
        csrf: true,
        body: {
            username: "delete-check",
            password: TEST_PASSWORD
        }
    });
    const header = response.headers["set-cookie"];
    const cookies = Array.isArray(header) ? header : [header];
    const session = cookies.find((cookie) => typeof cookie === "string" && cookie.startsWith("liveboard.sid="));

    assert.equal(response.status, 200);
    assert.equal(typeof session, "string");

    return session.split(";")[0];
}

function send(method, requestPath, options = {}) {
    const payload = options.body === undefined ? null : Buffer.from(JSON.stringify(options.body));
    const headers = {};

    if (payload !== null) {
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = String(payload.length);
    }

    if (options.cookie !== undefined) {
        headers.Cookie = options.cookie;
    }

    if (options.csrf === true) {
        headers.Origin = "http://localhost:5173";
        headers["X-LiveBoard-Request"] = "1";
    }

    return new Promise((resolve, reject) => {
        const request = http.request({
            hostname: "127.0.0.1",
            port: serverPort,
            method,
            path: requestPath,
            headers
        }, (response) => {
            const chunks = [];

            response.on("data", (chunk) => {
                chunks.push(chunk);
            });
            response.on("end", () => {
                const text = Buffer.concat(chunks).toString("utf8");

                resolve({
                    status: response.statusCode,
                    headers: response.headers,
                    body: text === "" ? null : JSON.parse(text)
                });
            });
        });

        request.on("error", reject);

        if (payload !== null) {
            request.write(payload);
        }

        request.end();
    });
}
