import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { create as createQrCode } from "qrcode";
import type { Board } from "../types/boardTypes.ts";
import { createWidget } from "../../editor/createWidget.ts";
import { commitBoardEditableText } from "../../editor/editableText.ts";
import { createDraftHistory, recordDraftChange, undoDraft } from "../../editor/draftHistory.ts";
import { applyQrSettings, updateQrSettings } from "../../editor/qrSettings.ts";
import { defaultQrSettings } from "./qrDefaults.ts";
import {
    createQrSvg,
    encodedQrPayload,
    qrColorsAreReadable,
    qrContentIssue,
    qrContentMessages,
    qrErrorCorrectionLevel,
    qrQuietZoneModules,
} from "./qrContent.ts";

const board: Board = {
    id: "board-1",
    name: "QR fixture",
    width: 1920,
    height: 1080,
    background: { type: "solid", color: "#000000" },
    widgets: [],
};

const httpsContent = "https://example.com/lobby";
const httpContent = "http://example.com/welcome";
const plainContent = "Meet at the lobby";

test("generates the same SVG for the same content", () => {
    const first = createQrSvg(httpsContent, "#000000", "#ffffff");
    const second = createQrSvg(httpsContent, "#000000", "#ffffff");
    const code = createQrCode(httpsContent, { errorCorrectionLevel: qrErrorCorrectionLevel });

    const medium = createQrCode(httpsContent, { errorCorrectionLevel: "M" });

    assert.equal(first, second);
    assert.equal(qrErrorCorrectionLevel, "Q");
    assert.notEqual(code.errorCorrectionLevel.bit, medium.errorCorrectionLevel.bit);
    assert.match(first ?? "", /shape-rendering="crispEdges"/);
    assert.equal((first ?? "").includes(httpsContent), false);
});

test("encodes http, https, and plain text", () => {
    assert.equal(encodedQrPayload(httpsContent), httpsContent);
    assert.equal(encodedQrPayload(httpContent), httpContent);
    assert.equal(encodedQrPayload(plainContent), plainContent);
    assert.equal(encodedQrPayload("HELLO"), "HELLO");
    assert.equal(qrContentIssue("note: bring a pen"), null);
    assert.equal(encodedQrPayload("note: bring a pen"), "note: bring a pen");
});

test("rejects unsafe and invalid links", () => {
    for (const value of [
        "javascript:alert(1)",
        "JAVASCRIPT:alert(1)",
        "data:text/html,hello",
        "vbscript:msgbox(1)",
        "file:///tmp/secret",
        "blob:https://example.com/id",
        "ftp://example.com/file",
        "https://user:secret@example.com",
        "http://",
    ]) {
        assert.equal(createQrSvg(value, "#000000", "#ffffff"), null);
        assert.notEqual(qrContentIssue(value), null);
    }
});

test("reports empty and oversized content", () => {
    assert.equal(qrContentIssue("   "), qrContentMessages.empty);
    assert.equal(createQrSvg("   ", "#000000", "#ffffff"), null);
    assert.equal(qrContentIssue("a".repeat(513)), qrContentMessages.tooLong);
    assert.equal(qrContentIssue("a".repeat(512)), null);
});

test("keeps a four-module quiet zone and a square view box", () => {
    const svg = createQrSvg(httpsContent, "#112233", "#fff8e7");
    const code = createQrCode(httpsContent, { errorCorrectionLevel: "Q" });
    const dimension = code.modules.size + (qrQuietZoneModules * 2);
    const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg ?? "");
    const darkMarkup = /<g fill="#[0-9a-f]+">([\s\S]*)<\/g>/.exec(svg ?? "")?.[1] ?? "";
    const darkPositions = Array.from(darkMarkup.matchAll(/x="(\d+)"/g)).map((match) => Number(match[1]));

    assert.equal(viewBox?.[1], String(dimension));
    assert.equal(viewBox?.[2], String(dimension));
    assert.equal(darkPositions.length > 0, true);
    assert.equal(darkPositions.every((position) => position >= qrQuietZoneModules), true);
    assert.match(svg ?? "", new RegExp(`<rect width="${dimension}" height="${dimension}" fill="#fff8e7"/>`));
    assert.match(svg ?? "", /<g fill="#112233">/);
    assert.equal((svg ?? "").includes("transparent"), false);
});

test("renders both presets with Hebrew text and RTL", () => {
    const widgetSource = readFileSync(new URL("../components/QrWidget.tsx", import.meta.url), "utf8");
    const styleSource = readFileSync(new URL("../components/QrWidget.module.css", import.meta.url), "utf8");
    const classic = styleSource.slice(styleSource.indexOf(".classic {"), styleSource.indexOf(".split {"));
    const split = styleSource.slice(styleSource.indexOf(".split {"), styleSource.indexOf(".copy {"));

    assert.match(widgetSource, /data-preset=\{settings\.preset\}/);
    assert.match(widgetSource, /dir=\{direction === "auto" \? undefined : direction\}/);
    assert.match(widgetSource, /function ClassicQr/);
    assert.match(widgetSource, /function SplitQr/);
    assert.match(widgetSource, /dir="auto"/);
    assert.match(classic, /flex-direction: column/);
    assert.match(split, /flex-direction: row/);
    assert.match(styleSource, /\.root::before/);
    assert.equal(styleSource.includes(".code svg"), true);
});

test("keeps spaces while editing and regenerates after the content changes", () => {
    const widget = createWidget("qr", board);

    assert.equal(widget.type, "qr");

    if (widget.type !== "qr") {
        return;
    }

    const present = { ...board, widgets: [widget] };
    const edited = updateQrSettings(present, widget.id, {
        content: "https://example.com/one",
        title: "  סרוק את הקוד ",
        subtitle: "Point your camera ",
        preset: "split",
        direction: "rtl",
        align: "right",
    });
    const changedAgain = updateQrSettings(edited, widget.id, {
        content: "https://example.com/two",
    });
    const first = edited.widgets[0];
    const second = changedAgain.widgets[0];
    const firstSvg = first?.type === "qr"
        ? createQrSvg(first.settings.content, first.settings.foregroundColor, first.settings.codeBackgroundColor)
        : null;
    const secondSvg = second?.type === "qr"
        ? createQrSvg(second.settings.content, second.settings.foregroundColor, second.settings.codeBackgroundColor)
        : null;
    const history = recordDraftChange(createDraftHistory(), present);
    const undone = undoDraft(history, edited);
    const saved = commitBoardEditableText(edited).widgets[0];

    assert.equal(first?.type === "qr" ? first.settings.title : "", "  סרוק את הקוד ");
    assert.equal(first?.type === "qr" ? first.settings.direction : "", "rtl");
    assert.equal(first?.type === "qr" ? first.settings.preset : "", "split");
    assert.notEqual(firstSvg, secondSvg);
    assert.equal(saved?.type === "qr" ? saved.settings.title : "", "סרוק את הקוד");
    assert.equal(saved?.type === "qr" ? saved.settings.subtitle : "", "Point your camera");
    assert.equal(saved?.type === "qr" ? saved.settings.content : "", "https://example.com/one");
    assert.equal("svg" in (saved?.type === "qr" ? saved.settings : {}), false);
    assert.equal(undone?.present.widgets[0]?.type === "qr" ? undone.present.widgets[0].settings.content : "", defaultQrSettings().content);
});

test("rejects a low-contrast color without changing the stored colors", () => {
    const settings = defaultQrSettings();
    const next = applyQrSettings(settings, {
        foregroundColor: "#777777",
        codeBackgroundColor: "rgba(255, 255, 255, 0.2)",
    });

    assert.equal(qrColorsAreReadable("#000000", "#ffffff"), true);
    assert.equal(qrColorsAreReadable("#777777", "#ffffff"), false);
    assert.equal(next.foregroundColor, "#000000");
    assert.equal(next.codeBackgroundColor, "#ffffff");
    assert.equal(createQrSvg(settings.content, "#777777", "#ffffff"), null);
});
