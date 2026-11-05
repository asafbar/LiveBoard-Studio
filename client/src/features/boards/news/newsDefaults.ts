import type { NewsWidgetSettings } from "../types/boardTypes.ts";
import { defaultNewsScrollSpeed } from "./newsMotion.ts";
import { defaultNewsRefreshMinutes } from "./newsSchedule.ts";

const defaultNewsSettings: NewsWidgetSettings = {
    source: "usgs",
    category: "earthquakes",
    preset: "ticker",
    maxHeadlines: 5,
    rotationSeconds: 8,
    tickerMotion: "scroll",
    scrollDirection: "ltr",
    scrollSpeed: defaultNewsScrollSpeed,
    refreshIntervalMinutes: defaultNewsRefreshMinutes,
    direction: "ltr",
    align: "right",
    backgroundColor: "color-mix(in srgb, var(--canvas-board) 86%, var(--foreground))",
    textColor: "var(--foreground)",
    accentColor: "var(--cyan)",
    borderRadius: 16,
};

export { defaultNewsSettings };
