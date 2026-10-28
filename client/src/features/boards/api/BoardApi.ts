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

function reloadDevelopmentBoard(): Promise<BoardRecord> {
    cachedDevelopmentBoard = null;
    developmentBoardRequest = null;
    return getDevelopmentBoard();
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
    getDevelopmentBoard,
    reloadDevelopmentBoard,
};
