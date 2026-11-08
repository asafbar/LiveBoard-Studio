import assert from "node:assert/strict";
import test from "node:test";
import type { Board } from "../types/boardTypes.ts";
import { createWidget } from "../../editor/createWidget.ts";
import { createDraftHistory, recordDraftChange, redoDraft, undoDraft } from "../../editor/draftHistory.ts";
import { backgroundLayerOpacity, effectiveOpacityPercent } from "../../editor/colorAlpha.ts";
import { applyNewsSettings, updateNewsSettings } from "../../editor/newsSettings.ts";
import { initialNewsStyleSections, toggleNewsStyleSection } from "../../editor/newsStyleSections.ts";
import { defaultNewsSettings } from "./newsDefaults.ts";
import { readNewsPayload } from "./newsPayload.ts";
import {
    newsPresetLabel,
    newsSourceStatusMessage,
    newsStatusMessage,
    resolveNewsAlign,
    resolveNewsDirection,
} from "./newsPresentation.ts";
import { createHeadlineRotation } from "./newsRotation.ts";
import {
    newsCardFadeMs,
    resolveNewsScrollSpeed,
    resolveScrollDirection,
    resolveTickerMotion,
    scrollTravel,
    scrollTravelSeconds,
    shouldRotateHeadlines,
    tickerPlayback,
} from "./newsMotion.ts";
import { resolveNewsRefreshMinutes } from "./newsSchedule.ts";
import { createWeatherRefreshController } from "../weather/weatherSchedule.ts";

const board: Board = {
    id: "board-1",
    name: "News fixture",
    width: 1920,
    height: 1080,
    background: { type: "solid", color: "#000000" },
    widgets: [],
};

test("creates a live USGS news widget without stored events", () => {
    const widget = createWidget("news", board);

    assert.equal(widget.type, "news");

    if (widget.type !== "news") {
        return;
    }

    assert.equal(widget.settings.source, "usgs");
    assert.equal(widget.settings.category, "earthquakes");
    assert.equal(widget.settings.direction, "ltr");
    assert.equal(widget.settings.refreshIntervalMinutes, 30);
    assert.equal(widget.settings.preset, "ticker");
    assert.equal(widget.settings.tickerMotion, "scroll");
    assert.equal(widget.settings.scrollDirection, "ltr");
    assert.equal(widget.settings.scrollSpeed, 48);
    assert.equal(JSON.stringify(widget.settings).includes("items"), false);
    assert.equal(JSON.stringify(widget.settings).includes("articleUrl"), false);
    assert.equal(JSON.stringify(widget).includes("headline"), false);
});

test("keeps the three presets distinct and preserves Hebrew direction", () => {
    assert.equal(newsPresetLabel("ticker"), "Headline Ticker");
    assert.equal(newsPresetLabel("cards"), "News Cards");
    assert.equal(newsPresetLabel("list"), "News List");
    assert.equal(resolveNewsDirection({ ...defaultNewsSettings, source: "sample", category: "israel", direction: "rtl" }, "לוח חדשות"), "rtl");
    assert.equal(resolveNewsDirection(defaultNewsSettings, "לוח חדשות"), "ltr");
    assert.equal(resolveNewsDirection({ ...defaultNewsSettings, direction: "ltr" }, "לוח חדשות"), "ltr");
    assert.equal(resolveNewsDirection({ ...defaultNewsSettings, direction: "auto" }, "Studio update"), "ltr");
    assert.equal(resolveNewsDirection({ ...defaultNewsSettings, direction: "auto" }, "כותרת"), "rtl");
    assert.equal(resolveNewsAlign("left"), "left");
    assert.equal(resolveNewsAlign(undefined), "right");
});

test("describes loading, empty, and unavailable headlines", () => {
    assert.equal(newsStatusMessage("loading", 0), "טוען כותרות");
    assert.equal(newsStatusMessage("ready", 0), "אין כותרות");
    assert.equal(newsStatusMessage("unavailable", 0), "הכותרות אינן זמינות");
    assert.equal(newsStatusMessage("unavailable", 2), null);
    assert.equal(newsSourceStatusMessage("usgs", "loading", 0), "Loading earthquakes");
    assert.equal(newsSourceStatusMessage("usgs", "ready", 0), "No recent earthquakes");
    assert.equal(newsSourceStatusMessage("usgs", "unavailable", 0), "Earthquake updates are unavailable");
    assert.equal(newsSourceStatusMessage("sample", "loading", 0), "טוען כותרות");
});

test("rotates headlines and clears the timer when hidden or stopped", () => {
    const timers: { id: number; callback: () => void }[] = [];
    let hidden = false;
    let nextId = 1;
    const indexes: number[] = [];
    const rotation = createHeadlineRotation({
        count: 3,
        intervalMs: 8000,
        timers: {
            set(callback) {
                const id = nextId;
                nextId += 1;
                timers.push({ id, callback });
                return id;
            },
            clear(id) {
                const index = timers.findIndex((timer) => timer.id === id);

                if (index >= 0) {
                    timers.splice(index, 1);
                }
            },
            hidden: () => hidden,
        },
        onIndex(index) {
            indexes.push(index);
        },
    });

    rotation.start();
    assert.deepEqual(indexes, [0]);
    assert.equal(timers.length, 1);
    timers[0]?.callback();
    assert.deepEqual(indexes, [0, 1]);
    hidden = true;
    rotation.onVisibility();
    assert.equal(timers.length, 0);
    rotation.stop();
    assert.equal(timers.length, 0);
});

test("schedules a 30 minute refresh and accepts the supported intervals", async () => {
    assert.equal(resolveNewsRefreshMinutes(undefined), 30);
    assert.equal(resolveNewsRefreshMinutes(10), 10);
    assert.equal(resolveNewsRefreshMinutes(60), 60);
    assert.equal(resolveNewsRefreshMinutes(1440), 1440);
    assert.equal(resolveNewsRefreshMinutes(15), 30);

    let delay = 0;
    const refresh = createWeatherRefreshController({
        refreshMinutes: resolveNewsRefreshMinutes(undefined),
        timers: {
            set(_callback, nextDelay) {
                delay = nextDelay;
                return 1;
            },
            clear() {
                delay = 0;
            },
            hidden: () => false,
            now: () => 1_000,
        },
        load: async () => "success",
    });

    refresh.start();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(delay, 30 * 60 * 1000);
    refresh.stop();
});

test("keeps style sections independent and restores settings with undo", () => {
    const opened = toggleNewsStyleSection(initialNewsStyleSections(), "updates");

    assert.equal(opened.design, true);
    assert.equal(opened.updates, true);
    assert.equal(initialNewsStyleSections().content, false);

    const widget = createWidget("news", board);

    if (widget.type !== "news") {
        return;
    }

    const present = {
        ...board,
        widgets: [widget],
    };
    const changed = updateNewsSettings(present, widget.id, {
        preset: "cards",
        category: "technology",
        direction: "ltr",
        align: "left",
        title: "חדשות לדוגמה",
    });
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, changed);

    assert.equal(changed.widgets[0]?.type === "news" ? changed.widgets[0].settings.preset : "", "cards");
    assert.equal(undone?.present.widgets[0]?.type === "news" ? undone.present.widgets[0].settings.category : "", "earthquakes");
    assert.equal(JSON.stringify(changed).includes("\"items\""), false);

    const saved = applyNewsSettings(widget.settings, { maxHeadlines: 3, rotationSeconds: 12 });

    assert.equal(saved.maxHeadlines, 3);
    assert.equal(saved.rotationSeconds, 12);
    assert.equal(Object.hasOwn(saved, "items"), false);
});

test("scrolls a full Hebrew line, keeps saved slide behavior, and pauses motion", () => {
    const saved = {
        ...defaultNewsSettings,
        tickerMotion: undefined,
        scrollSpeed: undefined,
    };

    assert.equal(resolveTickerMotion(saved.tickerMotion), "slide");
    assert.equal(resolveTickerMotion("scroll"), "scroll");
    assert.equal(shouldRotateHeadlines("ticker", "scroll"), false);
    assert.equal(shouldRotateHeadlines("ticker", "slide"), true);
    assert.equal(shouldRotateHeadlines("cards", "scroll"), true);
    assert.equal(shouldRotateHeadlines("list", "slide"), false);
    assert.equal(scrollTravel("rtl"), "left");
    assert.equal(scrollTravel("ltr"), "right");
    assert.equal(scrollTravelSeconds(960, 48), 20);
    assert.equal(resolveNewsScrollSpeed(undefined), 48);
    assert.equal(resolveNewsScrollSpeed(12), 20);
    assert.equal(resolveNewsScrollSpeed(80), 80);
    assert.equal(tickerPlayback(true, false), "paused");
    assert.equal(tickerPlayback(false, true), "static");
    assert.equal(tickerPlayback(false, false), "running");
    assert.equal(newsCardFadeMs >= 800, true);

    const scrolled = applyNewsSettings(saved, { tickerMotion: "scroll", scrollSpeed: 64 });
    const reset = applyNewsSettings(scrolled, { tickerMotion: null, scrollSpeed: null });

    assert.equal(scrolled.tickerMotion, "scroll");
    assert.equal(scrolled.scrollSpeed, 64);
    assert.equal(reset.tickerMotion, undefined);
    assert.equal(reset.scrollSpeed, undefined);
    assert.equal(reset.rotationSeconds, saved.rotationSeconds);
});

test("keeps scroll direction independent of Hebrew text direction", () => {
    const saved = {
        ...defaultNewsSettings,
        scrollDirection: undefined,
        direction: "rtl" as const,
    };

    assert.equal(resolveScrollDirection(saved.scrollDirection, "rtl"), "rtl");
    assert.equal(resolveScrollDirection(undefined, "ltr"), "ltr");
    assert.equal(resolveScrollDirection("ltr", "rtl"), "ltr");
    assert.equal(scrollTravel(resolveScrollDirection("ltr", "rtl")), "right");

    const moved = applyNewsSettings(saved, { scrollDirection: "ltr", direction: "rtl" });
    const cleared = applyNewsSettings(moved, { scrollDirection: null });

    assert.equal(moved.scrollDirection, "ltr");
    assert.equal(moved.direction, "rtl");
    assert.equal(cleared.scrollDirection, undefined);
    assert.equal(cleared.direction, "rtl");
});

test("changes background opacity without rewriting the saved color", () => {
    const existing = {
        ...defaultNewsSettings,
        backgroundColor: "#102030",
        backgroundOpacity: 40,
    };
    const changed = applyNewsSettings(existing, { backgroundOpacity: 15 });
    const reset = applyNewsSettings(existing, { backgroundOpacity: null });

    assert.equal(changed.backgroundColor, "#102030");
    assert.equal(changed.backgroundOpacity, 15);
    assert.equal(changed.backgroundColor.includes("15"), false);
    assert.equal(effectiveOpacityPercent(changed.backgroundOpacity), 15);
    assert.equal(backgroundLayerOpacity(changed.backgroundOpacity), 0.15);
    assert.equal(reset.backgroundColor, "#102030");
    assert.equal(reset.backgroundOpacity, undefined);
    assert.equal(effectiveOpacityPercent(undefined), 100);
    assert.equal(backgroundLayerOpacity(undefined), 1);
});

test("changes text opacity without changing the background or stored color", () => {
    const existing = {
        ...defaultNewsSettings,
        backgroundColor: "#102030",
        backgroundOpacity: 40,
        textColor: "var(--foreground)",
        accentColor: "var(--cyan)",
    };
    const changed = applyNewsSettings(existing, {
        textOpacity: 25,
        titleOpacity: 50,
        accentOpacity: 75,
    });
    const reset = applyNewsSettings(changed, {
        textOpacity: null,
        titleOpacity: null,
        accentOpacity: null,
        backgroundOpacity: null,
    });

    assert.equal(changed.backgroundColor, "#102030");
    assert.equal(changed.backgroundOpacity, 40);
    assert.equal(changed.textColor, "var(--foreground)");
    assert.equal(changed.textOpacity, 25);
    assert.equal(changed.titleOpacity, 50);
    assert.equal(changed.accentOpacity, 75);
    assert.equal(reset.textOpacity, undefined);
    assert.equal(reset.backgroundColor, "#102030");
    assert.equal(reset.textColor, "var(--foreground)");
});

test("undo and redo restore independent color opacity", () => {
    const widget = createWidget("news", board);

    if (widget.type !== "news") {
        return;
    }

    const present = {
        ...board,
        widgets: [widget],
    };
    const changed = updateNewsSettings(present, widget.id, {
        textOpacity: 25,
        backgroundOpacity: 50,
    });
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, changed);
    const redone = undone === null ? null : redoDraft(undone.history, undone.present);

    assert.equal(changed.widgets[0]?.type === "news" ? changed.widgets[0].settings.textOpacity : 0, 25);
    assert.equal(changed.widgets[0]?.type === "news" ? changed.widgets[0].settings.backgroundOpacity : 0, 50);
    assert.equal(changed.widgets[0]?.type === "news" ? changed.widgets[0].settings.backgroundColor : "", widget.settings.backgroundColor);
    assert.equal(undone?.present.widgets[0]?.type === "news" ? undone.present.widgets[0].settings.textOpacity : 0, undefined);
    assert.equal(undone?.present.widgets[0]?.type === "news" ? undone.present.widgets[0].settings.backgroundOpacity : 0, undefined);
    assert.equal(redone?.present.widgets[0]?.type === "news" ? redone.present.widgets[0].settings.textOpacity : 0, 25);
    assert.equal(redone?.present.widgets[0]?.type === "news" ? redone.present.widgets[0].settings.backgroundColor : "", widget.settings.backgroundColor);
});

test("keeps a saved sample widget independent from USGS earthquakes", () => {
    const saved = {
        ...defaultNewsSettings,
        source: "sample" as const,
        category: "israel" as const,
        direction: "rtl" as const,
        scrollDirection: "rtl" as const,
    };
    const styled = applyNewsSettings(saved, { maxHeadlines: 4, title: "חדשות לדוגמה" });
    const switched = applyNewsSettings(saved, { source: "usgs" });
    const restored = applyNewsSettings(switched, { source: "sample" });

    assert.equal(styled.source, "sample");
    assert.equal(styled.category, "israel");
    assert.equal(styled.direction, "rtl");
    assert.equal(Object.hasOwn(styled, "items"), false);
    assert.equal(switched.source, "usgs");
    assert.equal(switched.category, "earthquakes");
    assert.equal(switched.direction, "ltr");
    assert.equal(restored.category, "israel");
    assert.equal(applyNewsSettings(switched, { category: "technology" }).category, "earthquakes");
});

test("accepts a live USGS response and rejects sample headlines inside it", () => {
    const attribution = {
        text: "Earthquake data: U.S. Geological Survey. Past day, magnitude 2.5+.",
        url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
    };
    const item = {
        id: "us7000png1",
        title: "M 4.3 earthquake - 127 km SSW of Kokopo, Papua New Guinea",
        publisher: "USGS",
        publishedAt: "2026-11-04T12:14:45.921Z",
        category: "earthquakes",
        articleUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000png1",
        source: "usgs",
        attribution,
    };
    const accepted = readNewsPayload({
        success: true,
        data: {
            mode: "live",
            status: "fresh",
            source: "usgs",
            category: "earthquakes",
            fetchedAt: "2026-11-04T12:20:00.000Z",
            attribution,
            items: [item],
        },
    });
    const sampleInsideLive = readNewsPayload({
        success: true,
        data: {
            mode: "live",
            status: "fresh",
            source: "usgs",
            category: "earthquakes",
            fetchedAt: "2026-11-04T12:20:00.000Z",
            attribution,
            items: [{
                ...item,
                title: "כותרת לדוגמה",
                publisher: "LiveBoard Studio",
                source: "sample",
                category: "israel",
                articleUrl: null,
            }],
        },
    });
    const foreignUrl = readNewsPayload({
        success: true,
        data: {
            mode: "live",
            status: "fresh",
            source: "usgs",
            category: "earthquakes",
            fetchedAt: "2026-11-04T12:20:00.000Z",
            attribution,
            items: [{
                ...item,
                articleUrl: "https://example.com/quake",
            }],
        },
    });

    assert.equal(accepted?.mode, "live");
    assert.equal(accepted?.items[0]?.title.startsWith("M 4.3 earthquake"), true);
    assert.equal(accepted?.items[0]?.publishedAt, "2026-11-04T12:14:45.921Z");
    assert.equal(sampleInsideLive, null);
    assert.equal(foreignUrl, null);
    assert.equal(readNewsPayload({
        success: true,
        data: {
            mode: "sample",
            status: "fresh",
            source: "usgs",
            category: "earthquakes",
            fetchedAt: "2026-11-04T12:20:00.000Z",
            attribution,
            items: [item],
        },
    }), null);
});
