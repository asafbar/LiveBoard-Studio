const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");

require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
    quiet: true
});

const app = require("../app");
const { closeDatabase } = require("../config/db");

let server = null;
let serverPort = 0;

test.before(async () => {
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
});

test("serves anonymous Hebrew sample headlines", async () => {
    const response = await send("/api/news?source=sample&category=israel&limit=5");
    const body = response.text;

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.mode, "sample");
    assert.equal(response.body.data.items.length, 5);
    assert.equal(response.body.data.items[0].source, "sample");
    assert.equal(body.includes("לוח החדשות לדוגמה נפתח מימין לשמאל"), true);
    assert.equal(body.includes("\\u05DC"), false);
});

test("rejects unknown fields, bad limits, and unsupported live pairings", async () => {
    const extra = await send("/api/news?source=sample&category=israel&limit=5&url=https://evil.test");
    const limit = await send("/api/news?source=sample&category=israel&limit=11");
    const source = await send("/api/news?source=reuters&category=israel&limit=5");
    const pairing = await send("/api/news?source=ynet&category=technology&limit=5");

    assert.equal(extra.status, 400);
    assert.equal(extra.body.errors[0].message, "Unknown field.");
    assert.equal(limit.status, 400);
    assert.equal(limit.body.errors[0].path, "limit");
    assert.equal(source.status, 400);
    assert.equal(source.body.errors[0].path, "source");
    assert.equal(pairing.status, 400);
    assert.equal(pairing.body.errors[0].path, "category");
});

test("does not serve a live feed while public live mode is off", async () => {
    const response = await send("/api/news?source=walla&category=israel&limit=5");

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Live news feeds are disabled.");
    assert.equal(response.body.errors[0].path, "source");
});

function send(requestPath) {
    return new Promise((resolve, reject) => {
        const request = http.request({
            hostname: "127.0.0.1",
            port: serverPort,
            method: "GET",
            path: requestPath
        }, (response) => {
            const chunks = [];

            response.on("data", (chunk) => {
                chunks.push(chunk);
            });
            response.on("end", () => {
                const text = Buffer.concat(chunks).toString("utf8");

                resolve({
                    status: response.statusCode,
                    text,
                    body: JSON.parse(text)
                });
            });
        });

        request.on("error", reject);
        request.end();
    });
}
