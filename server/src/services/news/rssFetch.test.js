const assert = require("node:assert/strict");
const test = require("node:test");
const { fetchRssDocument } = require("./rssFetch");

const feed = {
    url: "https://www.walla.co.il/rss/feed/news/israel",
    redirectHosts: ["www.walla.co.il"]
};

const xml = `<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>בדיקה</title></channel></rss>`;

test("follows an HTTPS redirect that stays on the approved host", async () => {
    let calls = 0;
    const document = await fetchRssDocument(feed, {
        fetchImpl(url) {
            calls += 1;

            if (calls === 1) {
                return response(301, "", "https://www.walla.co.il/rss/feed/news/israel");
            }

            assert.equal(url.hostname, "www.walla.co.il");
            return response(200, xml, null, "application/xml; charset=utf-8");
        }
    });

    assert.equal(calls, 2);
    assert.equal(document.includes("בדיקה"), true);
});

test("rejects redirects to another host, a private address, or an unsafe scheme", async () => {
    await assert.rejects(fetchRssDocument(feed, {
        fetchImpl() {
            return response(302, "", "https://example.test/rss");
        }
    }), (error) => error.code === "invalid-url");

    await assert.rejects(fetchRssDocument(feed, {
        fetchImpl() {
            return response(302, "", "https://127.0.0.1/rss");
        }
    }), (error) => error.code === "invalid-url");

    await assert.rejects(fetchRssDocument(feed, {
        fetchImpl() {
            return response(302, "", "http://www.walla.co.il/rss");
        }
    }), (error) => error.code === "invalid-url");
});

test("reports a timeout and rejects a response that is not XML", async () => {
    await assert.rejects(fetchRssDocument(feed, {
        fetchImpl() {
            const error = new Error("timed out");
            error.name = "TimeoutError";
            throw error;
        }
    }), (error) => error.code === "timeout");

    await assert.rejects(fetchRssDocument(feed, {
        fetchImpl() {
            return response(200, "<html></html>", null, "text/html");
        }
    }), (error) => error.code === "invalid");
});

function response(status, body, location, contentType = "application/xml") {
    return {
        status,
        ok: status >= 200 && status < 300,
        headers: {
            get(name) {
                if (name === "location") {
                    return location;
                }

                if (name === "content-type") {
                    return contentType;
                }

                return null;
            }
        },
        text() {
            return Promise.resolve(body);
        }
    };
}
