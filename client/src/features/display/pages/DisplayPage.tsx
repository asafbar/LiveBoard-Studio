import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getBoard, isBoardId } from "../../boards/api/BoardApi.ts";
import BoardRenderer from "../../boards/components/BoardRenderer.tsx";
import type { Board } from "../../boards/types/boardTypes.ts";

type DisplayStatusProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
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

type DisplayResult =
    | { requestKey: string; status: "unpublished" }
    | { requestKey: string; status: "ready"; board: Board }
    | { requestKey: string; status: "error"; message: string };

function DisplayPage() {
    const { boardId } = useParams();
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [result, setResult] = useState<DisplayResult | null>(null);
    const boardIdIsValid = isBoardId(boardId);
    const requestKey = boardIdIsValid ? `${boardId}:${loadAttempt}` : "";
    const currentResult = result?.requestKey === requestKey ? result : null;

    useEffect(() => {
        if (!boardIdIsValid) {
            return;
        }

        const requestedBoardId = boardId;
        const requestedKey = `${requestedBoardId}:${loadAttempt}`;
        let active = true;

        getBoard(requestedBoardId)
            .then((record) => {
                if (!active) {
                    return;
                }

                if (record.published === null) {
                    setResult({ requestKey: requestedKey, status: "unpublished" });
                    return;
                }

                setResult({
                    requestKey: requestedKey,
                    status: "ready",
                    board: record.published,
                });
            })
            .catch((error: unknown) => {
                if (!active) {
                    return;
                }

                setResult({
                    requestKey: requestedKey,
                    status: "error",
                    message: error instanceof Error && error.message.trim() !== ""
                        ? error.message
                        : "The board could not be loaded. Check that the API is running, then try again.",
                });
            });

        return () => {
            active = false;
        };
    }, [boardId, boardIdIsValid, loadAttempt]);

    function handleRetry() {
        setLoadAttempt((currentAttempt) => currentAttempt + 1);
    }

    if (!boardIdIsValid) {
        return (
            <DisplayStatus
                title="Board unavailable"
                message="This board address is not valid."
            />
        );
    }

    if (currentResult === null) {
        return (
            <DisplayStatus
                title="Loading board"
                message="The published board is being loaded."
            />
        );
    }

    if (currentResult.status === "unpublished") {
        return (
            <DisplayStatus
                title="Board not published"
                message="This display shows a board only after it has been published."
            />
        );
    }

    if (currentResult.status === "error") {
        return (
            <DisplayStatus
                title="Board unavailable"
                message={currentResult.message}
                actionLabel="Retry"
                onAction={handleRetry}
            />
        );
    }

    return (
        <div className="flex h-dvh min-h-0 bg-canvas">
            <BoardRenderer board={currentResult.board} framed={false} />
        </div>
    );
}

export default DisplayPage;
