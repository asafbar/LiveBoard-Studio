import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { paintColor } from "../../editor/colorAlpha.ts";
import type { TickerDirection, TickerMessage, TickerWidgetSettings } from "../types/boardTypes.ts";
import {
    resolvedTickerFontSize,
    resolvedTickerFontWeight,
    tickerFontStack,
} from "../../editor/tickerSettings.ts";
import styles from "./TickerWidget.module.css";

type TickerWidgetProps = {
    settings: TickerWidgetSettings;
};

type TickerSequenceProps = {
    messages: TickerMessage[];
    hidden: boolean;
    direction: TickerDirection;
    fontStyle: CSSProperties;
};

type TickerLoop = {
    copies: number;
    distance: number;
};

type TickerStyle = CSSProperties & {
    "--ticker-accent": string;
    "--ticker-accent-paint"?: string;
};

const minimumPlaybackSpeed = 20;
const maximumPlaybackSpeed = 400;
const maximumTickerCopies = 64;

function visibleTickerMessages(messages: TickerMessage[]): TickerMessage[] {
    return messages.filter((message) => message.text.trim().length > 0);
}

function playbackSpeed(speed: number): number {
    if (!Number.isFinite(speed)) {
        return minimumPlaybackSpeed;
    }

    return Math.min(maximumPlaybackSpeed, Math.max(minimumPlaybackSpeed, speed));
}

function TickerSequence({ messages, hidden, direction, fontStyle }: TickerSequenceProps) {
    const className = direction === "ltr"
        ? `${styles.sequence} ${styles.sequenceLtr}`
        : styles.sequence;

    return (
        <span
            className={className}
            style={fontStyle}
            data-ticker-sequence={hidden ? "repeat" : "primary"}
            aria-hidden={hidden ? true : undefined}
        >
            {messages.map((message, index) => (
                <span key={message.id} className={styles.item}>
                    <span className={styles.message} dir="auto" data-ticker-index={index}>
                        {message.text}
                    </span>
                    <span className={styles.separator} aria-hidden="true" />
                </span>
            ))}
        </span>
    );
}

function TickerWidget({ settings }: TickerWidgetProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const sampleRef = useRef<HTMLSpanElement>(null);
    const [loop, setLoop] = useState<TickerLoop>({ copies: 1, distance: 0 });
    const messages = visibleTickerMessages(settings.messages);
    const fontStyle: CSSProperties = {
        fontFamily: tickerFontStack(settings.fontFamily),
        fontSize: `${resolvedTickerFontSize(settings.fontSize)}px`,
        fontWeight: resolvedTickerFontWeight(settings.fontWeight),
    };
    const sequenceKey = [
        settings.direction,
        fontStyle.fontFamily,
        fontStyle.fontSize,
        fontStyle.fontWeight,
        messages.map((message) => `${message.id}\u0000${message.text}`).join("\u0001"),
    ].join("\u0002");
    const accentPaint = paintColor(settings.accentColor, settings.accentOpacity);
    const panelStyle: TickerStyle = {
        backgroundColor: paintColor(settings.backgroundColor, settings.backgroundOpacity),
        color: paintColor(settings.textColor, settings.textOpacity),
        borderRadius: settings.borderRadius,
        "--ticker-accent": settings.accentColor,
        ...(accentPaint === settings.accentColor
            ? {}
            : { "--ticker-accent-paint": accentPaint }),
    };

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
                ? Math.min(maximumTickerCopies, Math.max(1, Math.ceil(viewportWidth / sequenceWidth)))
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
    }, [sequenceKey]);

    if (messages.length === 0) {
        return (
            <section className={styles.panel} style={panelStyle} aria-label="Ticker">
                <p className={styles.empty} style={fontStyle}>Add a message</p>
            </section>
        );
    }

    const speed = playbackSpeed(settings.speed);
    const duration = loop.distance > 0 ? `${loop.distance / speed}s` : undefined;
    const motionClassName = duration === undefined
        ? ""
        : settings.direction === "ltr" ? styles.trackLtr : styles.trackRtl;
    const trackClassName = motionClassName === "" ? styles.track : `${styles.track} ${motionClassName}`;

    return (
        <section className={styles.panel} style={panelStyle} aria-label={messages[0]?.text ?? "Ticker"}>
            <div className={styles.viewport} ref={viewportRef}>
                <span className={styles.sample} ref={sampleRef} aria-hidden="true">
                    <TickerSequence
                        messages={messages}
                        hidden
                        direction={settings.direction}
                        fontStyle={fontStyle}
                    />
                </span>
                <div
                    className={trackClassName}
                    style={duration === undefined ? undefined : { animationDuration: duration }}
                >
                    <span className={styles.half}>
                        {Array.from({ length: loop.copies }, (_, copyIndex) => (
                            <TickerSequence
                                key={copyIndex}
                                messages={messages}
                                hidden={copyIndex > 0}
                                direction={settings.direction}
                                fontStyle={fontStyle}
                            />
                        ))}
                    </span>
                    <span className={styles.half} aria-hidden="true">
                        {Array.from({ length: loop.copies }, (_, copyIndex) => (
                            <TickerSequence
                                key={copyIndex}
                                messages={messages}
                                hidden
                                direction={settings.direction}
                                fontStyle={fontStyle}
                            />
                        ))}
                    </span>
                </div>
            </div>
        </section>
    );
}

export default TickerWidget;
