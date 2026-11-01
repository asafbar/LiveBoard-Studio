import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../../auth/components/LogoutButton.tsx";
import type { BoardWriteResult } from "../api/BoardApi.ts";
import DisplayActionNotice from "../../display/components/DisplayActionNotice.tsx";
import BoardActionsMenu from "../components/BoardActionsMenu.tsx";
import CreateBoardDialog from "../components/CreateBoardDialog.tsx";
import DuplicateBoardDialog from "../components/DuplicateBoardDialog.tsx";
import RenameBoardDialog from "../components/RenameBoardDialog.tsx";
import useBoardDirectory, { type BoardDirectoryItem } from "../hooks/useBoardDirectory.ts";

type BoardNoticeProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

type BoardRowProps = {
    board: BoardDirectoryItem;
    actionsDisabled: boolean;
    menuOpen: boolean;
    onMenuOpenChange: (open: boolean) => void;
    onDuplicate: () => void;
    onRename: () => void;
};

function BoardsPage() {
    const {
        boards,
        loadError,
        refreshError,
        refreshing,
        refresh,
        retry,
        commitBoard,
    } = useBoardDirectory();
    const [creating, setCreating] = useState(false);
    const [duplicateTarget, setDuplicateTarget] = useState<BoardDirectoryItem | null>(null);
    const [renameTarget, setRenameTarget] = useState<BoardDirectoryItem | null>(null);
    const [menuBoardId, setMenuBoardId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const dialogOpen = creating || duplicateTarget !== null || renameTarget !== null;

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

    let content;

    if (boards === null && loadError === null) {
        content = (
            <BoardNotice
                title="Loading boards"
                message="Boards are being loaded."
            />
        );
    } else if (boards === null) {
        content = (
            <BoardNotice
                title="Boards unavailable"
                message={loadError ?? "The boards could not be loaded. Check that the API is running, then try again."}
                actionLabel="Retry"
                onAction={retry}
            />
        );
    } else {
        content = (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-panel">
                    <p className="text-xs font-medium text-muted">Total boards</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{boards.length}</p>
                </div>
                {refreshError !== null ? (
                    <p
                        role="status"
                        className="rounded-control border border-warning/40 bg-surface px-3 py-2 text-sm text-warning"
                    >
                        {refreshError}
                    </p>
                ) : null}
                {boards.length === 0 ? (
                    <BoardNotice
                        title="No boards yet"
                        message="Boards you create will appear here."
                    />
                ) : (
                    <ul className="flex flex-col gap-3">
                        {boards.map((board) => (
                            <BoardRow
                                key={board.id}
                                board={board}
                                actionsDisabled={dialogOpen}
                                menuOpen={!dialogOpen && menuBoardId === board.id}
                                onMenuOpenChange={(open) => {
                                    setMenuBoardId(open ? board.id : null);
                                }}
                                onDuplicate={() => {
                                    setMenuBoardId(null);
                                    setDuplicateTarget(board);
                                }}
                                onRename={() => {
                                    setMenuBoardId(null);
                                    setRenameTarget(board);
                                }}
                            />
                        ))}
                    </ul>
                )}
            </div>
        );
    }

    function handleCreated(record: BoardWriteResult) {
        setCreating(false);
        commitBoard(record);
        setNotice("Board created.");
    }

    function handleDuplicated(record: BoardWriteResult) {
        setDuplicateTarget(null);
        commitBoard(record);
        setNotice(`Board duplicated as ${record.name}.`);
    }

    function handleRenamed(record: BoardWriteResult) {
        setRenameTarget(null);
        commitBoard(record);
        setNotice("Board renamed.");
    }

    return (
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground antialiased">
            <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
                        Boards
                    </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setCreating(true);
                        }}
                        disabled={boards === null || dialogOpen}
                        className={
                            boards === null || dialogOpen
                                ? "inline-flex h-9 cursor-not-allowed items-center rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                                : "inline-flex h-9 items-center rounded-control bg-accent px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
                        }
                    >
                        New Board
                    </button>
                    <LogoutButton />
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={boards === null || refreshing || dialogOpen}
                        className={
                            boards === null || refreshing || dialogOpen
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
            {creating ? (
                <CreateBoardDialog
                    onClose={() => {
                        setCreating(false);
                    }}
                    onCreated={handleCreated}
                />
            ) : null}
            {duplicateTarget !== null ? (
                <DuplicateBoardDialog
                    key={duplicateTarget.id}
                    board={duplicateTarget}
                    onClose={() => {
                        setDuplicateTarget(null);
                    }}
                    onDuplicated={handleDuplicated}
                />
            ) : null}
            {renameTarget !== null ? (
                <RenameBoardDialog
                    key={renameTarget.id}
                    board={renameTarget}
                    onClose={() => {
                        setRenameTarget(null);
                    }}
                    onRenamed={handleRenamed}
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

function BoardRow({
    board,
    actionsDisabled,
    menuOpen,
    onMenuOpenChange,
    onDuplicate,
    onRename,
}: BoardRowProps) {
    return (
        <li className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="min-w-0 max-w-full text-base font-semibold">
                        {actionsDisabled ? (
                            <span className="block truncate text-foreground" title={board.name}>
                                {board.name}
                            </span>
                        ) : (
                            <Link
                                to={`/studio/${board.id}`}
                                title={board.name}
                                className="block truncate rounded-sm text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent/40"
                            >
                                {board.name}
                            </Link>
                        )}
                    </h2>
                    <p className={`text-xs font-medium ${board.isPublished ? "text-cyan" : "text-warning"}`}>
                        {board.isPublished ? "Published" : "Unpublished"}
                    </p>
                    <p className="text-xs font-medium text-secondary">
                        {formatWidgetCount(board.widgetCount)}
                    </p>
                </div>
                <p className="mt-2 font-mono text-xs break-all text-muted">{board.id}</p>
                <p className="mt-2 text-xs text-secondary">
                    Created {formatTimestamp(board.createdAt)}
                    <span className="text-muted"> · </span>
                    Updated {formatTimestamp(board.updatedAt)}
                </p>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
                {actionsDisabled ? (
                    <button
                        type="button"
                        disabled
                        data-board-edit="true"
                        className="inline-flex h-9 cursor-not-allowed items-center justify-center rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                    >
                        Edit
                    </button>
                ) : (
                    <Link
                        to={`/studio/${board.id}`}
                        data-board-edit="true"
                        className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                        Edit
                    </Link>
                )}
                <BoardActionsMenu
                    boardName={board.name}
                    disabled={actionsDisabled}
                    open={menuOpen}
                    onOpenChange={onMenuOpenChange}
                    onRename={onRename}
                    onDuplicate={onDuplicate}
                />
            </div>
        </li>
    );
}

function BoardNotice({ title, message, actionLabel, onAction }: BoardNoticeProps) {
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

function formatWidgetCount(count: number): string {
    return count === 1 ? "1 widget" : `${count} widgets`;
}

function formatTimestamp(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export default BoardsPage;
