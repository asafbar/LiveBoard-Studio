import { useState } from "react";
import { techSummitBoard } from "../../boards/data/techSummitBoard.ts";
import type {
    AnnouncementIconName,
    AnnouncementItem,
    AnnouncementsWidgetSettings,
    Board,
    ClockWidgetSettings,
    ImageWidgetSettings,
    InformationCardWidgetSettings,
    TextWidgetSettings,
} from "../../boards/types/boardTypes.ts";
import { clockTimeZones } from "../clockTimeZones.ts";
import { normalizeCssColor } from "../cssColor.ts";
import {
    imageObjectFitOptions,
    normalizeImageSource,
    radiusIsInRange,
} from "../imageSettings.ts";
import ComponentsPanel from "../components/ComponentsPanel.tsx";
import EditorCanvas from "../components/EditorCanvas.tsx";
import PropertiesPanel from "../components/PropertiesPanel.tsx";
import StudioTopBar from "../components/StudioTopBar.tsx";

function updateTextSettings(
    board: Board,
    widgetId: string,
    settings: Partial<TextWidgetSettings>,
): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "text") {
                return widget;
            }

            return {
                ...widget,
                settings: {
                    ...widget.settings,
                    ...settings,
                },
            };
        }),
    };
}

const clockAlignments: ClockWidgetSettings["align"][] = ["left", "right"];

function isAllowedClockTimeZone(timeZone: string, currentTimeZone: string): boolean {
    return timeZone === currentTimeZone || clockTimeZones.some((zone) => zone === timeZone);
}

function updateClockSettings(
    board: Board,
    widgetId: string,
    settings: Partial<ClockWidgetSettings>,
): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "clock") {
                return widget;
            }

            const nextSettings: ClockWidgetSettings = {
                ...widget.settings,
            };

            if (
                settings.timeZone !== undefined
                && isAllowedClockTimeZone(settings.timeZone, widget.settings.timeZone)
            ) {
                nextSettings.timeZone = settings.timeZone;
            }

            if (typeof settings.showDate === "boolean") {
                nextSettings.showDate = settings.showDate;
            }

            if (typeof settings.showSeconds === "boolean") {
                nextSettings.showSeconds = settings.showSeconds;
            }

            if (settings.align !== undefined && clockAlignments.includes(settings.align)) {
                nextSettings.align = settings.align;
            }

            return {
                ...widget,
                settings: nextSettings,
            };
        }),
    };
}

function updateImageSettings(
    board: Board,
    widgetId: string,
    settings: Partial<ImageWidgetSettings>,
): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "image") {
                return widget;
            }

            const nextSettings: ImageWidgetSettings = {
                ...widget.settings,
            };

            if (settings.src !== undefined) {
                const source = normalizeImageSource(settings.src);

                if (source !== null) {
                    nextSettings.src = source;
                }
            }

            if (typeof settings.alt === "string") {
                nextSettings.alt = settings.alt;
            }

            if (
                settings.objectFit !== undefined
                && imageObjectFitOptions.some((option) => option === settings.objectFit)
            ) {
                nextSettings.objectFit = settings.objectFit;
            }

            if (
                typeof settings.borderRadius === "number"
                && radiusIsInRange(settings.borderRadius)
            ) {
                nextSettings.borderRadius = settings.borderRadius;
            }

            return {
                ...widget,
                settings: nextSettings,
            };
        }),
    };
}

function updateInformationCardSettings(
    board: Board,
    widgetId: string,
    settings: Partial<InformationCardWidgetSettings>,
): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "information-card") {
                return widget;
            }

            const nextSettings: InformationCardWidgetSettings = {
                ...widget.settings,
            };

            if (typeof settings.title === "string") {
                nextSettings.title = settings.title;
            }

            if (typeof settings.subtitle === "string") {
                nextSettings.subtitle = settings.subtitle;
            }

            if (typeof settings.description === "string") {
                nextSettings.description = settings.description;
            }

            if (typeof settings.badge === "string") {
                nextSettings.badge = settings.badge;
            }

            if (settings.imageSrc !== undefined) {
                const source = normalizeImageSource(settings.imageSrc);

                if (source !== null) {
                    nextSettings.imageSrc = source;
                }
            }

            if (typeof settings.backgroundColor === "string") {
                const color = normalizeCssColor(settings.backgroundColor);

                if (color !== null) {
                    nextSettings.backgroundColor = color;
                }
            }

            if (typeof settings.textColor === "string") {
                const color = normalizeCssColor(settings.textColor);

                if (color !== null) {
                    nextSettings.textColor = color;
                }
            }

            if (
                typeof settings.borderRadius === "number"
                && radiusIsInRange(settings.borderRadius)
            ) {
                nextSettings.borderRadius = settings.borderRadius;
            }

            return {
                ...widget,
                settings: nextSettings,
            };
        }),
    };
}

const announcementIcons: AnnouncementIconName[] = ["food", "people", "music", "info"];

function isAnnouncementIcon(icon: string): icon is AnnouncementIconName {
    return announcementIcons.some((option) => option === icon);
}

function normalizeAnnouncementItems(items: AnnouncementItem[]): AnnouncementItem[] | null {
    const ids = new Set<string>();
    const nextItems: AnnouncementItem[] = [];

    for (const item of items) {
        if (typeof item.id !== "string" || item.id.length === 0 || ids.has(item.id)) {
            return null;
        }

        if (typeof item.title !== "string") {
            return null;
        }

        ids.add(item.id);

        const nextItem: AnnouncementItem = {
            id: item.id,
            title: item.title,
        };

        if (item.description !== undefined) {
            if (typeof item.description !== "string") {
                return null;
            }

            nextItem.description = item.description;
        }

        if (item.meta !== undefined) {
            if (typeof item.meta !== "string") {
                return null;
            }

            nextItem.meta = item.meta;
        }

        if (item.icon !== undefined) {
            if (!isAnnouncementIcon(item.icon)) {
                return null;
            }

            nextItem.icon = item.icon;
        }

        nextItems.push(nextItem);
    }

    return nextItems;
}

function updateAnnouncementsSettings(
    board: Board,
    widgetId: string,
    settings: Partial<AnnouncementsWidgetSettings>,
): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "announcements") {
                return widget;
            }

            const nextSettings: AnnouncementsWidgetSettings = {
                ...widget.settings,
            };

            if (typeof settings.title === "string") {
                nextSettings.title = settings.title;
            }

            if (settings.items !== undefined) {
                const items = normalizeAnnouncementItems(settings.items);

                if (items !== null) {
                    nextSettings.items = items;
                }
            }

            if (typeof settings.backgroundColor === "string") {
                const color = normalizeCssColor(settings.backgroundColor);

                if (color !== null) {
                    nextSettings.backgroundColor = color;
                }
            }

            if (typeof settings.textColor === "string") {
                const color = normalizeCssColor(settings.textColor);

                if (color !== null) {
                    nextSettings.textColor = color;
                }
            }

            if (
                typeof settings.borderRadius === "number"
                && radiusIsInRange(settings.borderRadius)
            ) {
                nextSettings.borderRadius = settings.borderRadius;
            }

            return {
                ...widget,
                settings: nextSettings,
            };
        }),
    };
}

function clampAxis(value: number, boardSize: number, widgetSize: number): number {
    const maximum = Math.max(0, boardSize - widgetSize);

    return Math.min(maximum, Math.max(0, value));
}

function updateWidgetPosition(
    board: Board,
    widgetId: string,
    x: number,
    y: number,
): Board {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return board;
    }

    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId) {
                return widget;
            }

            const nextX = clampAxis(Math.round(x), board.width, widget.layout.width);
            const nextY = clampAxis(Math.round(y), board.height, widget.layout.height);

            if (nextX === widget.layout.x && nextY === widget.layout.y) {
                return widget;
            }

            return {
                ...widget,
                layout: {
                    ...widget.layout,
                    x: nextX,
                    y: nextY,
                },
            };
        }),
    };
}

function StudioPage() {
    const [board, setBoard] = useState(techSummitBoard);
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const selectedWidget = board.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

    function handleTextChange(text: string) {
        if (selectedWidgetId === null) {
            return;
        }

        setBoard((currentBoard) => updateTextSettings(currentBoard, selectedWidgetId, { text }));
    }

    function handleTextToneChange(tone: TextWidgetSettings["tone"]) {
        if (selectedWidgetId === null) {
            return;
        }

        setBoard((currentBoard) => updateTextSettings(currentBoard, selectedWidgetId, { tone }));
    }

    function handleTextSizeChange(size: TextWidgetSettings["size"]) {
        if (selectedWidgetId === null) {
            return;
        }

        setBoard((currentBoard) => updateTextSettings(currentBoard, selectedWidgetId, { size }));
    }

    function handleClockSettingsChange(settings: Partial<ClockWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        setBoard((currentBoard) => updateClockSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleImageSettingsChange(settings: Partial<ImageWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        setBoard((currentBoard) => updateImageSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleInformationCardSettingsChange(settings: Partial<InformationCardWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        setBoard((currentBoard) => updateInformationCardSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleAnnouncementsSettingsChange(settings: Partial<AnnouncementsWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        setBoard((currentBoard) => updateAnnouncementsSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleWidgetPositionChange(widgetId: string, position: { x: number; y: number }) {
        setBoard((currentBoard) => updateWidgetPosition(currentBoard, widgetId, position.x, position.y));
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
            <StudioTopBar />
            <div className="flex min-h-0 flex-1">
                <ComponentsPanel />
                <EditorCanvas
                    board={board}
                    selectedWidgetId={selectedWidgetId}
                    onSelectWidget={setSelectedWidgetId}
                    onWidgetPositionChange={handleWidgetPositionChange}
                />
                <PropertiesPanel
                    selectedWidget={selectedWidget}
                    onTextChange={handleTextChange}
                    onTextToneChange={handleTextToneChange}
                    onTextSizeChange={handleTextSizeChange}
                    onClockSettingsChange={handleClockSettingsChange}
                    onImageSettingsChange={handleImageSettingsChange}
                    onInformationCardSettingsChange={handleInformationCardSettingsChange}
                    onAnnouncementsSettingsChange={handleAnnouncementsSettingsChange}
                />
            </div>
            <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-xs text-muted">
                <p>Board resolution: 1920 x 1080</p>
                <p>Zoom 100%</p>
                <p className="inline-flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
                    Draft
                </p>
            </footer>
        </div>
    );
}

export default StudioPage;
