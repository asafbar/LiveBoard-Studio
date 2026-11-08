import assert from "node:assert/strict";
import test from "node:test";
import type { Board } from "../types/boardTypes.ts";
import { createWidget } from "../../editor/createWidget.ts";
import { applyCountdownSettings, updateCountdownSettings } from "../../editor/countdownSettings.ts";
import { createDraftHistory, recordDraftChange, redoDraft, undoDraft } from "../../editor/draftHistory.ts";
import { defaultCountdownSettings } from "./countdownDefaults.ts";
import { countdownCompletionText, countdownUnitLabel, formatCountdownValue } from "./countdownPresentation.ts";
import {
    countdownRemaining,
    countdownTargetEpoch,
    createCountdownTicker,
    nextCountdownDelay,
    zonedWallTimeToEpoch,
} from "./countdownTime.ts";

const board: Board = {
    id: "board-1",
    name: "Countdown fixture",
    width: 1920,
    height: 1080,
    background: { type: "solid", color: "#000000" },
    widgets: [],
};

const allUnits = {
    showDays: true,
    showHours: true,
    showMinutes: true,
    showSeconds: true,
};

test("converts a winter and summer Jerusalem target without a fixed offset", () => {
    const winter = countdownTargetEpoch("2026-01-15", "12:00:00", "Asia/Jerusalem");
    const summer = countdownTargetEpoch("2026-07-15", "12:00:00", "Asia/Jerusalem");

    assert.equal(winter, Date.parse("2026-01-15T10:00:00.000Z"));
    assert.equal(summer, Date.parse("2026-07-15T09:00:00.000Z"));
});

test("converts New York standard time and daylight time", () => {
    const winter = countdownTargetEpoch("2026-01-15", "12:00:00", "America/New_York");
    const summer = countdownTargetEpoch("2026-07-15", "12:00:00", "America/New_York");

    assert.equal(winter, Date.parse("2026-01-15T17:00:00.000Z"));
    assert.equal(summer, Date.parse("2026-07-15T16:00:00.000Z"));
});

test("resolves a daylight-saving gap and the earlier overlap", () => {
    const gap = zonedWallTimeToEpoch({
        year: 2026,
        month: 3,
        day: 8,
        hour: 2,
        minute: 30,
        second: 0,
    }, "America/New_York");
    const overlap = countdownTargetEpoch("2026-11-01", "01:30:00", "America/New_York");
    const gapParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(gap ?? 0));

    assert.equal(gapParts, "03:30");
    assert.equal(overlap, Date.parse("2026-11-01T05:30:00.000Z"));
});

test("counts down from the current instant and never returns a negative value", () => {
    const target = Date.parse("2026-11-12T18:00:00.000Z");
    const before = countdownRemaining(target, target - (50 * 3600000) - 40000, {
        showDays: false,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
    });
    const lastMillisecond = countdownRemaining(target, target - 1, allUnits);
    const exact = countdownRemaining(target, target, allUnits);
    const after = countdownRemaining(target, target + 5000, allUnits);

    assert.equal(before.completed, false);
    assert.equal(before.hours, 50);
    assert.equal(before.minutes, 0);
    assert.equal(before.seconds, 40);
    assert.equal(lastMillisecond.completed, false);
    assert.equal(lastMillisecond.seconds, 0);
    assert.equal(exact.completed, true);
    assert.deepEqual([exact.days, exact.hours, exact.minutes, exact.seconds], [0, 0, 0, 0]);
    assert.equal(after.completed, true);
    assert.ok(after.days >= 0 && after.hours >= 0 && after.minutes >= 0 && after.seconds >= 0);
});

test("folds hidden units into the next visible unit", () => {
    const target = Date.parse("2026-11-12T18:00:00.000Z");
    const minutesOnly = countdownRemaining(target, target - (90 * 60000), {
        showDays: false,
        showHours: false,
        showMinutes: true,
        showSeconds: false,
    });

    assert.equal(minutesOnly.minutes, 90);
    assert.equal(minutesOnly.hours, 0);
});

test("uses the completion label after the target and keeps Hebrew copy for RTL", () => {
    const settings = defaultCountdownSettings(new Date("2026-11-01T00:00:00Z"));
    const hebrew = applyCountdownSettings(settings, {
        direction: "rtl",
        completionMessage: "האירוע התחיל",
    });

    assert.equal(countdownCompletionText(settings), "Complete");
    assert.equal(countdownCompletionText(hebrew), "האירוע התחיל");
    assert.equal(countdownUnitLabel("days", "rtl"), "ימים");
    assert.equal(formatCountdownValue(4), "04");
    assert.equal(formatCountdownValue(-3), "00");
});

test("schedules a one-second tick only when seconds are visible and clears it", () => {
    const timers: { id: number; callback: () => void }[] = [];
    let nextId = 1;
    let cancelled = 0;
    const ticks: number[] = [];
    const delays: number[] = [];
    let clock = 1500;
    const ticker = createCountdownTicker({
        showSeconds: true,
        now: () => clock,
        onTick: (value) => ticks.push(value),
        schedule: (callback, delay) => {
            delays.push(delay);
            const id = nextId;
            nextId += 1;
            timers.push({ id, callback });
            return id;
        },
        cancel: () => {
            cancelled += 1;
        },
        isHidden: () => false,
    });

    ticker.start();
    assert.deepEqual(delays, [500]);
    assert.equal(ticks.length, 0);
    clock = 9000;
    timers[0]?.callback();
    assert.deepEqual(ticks, [9000]);
    ticker.stop();
    assert.equal(cancelled, 1);
    timers[0]?.callback();
    assert.deepEqual(ticks, [9000]);
});

test("waits for the next minute when seconds are hidden and refreshes after sleep", () => {
    let delay = 0;
    let clock = 61000;
    let hidden = true;
    const ticks: number[] = [];
    const ticker = createCountdownTicker({
        showSeconds: false,
        now: () => clock,
        onTick: (value) => ticks.push(value),
        schedule: (callback, scheduledDelay) => {
            delay = scheduledDelay;
            return 7;
        },
        cancel: () => undefined,
        isHidden: () => hidden,
    });

    assert.equal(nextCountdownDelay(61000, false), 59000);
    ticker.start();
    assert.equal(delay, 0);
    hidden = false;
    clock = 180000;
    ticker.onVisibility();
    assert.deepEqual(ticks, [180000]);
    assert.equal(delay, 60000);
});

test("stores the target configuration and restores it through undo", () => {
    const widget = createWidget("countdown", board);

    assert.equal(widget.type, "countdown");

    if (widget.type !== "countdown") {
        return;
    }

    assert.equal(widget.settings.timeZone, "Asia/Jerusalem");
    assert.equal(widget.settings.preset, "digital");
    assert.equal("remaining" in widget.settings, false);
    const present = { ...board, widgets: [widget] };
    const changed = updateCountdownSettings(present, widget.id, {
        preset: "minimal",
        showSeconds: false,
        textOpacity: 25,
        completionMessage: "Started",
    });
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, changed);
    const redone = undone === null ? null : redoDraft(undone.history, undone.present);
    const saved = changed.widgets[0];

    assert.equal(saved?.type === "countdown" ? saved.settings.preset : "", "minimal");
    assert.equal(saved?.type === "countdown" ? saved.settings.showSeconds : true, false);
    assert.equal(saved?.type === "countdown" ? saved.settings.textOpacity : 0, 25);
    assert.equal(saved?.type === "countdown" ? saved.settings.completionMessage : "", "Started");
    assert.equal("remaining" in (saved?.type === "countdown" ? saved.settings : {}), false);
    assert.equal(undone?.present.widgets[0]?.type === "countdown" ? undone.present.widgets[0].settings.preset : "", "digital");
    assert.equal(redone?.present.widgets[0]?.type === "countdown" ? redone.present.widgets[0].settings.preset : "", "minimal");
});

test("rejects an invalid target and a countdown with no visible units", () => {
    const settings = defaultCountdownSettings(new Date("2026-11-01T00:00:00Z"));
    const invalid = applyCountdownSettings(settings, {
        targetDate: "2026-02-31",
        targetTime: "25:00",
        timeZone: "Mars/Base",
    });
    const hidden = applyCountdownSettings(settings, {
        showDays: false,
        showHours: false,
        showMinutes: false,
        showSeconds: false,
    });

    assert.equal(invalid.targetDate, settings.targetDate);
    assert.equal(invalid.timeZone, settings.timeZone);
    assert.equal(hidden.showSeconds, true);
});
