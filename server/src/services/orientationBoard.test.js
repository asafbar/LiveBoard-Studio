const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("pg");

const TEST_DATABASE = "liveboard_orientation_test";
const APPLICATION_DATABASE = "liveboard_studio";

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

process.env.DB_NAME = TEST_DATABASE;
process.env.CLIENT_URL = "http://localhost:5173";

const { closeDatabase } = require("../config/db");
const {
    createBoard,
    getBoard,
    getPublishedBoard,
    publishBoard,
    replaceDraft
} = require("./boardService");
const { sanitizeDraft } = require("../validators/boardValidator");

let baseline = null;

test.before(async () => {
    baseline = await readApplicationSnapshot();
    await recreateTestDatabase();
    await applyMigrations();
});

test.after(async () => {
    await closeDatabase();
    await dropTestDatabase();

    const current = await readApplicationSnapshot();
    assert.deepEqual(current, baseline);
});

test("keeps a published portrait snapshot when the draft returns to landscape", async () => {
    const created = await createBoard("Portrait fixture", { width: 1080, height: 1920 });
    const portraitErrors = [];
    const portraitDraft = sanitizeDraft({
        id: created.draft.id,
        name: created.name,
        width: 1080,
        height: 1920,
        background: { type: "solid", color: "#000000" },
        widgets: [
            {
                id: "text-1",
                type: "text",
                layout: { x: 80, y: 1600, width: 480, height: 100 },
                settings: {
                    text: "Welcome",
                    tone: "default",
                    size: "title"
                }
            }
        ]
    }, portraitErrors);
    const landscapeErrors = [];
    const landscapeDraft = sanitizeDraft({
        ...portraitDraft,
        width: 1920,
        height: 1080
    }, landscapeErrors);

    assert.equal(created.draft.width, 1080);
    assert.equal(created.draft.height, 1920);
    assert.deepEqual(portraitErrors, []);
    assert.deepEqual(landscapeErrors, []);

    await replaceDraft(created.id, portraitDraft);
    const published = await publishBoard(created.id);
    await replaceDraft(created.id, landscapeDraft);

    const stored = await getBoard(created.id);
    const publicBoard = await getPublishedBoard(created.id);

    assert.equal(stored.draft.width, 1920);
    assert.equal(stored.draft.height, 1080);
    assert.equal(published.published.width, 1080);
    assert.equal(published.published.height, 1920);
    assert.equal(publicBoard.published.width, 1080);
    assert.equal(publicBoard.published.height, 1920);
    assert.deepEqual(publicBoard.published.widgets[0].layout, portraitDraft.widgets[0].layout);
    assert.deepEqual(stored.draft.widgets[0].layout, portraitDraft.widgets[0].layout);
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
                (SELECT md5(COALESCE(string_agg(id::text, ',' ORDER BY id), '')) FROM boards) AS board_ids`
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
