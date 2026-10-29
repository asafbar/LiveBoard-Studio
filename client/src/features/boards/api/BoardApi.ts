import axios, { type AxiosResponse } from "axios";
import apiClient from "../../../api/apiClient.ts";
import type { Board } from "../types/boardTypes.ts";

// Temporary local development board. This database UUID is the API id.
// It is separate from the renderer id stored inside draft.id.
const developmentBoardId = "7c2a9e14-5b31-4f0a-9d6e-2f8b1c4a0e77";

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

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

let cachedDevelopmentBoard: BoardRecord | null = null;
let developmentBoardRequest: Promise<BoardRecord> | null = null;

function getDevelopmentBoard(): Promise<BoardRecord> {
    if (cachedDevelopmentBoard) {
        return Promise.resolve(cachedDevelopmentBoard);
    }

    if (developmentBoardRequest) {
        return developmentBoardRequest;
    }

    const request = getBoardById(developmentBoardId)
        .then((record) => {
            if (developmentBoardRequest === request) {
                cachedDevelopmentBoard = record;
            }

            return record;
        })
        .finally(() => {
            if (developmentBoardRequest === request) {
                developmentBoardRequest = null;
            }
        });

    developmentBoardRequest = request;
    return request;
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

function reloadDevelopmentBoard(): Promise<BoardRecord> {
    cachedDevelopmentBoard = null;
    developmentBoardRequest = null;
    return getDevelopmentBoard();
}

async function saveBoardDraft(draft: Board): Promise<void> {
    if (apiClient.defaults.baseURL === "") {
        throw new Error("VITE_API_BASE_URL is not configured.");
    }

    let response: AxiosResponse<ApiResponse<BoardRecord>>;

    try {
        response = await apiClient.put<ApiResponse<BoardRecord>>(
            `/api/boards/${developmentBoardId}/draft`,
            draft,
        );
    } catch (error: unknown) {
        throw new Error(
            readRequestError(error, "The draft could not be saved. Check that the API is running, then try again."),
            { cause: error },
        );
    }

    if (!response.data.success) {
        throw new Error(response.data.message || "The draft could not be saved.");
    }

    // Remember the snapshot that was stored. Studio keeps its own editable copy.
    if (cachedDevelopmentBoard !== null && developmentBoardRequest === null) {
        cachedDevelopmentBoard = {
            ...cachedDevelopmentBoard,
            draft,
        };
    }
}

async function publishBoard(): Promise<BoardRecord> {
    if (apiClient.defaults.baseURL === "") {
        throw new Error("VITE_API_BASE_URL is not configured.");
    }

    let response: AxiosResponse<ApiResponse<BoardRecord>>;

    try {
        response = await apiClient.post<ApiResponse<BoardRecord>>(
            `/api/boards/${developmentBoardId}/publish`,
        );
    } catch (error: unknown) {
        throw new Error(
            readRequestError(error, "The board could not be published. Check that the API is running, then try again."),
            { cause: error },
        );
    }

    const record = response.data.data;
    const published = record?.published;

    if (!response.data.success || record == null || typeof record.id !== "string" || !isBoardDraft(published)) {
        throw new Error(response.data.message || "The board could not be published.");
    }

    // Remember the published snapshot only. Studio keeps its editable draft.
    if (cachedDevelopmentBoard !== null && developmentBoardRequest === null) {
        cachedDevelopmentBoard = {
            ...cachedDevelopmentBoard,
            published,
            updatedAt: record.updatedAt,
        };
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
    getBoard,
    getDevelopmentBoard,
    isBoardId,
    publishBoard,
    reloadDevelopmentBoard,
    saveBoardDraft,
};
