import axios from "axios";
import apiClient, { readApiBaseUrlProblem } from "../../../api/apiClient.ts";

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

type AdminSession = {
    username: string;
};

class AuthRequestError extends Error {
    readonly statusCode: number | null;

    constructor(message: string, statusCode: number | null) {
        super(message);
        this.name = "AuthRequestError";
        this.statusCode = statusCode;
    }
}

async function login(username: string, password: string): Promise<AdminSession> {
    return sendAuthRequest("/api/auth/login", "The sign-in service could not be reached. Check that the API is running, then try again.", {
        username,
        password,
    });
}

async function logout(): Promise<void> {
    await sendAuthRequest("/api/auth/logout", "The session could not be ended. Check that the API is running, then try again.", {});
}

async function getSession(): Promise<AdminSession> {
    const apiBaseUrlProblem = readApiBaseUrlProblem();

    if (apiBaseUrlProblem !== null) {
        throw new AuthRequestError(apiBaseUrlProblem, null);
    }

    try {
        const response = await apiClient.get<ApiResponse<unknown>>("/api/auth/session");
        const session = readSession(response.data.data);

        if (!response.data.success || session === null) {
            throw new AuthRequestError(
                response.data.message || "The session could not be confirmed.",
                response.status,
            );
        }

        return session;
    } catch (error: unknown) {
        throw asAuthRequestError(error, "The session could not be confirmed. Check that the API is running, then try again.");
    }
}

async function sendAuthRequest(path: string, fallback: string, body: { username: string; password: string } | Record<string, never>): Promise<AdminSession> {
    const apiBaseUrlProblem = readApiBaseUrlProblem();

    if (apiBaseUrlProblem !== null) {
        throw new AuthRequestError(apiBaseUrlProblem, null);
    }

    try {
        const response = await apiClient.post<ApiResponse<unknown>>(path, body);
        const session = readSession(response.data.data) ?? { username: "" };

        if (!response.data.success || (path.endsWith("/login") && session.username === "")) {
            throw new AuthRequestError(
                response.data.message || fallback,
                response.status,
            );
        }

        return session;
    } catch (error: unknown) {
        throw asAuthRequestError(error, fallback);
    }
}

function readSession(value: unknown): AdminSession | null {
    if (typeof value !== "object" || value === null || !("username" in value)) {
        return null;
    }

    const username = value.username;

    if (typeof username !== "string" || username.trim() === "") {
        return null;
    }

    return { username };
}

function asAuthRequestError(error: unknown, fallback: string): AuthRequestError {
    if (error instanceof AuthRequestError) {
        return error;
    }

    if (!axios.isAxiosError(error)) {
        if (error instanceof Error && error.message.trim() !== "") {
            return new AuthRequestError(error.message, null);
        }

        return new AuthRequestError(fallback, null);
    }

    const data: unknown = error.response?.data;
    let message = fallback;

    if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string" && data.message.trim() !== "") {
        message = data.message;
    }

    return new AuthRequestError(message, error.response?.status ?? null);
}

export { AuthRequestError, getSession, login, logout };
export type { AdminSession };
