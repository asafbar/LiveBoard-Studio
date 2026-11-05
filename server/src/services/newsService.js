const { createHttpError } = require("../utils/httpError");
const { createNewsCache } = require("./news/newsCache");
const { fetchRssDocument } = require("./news/rssFetch");
const { parseRss } = require("./news/rssParser");
const { sampleHeadlines } = require("./news/sampleHeadlines");
const { fetchUsgsEvents } = require("./news/usgsFeed");
const { MAX_STORED_ITEMS, findNewsFeed } = require("./news/newsSources");

const SAMPLE_CATEGORIES = ["israel", "breaking", "business", "technology"];
const USGS_FRESH_TTL_MS = 5 * 60 * 1000;

function createNewsService(options = {}) {
    const liveFeeds = options.liveFeeds === true;
    const cache = options.cache || createNewsCache();
    const usgsCache = options.usgsCache || createNewsCache({
        freshTtlMs: USGS_FRESH_TTL_MS
    });
    const fetchFeed = options.fetchFeed || fetchRssDocument;
    const fetchUsgs = options.fetchUsgs || fetchUsgsEvents;
    const now = options.now || (() => new Date().toISOString());

    async function getHeadlines(query) {
        if (query.source === "sample") {
            if (!SAMPLE_CATEGORIES.includes(query.category)) {
                throw unavailablePairing();
            }

            return sampleHeadlines(query.category, query.limit, now());
        }

        if (query.source === "usgs") {
            if (query.category !== "earthquakes") {
                throw unavailablePairing();
            }

            return readUsgs(query.limit);
        }

        const feed = findNewsFeed(query.source, query.category);

        if (feed === null) {
            throw unavailablePairing();
        }

        if (!liveFeeds) {
            throw createHttpError(403, "Live news feeds are disabled.", [{
                path: "source",
                message: "Live news feeds stay disabled until permitted use is approved."
            }]);
        }

        const key = `${feed.source}:${feed.category}`;

        try {
            const result = await cache.readThrough(key, async () => {
                const xml = await fetchFeed(feed);
                const items = parseRss(xml, feed).slice(0, MAX_STORED_ITEMS);

                return {
                    publisher: feed.publisher,
                    attribution: feed.attribution,
                    items
                };
            });

            return livePayload(feed.source, feed.category, result, query.limit);
        } catch (error) {
            if (Number.isInteger(error.statusCode)) {
                throw error;
            }

            throw unavailable(error);
        }
    }

    async function readUsgs(limit) {
        try {
            const result = await usgsCache.readThrough("usgs:earthquakes", fetchUsgs);

            return livePayload("usgs", "earthquakes", result, limit);
        } catch (error) {
            if (Number.isInteger(error.statusCode)) {
                throw error;
            }

            throw unavailable(error);
        }
    }

    async function probeFeed(source, category) {
        if (!liveFeeds) {
            throw createHttpError(403, "Live news feeds are disabled.", [{
                path: "source",
                message: "Live news feeds stay disabled until permitted use is approved."
            }]);
        }

        const feed = findNewsFeed(source, category);

        if (feed === null) {
            throw createHttpError(400, "Validation failed.", [{
                path: "category",
                message: "This source and category are not available."
            }]);
        }

        const xml = await fetchFeed(feed);
        const items = parseRss(xml, feed);

        return {
            source,
            category,
            mode: "live",
            itemCount: items.length,
            hebrewTitles: items.filter((item) => {
                return /[\u0590-\u05FF]/.test(item.title);
            }).length
        };
    }

    return {
        getHeadlines,
        probeFeed
    };
}

function livePayload(source, category, result, limit) {
    return {
        mode: "live",
        status: result.status,
        source,
        category,
        fetchedAt: result.fetchedAt,
        attribution: result.headlines.attribution,
        items: result.headlines.items.slice(0, limit)
    };
}

function unavailablePairing() {
    return createHttpError(400, "Validation failed.", [{
        path: "category",
        message: "This source and category are not available."
    }]);
}

function unavailable(error) {
    const code = error !== null && typeof error === "object" && typeof error.code === "string"
        ? error.code
        : "unknown";

    console.error(`News feed request failed (${code}).`);

    const httpError = createHttpError(503, "News is temporarily unavailable.");
    httpError.expose = true;
    return httpError;
}

const newsService = createNewsService({
    liveFeeds: process.env.NEWS_LIVE_FEEDS === "true"
});

module.exports = {
    createNewsService,
    getHeadlines: newsService.getHeadlines,
    probeFeed: newsService.probeFeed
};
