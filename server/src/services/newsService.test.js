const assert = require("node:assert/strict");
const test = require("node:test");
const { createNewsService } = require("./newsService");

const hebrewXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel><item>
    <title>כותרת בדיקה בעברית</title>
    <link>https://www.walla.co.il/item/7</link>
    <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
    <description><p>לא לשמור</p></description>
</item></channel></rss>`;

test("returns labeled Hebrew sample headlines without a feed request", async () => {
    let calls = 0;
    const service = createNewsService({
        liveFeeds: false,
        fetchFeed() {
            calls += 1;
            return hebrewXml;
        },
        now: () => "2026-11-04T11:00:00.000Z"
    });
    const result = await service.getHeadlines({
        source: "sample",
        category: "israel",
        limit: 2
    });

    assert.equal(calls, 0);
    assert.equal(result.mode, "sample");
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].title, "לוח החדשות לדוגמה נפתח מימין לשמאל");
    assert.equal(result.items[0].articleUrl, null);
    assert.match(result.attribution.text, /לדוגמה/);
    await assert.rejects(service.probeFeed("walla", "israel"), (error) => {
        return error.statusCode === 403;
    });
    assert.equal(calls, 0);
});

test("keeps a verified live pairing disabled until live feeds are enabled", async () => {
    let calls = 0;
    const disabled = createNewsService({
        fetchFeed() {
            calls += 1;
            return hebrewXml;
        }
    });

    await assert.rejects(disabled.getHeadlines({
        source: "walla",
        category: "israel",
        limit: 5
    }), (error) => error.statusCode === 403);
    assert.equal(calls, 0);
});

test("rejects source and category pairings that were not verified", async () => {
    const service = createNewsService({ liveFeeds: true });

    await assert.rejects(service.getHeadlines({
        source: "walla",
        category: "business",
        limit: 5
    }), (error) => error.statusCode === 400);

    await assert.rejects(service.getHeadlines({
        source: "ynet",
        category: "israel",
        limit: 5
    }), (error) => error.statusCode === 400);
});

test("loads one enabled feed, shares the cache, and isolates a failing feed", async () => {
    let calls = 0;
    const service = createNewsService({
        liveFeeds: true,
        fetchFeed(feed) {
            calls += 1;

            if (feed.category === "breaking") {
                const error = new Error("timed out");
                error.code = "timeout";
                throw error;
            }

            return hebrewXml;
        }
    });
    const first = service.getHeadlines({
        source: "walla",
        category: "israel",
        limit: 5
    });
    const second = service.getHeadlines({
        source: "walla",
        category: "israel",
        limit: 1
    });
    const results = await Promise.all([first, second]);

    assert.equal(calls, 1);
    assert.equal(results[0].mode, "live");
    assert.equal(results[0].status, "fresh");
    assert.equal(results[0].items[0].title, "כותרת בדיקה בעברית");
    assert.equal(results[1].items.length, 1);
    await assert.rejects(service.getHeadlines({
        source: "walla",
        category: "breaking",
        limit: 5
    }), (error) => error.statusCode === 503 && error.expose === true);
    assert.equal(calls, 2);
});

test("serves USGS earthquakes while publisher feeds stay disabled", async () => {
    let usgsCalls = 0;
    let rssCalls = 0;
    const service = createNewsService({
        liveFeeds: false,
        fetchFeed() {
            rssCalls += 1;
            return hebrewXml;
        },
        fetchUsgs() {
            usgsCalls += 1;
            return {
                publisher: "USGS",
                attribution: {
                    text: "Earthquake data: U.S. Geological Survey. Past day, magnitude 2.5+.",
                    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                },
                items: [{
                    id: "us7000png1",
                    title: "M 4.3 earthquake - 127 km SSW of Kokopo, Papua New Guinea",
                    publisher: "USGS",
                    publishedAt: "2026-11-04T12:14:45.921Z",
                    category: "earthquakes",
                    articleUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000png1",
                    source: "usgs",
                    attribution: {
                        text: "Earthquake data: U.S. Geological Survey. Past day, magnitude 2.5+.",
                        url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                    }
                }]
            };
        }
    });
    const first = service.getHeadlines({
        source: "usgs",
        category: "earthquakes",
        limit: 5
    });
    const second = service.getHeadlines({
        source: "usgs",
        category: "earthquakes",
        limit: 1
    });
    const results = await Promise.all([first, second]);

    assert.equal(usgsCalls, 1);
    assert.equal(rssCalls, 0);
    assert.equal(results[0].mode, "live");
    assert.equal(results[0].status, "fresh");
    assert.equal(results[0].items[0].publishedAt, "2026-11-04T12:14:45.921Z");
    assert.equal(results[1].items.length, 1);
    assert.equal(results[1].items[0].title.includes("לדוגמה"), false);
    await assert.rejects(service.getHeadlines({
        source: "walla",
        category: "israel",
        limit: 5
    }), (error) => error.statusCode === 403);
    await assert.rejects(service.getHeadlines({
        source: "sample",
        category: "earthquakes",
        limit: 5
    }), (error) => error.statusCode === 400);
});

test("returns the last USGS events as stale when a later refresh fails", async () => {
    let calls = 0;
    const service = createNewsService({
        usgsCache: require("./news/newsCache").createNewsCache({
            freshTtlMs: 1,
            staleTtlMs: 60000,
            now: () => Date.now()
        }),
        fetchUsgs() {
            calls += 1;

            if (calls === 1) {
                return {
                    publisher: "USGS",
                    attribution: {
                        text: "Earthquake data: U.S. Geological Survey. Past day, magnitude 2.5+.",
                        url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                    },
                    items: [{
                        id: "us7000png1",
                        title: "M 4.3 earthquake - Papua New Guinea",
                        publisher: "USGS",
                        publishedAt: "2026-11-04T12:14:45.921Z",
                        category: "earthquakes",
                        articleUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000png1",
                        source: "usgs",
                        attribution: {
                            text: "Earthquake data: U.S. Geological Survey. Past day, magnitude 2.5+.",
                            url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
                        }
                    }]
                };
            }

            const error = new Error("timeout");
            error.code = "timeout";
            throw error;
        }
    });

    const fresh = await service.getHeadlines({
        source: "usgs",
        category: "earthquakes",
        limit: 5
    });

    await new Promise((resolve) => {
        setTimeout(resolve, 5);
    });

    const stale = await service.getHeadlines({
        source: "usgs",
        category: "earthquakes",
        limit: 5
    });

    assert.equal(fresh.status, "fresh");
    assert.equal(stale.status, "stale");
    assert.equal(stale.items[0].title, "M 4.3 earthquake - Papua New Guinea");
    await assert.rejects(createNewsService({
        fetchUsgs() {
            const error = new Error("timeout");
            error.code = "timeout";
            throw error;
        }
    }).getHeadlines({
        source: "usgs",
        category: "earthquakes",
        limit: 5
    }), (error) => error.statusCode === 503);
});
