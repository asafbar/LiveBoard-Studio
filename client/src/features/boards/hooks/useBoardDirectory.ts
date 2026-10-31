import { useCallback, useEffect, useRef, useState } from "react";
import {
    listBoardSummaries,
    type BoardSummary,
    type BoardWriteResult,
} from "../api/BoardApi.ts";

type BoardPublication = "published" | "unpublished" | "unknown";

type BoardDirectoryItem = BoardSummary & {
    publication: BoardPublication;
};

type BoardDirectory = {
    boards: BoardDirectoryItem[] | null;
    loadError: string | null;
    refreshError: string | null;
    refreshing: boolean;
    refresh: () => void;
    retry: () => void;
    commitBoard: (record: BoardWriteResult) => void;
};

function useBoardDirectory(): BoardDirectory {
    const [boards, setBoards] = useState<BoardDirectoryItem[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const boardsRef = useRef<BoardDirectoryItem[] | null>(null);
    const hasDataRef = useRef(false);
    const loadRef = useRef<() => void>(() => {});
    const commitRef = useRef<(record: BoardWriteResult) => void>(() => {});

    const refresh = useCallback(() => {
        loadRef.current();
    }, []);

    const retry = useCallback(() => {
        setLoadError(null);
        loadRef.current();
    }, []);

    const commitBoard = useCallback((record: BoardWriteResult) => {
        commitRef.current(record);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let inFlight = false;
        let requestSerial = 0;

        function applyBoards(next: BoardDirectoryItem[] | null) {
            boardsRef.current = next;
            setBoards(next);
        }

        function loadBoards() {
            if (cancelled || inFlight) {
                return;
            }

            inFlight = true;
            const requestId = ++requestSerial;

            if (hasDataRef.current) {
                setRefreshing(true);
            }

            listBoardSummaries()
                .then((summaries) => {
                    if (cancelled || requestId !== requestSerial) {
                        return;
                    }

                    hasDataRef.current = true;
                    applyBoards(mergeBoards(boardsRef.current, summaries));
                    setLoadError(null);
                    setRefreshError(null);
                })
                .catch((error: unknown) => {
                    if (cancelled || requestId !== requestSerial) {
                        return;
                    }

                    const message = readLoadError(error);

                    if (hasDataRef.current) {
                        setRefreshError(message);
                        return;
                    }

                    setLoadError(message);
                })
                .finally(() => {
                    if (requestId === requestSerial) {
                        inFlight = false;
                    }

                    if (!cancelled && requestId === requestSerial) {
                        setRefreshing(false);
                    }
                });
        }

        function commitBoardRecord(record: BoardWriteResult) {
            if (cancelled) {
                return;
            }

            requestSerial += 1;
            inFlight = false;
            hasDataRef.current = true;
            applyBoards(upsertBoard(boardsRef.current, record));
            setLoadError(null);
            setRefreshError(null);
            loadBoards();
        }

        loadRef.current = () => {
            if (!cancelled) {
                loadBoards();
            }
        };
        commitRef.current = commitBoardRecord;

        const kickoff = window.setTimeout(() => {
            if (cancelled) {
                return;
            }

            loadBoards();
        }, 0);

        return () => {
            cancelled = true;
            requestSerial += 1;
            window.clearTimeout(kickoff);
            loadRef.current = () => {};
            commitRef.current = () => {};
        };
    }, []);

    return {
        boards,
        loadError,
        refreshError,
        refreshing,
        refresh,
        retry,
        commitBoard,
    };
}

function mergeBoards(
    current: BoardDirectoryItem[] | null,
    summaries: BoardSummary[],
): BoardDirectoryItem[] {
    const known = new Map<string, BoardPublication>();

    for (const board of current ?? []) {
        known.set(board.id, board.publication);
    }

    return summaries.map((summary) => ({
        ...summary,
        publication: known.get(summary.id) ?? "unknown",
    }));
}

function upsertBoard(
    current: BoardDirectoryItem[] | null,
    record: BoardWriteResult,
): BoardDirectoryItem[] {
    const boards = current ?? [];
    const nextBoard: BoardDirectoryItem = {
        id: record.id,
        name: record.name,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        publication: record.unpublished ? "unpublished" : "published",
    };
    const index = boards.findIndex((board) => board.id === record.id);

    if (index === -1) {
        return [...boards, nextBoard];
    }

    const next = boards.slice();
    next[index] = nextBoard;

    return next;
}

function readLoadError(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "The boards could not be loaded. Check that the API is running, then try again.";
}

export type { BoardDirectoryItem };
export default useBoardDirectory;
