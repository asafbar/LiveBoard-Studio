import type {
    Board,
    NewsAlign,
    NewsCategory,
    NewsDirection,
    NewsFontFamily,
    NewsFontWeight,
    NewsPreset,
    NewsRefreshMinutes,
    NewsScrollDirection,
    NewsSource,
    NewsTickerMotion,
    NewsWidgetSettings,
} from "../boards/types/boardTypes.ts";
import { maximumNewsScrollSpeed, minimumNewsScrollSpeed } from "../boards/news/newsMotion.ts";
import { normalizeCssColor } from "./cssColor.ts";
import { radiusIsInRange } from "./imageSettings.ts";
import { maximumNewsTitleSpacing } from "../boards/news/newsPresentation.ts";

type NewsSettingsPatch = Omit<
    Partial<NewsWidgetSettings>,
    "preset" | "tickerMotion" | "scrollDirection" | "scrollSpeed" | "backgroundOpacity" | "textOpacity" | "titleOpacity" | "accentOpacity" | "padding" | "titleSpacing" | "titleColor" | "titleAlign" | "direction" | "align" | "fontFamily" | "fontSize" | "fontWeight" | "titleFontFamily" | "titleFontSize" | "titleFontWeight"
> & {
    preset?: NewsPreset | null;
    tickerMotion?: NewsTickerMotion | null;
    scrollDirection?: NewsScrollDirection | null;
    scrollSpeed?: number | null;
    backgroundOpacity?: number | null;
    textOpacity?: number | null;
    titleOpacity?: number | null;
    accentOpacity?: number | null;
    padding?: number | null;
    titleSpacing?: number | null;
    titleColor?: string | null;
    titleAlign?: NewsAlign | null;
    direction?: NewsDirection | null;
    align?: NewsAlign | null;
    fontFamily?: NewsFontFamily | null;
    fontSize?: number | null;
    fontWeight?: NewsFontWeight | null;
    titleFontFamily?: NewsFontFamily | null;
    titleFontSize?: number | null;
    titleFontWeight?: NewsFontWeight | null;
};

const newsSources: readonly NewsSource[] = ["sample", "usgs"];
const newsFontFamilies: readonly NewsFontFamily[] = ["sans", "serif", "mono"];
const newsFontWeights: readonly NewsFontWeight[] = [400, 500, 600, 700];
const newsDirections: readonly NewsDirection[] = ["auto", "ltr", "rtl"];
const newsAlignments: readonly NewsAlign[] = ["start", "center", "end", "left", "right"];
const newsRefreshChoices: readonly NewsRefreshMinutes[] = [10, 30, 60, 1440];
const minimumNewsHeadlines = 1;
const maximumNewsHeadlines = 10;
const minimumNewsRotationSeconds = 4;
const maximumNewsRotationSeconds = 30;
const minimumNewsFontSize = 12;
const maximumNewsFontSize = 96;
const minimumNewsTitleFontSize = 12;
const maximumNewsTitleFontSize = 72;
const maximumNewsOpacity = 100;
const maximumNewsPadding = 48;
const maximumNewsTitleLength = 80;

function applyNewsSettings(settings: NewsWidgetSettings, patch: NewsSettingsPatch): NewsWidgetSettings {
    const nextSettings: NewsWidgetSettings = {
        ...settings,
    };

    if (patch.source !== undefined && newsSources.includes(patch.source)) {
        nextSettings.source = patch.source;
    }

    if (nextSettings.source === "usgs") {
        nextSettings.category = "earthquakes";

        if (patch.source === "usgs" && patch.direction === undefined) {
            nextSettings.direction = "ltr";
        }
    } else if (patch.category !== undefined && isNewsCategory(patch.category) && patch.category !== "earthquakes") {
        nextSettings.category = patch.category;
    } else if (nextSettings.category === "earthquakes") {
        nextSettings.category = "israel";
    }

    if (typeof patch.title === "string") {
        const title = patch.title.trim();

        if (title === "") {
            delete nextSettings.title;
        } else if (title.length <= maximumNewsTitleLength) {
            nextSettings.title = title;
        }
    }

    assignChoice(nextSettings, "preset", patch.preset, ["ticker", "cards", "list"]);
    assignChoice(nextSettings, "tickerMotion", patch.tickerMotion, ["scroll", "slide"]);
    assignChoice(nextSettings, "scrollDirection", patch.scrollDirection, ["ltr", "rtl"]);
    assignChoice(nextSettings, "direction", patch.direction, newsDirections);
    assignChoice(nextSettings, "align", patch.align, newsAlignments);
    assignChoice(nextSettings, "titleAlign", patch.titleAlign, newsAlignments);
    assignChoice(nextSettings, "fontFamily", patch.fontFamily, newsFontFamilies);
    assignChoice(nextSettings, "titleFontFamily", patch.titleFontFamily, newsFontFamilies);
    assignChoice(nextSettings, "fontWeight", patch.fontWeight, newsFontWeights);
    assignChoice(nextSettings, "titleFontWeight", patch.titleFontWeight, newsFontWeights);
    assignChoice(nextSettings, "refreshIntervalMinutes", patch.refreshIntervalMinutes, newsRefreshChoices);
    assignInteger(nextSettings, "maxHeadlines", patch.maxHeadlines, minimumNewsHeadlines, maximumNewsHeadlines);
    assignInteger(nextSettings, "rotationSeconds", patch.rotationSeconds, minimumNewsRotationSeconds, maximumNewsRotationSeconds);
    assignInteger(nextSettings, "scrollSpeed", patch.scrollSpeed, minimumNewsScrollSpeed, maximumNewsScrollSpeed);
    assignInteger(nextSettings, "fontSize", patch.fontSize, minimumNewsFontSize, maximumNewsFontSize);
    assignInteger(nextSettings, "titleFontSize", patch.titleFontSize, minimumNewsTitleFontSize, maximumNewsTitleFontSize);
    assignInteger(nextSettings, "titleSpacing", patch.titleSpacing, 0, maximumNewsTitleSpacing);
    assignInteger(nextSettings, "backgroundOpacity", patch.backgroundOpacity, 0, maximumNewsOpacity);
    assignInteger(nextSettings, "textOpacity", patch.textOpacity, 0, maximumNewsOpacity);
    assignInteger(nextSettings, "titleOpacity", patch.titleOpacity, 0, maximumNewsOpacity);
    assignInteger(nextSettings, "accentOpacity", patch.accentOpacity, 0, maximumNewsOpacity);
    assignInteger(nextSettings, "padding", patch.padding, 0, maximumNewsPadding);
    assignColor(nextSettings, "backgroundColor", patch.backgroundColor);
    assignColor(nextSettings, "textColor", patch.textColor);
    assignColor(nextSettings, "accentColor", patch.accentColor);
    assignOptionalColor(nextSettings, "titleColor", patch.titleColor);

    if (typeof patch.borderRadius === "number" && radiusIsInRange(patch.borderRadius)) {
        nextSettings.borderRadius = patch.borderRadius;
    }

    return nextSettings;
}

function updateNewsSettings(board: Board, widgetId: string, patch: NewsSettingsPatch): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "news") {
                return widget;
            }

            return {
                ...widget,
                settings: applyNewsSettings(widget.settings, patch),
            };
        }),
    };
}

function isNewsCategory(value: string): value is NewsCategory {
    return value === "israel" || value === "breaking" || value === "business"         || value === "technology"
        || value === "earthquakes";
}

function assignChoice<Key extends "preset" | "tickerMotion" | "scrollDirection" | "direction" | "align" | "titleAlign" | "fontFamily" | "fontWeight" | "titleFontFamily" | "titleFontWeight" | "refreshIntervalMinutes">(
    settings: NewsWidgetSettings,
    key: Key,
    value: NewsWidgetSettings[Key] | null | undefined,
    allowed: readonly NonNullable<NewsWidgetSettings[Key]>[],
) {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    if (allowed.includes(value)) {
        settings[key] = value;
    }
}

function assignInteger(
    settings: NewsWidgetSettings,
    key: "maxHeadlines" | "rotationSeconds" | "scrollSpeed" | "fontSize" | "titleFontSize" | "backgroundOpacity" | "textOpacity" | "titleOpacity" | "accentOpacity" | "padding" | "titleSpacing",
    value: number | null | undefined,
    minimum: number,
    maximum: number,
) {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    if (Number.isInteger(value) && value >= minimum && value <= maximum) {
        settings[key] = value;
    }
}

function assignColor(
    settings: NewsWidgetSettings,
    key: "backgroundColor" | "textColor" | "accentColor",
    value: string | undefined,
) {
    if (value === undefined) {
        return;
    }

    const color = normalizeCssColor(value);

    if (color !== null) {
        settings[key] = color;
    }
}

function assignOptionalColor(
    settings: NewsWidgetSettings,
    key: "titleColor",
    value: string | null | undefined,
) {
    if (value === undefined) {
        return;
    }

    if (value === null) {
        delete settings[key];
        return;
    }

    const color = normalizeCssColor(value);

    if (color !== null) {
        settings[key] = color;
    }
}

export type { NewsSettingsPatch };
export {
    applyNewsSettings,
    maximumNewsFontSize,
    maximumNewsHeadlines,
    maximumNewsOpacity,
    maximumNewsPadding,
    maximumNewsRotationSeconds,
    maximumNewsTitleFontSize,
    maximumNewsTitleLength,
    minimumNewsFontSize,
    minimumNewsHeadlines,
    minimumNewsRotationSeconds,
    minimumNewsTitleFontSize,
    newsRefreshChoices,
    updateNewsSettings,
};
