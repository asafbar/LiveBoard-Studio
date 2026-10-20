import { useState } from "react";
import type { InformationCardWidgetSettings } from "../types/boardTypes.ts";
import styles from "./InformationCardWidget.module.css";

type InformationCardWidgetProps = {
    settings: InformationCardWidgetSettings;
};

type LoadFailure = {
    src: string;
    failed: boolean;
};

function hasText(value: string | undefined): value is string {
    return value !== undefined && value.length > 0;
}

function InformationCardWidget({ settings }: InformationCardWidgetProps) {
    const imageSrc = settings.imageSrc ?? "";
    const [loadFailure, setLoadFailure] = useState<LoadFailure>({
        src: imageSrc,
        failed: false,
    });
    const failed = loadFailure.src === imageSrc && loadFailure.failed;
    const showImage = imageSrc.length > 0 && !failed;

    return (
        <article
            className={styles.card}
            style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor,
                borderRadius: settings.borderRadius,
            }}
        >
            {showImage ? (
                <img
                    className={styles.image}
                    src={imageSrc}
                    alt=""
                    onError={() => {
                        setLoadFailure({
                            src: imageSrc,
                            failed: true,
                        });
                    }}
                />
            ) : (
                <div className={styles.fallback} aria-hidden="true" />
            )}
            {showImage ? <div className={styles.scrim} aria-hidden="true" /> : null}
            <div className={styles.content}>
                {hasText(settings.badge) ? (
                    <p className={styles.badge}>{settings.badge}</p>
                ) : null}
                {hasText(settings.subtitle) ? (
                    <p className={styles.subtitle}>{settings.subtitle}</p>
                ) : null}
                <h2 className={styles.title}>{settings.title}</h2>
                {hasText(settings.description) ? (
                    <p className={styles.description}>{settings.description}</p>
                ) : null}
            </div>
        </article>
    );
}

export default InformationCardWidget;
