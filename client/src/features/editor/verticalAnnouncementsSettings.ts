import type {
    TickerFontFamily,
    TickerFontWeight,
    VerticalAnnouncementItem,
} from "../boards/types/boardTypes.ts";

const defaultVerticalAnnouncementFontFamily: TickerFontFamily = "sans";
const defaultVerticalAnnouncementTitleFontSize = 32;
const defaultVerticalAnnouncementDescriptionFontSize = 18;
const defaultVerticalAnnouncementFontWeight: TickerFontWeight = 600;
const defaultVerticalAnnouncementSpeed = 40;
const defaultVerticalAnnouncementPauseSeconds = 0;
const minimumVerticalAnnouncementSpeed = 20;
const maximumVerticalAnnouncementSpeed = 400;
const minimumVerticalAnnouncementPauseSeconds = 0;
const maximumVerticalAnnouncementPauseSeconds = 30;
const minimumVerticalAnnouncementTitleFontSize = 12;
const maximumVerticalAnnouncementTitleFontSize = 120;
const minimumVerticalAnnouncementDescriptionFontSize = 12;
const maximumVerticalAnnouncementDescriptionFontSize = 96;
const maximumVerticalAnnouncements = 40;
const maximumVerticalAnnouncementTitleLength = 200;
const maximumVerticalAnnouncementDescriptionLength = 500;
const maximumVerticalAnnouncementLabelLength = 80;
const maximumVerticalAnnouncementIdLength = 80;

function verticalAnnouncementSpeedIsInRange(speed: number): boolean {
    return Number.isInteger(speed)
        && speed >= minimumVerticalAnnouncementSpeed
        && speed <= maximumVerticalAnnouncementSpeed;
}

function verticalAnnouncementPauseIsInRange(pauseSeconds: number): boolean {
    return Number.isInteger(pauseSeconds)
        && pauseSeconds >= minimumVerticalAnnouncementPauseSeconds
        && pauseSeconds <= maximumVerticalAnnouncementPauseSeconds;
}

function verticalAnnouncementTitleFontSizeIsInRange(size: number): boolean {
    return Number.isInteger(size)
        && size >= minimumVerticalAnnouncementTitleFontSize
        && size <= maximumVerticalAnnouncementTitleFontSize;
}

function verticalAnnouncementDescriptionFontSizeIsInRange(size: number): boolean {
    return Number.isInteger(size)
        && size >= minimumVerticalAnnouncementDescriptionFontSize
        && size <= maximumVerticalAnnouncementDescriptionFontSize;
}

function resolvedVerticalAnnouncementTitleFontSize(size: number | undefined): number {
    if (size !== undefined && verticalAnnouncementTitleFontSizeIsInRange(size)) {
        return size;
    }

    return defaultVerticalAnnouncementTitleFontSize;
}

function resolvedVerticalAnnouncementDescriptionFontSize(size: number | undefined): number {
    if (size !== undefined && verticalAnnouncementDescriptionFontSizeIsInRange(size)) {
        return size;
    }

    return defaultVerticalAnnouncementDescriptionFontSize;
}

function resolvedVerticalAnnouncementPauseSeconds(pauseSeconds: number | undefined): number {
    if (pauseSeconds !== undefined && verticalAnnouncementPauseIsInRange(pauseSeconds)) {
        return pauseSeconds;
    }

    return defaultVerticalAnnouncementPauseSeconds;
}

function resolvedVerticalAnnouncementSpeed(speed: number): number {
    if (verticalAnnouncementSpeedIsInRange(speed)) {
        return speed;
    }

    return defaultVerticalAnnouncementSpeed;
}

function normalizeVerticalAnnouncementItems(
    items: VerticalAnnouncementItem[],
): VerticalAnnouncementItem[] | null {
    if (items.length > maximumVerticalAnnouncements) {
        return null;
    }

    const ids = new Set<string>();
    const nextItems: VerticalAnnouncementItem[] = [];

    for (const item of items) {
        if (
            typeof item.id !== "string"
            || item.id.trim() === ""
            || item.id.length > maximumVerticalAnnouncementIdLength
            || ids.has(item.id)
        ) {
            return null;
        }

        if (
            typeof item.title !== "string"
            || item.title.length > maximumVerticalAnnouncementTitleLength
        ) {
            return null;
        }

        const description = item.description ?? "";
        const label = item.label ?? "";

        if (
            typeof description !== "string"
            || description.length > maximumVerticalAnnouncementDescriptionLength
            || typeof label !== "string"
            || label.length > maximumVerticalAnnouncementLabelLength
        ) {
            return null;
        }

        ids.add(item.id);
        nextItems.push({
            id: item.id,
            title: item.title,
            description,
            label,
        });
    }

    return nextItems;
}

export {
    defaultVerticalAnnouncementDescriptionFontSize,
    defaultVerticalAnnouncementFontFamily,
    defaultVerticalAnnouncementFontWeight,
    defaultVerticalAnnouncementPauseSeconds,
    defaultVerticalAnnouncementSpeed,
    defaultVerticalAnnouncementTitleFontSize,
    maximumVerticalAnnouncementDescriptionFontSize,
    maximumVerticalAnnouncementDescriptionLength,
    maximumVerticalAnnouncementLabelLength,
    maximumVerticalAnnouncementPauseSeconds,
    maximumVerticalAnnouncements,
    maximumVerticalAnnouncementSpeed,
    maximumVerticalAnnouncementTitleFontSize,
    maximumVerticalAnnouncementTitleLength,
    minimumVerticalAnnouncementDescriptionFontSize,
    minimumVerticalAnnouncementPauseSeconds,
    minimumVerticalAnnouncementSpeed,
    minimumVerticalAnnouncementTitleFontSize,
    normalizeVerticalAnnouncementItems,
    resolvedVerticalAnnouncementDescriptionFontSize,
    resolvedVerticalAnnouncementPauseSeconds,
    resolvedVerticalAnnouncementSpeed,
    resolvedVerticalAnnouncementTitleFontSize,
    verticalAnnouncementDescriptionFontSizeIsInRange,
    verticalAnnouncementPauseIsInRange,
    verticalAnnouncementSpeedIsInRange,
    verticalAnnouncementTitleFontSizeIsInRange,
};
