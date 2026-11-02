import axios from "axios";
import apiClient, { readApiBaseUrlProblem } from "../../../api/apiClient.ts";

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

type PublicDisplayRecord = {
    id: string;
    name: string;
    boardId: string | null;
};

type CreateDisplayPayload = {
    name: string;
    boardId: string | null;
};

type UpdateDisplayPayload = {
    name?: string;
    boardId?: string | null;
};

type DisplayFieldErrors = {
    name?: string;
    boardId?: string;
};

class DisplayRequestError extends Error {
    readonly fieldErrors: DisplayFieldErrors;

    constructor(message: string, fieldErrors: DisplayFieldErrors) {
        super(message);
        this.name = "DisplayRequestError";
        this.fieldErrors = fieldErrors;
    }
}

const displayIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDisplayId(value: string | undefined): value is string {
    return typeof value === "string" && displayIdPattern.test(value);
}

async function listDisplays(): Promise<DisplayRecord[]> {
    const apiBaseUrlProblem = readApiBaseUrlProblem();

    if (apiBaseUrlProblem !== null) {
        throw new Error(apiBaseUrlProblem);
    }

    try {
        const response = await apiClient.get<ApiResponse<DisplayRecord[]>>("/api/displays");

        if (!response.data.success || !isDisplayList(response.data.data)) {
            throw new Error(response.data.message || "The displays could not be loaded.");
        }

        return response.data.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                readRequestError(error, "The displays could not be loaded. Check that the API is running, then try again."),
                { cause: error },
            );
        }

        throw error;
    }
}

async function createDisplay(payload: CreateDisplayPayload): Promise<DisplayRecord> {
    const apiBaseUrlProblem = readApiBaseUrlProblem();

    if (apiBaseUrlProblem !== null) {
        throw new DisplayRequestError(apiBaseUrlProblem, {});
    }

    try {
        const response = await apiClient.post<ApiResponse<DisplayRecord>>("/api/displays", {
            name: payload.name,
            boardId: payload.boardId,
        });

        if (!response.data.success || !isDisplayRecord(response.data.data)) {
            throw new DisplayRequestError(
                response.data.message || "The screen could not be added.",
                {},
            );
        }

        return response.data.data;
    } catch (error: unknown) {
        throw asDisplayRequestError(
            error,
            "The screen could not be added. Check that the API is running, then try again.",
        );
    }
}

async function updateDisplay(
    displayId: string,
    payload: UpdateDisplayPayload,
): Promise<DisplayRecord> {
    if (!isDisplayId(displayId)) {
        throw new DisplayRequestError("This display address is not valid.", {});
    }

    if (!hasDisplayUpdate(payload)) {
        throw new DisplayRequestError(
            "Request must include a display name or board assignment.",
            {},
        );
    }

    const apiBaseUrlProblem = readApiBaseUrlProblem();

    if (apiBaseUrlProblem !== null) {
        throw new DisplayRequestError(apiBaseUrlProblem, {});
    }

    const body: UpdateDisplayPayload = {};

    if (payload.name !== undefined) {
        body.name = payload.name;
    }

    if (payload.boardId !== undefined) {
        body.boardId = payload.boardId;
    }

    try {
        const response = await apiClient.patch<ApiResponse<DisplayRecord>>(
            `/api/displays/${displayId}`,
            body,
        );

        if (!response.data.success || !isDisplayRecord(response.data.data)) {
            throw new DisplayRequestError(
                response.data.message || "The screen could not be updated.",
                {},
            );
        }

        return response.data.data;
    } catch (error: unknown) {
        throw asDisplayRequestError(
            error,
            "The screen could not be updated. Check that the API is running, then try again.",
        );
    }
}

async function getDisplay(displayId: string): Promise<PublicDisplayRecord> {
    if (!isDisplayId(displayId)) {
        throw new Error("This display address is not valid.");
    }

    const apiBaseUrlProblem = readApiBaseUrlProblem();

    if (apiBaseUrlProblem !== null) {
        throw new Error(apiBaseUrlProblem);
    }

    try {
        const response = await apiClient.get<ApiResponse<PublicDisplayRecord>>(
            `/api/displays/${displayId}`,
        );

        if (!response.data.success || !isPublicDisplayRecord(response.data.data)) {
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

function asDisplayRequestError(error: unknown, fallback: string): DisplayRequestError {
    if (error instanceof DisplayRequestError) {
        return error;
    }

    if (!axios.isAxiosError(error)) {
        if (error instanceof Error && error.message.trim() !== "") {
            return new DisplayRequestError(error.message, {});
        }

        return new DisplayRequestError(fallback, {});
    }

    return new DisplayRequestError(
        readRequestError(error, fallback),
        readFieldErrors(error.response?.data),
    );
}

function hasDisplayUpdate(payload: UpdateDisplayPayload): boolean {
    return payload.name !== undefined || payload.boardId !== undefined;
}

function readFieldErrors(value: unknown): DisplayFieldErrors {
    if (typeof value !== "object" || value === null || !("errors" in value)) {
        return {};
    }

    const errors = value.errors;

    if (!Array.isArray(errors)) {
        return {};
    }

    const fieldErrors: DisplayFieldErrors = {};

    for (const item of errors) {
        if (typeof item !== "object" || item === null) {
            continue;
        }

        const pathValue: unknown = "path" in item ? item.path : "";
        const messageValue: unknown = "message" in item ? item.message : "";
        const path = typeof pathValue === "string" ? pathValue : "";
        const message = typeof messageValue === "string" ? messageValue.trim() : "";

        if (message === "") {
            continue;
        }

        if (path === "name") {
            fieldErrors.name = message;
        } else if (path === "boardId") {
            fieldErrors.boardId = message;
        }
    }

    return fieldErrors;
}

function isDisplayList(value: unknown): value is DisplayRecord[] {
    return Array.isArray(value) && value.every(isDisplayRecord);
}

function isPublicDisplayRecord(value: unknown): value is PublicDisplayRecord {
    if (value === null || typeof value !== "object") {
        return false;
    }

    const display = value as PublicDisplayRecord;

    return typeof display.id === "string"
        && typeof display.name === "string"
        && (display.boardId === null || typeof display.boardId === "string");
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
    createDisplay,
    DisplayRequestError,
    getDisplay,
    isDisplayId,
    listDisplays,
    updateDisplay,
};

export type {
    CreateDisplayPayload,
    DisplayFieldErrors,
    DisplayRecord,
    PublicDisplayRecord,
    UpdateDisplayPayload,
};
