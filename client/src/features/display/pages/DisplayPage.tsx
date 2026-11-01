import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getPublishedBoard, isBoardId } from "../../boards/api/BoardApi.ts";
import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import type { Board } from "../../boards/types/boardTypes.ts";
import {
    DisplayConnectionStatus,
    DisplayStatus,
} from "../components/DisplayStatus.tsx";
import usePublishedBoardUpdates from "../hooks/usePublishedBoardUpdates.ts";
import type { DisplayConnectionState } from "../realtime/boardRealtimeClient.ts";

type DisplayPhase = "loading" | "unpublished" | "error" | "ready";

type PublishedDisplayStatus = {
    connectionState: DisplayConnectionState;
    detail: string | null;
};

type PublishedDisplayProps = {
    boardId: string;
    renderConnectionStatus?: (status: PublishedDisplayStatus) => ReactNode;
};

function readLoadError(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "The board could not be loaded. Check that the API is running, then try again.";
}

function PublishedDisplay({ boardId, renderConnectionStatus }: PublishedDisplayProps) {
    const [publishedBoard, setPublishedBoard] = useState<Board | null>(null);
    const [phase, setPhase] = useState<DisplayPhase>("loading");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const serialRef = useRef(0);
    const boardRef = useRef<Board | null>(null);

    const refreshPublished = useCallback(() => {
        const serial = ++serialRef.current;

        getPublishedBoard(boardId)
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
        const notFound = loadError === "Board not found.";

        content = (
            <DisplayStatus
                title={notFound ? "Board not found" : "Board unavailable"}
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

    const connectionStatus = renderConnectionStatus === undefined
        ? <DisplayConnectionStatus connectionState={connectionState} detail={detail} />
        : renderConnectionStatus({ connectionState, detail });

    return (
        <>
            {content}
            {connectionStatus}
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

export {
    PublishedDisplay,
};

export type {
    PublishedDisplayStatus,
};
