import type { NewsPreset, NewsTickerMotion } from "../types/boardTypes.ts";

const defaultNewsScrollSpeed = 48;
const minimumNewsScrollSpeed = 20;
const maximumNewsScrollSpeed = 160;
const newsCardFadeMs = 900;

type TickerPlayback = "running" | "paused" | "static";

function resolveTickerMotion(value: NewsTickerMotion | undefined): NewsTickerMotion {
    return value === "scroll" ? "scroll" : "slide";
}

function resolveNewsScrollSpeed(value: number | undefined): number {
    if (!Number.isInteger(value)) {
        return defaultNewsScrollSpeed;
    }

    return Math.min(maximumNewsScrollSpeed, Math.max(minimumNewsScrollSpeed, value ?? defaultNewsScrollSpeed));
}

function shouldRotateHeadlines(preset: NewsPreset, motion: NewsTickerMotion): boolean {
    if (preset === "cards") {
        return true;
    }

    return preset === "ticker" && motion === "slide";
}

function scrollTravelSeconds(widthPx: number, speedPxPerSecond: number): number {
    if (widthPx <= 0 || speedPxPerSecond <= 0) {
        return 0;
    }

    return widthPx / speedPxPerSecond;
}

function resolveScrollDirection(
    value: "ltr" | "rtl" | undefined,
    textDirection: "ltr" | "rtl",
): "ltr" | "rtl" {
    return value === "ltr" || value === "rtl" ? value : textDirection;
}

function scrollTravel(direction: "ltr" | "rtl"): "left" | "right" {
    return direction === "rtl" ? "left" : "right";
}

function tickerPlayback(hidden: boolean, reducedMotion: boolean): TickerPlayback {
    if (reducedMotion) {
        return "static";
    }

    if (hidden) {
        return "paused";
    }

    return "running";
}

export type { TickerPlayback };
export {
    defaultNewsScrollSpeed,
    maximumNewsScrollSpeed,
    minimumNewsScrollSpeed,
    newsCardFadeMs,
    resolveNewsScrollSpeed,
    resolveScrollDirection,
    resolveTickerMotion,
    scrollTravel,
    scrollTravelSeconds,
    shouldRotateHeadlines,
    tickerPlayback,
};
