import type { NewsRefreshMinutes } from "../types/boardTypes.ts";

const newsRefreshChoices: readonly NewsRefreshMinutes[] = [10, 30, 60, 1440];
const defaultNewsRefreshMinutes: NewsRefreshMinutes = 30;

function resolveNewsRefreshMinutes(value: number | undefined): NewsRefreshMinutes {
    if (value !== undefined && newsRefreshChoices.includes(value as NewsRefreshMinutes)) {
        return value as NewsRefreshMinutes;
    }

    return defaultNewsRefreshMinutes;
}

export { defaultNewsRefreshMinutes, newsRefreshChoices, resolveNewsRefreshMinutes };
