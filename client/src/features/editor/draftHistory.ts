import type { Board } from "../boards/types/boardTypes.ts";

const maximumUndoEntries = 50;

type DraftHistory = {
    past: Board[];
    future: Board[];
};

type HistoryStep = {
    history: DraftHistory;
    present: Board;
};

function createDraftHistory(): DraftHistory {
    return {
        past: [],
        future: [],
    };
}

function recordDraftChange(history: DraftHistory, previous: Board): DraftHistory {
    return {
        past: trimHistory(history.past, previous),
        future: [],
    };
}

function undoDraft(history: DraftHistory, present: Board): HistoryStep | null {
    const previous = history.past[history.past.length - 1];

    if (previous === undefined) {
        return null;
    }

    return {
        history: {
            past: history.past.slice(0, -1),
            future: [present, ...history.future],
        },
        present: previous,
    };
}

function redoDraft(history: DraftHistory, present: Board): HistoryStep | null {
    const next = history.future[0];

    if (next === undefined) {
        return null;
    }

    return {
        history: {
            past: trimHistory(history.past, present),
            future: history.future.slice(1),
        },
        present: next,
    };
}

function trimHistory(past: Board[], snapshot: Board): Board[] {
    const next = [...past, snapshot];

    if (next.length <= maximumUndoEntries) {
        return next;
    }

    return next.slice(next.length - maximumUndoEntries);
}

function boardsEqual(left: Board, right: Board): boolean {
    return stableValue(left) === stableValue(right);
}

function stableValue(value: unknown): string {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableValue(item)).join(",")}]`;
    }

    if (typeof value === "object" && value !== null) {
        const record = value as Record<string, unknown>;
        const entries = Object.keys(record)
            .filter((key) => record[key] !== undefined)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`);

        return `{${entries.join(",")}}`;
    }

    return JSON.stringify(value) ?? "null";
}

export {
    boardsEqual,
    createDraftHistory,
    maximumUndoEntries,
    recordDraftChange,
    redoDraft,
    undoDraft,
};
export type { DraftHistory, HistoryStep };
