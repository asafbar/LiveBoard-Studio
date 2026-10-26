import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { Board, BoardBackground, Widget } from "../types/boardTypes.ts";
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
    selectedWidgetId?: string | null;
    onSelectWidget?: (widgetId: string | null) => void;
    onWidgetPositionChange?: (widgetId: string, position: WidgetPosition) => void;
};

type WidgetViewProps = {
    widget: Widget;
    selected: boolean;
    interactive: boolean;
    boardWidth: number;
    boardHeight: number;
    onSelectWidget?: (widgetId: string | null) => void;
    onWidgetPositionChange?: (widgetId: string, position: WidgetPosition) => void;
    onDragRelease?: () => void;
};

type DragSession = {
    pointerId: number;
    originClientX: number;
    originClientY: number;
    originX: number;
    originY: number;
    dragging: boolean;
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

function WidgetView({
    widget,
    selected,
    interactive,
    boardWidth,
    boardHeight,
    onSelectWidget,
    onWidgetPositionChange,
    onDragRelease,
}: WidgetViewProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const dragSessionRef = useRef<DragSession | null>(null);
    const draggable = interactive && onWidgetPositionChange !== undefined;
    const content = renderWidget(widget);
    const className = [
        styles.widget,
        interactive ? styles.widgetSelectable : "",
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

            if (session === null || frame === null || !frame.isConnected) {
                return;
            }

            if (frame.hasPointerCapture(session.pointerId)) {
                frame.releasePointerCapture(session.pointerId);
            }
        };
    }, []);

    function finishDrag(element: HTMLDivElement, pointerId: number) {
        const session = dragSessionRef.current;

        if (session === null || session.pointerId !== pointerId) {
            return;
        }

        dragSessionRef.current = null;

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
        if (event.button !== 0 || onWidgetPositionChange === undefined) {
            return;
        }

        event.stopPropagation();
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

        onSelectWidget?.(widget.id);
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        const session = dragSessionRef.current;

        if (session === null || session.pointerId !== event.pointerId || onWidgetPositionChange === undefined) {
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
            onPointerDown={draggable ? handlePointerDown : undefined}
            onPointerMove={draggable ? handlePointerMove : undefined}
            onPointerUp={draggable ? handlePointerUp : undefined}
            onPointerCancel={draggable ? handlePointerCancel : undefined}
            onLostPointerCapture={draggable ? handleLostPointerCapture : undefined}
        >
            {content}
        </div>
    );
}

function BoardRenderer({
    board,
    selectedWidgetId = null,
    onSelectWidget,
    onWidgetPositionChange,
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
            <div className={styles.frame} aria-label={board.name}>
                <div
                    className={styles.stage}
                    style={stageStyle}
                    onClick={interactive ? handleStageClick : undefined}
                >
                    <BoardBackgroundLayer background={board.background} />
                    {board.widgets.map((widget) => (
                        <WidgetView
                            key={widget.id}
                            widget={widget}
                            selected={interactive && widget.id === selectedWidgetId}
                            interactive={interactive}
                            boardWidth={board.width}
                            boardHeight={board.height}
                            onSelectWidget={onSelectWidget}
                            onWidgetPositionChange={onWidgetPositionChange}
                            onDragRelease={handleDragRelease}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BoardRenderer;
