const assert = require("node:assert/strict");
const test = require("node:test");
const {
    fetchUsgsEvents,
    normalizeUsgsCollection
} = require("./usgsFeed");

const eventTime = Date.parse("2026-11-04T12:14:45.921Z");

function feature(overrides = {}) {
    return {
        type: "Feature",
        id: "us7000png1",
        properties: {
            mag: 4.3,
            place: "127 km SSW of Kokopo, Papua New Guinea",
            time: eventTime,
            url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000png1",
            ...overrides
        }
    };
}

function collection(features) {
    return {
        type: "FeatureCollection",
        features
    };
}

test("normalizes a USGS event into a display title and keeps the real timestamp", () => {
    const items = normalizeUsgsCollection(collection([
        feature(),
        feature({
            mag: 3.1,
            place: "10 km NE of Ridgecrest, CA",
            time: eventTime - 60000,
            url: "https://earthquake.usgs.gov/earthquakes/eventpage/ci12345678"
        })
    ].map((item, index) => {
        return {
            ...item,
            id: index === 0 ? "us7000png1" : "ci12345678"
        };
    })), "day");

    assert.equal(items[0].title, "M 4.3 earthquake - 127 km SSW of Kokopo, Papua New Guinea");
    assert.equal(items[0].publishedAt, "2026-11-04T12:14:45.921Z");
    assert.equal(items[0].publisher, "USGS");
    assert.equal(items[0].source, "usgs");
    assert.equal(items[0].category, "earthquakes");
    assert.equal(items[0].articleUrl, "https://earthquake.usgs.gov/earthquakes/eventpage/us7000png1");
    assert.match(items[0].attribution.text, /U\.S\. Geological Survey/);
    assert.match(items[0].attribution.text, /Past day/);
    assert.equal(items[1].id, "ci12345678");
    assert.equal(Object.hasOwn(items[0], "mag"), false);
});

test("skips events that lack a magnitude, location, or trusted USGS page", () => {
    const items = normalizeUsgsCollection(collection([
        feature({ mag: null }),
        feature({ place: "" }),
        feature({ url: "https://example.com/quake" }),
        feature({ url: "http://earthquake.usgs.gov/earthquakes/eventpage/us7000png1" }),
        feature()
    ]), "week");

    assert.equal(items.length, 1);
    assert.match(items[0].attribution.text, /Past week/);
});

test("rejects a document that is not a FeatureCollection", () => {
    assert.throws(() => normalizeUsgsCollection({ type: "Feature", features: [] }), (error) => {
        return error.code === "invalid";
    });
});

test("uses the past-week feed only when the past-day feed has no events", async () => {
    const calls = [];
    const result = await fetchUsgsEvents({
        fetchImpl(url) {
            calls.push(String(url));
            const features = String(url).includes("2.5_week") ? [feature()] : [];

            return jsonResponse(collection(features));
        }
    });

    assert.equal(calls.length, 2);
    assert.match(result.attribution.text, /Past week/);
    assert.equal(result.items[0].title, "M 4.3 earthquake - 127 km SSW of Kokopo, Papua New Guinea");
});

test("rejects a redirect away from the USGS host", async () => {
    await assert.rejects(fetchUsgsEvents({
        fetchImpl() {
            return {
                status: 302,
                ok: false,
                headers: {
                    get(name) {
                        return name === "location" ? "https://example.com/feed.geojson" : null;
                    }
                },
                text() {
                    return "";
                }
            };
        }
    }), (error) => error.code === "invalid-url");
});

function jsonResponse(body) {
    return {
        status: 200,
        ok: true,
        headers: {
            get(name) {
                return name === "content-type" ? "application/json" : null;
            }
        },
        text() {
            return JSON.stringify(body);
        }
    };
}
