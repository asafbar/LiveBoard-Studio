import { useState } from "react";
import type { ImageWidgetSettings } from "../types/boardTypes.ts";
import styles from "./ImageWidget.module.css";

type ImageWidgetProps = {
    settings: ImageWidgetSettings;
};

type LoadFailure = {
    src: string;
    failed: boolean;
};

function ImageWidget({ settings }: ImageWidgetProps) {
    const [loadFailure, setLoadFailure] = useState<LoadFailure>({
        src: settings.src,
        failed: false,
    });
    const failed = loadFailure.src === settings.src && loadFailure.failed;
    const showImage = settings.src.length > 0 && !failed;

    return (
        <div
            className={styles.root}
            style={{
                borderRadius: settings.borderRadius,
                backgroundColor: settings.fallbackBackgroundColor,
            }}
        >
            {showImage ? (
                <img
                    className={settings.objectFit === "cover" ? styles.cover : styles.contain}
                    src={settings.src}
                    alt={settings.alt}
                    onError={() => {
                        setLoadFailure({
                            src: settings.src,
                            failed: true,
                        });
                    }}
                />
            ) : (
                <div className={styles.placeholder} role="img" aria-label={settings.alt} />
            )}
        </div>
    );
}

export default ImageWidget;
