import { useEffect, useRef, useState } from "react";
import { getDevelopmentBoard, publishBoard, reloadDevelopmentBoard, saveBoardDraft } from "../../boards/api/BoardApi.ts";
import type {
    AnnouncementIconName,
    AnnouncementItem,
    AnnouncementsWidgetSettings,
    Board,
    ClockWidgetSettings,
    ImageWidgetSettings,
    InformationCardWidgetSettings,
    TextWidgetSettings,
    Widget,
    WidgetLayout,
    WidgetType,
} from "../../boards/types/boardTypes.ts";
import { clockTimeZones } from "../clockTimeZones.ts";
import { normalizeCssColor } from "../cssColor.ts";
import {
    imageObjectFitOptions,
    normalizeImageSource,
    radiusIsInRange,
} from "../imageSettings.ts";
import ComponentsPanel from "../components/ComponentsPanel.tsx";
import DeleteWidgetDialog from "../components/DeleteWidgetDialog.tsx";
import EditorCanvas from "../components/EditorCanvas.tsx";
import PropertiesPanel from "../components/PropertiesPanel.tsx";
import PublishBoardDialog from "../components/PublishBoardDialog.tsx";
import SavingOverlay from "../components/SavingOverlay.tsx";
import StudioPreview from "../components/StudioPreview.tsx";
import StudioTopBar, { type DraftSaveStatus } from "../components/StudioTopBar.tsx";
import { createWidget } from "../createWidget.ts";

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

const minimumWidgetWidth = 100;
const minimumWidgetHeight = 60;

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

function updateWidgetLayout(
    board: Board,
    widgetId: string,
    layout: WidgetLayout,
): Board {
    if (
        !Number.isFinite(layout.x)
        || !Number.isFinite(layout.y)
        || !Number.isFinite(layout.width)
        || !Number.isFinite(layout.height)
    ) {
        return board;
    }

    let width = Math.max(minimumWidgetWidth, Math.round(layout.width));
    let height = Math.max(minimumWidgetHeight, Math.round(layout.height));
    let x = Math.round(layout.x);
    let y = Math.round(layout.y);

    if (width > board.width) {
        width = board.width;
    }

    if (height > board.height) {
        height = board.height;
    }

    if (x < 0) {
        x = 0;
    }

    if (y < 0) {
        y = 0;
    }

    if (x + width > board.width) {
        x = Math.max(0, board.width - width);
    }

    if (y + height > board.height) {
        y = Math.max(0, board.height - height);
    }

    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId) {
                return widget;
            }

            if (
                x === widget.layout.x
                && y === widget.layout.y
                && width === widget.layout.width
                && height === widget.layout.height
            ) {
                return widget;
            }

            return {
                ...widget,
                layout: {
                    ...widget.layout,
                    x,
                    y,
                    width,
                    height,
                },
            };
        }),
    };
}

function appendWidget(board: Board, widget: Widget): Board {
    if (board.widgets.some((item) => item.id === widget.id)) {
        return board;
    }

    return {
        ...board,
        widgets: [...board.widgets, widget],
    };
}

function removeWidget(board: Board, widgetId: string): Board {
    if (!board.widgets.some((widget) => widget.id === widgetId)) {
        return board;
    }

    return {
        ...board,
        widgets: board.widgets.filter((widget) => widget.id !== widgetId),
    };
}

type StudioNoticeProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

function draftSaveStatus(
    boardLoaded: boolean,
    saveState: "idle" | "saving" | "failed",
    hasUnsavedChanges: boolean,
): DraftSaveStatus | null {
    if (!boardLoaded) {
        return null;
    }

    if (saveState === "saving") {
        return "saving";
    }

    if (saveState === "failed") {
        return "failed";
    }

    return hasUnsavedChanges ? "unsaved" : "saved";
}

function StudioNotice({ title, message, actionLabel, onAction }: StudioNoticeProps) {
    return (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-panel">
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-5 text-secondary">{message}</p>
                {actionLabel && onAction ? (
                    <button
                        type="button"
                        onClick={onAction}
                        className="mt-5 h-9 rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                    >
                        {actionLabel}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function StudioPage() {
    const [board, setBoard] = useState<Board | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "failed">("idle");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [boardRecordId, setBoardRecordId] = useState<string | null>(null);
    const [publishPhase, setPublishPhase] = useState<"confirm" | "publishing" | "published" | "failed" | null>(null);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [publishRestoreTarget, setPublishRestoreTarget] = useState<HTMLElement | null>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);
    const changeVersionRef = useRef(0);
    const saveInFlightRef = useRef(false);
    const publishInFlightRef = useRef(false);
    const [saveRestoreTarget, setSaveRestoreTarget] = useState<HTMLElement | null>(null);
    const selectedWidget = board?.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

    useEffect(() => {
        let active = true;
        const loadBoard = loadAttempt === 0
            ? getDevelopmentBoard()
            : reloadDevelopmentBoard();

        loadBoard
            .then((record) => {
                if (!active) {
                    return;
                }

                setBoardRecordId((currentId) => currentId ?? record.id);
                setBoard((currentBoard) => currentBoard ?? record.draft);
                setLoadError(null);
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                setLoadError("The board could not be loaded. Check that the API is running, then try again.");
            });

        return () => {
            active = false;
        };
    }, [loadAttempt]);

    function updateBoard(update: (currentBoard: Board) => Board) {
        changeVersionRef.current += 1;
        setHasUnsavedChanges(true);
        setBoard((currentBoard) => {
            if (currentBoard === null) {
                return currentBoard;
            }

            return update(currentBoard);
        });
    }

    function handleSave() {
        if (board === null || !hasUnsavedChanges || saveInFlightRef.current) {
            return;
        }

        const snapshot = board;
        const snapshotVersion = changeVersionRef.current;
        saveInFlightRef.current = true;
        setSaveRestoreTarget(document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
        setSaveState("saving");
        setSaveError(null);

        saveBoardDraft(snapshot)
            .then(() => {
                setHasUnsavedChanges(changeVersionRef.current !== snapshotVersion);
                setSaveState("idle");
            })
            .catch((error: unknown) => {
                setHasUnsavedChanges(true);
                setSaveState("failed");
                setSaveError(error instanceof Error && error.message.trim() !== ""
                    ? error.message
                    : "The draft could not be saved. Check that the API is running, then try again.");
            })
            .finally(() => {
                saveInFlightRef.current = false;
            });
    }

    function handleOpenPreview() {
        if (board === null || saveState === "saving" || deleteDialogOpen || publishPhase !== null) {
            return;
        }

        setPreviewOpen(true);
    }

    function handleOpenPublish() {
        if (
            board === null
            || boardRecordId === null
            || hasUnsavedChanges
            || saveState === "saving"
            || saveInFlightRef.current
            || publishInFlightRef.current
            || publishPhase !== null
        ) {
            return;
        }

        setPublishError(null);
        setPublishPhase("confirm");
    }

    function handleCancelPublish() {
        if (publishInFlightRef.current || publishPhase === "publishing") {
            return;
        }

        setPublishPhase(null);
        setPublishError(null);
    }

    function handlePublish() {
        if (
            board === null
            || hasUnsavedChanges
            || saveState === "saving"
            || saveInFlightRef.current
            || publishInFlightRef.current
        ) {
            return;
        }

        publishInFlightRef.current = true;
        setPublishRestoreTarget(document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
        setPublishPhase("publishing");
        setPublishError(null);

        publishBoard()
            .then((record) => {
                setBoardRecordId(record.id);
                setPublishPhase("published");
            })
            .catch((error: unknown) => {
                setPublishPhase("failed");
                setPublishError(error instanceof Error && error.message.trim() !== ""
                    ? error.message
                    : "The board could not be published. Check that the API is running, then try again.");
            })
            .finally(() => {
                publishInFlightRef.current = false;
            });
    }

    function handleClosePreview() {
        setPreviewOpen(false);
    }

    function handleRetry() {
        setLoadError(null);
        setLoadAttempt((currentAttempt) => currentAttempt + 1);
    }

    function handleTextChange(text: string) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateTextSettings(currentBoard, selectedWidgetId, { text }));
    }

    function handleTextToneChange(tone: TextWidgetSettings["tone"]) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateTextSettings(currentBoard, selectedWidgetId, { tone }));
    }

    function handleTextSizeChange(size: TextWidgetSettings["size"]) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateTextSettings(currentBoard, selectedWidgetId, { size }));
    }

    function handleClockSettingsChange(settings: Partial<ClockWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateClockSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleImageSettingsChange(settings: Partial<ImageWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateImageSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleInformationCardSettingsChange(settings: Partial<InformationCardWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateInformationCardSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleAnnouncementsSettingsChange(settings: Partial<AnnouncementsWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateAnnouncementsSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleWidgetPositionChange(widgetId: string, position: { x: number; y: number }) {
        updateBoard((currentBoard) => updateWidgetPosition(currentBoard, widgetId, position.x, position.y));
    }

    function handleWidgetLayoutChange(widgetId: string, layout: WidgetLayout) {
        updateBoard((currentBoard) => updateWidgetLayout(currentBoard, widgetId, layout));
    }

    function handleAddWidget(type: WidgetType) {
        if (board === null) {
            return;
        }

        const widget = createWidget(type, board);

        updateBoard((currentBoard) => appendWidget(currentBoard, widget));
        setSelectedWidgetId(widget.id);
    }

    function handleDeleteSelectedWidget() {
        if (selectedWidgetId === null) {
            return;
        }

        const widgetId = selectedWidgetId;

        updateBoard((currentBoard) => removeWidget(currentBoard, widgetId));
        setSelectedWidgetId(null);
    }

    function handleRequestDeleteSelectedWidget() {
        if (selectedWidgetId === null || deleteDialogOpen) {
            return;
        }

        restoreFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setDeleteDialogOpen(true);
    }

    function handleCancelDelete() {
        setDeleteDialogOpen(false);
    }

    function handleConfirmDelete() {
        handleDeleteSelectedWidget();
        setDeleteDialogOpen(false);
    }

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
            event.returnValue = "";
        }

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (deleteDialogOpen || restoreFocusRef.current === null) {
            return;
        }

        const previous = restoreFocusRef.current;
        restoreFocusRef.current = null;

        if (previous.isConnected) {
            previous.focus();
            return;
        }

        document.querySelector<HTMLElement>("[aria-label='Board canvas']")?.focus();
    }, [deleteDialogOpen]);

    if (previewOpen && board !== null) {
        return <StudioPreview board={board} onBack={handleClosePreview} />;
    }

    return (
        <>
            <div
                className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased"
                inert={deleteDialogOpen || saveState === "saving" || publishPhase !== null}
            >
                <StudioTopBar
                    saveStatus={draftSaveStatus(board !== null, saveState, hasUnsavedChanges)}
                    saveError={saveError}
                    saveDisabled={board === null || !hasUnsavedChanges || saveState === "saving" || publishPhase !== null}
                    previewDisabled={board === null || saveState === "saving" || publishPhase !== null}
                    publishDisabled={
                        board === null
                        || boardRecordId === null
                        || hasUnsavedChanges
                        || saveState === "saving"
                        || publishPhase !== null
                    }
                    publishGuidance={
                        board !== null && hasUnsavedChanges && saveState !== "saving" && publishPhase === null
                            ? "Save your changes before publishing."
                            : null
                    }
                    onSave={handleSave}
                    onPreview={handleOpenPreview}
                    onPublish={handleOpenPublish}
                />
                {board === null ? (
                    loadError === null ? (
                        <StudioNotice
                            title="Loading board"
                            message="The draft is being loaded from the API."
                        />
                    ) : (
                        <StudioNotice
                            title="Board unavailable"
                            message={loadError}
                            actionLabel="Retry"
                            onAction={handleRetry}
                        />
                    )
                ) : (
                    <div className="flex min-h-0 flex-1">
                        <ComponentsPanel onAddWidget={handleAddWidget} />
                        <EditorCanvas
                            board={board}
                            selectedWidgetId={selectedWidgetId}
                            onSelectWidget={setSelectedWidgetId}
                            onWidgetPositionChange={handleWidgetPositionChange}
                            onWidgetLayoutChange={handleWidgetLayoutChange}
                            onDeleteSelectedWidget={handleRequestDeleteSelectedWidget}
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
                            onDeleteWidget={handleRequestDeleteSelectedWidget}
                        />
                    </div>
                )}
                <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-xs text-muted">
                    <p>Board resolution: 1920 x 1080</p>
                    <p>Zoom 100%</p>
                    <p className="inline-flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
                        Draft
                    </p>
                </footer>
            </div>
            {saveState === "saving" ? (
                <SavingOverlay restoreTarget={saveRestoreTarget} />
            ) : null}
            {publishPhase === "publishing" ? (
                <SavingOverlay
                    restoreTarget={publishRestoreTarget}
                    title="Publishing your board"
                    message="Updating the display version..."
                    titleId="publish-overlay-title"
                    messageId="publish-overlay-message"
                />
            ) : null}
            {publishPhase === "confirm" || publishPhase === "published" || publishPhase === "failed" ? (
                <PublishBoardDialog
                    phase={publishPhase}
                    errorMessage={publishError}
                    displayPath={boardRecordId === null ? null : `/display/${boardRecordId}`}
                    onCancel={handleCancelPublish}
                    onConfirm={handlePublish}
                    onRetry={handlePublish}
                />
            ) : null}
            {deleteDialogOpen ? (
                <DeleteWidgetDialog
                    onCancel={handleCancelDelete}
                    onConfirm={handleConfirmDelete}
                />
            ) : null}
        </>
    );
}

export default StudioPage;
