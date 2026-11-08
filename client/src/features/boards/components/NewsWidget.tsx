import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { NewsFontFamily, NewsWidgetSettings, WidgetLayout } from "../types/boardTypes.ts";
import { backgroundLayerOpacity, opacityVariable, paintColor } from "../../editor/colorAlpha.ts";
import { getNewsHeadlines, type NewsHeadline, type NewsPayload } from "../news/newsApi.ts";
import {
    newsCardFadeMs,
    resolveNewsScrollSpeed,
    resolveScrollDirection,
    resolveTickerMotion,
    scrollTravelSeconds,
    shouldRotateHeadlines,
    tickerPlayback,
} from "../news/newsMotion.ts";
import {
    formatNewsTime,
    newsPresetFit,
    newsSourceStatusMessage,
    resolveNewsAlign,
    resolveNewsDirection,
    resolveNewsTitleAlign,
} from "../news/newsPresentation.ts";
import { createHeadlineRotation } from "../news/newsRotation.ts";
import { resolveNewsRefreshMinutes } from "../news/newsSchedule.ts";
import {
    createWeatherLoadGate,
    disposeWeatherLoad,
    finishWeatherLoad,
    startWeatherLoad,
    weatherLoadIsCurrent,
} from "../weather/weatherLoad.ts";
import {
    createWeatherRefreshController,
    type WeatherLoadResult,
} from "../weather/weatherSchedule.ts";
import styles from "./NewsWidget.module.css";

type NewsWidgetProps = {
    settings: NewsWidgetSettings;
    studioFrame?: WidgetLayout;
};

type NewsView = {
    status: "loading" | "ready" | "unavailable";
    payload: NewsPayload | null;
    requestKey: string;
};

function NewsWidget({ settings, studioFrame }: NewsWidgetProps) {
    const [view, setView] = useState<NewsView>({
        status: "loading",
        payload: null,
        requestKey: "",
    });
    const [headlineIndex, setHeadlineIndex] = useState(0);
    const source = settings.source;
    const category = settings.category;
    const maxHeadlines = settings.maxHeadlines;
    const refreshIntervalMinutes = settings.refreshIntervalMinutes;
    const rotationSeconds = settings.rotationSeconds;
    const preset = settings.preset;
    const requestKey = `${source}:${category}:${maxHeadlines}`;

    useEffect(() => {
        const gate = createWeatherLoadGate();
        const controller = new AbortController();
        const refresh = createWeatherRefreshController({
            refreshMinutes: resolveNewsRefreshMinutes(refreshIntervalMinutes),
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
                    const payload = await getNewsHeadlines(source, category, maxHeadlines, controller.signal);

                    if (!weatherLoadIsCurrent(gate, generation)) {
                        return "skipped";
                    }

                    setView({
                        status: "ready",
                        payload,
                        requestKey,
                    });
                    return "success";
                } catch {
                    if (!weatherLoadIsCurrent(gate, generation)) {
                        return "skipped";
                    }

                    setView((current) => {
                        if (current.requestKey === requestKey && current.payload !== null) {
                            return {
                                status: "ready",
                                requestKey,
                                payload: {
                                    ...current.payload,
                                    status: "stale",
                                },
                            };
                        }

                        return {
                            status: "unavailable",
                            payload: null,
                            requestKey,
                        };
                    });
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
    }, [category, maxHeadlines, refreshIntervalMinutes, requestKey, source]);

    const currentView = view.requestKey === requestKey
        ? view
        : { status: "loading" as const, payload: null, requestKey };
    const items = currentView.payload?.items ?? [];
    const itemKey = items.map((item) => item.id).join("\n");
    const motion = resolveTickerMotion(settings.tickerMotion);
    const rotating = shouldRotateHeadlines(preset, motion);

    useEffect(() => {
        if (!rotating) {
            return;
        }

        const rotation = createHeadlineRotation({
            count: items.length,
            intervalMs: rotationSeconds * 1000,
            timers: {
                set: (callback, delay) => window.setTimeout(callback, delay),
                clear: (id) => window.clearTimeout(id),
                hidden: () => document.hidden,
            },
            onIndex: setHeadlineIndex,
        });

        rotation.start();
        document.addEventListener("visibilitychange", rotation.onVisibility);

        return () => {
            rotation.stop();
            document.removeEventListener("visibilitychange", rotation.onVisibility);
        };
    }, [itemKey, items.length, rotating, rotationSeconds]);

    const activeIndex = items.length === 0 ? 0 : headlineIndex % items.length;
    const active = items[activeIndex] ?? null;
    const directionSample = `${settings.title ?? ""} ${active?.title ?? items[0]?.title ?? ""}`;
    const direction = resolveNewsDirection(settings, directionSample);
    const align = resolveNewsAlign(settings.align);
    const titleAlign = resolveNewsTitleAlign(settings);
    const fit = studioFrame === undefined ? null : newsPresetFit(settings, studioFrame);
    const stale = currentView.payload?.status === "stale";
    const live = currentView.payload?.mode === "live" && currentView.payload.source === "usgs";
    const sourceLabel = settings.source === "usgs"
        ? (live && !stale ? "Live data" : "USGS")
        : "Sample headlines";
    const creditUrl = live ? currentView.payload?.attribution.url ?? null : null;
    const widgetTitle = settings.title?.trim() ?? "";
    const content = renderContent(settings, currentView, active, items, direction);

    return (
        <section
            className={[
                styles.root,
                presetClass(preset),
                alignClass(align),
                fontClass(settings.fontFamily),
            ].filter(Boolean).join(" ")}
            dir={direction}
            style={newsStyle(settings)}
            aria-label={widgetTitle || active?.title || (settings.source === "usgs" ? "Earthquake updates" : "Sample headlines")}
        >
            <div className={styles.body}>
                {widgetTitle === "" ? content : (
                    <div className={styles.titleGroup}>
                        <h2 className={`${styles.heading} ${titleAlignClass(titleAlign)} ${titleFontClass(settings.titleFontFamily)}`}>
                            {widgetTitle}
                        </h2>
                        {content}
                    </div>
                )}
                {fit !== null && fit.fits === false && fit.message !== null ? (
                    <p className={styles.fitNote}>{fit.message}</p>
                ) : null}
            </div>
            <footer className={styles.footer}>
                <p className={styles.sampleLabel}>{sourceLabel}</p>
                {currentView.payload !== null ? (
                    <p className={styles.attribution}>{currentView.payload.attribution.text}</p>
                ) : null}
                {creditUrl !== null ? (
                    <a className={styles.creditLink} href={creditUrl} rel="noreferrer" target="_blank">
                        U.S. Geological Survey
                    </a>
                ) : null}
                {stale ? <p className={styles.stale}>Updated earlier</p> : null}
            </footer>
        </section>
    );
}

function renderContent(
    settings: NewsWidgetSettings,
    view: NewsView,
    active: NewsPayload["items"][number] | null,
    items: NewsPayload["items"],
    direction: "ltr" | "rtl",
) {
    if (view.status === "loading" && items.length === 0) {
        return <p className={styles.status}>{newsSourceStatusMessage(settings.source, view.status, 0)}</p>;
    }

    if (items.length === 0) {
        return <p className={styles.status}>{newsSourceStatusMessage(settings.source, view.status, 0)}</p>;
    }

    if (settings.preset === "list") {
        return (
            <ul className={styles.list}>
                {items.map((item) => (
                    <li key={item.id} className={styles.row}>
                        <p className={styles.rowTitle}>{item.title}</p>
                        <p className={styles.rowMeta}>
                            <span>{item.publisher}</span>
                            <span className={styles.numeric}>{formatNewsTime(item.publishedAt, timeLocale(settings))}</span>
                        </p>
                    </li>
                ))}
            </ul>
        );
    }

    if (settings.preset === "ticker" && resolveTickerMotion(settings.tickerMotion) === "scroll") {
        return (
            <NewsTickerScroll
                items={items}
                scrollDirection={resolveScrollDirection(settings.scrollDirection, direction)}
                speed={resolveNewsScrollSpeed(settings.scrollSpeed)}
            />
        );
    }

    if (active === null) {
        return <p className={styles.status}>{newsSourceStatusMessage(settings.source, "ready", 0)}</p>;
    }

    const motionClass = settings.preset === "cards" ? styles.cardMotion : styles.tickerMotion;
    const motionStyle = settings.preset === "cards"
        ? { animationDuration: `${newsCardFadeMs}ms` }
        : undefined;

    return (
        <div key={active.id} className={motionClass} style={motionStyle}>
            <p className={styles.headline}>{active.title}</p>
            {settings.preset === "cards" ? (
                <p className={styles.meta}>
                    <span>{active.publisher}</span>
                    <span className={styles.numeric}>{formatNewsTime(active.publishedAt, timeLocale(settings))}</span>
                </p>
            ) : null}
        </div>
    );
}

function timeLocale(settings: NewsWidgetSettings): string {
    return settings.source === "usgs" ? "en-US" : "he-IL";
}

function newsStyle(settings: NewsWidgetSettings): CSSProperties {
    const textPaint = paintColor(settings.textColor, settings.textOpacity);
    const titlePaint = paintColor(settings.titleColor ?? settings.textColor, settings.titleOpacity);
    const accentPaint = paintColor(settings.accentColor, settings.accentOpacity);
    const textOpacity = opacityVariable(settings.textOpacity);

    return {
        borderRadius: settings.borderRadius,
        fontSize: settings.fontSize ?? (settings.preset === "list" ? 20 : settings.preset === "ticker" ? 28 : 24),
        fontWeight: settings.fontWeight,
        ["--news-background" as string]: settings.backgroundColor,
        ["--news-text" as string]: settings.textColor,
        ["--news-accent" as string]: settings.accentColor,
        ["--news-title-color" as string]: settings.titleColor ?? "inherit",
        ["--news-background-opacity" as string]: String(backgroundLayerOpacity(settings.backgroundOpacity)),
        ...(textPaint === settings.textColor
            ? {}
            : { ["--news-text-paint" as string]: textPaint }),
        ...(settings.titleOpacity === undefined
            ? {}
            : { ["--news-title-paint" as string]: titlePaint }),
        ...(accentPaint === settings.accentColor
            ? {}
            : { ["--news-accent-paint" as string]: accentPaint }),
        ...(textOpacity === undefined
            ? {}
            : { ["--news-text-opacity" as string]: textOpacity }),
        ...(settings.padding === undefined
            ? {}
            : { ["--news-padding" as string]: `${settings.padding}px` }),
        ...(settings.titleSpacing === undefined
            ? {}
            : { ["--news-title-gap" as string]: `${settings.titleSpacing}px` }),
        ...(settings.titleFontSize === undefined
            ? {}
            : { ["--news-title-size" as string]: `${settings.titleFontSize}px` }),
        ...(settings.titleFontWeight === undefined
            ? {}
            : { ["--news-title-weight" as string]: String(settings.titleFontWeight) }),
    };
}

function presetClass(preset: NewsWidgetSettings["preset"]): string {
    if (preset === "cards") {
        return styles.presetCards;
    }

    if (preset === "list") {
        return styles.presetList;
    }

    return styles.presetTicker;
}

function alignClass(align: "left" | "center" | "right"): string {
    if (align === "center") {
        return styles.alignCenter;
    }

    if (align === "left") {
        return styles.alignLeft;
    }

    return styles.alignRight;
}

function titleAlignClass(align: "left" | "center" | "right"): string {
    if (align === "center") {
        return styles.titleCenter;
    }

    if (align === "left") {
        return styles.titleLeft;
    }

    return styles.titleRight;
}

function fontClass(family: NewsFontFamily | undefined): string {
    if (family === "serif") {
        return styles.familySerif;
    }

    if (family === "mono") {
        return styles.familyMono;
    }

    return "";
}

function titleFontClass(family: NewsFontFamily | undefined): string {
    if (family === "serif") {
        return styles.titleFamilySerif;
    }

    if (family === "mono") {
        return styles.titleFamilyMono;
    }

    return "";
}

function NewsTickerScroll({
    items,
    scrollDirection,
    speed,
}: {
    items: NewsHeadline[];
    scrollDirection: "ltr" | "rtl";
    speed: number;
}) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const sampleRef = useRef<HTMLDivElement>(null);
    const [loop, setLoop] = useState({ copies: 1, distance: 0 });
    const [playback, setPlayback] = useState(() => tickerPlayback(false, false));
    const itemKey = items.map((item) => item.id).join("\n");

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const sample = sampleRef.current;

        if (viewport === null || sample === null) {
            return;
        }

        function measure() {
            const currentViewport = viewportRef.current;
            const currentSample = sampleRef.current;

            if (currentViewport === null || currentSample === null) {
                return;
            }

            const sequenceWidth = currentSample.offsetWidth;
            const viewportWidth = currentViewport.clientWidth;
            const copies = sequenceWidth > 0
                ? Math.min(8, Math.max(1, Math.ceil(viewportWidth / sequenceWidth)))
                : 1;
            const distance = sequenceWidth * copies;

            setLoop((current) => {
                if (current.copies === copies && current.distance === distance) {
                    return current;
                }

                return { copies, distance };
            });
        }

        measure();

        const observer = new ResizeObserver(() => {
            measure();
        });

        observer.observe(viewport);
        observer.observe(sample);

        return () => {
            observer.disconnect();
        };
    }, [itemKey, scrollDirection, speed]);

    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");

        function update() {
            setPlayback(tickerPlayback(document.hidden, media.matches));
        }

        update();
        media.addEventListener("change", update);
        document.addEventListener("visibilitychange", update);

        return () => {
            media.removeEventListener("change", update);
            document.removeEventListener("visibilitychange", update);
        };
    }, []);

    const seconds = scrollTravelSeconds(loop.distance, speed);
    const moving = playback !== "static" && seconds > 0;
    const trackClass = scrollDirection === "rtl" ? styles.scrollTrackRtl : styles.scrollTrackLtr;
    const copies = Array.from({ length: loop.copies }, (_, index) => index);

    return (
        <div ref={viewportRef} className={styles.scrollViewport} dir="ltr">
            <div ref={sampleRef} className={styles.scrollSample} aria-hidden="true">
                <NewsScrollSequence items={items} copyKey="sample" />
            </div>
            {playback === "static" ? (
                <div className={styles.scrollStatic}>
                    <NewsScrollSequence items={items} copyKey="static" />
                </div>
            ) : (
                <div
                    className={`${styles.scrollTrack} ${trackClass}`}
                    style={moving ? {
                        animationDuration: `${seconds}s`,
                        animationPlayState: playback === "paused" ? "paused" : "running",
                    } : { animation: "none" }}
                >
                    <div className={styles.scrollHalf}>
                        {copies.map((index) => (
                            <NewsScrollSequence
                                key={`lead-${index}`}
                                items={items}
                                copyKey={`lead-${index}`}
                            />
                        ))}
                    </div>
                    <div className={styles.scrollHalf} aria-hidden="true">
                        {copies.map((index) => (
                            <NewsScrollSequence
                                key={`follow-${index}`}
                                items={items}
                                copyKey={`follow-${index}`}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function NewsScrollSequence({ items, copyKey }: { items: NewsHeadline[]; copyKey: string }) {
    return (
        <div className={styles.scrollSequence} aria-hidden={copyKey === "lead-0" || copyKey === "static" ? undefined : true}>
            {items.map((item) => (
                <span key={`${copyKey}-${item.id}`} className={styles.scrollItem}>
                    <span dir="auto">{item.title}</span>
                    <span className={styles.scrollGap} aria-hidden="true" />
                </span>
            ))}
        </div>
    );
}

export default NewsWidget;
