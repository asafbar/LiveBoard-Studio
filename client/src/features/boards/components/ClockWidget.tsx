import { useEffect, useState } from "react";
import type { ClockWidgetSettings } from "../types/boardTypes.ts";
import styles from "./ClockWidget.module.css";

type ClockWidgetProps = {
    settings: ClockWidgetSettings;
};

function formatTime(date: Date, settings: ClockWidgetSettings): string {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: settings.timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    };

    if (settings.showSeconds) {
        options.second = "2-digit";
    }

    return new Intl.DateTimeFormat("en-GB", options).format(date);
}

function formatDate(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone,
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

function ClockWidget({ settings }: ClockWidgetProps) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    const alignmentClass = settings.align === "right" ? styles.alignRight : styles.alignLeft;

    return (
        <div className={`${styles.root} ${alignmentClass}`}>
            <p className={styles.time}>{formatTime(now, settings)}</p>
            {settings.showDate ? (
                <p className={styles.date}>{formatDate(now, settings.timeZone)}</p>
            ) : null}
        </div>
    );
}

export default ClockWidget;
