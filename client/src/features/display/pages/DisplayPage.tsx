import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getBoard, isBoardId } from "../../boards/api/BoardApi.ts";
import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import type { Board } from "../../boards/types/boardTypes.ts";
import usePublishedBoardUpdates from "../hooks/usePublishedBoardUpdates.ts";
import type { DisplayConnectionState } from "../realtime/boardRealtimeClient.ts";

type DisplayStatusProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

type DisplayPhase = "loading" | "unpublished" | "error" | "ready";

type DisplayConnectionStatusProps = {
    connectionState: DisplayConnectionState;
    detail: string | null;
};

const connectionLabel: Record<DisplayConnectionState, string> = {
    connected: "Connected",
    reconnecting: "Reconnecting",
    disconnected: "Disconnected",
};

const connectionDotClassName: Record<DisplayConnectionState, string> = {
    connected: "bg-cyan",
    reconnecting: "bg-secondary",
    disconnected: "bg-danger",
};

function DisplayStatus({ title, message, actionLabel, onAction }: DisplayStatusProps) {
    return (
        <div className="flex h-dvh items-center justify-center bg-canvas p-6 font-sans text-foreground antialiased">
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 text-center shadow-panel">
                <h1 className="text-base font-semibold text-foreground">{title}</h1>
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

function DisplayConnectionStatus({ connectionState, detail }: DisplayConnectionStatusProps) {
    return (
        <div className="pointer-events-none fixed bottom-4 left-4 z-20 flex max-w-xs flex-col items-start gap-2 font-sans">
            <p
                role="status"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-secondary shadow-panel"
            >
                <span
                    className={`size-1.5 rounded-full ${connectionDotClassName[connectionState]}`}
                    aria-hidden="true"
                />
                {connectionLabel[connectionState]}
            </p>
            {detail !== null ? (
                <p
                    role="status"
                    className="rounded-control border border-border bg-surface/90 px-3 py-2 text-xs leading-4 text-secondary shadow-panel"
                >
                    {detail}
                </p>
            ) : null}
        </div>
    );
}

function readLoadError(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "The board could not be loaded. Check that the API is running, then try again.";
}

type PublishedDisplayProps = {
    boardId: string;
};

function PublishedDisplay({ boardId }: PublishedDisplayProps) {
    const [publishedBoard, setPublishedBoard] = useState<Board | null>(null);
    const [phase, setPhase] = useState<DisplayPhase>("loading");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const serialRef = useRef(0);
    const boardRef = useRef<Board | null>(null);

    const refreshPublished = useCallback(() => {
        const serial = ++serialRef.current;

        getBoard(boardId)
            .then((record) => {
                if (serial !== serialRef.current) {
                    return;
                }

                if (record.published === null) {
                    if (boardRef.current === null) {
                        setPhase("unpublished");
                        setLoadError(null);
                        setRefreshError(null);
                        return;
                    }

                    setRefreshError("The published board could not be refreshed.");
                    return;
                }

                boardRef.current = record.published;
                setPublishedBoard(record.published);
                setPhase("ready");
                setLoadError(null);
                setRefreshError(null);
            })
            .catch((error: unknown) => {
                if (serial !== serialRef.current) {
                    return;
                }

                const message = readLoadError(error);

                if (boardRef.current === null) {
                    setPhase("error");
                    setLoadError(message);
                    return;
                }

                setRefreshError(
                    message.startsWith("The board could not be loaded.")
                        ? "The published board could not be refreshed."
                        : message,
                );
            });
    }, [boardId]);

    useEffect(() => {
        refreshPublished();

        return () => {
            serialRef.current += 1;
        };
    }, [loadAttempt, refreshPublished]);

    const { connectionState, subscriptionError } = usePublishedBoardUpdates(
        boardId,
        refreshPublished,
    );

    function handleRetry() {
        setLoadError(null);
        setPhase("loading");
        setLoadAttempt((currentAttempt) => currentAttempt + 1);
    }

    const detail = refreshError ?? subscriptionError;
    let content;

    if (publishedBoard !== null) {
        content = (
            <div className="flex h-dvh min-h-0 bg-canvas">
                <BoardRenderer board={publishedBoard} framed={false} />
            </div>
        );
    } else if (phase === "unpublished") {
        content = (
            <DisplayStatus
                title="Board not published"
                message="This display shows a board only after it has been published."
            />
        );
    } else if (phase === "error") {
        content = (
            <DisplayStatus
                title="Board unavailable"
                message={loadError ?? "The board could not be loaded. Check that the API is running, then try again."}
                actionLabel="Retry"
                onAction={handleRetry}
            />
        );
    } else {
        content = (
            <DisplayStatus
                title="Loading board"
                message="The published board is being loaded."
            />
        );
    }

    return (
        <>
            {content}
            <DisplayConnectionStatus connectionState={connectionState} detail={detail} />
        </>
    );
}

function DisplayPage() {
    const { boardId } = useParams();

    if (!isBoardId(boardId)) {
        return (
            <DisplayStatus
                title="Board unavailable"
                message="This board address is not valid."
            />
        );
    }

    return <PublishedDisplay key={boardId} boardId={boardId} />;
}

export default DisplayPage;
