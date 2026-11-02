import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type {
    VerticalAnnouncementItem,
    VerticalAnnouncementsWidgetSettings,
} from "../types/boardTypes.ts";
import { resolvedTickerFontWeight, tickerFontStack } from "../../editor/tickerSettings.ts";
import {
    resolvedVerticalAnnouncementDescriptionFontSize,
    resolvedVerticalAnnouncementPauseSeconds,
    resolvedVerticalAnnouncementSpeed,
    resolvedVerticalAnnouncementTitleFontSize,
} from "../../editor/verticalAnnouncementsSettings.ts";
import styles from "./VerticalAnnouncementsWidget.module.css";

type VerticalAnnouncementsWidgetProps = {
    settings: VerticalAnnouncementsWidgetSettings;
};

type SequenceProps = {
    items: VerticalAnnouncementItem[];
    hidden: boolean;
    primary: boolean;
    fontStyle: CSSProperties;
    titleSize: number;
    descriptionSize: number;
    labelSize: number;
};

type MotionKeyframe = {
    transform: string;
    offset: number;
};

type Motion = {
    duration: number;
    keyframes: MotionKeyframe[];
};

type LoopMeasure = {
    copies: number;
    token: string;
};

type PanelStyle = CSSProperties & {
    "--vertical-accent": string;
    "--vertical-radius": string;
};

const maximumCopies = 24;

function visibleItems(items: VerticalAnnouncementItem[]): VerticalAnnouncementItem[] {
    return items.filter((item) => {
        const description = item.description ?? "";
        const label = item.label ?? "";

        return item.title.trim().length > 0
            || description.trim().length > 0
            || label.trim().length > 0;
    });
}

function buildMotion(heights: number[], speed: number, pauseMs: number): Motion {
    const distance = heights.reduce((sum, height) => sum + height, 0);

    if (distance <= 0 || speed <= 0) {
        return { duration: 0, keyframes: [] };
    }

    if (pauseMs <= 0) {
        return {
            duration: (distance / speed) * 1000,
            keyframes: [
                { transform: "translate3d(0, 0, 0)", offset: 0 },
                { transform: `translate3d(0, ${-distance}px, 0)`, offset: 1 },
            ],
        };
    }

    const points: { time: number; y: number }[] = [
        { time: 0, y: 0 },
        { time: pauseMs, y: 0 },
    ];
    let time = pauseMs;
    let y = 0;

    heights.forEach((height, index) => {
        time += (height / speed) * 1000;
        y += height;
        points.push({ time, y });

        if (index < heights.length - 1) {
            time += pauseMs;
            points.push({ time, y });
        }
    });

    const duration = time;

    return {
        duration,
        keyframes: points.map((point, index) => ({
            transform: `translate3d(0, ${-point.y}px, 0)`,
            offset: index === points.length - 1 ? 1 : point.time / duration,
        })),
    };
}

function AnnouncementSequence({
    items,
    hidden,
    primary,
    fontStyle,
    titleSize,
    descriptionSize,
    labelSize,
}: SequenceProps) {
    return (
        <div
            className={styles.sequence}
            style={fontStyle}
            data-vertical-sequence={primary ? "primary" : "repeat"}
            aria-hidden={hidden ? true : undefined}
        >
            {items.map((item, index) => {
                const description = item.description ?? "";
                const label = item.label ?? "";

                return (
                    <article
                        key={item.id}
                        className={styles.item}
                        data-vertical-item
                        data-vertical-index={index}
                    >
                        {label.trim().length > 0 ? (
                            <p className={styles.label} dir="auto" style={{ fontSize: `${labelSize}px` }}>
                                {label}
                            </p>
                        ) : null}
                        {item.title.trim().length > 0 ? (
                            <h3 className={styles.title} dir="auto" style={{ fontSize: `${titleSize}px` }}>
                                {item.title}
                            </h3>
                        ) : null}
                        {description.trim().length > 0 ? (
                            <p className={styles.description} dir="auto" style={{ fontSize: `${descriptionSize}px` }}>
                                {description}
                            </p>
                        ) : null}
                    </article>
                );
            })}
        </div>
    );
}

function VerticalAnnouncementsWidget({ settings }: VerticalAnnouncementsWidgetProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const sampleRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [loop, setLoop] = useState<LoopMeasure>({ copies: 1, token: "0" });
    const [reducedMotion, setReducedMotion] = useState(() => {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });
    const items = visibleItems(settings.items);
    const titleSize = resolvedVerticalAnnouncementTitleFontSize(settings.titleFontSize);
    const descriptionSize = resolvedVerticalAnnouncementDescriptionFontSize(settings.descriptionFontSize);
    const labelSize = Math.max(12, Math.round(descriptionSize * 0.85));
    const fontStyle: CSSProperties = {
        fontFamily: tickerFontStack(settings.fontFamily),
        fontWeight: resolvedTickerFontWeight(settings.fontWeight),
        fontSize: `${descriptionSize}px`,
    };
    const sequenceKey = [
        fontStyle.fontFamily,
        fontStyle.fontWeight,
        titleSize,
        descriptionSize,
        items.map((item) => `${item.id}\u0000${item.title}\u0000${item.description ?? ""}\u0000${item.label ?? ""}`).join("\u0001"),
    ].join("\u0002");
    const panelStyle: PanelStyle = {
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        borderRadius: settings.borderRadius,
        "--vertical-accent": settings.accentColor,
        "--vertical-radius": `${settings.borderRadius}px`,
    };
    const speed = resolvedVerticalAnnouncementSpeed(settings.speed);
    const pauseMs = resolvedVerticalAnnouncementPauseSeconds(settings.pauseSeconds) * 1000;

    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");

        function handleChange() {
            setReducedMotion(media.matches);
        }

        media.addEventListener("change", handleChange);

        return () => {
            media.removeEventListener("change", handleChange);
        };
    }, []);

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

            const sequenceHeight = currentSample.offsetHeight;
            const viewportHeight = currentViewport.clientHeight;
            const copies = sequenceHeight > 0
                ? Math.min(maximumCopies, Math.max(1, Math.ceil(viewportHeight / sequenceHeight)))
                : 1;
            const token = [
                copies,
                sequenceHeight,
                currentViewport.clientWidth,
                viewportHeight,
            ].join(":");

            setLoop((current) => {
                if (current.copies === copies && current.token === token) {
                    return current;
                }

                return { copies, token };
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
    }, [sequenceKey]);

    useEffect(() => {
        const track = trackRef.current;

        if (track === null || reducedMotion) {
            return;
        }

        const half = track.querySelector<HTMLElement>("[data-vertical-half='primary']");

        if (half === null) {
            return;
        }

        const measured = [...half.querySelectorAll<HTMLElement>("[data-vertical-item]")]
            .map((item) => item.offsetHeight);
        const sum = measured.reduce((total, height) => total + height, 0);
        const delta = half.offsetHeight - sum;

        if (measured.length > 0 && delta !== 0) {
            const lastHeight = measured[measured.length - 1] ?? 0;
            measured[measured.length - 1] = lastHeight + delta;
        }

        const motion = buildMotion(measured, speed, pauseMs);

        if (motion.duration <= 0) {
            return;
        }

        const animation = track.animate(motion.keyframes, {
            duration: motion.duration,
            iterations: Infinity,
            easing: "linear",
        });

        return () => {
            animation.cancel();
        };
    }, [loop, pauseMs, reducedMotion, sequenceKey, speed]);

    if (items.length === 0) {
        return (
            <section className={styles.panel} style={panelStyle} aria-label="Vertical announcements">
                <p className={styles.empty} style={fontStyle}>Add an announcement</p>
            </section>
        );
    }

    const label = items.find((item) => item.title.trim().length > 0)?.title ?? "Vertical announcements";

    return (
        <section className={styles.panel} style={panelStyle} aria-label={label}>
            <div className={styles.viewport} ref={viewportRef}>
                <div className={styles.sample} ref={sampleRef} aria-hidden="true">
                    <AnnouncementSequence
                        items={items}
                        hidden
                        primary={false}
                        fontStyle={fontStyle}
                        titleSize={titleSize}
                        descriptionSize={descriptionSize}
                        labelSize={labelSize}
                    />
                </div>
                <div className={styles.track} ref={trackRef} data-vertical-track>
                    <div className={styles.half} data-vertical-half="primary">
                        {Array.from({ length: loop.copies }, (_, copyIndex) => (
                            <AnnouncementSequence
                                key={copyIndex}
                                items={items}
                                hidden={copyIndex > 0}
                                primary={copyIndex === 0}
                                fontStyle={fontStyle}
                                titleSize={titleSize}
                                descriptionSize={descriptionSize}
                                labelSize={labelSize}
                            />
                        ))}
                    </div>
                    <div className={styles.half} data-vertical-half="repeat" aria-hidden="true">
                        {Array.from({ length: loop.copies }, (_, copyIndex) => (
                            <AnnouncementSequence
                                key={copyIndex}
                                items={items}
                                hidden
                                primary={false}
                                fontStyle={fontStyle}
                                titleSize={titleSize}
                                descriptionSize={descriptionSize}
                                labelSize={labelSize}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default VerticalAnnouncementsWidget;
