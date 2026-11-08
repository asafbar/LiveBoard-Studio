import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Board, TextWidgetSettings, Widget } from "../boards/types/boardTypes.ts";
import { defaultCountdownSettings } from "../boards/countdown/countdownDefaults.ts";
import { defaultNewsSettings } from "../boards/news/newsDefaults.ts";
import { defaultWeatherSettings } from "../boards/weather/weatherDefaults.ts";
import { createWidget } from "./createWidget.ts";
import { applyCountdownSettings, updateCountdownSettings } from "./countdownSettings.ts";
import { createDraftHistory, recordDraftChange, redoDraft, undoDraft } from "./draftHistory.ts";
import { commitBoardEditableText, commitEditableText } from "./editableText.ts";
import { applyNewsSettings, updateNewsSettings } from "./newsSettings.ts";
import { applyWeatherSettings } from "./weatherSettings.ts";

const phrase = "איפה הילד בהופעה";
const english = "Where is the child";

const board: Board = {
    id: "board-1",
    name: "Text fixture",
    width: 1920,
    height: 1080,
    background: { type: "solid", color: "#000000" },
    widgets: [],
};

test("keeps Hebrew and English spaces while each character is typed", () => {
    for (const sentence of [phrase, english]) {
        let typed = "";
        let news = defaultNewsSettings;
        let weather = defaultWeatherSettings;
        let countdown = defaultCountdownSettings(new Date("2026-11-01T00:00:00Z"));

        for (const character of sentence) {
            typed += character;
            news = applyNewsSettings(news, { title: typed });
            weather = applyWeatherSettings(weather, { title: typed });
            countdown = applyCountdownSettings(countdown, { title: typed, completionMessage: typed });
            assert.equal(news.title, typed);
            assert.equal(weather.title, typed);
            assert.equal(countdown.title, typed);
            assert.equal(countdown.completionMessage, typed);
        }
    }
});

test("keeps leading, interior, and trailing spaces, including a pasted value", () => {
    const pasted = `  ${phrase}  `;
    const news = applyNewsSettings(defaultNewsSettings, { title: pasted });
    const weather = applyWeatherSettings(defaultWeatherSettings, { title: pasted });
    const countdown = applyCountdownSettings(defaultCountdownSettings(), {
        title: pasted,
        completionMessage: ` ${english} `,
    });

    assert.equal(news.title, pasted);
    assert.equal(weather.title, pasted);
    assert.equal(countdown.title, pasted);
    assert.equal(countdown.completionMessage, ` ${english} `);
    assert.equal(commitEditableText(pasted), phrase);
    assert.equal(commitEditableText(` ${english} `), english);
    assert.equal(commitEditableText("   "), "");
});

test("backspace removes one character and can delete a space without dropping the rest", () => {
    let title = ` ${phrase} `;
    const steps = [title];

    while (title.length > 0) {
        title = title.slice(0, -1);
        const news = applyNewsSettings(defaultNewsSettings, { title });
        steps.push(news.title ?? "");
    }

    assert.equal(steps[1], ` ${phrase}`);
    assert.equal(steps.at(-2), " ");
    assert.equal(steps.at(-1), "");
});

test("undo and redo restore text that contains spaces", () => {
    const widget = createWidget("countdown", board);
    const present = { ...board, widgets: [widget] };
    const spaced = updateCountdownSettings(present, widget.id, { title: "איפה " });
    const completed = updateCountdownSettings(spaced, widget.id, { title: phrase });
    const history = recordDraftChange(recordDraftChange(createDraftHistory(), present), spaced);
    const undone = undoDraft(history, completed);
    const redone = undone === null ? null : redoDraft(undone.history, undone.present);

    assert.equal(spaced.widgets[0]?.type === "countdown" ? spaced.widgets[0].settings.title : "", "איפה ");
    assert.equal(undone?.present.widgets[0]?.type === "countdown" ? undone.present.widgets[0].settings.title : "", "איפה ");
    assert.equal(redone?.present.widgets[0]?.type === "countdown" ? redone.present.widgets[0].settings.title : "", phrase);
});

test("save normalization trims single-line titles and leaves multiline text unchanged", () => {
    const news = createWidget("news", board);
    const text: Widget = {
        id: "text-1",
        type: "text",
        layout: { x: 0, y: 0, width: 480, height: 100 },
        settings: {
            text: "  line one\n  line two  ",
            tone: "default",
            size: "title",
        } satisfies TextWidgetSettings,
    };
    const draft: Board = {
        ...board,
        widgets: [
            news.type === "news"
                ? { ...news, settings: { ...news.settings, title: `  ${phrase}  ` } }
                : news,
            text,
        ],
    };
    const saved = commitBoardEditableText(draft);
    const savedNews = saved.widgets[0];
    const savedText = saved.widgets[1];

    assert.equal(savedNews?.type === "news" ? savedNews.settings.title : "", phrase);
    assert.equal(savedText?.type === "text" ? savedText.settings.text : "", "  line one\n  line two  ");
    assert.equal(commitBoardEditableText(saved), saved);
});

test("news undo keeps a trailing space that was typed before the next word", () => {
    const widget = createWidget("news", board);
    const present = { ...board, widgets: [widget] };
    const spaced = updateNewsSettings(present, widget.id, { title: "Where " });
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, spaced);

    assert.equal(spaced.widgets[0]?.type === "news" ? spaced.widgets[0].settings.title : "", "Where ");
    assert.equal(undone?.present.widgets[0]?.type === "news" ? undone.present.widgets[0].settings.title : "", undefined);
});

test("countdown labels stay readable in both presets", () => {
    const css = readFileSync(new URL("../boards/components/CountdownWidget.module.css", import.meta.url), "utf8");
    const unit = css.slice(css.indexOf(".unit {"), css.indexOf(".minimalRow {\n    align-items"));
    const minimal = css.slice(css.indexOf(".minimalUnit {"), css.indexOf(".message {"));

    assert.match(unit, /font-size:\s*clamp\(14px,\s*3\.1cqi,\s*22px\)/);
    assert.match(minimal, /font-size:\s*clamp\(16px,\s*3\.4cqi,\s*28px\)/);
    assert.match(unit, /white-space:\s*nowrap/);
    assert.match(minimal, /white-space:\s*nowrap/);
    assert.match(unit, /color-mix\(in srgb, var\(--countdown-accent\)/);
    assert.match(minimal, /color-mix\(in srgb, var\(--countdown-accent\)/);
    assert.equal(css.includes("data-preset=\"digital\"") || css.includes('[data-preset="digital"]') || css.includes(".block"), true);
    assert.match(css, /\[data-preset="minimal"\]/);
});
