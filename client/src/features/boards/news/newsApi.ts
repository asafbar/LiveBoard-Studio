import type { NewsCategory, NewsSource } from "../types/boardTypes.ts";
import apiClient from "../../../api/apiClient.ts";
import { readNewsPayload, type NewsHeadline, type NewsPayload } from "./newsPayload.ts";

class NewsRequestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NewsRequestError";
    }
}

async function getNewsHeadlines(
    source: NewsSource,
    category: NewsCategory,
    limit: number,
    signal: AbortSignal,
): Promise<NewsPayload> {
    if (source !== "sample" && source !== "usgs") {
        throw new NewsRequestError("This news source is not available.");
    }

    const response = await apiClient.get<unknown>("/api/news", {
        params: {
            source,
            category,
            limit: String(limit),
        },
        signal,
    });
    const payload = readNewsPayload(response.data);

    if (payload === null) {
        throw new NewsRequestError("News response was invalid.");
    }

    return payload;
}

export type { NewsHeadline, NewsPayload };
export { NewsRequestError, getNewsHeadlines, readNewsPayload };
