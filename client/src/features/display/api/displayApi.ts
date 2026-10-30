import axios from "axios";
import apiClient from "../../../api/apiClient.ts";

// A display id identifies a screen for local development.
// It does not authenticate the device. Registration stays untrusted
// until device authentication exists.

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

type DisplayRecord = {
    id: string;
    name: string;
    boardId: string | null;
    online: boolean;
    createdAt: string;
    updatedAt: string;
};

const displayIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDisplayId(value: string | undefined): value is string {
    return typeof value === "string" && displayIdPattern.test(value);
}

async function getDisplay(displayId: string): Promise<DisplayRecord> {
    if (!isDisplayId(displayId)) {
        throw new Error("This display address is not valid.");
    }

    if (apiClient.defaults.baseURL === "") {
        throw new Error("VITE_API_BASE_URL is not configured.");
    }

    try {
        const response = await apiClient.get<ApiResponse<DisplayRecord>>(
            `/api/displays/${displayId}`,
        );

        if (!response.data.success || !isDisplayRecord(response.data.data)) {
            throw new Error(response.data.message || "The display could not be loaded.");
        }

        return response.data.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                readRequestError(error, "The display could not be loaded. Check that the API is running, then try again."),
                { cause: error },
            );
        }

        throw error;
    }
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

function isDisplayRecord(value: unknown): value is DisplayRecord {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const display = value as DisplayRecord;

    return typeof display.id === "string"
        && typeof display.name === "string"
        && (display.boardId === null || typeof display.boardId === "string")
        && typeof display.online === "boolean"
        && typeof display.createdAt === "string"
        && typeof display.updatedAt === "string";
}

export {
    getDisplay,
    isDisplayId,
};

export type {
    DisplayRecord,
};
