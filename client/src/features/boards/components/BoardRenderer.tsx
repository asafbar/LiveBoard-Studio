import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { Board, BoardBackground, Widget, WidgetLayout } from "../types/boardTypes.ts";
import AnnouncementsWidget from "./AnnouncementsWidget.tsx";
import ClockWidget from "./ClockWidget.tsx";
import ImageWidget from "./ImageWidget.tsx";
import InformationCardWidget from "./InformationCardWidget.tsx";
import styles from "./BoardRenderer.module.css";
import TextWidget from "./TextWidget.tsx";

type WidgetPosition = {
    x: number;
    y: number;
};

type BoardRendererProps = {
    board: Board;
    framed?: boolean;
    selectedWidgetId?: string | null;
    onSelectWidget?: (widgetId: string | null) => void;
    onWidgetPositionChange?: (widgetId: string, position: WidgetPosition) => void;
    onWidgetLayoutChange?: (widgetId: string, layout: WidgetLayout) => void;
    onGestureEnd?: () => void;
};

type WidgetViewProps = {
    widget: Widget;
    selected: boolean;
    interactive: boolean;
    boardWidth: number;
    boardHeight: number;
    onSelectWidget?: (widgetId: string | null) => void;
    onWidgetPositionChange?: (widgetId: string, position: WidgetPosition) => void;
    onWidgetLayoutChange?: (widgetId: string, layout: WidgetLayout) => void;
    onDragRelease?: () => void;
    onGestureEnd?: () => void;
};

type DragSession = {
    pointerId: number;
    originClientX: number;
    originClientY: number;
    originX: number;
    originY: number;
    dragging: boolean;
};

type ResizeCorner = "nw" | "ne" | "sw" | "se";

type ResizeSession = {
    pointerId: number;
    corner: ResizeCorner;
    originClientX: number;
    originClientY: number;
    originLayout: WidgetLayout;
    resizing: boolean;
    handle: HTMLDivElement;
};

type ResizeHandleProps = {
    corner: ResizeCorner;
    onPointerDown: (corner: ResizeCorner, event: PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => void;
};

type StageStyle = CSSProperties & {
    "--board-width": string;
};

type WidgetFrameStyle = CSSProperties & {
    "--widget-radius"?: string;
};

type BoardBackgroundLayerProps = {
    background: BoardBackground;
};

type ImageBackgroundProps = {
    background: Extract<BoardBackground, { type: "image" }>;
};

type LoadFailure = {
    src: string;
    failed: boolean;
};

function ImageBoardBackground({ background }: ImageBackgroundProps) {
    const [loadFailure, setLoadFailure] = useState<LoadFailure>({
        src: background.src,
        failed: false,
    });
    const failed = loadFailure.src === background.src && loadFailure.failed;
    const showImage = background.src.length > 0 && !failed;
    const fitClass = background.fit === "cover" ? styles.backgroundCover : styles.backgroundContain;

    return (
        <div
            className={styles.background}
            style={{ backgroundColor: background.fallbackColor }}
            aria-hidden="true"
        >
            {showImage ? (
                <img
                    className={`${styles.backgroundImage} ${fitClass}`}
                    src={background.src}
                    alt=""
                    style={{ objectPosition: background.position }}
                    onError={() => {
                        setLoadFailure({
                            src: background.src,
                            failed: true,
                        });
                    }}
                />
            ) : null}
        </div>
    );
}

function BoardBackgroundLayer({ background }: BoardBackgroundLayerProps) {
    switch (background.type) {
        case "solid":
            return (
                <div
                    className={styles.background}
                    style={{ backgroundColor: background.color }}
                    aria-hidden="true"
                />
            );
        case "gradient":
            return (
                <div
                    className={styles.background}
                    style={{
                        backgroundImage: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`,
                    }}
                    aria-hidden="true"
                />
            );
        case "image":
            return <ImageBoardBackground background={background} />;
    }
}

function widgetAccessibleName(widget: Widget): string {
    switch (widget.type) {
        case "text":
            return widget.settings.text;
        case "clock":
            return "Clock";
        case "image":
            return widget.settings.alt.length > 0 ? widget.settings.alt : "Image";
        case "information-card":
            return widget.settings.title;
        case "announcements":
            return widget.settings.title;
    }
}

function renderWidget(widget: Widget) {
    switch (widget.type) {
        case "text":
            return <TextWidget settings={widget.settings} />;
        case "clock":
            return <ClockWidget settings={widget.settings} />;
        case "image":
            return <ImageWidget settings={widget.settings} />;
        case "information-card":
            return <InformationCardWidget settings={widget.settings} />;
        case "announcements":
            return <AnnouncementsWidget settings={widget.settings} />;
    }
}

const dragStartDistance = 3;
const minimumWidgetWidth = 100;
const minimumWidgetHeight = 60;
const resizeCorners: ResizeCorner[] = ["nw", "ne", "sw", "se"];

const resizeHandleClassNames: Record<ResizeCorner, string> = {
    nw: styles.resizeNw,
    ne: styles.resizeNe,
    sw: styles.resizeSw,
    se: styles.resizeSe,
};

function selectionRadius(widget: Widget): string | undefined {
    switch (widget.type) {
        case "image":
        case "information-card":
        case "announcements":
            return `${widget.settings.borderRadius}px`;
        case "text":
        case "clock":
            return undefined;
    }
}

function logicalStagePoint(
    stage: HTMLElement,
    clientX: number,
    clientY: number,
    boardWidth: number,
    boardHeight: number,
): WidgetPosition {
    const rect = stage.getBoundingClientRect();
    const scaleX = rect.width === 0 ? 1 : boardWidth / rect.width;
    const scaleY = rect.height === 0 ? 1 : boardHeight / rect.height;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
    };
}

function stageElement(element: HTMLElement): HTMLElement | null {
    const stage = element.closest(`.${styles.stage}`);

    if (stage instanceof HTMLElement) {
        return stage;
    }

    return null;
}

type ResizeEdges = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

function containResizeEdges(
    edges: ResizeEdges,
    movesLeft: boolean,
    movesTop: boolean,
    boardWidth: number,
    boardHeight: number,
): ResizeEdges {
    let { left, top, right, bottom } = edges;

    if (right - left < minimumWidgetWidth) {
        if (movesLeft) {
            left = right - minimumWidgetWidth;
        } else {
            right = left + minimumWidgetWidth;
        }
    }

    if (bottom - top < minimumWidgetHeight) {
        if (movesTop) {
            top = bottom - minimumWidgetHeight;
        } else {
            bottom = top + minimumWidgetHeight;
        }
    }

    left = Math.max(0, left);
    top = Math.max(0, top);
    right = Math.min(boardWidth, right);
    bottom = Math.min(boardHeight, bottom);

    if (right - left < minimumWidgetWidth) {
        if (movesLeft) {
            left = Math.max(0, right - minimumWidgetWidth);
        } else {
            right = Math.min(boardWidth, left + minimumWidgetWidth);
        }
    }

    if (bottom - top < minimumWidgetHeight) {
        if (movesTop) {
            top = Math.max(0, bottom - minimumWidgetHeight);
        } else {
            bottom = Math.min(boardHeight, top + minimumWidgetHeight);
        }
    }

    return { left, top, right, bottom };
}

function resizeLayout(
    origin: WidgetLayout,
    corner: ResizeCorner,
    deltaX: number,
    deltaY: number,
    boardWidth: number,
    boardHeight: number,
): WidgetLayout {
    const movesLeft = corner === "nw" || corner === "sw";
    const movesTop = corner === "nw" || corner === "ne";
    const moved = containResizeEdges({
        left: origin.x + (movesLeft ? deltaX : 0),
        top: origin.y + (movesTop ? deltaY : 0),
        right: origin.x + origin.width + (movesLeft ? 0 : deltaX),
        bottom: origin.y + origin.height + (movesTop ? 0 : deltaY),
    }, movesLeft, movesTop, boardWidth, boardHeight);
    const rounded = containResizeEdges({
        left: Math.round(moved.left),
        top: Math.round(moved.top),
        right: Math.round(moved.right),
        bottom: Math.round(moved.bottom),
    }, movesLeft, movesTop, boardWidth, boardHeight);

    return {
        x: rounded.left,
        y: rounded.top,
        width: rounded.right - rounded.left,
        height: rounded.bottom - rounded.top,
    };
}

function ResizeHandle({
    corner,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
}: ResizeHandleProps) {
    return (
        <div
            className={`${styles.resizeHandle} ${resizeHandleClassNames[corner]}`}
            data-resize-corner={corner}
            aria-hidden="true"
            onClick={(event) => {
                event.stopPropagation();
            }}
            onPointerDown={(event) => {
                onPointerDown(corner, event);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onLostPointerCapture={onLostPointerCapture}
        />
    );
}

function WidgetView({
    widget,
    selected,
    interactive,
    boardWidth,
    boardHeight,
    onSelectWidget,
    onWidgetPositionChange,
    onWidgetLayoutChange,
    onDragRelease,
    onGestureEnd,
}: WidgetViewProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const dragSessionRef = useRef<DragSession | null>(null);
    const resizeSessionRef = useRef<ResizeSession | null>(null);
    const geometryLocked = widget.locked === true;
    const draggable = interactive && onWidgetPositionChange !== undefined && !geometryLocked;
    const content = renderWidget(widget);
    const className = [
        styles.widget,
        interactive ? styles.widgetSelectable : "",
        geometryLocked ? styles.widgetLocked : "",
        selected ? styles.widgetSelected : "",
    ].filter((name) => name.length > 0).join(" ");
    const radius = selectionRadius(widget);
    const frameStyle: WidgetFrameStyle = {
        left: widget.layout.x,
        top: widget.layout.y,
        width: widget.layout.width,
        height: widget.layout.height,
    };

    if (radius !== undefined) {
        frameStyle["--widget-radius"] = radius;
    }

    useEffect(() => {
        const frame = frameRef.current;

        return () => {
            const session = dragSessionRef.current;
            dragSessionRef.current = null;

            if (
                session !== null
                && frame !== null
                && frame.isConnected
                && frame.hasPointerCapture(session.pointerId)
            ) {
                frame.releasePointerCapture(session.pointerId);
            }

            const resizeSession = resizeSessionRef.current;
            resizeSessionRef.current = null;

            if (
                resizeSession !== null
                && resizeSession.handle.isConnected
                && resizeSession.handle.hasPointerCapture(resizeSession.pointerId)
            ) {
                resizeSession.handle.releasePointerCapture(resizeSession.pointerId);
            }
        };
    }, []);

    useEffect(() => {
        if (selected && widget.locked !== true) {
            return;
        }

        const resizeSession = resizeSessionRef.current;
        resizeSessionRef.current = null;

        if (
            resizeSession !== null
            && resizeSession.handle.isConnected
            && resizeSession.handle.hasPointerCapture(resizeSession.pointerId)
        ) {
            resizeSession.handle.releasePointerCapture(resizeSession.pointerId);
        }
    }, [selected, widget.locked]);

    function finishDrag(element: HTMLDivElement, pointerId: number) {
        const session = dragSessionRef.current;

        if (session === null || session.pointerId !== pointerId) {
            return;
        }

        const moved = session.dragging;
        dragSessionRef.current = null;

        if (moved) {
            onGestureEnd?.();
        }

        if (element.hasPointerCapture(pointerId)) {
            element.releasePointerCapture(pointerId);
        }
    }

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        event.stopPropagation();
        onSelectWidget?.(widget.id);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onSelectWidget?.(widget.id);
    }

    function handleDragStart(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
    }

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        if (event.button !== 0) {
            return;
        }

        event.stopPropagation();
        onSelectWidget?.(widget.id);

        if (widget.locked === true || onWidgetPositionChange === undefined) {
            return;
        }

        dragSessionRef.current = {
            pointerId: event.pointerId,
            originClientX: event.clientX,
            originClientY: event.clientY,
            originX: widget.layout.x,
            originY: widget.layout.y,
            dragging: false,
        };

        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Capture requires an active pointer. The gesture still ends on pointerup.
        }
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        const session = dragSessionRef.current;

        if (
            session === null
            || session.pointerId !== event.pointerId
            || widget.locked === true
            || onWidgetPositionChange === undefined
        ) {
            return;
        }

        if (!session.dragging) {
            const distance = Math.hypot(
                event.clientX - session.originClientX,
                event.clientY - session.originClientY,
            );

            if (distance < dragStartDistance) {
                return;
            }

            session.dragging = true;
        }

        const stage = event.currentTarget.parentElement;

        if (stage === null) {
            return;
        }

        event.preventDefault();
        const origin = logicalStagePoint(
            stage,
            session.originClientX,
            session.originClientY,
            boardWidth,
            boardHeight,
        );
        const current = logicalStagePoint(
            stage,
            event.clientX,
            event.clientY,
            boardWidth,
            boardHeight,
        );

        onWidgetPositionChange(widget.id, {
            x: session.originX + (current.x - origin.x),
            y: session.originY + (current.y - origin.y),
        });
    }

    function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
        const moved = dragSessionRef.current?.dragging === true;

        if (moved) {
            onDragRelease?.();
        }

        finishDrag(event.currentTarget, event.pointerId);
    }

    function handlePointerCancel(event: PointerEvent<HTMLDivElement>) {
        finishDrag(event.currentTarget, event.pointerId);
    }

    function handleLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
        finishDrag(event.currentTarget, event.pointerId);
    }

    function finishResize(element: HTMLDivElement, pointerId: number) {
        const session = resizeSessionRef.current;

        if (session === null || session.pointerId !== pointerId) {
            return;
        }

        const resized = session.resizing;
        resizeSessionRef.current = null;

        if (resized) {
            onGestureEnd?.();
        }

        if (element.hasPointerCapture(pointerId)) {
            element.releasePointerCapture(pointerId);
        }
    }

    function handleResizePointerDown(corner: ResizeCorner, event: PointerEvent<HTMLDivElement>) {
        if (event.button !== 0 || widget.locked === true || onWidgetLayoutChange === undefined) {
            return;
        }

        const activeSession = resizeSessionRef.current;

        if (activeSession !== null && activeSession.handle.isConnected) {
            event.stopPropagation();
            return;
        }

        event.stopPropagation();
        resizeSessionRef.current = {
            pointerId: event.pointerId,
            corner,
            originClientX: event.clientX,
            originClientY: event.clientY,
            originLayout: {
                x: widget.layout.x,
                y: widget.layout.y,
                width: widget.layout.width,
                height: widget.layout.height,
            },
            resizing: false,
            handle: event.currentTarget,
        };

        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            // Capture requires an active pointer. The gesture still ends on pointerup.
        }

        onSelectWidget?.(widget.id);
    }

    function handleResizePointerMove(event: PointerEvent<HTMLDivElement>) {
        const session = resizeSessionRef.current;

        if (session === null || session.pointerId !== event.pointerId || onWidgetLayoutChange === undefined) {
            return;
        }

        event.stopPropagation();

        if (!session.resizing) {
            const distance = Math.hypot(
                event.clientX - session.originClientX,
                event.clientY - session.originClientY,
            );

            if (distance < dragStartDistance) {
                return;
            }

            session.resizing = true;
        }

        const stage = stageElement(event.currentTarget);

        if (stage === null) {
            return;
        }

        event.preventDefault();
        const origin = logicalStagePoint(
            stage,
            session.originClientX,
            session.originClientY,
            boardWidth,
            boardHeight,
        );
        const current = logicalStagePoint(
            stage,
            event.clientX,
            event.clientY,
            boardWidth,
            boardHeight,
        );

        onWidgetLayoutChange(widget.id, resizeLayout(
            session.originLayout,
            session.corner,
            current.x - origin.x,
            current.y - origin.y,
            boardWidth,
            boardHeight,
        ));
    }

    function handleResizePointerUp(event: PointerEvent<HTMLDivElement>) {
        const session = resizeSessionRef.current;
        const resizing = session?.resizing === true && session.pointerId === event.pointerId;

        event.stopPropagation();

        if (resizing) {
            onDragRelease?.();
        }

        finishResize(event.currentTarget, event.pointerId);
    }

    function handleResizePointerCancel(event: PointerEvent<HTMLDivElement>) {
        event.stopPropagation();
        finishResize(event.currentTarget, event.pointerId);
    }

    function handleResizeLostPointerCapture(event: PointerEvent<HTMLDivElement>) {
        finishResize(event.currentTarget, event.pointerId);
    }

    return (
        <div
            ref={frameRef}
            className={className}
            style={frameStyle}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? selected : undefined}
            aria-label={interactive ? widgetAccessibleName(widget) : undefined}
            onClick={interactive ? handleClick : undefined}
            onKeyDown={interactive ? handleKeyDown : undefined}
            onDragStart={draggable ? handleDragStart : undefined}
            onPointerDown={interactive ? handlePointerDown : undefined}
            onPointerMove={draggable ? handlePointerMove : undefined}
            onPointerUp={draggable ? handlePointerUp : undefined}
            onPointerCancel={draggable ? handlePointerCancel : undefined}
            onLostPointerCapture={draggable ? handleLostPointerCapture : undefined}
        >
            {content}
            {selected && !geometryLocked && onWidgetLayoutChange !== undefined ? resizeCorners.map((corner) => (
                <ResizeHandle
                    key={corner}
                    corner={corner}
                    onPointerDown={handleResizePointerDown}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    onPointerCancel={handleResizePointerCancel}
                    onLostPointerCapture={handleResizeLostPointerCapture}
                />
            )) : null}
        </div>
    );
}

function BoardRenderer({
    board,
    framed = true,
    selectedWidgetId = null,
    onSelectWidget,
    onWidgetPositionChange,
    onWidgetLayoutChange,
    onGestureEnd,
}: BoardRendererProps) {
    const interactive = onSelectWidget !== undefined;
    const suppressStageClickRef = useRef(false);
    const stageStyle: StageStyle = {
        width: board.width,
        height: board.height,
        "--board-width": `${board.width}px`,
    };

    function handleStageClick() {
        if (suppressStageClickRef.current) {
            return;
        }

        onSelectWidget?.(null);
    }

    function handleDragRelease() {
        suppressStageClickRef.current = true;
        queueMicrotask(() => {
            suppressStageClickRef.current = false;
        });
    }

    return (
        <div className={styles.root}>
            <div
                className={framed ? styles.frame : `${styles.frame} ${styles.framePlain}`}
                aria-label={board.name}
            >
                <div
                    className={styles.stage}
                    style={stageStyle}
                    onClick={interactive ? handleStageClick : undefined}
                >
                    <BoardBackgroundLayer background={board.background} />
                    {/* Hidden widgets remain in the draft and are omitted from every surface. */}
                    {board.widgets.filter((widget) => widget.visible !== false).map((widget) => (
                        <WidgetView
                            key={widget.id}
                            widget={widget}
                            selected={interactive && widget.id === selectedWidgetId}
                            interactive={interactive}
                            boardWidth={board.width}
                            boardHeight={board.height}
                            onSelectWidget={onSelectWidget}
                            onWidgetPositionChange={onWidgetPositionChange}
                            onWidgetLayoutChange={onWidgetLayoutChange}
                            onDragRelease={handleDragRelease}
                            onGestureEnd={onGestureEnd}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BoardRenderer;
