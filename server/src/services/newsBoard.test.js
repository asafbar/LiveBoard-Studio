const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("pg");

const TEST_DATABASE = "liveboard_news_widget_test";
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

test("saves and publishes news settings without fetched headlines", async () => {
    const created = await createBoard("News widget fixture");
    const errors = [];
    const draft = sanitizeDraft({
        id: created.draft.id,
        name: created.name,
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets: [
            {
                id: "news-1",
                type: "news",
                layout: { x: 40, y: 900, width: 1200, height: 140 },
                settings: {
                    source: "sample",
                    category: "business",
                    preset: "list",
                    maxHeadlines: 4,
                    rotationSeconds: 10,
                    refreshIntervalMinutes: 30,
                    direction: "rtl",
                    align: "right",
                    title: "חדשות לדוגמה",
                    backgroundColor: "#102030",
                    textColor: "#ffffff",
                    accentColor: "#37d6ff",
                    borderRadius: 16
                }
            },
            {
                id: "clock-1",
                type: "clock",
                layout: { x: 40, y: 40, width: 460, height: 170 },
                settings: {
                    timeZone: "Asia/Jerusalem",
                    showDate: true,
                    showSeconds: false,
                    align: "left"
                }
            }
        ]
    }, errors);

    assert.deepEqual(errors, []);
    await replaceDraft(created.id, draft);
    await publishBoard(created.id);
    const stored = await getBoard(created.id);
    const publicBoard = await getPublishedBoard(created.id);
    const news = stored.draft.widgets[0].settings;
    const publishedNews = publicBoard.published.widgets[0].settings;
    const serialized = JSON.stringify(publicBoard.published);

    assert.equal(news.source, "sample");
    assert.equal(news.category, "business");
    assert.equal(news.preset, "list");
    assert.equal(news.title, "חדשות לדוגמה");
    assert.equal(news.direction, "rtl");
    assert.equal(news.items, undefined);
    assert.deepEqual(publishedNews, news);
    assert.equal(serialized.includes("\"items\""), false);
    assert.equal(serialized.includes("articleUrl"), false);
    assert.equal(stored.draft.widgets[1].type, "clock");
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
