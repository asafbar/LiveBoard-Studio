import type { ReactNode } from "react";
import type {
    AnnouncementIconName,
    AnnouncementItem,
    AnnouncementsWidgetSettings,
} from "../types/boardTypes.ts";
import styles from "./AnnouncementsWidget.module.css";

type AnnouncementsWidgetProps = {
    settings: AnnouncementsWidgetSettings;
};

type AnnouncementIconProps = {
    name: AnnouncementIconName;
};

type AnnouncementRowProps = {
    item: AnnouncementItem;
};

function hasText(value: string | undefined): value is string {
    return value !== undefined && value.length > 0;
}

const iconPaths: Record<AnnouncementIconName, ReactNode> = {
    food: (
        <>
            <path d="M6 3v7" />
            <path d="M4 3v4.5a2 2 0 0 0 4 0V3" />
            <path d="M6 10v11" />
            <path d="M18 3v18" />
            <path d="M14 3c0 4 4 5 4 8" />
        </>
    ),
    people: (
        <>
            <circle cx="9" cy="8" r="2.25" />
            <circle cx="16" cy="9" r="1.75" />
            <path d="M4.5 18.5c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4" />
            <path d="M13 14.7c1.2-.5 2.4-.7 3.2-.7 1.6 0 3 .9 3.6 3" />
        </>
    ),
    music: (
        <>
            <path d="M9 18V6l10-2v12" />
            <circle cx="6.5" cy="18" r="2.5" />
            <circle cx="16.5" cy="16" r="2.5" />
        </>
    ),
    info: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M12 11v5" />
            <path d="M12 8h.01" />
        </>
    ),
};

function AnnouncementIcon({ name }: AnnouncementIconProps) {
    return (
        <svg
            className={styles.symbol}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {iconPaths[name]}
        </svg>
    );
}

function AnnouncementRow({ item }: AnnouncementRowProps) {
    const itemClass = item.icon ? styles.item : styles.itemWithoutIcon;

    return (
        <li className={itemClass}>
            {item.icon ? (
                <span className={styles.icon}>
                    <AnnouncementIcon name={item.icon} />
                </span>
            ) : null}
            <div className={styles.copy}>
                <p className={styles.itemTitle}>{item.title}</p>
                {hasText(item.description) ? (
                    <p className={styles.description}>{item.description}</p>
                ) : null}
            </div>
            {hasText(item.meta) ? <p className={styles.meta}>{item.meta}</p> : null}
        </li>
    );
}

function AnnouncementsWidget({ settings }: AnnouncementsWidgetProps) {
    return (
        <section
            className={styles.panel}
            style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor,
                borderRadius: settings.borderRadius,
            }}
            aria-label={settings.title}
        >
            <h2 className={styles.header}>{settings.title}</h2>
            <ul className={styles.list}>
                {settings.items.map((item) => (
                    <AnnouncementRow key={item.id} item={item} />
                ))}
            </ul>
        </section>
    );
}

export default AnnouncementsWidget;
