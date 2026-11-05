import type { NewsCategory, NewsSource } from "../types/boardTypes.ts";

type NewsAttribution = {
    text: string;
    url: string | null;
};

type NewsHeadline = {
    id: string;
    title: string;
    publisher: string;
    publishedAt: string;
    category: NewsCategory;
    source: NewsSource;
    articleUrl: string | null;
    attribution: NewsAttribution;
};

type NewsPayload = {
    mode: "sample" | "live";
    status: "fresh" | "stale";
    source: NewsSource;
    category: NewsCategory;
    fetchedAt: string;
    attribution: NewsAttribution;
    items: NewsHeadline[];
};

function readNewsPayload(body: unknown): NewsPayload | null {
    const data = readData(body);
    const mode = data?.mode;
    const status = data?.status;
    const source = data?.source;
    const category = data?.category;
    const fetchedAt = data?.fetchedAt;

    if (
        data === null
        || (mode !== "sample" && mode !== "live")
        || (status !== "fresh" && status !== "stale")
        || (source !== "sample" && source !== "usgs")
        || !isCategory(category)
        || typeof fetchedAt !== "string"
        || (mode === "sample" && source !== "sample")
        || (mode === "live" && source !== "usgs")
        || (source === "usgs" && category !== "earthquakes")
        || (source === "sample" && category === "earthquakes")
    ) {
        return null;
    }

    const attribution = readAttribution(data.attribution);

    if (attribution === null || !Array.isArray(data.items)) {
        return null;
    }

    const items: NewsHeadline[] = [];

    for (const item of data.items) {
        const headline = readHeadline(item, source, category);

        if (headline === null) {
            return null;
        }

        items.push(headline);
    }

    return {
        mode,
        status,
        source,
        category,
        fetchedAt,
        attribution,
        items,
    };
}

function readHeadline(value: unknown, source: NewsSource, category: NewsCategory): NewsHeadline | null {
    const record = readRecord(value);
    const attribution = record === null ? null : readAttribution(record.attribution);
    const title = record === null ? null : readPlainTitle(record.title);
    const publisher = record === null ? null : readPlainTitle(record.publisher);
    const id = record === null ? null : readPlainTitle(record.id);
    const publishedAt = record?.publishedAt;

    if (
        record === null
        || attribution === null
        || title === null
        || publisher === null
        || id === null
        || record.source !== source
        || record.category !== category
        || typeof publishedAt !== "string"
        || !acceptedArticleUrl(source, record.articleUrl)
        || (source === "usgs" && publisher !== "USGS")
    ) {
        return null;
    }

    return {
        id,
        title,
        publisher,
        publishedAt,
        category,
        source,
        articleUrl: source === "usgs" && typeof record.articleUrl === "string" ? record.articleUrl : null,
        attribution,
    };
}

function acceptedArticleUrl(source: NewsSource, value: unknown): boolean {
    if (source === "sample") {
        return value === null;
    }

    if (typeof value !== "string") {
        return false;
    }

    try {
        const url = new URL(value);

        return url.protocol === "https:"
            && url.username === ""
            && url.password === ""
            && (url.port === "" || url.port === "443")
            && url.hostname === "earthquake.usgs.gov";
    } catch {
        return false;
    }
}

function readAttribution(value: unknown): NewsAttribution | null {
    const record = readRecord(value);
    const text = record === null ? null : readPlainTitle(record.text);

    if (record === null || text === null) {
        return null;
    }

    if (record.url === null) {
        return {
            text,
            url: null,
        };
    }

    if (typeof record.url !== "string" || !acceptedArticleUrl("usgs", record.url)) {
        return null;
    }

    return {
        text,
        url: record.url,
    };
}

function readPlainTitle(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const text = value.replace(/\s+/g, " ").trim();

    if (text.length === 0 || text.length > 180 || /[<>]/.test(text)) {
        return null;
    }

    return text;
}

function isCategory(value: unknown): value is NewsCategory {
    return value === "israel"
        || value === "breaking"
        || value === "business"
        || value === "technology"
        || value === "earthquakes";
}

function readData(body: unknown): Record<string, unknown> | null {
    const record = readRecord(body);

    if (record === null || record.success !== true) {
        return null;
    }

    return readRecord(record.data);
}

function readRecord(value: unknown): Record<string, unknown> | null {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

export type { NewsAttribution, NewsHeadline, NewsPayload };
export { readNewsPayload };
