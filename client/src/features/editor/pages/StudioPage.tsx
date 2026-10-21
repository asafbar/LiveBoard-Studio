import { useState } from "react";
import { techSummitBoard } from "../../boards/data/techSummitBoard.ts";
import type { Board, ClockWidgetSettings, TextWidgetSettings } from "../../boards/types/boardTypes.ts";
import { clockTimeZones } from "../clockTimeZones.ts";
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

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
            <StudioTopBar />
            <div className="flex min-h-0 flex-1">
                <ComponentsPanel />
                <EditorCanvas
                    board={board}
                    selectedWidgetId={selectedWidgetId}
                    onSelectWidget={setSelectedWidgetId}
                />
                <PropertiesPanel
                    selectedWidget={selectedWidget}
                    onTextChange={handleTextChange}
                    onTextToneChange={handleTextToneChange}
                    onTextSizeChange={handleTextSizeChange}
                    onClockSettingsChange={handleClockSettingsChange}
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
