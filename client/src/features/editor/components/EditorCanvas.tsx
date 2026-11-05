import { useEffect, useImperativeHandle, useLayoutEffect, useReducer, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import type { Board, WidgetLayout } from "../../boards/types/boardTypes.ts";
import {
    activeZoomScale,
    contentBounds,
    initialCanvasZoomState,
    reduceCanvasZoom,
    scrollKeepingBoard,
    scrollPreservingCenter,
    scrollToCenterBoard,
    scrollToCenterWorkspace,
    visibleLayouts,
    workspaceGeometry,
    type WorkspaceGeometry,
    type ZoomMode,
} from "../../boards/canvasView.ts";
import styles from "./EditorCanvas.module.css";

type CanvasZoomApi = {
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    fitBoard: () => void;
    fitWorkspace: () => void;
};

type EditorCanvasProps = {
    board: Board;
    selectedWidgetId: string | null;
    zoomRef: Ref<CanvasZoomApi>;
    onZoomChange: (mode: ZoomMode, scale: number) => void;
    onSelectWidget: (widgetId: string | null) => void;
    onWidgetPositionChange: (widgetId: string, position: { x: number; y: number }) => void;
    onWidgetLayoutChange: (widgetId: string, layout: WidgetLayout) => void;
    onGestureEnd: () => void;
    onDeleteSelectedWidget: () => void;
};

type AppliedCanvas = {
    geometry: WorkspaceGeometry;
    scrollLeft: number;
    scrollTop: number;
};

function isTextEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (target.isContentEditable) {
        return true;
    }

    return target.closest("input, textarea, select") !== null;
}

function EditorCanvas({
    board,
    selectedWidgetId,
    zoomRef,
    onZoomChange,
    onSelectWidget,
    onWidgetPositionChange,
    onWidgetLayoutChange,
    onGestureEnd,
    onDeleteSelectedWidget,
}: EditorCanvasProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const appliedRef = useRef<AppliedCanvas | null>(null);
    const boardRef = useRef(board);
    const onZoomChangeRef = useRef(onZoomChange);
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const [zoom, dispatch] = useReducer(reduceCanvasZoom, initialCanvasZoomState);
    const scale = activeZoomScale(zoom);
    const ready = viewport.width > 0 && viewport.height > 0 && zoom.token > 0;

    useLayoutEffect(() => {
        boardRef.current = board;
        onZoomChangeRef.current = onZoomChange;
    }, [board, onZoomChange]);

    useLayoutEffect(() => {
        const node = viewportRef.current;

        if (node === null) {
            return;
        }

        const measure = () => {
            const next = {
                width: node.clientWidth,
                height: node.clientHeight,
            };

            setViewport((current) => (
                current.width === next.width && current.height === next.height ? current : next
            ));
        };

        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);

        return () => {
            observer.disconnect();
        };
    }, []);

    useLayoutEffect(() => {
        if (viewport.width === 0 || viewport.height === 0) {
            return;
        }

        const current = boardRef.current;

        dispatch({
            type: "refit",
            viewportWidth: viewport.width,
            viewportHeight: viewport.height,
            boardWidth: current.width,
            boardHeight: current.height,
            bounds: contentBounds(current.width, current.height, visibleLayouts(current.widgets)),
        });
    }, [viewport.width, viewport.height, board.width, board.height]);

    useLayoutEffect(() => {
        const node = viewportRef.current;

        if (node === null || !ready) {
            return;
        }

        const bounds = contentBounds(board.width, board.height, visibleLayouts(board.widgets));
        const geometry = workspaceGeometry(board.width, board.height, bounds, scale, viewport.width, viewport.height);
        const previous = appliedRef.current;
        let scrollLeft = node.scrollLeft;
        let scrollTop = node.scrollTop;

        if (zoom.scroll === "center-board" || (zoom.scroll === "preserve-center" && previous === null)) {
            const next = scrollToCenterBoard(geometry, viewport.width, viewport.height);
            scrollLeft = next.scrollLeft;
            scrollTop = next.scrollTop;
        } else if (zoom.scroll === "center-content") {
            const next = scrollToCenterWorkspace(geometry, viewport.width, viewport.height);
            scrollLeft = next.scrollLeft;
            scrollTop = next.scrollTop;
        } else if (zoom.scroll === "preserve-center" && previous !== null) {
            const next = scrollPreservingCenter(
                previous.geometry,
                geometry,
                node.scrollLeft,
                node.scrollTop,
                viewport.width,
                viewport.height,
            );
            scrollLeft = next.scrollLeft;
            scrollTop = next.scrollTop;
        } else if (
            previous !== null
            && (
                previous.geometry.boardWidth !== geometry.boardWidth
                || previous.geometry.boardHeight !== geometry.boardHeight
            )
        ) {
            const next = scrollPreservingCenter(
                previous.geometry,
                geometry,
                node.scrollLeft,
                node.scrollTop,
                viewport.width,
                viewport.height,
            );
            scrollLeft = next.scrollLeft;
            scrollTop = next.scrollTop;
        } else if (previous !== null) {
            const next = scrollKeepingBoard(node.scrollLeft, node.scrollTop, previous.geometry, geometry);
            scrollLeft = next.scrollLeft;
            scrollTop = next.scrollTop;
        }

        node.scrollLeft = scrollLeft;
        node.scrollTop = scrollTop;
        appliedRef.current = {
            geometry,
            scrollLeft: node.scrollLeft,
            scrollTop: node.scrollTop,
        };

        if (zoom.scroll !== "none") {
            dispatch({ type: "scroll-applied" });
        }
    }, [board.height, board.widgets, board.width, ready, scale, viewport.height, viewport.width, zoom.scroll, zoom.token]);

    useEffect(() => {
        if (!ready) {
            return;
        }

        onZoomChangeRef.current(zoom.mode, scale);
    }, [ready, scale, zoom.mode]);

    useImperativeHandle(zoomRef, () => ({
        zoomIn() {
            dispatch({ type: "zoom-in" });
        },
        zoomOut() {
            dispatch({ type: "zoom-out" });
        },
        reset() {
            dispatch({ type: "reset" });
        },
        fitBoard() {
            const node = viewportRef.current;
            const current = boardRef.current;

            if (node === null) {
                return;
            }

            dispatch({
                type: "fit-board",
                viewportWidth: node.clientWidth,
                viewportHeight: node.clientHeight,
                boardWidth: current.width,
                boardHeight: current.height,
            });
        },
        fitWorkspace() {
            const node = viewportRef.current;
            const current = boardRef.current;

            if (node === null) {
                return;
            }

            dispatch({
                type: "fit-workspace",
                viewportWidth: node.clientWidth,
                viewportHeight: node.clientHeight,
                bounds: contentBounds(current.width, current.height, visibleLayouts(current.widgets)),
            });
        },
    }), []);

    function handleCanvasKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key !== "Delete" && event.key !== "Backspace") {
            return;
        }

        if (isTextEditingTarget(event.target)) {
            return;
        }

        event.preventDefault();
        onDeleteSelectedWidget();
    }

    function handleBackgroundPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        const target = event.target;

        if (!(target instanceof Element) || target.closest("[data-widget-id]") !== null) {
            return;
        }

        onSelectWidget(null);
    }

    const bounds = contentBounds(board.width, board.height, visibleLayouts(board.widgets));
    const geometry = ready
        ? workspaceGeometry(board.width, board.height, bounds, scale, viewport.width, viewport.height)
        : null;

    return (
        <section
            className="flex min-h-0 min-w-0 flex-1 bg-canvas"
            aria-label="Board canvas"
            tabIndex={-1}
            onKeyDown={handleCanvasKeyDown}
        >
            <div ref={viewportRef} className={styles.viewport}>
                {geometry === null ? null : (
                    <div
                        className={styles.sizer}
                        style={{ width: geometry.sizerWidth, height: geometry.sizerHeight }}
                        onPointerDown={handleBackgroundPointerDown}
                    >
                        <div
                            className={styles.workspace}
                            style={{
                                left: geometry.workspaceLeft,
                                top: geometry.workspaceTop,
                                width: geometry.workspaceWidth,
                                height: geometry.workspaceHeight,
                            }}
                        >
                            <div
                                className={styles.boardOrigin}
                                style={{ left: geometry.boardLeft, top: geometry.boardTop }}
                            >
                                <BoardRenderer
                                    board={board}
                                    editorScale={scale}
                                    selectedWidgetId={selectedWidgetId}
                                    onSelectWidget={onSelectWidget}
                                    onWidgetPositionChange={onWidgetPositionChange}
                                    onWidgetLayoutChange={onWidgetLayoutChange}
                                    onGestureEnd={onGestureEnd}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export type { CanvasZoomApi };
export default EditorCanvas;
