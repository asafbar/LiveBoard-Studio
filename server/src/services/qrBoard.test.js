const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("pg");

const TEST_DATABASE = "liveboard_qr_widget_test";
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

test("saves and publishes QR settings without a generated image", async () => {
    const created = await createBoard("QR widget fixture");
    const errors = [];
    const draft = sanitizeDraft({
        id: created.draft.id,
        name: created.name,
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets: [
            {
                id: "qr-1",
                type: "qr",
                layout: { x: 80, y: 80, width: 440, height: 560 },
                settings: {
                    content: "  https://example.com/lobby  ",
                    title: "  סרוק את הקוד  ",
                    subtitle: "כוונו את המצלמה",
                    preset: "split",
                    direction: "rtl",
                    align: "right",
                    foregroundColor: "#112233",
                    codeBackgroundColor: "#fff8e7",
                    backgroundColor: "#102030",
                    backgroundOpacity: 80,
                    textColor: "#ffffff",
                    borderRadius: 24,
                    padding: 16
                }
            }
        ]
    }, errors);

    assert.deepEqual(errors, []);

    const saved = await replaceDraft(created.id, draft);
    const published = await publishBoard(created.id);
    const stored = await getBoard(created.id);
    const publicBoard = await getPublishedBoard(created.id);
    const qr = stored.draft.widgets[0].settings;
    const publishedQr = publicBoard.published.widgets[0].settings;
    const serialized = JSON.stringify(stored.draft) + JSON.stringify(publicBoard.published);

    assert.equal(saved.draft.widgets[0].type, "qr");
    assert.equal(qr.content, "https://example.com/lobby");
    assert.equal(qr.title, "סרוק את הקוד");
    assert.equal(qr.subtitle, "כוונו את המצלמה");
    assert.equal(qr.preset, "split");
    assert.equal(qr.direction, "rtl");
    assert.equal(qr.foregroundColor, "#112233");
    assert.equal(qr.codeBackgroundColor, "#fff8e7");
    assert.equal(qr.backgroundOpacity, 80);
    assert.equal(qr.svg, undefined);
    assert.deepEqual(publishedQr, qr);
    assert.deepEqual(published.published.widgets[0].settings, qr);
    assert.equal(serialized.includes("<svg"), false);
    assert.equal(serialized.includes("\"svg\""), false);
    assert.equal(await mediaAssetCount(), 0);
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

async function mediaAssetCount() {
    const client = new Client(connection(TEST_DATABASE));

    await client.connect();

    try {
        const result = await client.query("SELECT COUNT(*)::int AS count FROM media_assets");

        return result.rows[0].count;
    } finally {
        await client.end();
    }
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
