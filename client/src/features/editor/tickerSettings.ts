import type {
    TickerDirection,
    TickerFontFamily,
    TickerFontWeight,
    TickerMessage,
} from "../boards/types/boardTypes.ts";

const tickerDirections: TickerDirection[] = ["rtl", "ltr"];
const tickerFontFamilies: TickerFontFamily[] = ["sans", "serif", "mono"];
const tickerFontWeights: TickerFontWeight[] = [400, 500, 600, 700];
const defaultTickerFontFamily: TickerFontFamily = "sans";
const defaultTickerFontSize = 36;
const defaultTickerFontWeight: TickerFontWeight = 600;
const minimumTickerSpeed = 20;
const maximumTickerSpeed = 400;
const minimumTickerFontSize = 12;
const maximumTickerFontSize = 160;
const maximumTickerMessages = 30;
const maximumTickerMessageLength = 200;
const maximumTickerMessageIdLength = 80;

const tickerFontStacks: Record<TickerFontFamily, string> = {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Arial Hebrew\", \"Noto Sans Hebrew\", sans-serif",
    serif: "Georgia, \"Times New Roman\", David, \"Noto Serif Hebrew\", serif",
    mono: "ui-monospace, \"SF Mono\", Menlo, Consolas, monospace",
};

function isTickerDirection(value: string): value is TickerDirection {
    return tickerDirections.some((direction) => direction === value);
}

function tickerSpeedIsInRange(speed: number): boolean {
    return Number.isInteger(speed)
        && speed >= minimumTickerSpeed
        && speed <= maximumTickerSpeed;
}

function isTickerFontFamily(value: string): value is TickerFontFamily {
    return tickerFontFamilies.some((family) => family === value);
}

function isTickerFontWeight(value: number): value is TickerFontWeight {
    return tickerFontWeights.some((weight) => weight === value);
}

function tickerFontSizeIsInRange(size: number): boolean {
    return Number.isInteger(size)
        && size >= minimumTickerFontSize
        && size <= maximumTickerFontSize;
}

function tickerFontStack(family: TickerFontFamily | undefined): string {
    if (family !== undefined && isTickerFontFamily(family)) {
        return tickerFontStacks[family];
    }

    return tickerFontStacks[defaultTickerFontFamily];
}

function resolvedTickerFontSize(size: number | undefined): number {
    if (size !== undefined && tickerFontSizeIsInRange(size)) {
        return size;
    }

    return defaultTickerFontSize;
}

function resolvedTickerFontWeight(weight: number | undefined): TickerFontWeight {
    if (weight !== undefined && isTickerFontWeight(weight)) {
        return weight;
    }

    return defaultTickerFontWeight;
}

function normalizeTickerMessages(messages: TickerMessage[]): TickerMessage[] | null {
    if (messages.length > maximumTickerMessages) {
        return null;
    }

    const ids = new Set<string>();
    const nextMessages: TickerMessage[] = [];

    for (const message of messages) {
        if (
            typeof message.id !== "string"
            || message.id.trim() === ""
            || message.id.length > maximumTickerMessageIdLength
            || ids.has(message.id)
        ) {
            return null;
        }

        if (typeof message.text !== "string" || message.text.length > maximumTickerMessageLength) {
            return null;
        }

        ids.add(message.id);
        nextMessages.push({
            id: message.id,
            text: message.text,
        });
    }

    return nextMessages;
}

export {
    defaultTickerFontFamily,
    defaultTickerFontSize,
    defaultTickerFontWeight,
    isTickerDirection,
    isTickerFontFamily,
    isTickerFontWeight,
    maximumTickerFontSize,
    maximumTickerMessageLength,
    maximumTickerMessages,
    maximumTickerSpeed,
    minimumTickerFontSize,
    minimumTickerSpeed,
    normalizeTickerMessages,
    resolvedTickerFontSize,
    resolvedTickerFontWeight,
    tickerFontFamilies,
    tickerFontSizeIsInRange,
    tickerFontStack,
    tickerFontWeights,
    tickerSpeedIsInRange,
};
