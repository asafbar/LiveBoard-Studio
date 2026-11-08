import assert from "node:assert/strict";
import test from "node:test";
import type { Board } from "../types/boardTypes.ts";
import { createWidget } from "../../editor/createWidget.ts";
import { createDraftHistory, recordDraftChange, redoDraft, undoDraft } from "../../editor/draftHistory.ts";
import { applyWeatherSettings, updateWeatherSettings } from "../../editor/weatherSettings.ts";
import {
    initialWeatherStyleSections,
    toggleWeatherStyleSection,
    weatherStyleSections,
} from "../../editor/weatherStyleSections.ts";
import { defaultWeatherSettings } from "./weatherDefaults.ts";
import {
    effectiveTitleSpacing,
} from "./weatherPresentation.ts";
import { createWeatherLoadGate, startWeatherLoad } from "./weatherLoad.ts";
import {
    createWeatherRefreshController,
    legacyWeatherRefreshMinutes,
    newWeatherRefreshMinutes,
    nextWeatherRefreshDelayMs,
    resolveWeatherRefreshMinutes,
    weatherForecastRequestKey,
    weatherRefreshChoices,
    type WeatherTimerApi,
} from "./weatherSchedule.ts";

test("keeps title spacing at the current preset gap until a value is saved", () => {
    assert.equal(effectiveTitleSpacing(defaultWeatherSettings), 10);
    assert.equal(effectiveTitleSpacing({ ...defaultWeatherSettings, preset: "minimal" }), 5);
    assert.equal(effectiveTitleSpacing({ ...defaultWeatherSettings, preset: "horizontal" }), 22);
    assert.equal(effectiveTitleSpacing({ ...defaultWeatherSettings, preset: "forecast" }), 0);
    assert.equal(effectiveTitleSpacing({ ...defaultWeatherSettings, layout: "expanded" }), 13);
    assert.equal(effectiveTitleSpacing({ ...defaultWeatherSettings, titleSpacing: 12 }), 12);

    const cleared = applyWeatherSettings(
        { ...defaultWeatherSettings, titleSpacing: 12 },
        { titleSpacing: null },
    );
    assert.equal(cleared.titleSpacing, undefined);
    assert.equal(effectiveTitleSpacing(cleared), 10);
});

test("uses 30 minutes for a new widget and 10 minutes for a saved widget", () => {
    assert.deepEqual(weatherRefreshChoices, [10, 30, 60, 1440]);
    assert.equal(legacyWeatherRefreshMinutes, 10);
    assert.equal(newWeatherRefreshMinutes, 30);
    assert.equal(resolveWeatherRefreshMinutes(undefined), 10);
    assert.equal(resolveWeatherRefreshMinutes(30), 30);
    assert.equal(resolveWeatherRefreshMinutes(15), 10);

    const board: Board = {
        id: "board-1",
        name: "Fixture",
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets: [],
    };
    const widget = createWidget("weather", board);

    assert.equal(widget.type, "weather");
    if (widget.type !== "weather") {
        return;
    }

    assert.equal(widget.settings.refreshIntervalMinutes, 30);
    assert.equal(widget.settings.titleSpacing, undefined);
    assert.equal("temperature" in widget.settings, false);
});

test("retries a failed refresh soon and does not wait for a daily interval", () => {
    assert.equal(nextWeatherRefreshDelayMs(0, 10), 10 * 60 * 1000);
    assert.equal(nextWeatherRefreshDelayMs(0, 30), 30 * 60 * 1000);
    assert.equal(nextWeatherRefreshDelayMs(0, 60), 60 * 60 * 1000);
    assert.equal(nextWeatherRefreshDelayMs(0, 1440), 1440 * 60 * 1000);
    assert.equal(nextWeatherRefreshDelayMs(1, 1440), 60 * 1000);
    assert.equal(nextWeatherRefreshDelayMs(2, 1440), 2 * 60 * 1000);
    assert.equal(nextWeatherRefreshDelayMs(3, 1440), 5 * 60 * 1000);
    assert.equal(nextWeatherRefreshDelayMs(8, 1440), 15 * 60 * 1000);
});

test("clears the refresh timer, skips hidden requests, and resumes when due", async () => {
    const timers: { id: number; delay: number; callback: () => void }[] = [];
    let nextId = 1;
    let now = 1_000;
    let hidden = false;
    let loads = 0;
    const api: WeatherTimerApi = {
        set(callback, delay) {
            const id = nextId;
            nextId += 1;
            timers.push({ id, delay, callback });
            return id;
        },
        clear(id) {
            const index = timers.findIndex((timer) => timer.id === id);

            if (index >= 0) {
                timers.splice(index, 1);
            }
        },
        hidden: () => hidden,
        now: () => now,
    };
    const refresh = createWeatherRefreshController({
        refreshMinutes: 30,
        timers: api,
        load: async () => {
            loads += 1;
            return "success";
        },
    });

    hidden = true;
    refresh.start();
    await flush();
    assert.equal(loads, 0);

    hidden = false;
    refresh.onVisibility();
    await flush();
    assert.equal(loads, 1);
    assert.equal(timers.length, 1);
    assert.equal(timers[0]?.delay, 30 * 60 * 1000);

    refresh.stop();
    assert.equal(timers.length, 0);

    const retry = createWeatherRefreshController({
        refreshMinutes: 1440,
        timers: api,
        load: async () => {
            loads += 1;
            return "failure";
        },
    });
    loads = 0;
    retry.start();
    await flush();
    assert.equal(loads, 1);
    assert.equal(timers[0]?.delay, 60 * 1000);
    retry.stop();

    const resume = createWeatherRefreshController({
        refreshMinutes: 30,
        timers: api,
        load: async () => {
            loads += 1;
            return "success";
        },
    });
    loads = 0;
    resume.start();
    await flush();
    hidden = true;
    resume.onVisibility();
    assert.equal(timers.length, 0);
    now += 60 * 1000;
    hidden = false;
    resume.onVisibility();
    await flush();
    assert.equal(loads, 1);
    now += 30 * 60 * 1000;
    resume.onVisibility();
    await flush();
    assert.equal(loads, 2);
    resume.stop();
});

test("shares one forecast request key and keeps widget loads independent", () => {
    const first = weatherForecastRequestKey(32.08088, 34.78057, "celsius");
    const second = weatherForecastRequestKey(32.08088, 34.78057, "celsius");

    assert.equal(first, second);
    assert.equal(first.includes("widget"), false);
    assert.notEqual(weatherForecastRequestKey(32.08088, 34.78057, "fahrenheit"), first);

    const saved = applyWeatherSettings(defaultWeatherSettings, {
        refreshIntervalMinutes: 60,
        titleSpacing: 8,
    });
    assert.equal(saved.refreshIntervalMinutes, 60);
    assert.equal(saved.titleSpacing, 8);
    assert.equal(applyWeatherSettings(saved, { refreshIntervalMinutes: 15 }).refreshIntervalMinutes, 60);

    const left = createWeatherLoadGate();
    const right = createWeatherLoadGate();
    assert.equal(startWeatherLoad(left), 1);
    assert.equal(startWeatherLoad(right), 1);
});

test("undo and redo restore weather title spacing and refresh changes", () => {
    const board: Board = {
        id: "board-1",
        name: "Fixture",
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets: [],
    };
    const created = createWidget("weather", board);
    const present: Board = {
        ...board,
        widgets: [created],
    };
    const changed = updateWeatherSettings(present, created.id, {
        titleSpacing: 16,
        refreshIntervalMinutes: 60,
        direction: "rtl",
        align: "left",
        titleAlign: "right",
    });
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, changed);

    assert.notEqual(undone, null);
    if (undone === null || undone.present.widgets[0]?.type !== "weather" || changed.widgets[0]?.type !== "weather") {
        return;
    }

    assert.equal(changed.widgets[0].settings.titleSpacing, 16);
    assert.equal(changed.widgets[0].settings.refreshIntervalMinutes, 60);
    assert.equal(undone.present.widgets[0].settings.titleSpacing, undefined);
    assert.equal(undone.present.widgets[0].settings.refreshIntervalMinutes, 30);
    assert.equal(undone.present.widgets[0].settings.direction, undefined);

    const redone = redoDraft(undone.history, undone.present);
    assert.notEqual(redone, null);
    if (redone === null || redone.present.widgets[0]?.type !== "weather") {
        return;
    }

    assert.equal(redone.present.widgets[0].settings.titleAlign, "right");
    assert.equal(redone.present.widgets[0].settings.align, "left");
    assert.equal(redone.present.widgets[0].settings.direction, "rtl");
});

test("opens design settings first and keeps other sections open together", () => {
    assert.deepEqual(weatherStyleSections.map((section) => section.label), [
        "Design & Layout",
        "Title & Typography",
        "Weather Content",
        "Colors & Background",
        "Live Updates",
    ]);

    const initial = initialWeatherStyleSections();
    assert.equal(initial.design, true);
    assert.equal(initial.title, false);
    assert.equal(initial.updates, false);

    const withTitle = toggleWeatherStyleSection(initial, "title");
    assert.equal(withTitle.design, true);
    assert.equal(withTitle.title, true);

    const withUpdates = toggleWeatherStyleSection(withTitle, "updates");
    assert.equal(withUpdates.design, true);
    assert.equal(withUpdates.title, true);
    assert.equal(withUpdates.updates, true);

    const closedDesign = toggleWeatherStyleSection(withUpdates, "design");
    assert.equal(closedDesign.design, false);
    assert.equal(closedDesign.title, true);
});

async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}
