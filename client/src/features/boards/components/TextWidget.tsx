import type { TextWidgetSettings } from "../types/boardTypes.ts";
import styles from "./TextWidget.module.css";

type TextWidgetProps = {
    settings: TextWidgetSettings;
};

function TextWidget({ settings }: TextWidgetProps) {
    const sizeClass = settings.size === "display" ? styles.display : styles.title;
    const toneClass = settings.tone === "accent" ? styles.accent : styles.default;

    return (
        <p className={`${styles.root} ${sizeClass} ${toneClass}`}>
            {settings.text}
        </p>
    );
}

export default TextWidget;
