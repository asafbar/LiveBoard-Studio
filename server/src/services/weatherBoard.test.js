const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { Client } = require("pg");

const TEST_DATABASE = "liveboard_weather_widget_test";
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

test("saves and publishes weather settings without weather readings", async () => {
    const created = await createBoard("Weather widget fixture");
    const errors = [];
    const draft = sanitizeDraft({
        id: created.draft.id,
        name: created.name,
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets: [
            {
                id: "weather-1",
                type: "weather",
                layout: { x: 40, y: 40, width: 480, height: 240 },
                settings: {
                    location: {
                        name: "Nahariya",
                        label: "Nahariya, Northern District, Israel",
                        latitude: 33.00892,
                        longitude: 35.09814,
                        timezone: "Asia/Jerusalem",
                        country: "Israel",
                        countryCode: "il",
                        admin1: "Northern District"
                    },
                    unit: "celsius",
                    layout: "compact",
                    showFeelsLike: true,
                    showForecast: false,
                    backgroundColor: "#102030",
                    textColor: "#ffffff",
                    accentColor: "#37d6ff",
                    borderRadius: 24
                }
            },
            {
                id: "clock-1",
                type: "clock",
                layout: { x: 560, y: 40, width: 460, height: 170 },
                settings: {
                    timeZone: "Asia/Jerusalem",
                    showDate: true,
                    showSeconds: true,
                    align: "right"
                }
            }
        ]
    }, errors);

    assert.deepEqual(errors, []);

    const saved = await replaceDraft(created.id, draft);
    const published = await publishBoard(created.id);
    const stored = await getBoard(created.id);
    const publicBoard = await getPublishedBoard(created.id);
    const weather = stored.draft.widgets[0].settings;
    const publishedWeather = publicBoard.published.widgets[0].settings;

    assert.equal(saved.draft.widgets[0].type, "weather");
    assert.equal(weather.location.name, "Nahariya");
    assert.equal(weather.location.countryCode, "IL");
    assert.equal(weather.location.timezone, "Asia/Jerusalem");
    assert.equal(weather.unit, "celsius");
    assert.equal(weather.temperature, undefined);
    assert.equal(weather.current, undefined);
    assert.equal(stored.draft.widgets[1].type, "clock");
    assert.deepEqual(publishedWeather, weather);
    assert.deepEqual(published.published.widgets[0].settings, weather);
    assert.equal(JSON.stringify(stored.draft).includes("\"temperature\""), false);
    assert.equal(JSON.stringify(publicBoard.published).includes("\"temperature\""), false);
});

test("saves a preset, Hebrew title, and custom location in draft and published snapshots", async () => {
    const created = await createBoard("Weather presentation fixture");
    const errors = [];
    const draft = sanitizeDraft({
        id: created.draft.id,
        name: created.name,
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets: [
            {
                id: "weather-2",
                type: "weather",
                layout: { x: 80, y: 80, width: 640, height: 320 },
                settings: {
                    location: {
                        id: "777001",
                        name: "Custom Shore",
                        label: "Custom Shore, Israel",
                        latitude: 32.5,
                        longitude: 34.9,
                        timezone: "Asia/Jerusalem",
                        country: "Israel",
                        countryCode: "IL"
                    },
                    unit: "celsius",
                    layout: "compact",
                    showFeelsLike: false,
                    showForecast: true,
                    title: "מזג אוויר",
                    preset: "horizontal",
                    direction: "rtl",
                    align: "left",
                    titleAlign: "right",
                    fontFamily: "sans",
                    fontSize: 28,
                    fontWeight: 500,
                    titleFontSize: 22,
                    titleColor: "#ffdd88",
                    backgroundColor: "#102030",
                    backgroundOpacity: 75,
                    textColor: "#ffffff",
                    accentColor: "#37d6ff",
                    borderRadius: 16,
                    padding: 10,
                    titleSpacing: 12,
                    refreshIntervalMinutes: 60
                }
            }
        ]
    }, errors);

    assert.deepEqual(errors, []);

    await replaceDraft(created.id, draft);
    await publishBoard(created.id);
    const stored = await getBoard(created.id);
    const publicBoard = await getPublishedBoard(created.id);
    const weather = stored.draft.widgets[0].settings;
    const publishedWeather = publicBoard.published.widgets[0].settings;

    assert.equal(weather.preset, "horizontal");
    assert.equal(weather.title, "מזג אוויר");
    assert.equal(weather.direction, "rtl");
    assert.equal(weather.align, "left");
    assert.equal(weather.titleAlign, "right");
    assert.equal(weather.location.id, "777001");
    assert.equal(weather.location.label, "Custom Shore, Israel");
    assert.equal(weather.backgroundOpacity, 75);
    assert.equal(weather.padding, 10);
    assert.equal(weather.titleSpacing, 12);
    assert.equal(weather.refreshIntervalMinutes, 60);
    assert.equal(weather.temperature, undefined);
    assert.deepEqual(publishedWeather, weather);
    assert.equal(JSON.stringify(publicBoard.published).includes("\"temperature\""), false);
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
