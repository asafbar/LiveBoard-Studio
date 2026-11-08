import assert from "node:assert/strict";
import test from "node:test";
import { boardOrientation, boardSizeForOrientation, widgetExtendsOutsideBoard } from "../boardOrientation.ts";
import { boardTemplates } from "./boardTemplates.ts";
import type { Widget } from "../types/boardTypes.ts";

const hebrewText = /[\u0590-\u05FF]/;
const now = new Date("2026-11-05T12:00:00.000Z");

function collectText(value: unknown, found: string[]) {
    if (typeof value === "string") {
        found.push(value);
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => collectText(item, found));
        return;
    }

    if (typeof value === "object" && value !== null) {
        Object.values(value).forEach((item) => collectText(item, found));
    }
}

function nestedIds(widget: Widget): string[] {
    const ids = [widget.id];
    const settings = widget.settings as {
        items?: { id?: string }[];
        messages?: { id?: string }[];
    };

    settings.items?.forEach((item) => {
        if (item.id !== undefined) {
            ids.push(item.id);
        }
    });
    settings.messages?.forEach((message) => {
        if (message.id !== undefined) {
            ids.push(message.id);
        }
    });

    return ids;
}

function overlaps(first: Widget, second: Widget): boolean {
    return first.layout.x < second.layout.x + second.layout.width
        && first.layout.x + first.layout.width > second.layout.x
        && first.layout.y < second.layout.y + second.layout.height
        && first.layout.y + first.layout.height > second.layout.y;
}

test("defines five English templates with the expected orientations", () => {
    assert.deepEqual(boardTemplates.map((template) => template.id), [
        "welcome-lobby",
        "conference-events",
        "office-dashboard",
        "portrait-welcome",
        "event-schedule",
    ]);
    assert.deepEqual(boardTemplates.map((template) => template.orientation), [
        "landscape",
        "landscape",
        "landscape",
        "portrait",
        "portrait",
    ]);

    boardTemplates.forEach((template) => {
        const text: string[] = [];
        collectText({ name: template.name, description: template.description }, text);
        text.forEach((value) => {
            assert.equal(hebrewText.test(value), false, value);
        });
    });
});

test("builds editable drafts that stay inside the board and do not overlap", () => {
    boardTemplates.forEach((template) => {
        const board = template.createDraft(template.name, now);
        const size = boardSizeForOrientation(template.orientation);
        const ids = board.widgets.flatMap((widget) => nestedIds(widget));
        const text: string[] = [];

        assert.equal(board.width, size.width);
        assert.equal(board.height, size.height);
        assert.equal(boardOrientation(board.width, board.height), template.orientation);
        assert.ok(board.widgets.length >= 5);
        assert.equal(new Set(ids).size, ids.length);
        collectText(board, text);
        text.forEach((value) => {
            assert.equal(hebrewText.test(value), false, value);
        });

        board.widgets.forEach((widget) => {
            assert.equal(widgetExtendsOutsideBoard(widget.layout, board.width, board.height), false);
            assert.ok(widget.layout.width >= 100);
            assert.ok(widget.layout.height >= 60);
        });

        for (let index = 0; index < board.widgets.length; index += 1) {
            for (let other = index + 1; other < board.widgets.length; other += 1) {
                const left = board.widgets[index];
                const right = board.widgets[other];

                if (left !== undefined && right !== undefined) {
                    assert.equal(overlaps(left, right), false, `${template.id} ${left.type} ${right.type}`);
                }
            }
        }
    });
});

test("gives every created board its own widget ids and a future countdown", () => {
    const conference = boardTemplates[1];

    if (conference === undefined) {
        assert.fail("Conference template is missing.");
    }

    const first = conference.createDraft("Morning session", now);
    const second = conference.createDraft("Morning session", now);
    const countdown = first.widgets.find((widget) => widget.type === "countdown");

    assert.notEqual(first.widgets[0]?.id, second.widgets[0]?.id);
    assert.notEqual(first.widgets, second.widgets);
    assert.equal(countdown?.type, "countdown");

    if (countdown?.type === "countdown") {
        assert.ok(countdown.settings.targetDate >= "2026-11-05");
        assert.equal(countdown.settings.timeZone, "America/New_York");
        first.widgets[0] = {
            ...countdown,
            settings: {
                ...countdown.settings,
                title: "Changed title",
            },
        };
    }

    const untouched = second.widgets.find((widget) => widget.type === "countdown");

    if (untouched?.type === "countdown") {
        assert.equal(untouched.settings.title, "Doors open");
    }
});
