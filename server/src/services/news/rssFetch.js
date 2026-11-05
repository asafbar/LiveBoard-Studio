const { MAX_RSS_CHARS } = require("./rssParser");

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

async function fetchRssDocument(feed, options = {}) {
    const fetchImpl = options.fetchImpl || globalThis.fetch;
    const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    let current = feed.url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const url = assertFeedUrl(current, feed.redirectHosts);
        let response;

        try {
            response = await fetchImpl(url, {
                method: "GET",
                redirect: "manual",
                headers: {
                    Accept: "application/rss+xml, application/xml, text/xml"
                },
                signal: AbortSignal.timeout(timeoutMs)
            });
        } catch (error) {
            if (isTimeout(error)) {
                throw fetchError("timeout", "News feed timed out.");
            }

            throw fetchError("unavailable", "News feed is unavailable.");
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");

            if (hop === MAX_REDIRECTS || typeof location !== "string" || location.trim() === "") {
                throw fetchError("redirect", "News feed redirect was rejected.");
            }

            current = new URL(location, url).toString();
            continue;
        }

        if (!response.ok) {
            throw fetchError("http", "News feed returned an error.");
        }

        if (!isXmlContent(response.headers.get("content-type"))) {
            throw fetchError("invalid", "News feed did not return XML.");
        }

        return readBody(response);
    }

    throw fetchError("redirect", "News feed redirect was rejected.");
}

function assertFeedUrl(value, redirectHosts) {
    let url;

    try {
        url = new URL(value);
    } catch (error) {
        throw fetchError("invalid-url", "News feed URL is not allowed.");
    }

    const hostname = url.hostname.toLowerCase();

    if (
        url.protocol !== "https:"
        || url.username !== ""
        || url.password !== ""
        || (url.port !== "" && url.port !== "443")
        || !redirectHosts.includes(hostname)
        || isPrivateOrLocal(hostname)
    ) {
        throw fetchError("invalid-url", "News feed URL is not allowed.");
    }

    return url;
}

function isPrivateOrLocal(hostname) {
    const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");

    if (lower === "localhost" || lower.endsWith(".localhost") || lower.endsWith(".local")) {
        return true;
    }

    if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) {
        return true;
    }

    const match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

    if (match === null) {
        return false;
    }

    const parts = match.slice(1).map((part) => Number(part));

    if (parts.some((part) => part > 255)) {
        return true;
    }

    const [first, second] = parts;

    return first === 0
        || first === 10
        || first === 127
        || (first === 169 && second === 254)
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168)
        || (first === 100 && second >= 64 && second <= 127);
}

function isXmlContent(contentType) {
    if (typeof contentType !== "string") {
        return false;
    }

    const type = contentType.toLowerCase();

    return type.includes("xml");
}

async function readBody(response) {
    let text;

    try {
        text = await response.text();
    } catch (error) {
        throw fetchError("invalid", "News feed response could not be read.");
    }

    if (text.length > MAX_RSS_CHARS) {
        throw fetchError("invalid", "News feed response is too large.");
    }

    return text;
}

function isTimeout(error) {
    return error !== null
        && typeof error === "object"
        && (error.name === "TimeoutError" || error.name === "AbortError");
}

function fetchError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

module.exports = {
    DEFAULT_TIMEOUT_MS,
    assertFeedUrl,
    fetchRssDocument
};
