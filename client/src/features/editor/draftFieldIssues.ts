import type { Board } from "../boards/types/boardTypes.ts";

type ApiFieldIssue = {
    path: string;
    message: string;
};

type DraftFieldTab = "Content" | "Style" | "Position";

type DraftFieldIssue = {
    path: string;
    message: string;
    widgetId: string | null;
    tab: DraftFieldTab;
    fieldPath: string;
};

const styleSettingKeys = new Set([
    "accentColor",
    "align",
    "backgroundColor",
    "backgroundOpacity",
    "textOpacity",
    "titleOpacity",
    "accentOpacity",
    "padding",
    "refreshIntervalMinutes",
    "titleSpacing",
    "preset",
    "titleAlign",
    "titleColor",
    "direction",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "titleFontFamily",
    "titleFontWeight",
    "borderRadius",
    "descriptionFontSize",
    "fallbackBackgroundColor",
    "objectFit",
    "size",
    "textColor",
    "titleFontSize",
    "tone",
]);

function mapDraftFieldIssues(board: Board | null, issues: readonly ApiFieldIssue[]): DraftFieldIssue[] {
    return issues.map((issue) => mapDraftFieldIssue(board, issue));
}

function mapDraftFieldIssue(board: Board | null, issue: ApiFieldIssue): DraftFieldIssue {
    const normalized = issue.path.replace(/\[(\d+)\]/g, ".$1");
    const match = /^widgets\.(\d+)\.(settings|layout)\.(.+)$/.exec(normalized);

    if (match === null) {
        return {
            path: issue.path,
            message: issue.message,
            widgetId: null,
            tab: "Content",
            fieldPath: normalized,
        };
    }

    const widgetIndex = Number(match[1]);
    const scope = match[2];
    const remainder = match[3] ?? "";
    const fieldPath = scope === "layout" ? `layout.${remainder}` : remainder;
    const widget = board?.widgets[widgetIndex];

    return {
        path: issue.path,
        message: issue.message,
        widgetId: widget === undefined ? null : widget.id,
        tab: scope === "layout" ? "Position" : tabForSettingsPath(fieldPath),
        fieldPath,
    };
}

function tabForSettingsPath(fieldPath: string): DraftFieldTab {
    const key = fieldPath.split(".")[0] ?? fieldPath;

    if (styleSettingKeys.has(key)) {
        return "Style";
    }

    return "Content";
}

function saveFailureSummary(issues: readonly DraftFieldIssue[]): string {
    if (issues.length === 0) {
        return "The draft could not be saved.";
    }

    const first = issues[0];

    if (issues.length === 1 && first !== undefined) {
        return first.message;
    }

    return `${issues.length} fields need attention`;
}

export type { ApiFieldIssue, DraftFieldIssue, DraftFieldTab };
export { mapDraftFieldIssues, saveFailureSummary };
