import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { paintColor } from "../../editor/colorAlpha.ts";
import type { WeatherFontFamily, WeatherWidgetSettings, WidgetLayout } from "../types/boardTypes.ts";
import {
    resolveTitleAlign,
    resolveWeatherAlign,
    resolveWeatherDirection,
    weatherPresetFit,
    weatherVisual,
} from "../weather/weatherPresentation.ts";
import { getWeatherForecast, type WeatherForecast } from "../weather/weatherApi.ts";
import { weatherCondition } from "../weather/weatherCodes.ts";
import {
    formatTemperature,
    temperatureSuffix,
    weatherAttributionText,
    weatherAttributionUrl,
    weekdayLabel,
} from "../weather/weatherFormat.ts";
import {
    createWeatherRefreshController,
    resolveWeatherRefreshMinutes,
    type WeatherLoadResult,
} from "../weather/weatherSchedule.ts";
import {
    createWeatherLoadGate,
    disposeWeatherLoad,
    finishWeatherLoad,
    startWeatherLoad,
    weatherLoadIsCurrent,
    weatherViewAfterFailure,
} from "../weather/weatherLoad.ts";
import styles from "./WeatherWidget.module.css";
import WeatherIcon from "./WeatherIcon.tsx";

type WeatherWidgetProps = {
    settings: WeatherWidgetSettings;
    linkAttribution?: boolean;
    studioFrame?: WidgetLayout;
};

type WeatherView = {
    status: "loading" | "ready" | "unavailable";
    forecast: WeatherForecast | null;
};

function WeatherWidget({ settings, linkAttribution = true, studioFrame }: WeatherWidgetProps) {
    const [view, setView] = useState<WeatherView>({
        status: "loading",
        forecast: null,
    });
    const latitude = settings.location.latitude;
    const longitude = settings.location.longitude;
    const unit = settings.unit;

    const refreshIntervalMinutes = settings.refreshIntervalMinutes;

    useEffect(() => {
        const gate = createWeatherLoadGate();
        const controller = new AbortController();
        const refresh = createWeatherRefreshController({
            refreshMinutes: resolveWeatherRefreshMinutes(refreshIntervalMinutes),
            timers: {
                set: (callback, delay) => window.setTimeout(callback, delay),
                clear: (id) => window.clearTimeout(id),
                hidden: () => document.hidden,
                now: () => Date.now(),
            },
            load: async (): Promise<WeatherLoadResult> => {
                const generation = startWeatherLoad(gate);

                if (generation === null) {
                    return "skipped";
                }

                try {
                    const forecast = await getWeatherForecast(latitude, longitude, unit, controller.signal);

                    if (!weatherLoadIsCurrent(gate, generation)) {
                        return "skipped";
                    }

                    setView({
                        status: "ready",
                        forecast,
                    });
                    return "success";
                } catch {
                    if (!weatherLoadIsCurrent(gate, generation)) {
                        return "skipped";
                    }

                    setView((current) => weatherViewAfterFailure(current.forecast));
                    return "failure";
                } finally {
                    finishWeatherLoad(gate, generation);
                }
            },
        });

        refresh.start();
        document.addEventListener("visibilitychange", refresh.onVisibility);

        return () => {
            refresh.stop();
            disposeWeatherLoad(gate);
            controller.abort();
            document.removeEventListener("visibilitychange", refresh.onVisibility);
        };
    }, [latitude, longitude, unit, refreshIntervalMinutes]);

    const forecast = view.forecast;
    const heading = weatherHeading(settings);
    const condition = forecast === null ? null : weatherCondition(forecast.current.weatherCode);
    const suffix = temperatureSuffix(unit);
    const stale = forecast?.status === "stale";
    const showForecast = settings.showForecast && forecast !== null && forecast.daily.length > 0;
    const visual = weatherVisual(settings);
    const direction = resolveWeatherDirection(settings);
    const align = resolveWeatherAlign(settings.align);
    const titleAlign = resolveTitleAlign(settings);
    const fit = studioFrame === undefined
        ? null
        : weatherPresetFit(settings, studioFrame);
    const className = [
        styles.root,
        visualClass(visual),
        alignClass(align),
        fontFamilyClass(settings.fontFamily),
    ].filter((name) => name.length > 0).join(" ");

    return (
        <div
            className={className}
            dir={direction}
            data-weather-status={view.status}
            data-weather-freshness={forecast?.status ?? "none"}
            data-weather-preset={visual}
            data-weather-direction={direction}
            data-weather-align={align}
            style={weatherStyle(settings, visual)}
        >
            <div className={styles.body}>
                {visual === "minimal" ? (
                    <MinimalLayout
                        heading={minimalHeading(settings)}
                        headingClassName={headingClassName(settings, titleAlign)}
                        forecast={forecast}
                        condition={condition}
                        suffix={suffix}
                        status={view.status}
                        showFeelsLike={settings.showFeelsLike}
                        showForecast={showForecast}
                    />
                ) : null}
                {visual === "horizontal" ? (
                    <HorizontalLayout
                        heading={heading}
                        headingClassName={headingClassName(settings, titleAlign)}
                        forecast={forecast}
                        condition={condition}
                        suffix={suffix}
                        status={view.status}
                        showFeelsLike={settings.showFeelsLike}
                        showForecast={settings.showForecast}
                    />
                ) : null}
                {visual === "forecast" ? (
                    <ForecastLayout
                        heading={heading}
                        headingClassName={headingClassName(settings, titleAlign)}
                        forecast={forecast}
                        condition={condition}
                        suffix={suffix}
                        status={view.status}
                        showFeelsLike={settings.showFeelsLike}
                        showForecast={settings.showForecast}
                    />
                ) : null}
                {visual === "classic" || visual === "expanded" ? (
                    <ClassicLayout
                        heading={heading}
                        headingClassName={headingClassName(settings, titleAlign)}
                        forecast={forecast}
                        condition={condition}
                        suffix={suffix}
                        status={view.status}
                        showFeelsLike={settings.showFeelsLike}
                        showForecast={showForecast}
                    />
                ) : null}
                {stale ? <p className={styles.status}>Updated earlier</p> : null}
                {fit !== null && fit.fits === false && fit.message !== null ? (
                    <p className={styles.fitNote}>{fit.message}</p>
                ) : null}
            </div>
            <p className={styles.attribution}>
                {linkAttribution ? (
                    <a href={forecast?.attribution.url ?? weatherAttributionUrl} target="_blank" rel="noreferrer">
                        {forecast?.attribution.text ?? weatherAttributionText}
                    </a>
                ) : (
                    forecast?.attribution.text ?? weatherAttributionText
                )}
            </p>
        </div>
    );
}

function weatherHeading(settings: WeatherWidgetSettings): string {
    const title = settings.title?.trim() ?? "";

    if (title !== "") {
        return title;
    }

    if (settings.location.label.trim() !== "") {
        return settings.location.label;
    }

    return settings.location.name;
}

function weatherStyle(
    settings: WeatherWidgetSettings,
    visual: ReturnType<typeof weatherVisual>,
): CSSProperties {
    const textPaint = paintColor(settings.textColor, settings.textOpacity);
    const titlePaint = paintColor(settings.titleColor ?? settings.textColor, settings.titleOpacity);
    const accentPaint = paintColor(settings.accentColor, settings.accentOpacity);

    return {
        borderRadius: settings.borderRadius,
        fontSize: settings.fontSize ?? (visual === "expanded" ? 32 : 26),
        fontWeight: settings.fontWeight,
        ["--weather-background" as string]: settings.backgroundColor,
        ["--weather-text" as string]: settings.textColor,
        ["--weather-accent" as string]: settings.accentColor,
        ["--weather-title-color" as string]: settings.titleColor ?? "inherit",
        ["--weather-background-opacity" as string]: settings.backgroundOpacity === undefined
            ? "1"
            : String(settings.backgroundOpacity / 100),
        ...(textPaint === settings.textColor
            ? {}
            : { ["--weather-text-paint" as string]: textPaint }),
        ...(settings.titleOpacity === undefined
            ? {}
            : { ["--weather-title-paint" as string]: titlePaint }),
        ...(accentPaint === settings.accentColor
            ? {}
            : { ["--weather-accent-paint" as string]: accentPaint }),
        ...(settings.padding === undefined
            ? {}
            : { ["--weather-padding" as string]: `${settings.padding}px` }),
        ...(settings.titleSpacing === undefined
            ? {}
            : { ["--weather-title-gap" as string]: `${settings.titleSpacing}px` }),
        ...(settings.titleFontSize === undefined
            ? {}
            : { ["--weather-title-size" as string]: `${settings.titleFontSize}px` }),
        ...(settings.titleFontWeight === undefined
            ? {}
            : { ["--weather-title-weight" as string]: String(settings.titleFontWeight) }),
    };
}

type WeatherLayoutProps = {
    heading: string;
    headingClassName: string;
    forecast: WeatherForecast | null;
    condition: ReturnType<typeof weatherCondition> | null;
    suffix: string;
    status: WeatherView["status"];
    showFeelsLike: boolean;
    showForecast: boolean;
};

function ClassicLayout({
    heading,
    headingClassName,
    forecast,
    condition,
    suffix,
    status,
    showFeelsLike,
    showForecast,
}: WeatherLayoutProps) {
    const ready = forecast !== null && condition !== null;

    return (
        <>
            <div className={styles.titleGroup}>
                <p className={headingClassName}>{heading}</p>
                {ready ? (
                    <div className={styles.main}>
                        <WeatherIcon name={condition.icon} className={styles.icon} />
                        <div className={styles.reading}>
                            <p className={`${styles.temperature} ${styles.numeric}`}>
                                {formatTemperature(forecast.current.temperature)}
                                <span>{suffix}</span>
                            </p>
                            <p className={styles.condition}>{condition.label}</p>
                            {showFeelsLike ? (
                                <p className={`${styles.feels} ${styles.numeric}`}>{feelsLine(forecast, suffix)}</p>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <p className={styles.placeholder}>{statusLabel(status)}</p>
                )}
            </div>
            {showForecast && forecast !== null ? <SlimForecast forecast={forecast} /> : null}
        </>
    );
}

function MinimalLayout({
    heading,
    headingClassName,
    forecast,
    condition,
    suffix,
    status,
    showFeelsLike,
    showForecast,
}: WeatherLayoutProps) {
    const ready = forecast !== null && condition !== null;

    return (
        <>
            <div className={styles.titleGroup}>
                {ready ? (
                    <div className={styles.main}>
                        <WeatherIcon name={condition.icon} className={styles.icon} />
                        <p className={`${styles.temperature} ${styles.numeric}`}>
                            {formatTemperature(forecast.current.temperature)}
                            <span>{suffix}</span>
                        </p>
                        {showFeelsLike ? (
                            <p className={`${styles.feels} ${styles.numeric}`}>{feelsLine(forecast, suffix)}</p>
                        ) : null}
                    </div>
                ) : (
                    <p className={styles.placeholder}>{statusLabel(status)}</p>
                )}
                <p className={headingClassName}>{heading}</p>
            </div>
            {showForecast && forecast !== null ? <SlimForecast forecast={forecast} /> : null}
        </>
    );
}

function HorizontalLayout({
    heading,
    headingClassName,
    forecast,
    condition,
    suffix,
    status,
    showFeelsLike,
    showForecast,
}: WeatherLayoutProps) {
    const ready = forecast !== null && condition !== null;

    return (
        <>
            <div className={styles.titleGroup}>
                {ready ? (
                    <div className={styles.main}>
                        <WeatherIcon name={condition.icon} className={styles.icon} />
                        <p className={`${styles.temperature} ${styles.numeric}`}>
                            {formatTemperature(forecast.current.temperature)}
                            <span>{suffix}</span>
                        </p>
                    </div>
                ) : (
                    <p className={styles.placeholder}>{statusLabel(status)}</p>
                )}
                <div className={styles.copy}>
                    <p className={headingClassName}>{heading}</p>
                    {ready ? <p className={styles.condition}>{condition.label}</p> : null}
                    {ready && showFeelsLike ? (
                        <p className={`${styles.feels} ${styles.numeric}`}>{feelsLine(forecast, suffix)}</p>
                    ) : null}
                </div>
            </div>
            {showForecast ? <SlimForecast forecast={forecast} /> : null}
        </>
    );
}

function ForecastLayout({
    heading,
    headingClassName,
    forecast,
    condition,
    suffix,
    status,
    showFeelsLike,
    showForecast,
}: WeatherLayoutProps) {
    const ready = forecast !== null && condition !== null;

    return (
        <>
            <div className={styles.summary}>
                {ready ? (
                    <>
                        <WeatherIcon name={condition.icon} className={styles.icon} />
                        <div className={styles.reading}>
                            <div className={styles.titleGroup}>
                                <p className={headingClassName}>{heading}</p>
                                <div>
                                    <p className={`${styles.temperature} ${styles.numeric}`}>
                                        {formatTemperature(forecast.current.temperature)}
                                        <span>{suffix}</span>
                                    </p>
                                    <p className={styles.condition}>{condition.label}</p>
                                    {showFeelsLike ? (
                                        <p className={`${styles.feels} ${styles.numeric}`}>{feelsLine(forecast, suffix)}</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <p className={styles.placeholder}>{statusLabel(status)}</p>
                )}
            </div>
            {showForecast ? <ForecastCards forecast={forecast} /> : null}
        </>
    );
}

function SlimForecast({ forecast }: { forecast: WeatherForecast | null }) {
    const days = forecast === null
        ? [0, 1, 2].map((index) => ({ key: String(index), name: "—", range: "—" }))
        : forecast.daily.slice(0, 3).map((day) => ({
            key: day.date,
            name: weekdayLabel(day.date),
            range: `${formatTemperature(day.high)}° / ${formatTemperature(day.low)}°`,
        }));

    return (
        <div className={styles.forecast}>
            {days.map((day) => (
                <div key={day.key} className={styles.day}>
                    <p className={styles.dayName}>{day.name}</p>
                    <p className={`${styles.dayRange} ${styles.numeric}`}>{day.range}</p>
                </div>
            ))}
        </div>
    );
}

function ForecastCards({ forecast }: { forecast: WeatherForecast | null }) {
    if (forecast === null) {
        return (
            <div className={styles.forecast}>
                {[0, 1, 2].map((index) => (
                    <div key={index} className={styles.day}>
                        <p className={styles.dayName}>—</p>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={styles.forecast}>
            {forecast.daily.slice(0, 3).map((day) => {
                const dayCondition = weatherCondition(day.weatherCode);

                return (
                    <div key={day.date} className={styles.day}>
                        <p className={styles.dayName}>{weekdayLabel(day.date)}</p>
                        <WeatherIcon name={dayCondition.icon} className={styles.dayIcon} />
                        <p className={`${styles.dayHigh} ${styles.numeric}`}>
                            {`${formatTemperature(day.high)}°`}
                        </p>
                        <p className={`${styles.dayLow} ${styles.numeric}`}>
                            {`${formatTemperature(day.low)}°`}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}

function feelsLine(forecast: WeatherForecast, suffix: string): string {
    return `Feels like ${formatTemperature(forecast.current.feelsLike)}${suffix}`;
}

function statusLabel(status: WeatherView["status"]): string {
    return status === "unavailable" ? "Weather unavailable" : "Loading weather";
}

function headingClassName(
    settings: WeatherWidgetSettings,
    titleAlign: ReturnType<typeof resolveTitleAlign>,
): string {
    return `${styles.heading} ${titleFamilyClass(settings.titleFontFamily)} ${alignClass(titleAlign)}`;
}

function minimalHeading(settings: WeatherWidgetSettings): string {
    const title = settings.title?.trim() ?? "";

    if (title !== "") {
        return title;
    }

    if (settings.location.name.trim() !== "") {
        return settings.location.name;
    }

    return settings.location.label;
}

function visualClass(visual: ReturnType<typeof weatherVisual>): string {
    if (visual === "expanded") {
        return styles.visualExpanded;
    }

    if (visual === "minimal") {
        return styles.presetMinimal;
    }

    if (visual === "horizontal") {
        return styles.presetHorizontal;
    }

    if (visual === "forecast") {
        return styles.presetForecast;
    }

    return "";
}

function alignClass(align: ReturnType<typeof resolveWeatherAlign>): string {
    if (align === "center") {
        return styles.alignCenter;
    }

    if (align === "right") {
        return styles.alignRight;
    }

    return styles.alignLeft;
}

function fontFamilyClass(family: WeatherFontFamily | undefined): string {
    if (family === "serif") {
        return styles.familySerif;
    }

    if (family === "mono") {
        return styles.familyMono;
    }

    return "";
}

function titleFamilyClass(family: WeatherFontFamily | undefined): string {
    if (family === "serif") {
        return styles.titleFamilySerif;
    }

    if (family === "mono") {
        return styles.titleFamilyMono;
    }

    if (family === "sans") {
        return styles.titleFamilySans;
    }

    return "";
}

export default WeatherWidget;
