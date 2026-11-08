import type {
    NewsAlign,
    NewsCategory,
    NewsPreset,
    NewsSource,
    NewsWidgetSettings,
} from "../types/boardTypes.ts";

type NewsPhysicalAlign = "left" | "center" | "right";

type NewsFrameSize = {
    width: number;
    height: number;
};

type NewsPresetFit = {
    fits: boolean;
    message: string | null;
};

const newsPresets: readonly NewsPreset[] = ["ticker", "cards", "list"];
const newsCategories: readonly NewsCategory[] = ["israel", "breaking", "business", "technology", "earthquakes"];
const defaultNewsFontSize = 24;
const tickerTitleGapEm = 0.35;
const cardsTitleGapEm = 0.45;
const listTitleGapEm = 0.3;
const defaultNewsPaddingEm = 0.7;
const defaultTitleSizeEm = 0.85;
const maximumNewsTitleSpacing = 64;

const presetMinimums: Record<NewsPreset, NewsFrameSize> = {
    ticker: { width: 480, height: 72 },
    cards: { width: 320, height: 180 },
    list: { width: 320, height: 200 },
};

function newsPresetLabel(preset: NewsPreset): string {
    if (preset === "cards") {
        return "News Cards";
    }

    if (preset === "list") {
        return "News List";
    }

    return "Headline Ticker";
}

function newsCategoryLabel(category: NewsCategory): string {
    if (category === "breaking") {
        return "Breaking";
    }

    if (category === "business") {
        return "Business";
    }

    if (category === "technology") {
        return "Technology";
    }

    if (category === "earthquakes") {
        return "Earthquakes";
    }

    return "Israel";
}

function newsCategoriesForSource(source: NewsSource): readonly NewsCategory[] {
    if (source === "usgs") {
        return ["earthquakes"];
    }

    return ["israel", "breaking", "business", "technology"];
}

function resolveNewsDirection(settings: NewsWidgetSettings, sampleText: string): "ltr" | "rtl" {
    if (settings.direction === "ltr" || settings.direction === "rtl") {
        return settings.direction;
    }

    if (settings.direction === "auto") {
        return /[\u0590-\u05FF]/.test(sampleText) ? "rtl" : "ltr";
    }

    return "rtl";
}

function resolveNewsAlign(align: NewsAlign | undefined): NewsPhysicalAlign {
    if (align === "center") {
        return "center";
    }

    if (align === "left" || align === "start") {
        return "left";
    }

    if (align === "right" || align === "end") {
        return "right";
    }

    return "right";
}

function resolveNewsTitleAlign(settings: NewsWidgetSettings): NewsPhysicalAlign {
    if (settings.titleAlign !== undefined) {
        return resolveNewsAlign(settings.titleAlign);
    }

    return resolveNewsAlign(settings.align);
}

function newsContentFontSize(settings: NewsWidgetSettings): number {
    if (settings.fontSize !== undefined) {
        return settings.fontSize;
    }

    if (settings.preset === "list") {
        return 20;
    }

    if (settings.preset === "ticker") {
        return 28;
    }

    return defaultNewsFontSize;
}

function effectiveNewsFontSize(settings: NewsWidgetSettings): number {
    return newsContentFontSize(settings);
}

function effectiveNewsTitleFontSize(settings: NewsWidgetSettings): number {
    if (settings.titleFontSize !== undefined) {
        return settings.titleFontSize;
    }

    return Math.round(newsContentFontSize(settings) * defaultTitleSizeEm);
}

function effectiveNewsPadding(settings: NewsWidgetSettings): number {
    if (settings.padding !== undefined) {
        return settings.padding;
    }

    return Math.round(newsContentFontSize(settings) * defaultNewsPaddingEm);
}

function effectiveNewsTitleSpacing(settings: NewsWidgetSettings): number {
    if (settings.titleSpacing !== undefined) {
        return settings.titleSpacing;
    }

    const size = newsContentFontSize(settings);

    if (settings.preset === "cards") {
        return Math.round(size * cardsTitleGapEm);
    }

    if (settings.preset === "list") {
        return Math.round(size * listTitleGapEm);
    }

    return Math.round(size * tickerTitleGapEm);
}

function newsPresetFit(settings: NewsWidgetSettings, frame: NewsFrameSize): NewsPresetFit {
    const minimum = presetMinimums[settings.preset];

    if (frame.width >= minimum.width && frame.height >= minimum.height) {
        return { fits: true, message: null };
    }

    return {
        fits: false,
        message: `${newsPresetLabel(settings.preset)} needs about ${minimum.width} by ${minimum.height} pixels.`,
    };
}

function newsStatusMessage(status: "loading" | "ready" | "unavailable", count: number): string | null {
    if (count > 0) {
        return null;
    }

    if (status === "loading") {
        return "טוען כותרות";
    }

    if (status === "unavailable") {
        return "הכותרות אינן זמינות";
    }

    return "אין כותרות";
}

function newsSourceStatusMessage(
    source: NewsSource,
    status: "loading" | "ready" | "unavailable",
    count: number,
): string | null {
    if (source !== "usgs") {
        return newsStatusMessage(status, count);
    }

    if (count > 0) {
        return null;
    }

    if (status === "loading") {
        return "Loading earthquakes";
    }

    if (status === "unavailable") {
        return "Earthquake updates are unavailable";
    }

    return "No recent earthquakes";
}

function formatNewsTime(value: string, locale = "he-IL"): string {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(parsed);
}

export type { NewsFrameSize, NewsPhysicalAlign, NewsPresetFit };
export {
    effectiveNewsFontSize,
    effectiveNewsPadding,
    effectiveNewsTitleFontSize,
    effectiveNewsTitleSpacing,
    formatNewsTime,
    maximumNewsTitleSpacing,
    newsCategories,
    newsCategoriesForSource,
    newsCategoryLabel,
    newsPresetFit,
    newsPresetLabel,
    newsPresets,
    newsSourceStatusMessage,
    newsStatusMessage,
    resolveNewsAlign,
    resolveNewsDirection,
    resolveNewsTitleAlign,
};
