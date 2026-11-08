import { useEffect, useState, type CSSProperties } from "react";
import { backgroundLayerOpacity, paintColor } from "../../editor/colorAlpha.ts";
import type { CountdownFontFamily, CountdownWidgetSettings } from "../types/boardTypes.ts";
import {
    countdownCompletionText,
    countdownSummary,
    countdownUnitLabel,
    formatCountdownValue,
    resolveCountdownAlign,
    resolveCountdownDirection,
    resolveCountdownFontFamily,
    resolveCountdownFontSize,
    resolveCountdownFontWeight,
    resolveCountdownPadding,
    resolveCountdownTitleFontFamily,
    resolveCountdownTitleFontSize,
    resolveCountdownTitleFontWeight,
    resolveCountdownTitleSpacing,
} from "../countdown/countdownPresentation.ts";
import { countdownRemaining, countdownTargetEpoch, createCountdownTicker } from "../countdown/countdownTime.ts";
import styles from "./CountdownWidget.module.css";

type CountdownWidgetProps = {
    settings: CountdownWidgetSettings;
};

type CountdownStyle = CSSProperties & {
    "--countdown-background": string;
    "--countdown-background-opacity": string;
    "--countdown-text": string;
    "--countdown-accent": string;
    "--countdown-title"?: string;
    "--countdown-padding": string;
    "--countdown-title-spacing": string;
    "--countdown-font": string;
    "--countdown-title-font": string;
    "--countdown-weight": string;
    "--countdown-title-weight": string;
    "--countdown-digit-size": string;
    "--countdown-title-size": string;
};

const fontStacks: Record<CountdownFontFamily, string> = {
    sans: "var(--font-sans)",
    serif: "Georgia, \"Times New Roman\", serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

function CountdownWidget({ settings }: CountdownWidgetProps) {
    const [now, setNow] = useState(() => Date.now());
    const targetEpoch = countdownTargetEpoch(settings.targetDate, settings.targetTime, settings.timeZone);
    const remaining = countdownRemaining(targetEpoch, now, settings);
    const direction = resolveCountdownDirection(settings);
    const title = settings.title?.trim() ?? "";

    useEffect(() => {
        const ticker = createCountdownTicker({
            showSeconds: settings.showSeconds,
            now: () => Date.now(),
            onTick: setNow,
            schedule: (callback, delay) => window.setTimeout(callback, delay),
            cancel: (timerId) => window.clearTimeout(timerId),
            isHidden: () => document.visibilityState === "hidden",
        });

        ticker.start();
        document.addEventListener("visibilitychange", ticker.onVisibility);

        return () => {
            ticker.stop();
            document.removeEventListener("visibilitychange", ticker.onVisibility);
        };
    }, [settings.showSeconds]);

    return (
        <section
            role="timer"
            aria-label={countdownSummary(settings, remaining)}
            className={styles.root}
            dir={direction === "auto" ? undefined : direction}
            data-preset={settings.preset}
            data-align={resolveCountdownAlign(settings)}
            data-complete={remaining.completed ? "true" : "false"}
            style={countdownStyle(settings)}
        >
            <div className={styles.content}>
                {title.length > 0 ? (
                    <h2 className={styles.title} dir="auto" style={{ textAlign: titleTextAlign(settings) }}>{title}</h2>
                ) : null}
                {settings.preset === "minimal" ? (
                    <MinimalCountdown settings={settings} remaining={remaining} />
                ) : (
                    <DigitalCountdown settings={settings} remaining={remaining} />
                )}
                {remaining.completed ? (
                    <p className={styles.message} dir="auto">{countdownCompletionText(settings)}</p>
                ) : null}
            </div>
        </section>
    );
}

function DigitalCountdown({
    settings,
    remaining,
}: {
    settings: CountdownWidgetSettings;
    remaining: ReturnType<typeof countdownRemaining>;
}) {
    const direction = resolveCountdownDirection(settings);
    const units = visibleUnits(settings, remaining, direction);

    return (
        <div className={styles.digitalRow}>
            {units.map((unit) => (
                <div className={styles.block} key={unit.label}>
                    <span className={styles.digitalValue}>{unit.value}</span>
                    <span className={styles.unit}>{unit.label}</span>
                </div>
            ))}
        </div>
    );
}

function MinimalCountdown({
    settings,
    remaining,
}: {
    settings: CountdownWidgetSettings;
    remaining: ReturnType<typeof countdownRemaining>;
}) {
    const direction = resolveCountdownDirection(settings);
    const units = visibleUnits(settings, remaining, direction);

    return (
        <div className={styles.minimalRow}>
            {units.map((unit) => (
                <span key={unit.label}>
                    <span className={styles.minimalValue}>{unit.value}</span>
                    <span className={styles.minimalUnit}>{unit.label}</span>
                </span>
            ))}
        </div>
    );
}

function visibleUnits(
    settings: CountdownWidgetSettings,
    remaining: ReturnType<typeof countdownRemaining>,
    direction: ReturnType<typeof resolveCountdownDirection>,
) {
    const units: { label: string; value: string }[] = [];

    if (settings.showDays) {
        units.push({ label: countdownUnitLabel("days", direction), value: formatCountdownValue(remaining.days) });
    }

    if (settings.showHours) {
        units.push({ label: countdownUnitLabel("hours", direction), value: formatCountdownValue(remaining.hours) });
    }

    if (settings.showMinutes) {
        units.push({ label: countdownUnitLabel("minutes", direction), value: formatCountdownValue(remaining.minutes) });
    }

    if (settings.showSeconds) {
        units.push({ label: countdownUnitLabel("seconds", direction), value: formatCountdownValue(remaining.seconds) });
    }

    return units;
}

function titleTextAlign(settings: CountdownWidgetSettings): CSSProperties["textAlign"] {
    const align = settings.titleAlign ?? resolveCountdownAlign(settings);

    if (align === "center") {
        return "center";
    }

    if (align === "left") {
        return "left";
    }

    if (align === "right" || align === "end") {
        return "end";
    }

    return "start";
}

function countdownStyle(settings: CountdownWidgetSettings): CountdownStyle {
    const text = paintColor(settings.textColor, settings.textOpacity);
    const accent = paintColor(settings.accentColor, settings.accentOpacity);
    const title = settings.titleColor === undefined
        ? undefined
        : paintColor(settings.titleColor, settings.titleOpacity);
    const style: CountdownStyle = {
        "--countdown-background": settings.backgroundColor,
        "--countdown-background-opacity": String(backgroundLayerOpacity(settings.backgroundOpacity)),
        "--countdown-text": text,
        "--countdown-accent": accent,
        "--countdown-padding": `${resolveCountdownPadding(settings)}px`,
        "--countdown-title-spacing": `${resolveCountdownTitleSpacing(settings)}px`,
        "--countdown-font": fontStacks[resolveCountdownFontFamily(settings)],
        "--countdown-title-font": fontStacks[resolveCountdownTitleFontFamily(settings)],
        "--countdown-weight": String(resolveCountdownFontWeight(settings)),
        "--countdown-title-weight": String(resolveCountdownTitleFontWeight(settings)),
        "--countdown-digit-size": `${resolveCountdownFontSize(settings)}px`,
        "--countdown-title-size": `${resolveCountdownTitleFontSize(settings)}px`,
        borderRadius: `${settings.borderRadius}px`,
    };

    if (title !== undefined) {
        style["--countdown-title"] = title;
    }

    return style;
}

export default CountdownWidget;
