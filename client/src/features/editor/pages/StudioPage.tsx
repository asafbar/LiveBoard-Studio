import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker, useParams, type BlockerFunction } from "react-router-dom";
import { useAuthSession } from "../../auth/session/authSessionContext.ts";
import { getBoard, publishBoard, saveBoardDraft } from "../../boards/api/BoardApi.ts";
import type {
    AnnouncementIconName,
    AnnouncementItem,
    AnnouncementsWidgetSettings,
    Board,
    ClockWidgetSettings,
    ImageWidgetSettings,
    InformationCardWidgetSettings,
    TextWidgetSettings,
    TickerWidgetSettings,
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
import StudioSidebar from "../components/StudioSidebar.tsx";
import { applyWidgetLayerChange, type WidgetLayerChange } from "../widgetLayer.ts";
import {
    moveWidgetLayer,
    reorderWidgetLayer,
    type LayerDropPlacement,
    type LayerMove,
} from "../widgetOrder.ts";
import DeleteWidgetDialog from "../components/DeleteWidgetDialog.tsx";
import EditorCanvas from "../components/EditorCanvas.tsx";
import PropertiesPanel from "../components/PropertiesPanel.tsx";
import PublishBoardDialog from "../components/PublishBoardDialog.tsx";
import RevertDraftDialog from "../components/RevertDraftDialog.tsx";
import type { RevertDraftPhase } from "../components/RevertDraftDialog.tsx";
import PublishNotice from "../components/PublishNotice.tsx";
import SavingOverlay from "../components/SavingOverlay.tsx";
import StudioPreview from "../components/StudioPreview.tsx";
import StudioTopBar, { type DraftSaveStatus } from "../components/StudioTopBar.tsx";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog.tsx";
import { createWidget } from "../createWidget.ts";
import {
    isTickerDirection,
    isTickerFontFamily,
    isTickerFontWeight,
    normalizeTickerMessages,
    tickerFontSizeIsInRange,
    tickerSpeedIsInRange,
} from "../tickerSettings.ts";
import {
    boardsEqual,
    createDraftHistory,
    recordDraftChange,
    redoDraft,
    undoDraft,
    type DraftHistory,
} from "../draftHistory.ts";

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

function updateTickerSettings(
    board: Board,
    widgetId: string,
    settings: Partial<TickerWidgetSettings>,
): Board {
    return {
        ...board,
        widgets: board.widgets.map((widget) => {
            if (widget.id !== widgetId || widget.type !== "ticker") {
                return widget;
            }

            const nextSettings: TickerWidgetSettings = {
                ...widget.settings,
            };

            if (settings.messages !== undefined) {
                const messages = normalizeTickerMessages(settings.messages);

                if (messages !== null) {
                    nextSettings.messages = messages;
                }
            }

            if (settings.direction !== undefined && isTickerDirection(settings.direction)) {
                nextSettings.direction = settings.direction;
            }

            if (typeof settings.speed === "number" && tickerSpeedIsInRange(settings.speed)) {
                nextSettings.speed = settings.speed;
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

            if (typeof settings.accentColor === "string") {
                const color = normalizeCssColor(settings.accentColor);

                if (color !== null) {
                    nextSettings.accentColor = color;
                }
            }

            if (
                typeof settings.borderRadius === "number"
                && radiusIsInRange(settings.borderRadius)
            ) {
                nextSettings.borderRadius = settings.borderRadius;
            }

            if (settings.fontFamily !== undefined && isTickerFontFamily(settings.fontFamily)) {
                nextSettings.fontFamily = settings.fontFamily;
            }

            if (typeof settings.fontSize === "number" && tickerFontSizeIsInRange(settings.fontSize)) {
                nextSettings.fontSize = settings.fontSize;
            }

            if (typeof settings.fontWeight === "number" && isTickerFontWeight(settings.fontWeight)) {
                nextSettings.fontWeight = settings.fontWeight;
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

type OpenGesture = {
    kind: "position" | "layout";
    before: Board;
};

type StudioNoticeProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

function isUnauthorizedError(error: unknown): boolean {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    if ("response" in error && typeof error.response === "object" && error.response !== null && "status" in error.response) {
        return error.response.status === 401;
    }

    if (error instanceof Error) {
        return isUnauthorizedError(error.cause);
    }

    return false;
}

function isHistoryTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    const tagName = target.tagName;

    return tagName === "INPUT" || tagName === "TEXTAREA";
}

function readStudioError(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return fallback;
}

function boardIdsMatch(left: string, right: string): boolean {
    return left.toLowerCase() === right.toLowerCase();
}

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
    const { boardId = "" } = useParams();
    const { status: authStatus } = useAuthSession();
    const authStatusRef = useRef(authStatus);
    const [board, setBoard] = useState<Board | null>(null);
    const boardRef = useRef<Board | null>(null);
    const savedDraftRef = useRef<Board | null>(null);
    const historyRef = useRef<DraftHistory>(createDraftHistory());
    const gestureRef = useRef<OpenGesture | null>(null);
    const historyLockRef = useRef(false);
    const undoRef = useRef<() => void>(() => {});
    const redoRef = useRef<() => void>(() => {});
    const [historyAvailability, setHistoryAvailability] = useState({
        canUndo: false,
        canRedo: false,
    });
    const [boardName, setBoardName] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "failed">("idle");
    const [saveError, setSaveError] = useState<string | null>(null);
    const [selection, setSelection] = useState<{ boardId: string; widgetId: string | null }>({
        boardId,
        widgetId: null,
    });
    const [reveal, setReveal] = useState<{ boardId: string; widgetId: string | null }>({
        boardId,
        widgetId: null,
    });
    const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const selectedWidgetId = selection.boardId === boardId ? selection.widgetId : null;
    const revealedWidgetId = reveal.boardId === boardId ? reveal.widgetId : null;
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [loadedBoardId, setLoadedBoardId] = useState<string | null>(null);
    const [publishPhase, setPublishPhase] = useState<"confirm" | "publishing" | "failed" | null>(null);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [publishNoticeVisible, setPublishNoticeVisible] = useState(false);
    const publishNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [publishRestoreTarget, setPublishRestoreTarget] = useState<HTMLElement | null>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);
    const changeVersionRef = useRef(0);
    const saveInFlightRef = useRef(false);
    const publishInFlightRef = useRef(false);
    const revertInFlightRef = useRef(false);
    const revertGenerationRef = useRef(0);
    const [revertPhase, setRevertPhase] = useState<RevertDraftPhase | null>(null);
    const [revertError, setRevertError] = useState<string | null>(null);
    const aliveRef = useRef(true);
    const loadedBoardIdRef = useRef<string | null>(null);
    const [saveRestoreTarget, setSaveRestoreTarget] = useState<HTMLElement | null>(null);
    const selectedWidget = board?.widgets.find((widget) => widget.id === selectedWidgetId) ?? null;

    if (
        board !== null
        && selectedWidgetId !== null
        && selectedWidget === null
        && selection.boardId === boardId
    ) {
        setSelection({ boardId, widgetId: null });
    }
    const shouldBlockNavigation = useCallback<BlockerFunction>(
        ({ currentLocation, nextLocation }) =>
            hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname,
        [hasUnsavedChanges],
    );
    const blocker = useBlocker(shouldBlockNavigation);
    const navigationLocked = blocker.state === "blocked";
    historyLockRef.current = deleteDialogOpen
        || saveState === "saving"
        || saveInFlightRef.current
        || publishPhase !== null
        || publishInFlightRef.current
        || revertPhase !== null
        || revertInFlightRef.current
        || navigationLocked;

    useEffect(() => {
        aliveRef.current = true;

        return () => {
            aliveRef.current = false;

            if (revealTimerRef.current !== null) {
                clearTimeout(revealTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        loadedBoardIdRef.current = loadedBoardId;
    }, [loadedBoardId]);

    useEffect(() => {
        let active = true;
        const requestedBoardId = boardId;

        getBoard(requestedBoardId)
            .then((record) => {
                if (!active || !boardIdsMatch(record.id, requestedBoardId)) {
                    return;
                }

                setLoadedBoardId(record.id);
                setBoardName(record.name);
                resetDocument(record.draft);
                setLoadError(null);
            })
            .catch((error: unknown) => {
                if (!active) {
                    return;
                }

                setLoadError(readStudioError(
                    error,
                    "The board could not be loaded. Check that the API is running, then try again.",
                ));
            });

        return () => {
            active = false;
        };
    }, [boardId, loadAttempt]);

    useEffect(() => {
        const previousStatus = authStatusRef.current;
        authStatusRef.current = authStatus;

        if (previousStatus !== "expired" || authStatus !== "authenticated" || board !== null || loadError === null) {
            return;
        }

        setLoadError(null);
        setLoadAttempt((currentAttempt) => currentAttempt + 1);
    }, [authStatus, board, loadError]);

    function isCurrentBoard(targetBoardId: string): boolean {
        const currentBoardId = loadedBoardIdRef.current;

        return aliveRef.current
            && currentBoardId !== null
            && boardIdsMatch(targetBoardId, currentBoardId);
    }

    function publishHistoryAvailability() {
        const canUndo = historyRef.current.past.length > 0;
        const canRedo = historyRef.current.future.length > 0;
        setHistoryAvailability((current) => {
            if (current.canUndo === canUndo && current.canRedo === canRedo) {
                return current;
            }

            return { canUndo, canRedo };
        });
    }

    function syncDirty(next: Board) {
        const saved = savedDraftRef.current;
        setHasUnsavedChanges(saved === null || !boardsEqual(next, saved));
    }

    function closeGesture() {
        const gesture = gestureRef.current;
        gestureRef.current = null;
        const present = boardRef.current;

        if (gesture === null || present === null || !boardsEqual(present, gesture.before)) {
            return;
        }

        const past = historyRef.current.past;
        const top = past[past.length - 1];

        if (top !== undefined && boardsEqual(top, gesture.before)) {
            historyRef.current = {
                past: past.slice(0, -1),
                future: historyRef.current.future,
            };
            syncDirty(present);
            publishHistoryAvailability();
        }
    }

    function rememberEdit(previous: Board) {
        historyRef.current = recordDraftChange(historyRef.current, previous);
        changeVersionRef.current += 1;
    }

    function commitDocument(next: Board) {
        boardRef.current = next;
        setBoard(next);
        syncDirty(next);
        publishHistoryAvailability();
    }

    function resetDocument(next: Board) {
        gestureRef.current = null;
        historyRef.current = createDraftHistory();
        savedDraftRef.current = next;
        boardRef.current = next;
        changeVersionRef.current += 1;
        setBoard(next);
        setHasUnsavedChanges(false);
        setHistoryAvailability({
            canUndo: false,
            canRedo: false,
        });
    }

    function applyDocumentUpdate(
        update: (currentBoard: Board) => Board,
        gestureKind: OpenGesture["kind"] | null,
    ) {
        const current = boardRef.current;

        if (current === null) {
            return;
        }

        const next = update(current);

        if (boardsEqual(current, next)) {
            return;
        }

        if (gestureKind === null) {
            closeGesture();
            rememberEdit(boardRef.current ?? current);
        } else if (gestureRef.current === null || gestureRef.current.kind !== gestureKind) {
            closeGesture();
            const before = boardRef.current ?? current;
            gestureRef.current = { kind: gestureKind, before };
            rememberEdit(before);
        }

        commitDocument(next);
    }

    function updateBoard(update: (currentBoard: Board) => Board) {
        applyDocumentUpdate(update, null);
    }

    function handleGestureEnd() {
        closeGesture();
    }

    function historyIsLocked(): boolean {
        return boardRef.current === null
            || historyLockRef.current
            || gestureRef.current !== null
            || saveInFlightRef.current
            || publishInFlightRef.current
            || revertInFlightRef.current;
    }

    function handleUndo() {
        if (historyIsLocked()) {
            return;
        }

        const present = boardRef.current;

        if (present === null) {
            return;
        }

        const step = undoDraft(historyRef.current, present);

        if (step === null) {
            return;
        }

        historyRef.current = step.history;
        changeVersionRef.current += 1;
        commitDocument(step.present);
    }

    function handleRedo() {
        if (historyIsLocked()) {
            return;
        }

        const present = boardRef.current;

        if (present === null) {
            return;
        }

        const step = redoDraft(historyRef.current, present);

        if (step === null) {
            return;
        }

        historyRef.current = step.history;
        changeVersionRef.current += 1;
        commitDocument(step.present);
    }

    function handleSave() {
        if (
            board === null
            || loadedBoardId === null
            || !hasUnsavedChanges
            || saveInFlightRef.current
            || revertInFlightRef.current
        ) {
            return;
        }

        const snapshot = boardRef.current;

        if (snapshot === null) {
            return;
        }

        const targetBoardId = loadedBoardId;
        saveInFlightRef.current = true;
        setSaveRestoreTarget(document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
        setSaveState("saving");
        setSaveError(null);

        saveBoardDraft(targetBoardId, snapshot)
            .then(() => {
                if (!isCurrentBoard(targetBoardId)) {
                    return;
                }

                savedDraftRef.current = snapshot;
                const current = boardRef.current;
                setHasUnsavedChanges(current === null || !boardsEqual(current, snapshot));
                setSaveState("idle");
            })
            .catch((error: unknown) => {
                if (!isCurrentBoard(targetBoardId)) {
                    return;
                }

                const current = boardRef.current;
                const saved = savedDraftRef.current;
                setHasUnsavedChanges(current === null || saved === null || !boardsEqual(current, saved));
                setSaveState("failed");
                setSaveError(readStudioError(
                    error,
                    "The draft could not be saved. Check that the API is running, then try again.",
                ));
            })
            .finally(() => {
                if (isCurrentBoard(targetBoardId)) {
                    saveInFlightRef.current = false;
                }
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
            || loadedBoardId === null
            || hasUnsavedChanges
            || saveState === "saving"
            || saveInFlightRef.current
            || publishInFlightRef.current
            || revertInFlightRef.current
            || publishPhase !== null
            || revertPhase !== null
        ) {
            return;
        }

        historyLockRef.current = true;
        setPublishError(null);
        setPublishPhase("confirm");
    }

    function clearPublishNoticeTimer() {
        if (publishNoticeTimerRef.current === null) {
            return;
        }

        clearTimeout(publishNoticeTimerRef.current);
        publishNoticeTimerRef.current = null;
    }

    function showPublishNotice() {
        clearPublishNoticeTimer();
        setPublishNoticeVisible(true);
        publishNoticeTimerRef.current = setTimeout(() => {
            publishNoticeTimerRef.current = null;
            setPublishNoticeVisible(false);
        }, 4000);
    }

    function dismissPublishNotice() {
        clearPublishNoticeTimer();
        setPublishNoticeVisible(false);
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
            || loadedBoardId === null
            || hasUnsavedChanges
            || saveState === "saving"
            || saveInFlightRef.current
            || publishInFlightRef.current
            || revertInFlightRef.current
        ) {
            return;
        }

        const targetBoardId = loadedBoardId;
        publishInFlightRef.current = true;
        setPublishRestoreTarget(document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null);
        setPublishPhase("publishing");
        setPublishError(null);

        publishBoard(targetBoardId)
            .then((record) => {
                if (!isCurrentBoard(targetBoardId) || !boardIdsMatch(record.id, targetBoardId)) {
                    return;
                }

                setPublishPhase(null);
                showPublishNotice();
            })
            .catch((error: unknown) => {
                if (!isCurrentBoard(targetBoardId)) {
                    return;
                }

                setPublishPhase("failed");
                setPublishError(readStudioError(
                    error,
                    "The board could not be published. Check that the API is running, then try again.",
                ));
            })
            .finally(() => {
                if (isCurrentBoard(targetBoardId)) {
                    publishInFlightRef.current = false;
                }
            });
    }

    function handleClosePreview() {
        setPreviewOpen(false);
    }

    function handleOpenRevert() {
        if (
            board === null
            || loadedBoardId === null
            || !hasUnsavedChanges
            || saveState === "saving"
            || saveInFlightRef.current
            || publishInFlightRef.current
            || revertInFlightRef.current
            || publishPhase !== null
            || revertPhase !== null
        ) {
            return;
        }

        historyLockRef.current = true;
        setRevertError(null);
        setRevertPhase("confirm");
    }

    function handleCancelRevert() {
        revertGenerationRef.current += 1;
        revertInFlightRef.current = false;
        setRevertPhase(null);
        setRevertError(null);
    }

    function handleConfirmRevert() {
        if (
            board === null
            || loadedBoardId === null
            || !hasUnsavedChanges
            || saveInFlightRef.current
            || publishInFlightRef.current
            || revertInFlightRef.current
        ) {
            return;
        }

        const targetBoardId = loadedBoardId;
        const snapshotVersion = changeVersionRef.current;
        const requestGeneration = revertGenerationRef.current + 1;
        revertGenerationRef.current = requestGeneration;
        revertInFlightRef.current = true;
        setRevertPhase("reverting");
        setRevertError(null);

        getBoard(targetBoardId)
            .then((record) => {
                if (revertGenerationRef.current !== requestGeneration || !isCurrentBoard(targetBoardId)) {
                    return;
                }

                if (!boardIdsMatch(record.id, targetBoardId)) {
                    setRevertError("The saved draft could not be restored. Your unsaved edits are still here.");
                    setRevertPhase("failed");
                    return;
                }

                if (changeVersionRef.current !== snapshotVersion) {
                    setRevertPhase(null);
                    setRevertError(null);
                    return;
                }

                resetDocument(record.draft);
                setReveal({ boardId, widgetId: null });
                setSaveState("idle");
                setSaveError(null);
                setRevertPhase(null);
                setRevertError(null);
            })
            .catch((error: unknown) => {
                if (revertGenerationRef.current !== requestGeneration || !isCurrentBoard(targetBoardId)) {
                    return;
                }

                if (isUnauthorizedError(error)) {
                    setRevertPhase(null);
                    setRevertError(null);
                    return;
                }

                setRevertError(readStudioError(
                    error,
                    "The saved draft could not be restored. Your unsaved edits are still here.",
                ));
                setRevertPhase("failed");
            })
            .finally(() => {
                if (revertGenerationRef.current === requestGeneration) {
                    revertInFlightRef.current = false;
                }
            });
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

    function handleTickerSettingsChange(settings: Partial<TickerWidgetSettings>) {
        if (selectedWidgetId === null) {
            return;
        }

        updateBoard((currentBoard) => updateTickerSettings(currentBoard, selectedWidgetId, settings));
    }

    function handleWidgetPositionChange(widgetId: string, position: { x: number; y: number }) {
        applyDocumentUpdate(
            (currentBoard) => updateWidgetPosition(currentBoard, widgetId, position.x, position.y),
            "position",
        );
    }

    function handleWidgetLayoutChange(widgetId: string, layout: WidgetLayout) {
        applyDocumentUpdate(
            (currentBoard) => updateWidgetLayout(currentBoard, widgetId, layout),
            "layout",
        );
    }

    function handleMoveWidget(widgetId: string, move: LayerMove) {
        if (board === null) {
            return;
        }

        const nextBoard = moveWidgetLayer(board, widgetId, move);

        if (nextBoard === board) {
            return;
        }

        updateBoard(() => nextBoard);
    }

    function handleReorderWidget(widgetId: string, targetId: string, placement: LayerDropPlacement) {
        if (board === null) {
            return;
        }

        const nextBoard = reorderWidgetLayer(board, widgetId, targetId, placement);

        if (nextBoard === board) {
            return;
        }

        updateBoard(() => nextBoard);
    }

    function handleLayerChange(widgetId: string, change: WidgetLayerChange) {
        if (board === null) {
            return;
        }

        const nextBoard = applyWidgetLayerChange(board, widgetId, change);

        if (nextBoard === board) {
            return;
        }

        updateBoard(() => nextBoard);
    }

    function revealAddedWidget(widgetId: string) {
        setReveal({ boardId, widgetId });

        if (revealTimerRef.current !== null) {
            clearTimeout(revealTimerRef.current);
        }

        revealTimerRef.current = setTimeout(() => {
            revealTimerRef.current = null;
            setReveal((current) => {
                if (current.boardId !== boardId || current.widgetId !== widgetId) {
                    return current;
                }

                return { boardId, widgetId: null };
            });
        }, 1800);
    }

    function handleAddWidget(type: WidgetType) {
        if (board === null) {
            return;
        }

        const widget = createWidget(type, board);

        updateBoard((currentBoard) => appendWidget(currentBoard, widget));
        setSelection({ boardId, widgetId: widget.id });
        revealAddedWidget(widget.id);
    }

    function handleDeleteSelectedWidget() {
        if (selectedWidgetId === null) {
            return;
        }

        const widgetId = selectedWidgetId;

        updateBoard((currentBoard) => removeWidget(currentBoard, widgetId));
        setSelection({ boardId, widgetId: null });
    }

    function handleRequestDeleteSelectedWidget() {
        if (selectedWidgetId === null || deleteDialogOpen) {
            return;
        }

        restoreFocusRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        historyLockRef.current = true;
        setDeleteDialogOpen(true);
    }

    function handleCancelDelete() {
        setDeleteDialogOpen(false);
    }

    function handleConfirmDelete() {
        handleDeleteSelectedWidget();
        setDeleteDialogOpen(false);
    }

    undoRef.current = handleUndo;
    redoRef.current = handleRedo;

    useEffect(() => {
        function handleHistoryKeyDown(event: KeyboardEvent) {
            if (event.isComposing || event.key === "Process") {
                return;
            }

            if (isHistoryTypingTarget(event.target)) {
                return;
            }

            const primaryModifier = event.metaKey || event.ctrlKey;

            if (!primaryModifier || event.altKey) {
                return;
            }

            const key = event.key.toLowerCase();
            const redoShortcut = (key === "z" && event.shiftKey)
                || (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey);
            const undoShortcut = key === "z" && !event.shiftKey;

            if (!undoShortcut && !redoShortcut) {
                return;
            }

            event.preventDefault();

            if (redoShortcut) {
                redoRef.current();
                return;
            }

            undoRef.current();
        }

        window.addEventListener("keydown", handleHistoryKeyDown);

        return () => {
            window.removeEventListener("keydown", handleHistoryKeyDown);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (publishNoticeTimerRef.current !== null) {
                clearTimeout(publishNoticeTimerRef.current);
            }
        };
    }, []);

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

    const boardTitle = boardName ?? (loadError === null ? "Loading board" : "Board unavailable");
    const leaveDialog = navigationLocked ? (
        <UnsavedChangesDialog
            onStay={() => {
                blocker.reset();
            }}
            onLeave={() => {
                blocker.proceed();
            }}
        />
    ) : null;

    if (previewOpen && board !== null) {
        return (
            <>
                <div className="h-dvh" inert={navigationLocked}>
                    <StudioPreview
                        board={board}
                        title={boardTitle}
                        onBack={handleClosePreview}
                    />
                </div>
                {leaveDialog}
            </>
        );
    }

    return (
        <>
            <div
                className="flex h-screen flex-col overflow-hidden bg-background font-sans text-foreground antialiased"
                inert={
                    deleteDialogOpen
                    || saveState === "saving"
                    || publishPhase !== null
                    || revertPhase !== null
                    || navigationLocked
                }
            >
                <StudioTopBar
                    boardName={boardTitle}
                    saveStatus={draftSaveStatus(board !== null, saveState, hasUnsavedChanges)}
                    saveError={saveError}
                    saveDisabled={
                        board === null
                        || !hasUnsavedChanges
                        || saveState === "saving"
                        || publishPhase !== null
                        || revertPhase !== null
                    }
                    previewDisabled={board === null || saveState === "saving" || publishPhase !== null || revertPhase !== null}
                    publishDisabled={
                        board === null
                        || loadedBoardId === null
                        || hasUnsavedChanges
                        || saveState === "saving"
                        || publishPhase !== null
                        || revertPhase !== null
                    }
                    revertDisabled={
                        board === null
                        || loadedBoardId === null
                        || !hasUnsavedChanges
                        || saveState === "saving"
                        || publishPhase !== null
                        || revertPhase !== null
                    }
                    publishGuidance={
                        board !== null && hasUnsavedChanges && saveState !== "saving" && publishPhase === null
                            ? "Save before publishing"
                            : null
                    }
                    displayPath={
                        board !== null && loadedBoardId !== null
                            ? `/display/${loadedBoardId}`
                            : null
                    }
                    onSave={handleSave}
                    onPreview={handleOpenPreview}
                    onPublish={handleOpenPublish}
                    onRevert={handleOpenRevert}
                    undoDisabled={
                        board === null
                        || !historyAvailability.canUndo
                        || deleteDialogOpen
                        || saveState === "saving"
                        || publishPhase !== null
                        || revertPhase !== null
                        || navigationLocked
                    }
                    redoDisabled={
                        board === null
                        || !historyAvailability.canRedo
                        || deleteDialogOpen
                        || saveState === "saving"
                        || publishPhase !== null
                        || revertPhase !== null
                        || navigationLocked
                    }
                    onUndo={handleUndo}
                    onRedo={handleRedo}
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
                        <StudioSidebar
                            widgets={board.widgets}
                            selectedWidgetId={selectedWidgetId}
                            revealedWidgetId={revealedWidgetId}
                            onAddWidget={handleAddWidget}
                            onSelectWidget={(widgetId) => {
                                setSelection({ boardId, widgetId });
                            }}
                            onMoveWidget={handleMoveWidget}
                            onReorderWidget={handleReorderWidget}
                            onLayerChange={handleLayerChange}
                        />
                        <EditorCanvas
                            board={board}
                            selectedWidgetId={selectedWidgetId}
                            onSelectWidget={(widgetId) => {
                                setSelection({ boardId, widgetId });
                            }}
                            onWidgetPositionChange={handleWidgetPositionChange}
                            onWidgetLayoutChange={handleWidgetLayoutChange}
                            onGestureEnd={handleGestureEnd}
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
                            onTickerSettingsChange={handleTickerSettingsChange}
                            onDeleteWidget={handleRequestDeleteSelectedWidget}
                        />
                    </div>
                )}
                <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-xs text-muted">
                    <p>Board resolution: 1920 x 1080</p>
                    <p>Zoom 100%</p>
                    <p className="inline-flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
                        Editing Draft
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
            {publishPhase === "confirm" || publishPhase === "failed" ? (
                <PublishBoardDialog
                    phase={publishPhase}
                    errorMessage={publishError}
                    onCancel={handleCancelPublish}
                    onConfirm={handlePublish}
                    onRetry={handlePublish}
                />
            ) : null}
            {publishNoticeVisible ? (
                <PublishNotice onDismiss={dismissPublishNotice} />
            ) : null}
            {revertPhase !== null ? (
                <RevertDraftDialog
                    phase={revertPhase}
                    errorMessage={revertError}
                    onCancel={handleCancelRevert}
                    onConfirm={handleConfirmRevert}
                />
            ) : null}
            {deleteDialogOpen ? (
                <DeleteWidgetDialog
                    onCancel={handleCancelDelete}
                    onConfirm={handleConfirmDelete}
                />
            ) : null}
            {leaveDialog}
        </>
    );
}

export default StudioPage;
