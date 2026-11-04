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

test("rejects location search without an administrator session", async () => {
    const response = await send("/api/weather/locations?q=Tel%20Aviv");

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, "Authentication required.");
});

test("rejects a public forecast with invalid coordinates, units, or extra fields", async () => {
    const latitude = await send("/api/weather?latitude=91&longitude=0&unit=celsius");
    const longitude = await send("/api/weather?latitude=0&longitude=181&unit=fahrenheit");
    const unit = await send("/api/weather?latitude=32.08&longitude=34.78&unit=kelvin");
    const extra = await send("/api/weather?latitude=32.08&longitude=34.78&unit=celsius&url=https://evil.test");
    const missing = await send("/api/weather?unit=celsius");

    assert.equal(latitude.status, 400);
    assert.equal(latitude.body.errors[0].path, "latitude");
    assert.equal(longitude.status, 400);
    assert.equal(longitude.body.errors[0].path, "longitude");
    assert.equal(unit.status, 400);
    assert.equal(unit.body.errors[0].path, "unit");
    assert.equal(extra.status, 400);
    assert.equal(extra.body.errors[0].message, "Unknown field.");
    assert.equal(missing.status, 400);
    assert.equal(missing.body.message, "Validation failed.");
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
                    body: JSON.parse(text)
                });
            });
        });

        request.on("error", reject);
        request.end();
    });
}
