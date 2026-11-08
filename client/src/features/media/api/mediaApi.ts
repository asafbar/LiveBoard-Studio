import axios from "axios";
import apiClient, { readApiBaseUrlProblem } from "../../../api/apiClient.ts";

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

type MediaAsset = {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    fileUrl: string;
};

type MediaUsageBoard = {
    id: string;
    name: string;
    inDraft: boolean;
    inPublished: boolean;
};

type MediaUsage = {
    assetId: string;
    referenced: boolean;
    boards: MediaUsageBoard[];
};

class MediaRequestError extends Error {
    readonly statusCode: number | null;
    readonly usage: MediaUsage | null;

    constructor(message: string, statusCode: number | null, usage: MediaUsage | null = null) {
        super(message);
        this.name = "MediaRequestError";
        this.statusCode = statusCode;
        this.usage = usage;
    }
}

const mediaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mediaFilePathPattern = /^\/api\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/file$/i;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function listMediaAssets(): Promise<MediaAsset[]> {
    assertApiConfigured();

    try {
        const response = await apiClient.get<ApiResponse<unknown>>("/api/media");
        const assets = readMediaAssetList(response.data.data);

        if (!response.data.success || assets === null) {
            throw new MediaRequestError(
                response.data.message || "The media library could not be loaded.",
                response.status,
            );
        }

        return assets;
    } catch (error: unknown) {
        throw asMediaRequestError(
            error,
            "The media library could not be loaded. Check that the API is running, then try again.",
        );
    }
}

async function renameMediaAsset(id: string, originalFilename: string): Promise<MediaAsset> {
    assertApiConfigured();

    try {
        const response = await apiClient.patch<ApiResponse<unknown>>(`/api/media/${id}`, {
            originalFilename,
        });
        const asset = readMediaAsset(response.data.data);

        if (!response.data.success || asset === null) {
            throw new MediaRequestError(
                response.data.message || "The image could not be renamed.",
                response.status,
            );
        }

        return asset;
    } catch (error: unknown) {
        throw asMediaRequestError(
            error,
            "The image could not be renamed. Check that the API is running, then try again.",
        );
    }
}

async function getMediaUsage(id: string): Promise<MediaUsage> {
    assertApiConfigured();

    try {
        const response = await apiClient.get<ApiResponse<unknown>>(`/api/media/${id}/usage`);
        const usage = readMediaUsage(response.data.data);

        if (!response.data.success || usage === null) {
            throw new MediaRequestError(
                response.data.message || "Image usage could not be loaded.",
                response.status,
            );
        }

        return usage;
    } catch (error: unknown) {
        throw asMediaRequestError(
            error,
            "Image usage could not be loaded. Check that the API is running, then try again.",
        );
    }
}

async function deleteMediaAsset(id: string): Promise<void> {
    assertApiConfigured();

    try {
        const response = await apiClient.delete<ApiResponse<null>>(`/api/media/${id}`);

        if (!response.data.success) {
            throw new MediaRequestError(
                response.data.message || "The image could not be deleted.",
                response.status,
            );
        }
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
            const usage = readMediaUsage(readResponseData(error.response.data));
            const message = readResponseMessage(
                error.response.data,
                "This image is used by a board and cannot be deleted.",
            );

            if (usage !== null) {
                throw new MediaRequestError(message, 409, usage);
            }
        }

        throw asMediaRequestError(
            error,
            "The image could not be deleted. Check that the API is running, then try again.",
        );
    }
}

async function uploadMediaAsset(
    file: File,
    onProgress: (percent: number) => void,
): Promise<MediaAsset> {
    assertApiConfigured();

    const body = new FormData();
    body.append("file", file);

    try {
        const response = await apiClient.post<ApiResponse<unknown>>("/api/media", body, {
            // The shared client defaults to JSON. Clearing that header keeps
            // the FormData body intact so the browser can set the multipart boundary.
            headers: {
                "Content-Type": false,
            },
            onUploadProgress(event) {
                if (typeof event.total === "number" && event.total > 0) {
                    onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
                }
            },
        });
        const asset = readMediaAsset(response.data.data);

        if (!response.data.success || asset === null) {
            throw new MediaRequestError(
                response.data.message || "The image could not be uploaded.",
                response.status,
            );
        }

        return asset;
    } catch (error: unknown) {
        throw asMediaRequestError(
            error,
            "The image could not be uploaded. Check that the API is running, then try again.",
        );
    }
}

function toPublicMediaFileUrl(fileUrl: string): string {
    if (readApiBaseUrlProblem() !== null) {
        return fileUrl;
    }

    const configured = apiClient.defaults.baseURL;
    const base = typeof configured === "string" ? configured.replace(/\/$/, "") : "";
    const origin = base === "" ? window.location.origin : base;

    return new URL(fileUrl, `${origin}/`).toString();
}

function resolveBoardImageSource(source: string): string {
    if (!mediaFilePathPattern.test(source)) {
        return source;
    }

    return toPublicMediaFileUrl(source);
}

function mediaAssetIdFromSource(source: string): string | null {
    const trimmed = source.trim();
    const match = /\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/file$/i.exec(trimmed);

    if (match === null || match[1] === undefined) {
        return null;
    }

    const assetId = match[1].toLowerCase();
    const assetPath = `/api/media/${assetId}/file`;

    if (trimmed.toLowerCase() !== assetPath && !trimmed.toLowerCase().endsWith(assetPath)) {
        return null;
    }

    return assetId;
}

function describeMediaError(error: MediaRequestError, action: "load" | "upload"): string {
    if (error.statusCode === null) {
        return action === "load"
            ? "The media library could not be loaded. Check that the API is running, then try again."
            : "The image could not be uploaded. Check that the API is running, then try again.";
    }

    if (error.statusCode === 401) {
        return "Your session has expired. Sign in again to continue.";
    }

    if (error.message.trim() !== "") {
        return error.message;
    }

    if (error.statusCode === 400) {
        return "The image could not be uploaded. Check that it is a valid JPEG, PNG, or WebP image.";
    }

    if (error.statusCode === 403) {
        return "The upload was not allowed. Refresh the page and try again.";
    }

    if (error.statusCode === 413) {
        return "The image must be 10 MB or smaller.";
    }

    if (error.statusCode === 415) {
        return "Upload a JPEG, PNG, or WebP image.";
    }

    if (error.statusCode === 429) {
        return "Too many uploads are in progress. Wait a moment and try again.";
    }

    return action === "load"
        ? "The media library could not be loaded."
        : "The image could not be uploaded.";
}

function clientFileProblem(file: File): string | null {
    const extension = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
        : "";
    const extensionAllowed = extension === "jpg"
        || extension === "jpeg"
        || extension === "png"
        || extension === "webp";
    const typeAllowed = file.type === ""
        || file.type === "image/jpeg"
        || file.type === "image/png"
        || file.type === "image/webp";

    if (!extensionAllowed || !typeAllowed) {
        return "Choose a JPEG, PNG, or WebP image.";
    }

    if (file.size < 1) {
        return "The image file is empty.";
    }

    if (file.size > MAX_UPLOAD_BYTES) {
        return "The image must be 10 MB or smaller.";
    }

    return null;
}

function assertApiConfigured(): void {
    const apiBaseUrlProblem = readApiBaseUrlProblem();

    if (apiBaseUrlProblem !== null) {
        throw new MediaRequestError(apiBaseUrlProblem, null);
    }
}

function readMediaAssetList(value: unknown): MediaAsset[] | null {
    if (!Array.isArray(value)) {
        return null;
    }

    const assets: MediaAsset[] = [];

    for (const item of value) {
        const asset = readMediaAsset(item);

        if (asset === null) {
            return null;
        }

        assets.push(asset);
    }

    return assets;
}

function readMediaUsage(value: unknown): MediaUsage | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    if (!("assetId" in value) || typeof value.assetId !== "string" || !mediaIdPattern.test(value.assetId)) {
        return null;
    }

    if (!("referenced" in value) || typeof value.referenced !== "boolean") {
        return null;
    }

    if (!("boards" in value) || !Array.isArray(value.boards)) {
        return null;
    }

    const boards: MediaUsageBoard[] = [];

    for (const item of value.boards) {
        const board = readUsageBoard(item);

        if (board === null) {
            return null;
        }

        boards.push(board);
    }

    if (value.referenced !== (boards.length > 0)) {
        return null;
    }

    return {
        assetId: value.assetId.toLowerCase(),
        referenced: value.referenced,
        boards,
    };
}

function readUsageBoard(value: unknown): MediaUsageBoard | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    if (!("id" in value) || typeof value.id !== "string" || !mediaIdPattern.test(value.id)) {
        return null;
    }

    if (!("name" in value) || typeof value.name !== "string" || value.name.trim() === "") {
        return null;
    }

    if (!("inDraft" in value) || typeof value.inDraft !== "boolean") {
        return null;
    }

    if (!("inPublished" in value) || typeof value.inPublished !== "boolean") {
        return null;
    }

    if (!value.inDraft && !value.inPublished) {
        return null;
    }

    return {
        id: value.id.toLowerCase(),
        name: value.name,
        inDraft: value.inDraft,
        inPublished: value.inPublished,
    };
}

function readMediaAsset(value: unknown): MediaAsset | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    if (!("id" in value)
        || !("originalFilename" in value)
        || !("mimeType" in value)
        || !("sizeBytes" in value)
        || !("createdAt" in value)
        || !("fileUrl" in value)) {
        return null;
    }

    const { id, originalFilename, mimeType, sizeBytes, createdAt, fileUrl } = value;

    if (typeof id !== "string" || !mediaIdPattern.test(id)) {
        return null;
    }

    if (typeof originalFilename !== "string" || originalFilename.trim() === "") {
        return null;
    }

    if (mimeType !== "image/jpeg" && mimeType !== "image/png" && mimeType !== "image/webp") {
        return null;
    }

    if (typeof sizeBytes !== "number" || !Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
        return null;
    }

    if (typeof createdAt !== "string" || createdAt.trim() === "") {
        return null;
    }

    if (typeof fileUrl !== "string" || !mediaFilePathPattern.test(fileUrl)) {
        return null;
    }

    return {
        id,
        originalFilename,
        mimeType,
        sizeBytes,
        createdAt,
        fileUrl,
    };
}

function asMediaRequestError(error: unknown, fallback: string): MediaRequestError {
    if (error instanceof MediaRequestError) {
        return error;
    }

    if (!axios.isAxiosError(error)) {
        if (error instanceof Error && error.message.trim() !== "") {
            return new MediaRequestError(error.message, null);
        }

        return new MediaRequestError(fallback, null);
    }

    return new MediaRequestError(
        readResponseMessage(error.response?.data, fallback),
        error.response?.status ?? null,
    );
}

function readResponseData(data: unknown): unknown {
    if (typeof data !== "object" || data === null || !("data" in data)) {
        return null;
    }

    return data.data;
}

function readResponseMessage(data: unknown, fallback: string): string {
    if (typeof data !== "object" || data === null) {
        return fallback;
    }

    const fieldMessage = readFieldMessage(data);
    const message = "message" in data && typeof data.message === "string"
        ? data.message.trim()
        : "";

    if (fieldMessage !== null && (message === "" || message === "Validation failed.")) {
        return fieldMessage;
    }

    if (message !== "") {
        return message;
    }

    return fieldMessage ?? fallback;
}

function readFieldMessage(data: object): string | null {
    if (!("errors" in data) || !Array.isArray(data.errors)) {
        return null;
    }

    for (const item of data.errors) {
        if (typeof item === "object" && item !== null && "message" in item && typeof item.message === "string" && item.message.trim() !== "") {
            return item.message;
        }
    }

    return null;
}

export {
    MAX_UPLOAD_BYTES,
    MediaRequestError,
    clientFileProblem,
    deleteMediaAsset,
    describeMediaError,
    getMediaUsage,
    listMediaAssets,
    mediaAssetIdFromSource,
    renameMediaAsset,
    resolveBoardImageSource,
    toPublicMediaFileUrl,
    uploadMediaAsset,
};
export type { MediaAsset, MediaUsage, MediaUsageBoard };
