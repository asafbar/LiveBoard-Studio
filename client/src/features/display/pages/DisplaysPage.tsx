import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../../auth/components/LogoutButton.tsx";
import type { BoardSummary } from "../../boards/api/BoardApi.ts";
import type { DisplayRecord } from "../api/displayApi.ts";
import DisplayActionNotice from "../components/DisplayActionNotice.tsx";
import DisplayEditorDialog from "../components/DisplayEditorDialog.tsx";
import useDisplayDirectory from "../hooks/useDisplayDirectory.ts";

type DisplayEditorState = {
    mode: "create" | "edit";
    display: DisplayRecord | null;
};

type DisplayNoticeProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

type DisplaySummaryProps = {
    label: string;
    value: number;
    valueClassName: string;
};

type DisplayRowProps = {
    display: DisplayRecord;
    boardName: string;
    onManage: () => void;
};

function DisplaysPage() {
    const {
        displays,
        boards,
        loadError,
        refreshError,
        refreshing,
        refresh,
        retry,
        commitDisplay,
    } = useDisplayDirectory();
    const [editor, setEditor] = useState<DisplayEditorState | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (notice === null) {
            return;
        }

        const timer = window.setTimeout(() => {
            setNotice(null);
        }, 4000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [notice]);

    const boardNames = buildBoardNames(boards);
    const rows = displays === null
        ? []
        : displays.map((display) => ({
            display,
            boardName: readBoardName(display.boardId, boardNames),
        }));
    const onlineCount = rows.filter((row) => row.display.online).length;

    let content;

    if (displays === null && loadError === null) {
        content = (
            <DisplayNotice
                title="Loading displays"
                message="Registered screens are being loaded."
            />
        );
    } else if (displays === null) {
        content = (
            <DisplayNotice
                title="Displays unavailable"
                message={loadError ?? "The displays could not be loaded. Check that the API is running, then try again."}
                actionLabel="Retry"
                onAction={retry}
            />
        );
    } else {
        content = (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <DisplaySummary label="Total screens" value={rows.length} valueClassName="text-foreground" />
                    <DisplaySummary label="Online" value={onlineCount} valueClassName="text-cyan" />
                    <DisplaySummary label="Offline" value={rows.length - onlineCount} valueClassName="text-muted" />
                </div>
                {refreshError !== null ? (
                    <p
                        role="status"
                        className="rounded-control border border-warning/40 bg-surface px-3 py-2 text-sm text-warning"
                    >
                        {refreshError}
                    </p>
                ) : null}
                {rows.length === 0 ? (
                    <DisplayNotice
                        title="No screens yet"
                        message="Registered displays will appear here after they are added."
                    />
                ) : (
                    <ul className="flex flex-col gap-3">
                        {rows.map((row) => (
                            <DisplayRow
                                key={row.display.id}
                                display={row.display}
                                boardName={row.boardName}
                                onManage={() => {
                                    setEditor({
                                        mode: "edit",
                                        display: row.display,
                                    });
                                }}
                            />
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <Link
                        to="/boards"
                        className="inline-flex h-9 shrink-0 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                    >
                        Back to Boards
                    </Link>
                    <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
                        Displays
                    </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setEditor({
                                mode: "create",
                                display: null,
                            });
                        }}
                        disabled={displays === null || boards === null}
                        className={
                            displays === null || boards === null
                                ? "inline-flex h-9 cursor-not-allowed items-center rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                                : "inline-flex h-9 items-center rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                        }
                    >
                        Add Screen
                    </button>
                    <LogoutButton />
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={displays === null || refreshing}
                        className={
                            displays === null || refreshing
                                ? "inline-flex h-9 cursor-not-allowed items-center rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                                : "inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                        }
                    >
                        {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </header>
            <main className="min-h-0 flex-1 overflow-auto p-6">
                {content}
            </main>
            {editor !== null && boards !== null ? (
                <DisplayEditorDialog
                    key={editor.display?.id ?? "create"}
                    mode={editor.mode}
                    display={editor.display}
                    boards={boards}
                    onClose={() => {
                        setEditor(null);
                    }}
                    onSaved={(record) => {
                        const message = editor.mode === "create"
                            ? "Screen added."
                            : "Screen updated.";
                        setEditor(null);
                        commitDisplay(record);
                        setNotice(message);
                    }}
                />
            ) : null}
            {notice !== null ? (
                <DisplayActionNotice
                    message={notice}
                    onDismiss={() => {
                        setNotice(null);
                    }}
                />
            ) : null}
        </div>
    );
}

function DisplaySummary({ label, value, valueClassName }: DisplaySummaryProps) {
    return (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-panel">
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClassName}`}>{value}</p>
        </div>
    );
}

function DisplayRow({ display, boardName, onManage }: DisplayRowProps) {
    return (
        <li className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">{display.name}</h2>
                    <p className={`inline-flex items-center gap-2 text-xs font-medium ${display.online ? "text-cyan" : "text-muted"}`}>
                        <span
                            className={`size-1.5 rounded-full ${display.online ? "bg-cyan" : "bg-muted"}`}
                            aria-hidden="true"
                        />
                        {display.online ? "Online" : "Offline"}
                    </p>
                </div>
                <p className="mt-2 text-sm text-secondary">{boardName}</p>
                <p className="mt-1 font-mono text-xs break-all text-muted">{display.id}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                <button
                    type="button"
                    onClick={onManage}
                    className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
                >
                    Manage
                </button>
                <a
                    href={`/screens/${display.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center rounded-control border border-cyan/40 px-3 text-sm font-medium text-cyan transition-colors duration-150 hover:bg-cyan/10"
                >
                    Open Screen
                    <span className="sr-only"> (opens in a new tab)</span>
                </a>
            </div>
        </li>
    );
}

function DisplayNotice({ title, message, actionLabel, onAction }: DisplayNoticeProps) {
    return (
        <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5 text-center shadow-panel">
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

function buildBoardNames(boards: BoardSummary[] | null): Map<string, string> {
    const names = new Map<string, string>();

    if (boards === null) {
        return names;
    }

    for (const board of boards) {
        names.set(board.id.toLowerCase(), board.name);
    }

    return names;
}

function readBoardName(boardId: string | null, boardNames: Map<string, string>): string {
    if (boardId === null) {
        return "No board assigned";
    }

    return boardNames.get(boardId.toLowerCase()) ?? "Assigned board unavailable";
}

export default DisplaysPage;
