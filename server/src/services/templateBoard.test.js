const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("pg");

const TEST_DATABASE = "liveboard_template_test";
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
    publishBoard
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

test("stores a chosen template as an unpublished draft and publishes that copy", async () => {
    const drafts = loadTemplateDrafts();
    const blank = await createBoard("Blank template check");

    assert.equal(drafts.length, 5);
    drafts.forEach((draft) => {
        const errors = [];
        const sanitized = sanitizeDraft(draft, errors);

        assert.deepEqual(errors, []);
        assert.equal(sanitized.widgets.length, draft.widgets.length);
    });

    const schedule = drafts.find((draft) => draft.name === "Event Schedule");
    const created = await createBoard(schedule.name, {
        width: schedule.width,
        height: schedule.height,
        background: schedule.background,
        widgets: schedule.widgets
    });
    const stored = await getBoard(created.id);

    assert.equal(blank.draft.width, 1920);
    assert.equal(blank.draft.height, 1080);
    assert.deepEqual(blank.draft.widgets, []);
    assert.equal(blank.published, null);
    assert.equal(created.published, null);
    assert.equal(stored.published, null);
    assert.equal(stored.draft.width, 1080);
    assert.equal(stored.draft.height, 1920);
    assert.equal(stored.draft.widgets.length, schedule.widgets.length);
    assert.equal(stored.draft.widgets.some((widget) => widget.type === "qr"), true);
    assert.equal((await getPublishedBoard(created.id)).published, null);

    const published = await publishBoard(created.id);
    const publicBoard = await getPublishedBoard(created.id);

    assert.equal(published.published.width, 1080);
    assert.equal(published.published.height, 1920);
    assert.equal(publicBoard.published.widgets.length, schedule.widgets.length);
    assert.equal(stored.draft.widgets[0].id, publicBoard.published.widgets[0].id);
});

function loadTemplateDrafts() {
    const clientRoot = path.resolve(__dirname, "../../../client");
    const result = spawnSync(process.execPath, [
        "--experimental-strip-types",
        "--input-type=module",
        "--eval",
        [
            "import { boardTemplates } from \"./src/features/boards/templates/boardTemplates.ts\";",
            "const drafts = boardTemplates.map((template) => template.createDraft(template.name, new Date(\"2026-11-05T12:00:00.000Z\")));",
            "process.stdout.write(JSON.stringify(drafts));"
        ].join("\n")
    ], {
        cwd: clientRoot,
        encoding: "utf8"
    });

    if (result.status !== 0) {
        throw new Error(result.stderr || "The template drafts could not be loaded.");
    }

    return JSON.parse(result.stdout);
}

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
