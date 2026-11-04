const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const { sanitizeDraft } = require("./boardValidator");

function layout(x, y) {
    return { x, y, width: 440, height: 720 };
}

function verticalWidget(id, descriptions) {
    return {
        id,
        type: "vertical-announcements",
        layout: layout(0, 0),
        settings: {
            speed: 40,
            backgroundColor: "#112233",
            textColor: "#ffffff",
            accentColor: "#00ccff",
            borderRadius: 0,
            items: descriptions.map((description, index) => ({
                id: `item-${index}`,
                title: `Title ${index}`,
                description,
                label: ""
            }))
        }
    };
}

function boardWith(widgets) {
    return {
        id: "board-1",
        name: "Validation fixture",
        width: 1920,
        height: 1080,
        background: { type: "solid", color: "#000000" },
        widgets
    };
}

function descriptionsFrom(draft) {
    return draft.widgets[0].settings.items.map((item) => item.description);
}

test("accepts Hebrew descriptions with newlines unchanged", () => {
    const description = "שורה ראשונה\nשורה שנייה עם English";
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", [description])
    ]), errors);

    assert.deepEqual(errors, []);
    assert.equal(descriptionsFrom(draft)[0], description);
});

test("accepts multiple newlines inside a description", () => {
    const description = "פתיח\n\nאמצע\n\nסיום";
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", [description])
    ]), errors);

    assert.deepEqual(errors, []);
    assert.equal(descriptionsFrom(draft)[0], description);
});

test("accepts a blank description without calling it missing text", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", ["\n\n", "   \n  "])
    ]), errors);

    assert.deepEqual(errors, []);
    assert.deepEqual(descriptionsFrom(draft), ["", ""]);
});

test("rejects a tab in a description as an unsupported character", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        verticalWidget("widget-1", ["שורה\tשורה"])
    ]), errors);

    assert.equal(draft, null);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].path, "widgets.0.settings.items.0.description");
    assert.equal(errors[0].message, "Text contains unsupported characters.");
});

test("still rejects a newline in a single-line ticker message", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([{
        id: "ticker-1",
        type: "ticker",
        layout: { x: 0, y: 0, width: 1440, height: 88 },
        settings: {
            messages: [{ id: "message-1", text: "Hello\nשלום" }],
            direction: "rtl",
            speed: 80,
            backgroundColor: "#112233",
            textColor: "#ffffff",
            accentColor: "#00ccff",
            borderRadius: 16
        }
    }]), errors);

    assert.equal(draft, null);
    assert.equal(errors[0].path, "widgets.0.settings.messages.0.text");
    assert.equal(errors[0].message, "Text contains unsupported characters.");
});

function weatherWidget(extraSettings = {}) {
    return {
        id: "weather-1",
        type: "weather",
        layout: { x: 40, y: 40, width: 480, height: 240 },
        settings: {
            location: {
                name: "Nahariya",
                label: "Nahariya, Northern District, Israel",
                latitude: 33.00892,
                longitude: 35.09814,
                timezone: "Asia/Jerusalem",
                country: "Israel",
                countryCode: "IL",
                admin1: "Northern District"
            },
            unit: "celsius",
            layout: "compact",
            showFeelsLike: true,
            showForecast: false,
            backgroundColor: "#102030",
            textColor: "#ffffff",
            accentColor: "#37d6ff",
            borderRadius: 24,
            ...extraSettings
        }
    };
}

test("accepts a weather widget without stored weather readings", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        weatherWidget({ title: "  Coast  " }),
        {
            id: "clock-1",
            type: "clock",
            layout: { x: 560, y: 40, width: 460, height: 170 },
            settings: {
                timeZone: "Asia/Jerusalem",
                showDate: true,
                showSeconds: false,
                align: "left"
            }
        }
    ]), errors);

    assert.deepEqual(errors, []);
    assert.equal(draft.widgets[0].settings.title, "Coast");
    assert.equal(draft.widgets[0].settings.location.latitude, 33.00892);
    assert.equal(draft.widgets[0].settings.location.timezone, "Asia/Jerusalem");
    assert.equal(draft.widgets[0].settings.temperature, undefined);
    assert.equal(draft.widgets[0].settings.current, undefined);
    assert.equal(draft.widgets[1].type, "clock");
    assert.equal(draft.widgets[1].settings.showSeconds, false);
});

test("rejects unknown weather settings and invalid locations", () => {
    const readings = [];
    sanitizeDraft(boardWith([
        weatherWidget({ temperature: 23 })
    ]), readings);
    assert.equal(readings[0].path, "widgets.0.settings.temperature");
    assert.equal(readings[0].message, "Unknown field.");

    const provider = [];
    sanitizeDraft(boardWith([
        weatherWidget({
            location: {
                name: "Nahariya",
                label: "Nahariya, Israel",
                latitude: 33.00892,
                longitude: 35.09814,
                timezone: "Asia/Jerusalem",
                url: "https://evil.test"
            }
        })
    ]), provider);
    assert.equal(provider[0].path, "widgets.0.settings.location.url");

    const coordinates = [];
    sanitizeDraft(boardWith([
        weatherWidget({
            location: {
                name: "Nahariya",
                label: "Nahariya, Israel",
                latitude: 91,
                longitude: 35.09814,
                timezone: "Asia/Jerusalem"
            }
        })
    ]), coordinates);
    assert.equal(coordinates[0].path, "widgets.0.settings.location.latitude");

    const unit = [];
    sanitizeDraft(boardWith([
        weatherWidget({ unit: "kelvin" })
    ]), unit);
    assert.equal(unit[0].path, "widgets.0.settings.unit");
});

test("keeps optional weather presentation settings and drops a blank title", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        weatherWidget({
            title: "   ",
            direction: "rtl",
            align: "end",
            fontFamily: "sans",
            fontSize: 30,
            fontWeight: 600,
            titleFontFamily: "serif",
            titleFontSize: 18,
            titleFontWeight: 500
        })
    ]), errors);

    assert.deepEqual(errors, []);
    assert.equal(draft.widgets[0].settings.title, undefined);
    assert.equal(draft.widgets[0].settings.direction, "rtl");
    assert.equal(draft.widgets[0].settings.align, "end");
    assert.equal(draft.widgets[0].settings.fontWeight, 600);
    assert.equal(draft.widgets[0].settings.titleFontFamily, "serif");
});

test("accepts weather presets, typography, and a preserved custom location", () => {
    const errors = [];
    const draft = sanitizeDraft(boardWith([
        weatherWidget({
            preset: "forecast",
            direction: "auto",
            align: "right",
            titleAlign: "left",
            title: "מזג אוויר",
            titleColor: "#ffdd88",
            backgroundOpacity: 80,
            padding: 12,
            fontSize: 28,
            titleFontSize: 20,
            location: {
                id: "999001",
                name: "Custom Shore",
                label: "Custom Shore, Israel",
                latitude: 32.5,
                longitude: 34.9,
                timezone: "Asia/Jerusalem",
                country: "Israel",
                countryCode: "IL"
            }
        })
    ]), errors);

    assert.deepEqual(errors, []);
    assert.equal(draft.widgets[0].settings.preset, "forecast");
    assert.equal(draft.widgets[0].settings.direction, "auto");
    assert.equal(draft.widgets[0].settings.align, "right");
    assert.equal(draft.widgets[0].settings.titleAlign, "left");
    assert.equal(draft.widgets[0].settings.title, "מזג אוויר");
    assert.equal(draft.widgets[0].settings.backgroundOpacity, 80);
    assert.equal(draft.widgets[0].settings.padding, 12);
    assert.equal(draft.widgets[0].settings.location.id, "999001");
    assert.equal(draft.widgets[0].settings.temperature, undefined);
});

test("rejects unsupported weather presentation values", () => {
    const preset = [];
    sanitizeDraft(boardWith([
        weatherWidget({ preset: "poster" })
    ]), preset);
    assert.equal(preset[0].path, "widgets.0.settings.preset");

    const opacity = [];
    sanitizeDraft(boardWith([
        weatherWidget({ backgroundOpacity: 101 })
    ]), opacity);
    assert.equal(opacity[0].path, "widgets.0.settings.backgroundOpacity");

    const locationId = [];
    sanitizeDraft(boardWith([
        weatherWidget({
            location: {
                id: "shore",
                name: "Nahariya",
                label: "Nahariya, Israel",
                latitude: 33.00892,
                longitude: 35.09814,
                timezone: "Asia/Jerusalem"
            }
        })
    ]), locationId);
    assert.equal(locationId[0].path, "widgets.0.settings.location.id");

    const fontSize = [];
    sanitizeDraft(boardWith([
        weatherWidget({ fontSize: 120 })
    ]), fontSize);
    assert.equal(fontSize[0].path, "widgets.0.settings.fontSize");
});

test("accepts weather title spacing and refresh intervals, and rejects invalid values", () => {
    const accepted = [];
    const draft = sanitizeDraft(boardWith([
        weatherWidget({
            titleSpacing: 0,
            refreshIntervalMinutes: 1440
        })
    ]), accepted);

    assert.deepEqual(accepted, []);
    assert.equal(draft.widgets[0].settings.titleSpacing, 0);
    assert.equal(draft.widgets[0].settings.refreshIntervalMinutes, 1440);
    assert.equal(draft.widgets[0].settings.temperature, undefined);

    [10, 30, 60].forEach((minutes) => {
        const errors = [];
        const next = sanitizeDraft(boardWith([
            weatherWidget({ refreshIntervalMinutes: minutes })
        ]), errors);
        assert.deepEqual(errors, []);
        assert.equal(next.widgets[0].settings.refreshIntervalMinutes, minutes);
    });

    const legacy = [];
    const saved = sanitizeDraft(boardWith([
        weatherWidget({})
    ]), legacy);
    assert.deepEqual(legacy, []);
    assert.equal(saved.widgets[0].settings.titleSpacing, undefined);
    assert.equal(saved.widgets[0].settings.refreshIntervalMinutes, undefined);

    const spacing = [];
    sanitizeDraft(boardWith([
        weatherWidget({ titleSpacing: 65 })
    ]), spacing);
    assert.equal(spacing[0].path, "widgets.0.settings.titleSpacing");

    const refresh = [];
    sanitizeDraft(boardWith([
        weatherWidget({ refreshIntervalMinutes: 15 })
    ]), refresh);
    assert.equal(refresh[0].path, "widgets.0.settings.refreshIntervalMinutes");
});

test("accepts the backed-up multiline descriptions unchanged", () => {
    const backupPath = process.env.DRAFT_BACKUP;

    if (backupPath === undefined || backupPath === "") {
        return;
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
    const original = backup.widgets[9].settings.items.map((item) => item.description);
    const errors = [];
    const draft = sanitizeDraft(backup, errors);
    const saved = draft.widgets[9].settings.items.map((item) => item.description);

    assert.deepEqual(errors, []);
    assert.deepEqual(saved, original);
});
