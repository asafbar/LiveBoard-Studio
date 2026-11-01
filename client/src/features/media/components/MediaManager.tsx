import { useEffect, useMemo, useRef, useState } from "react";
import {
    MediaRequestError,
    clientFileProblem,
    describeMediaError,
    listMediaAssets,
    toPublicMediaFileUrl,
    uploadMediaAsset,
    type MediaAsset,
} from "../api/mediaApi.ts";
import { formatFileSize, formatTimestamp } from "../mediaFormat.ts";
import MediaAssetMenu from "./MediaAssetMenu.tsx";
import MediaPreviewDialog from "./MediaPreviewDialog.tsx";

type MediaManagerMode = "manage" | "select";

type MediaSort = "newest" | "oldest" | "name-asc" | "name-desc" | "largest";

type MediaManagerProps = {
    mode?: MediaManagerMode;
    onSelectAsset?: (asset: MediaAsset) => void;
};

type MediaNoticeProps = {
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
};

const fieldClassName = "h-9 rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent/40";

const secondaryButtonClassName = "inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40";

function MediaManager({ mode = "manage", onSelectAsset }: MediaManagerProps) {
    const [assets, setAssets] = useState<MediaAsset[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadLabel, setUploadLabel] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadNotice, setUploadNotice] = useState<string | null>(null);
    const [uploadErrors, setUploadErrors] = useState<string[]>([]);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<MediaSort>("newest");
    const [preview, setPreview] = useState<MediaAsset | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadingRef = useRef(false);
    const assetsRef = useRef<MediaAsset[] | null>(null);
    const selectionEnabled = mode === "select" && onSelectAsset !== undefined;

    useEffect(() => {
        let active = true;

        listMediaAssets()
            .then((nextAssets) => {
                if (!active) {
                    return;
                }

                assetsRef.current = nextAssets;
                setAssets(nextAssets);
                setLoadError(null);
                setRefreshError(null);
            })
            .catch((error: unknown) => {
                if (!active) {
                    return;
                }

                const message = error instanceof MediaRequestError
                    ? describeMediaError(error, "load")
                    : "The media library could not be loaded. Check that the API is running, then try again.";

                if (assetsRef.current === null) {
                    setLoadError(message);
                    return;
                }

                setRefreshError(message);
            })
            .finally(() => {
                if (active) {
                    setRefreshing(false);
                }
            });

        return () => {
            active = false;
        };
    }, [loadAttempt]);

    const visibleAssets = useMemo(() => {
        if (assets === null) {
            return [];
        }

        return sortAssets(filterAssets(assets, query), sort);
    }, [assets, query, sort]);

    const controlsDisabled = assets === null || uploading || refreshing;

    function reloadLibrary() {
        if (uploadingRef.current) {
            return;
        }

        if (assetsRef.current === null) {
            setLoadError(null);
        }

        setOpenMenuId(null);
        setRefreshing(true);
        setRefreshError(null);
        setLoadAttempt((attempt) => attempt + 1);
    }

    async function uploadSelectedFiles(fileList: FileList | null) {
        if (uploadingRef.current || fileList === null || fileList.length === 0) {
            return;
        }

        const selected = [...fileList];

        if (fileInputRef.current !== null) {
            fileInputRef.current.value = "";
        }

        uploadingRef.current = true;
        setUploading(true);
        setUploadNotice(null);
        setUploadErrors([]);
        setActionMessage(null);
        setOpenMenuId(null);

        const problems: string[] = [];
        const accepted: File[] = [];

        for (const file of selected) {
            const problem = clientFileProblem(file);

            if (problem === null) {
                accepted.push(file);
            } else {
                problems.push(`${file.name}: ${problem}`);
            }
        }

        let uploadedCount = 0;

        try {
            for (let index = 0; index < accepted.length; index += 1) {
                const file = accepted[index];

                if (file === undefined) {
                    continue;
                }

                setUploadLabel(`Uploading ${file.name} (${index + 1} of ${accepted.length})`);
                setUploadProgress(0);

                try {
                    await uploadMediaAsset(file, (percent) => {
                        setUploadProgress(percent);
                    });
                    uploadedCount += 1;
                    const nextAssets = await listMediaAssets();
                    assetsRef.current = nextAssets;
                    setAssets(nextAssets);
                    setLoadError(null);
                    setRefreshError(null);
                } catch (error: unknown) {
                    const requestError = error instanceof MediaRequestError
                        ? error
                        : new MediaRequestError("The image could not be uploaded.", null);
                    problems.push(`${file.name}: ${describeMediaError(requestError, "upload")}`);

                    if (requestError.statusCode === 401) {
                        break;
                    }
                }
            }
        } finally {
            uploadingRef.current = false;
            setUploading(false);
            setUploadLabel(null);
            setUploadProgress(null);
        }

        setUploadErrors(problems);

        if (uploadedCount > 0) {
            setUploadNotice(uploadedCount === 1 ? "1 image uploaded." : `${uploadedCount} images uploaded.`);
        }
    }

    async function copyAssetUrl(asset: MediaAsset) {
        const imageUrl = toPublicMediaFileUrl(asset.fileUrl);

        try {
            await navigator.clipboard.writeText(imageUrl);
            setActionMessage("Image URL copied.");
        } catch {
            setActionMessage("Select the image URL in the preview and copy it manually.");
            setPreview(asset);
        }
    }

    let listContent;

    if (assets === null && loadError === null) {
        listContent = (
            <MediaNotice
                title="Loading media"
                message="Images are being loaded."
            />
        );
    } else if (assets === null) {
        listContent = (
            <MediaNotice
                title="Media library unavailable"
                message={loadError ?? "The media library could not be loaded. Check that the API is running, then try again."}
                actionLabel="Reload"
                onAction={reloadLibrary}
            />
        );
    } else if (assets.length === 0) {
        listContent = (
            <MediaNotice
                title="No images yet"
                message="Upload a JPEG, PNG, or WebP image. It will appear in this library."
            />
        );
    } else if (visibleAssets.length === 0) {
        listContent = (
            <MediaNotice
                title="No matching images"
                message={`No filenames contain “${query.trim()}”.`}
            />
        );
    } else {
        listContent = (
            <div className="min-h-0 flex-1 overflow-auto">
                <div className="sticky top-0 z-10 hidden grid-cols-[72px_minmax(0,1fr)_9rem_5rem_10rem_auto] gap-3 border-b border-border bg-surface px-3 py-2 text-xs font-medium text-muted sm:grid">
                    <span className="sr-only">Thumbnail</span>
                    <span>Filename</span>
                    <span>Type</span>
                    <span>Size</span>
                    <span>Uploaded</span>
                    <span className="sr-only">Actions</span>
                </div>
                <ul>
                    {visibleAssets.map((asset) => (
                        <MediaAssetRow
                            key={asset.id}
                            asset={asset}
                            menuOpen={openMenuId === asset.id}
                            selectionEnabled={selectionEnabled}
                            onOpenMenu={(open) => {
                                setOpenMenuId(open ? asset.id : null);
                            }}
                            onPreview={() => {
                                setPreview(asset);
                            }}
                            onCopyUrl={() => {
                                void copyAssetUrl(asset);
                            }}
                            onSelect={selectionEnabled && onSelectAsset !== undefined
                                ? () => {
                                    onSelectAsset(asset);
                                }
                                : undefined}
                        />
                    ))}
                </ul>
            </div>
        );
    }

    const imageCount = assets === null
        ? null
        : query.trim() === ""
            ? `${assets.length} ${assets.length === 1 ? "image" : "images"}`
            : `${visibleAssets.length} of ${assets.length}`;

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setOpenMenuId(null);
                        }}
                        placeholder="Search filenames"
                        aria-label="Search images by filename"
                        className={`${fieldClassName} w-full sm:w-64`}
                    />
                    <select
                        value={sort}
                        onChange={(event) => {
                            setSort(readSort(event.target.value));
                            setOpenMenuId(null);
                        }}
                        aria-label="Sort images"
                        className={fieldClassName}
                    >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                        <option value="largest">Largest first</option>
                    </select>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        multiple
                        disabled={controlsDisabled}
                        aria-label="Choose images to upload"
                        tabIndex={-1}
                        className="sr-only"
                        onChange={(event) => {
                            void uploadSelectedFiles(event.target.files);
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            fileInputRef.current?.click();
                        }}
                        disabled={controlsDisabled}
                        className={
                            controlsDisabled
                                ? "inline-flex h-9 cursor-not-allowed items-center rounded-control bg-accent/40 px-3 text-sm font-medium text-white opacity-60"
                                : "inline-flex h-9 items-center rounded-control bg-accent px-3 text-sm font-medium text-white outline-none transition-colors duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40"
                        }
                    >
                        Upload Images
                    </button>
                    <button
                        type="button"
                        onClick={reloadLibrary}
                        disabled={controlsDisabled}
                        className={
                            controlsDisabled
                                ? "inline-flex h-9 cursor-not-allowed items-center rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                                : secondaryButtonClassName
                        }
                    >
                        {refreshing ? "Reloading..." : "Reload"}
                    </button>
                    {imageCount !== null ? (
                        <p className="text-sm text-muted">{imageCount}</p>
                    ) : null}
                </div>
                {uploading && uploadLabel !== null ? (
                    <div className="flex min-w-0 items-center gap-3">
                        <p role="status" aria-live="polite" className="min-w-0 flex-1 truncate text-sm text-secondary">
                            {uploadLabel}
                            {uploadProgress !== null ? ` ${uploadProgress}%` : ""}
                        </p>
                        <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={uploadProgress ?? undefined}
                            aria-label={uploadLabel}
                            className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-surface-raised"
                        >
                            <div
                                className={uploadProgress === null
                                    ? "h-full w-1/3 animate-pulse rounded-full bg-accent"
                                    : "h-full rounded-full bg-accent transition-[width] duration-150"}
                                style={uploadProgress === null ? undefined : { width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : null}
                {uploadNotice !== null ? (
                    <p role="status" className="text-sm text-cyan">{uploadNotice}</p>
                ) : null}
                {uploadErrors.length > 0 ? (
                    <div role="alert" className="max-h-28 overflow-auto rounded-control border border-danger/40 bg-surface px-3 py-2 text-sm text-danger">
                        <ul className="flex flex-col gap-1">
                            {uploadErrors.map((error, index) => (
                                <li key={`${index}:${error}`} className="break-words">{error}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {refreshError !== null ? (
                    <p role="status" className="text-sm text-warning">{refreshError}</p>
                ) : null}
                {actionMessage !== null ? (
                    <p role="status" className="text-sm text-secondary">{actionMessage}</p>
                ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-panel">
                {listContent}
            </div>
            {preview !== null ? (
                <MediaPreviewDialog
                    key={preview.id}
                    filename={preview.originalFilename}
                    mimeType={preview.mimeType}
                    sizeLabel={formatFileSize(preview.sizeBytes)}
                    uploadedLabel={formatTimestamp(preview.createdAt)}
                    imageUrl={toPublicMediaFileUrl(preview.fileUrl)}
                    onClose={() => {
                        setPreview(null);
                    }}
                />
            ) : null}
        </div>
    );
}

type MediaAssetRowProps = {
    asset: MediaAsset;
    menuOpen: boolean;
    selectionEnabled: boolean;
    onOpenMenu: (open: boolean) => void;
    onPreview: () => void;
    onCopyUrl: () => void;
    onSelect?: () => void;
};

function MediaAssetRow({
    asset,
    menuOpen,
    selectionEnabled,
    onOpenMenu,
    onPreview,
    onCopyUrl,
    onSelect,
}: MediaAssetRowProps) {
    const [imageFailed, setImageFailed] = useState(false);
    const imageUrl = toPublicMediaFileUrl(asset.fileUrl);

    return (
        <li className="border-b border-border last:border-b-0">
            <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 sm:grid-cols-[72px_minmax(0,1fr)_9rem_5rem_10rem_auto]">
                <button
                    type="button"
                    onClick={onPreview}
                    aria-label={`Preview ${asset.originalFilename}`}
                    className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-control border border-border bg-canvas outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                    {imageFailed ? (
                        <span className="px-1 text-center text-[10px] leading-3 text-muted">Unavailable</span>
                    ) : (
                        <img
                            src={imageUrl}
                            alt=""
                            onError={() => {
                                setImageFailed(true);
                            }}
                            className="h-full w-full object-contain"
                        />
                    )}
                </button>
                <div className="min-w-0">
                    <button
                        type="button"
                        onClick={onPreview}
                        title={asset.originalFilename}
                        className="block max-w-full truncate text-left text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                        {asset.originalFilename}
                    </button>
                    <p className="mt-1 truncate text-xs text-secondary sm:hidden">
                        {asset.mimeType}
                        {" · "}
                        {formatFileSize(asset.sizeBytes)}
                        {" · "}
                        {formatTimestamp(asset.createdAt)}
                    </p>
                </div>
                <span className="hidden truncate text-xs text-secondary sm:block">{asset.mimeType}</span>
                <span className="hidden text-xs text-secondary sm:block">{formatFileSize(asset.sizeBytes)}</span>
                <span className="hidden truncate text-xs text-muted sm:block">{formatTimestamp(asset.createdAt)}</span>
                <div className="flex items-center gap-1">
                    {selectionEnabled && onSelect !== undefined ? (
                        <button
                            type="button"
                            onClick={onSelect}
                            className={secondaryButtonClassName}
                        >
                            Use image
                        </button>
                    ) : null}
                    <MediaAssetMenu
                        filename={asset.originalFilename}
                        disabled={false}
                        open={menuOpen}
                        onOpenChange={onOpenMenu}
                        onPreview={onPreview}
                        onCopyUrl={onCopyUrl}
                    />
                </div>
            </div>
        </li>
    );
}

function MediaNotice({ title, message, actionLabel, onAction }: MediaNoticeProps) {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-md text-center">
                <h2 className="text-base font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-5 text-secondary">{message}</p>
                {actionLabel && onAction ? (
                    <button
                        type="button"
                        onClick={onAction}
                        className={`${secondaryButtonClassName} mt-4`}
                    >
                        {actionLabel}
                    </button>
                ) : null}
            </div>
        </div>
    );
}

function filterAssets(assets: MediaAsset[], query: string): MediaAsset[] {
    const needle = query.trim().toLocaleLowerCase();

    if (needle === "") {
        return assets;
    }

    return assets.filter((asset) => asset.originalFilename.toLocaleLowerCase().includes(needle));
}

function sortAssets(assets: MediaAsset[], sort: MediaSort): MediaAsset[] {
    const next = [...assets];

    next.sort((left, right) => {
        if (sort === "newest") {
            return compareCreatedAt(right, left) || left.id.localeCompare(right.id);
        }

        if (sort === "oldest") {
            return compareCreatedAt(left, right) || left.id.localeCompare(right.id);
        }

        if (sort === "name-asc") {
            return compareName(left, right) || left.id.localeCompare(right.id);
        }

        if (sort === "name-desc") {
            return compareName(right, left) || left.id.localeCompare(right.id);
        }

        return right.sizeBytes - left.sizeBytes || left.id.localeCompare(right.id);
    });

    return next;
}

function compareCreatedAt(left: MediaAsset, right: MediaAsset): number {
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    const leftValue = Number.isNaN(leftTime) ? 0 : leftTime;
    const rightValue = Number.isNaN(rightTime) ? 0 : rightTime;

    if (leftValue === rightValue) {
        return 0;
    }

    return leftValue < rightValue ? -1 : 1;
}

function compareName(left: MediaAsset, right: MediaAsset): number {
    return left.originalFilename.localeCompare(right.originalFilename, undefined, {
        sensitivity: "base",
        numeric: true,
    });
}

function readSort(value: string): MediaSort {
    if (value === "oldest" || value === "name-asc" || value === "name-desc" || value === "largest") {
        return value;
    }

    return "newest";
}

export default MediaManager;
export type { MediaManagerMode, MediaManagerProps };
