const DAY_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const WEEK_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const USGS_HOST = "earthquake.usgs.gov";
const CREDIT_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php";
const MAX_USGS_CHARS = 2000000;
const MAX_USGS_FEATURES = 2000;
const MAX_STORED_EVENTS = 10;
const MAX_TITLE_CHARS = 180;
const REQUEST_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

const WINDOWS = {
    day: "Past day, magnitude 2.5+.",
    week: "Past week, magnitude 2.5+."
};

async function fetchUsgsEvents(options = {}) {
    const day = await readUsgsFeed(DAY_FEED_URL, "day", options);

    if (day.items.length > 0) {
        return day;
    }

    const week = await readUsgsFeed(WEEK_FEED_URL, "week", options);

    if (week.items.length > 0) {
        return week;
    }

    throw usgsError("empty", "USGS returned no earthquake events.");
}

async function readUsgsFeed(url, windowName, options) {
    const text = await fetchUsgsDocument(url, options);
    const items = normalizeUsgsCollection(parseJson(text), windowName).slice(0, MAX_STORED_EVENTS);

    return {
        publisher: "USGS",
        attribution: usgsAttribution(windowName),
        items
    };
}

function usgsAttribution(windowName) {
    return {
        text: `Earthquake data: U.S. Geological Survey. ${WINDOWS[windowName]}`,
        url: CREDIT_URL
    };
}

function parseJson(text) {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw usgsError("invalid", "USGS response was not valid JSON.");
    }
}

function normalizeUsgsCollection(document, windowName = "day") {
    if (document === null || typeof document !== "object" || Array.isArray(document)) {
        throw usgsError("invalid", "USGS response was not a GeoJSON object.");
    }

    if (document.type !== "FeatureCollection" || !Array.isArray(document.features)) {
        throw usgsError("invalid", "USGS response was not a FeatureCollection.");
    }

    if (document.features.length > MAX_USGS_FEATURES) {
        throw usgsError("invalid", "USGS response contained too many events.");
    }

    const items = [];

    for (const feature of document.features) {
        const item = normalizeUsgsFeature(feature, windowName);

        if (item !== null) {
            items.push(item);
        }
    }

    items.sort((left, right) => {
        return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });

    return items;
}

function normalizeUsgsFeature(feature, windowName) {
    if (feature === null || typeof feature !== "object" || Array.isArray(feature)) {
        return null;
    }

    const properties = feature.properties;

    if (properties === null || typeof properties !== "object" || Array.isArray(properties)) {
        return null;
    }

    const id = readEventId(feature.id);
    const magnitude = formatMagnitude(properties.mag);
    const place = readPlace(properties.place);
    const publishedAt = readEventTime(properties.time);
    const articleUrl = readEventUrl(properties.url);

    if (id === null || magnitude === null || place === null || publishedAt === null || articleUrl === null) {
        return null;
    }

    return {
        id,
        title: eventTitle(magnitude, place),
        publisher: "USGS",
        publishedAt,
        category: "earthquakes",
        articleUrl,
        source: "usgs",
        attribution: usgsAttribution(windowName)
    };
}

function eventTitle(magnitude, place) {
    const title = `M ${magnitude} earthquake - ${place}`;

    if (title.length <= MAX_TITLE_CHARS) {
        return title;
    }

    return `${title.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`;
}

function formatMagnitude(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) {
        return null;
    }

    return value.toFixed(1);
}

function readPlace(value) {
    if (typeof value !== "string") {
        return null;
    }

    const place = value.replace(/\s+/g, " ").trim();

    if (place.length === 0 || place.length > 160 || /[<>]/.test(place)) {
        return null;
    }

    return place;
}

function readEventId(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9]{4,64}$/.test(value)) {
        return null;
    }

    return value;
}

function readEventTime(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function readEventUrl(value) {
    if (typeof value !== "string") {
        return null;
    }

    let url;

    try {
        url = new URL(value);
    } catch (error) {
        return null;
    }

    if (
        url.protocol !== "https:"
        || url.username !== ""
        || url.password !== ""
        || (url.port !== "" && url.port !== "443")
        || url.hostname !== USGS_HOST
    ) {
        return null;
    }

    return url.toString();
}

async function fetchUsgsDocument(startUrl, options = {}) {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
    let current = startUrl;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const url = assertUsgsUrl(current);
        let response;

        try {
            response = await fetchImpl(url, {
                method: "GET",
                redirect: "manual",
                headers: {
                    Accept: "application/geo+json, application/json"
                },
                signal: AbortSignal.timeout(timeoutMs)
            });
        } catch (error) {
            if (isTimeout(error)) {
                throw usgsError("timeout", "USGS feed timed out.");
            }

            throw usgsError("unavailable", "USGS feed is unavailable.");
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");

            if (hop === MAX_REDIRECTS || typeof location !== "string" || location.trim() === "") {
                throw usgsError("redirect", "USGS redirect was rejected.");
            }

            current = new URL(location, url).toString();
            continue;
        }

        if (!response.ok) {
            throw usgsError("http", "USGS feed returned an error.");
        }

        const contentType = response.headers.get("content-type");

        if (typeof contentType !== "string" || !contentType.toLowerCase().includes("json")) {
            throw usgsError("invalid", "USGS feed did not return JSON.");
        }

        return readLimitedText(response);
    }

    throw usgsError("redirect", "USGS redirect was rejected.");
}

function assertUsgsUrl(value) {
    let url;

    try {
        url = new URL(value);
    } catch (error) {
        throw usgsError("invalid-url", "USGS feed URL is not allowed.");
    }

    if (
        url.protocol !== "https:"
        || url.username !== ""
        || url.password !== ""
        || (url.port !== "" && url.port !== "443")
        || url.hostname !== USGS_HOST
        || isPrivateOrLocal(url.hostname)
    ) {
        throw usgsError("invalid-url", "USGS feed URL is not allowed.");
    }

    return url;
}

function isPrivateOrLocal(hostname) {
    const lower = hostname.toLowerCase();

    return lower === "localhost"
        || lower.endsWith(".localhost")
        || lower.endsWith(".local")
        || lower === "127.0.0.1"
        || lower === "::1";
}

async function readLimitedText(response) {
    let text;

    try {
        text = await response.text();
    } catch (error) {
        throw usgsError("invalid", "USGS response could not be read.");
    }

    if (text.length > MAX_USGS_CHARS) {
        throw usgsError("invalid", "USGS response is too large.");
    }

    return text;
}

function isTimeout(error) {
    return error !== null
        && typeof error === "object"
        && (error.name === "TimeoutError" || error.name === "AbortError");
}

function usgsError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

module.exports = {
    CREDIT_URL,
    DAY_FEED_URL,
    WEEK_FEED_URL,
    fetchUsgsEvents,
    normalizeUsgsCollection
};
