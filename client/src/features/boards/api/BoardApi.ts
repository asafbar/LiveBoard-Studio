import axios, { type AxiosResponse } from "axios";
import apiClient from "../../../api/apiClient.ts";
import type { Board } from "../types/boardTypes.ts";

// Callers pass the database UUID. It stays separate from the id stored in draft.id.

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

type BoardSummary = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    isPublished: boolean;
    widgetCount: number;
};

type BoardWriteResult = BoardSummary & {
    unpublished: boolean;
};

type BoardFieldErrors = {
    name?: string;
};

class BoardRequestError extends Error {
    readonly statusCode: number | null;
    readonly fieldErrors: BoardFieldErrors;

    constructor(message: string, statusCode: number | null, fieldErrors: BoardFieldErrors) {
        super(message);
        this.name = "BoardRequestError";
        this.statusCode = statusCode;
        this.fieldErrors = fieldErrors;
    }
}

type BoardRecord = {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    draft: Board;
    published: Board | null;
};

const boardIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBoardId(value: string | undefined): value is string {
    return typeof value === "string" && boardIdPattern.test(value);
}

async function getBoardById(boardId: string): Promise<BoardRecord> {
    if (apiClient.defaults.baseURL === "") {
        throw new Error("VITE_API_BASE_URL is not configured.");
    }

    const response = await apiClient.get<ApiResponse<BoardRecord>>(
        `/api/boards/${boardId}`,
    );

    if (!response.data.success || !isBoardDraft(response.data.data?.draft)) {
        throw new Error(response.data.message || "The board could not be loaded.");
    }

    return response.data.data;
}

async function listBoardSummaries(): Promise<BoardSummary[]> {
    if (apiClient.defaults.baseURL === "") {
        throw new Error("VITE_API_BASE_URL is not configured.");
    }

    let response: AxiosResponse<ApiResponse<BoardSummary[]>>;

    try {
        response = await apiClient.get<ApiResponse<BoardSummary[]>>("/api/boards");
    } catch (error: unknown) {
        throw new Error(
            readRequestError(error, "The boards could not be loaded. Check that the API is running, then try again."),
            { cause: error },
        );
    }

    if (!response.data.success || !isBoardSummaryList(response.data.data)) {
        throw new Error(response.data.message || "The boards could not be loaded.");
    }

    return response.data.data;
}

async function createBoard(name: string): Promise<BoardWriteResult> {
    if (apiClient.defaults.baseURL === "") {
        throw new BoardRequestError("VITE_API_BASE_URL is not configured.", null, {});
    }

    try {
        const response = await apiClient.post<ApiResponse<unknown>>("/api/boards", {
            name,
        });

        const record = readBoardWriteResult(response.data.data);

        if (!response.data.success || record === null) {
            throw new BoardRequestError(
                response.data.message || "The board could not be created.",
                response.status,
                {},
            );
        }

        return record;
    } catch (error: unknown) {
        throw asBoardRequestError(
            error,
            "The board could not be created. Check that the API is running, then try again.",
        );
    }
}

async function duplicateBoard(boardId: string): Promise<BoardWriteResult> {
    if (!isBoardId(boardId)) {
        throw new BoardRequestError("This board address is not valid.", null, {});
    }

    if (apiClient.defaults.baseURL === "") {
        throw new BoardRequestError("VITE_API_BASE_URL is not configured.", null, {});
    }

    try {
        const response = await apiClient.post<ApiResponse<unknown>>(
            `/api/boards/${boardId}/duplicate`,
        );
        const record = readBoardWriteResult(response.data.data);

        if (!response.data.success || record === null) {
            throw new BoardRequestError(
                response.data.message || "The board could not be duplicated.",
                response.status,
                {},
            );
        }

        return record;
    } catch (error: unknown) {
        throw asBoardRequestError(
            error,
            "The board could not be duplicated. Check that the API is running, then try again.",
        );
    }
}

async function getBoard(boardId: string): Promise<BoardRecord> {
    if (!isBoardId(boardId)) {
        throw new Error("This board address is not valid.");
    }

    try {
        const record = await getBoardById(boardId);

        if (record.published !== null && !isBoardDraft(record.published)) {
            throw new Error("The published board could not be read.");
        }

        return record;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                readRequestError(error, "The board could not be loaded. Check that the API is running, then try again."),
                { cause: error },
            );
        }

        throw error;
    }
}

function boardIdsMatch(left: string, right: string): boolean {
    return left.toLowerCase() === right.toLowerCase();
}

async function saveBoardDraft(boardId: string, draft: Board): Promise<void> {
    if (!isBoardId(boardId)) {
        throw new Error("This board address is not valid.");
    }

    if (apiClient.defaults.baseURL === "") {
        throw new Error("VITE_API_BASE_URL is not configured.");
    }

    let response: AxiosResponse<ApiResponse<BoardRecord>>;

    try {
        response = await apiClient.put<ApiResponse<BoardRecord>>(
            `/api/boards/${boardId}/draft`,
            draft,
        );
    } catch (error: unknown) {
        throw new Error(
            readRequestError(error, "The draft could not be saved. Check that the API is running, then try again."),
            { cause: error },
        );
    }

    const savedId = response.data.data?.id;

    if (!response.data.success || typeof savedId !== "string" || !boardIdsMatch(savedId, boardId)) {
        throw new Error(response.data.message || "The draft could not be saved.");
    }
}

async function publishBoard(boardId: string): Promise<BoardRecord> {
    if (!isBoardId(boardId)) {
        throw new Error("This board address is not valid.");
    }

    if (apiClient.defaults.baseURL === "") {
        throw new Error("VITE_API_BASE_URL is not configured.");
    }

    let response: AxiosResponse<ApiResponse<BoardRecord>>;

    try {
        response = await apiClient.post<ApiResponse<BoardRecord>>(
            `/api/boards/${boardId}/publish`,
        );
    } catch (error: unknown) {
        throw new Error(
            readRequestError(error, "The board could not be published. Check that the API is running, then try again."),
            { cause: error },
        );
    }

    const record = response.data.data;
    const published = record?.published;

    if (
        !response.data.success
        || record == null
        || typeof record.id !== "string"
        || !boardIdsMatch(record.id, boardId)
        || !isBoardDraft(published)
    ) {
        throw new Error(response.data.message || "The board could not be published.");
    }

    return record;
}

function readRequestError(error: unknown, fallback: string): string {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error && error.message.trim() !== ""
            ? error.message
            : fallback;
    }

    if (error.response === undefined) {
        return fallback;
    }

    const data: unknown = error.response.data;

    if (typeof data === "object" && data !== null && "message" in data) {
        const message = data.message;

        if (typeof message === "string" && message.trim() !== "") {
            return message;
        }
    }

    return fallback;
}

function asBoardRequestError(error: unknown, fallback: string): BoardRequestError {
    if (error instanceof BoardRequestError) {
        return error;
    }

    if (!axios.isAxiosError(error)) {
        if (error instanceof Error && error.message.trim() !== "") {
            return new BoardRequestError(error.message, null, {});
        }

        return new BoardRequestError(fallback, null, {});
    }

    return new BoardRequestError(
        readRequestError(error, fallback),
        error.response?.status ?? null,
        readBoardFieldErrors(error.response?.data),
    );
}

function readBoardFieldErrors(value: unknown): BoardFieldErrors {
    if (typeof value !== "object" || value === null || !("errors" in value)) {
        return {};
    }

    const errors = value.errors;

    if (!Array.isArray(errors)) {
        return {};
    }

    const fieldErrors: BoardFieldErrors = {};

    for (const item of errors) {
        if (typeof item !== "object" || item === null) {
            continue;
        }

        const pathValue: unknown = "path" in item ? item.path : "";
        const messageValue: unknown = "message" in item ? item.message : "";
        const path = typeof pathValue === "string" ? pathValue : "";
        const message = typeof messageValue === "string" ? messageValue.trim() : "";

        if (path === "name" && message !== "") {
            fieldErrors.name = message;
        }
    }

    return fieldErrors;
}

function readBoardWriteResult(value: unknown): BoardWriteResult | null {
    if (!isBoardIdentity(value) || !("published" in value) || !("draft" in value)) {
        return null;
    }

    const published: unknown = value.published;
    const draft: unknown = value.draft;

    if (published !== null && (typeof published !== "object" || Array.isArray(published))) {
        return null;
    }

    if (!isBoardDraft(draft)) {
        return null;
    }

    return {
        id: value.id,
        name: value.name,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        isPublished: published !== null,
        widgetCount: draft.widgets.length,
        unpublished: published === null,
    };
}

function isBoardIdentity(value: unknown): value is {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
} {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const board = value as BoardSummary;

    return typeof board.id === "string"
        && typeof board.name === "string"
        && typeof board.createdAt === "string"
        && typeof board.updatedAt === "string";
}

function isWidgetCount(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isBoardSummary(value: unknown): value is BoardSummary {
    if (!isBoardIdentity(value)) {
        return false;
    }

    const board = value as BoardSummary;

    return typeof board.isPublished === "boolean"
        && isWidgetCount(board.widgetCount);
}

function isBoardSummaryList(value: unknown): value is BoardSummary[] {
    return Array.isArray(value) && value.every(isBoardSummary);
}

function isBoardDraft(value: unknown): value is Board {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const draft = value as Board;

    return typeof draft.id === "string"
        && typeof draft.name === "string"
        && typeof draft.width === "number"
        && typeof draft.height === "number"
        && typeof draft.background === "object"
        && draft.background !== null
        && Array.isArray(draft.widgets);
}

export {
    BoardRequestError,
    createBoard,
    duplicateBoard,
    getBoard,
    isBoardId,
    listBoardSummaries,
    publishBoard,
    saveBoardDraft,
};

export type {
    BoardSummary,
    BoardWriteResult,
};
