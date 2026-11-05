import type { Board, Widget, WidgetLayout, WidgetType } from "../boards/types/boardTypes.ts";
import { defaultCountdownSettings } from "../boards/countdown/countdownDefaults.ts";
import { defaultQrSettings } from "../boards/qr/qrDefaults.ts";
import { defaultNewsSettings } from "../boards/news/newsDefaults.ts";
import { defaultWeatherSettings } from "../boards/weather/weatherDefaults.ts";
import { newWeatherRefreshMinutes } from "../boards/weather/weatherSchedule.ts";

const placementStep = 40;

type WidgetSize = {
    width: number;
    height: number;
};

function createWidgetId(existingIds: ReadonlySet<string>): string {
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `widget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    if (existingIds.has(id)) {
        return createWidgetId(existingIds);
    }

    return id;
}

function defaultWidgetSize(type: WidgetType): WidgetSize {
    switch (type) {
        case "text":
            return { width: 480, height: 100 };
        case "clock":
            return { width: 460, height: 170 };
        case "image":
            return { width: 480, height: 300 };
        case "information-card":
            return { width: 520, height: 260 };
        case "announcements":
            return { width: 520, height: 280 };
        case "ticker":
            return { width: 1440, height: 88 };
        case "vertical-announcements":
            return { width: 440, height: 720 };
        case "weather":
            return { width: 480, height: 300 };
        case "news":
            return { width: 1200, height: 140 };
        case "countdown":
            return { width: 760, height: 280 };
        case "qr":
            return { width: 440, height: 560 };
    }
}

function overlapArea(first: WidgetLayout, second: WidgetLayout): number {
    const width = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x);
    const height = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y);

    if (width <= 0 || height <= 0) {
        return 0;
    }

    return width * height;
}

function overlapAmount(layout: WidgetLayout, board: Board): number {
    return board.widgets.reduce((total, widget) => total + overlapArea(layout, widget.layout), 0);
}

function axisPositions(boardSize: number, widgetSize: number): number[] {
    const positions: number[] = [];

    for (let position = 0; position <= boardSize - widgetSize; position += placementStep) {
        positions.push(position);
    }

    const edge = boardSize - widgetSize;

    if (positions[positions.length - 1] !== edge) {
        positions.push(edge);
    }

    return positions;
}

function placeWidget(board: Board, size: WidgetSize): WidgetLayout {
    const width = Math.min(size.width, board.width);
    const height = Math.min(size.height, board.height);
    const originX = Math.round((board.width - width) / 2);
    const originY = Math.round((board.height - height) / 2);
    let best: WidgetLayout = {
        x: originX,
        y: originY,
        width,
        height,
    };
    let bestOverlap = overlapAmount(best, board);
    let bestDistance = 0;

    for (const y of axisPositions(board.height, height)) {
        for (const x of axisPositions(board.width, width)) {
            const candidate = { x, y, width, height };
            const overlap = overlapAmount(candidate, board);
            const distance = Math.hypot(x - originX, y - originY);
            const clearIsCloser = overlap === 0 && (bestOverlap > 0 || distance < bestDistance);
            const overlapIsSmaller = bestOverlap > 0
                && overlap > 0
                && (overlap < bestOverlap || (overlap === bestOverlap && distance < bestDistance));

            if (clearIsCloser || overlapIsSmaller) {
                best = candidate;
                bestOverlap = overlap;
                bestDistance = distance;
            }
        }
    }

    return best;
}

function createWidget(type: WidgetType, board: Board, dropPoint?: { x: number; y: number }): Widget {
    const existingIds = new Set(board.widgets.map((widget) => widget.id));
    const id = createWidgetId(existingIds);
    const size = defaultWidgetSize(type);
    const layout = dropPoint === undefined
        ? placeWidget(board, size)
        : placeWidgetAtPoint(board.width, board.height, size, dropPoint);

    switch (type) {
        case "text":
            return {
                id,
                type,
                layout,
                settings: {
                    text: "New text",
                    tone: "default",
                    size: "title",
                },
            };
        case "clock":
            return {
                id,
                type,
                layout,
                settings: {
                    timeZone: "Asia/Jerusalem",
                    showDate: true,
                    showSeconds: true,
                    align: "left",
                },
            };
        case "image":
            return {
                id,
                type,
                layout,
                settings: {
                    src: "",
                    alt: "Image",
                    objectFit: "cover",
                    borderRadius: 24,
                    fallbackBackgroundColor: "var(--canvas-board)",
                },
            };
        case "information-card":
            return {
                id,
                type,
                layout,
                settings: {
                    badge: "INFO",
                    title: "Information",
                    subtitle: "Subtitle",
                    description: "Add a short description.",
                    backgroundColor: "color-mix(in srgb, var(--accent) 24%, var(--canvas-board))",
                    textColor: "var(--foreground)",
                    borderRadius: 24,
                },
            };
        case "announcements": {
            const itemIds = new Set(existingIds);
            itemIds.add(id);

            return {
                id,
                type,
                layout,
                settings: {
                    title: "Announcements",
                    backgroundColor: "color-mix(in srgb, var(--accent) 24%, var(--canvas-board))",
                    textColor: "var(--foreground)",
                    borderRadius: 24,
                    items: [
                        {
                            id: createWidgetId(itemIds),
                            title: "New announcement",
                            description: "",
                            icon: "info",
                        },
                    ],
                },
            };
        }
        case "ticker": {
            const messageIds = new Set(existingIds);
            messageIds.add(id);
            const firstMessageId = createWidgetId(messageIds);
            messageIds.add(firstMessageId);
            const secondMessageId = createWidgetId(messageIds);
            messageIds.add(secondMessageId);
            const thirdMessageId = createWidgetId(messageIds);

            return {
                id,
                type,
                layout,
                settings: {
                    direction: "rtl",
                    speed: 80,
                    backgroundColor: "color-mix(in srgb, var(--canvas-board) 86%, var(--foreground))",
                    textColor: "var(--foreground)",
                    accentColor: "var(--cyan)",
                    borderRadius: 16,
                    messages: [
                        { id: firstMessageId, text: "ברוכים הבאים" },
                        { id: secondMessageId, text: "Welcome" },
                        { id: thirdMessageId, text: "האירוע מתחיל בקרוב" },
                    ],
                },
            };
        }
        case "weather":
            return {
                id,
                type,
                layout,
                settings: {
                    ...defaultWeatherSettings,
                    location: { ...defaultWeatherSettings.location },
                    refreshIntervalMinutes: newWeatherRefreshMinutes,
                },
            };
        case "news":
            return {
                id,
                type,
                layout,
                settings: {
                    ...defaultNewsSettings,
                },
            };
        case "countdown":
            return {
                id,
                type,
                layout,
                settings: defaultCountdownSettings(),
            };
        case "qr":
            return {
                id,
                type,
                layout,
                settings: defaultQrSettings(),
            };
        case "vertical-announcements": {
            const itemIds = new Set(existingIds);
            itemIds.add(id);

            return {
                id,
                type,
                layout,
                settings: {
                    speed: 40,
                    backgroundColor: "color-mix(in srgb, var(--canvas-board) 88%, var(--foreground))",
                    textColor: "var(--foreground)",
                    accentColor: "var(--cyan)",
                    borderRadius: 16,
                    items: [
                        {
                            id: createWidgetId(itemIds),
                            title: "",
                            description: "",
                            label: "",
                        },
                    ],
                },
            };
        }
    }
}

// Center the widget on the drop point, then shift it inward so it stays
// fully inside the board. Other widgets are left untouched.
function placeWidgetAtPoint(
    boardWidth: number,
    boardHeight: number,
    size: WidgetSize,
    point: { x: number; y: number },
): WidgetLayout {
    const width = Math.min(size.width, boardWidth);
    const height = Math.min(size.height, boardHeight);
    const maximumX = Math.max(0, boardWidth - width);
    const maximumY = Math.max(0, boardHeight - height);

    return {
        x: clampPlacement(Math.round(point.x - (width / 2)), 0, maximumX),
        y: clampPlacement(Math.round(point.y - (height / 2)), 0, maximumY),
        width,
        height,
    };
}

function clampPlacement(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

export { createWidget, defaultWidgetSize, placeWidgetAtPoint };
