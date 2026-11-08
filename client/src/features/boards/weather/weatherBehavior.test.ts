import assert from "node:assert/strict";
import test from "node:test";
import { defaultWeatherSettings } from "./weatherDefaults.ts";
import { weatherCondition } from "./weatherCodes.ts";
import {
    formatTemperature,
    temperatureSuffix,
    weatherAttributionText,
    weatherRefreshMs,
    weekdayLabel,
} from "./weatherFormat.ts";
import {
    createWeatherLoadGate,
    disposeWeatherLoad,
    finishWeatherLoad,
    startWeatherLoad,
    weatherLoadIsCurrent,
    weatherViewAfterFailure,
} from "./weatherLoad.ts";
import { matchingWeatherCity, weatherCities, weatherLocationFromCity } from "./weatherCities.ts";
import { weatherSettingsFromLocation } from "./weatherLocation.ts";
import {
    effectiveWeatherPadding,
    resolveTitleAlign,
    resolveWeatherAlign,
    resolveWeatherDirection,
    weatherPresetFit,
    weatherVisual,
} from "./weatherPresentation.ts";
import { applyWeatherSettings } from "../../editor/weatherSettings.ts";

test("default weather settings store Nahariya without a weather reading", () => {
    assert.equal(defaultWeatherSettings.location.id, "294117");
    assert.equal(defaultWeatherSettings.location.name, "Nahariya");
    assert.equal(defaultWeatherSettings.location.country, "Israel");
    assert.equal(defaultWeatherSettings.location.latitude, 33.00892);
    assert.equal(defaultWeatherSettings.location.longitude, 35.09814);
    assert.equal(defaultWeatherSettings.location.timezone, "Asia/Jerusalem");
    assert.equal(defaultWeatherSettings.unit, "celsius");
    assert.equal(defaultWeatherSettings.layout, "compact");
    assert.equal(defaultWeatherSettings.showFeelsLike, true);
    assert.equal(defaultWeatherSettings.showForecast, false);
    assert.equal("temperature" in defaultWeatherSettings, false);
    assert.equal("current" in defaultWeatherSettings, false);
});

test("presents the current WMO condition, temperature, and attribution", () => {
    assert.deepEqual(weatherCondition(2), {
        icon: "partly-cloudy",
        label: "Partly cloudy",
    });
    assert.equal(weatherCondition(95).icon, "thunder");
    assert.equal(weatherCondition(123).label, "Conditions unavailable");
    assert.equal(formatTemperature(23.34), "23.3");
    assert.equal(formatTemperature(23), "23");
    assert.equal(temperatureSuffix("celsius"), "°C");
    assert.equal(temperatureSuffix("fahrenheit"), "°F");
    assert.equal(weekdayLabel("2026-11-04"), "Wed");
    assert.equal(weatherAttributionText, "Weather data by Open-Meteo.com");
    assert.equal(weatherRefreshMs, 10 * 60 * 1000);
});

test("keeps one weather request in flight and ignores a result after unmount", () => {
    const gate = createWeatherLoadGate();
    const first = startWeatherLoad(gate);
    const second = startWeatherLoad(gate);

    assert.equal(first, 1);
    assert.equal(second, null);
    assert.equal(weatherLoadIsCurrent(gate, 1), true);
    finishWeatherLoad(gate, 1);

    const refresh = startWeatherLoad(gate);
    assert.equal(refresh, 2);
    disposeWeatherLoad(gate);
    assert.equal(weatherLoadIsCurrent(gate, 2), false);
    assert.equal(startWeatherLoad(gate), null);
});

test("shows stale data after a provider error and unavailable when nothing was loaded", () => {
    const stale = weatherViewAfterFailure({
        status: "fresh" as const,
        temperature: 23.3,
    });
    const unavailable = weatherViewAfterFailure(null);

    assert.equal(stale.status, "ready");
    assert.equal(stale.forecast?.status, "stale");
    assert.equal(stale.forecast?.temperature, 23.3);
    assert.equal(unavailable.status, "unavailable");
    assert.equal(unavailable.forecast, null);
});

test("location selection stores coordinates and timezone without a reading", () => {
    const nextSettings = weatherSettingsFromLocation(defaultWeatherSettings, {
        name: "Tel Aviv",
        label: "Tel Aviv, Israel",
        latitude: 32.08088,
        longitude: 34.78057,
        timezone: "Asia/Jerusalem",
        country: "Israel",
        countryCode: "IL",
        admin1: "Tel Aviv",
    });
    const saved = applyWeatherSettings(defaultWeatherSettings, {
        location: nextSettings.location,
        unit: "fahrenheit",
        layout: "expanded",
        showForecast: true,
        title: "  Shore  ",
    });

    assert.equal(saved.location.name, "Tel Aviv");
    assert.equal(saved.location.latitude, 32.08088);
    assert.equal(saved.location.longitude, 34.78057);
    assert.equal(saved.location.timezone, "Asia/Jerusalem");
    assert.equal(saved.unit, "fahrenheit");
    assert.equal(saved.layout, "expanded");
    assert.equal(saved.showForecast, true);
    assert.equal(saved.title, "  Shore  ");
    assert.equal(saved.showFeelsLike, true);
    assert.equal("temperature" in saved, false);
});

test("selects catalog cities and keeps a saved custom location", () => {
    assert.equal(weatherCities.length, 11);
    assert.equal(new Set(weatherCities.map((city) => city.id)).size, 11);
    assert.equal(weatherCities.find((city) => city.name === "Acre")?.latitude, 32.92814);
    assert.equal(weatherCities.find((city) => city.name === "Beer Sheva")?.id, "295530");
    assert.equal(weatherCities.find((city) => city.name === "London")?.timezone, "Europe/London");
    assert.equal(weatherCities.find((city) => city.name === "Tokyo")?.longitude, 139.69171);

    const savedNahariya = {
        ...defaultWeatherSettings.location,
        id: undefined,
        label: "Nahariya, Northern District, Israel",
    };
    assert.equal(matchingWeatherCity(savedNahariya)?.id, "294117");

    const custom = {
        name: "Custom Shore",
        label: "Custom Shore, Israel",
        latitude: 32.5,
        longitude: 34.9,
        timezone: "Asia/Jerusalem",
    };
    assert.equal(matchingWeatherCity(custom), null);
    assert.equal(matchingWeatherCity({
        ...custom,
        id: "999001",
        latitude: 33.00892,
        longitude: 35.09814,
    }), null);

    const selected = applyWeatherSettings(defaultWeatherSettings, {
        location: weatherLocationFromCity(weatherCities[2]),
    });
    assert.equal(selected.location.id, "295721");
    assert.equal(selected.location.name, "Acre");
    assert.equal("temperature" in selected, false);
});

test("keeps saved appearance until a preset or direction is chosen", () => {
    assert.equal(weatherVisual(defaultWeatherSettings), "classic");
    assert.equal(weatherVisual({ ...defaultWeatherSettings, layout: "expanded" }), "expanded");
    assert.equal(weatherVisual({ ...defaultWeatherSettings, preset: "minimal", layout: "expanded" }), "minimal");
    assert.equal(weatherVisual({ ...defaultWeatherSettings, preset: "horizontal" }), "horizontal");
    assert.equal(weatherVisual({ ...defaultWeatherSettings, preset: "forecast" }), "forecast");

    const hebrew = {
        ...defaultWeatherSettings,
        title: "מזג אוויר",
    };
    assert.equal(resolveWeatherDirection(hebrew), "ltr");
    assert.equal(resolveWeatherDirection({ ...hebrew, direction: "auto" }), "rtl");
    assert.equal(resolveWeatherDirection({ ...hebrew, direction: "ltr" }), "ltr");
    assert.equal(resolveWeatherAlign(undefined), "left");
    assert.equal(resolveWeatherAlign("end"), "right");
    assert.equal(resolveWeatherAlign("left"), "left");
    assert.equal(resolveTitleAlign({ ...hebrew, direction: "rtl", align: "right", titleAlign: "left" }), "left");

    const previousCss = globalThis.CSS;
    globalThis.CSS = {
        supports: (_property: string, value: string) => /^#[0-9a-fA-F]{6}$/.test(value),
    } as typeof CSS;
    const styled = applyWeatherSettings(defaultWeatherSettings, {
        preset: "classic",
        fontFamily: "serif",
        fontSize: 30,
        fontWeight: 600,
        titleFontFamily: "sans",
        titleFontSize: 18,
        titleColor: "#ffdd88",
        backgroundOpacity: 70,
        padding: 8,
    });
    globalThis.CSS = previousCss;
    assert.equal(styled.preset, "classic");
    assert.equal(styled.fontFamily, "serif");
    assert.equal(styled.titleColor, "#ffdd88");
    assert.equal(styled.backgroundOpacity, 70);

    assert.equal(styled.fontWeight, 600);
    assert.equal(styled.padding, 8);
    assert.equal(effectiveWeatherPadding(defaultWeatherSettings), 18);
    assert.equal(effectiveWeatherPadding(styled), 8);
    assert.equal(effectiveWeatherPadding({ ...defaultWeatherSettings, layout: "expanded" }), 22);

    const cleared = applyWeatherSettings(styled, {
        preset: null,
        titleColor: null,
        backgroundOpacity: null,
        padding: null,
        fontWeight: null,
    });
    assert.equal(cleared.preset, undefined);
    assert.equal(cleared.titleColor, undefined);
    assert.equal(cleared.backgroundOpacity, undefined);
    assert.equal(cleared.padding, undefined);
    assert.equal(cleared.fontWeight, undefined);
    assert.equal(cleared.fontFamily, "serif");
    assert.equal(effectiveWeatherPadding(cleared), 21);

    const tooSmall = weatherPresetFit(
        { ...defaultWeatherSettings, preset: "forecast" },
        { width: 300, height: 180 },
    );
    assert.equal(tooSmall.fits, false);
    const legacy = weatherPresetFit(defaultWeatherSettings, { width: 120, height: 80 });
    assert.equal(legacy.fits, true);
    assert.equal(weatherPresetFit(
        { ...defaultWeatherSettings, preset: "classic" },
        { width: 320, height: 180 },
    ).fits, true);
    assert.equal(weatherPresetFit(
        { ...defaultWeatherSettings, preset: "minimal" },
        { width: 240, height: 140 },
    ).fits, true);
    assert.equal(weatherPresetFit(
        { ...defaultWeatherSettings, preset: "classic" },
        { width: 200, height: 120 },
    ).fits, false);
    const wideHorizontal = weatherPresetFit(
        { ...defaultWeatherSettings, preset: "horizontal", showForecast: true },
        { width: 800, height: 160 },
    );
    assert.equal(wideHorizontal.fits, true);
    assert.equal(wideHorizontal.message, null);
    const compactHorizontal = weatherPresetFit(
        { ...defaultWeatherSettings, preset: "horizontal", showForecast: true },
        { width: 600, height: 160 },
    );
    assert.equal(compactHorizontal.fits, true);
    assert.match(compactHorizontal.message ?? "", /680/);
    assert.equal(weatherPresetFit(
        { ...defaultWeatherSettings, preset: "forecast", showForecast: true },
        { width: 420, height: 280 },
    ).fits, true);
});
