import { useCallback, useEffect, useRef, useState } from "react";
import {
    listBoardSummaries,
    type BoardSummary,
} from "../../boards/api/BoardApi.ts";
import {
    listDisplays,
    type DisplayRecord,
} from "../api/displayApi.ts";

type DisplayDirectory = {
    displays: DisplayRecord[] | null;
    boards: BoardSummary[] | null;
    loadError: string | null;
    refreshError: string | null;
    refreshing: boolean;
    refresh: () => void;
    retry: () => void;
    commitDisplay: (record: DisplayRecord) => void;
};

const REFRESH_INTERVAL_MS = 10000;

type DisplayPollState = {
    timer: ReturnType<typeof setInterval> | null;
};

// Keep the poll timer outside the module instance so a restarted effect
// cannot leave an older interval running.
const pollGlobal = globalThis as typeof globalThis & {
    __liveboardDisplayPoll?: DisplayPollState;
};

const displayPollState: DisplayPollState = pollGlobal.__liveboardDisplayPoll ?? {
    timer: null,
};

pollGlobal.__liveboardDisplayPoll = displayPollState;

function useDisplayDirectory(): DisplayDirectory {
    const [displays, setDisplays] = useState<DisplayRecord[] | null>(null);
    const [boards, setBoards] = useState<BoardSummary[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const hasDataRef = useRef(false);
    const loadRef = useRef<() => void>(() => {});
    const commitRef = useRef<(record: DisplayRecord) => void>(() => {});

    const refresh = useCallback(() => {
        loadRef.current();
    }, []);

    const retry = useCallback(() => {
        setLoadError(null);
        loadRef.current();
    }, []);

    const commitDisplay = useCallback((record: DisplayRecord) => {
        commitRef.current(record);
    }, []);

    useEffect(() => {
        let cancelled = false;
        let inFlight = false;
        let requestSerial = 0;
        let timer: ReturnType<typeof setInterval> | null = null;
        let wasHidden = document.hidden;

        function stopPolling() {
            if (timer !== null) {
                clearInterval(timer);
            }

            if (displayPollState.timer === timer) {
                displayPollState.timer = null;
            }

            timer = null;
        }

        function loadDirectory() {
            if (cancelled || inFlight) {
                return;
            }

            inFlight = true;
            const requestId = ++requestSerial;

            if (hasDataRef.current) {
                setRefreshing(true);
            }

            Promise.all([listDisplays(), listBoardSummaries()])
                .then(([displayList, boardList]) => {
                    if (cancelled || requestId !== requestSerial) {
                        return;
                    }

                    hasDataRef.current = true;
                    setDisplays(displayList);
                    setBoards(boardList);
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

        function startPolling() {
            stopPolling();

            if (cancelled || document.hidden) {
                return;
            }

            if (displayPollState.timer !== null) {
                clearInterval(displayPollState.timer);
                displayPollState.timer = null;
            }

            const pollTimer = setInterval(() => {
                if (displayPollState.timer !== pollTimer) {
                    clearInterval(pollTimer);
                    return;
                }

                if (document.hidden) {
                    return;
                }

                loadDirectory();
            }, REFRESH_INTERVAL_MS);
            timer = pollTimer;
            displayPollState.timer = pollTimer;
        }

        function handleVisibilityChange() {
            if (document.hidden) {
                wasHidden = true;
                stopPolling();
                return;
            }

            if (!wasHidden) {
                return;
            }

            wasHidden = false;
            loadDirectory();
            startPolling();
        }

        function commitDisplayRecord(record: DisplayRecord) {
            if (cancelled) {
                return;
            }

            // Drop an older poll so it cannot replace the saved record.
            requestSerial += 1;
            inFlight = false;
            hasDataRef.current = true;
            setDisplays((current) => upsertDisplay(current, record));
            setLoadError(null);
            setRefreshError(null);
            loadDirectory();
        }

        loadRef.current = () => {
            if (!cancelled) {
                loadDirectory();
            }
        };
        commitRef.current = commitDisplayRecord;

        const kickoff = window.setTimeout(() => {
            if (cancelled) {
                return;
            }

            loadDirectory();
            startPolling();
        }, 0);

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            requestSerial += 1;
            window.clearTimeout(kickoff);
            stopPolling();
            loadRef.current = () => {};
            commitRef.current = () => {};
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return {
        displays,
        boards,
        loadError,
        refreshError,
        refreshing,
        refresh,
        retry,
        commitDisplay,
    };
}

function upsertDisplay(
    current: DisplayRecord[] | null,
    record: DisplayRecord,
): DisplayRecord[] {
    const displays = current ?? [];
    const index = displays.findIndex((display) => display.id === record.id);

    if (index === -1) {
        return [...displays, record];
    }

    const next = displays.slice();
    next[index] = record;

    return next;
}

function readLoadError(error: unknown): string {
    if (error instanceof Error && error.message.trim() !== "") {
        return error.message;
    }

    return "The displays could not be loaded. Check that the API is running, then try again.";
}

export default useDisplayDirectory;
