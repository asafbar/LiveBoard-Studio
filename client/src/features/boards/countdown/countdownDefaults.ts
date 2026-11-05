import type { CountdownWidgetSettings } from "../types/boardTypes.ts";

const defaultCountdownTimeZone = "Asia/Jerusalem";
const defaultCountdownTime = "18:00:00";

function wallDate(epoch: number, timeZone: string): string {
    const parts: Record<string, string> = {};

    new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date(epoch)).forEach((part) => {
        if (part.type !== "literal") {
            parts[part.type] = part.value;
        }
    });

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function defaultCountdownSettings(now = new Date()): CountdownWidgetSettings {
    return {
        title: "Countdown",
        targetDate: wallDate(now.getTime() + (7 * 24 * 60 * 60 * 1000), defaultCountdownTimeZone),
        targetTime: defaultCountdownTime,
        timeZone: defaultCountdownTimeZone,
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
        preset: "digital",
        direction: "auto",
        align: "center",
        backgroundColor: "color-mix(in srgb, var(--canvas-board) 88%, var(--foreground))",
        textColor: "var(--foreground)",
        accentColor: "var(--cyan)",
        borderRadius: 24,
    };
}

export { defaultCountdownSettings, defaultCountdownTime, defaultCountdownTimeZone };
