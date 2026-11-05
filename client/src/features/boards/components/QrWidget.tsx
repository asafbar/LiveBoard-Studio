import type { CSSProperties } from "react";
import { backgroundLayerOpacity, paintColor } from "../../editor/colorAlpha.ts";
import type { QrFontFamily, QrWidgetSettings } from "../types/boardTypes.ts";
import { createQrSvg, qrContentIssue } from "../qr/qrContent.ts";
import {
    resolveQrAlign,
    resolveQrDirection,
    resolveQrFontFamily,
    resolveQrFontSize,
    resolveQrFontWeight,
    resolveQrPadding,
    resolveQrTitleFontFamily,
    resolveQrTitleFontSize,
    resolveQrTitleFontWeight,
    resolveQrTitleSpacing,
} from "../qr/qrPresentation.ts";
import styles from "./QrWidget.module.css";

type QrWidgetProps = {
    settings: QrWidgetSettings;
};

type QrStyle = CSSProperties & {
    "--qr-background": string;
    "--qr-background-opacity": string;
    "--qr-text": string;
    "--qr-title"?: string;
    "--qr-padding": string;
    "--qr-title-spacing": string;
    "--qr-font": string;
    "--qr-title-font": string;
    "--qr-weight": string;
    "--qr-title-weight": string;
    "--qr-text-size": string;
    "--qr-title-size": string;
};

const fontStacks: Record<QrFontFamily, string> = {
    sans: "var(--font-sans)",
    serif: "Georgia, \"Times New Roman\", serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

function QrWidget({ settings }: QrWidgetProps) {
    const direction = resolveQrDirection(settings);
    const issue = qrContentIssue(settings.content);
    const svg = issue === null
        ? createQrSvg(settings.content, settings.foregroundColor, settings.codeBackgroundColor)
        : null;
    const title = settings.title?.trim() ?? "";
    const subtitle = settings.subtitle?.trim() ?? "";
    const label = title.length > 0 ? title : "QR code";

    return (
        <section
            className={styles.root}
            dir={direction === "auto" ? undefined : direction}
            data-preset={settings.preset}
            data-align={resolveQrAlign(settings)}
            style={qrStyle(settings)}
            aria-label={label}
        >
            {settings.preset === "split" ? (
                <SplitQr
                    title={title}
                    subtitle={subtitle}
                    svg={svg}
                    issue={issue ?? (svg === null ? "This code could not be created." : null)}
                    settings={settings}
                />
            ) : (
                <ClassicQr
                    title={title}
                    subtitle={subtitle}
                    svg={svg}
                    issue={issue ?? (svg === null ? "This code could not be created." : null)}
                    settings={settings}
                />
            )}
        </section>
    );
}

function ClassicQr({
    title,
    subtitle,
    svg,
    issue,
    settings,
}: QrFrameProps) {
    return (
        <div className={`${styles.frame} ${styles.classic}`}>
            {title.length > 0 ? <QrTitle title={title} settings={settings} /> : null}
            <QrMark svg={svg} issue={issue} />
            {subtitle.length > 0 ? <QrSubtitle subtitle={subtitle} /> : null}
        </div>
    );
}

function SplitQr({
    title,
    subtitle,
    svg,
    issue,
    settings,
}: QrFrameProps) {
    return (
        <div className={`${styles.frame} ${styles.split}`}>
            <div className={styles.copy}>
                {title.length > 0 ? <QrTitle title={title} settings={settings} /> : null}
                {subtitle.length > 0 ? <QrSubtitle subtitle={subtitle} /> : null}
            </div>
            <QrMark svg={svg} issue={issue} />
        </div>
    );
}

type QrFrameProps = {
    title: string;
    subtitle: string;
    svg: string | null;
    issue: string | null;
    settings: QrWidgetSettings;
};

function QrTitle({ title, settings }: { title: string; settings: QrWidgetSettings }) {
    return (
        <h2 className={styles.title} dir="auto" style={{ textAlign: titleTextAlign(settings) }}>{title}</h2>
    );
}

function QrSubtitle({ subtitle }: { subtitle: string }) {
    return <p className={styles.subtitle} dir="auto">{subtitle}</p>;
}

function QrMark({ svg, issue }: { svg: string | null; issue: string | null }) {
    if (svg === null) {
        return <p className={styles.issue}>{issue}</p>;
    }

    return (
        <div
            className={styles.code}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

function titleTextAlign(settings: QrWidgetSettings): CSSProperties["textAlign"] {
    const align = settings.titleAlign ?? resolveQrAlign(settings);

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

function qrStyle(settings: QrWidgetSettings): QrStyle {
    const text = paintColor(settings.textColor, settings.textOpacity);
    const title = settings.titleColor === undefined
        ? undefined
        : paintColor(settings.titleColor, settings.titleOpacity);
    const style: QrStyle = {
        "--qr-background": settings.backgroundColor,
        "--qr-background-opacity": String(backgroundLayerOpacity(settings.backgroundOpacity)),
        "--qr-text": text,
        "--qr-padding": `${resolveQrPadding(settings)}px`,
        "--qr-title-spacing": `${resolveQrTitleSpacing(settings)}px`,
        "--qr-font": fontStacks[resolveQrFontFamily(settings)],
        "--qr-title-font": fontStacks[resolveQrTitleFontFamily(settings)],
        "--qr-weight": String(resolveQrFontWeight(settings)),
        "--qr-title-weight": String(resolveQrTitleFontWeight(settings)),
        "--qr-text-size": `${resolveQrFontSize(settings)}px`,
        "--qr-title-size": `${resolveQrTitleFontSize(settings)}px`,
        borderRadius: `${settings.borderRadius}px`,
    };

    if (title !== undefined) {
        style["--qr-title"] = title;
    }

    return style;
}

export default QrWidget;
