import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import {
    listMediaAssets,
    mediaAssetIdFromSource,
    resolveBoardImageSource,
    type MediaAsset,
} from "../../media/api/mediaApi.ts";
import MediaManagerDialog from "../../media/components/MediaManagerDialog.tsx";
import type { DraftFieldIssue } from "../draftFieldIssues.ts";
import type {
    AnnouncementIconName,
    AnnouncementItem,
    AnnouncementsWidgetSettings,
    ClockWidgetSettings,
    ImageWidgetSettings,
    InformationCardWidgetSettings,
    TextWidgetSettings,
    TickerDirection,
    TickerFontFamily,
    TickerFontWeight,
    TickerMessage,
    TickerWidgetSettings,
    VerticalAnnouncementItem,
    VerticalAnnouncementsWidgetSettings,
    Widget,
} from "../../boards/types/boardTypes.ts";
import { clockTimeZones } from "../clockTimeZones.ts";
import ColorField from "./ColorField.tsx";
import {
    imageObjectFitOptions,
    maximumImageBorderRadius,
    minimumImageBorderRadius,
    normalizeImageSource,
    parseImageBorderRadius,
} from "../imageSettings.ts";
import {
    defaultTickerFontFamily,
    defaultTickerFontSize,
    defaultTickerFontWeight,
    isTickerDirection,
    isTickerFontFamily,
    isTickerFontWeight,
    maximumTickerFontSize,
    maximumTickerMessageLength,
    maximumTickerMessages,
    maximumTickerSpeed,
    minimumTickerFontSize,
    minimumTickerSpeed,
    tickerFontFamilies,
    tickerFontSizeIsInRange,
    tickerFontWeights,
    tickerSpeedIsInRange,
} from "../tickerSettings.ts";
import {
    defaultVerticalAnnouncementDescriptionFontSize,
    defaultVerticalAnnouncementFontFamily,
    defaultVerticalAnnouncementFontWeight,
    defaultVerticalAnnouncementPauseSeconds,
    defaultVerticalAnnouncementTitleFontSize,
    maximumVerticalAnnouncementDescriptionFontSize,
    maximumVerticalAnnouncementDescriptionLength,
    maximumVerticalAnnouncementLabelLength,
    maximumVerticalAnnouncementPauseSeconds,
    maximumVerticalAnnouncements,
    maximumVerticalAnnouncementSpeed,
    maximumVerticalAnnouncementTitleFontSize,
    maximumVerticalAnnouncementTitleLength,
    minimumVerticalAnnouncementDescriptionFontSize,
    minimumVerticalAnnouncementPauseSeconds,
    minimumVerticalAnnouncementSpeed,
    minimumVerticalAnnouncementTitleFontSize,
    verticalAnnouncementDescriptionFontSizeIsInRange,
    verticalAnnouncementPauseIsInRange,
    verticalAnnouncementSpeedIsInRange,
    verticalAnnouncementTitleFontSizeIsInRange,
} from "../verticalAnnouncementsSettings.ts";

type PropertiesPanelProps = {
    selectedWidget: Widget | null;
    onTextChange: (text: string) => void;
    onTextToneChange: (tone: TextWidgetSettings["tone"]) => void;
    onTextSizeChange: (size: TextWidgetSettings["size"]) => void;
    onClockSettingsChange: (settings: Partial<ClockWidgetSettings>) => void;
    onImageSettingsChange: (settings: Partial<ImageWidgetSettings>) => void;
    onInformationCardSettingsChange: (
        settings: Partial<InformationCardWidgetSettings>,
        gesture?: "color",
    ) => void;
    onAnnouncementsSettingsChange: (
        settings: Partial<AnnouncementsWidgetSettings>,
        gesture?: "color",
    ) => void;
    onTickerSettingsChange: (
        settings: Partial<TickerWidgetSettings>,
        gesture?: "color",
    ) => void;
    onVerticalAnnouncementsSettingsChange: (
        settings: Partial<VerticalAnnouncementsWidgetSettings>,
        gesture?: "color",
    ) => void;
    onColorSessionEnd: () => void;
    onDeleteWidget: () => void;
    draftIssues: DraftFieldIssue[];
    focusedIssueIndex: number;
    onFocusedIssueIndexChange: (index: number) => void;
};

type TextContentFieldProps = {
    value: string;
    onTextChange: (text: string) => void;
};

type TextStyleFieldsProps = {
    tone: TextWidgetSettings["tone"];
    size: TextWidgetSettings["size"];
    onToneChange: (tone: TextWidgetSettings["tone"]) => void;
    onSizeChange: (size: TextWidgetSettings["size"]) => void;
};

type ClockContentFieldsProps = {
    timeZone: string;
    showDate: boolean;
    showSeconds: boolean;
    onClockSettingsChange: (settings: Partial<ClockWidgetSettings>) => void;
};

type ClockStyleFieldsProps = {
    align: ClockWidgetSettings["align"];
    onClockSettingsChange: (settings: Partial<ClockWidgetSettings>) => void;
};

type ClockToggleProps = {
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
};

type ImageContentFieldsProps = {
    source: string;
    alt: string;
    onImageSettingsChange: (settings: Partial<ImageWidgetSettings>) => void;
};

type ImageStyleFieldsProps = {
    objectFit: ImageWidgetSettings["objectFit"];
    borderRadius: number;
    onImageSettingsChange: (settings: Partial<ImageWidgetSettings>) => void;
};

type InformationCardContentFieldsProps = {
    title: string;
    subtitle: string;
    description: string;
    badge: string;
    imageSrc: string;
    onInformationCardSettingsChange: (settings: Partial<InformationCardWidgetSettings>) => void;
};

type InformationCardStyleFieldsProps = {
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    onInformationCardSettingsChange: (
        settings: Partial<InformationCardWidgetSettings>,
        gesture?: "color",
    ) => void;
    onColorSessionEnd: () => void;
};

type CardTextFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    fieldPath?: string;
};

type CardImageSourceFieldProps = {
    source: string;
    onInformationCardSettingsChange: (settings: Partial<InformationCardWidgetSettings>) => void;
};

type AnnouncementsContentFieldsProps = {
    title: string;
    items: AnnouncementItem[];
    onAnnouncementsSettingsChange: (settings: Partial<AnnouncementsWidgetSettings>) => void;
};

type AnnouncementsStyleFieldsProps = {
    backgroundColor: string;
    textColor: string;
    borderRadius: number;
    onAnnouncementsSettingsChange: (
        settings: Partial<AnnouncementsWidgetSettings>,
        gesture?: "color",
    ) => void;
    onColorSessionEnd: () => void;
};

type AnnouncementItemFieldsProps = {
    index: number;
    item: AnnouncementItem;
    onItemChange: (itemId: string, item: AnnouncementItem) => void;
    onRemove: (itemId: string) => void;
};

type TickerContentFieldsProps = {
    messages: TickerMessage[];
    direction: TickerDirection;
    speed: number;
    onTickerSettingsChange: (settings: Partial<TickerWidgetSettings>) => void;
};

type TickerMessageFieldsProps = {
    index: number;
    message: TickerMessage;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onTextChange: (messageId: string, text: string) => void;
    onMove: (index: number, offset: -1 | 1) => void;
    onRemove: (messageId: string) => void;
};

type TickerStyleFieldsProps = {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
    fontFamily: TickerFontFamily;
    fontSize: number;
    fontWeight: TickerFontWeight;
    onTickerSettingsChange: (
        settings: Partial<TickerWidgetSettings>,
        gesture?: "color",
    ) => void;
    onColorSessionEnd: () => void;
};

const inspectorFieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none";
const inspectorSelectClassName = "h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none";

const DraftFieldIssueContext = createContext<readonly DraftFieldIssue[]>([]);

function useFieldIssue(fieldPath: string | undefined): string | null {
    const issues = useContext(DraftFieldIssueContext);

    if (fieldPath === undefined) {
        return null;
    }

    return issues.find((issue) => issue.fieldPath === fieldPath)?.message ?? null;
}

function invalidFieldClassName(base: string, message: string | null): string {
    if (message === null) {
        return base;
    }

    return `${base} border-danger-border ring-1 ring-danger/40`;
}

function FieldIssueNote({ message }: { message: string | null }) {
    if (message === null) {
        return null;
    }

    return (
        <p className="text-xs text-danger" role="alert">
            {message}
        </p>
    );
}

const announcementIconOptions: { value: AnnouncementIconName; label: string }[] = [
    { value: "food", label: "Food" },
    { value: "people", label: "People" },
    { value: "music", label: "Music" },
    { value: "info", label: "Info" },
];

const textToneOptions: TextWidgetSettings["tone"][] = ["default", "accent"];
const textSizeOptions: TextWidgetSettings["size"][] = ["title", "display"];
const clockAlignmentOptions: ClockWidgetSettings["align"][] = ["left", "right"];

type PropertyTabName = "Content" | "Style" | "Position";

type TextProperty = {
    kind: "text" | "select";
    label: string;
    value: string;
    validationPath?: string;
};

type ToggleProperty = {
    kind: "toggle";
    label: string;
    enabled: boolean;
};

type Property = TextProperty | ToggleProperty;

type PropertyFieldProps = {
    property: Property;
};

const propertyTabs: PropertyTabName[] = ["Content", "Style", "Position"];

function widgetTypeLabel(type: Widget["type"]): string {
    switch (type) {
        case "text":
            return "Text";
        case "clock":
            return "Clock";
        case "image":
            return "Image";
        case "information-card":
            return "Information Card";
        case "announcements":
            return "Announcements";
        case "ticker":
            return "Ticker";
        case "vertical-announcements":
            return "Vertical Announcements";
    }
}

function contentProperties(widget: Widget): Property[] {
    switch (widget.type) {
        case "text":
            return [
                { kind: "text", label: "Text", value: widget.settings.text },
            ];
        case "clock":
            return [
                { kind: "text", label: "Time zone", value: widget.settings.timeZone },
                { kind: "toggle", label: "Show date", enabled: widget.settings.showDate },
                { kind: "toggle", label: "Show seconds", enabled: widget.settings.showSeconds },
            ];
        case "image":
            return [
                { kind: "text", label: "Image source", value: widget.settings.src },
                { kind: "text", label: "Alternative text", value: widget.settings.alt },
            ];
        case "information-card":
            return [
                { kind: "text", label: "Title", value: widget.settings.title },
                { kind: "text", label: "Subtitle", value: widget.settings.subtitle ?? "" },
                { kind: "text", label: "Description", value: widget.settings.description ?? "" },
                { kind: "text", label: "Badge", value: widget.settings.badge ?? "" },
                { kind: "text", label: "Image source", value: widget.settings.imageSrc ?? "" },
            ];
        case "announcements":
            return [
                { kind: "text", label: "Title", value: widget.settings.title },
                {
                    kind: "text",
                    label: "Number of items",
                    value: String(widget.settings.items.length),
                },
                ...widget.settings.items.map((item, index) => ({
                    kind: "text" as const,
                    label: `Item ${index + 1}`,
                    value: item.title,
                })),
            ];
        case "ticker":
        case "vertical-announcements":
            return [];
    }
}

function styleProperties(widget: Widget): Property[] {
    switch (widget.type) {
        case "text":
            return [
                { kind: "select", label: "Tone", value: widget.settings.tone },
                { kind: "select", label: "Size", value: widget.settings.size },
            ];
        case "clock":
            return [
                { kind: "select", label: "Alignment", value: widget.settings.align },
            ];
        case "image":
            return [
                { kind: "select", label: "Object fit", value: widget.settings.objectFit },
                { kind: "text", label: "Border radius", value: String(widget.settings.borderRadius) },
            ];
        case "information-card":
        case "announcements":
        case "ticker":
        case "vertical-announcements":
            return [];
    }
}

function positionProperties(widget: Widget): Property[] {
    return [
        { kind: "text", label: "X", value: String(widget.layout.x), validationPath: "layout.x" },
        { kind: "text", label: "Y", value: String(widget.layout.y), validationPath: "layout.y" },
        { kind: "text", label: "Width", value: String(widget.layout.width), validationPath: "layout.width" },
        { kind: "text", label: "Height", value: String(widget.layout.height), validationPath: "layout.height" },
    ];
}

function propertiesForTab(widget: Widget, tab: PropertyTabName): Property[] {
    switch (tab) {
        case "Content":
            return contentProperties(widget);
        case "Style":
            return styleProperties(widget);
        case "Position":
            return positionProperties(widget);
    }
}

function TextContentField({ value, onTextChange }: TextContentFieldProps) {
    const issue = useFieldIssue("text");

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Text</span>
            <textarea
                value={value}
                rows={4}
                data-validation-path="text"
                aria-invalid={issue !== null}
                onChange={(event) => {
                    onTextChange(event.target.value);
                }}
                className={invalidFieldClassName(
                    "min-h-24 w-full resize-y rounded-control border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none",
                    issue,
                )}
            />
            <FieldIssueNote message={issue} />
        </label>
    );
}

function TextStyleFields({ tone, size, onToneChange, onSizeChange }: TextStyleFieldsProps) {
    const selectClassName = "h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none";

    function handleToneChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextTone = textToneOptions.find((option) => option === event.target.value);

        if (nextTone !== undefined) {
            onToneChange(nextTone);
        }
    }

    function handleSizeChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextSize = textSizeOptions.find((option) => option === event.target.value);

        if (nextSize !== undefined) {
            onSizeChange(nextSize);
        }
    }

    return (
        <>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Tone</span>
                <span className="relative">
                    <select
                        value={tone}
                        onChange={handleToneChange}
                        className={selectClassName}
                    >
                        {textToneOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Size</span>
                <span className="relative">
                    <select
                        value={size}
                        onChange={handleSizeChange}
                        className={selectClassName}
                    >
                        {textSizeOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
        </>
    );
}

function clockTimeZoneOptions(currentTimeZone: string): readonly string[] {
    if (clockTimeZones.some((zone) => zone === currentTimeZone)) {
        return clockTimeZones;
    }

    return [currentTimeZone, ...clockTimeZones];
}

function ClockToggle({ label, enabled, onChange }: ClockToggleProps) {
    const trackClassName = enabled
        ? "relative h-5 w-9 rounded-full bg-accent"
        : "relative h-5 w-9 rounded-full bg-surface-hover";
    const knobClassName = enabled
        ? "absolute top-0.5 right-0.5 size-4 rounded-full bg-white"
        : "absolute top-0.5 left-0.5 size-4 rounded-full bg-white";

    return (
        <button
            type="button"
            aria-pressed={enabled}
            onClick={() => {
                onChange(!enabled);
            }}
            className="flex items-center justify-between gap-3 text-left"
        >
            <span className="text-sm text-secondary">{label}</span>
            <span className="inline-flex items-center gap-2 text-xs font-medium text-secondary">
                {enabled ? "On" : "Off"}
                <span className={trackClassName} aria-hidden="true">
                    <span className={knobClassName} />
                </span>
            </span>
        </button>
    );
}

function ClockContentFields({
    timeZone,
    showDate,
    showSeconds,
    onClockSettingsChange,
}: ClockContentFieldsProps) {
    const options = clockTimeZoneOptions(timeZone);

    function handleTimeZoneChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextTimeZone = options.find((option) => option === event.target.value);

        if (nextTimeZone !== undefined) {
            onClockSettingsChange({ timeZone: nextTimeZone });
        }
    }

    return (
        <>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Time zone</span>
                <span className="relative">
                    <select
                        value={timeZone}
                        onChange={handleTimeZoneChange}
                        className="h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none"
                    >
                        {options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
            <ClockToggle
                label="Show date"
                enabled={showDate}
                onChange={(enabled) => {
                    onClockSettingsChange({ showDate: enabled });
                }}
            />
            <ClockToggle
                label="Show seconds"
                enabled={showSeconds}
                onChange={(enabled) => {
                    onClockSettingsChange({ showSeconds: enabled });
                }}
            />
        </>
    );
}

function ClockStyleFields({ align, onClockSettingsChange }: ClockStyleFieldsProps) {
    function handleAlignChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextAlign = clockAlignmentOptions.find((option) => option === event.target.value);

        if (nextAlign !== undefined) {
            onClockSettingsChange({ align: nextAlign });
        }
    }

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Alignment</span>
            <span className="relative">
                <select
                    value={align}
                    onChange={handleAlignChange}
                    className="h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none"
                >
                    {clockAlignmentOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <SelectChevron />
            </span>
        </label>
    );
}

function ImageContentFields({
    source,
    alt,
    onImageSettingsChange,
}: ImageContentFieldsProps) {
    const [sourceDraft, setSourceDraft] = useState(source);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [externalOpen, setExternalOpen] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    const [previewSource, setPreviewSource] = useState(source);
    const [libraryName, setLibraryName] = useState<{ assetId: string; filename: string | null } | null>(null);
    const resolvedSource = resolveBoardImageSource(source);
    const assetId = mediaAssetIdFromSource(source);
    const visibleLibraryName = libraryName !== null && libraryName.assetId === assetId
        ? libraryName.filename
        : null;

    if (source !== previewSource) {
        setPreviewSource(source);
        setSourceDraft(source);
        setPreviewFailed(false);
    }

    useEffect(() => {
        if (assetId === null) {
            return;
        }

        let active = true;

        listMediaAssets()
            .then((assets) => {
                if (!active) {
                    return;
                }

                const match = assets.find((asset) => asset.id.toLowerCase() === assetId);
                setLibraryName({
                    assetId,
                    filename: match === undefined ? null : match.originalFilename,
                });
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                setLibraryName({
                    assetId,
                    filename: null,
                });
            });

        return () => {
            active = false;
        };
    }, [assetId]);

    function handleSourceChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        setSourceDraft(nextDraft);

        if (nextDraft !== nextDraft.trim() && nextDraft.trim().length > 0) {
            return;
        }

        const normalized = normalizeImageSource(nextDraft);

        if (normalized === null || normalized === source) {
            return;
        }

        onImageSettingsChange({ src: normalized });

        if (normalized !== nextDraft) {
            setSourceDraft(normalized);
        }
    }

    function handleSourceBlur() {
        const normalized = normalizeImageSource(sourceDraft);

        if (normalized === null) {
            setSourceDraft(source);
            return;
        }

        setSourceDraft(normalized);

        if (normalized !== source) {
            onImageSettingsChange({ src: normalized });
        }
    }

    function handleLibrarySelect(asset: MediaAsset) {
        if (mediaAssetIdFromSource(source) !== asset.id.toLowerCase()) {
            onImageSettingsChange({ src: asset.fileUrl });
        }

        setLibraryOpen(false);
    }

    return (
        <>
            <div className="overflow-hidden rounded-control border border-border bg-canvas">
                {source.trim() === "" ? (
                    <p className="px-3 py-6 text-center text-xs text-muted">No image selected</p>
                ) : previewFailed ? (
                    <p className="px-3 py-6 text-center text-xs text-muted">Image unavailable</p>
                ) : (
                    <img
                        src={resolvedSource}
                        alt={alt.trim() === "" ? "Selected image" : alt}
                        onError={() => {
                            setPreviewFailed(true);
                        }}
                        className="h-28 w-full object-contain"
                    />
                )}
                {visibleLibraryName !== null ? (
                    <p className="truncate px-3 pb-3 text-center text-xs text-secondary" title={visibleLibraryName}>
                        {visibleLibraryName}
                    </p>
                ) : null}
            </div>
            <button
                type="button"
                onClick={() => {
                    setLibraryOpen(true);
                }}
                className="inline-flex h-9 items-center justify-center rounded-control bg-accent px-3 text-sm font-medium text-white outline-none transition-colors duration-150 hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40"
            >
                Change Image
            </button>
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    aria-expanded={externalOpen}
                    onClick={() => {
                        setExternalOpen((open) => !open);
                    }}
                    className="self-start text-sm font-medium text-secondary underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                    Use external URL
                </button>
                {externalOpen ? (
                    <label className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted">Image URL</span>
                        <input
                            value={sourceDraft}
                            spellCheck={false}
                            autoComplete="off"
                            onChange={handleSourceChange}
                            onBlur={handleSourceBlur}
                            className={inspectorFieldClassName}
                        />
                    </label>
                ) : null}
            </div>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Alternative text</span>
                <input
                    value={alt}
                    onChange={(event) => {
                        onImageSettingsChange({ alt: event.target.value });
                    }}
                    className={inspectorFieldClassName}
                />
            </label>
            {libraryOpen ? (
                <MediaManagerDialog
                    mode="select"
                    selectedSource={source}
                    onClose={() => {
                        setLibraryOpen(false);
                    }}
                    onSelectAsset={handleLibrarySelect}
                />
            ) : null}
        </>
    );
}

function ImageStyleFields({
    objectFit,
    borderRadius,
    onImageSettingsChange,
}: ImageStyleFieldsProps) {
    const [radiusDraft, setRadiusDraft] = useState(String(borderRadius));

    function handleObjectFitChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextObjectFit = imageObjectFitOptions.find((option) => option === event.target.value);

        if (nextObjectFit !== undefined) {
            onImageSettingsChange({ objectFit: nextObjectFit });
        }
    }

    function commitBorderRadius(value: string) {
        const radius = parseImageBorderRadius(value);

        if (radius === null) {
            return;
        }

        if (radius !== borderRadius) {
            onImageSettingsChange({ borderRadius: radius });
        }
    }

    function handleRadiusChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        setRadiusDraft(nextDraft);
        commitBorderRadius(nextDraft);
    }

    function handleRadiusBlur() {
        if (parseImageBorderRadius(radiusDraft) === null) {
            setRadiusDraft(String(borderRadius));
        }
    }

    return (
        <>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Object fit</span>
                <span className="relative">
                    <select
                        value={objectFit}
                        onChange={handleObjectFitChange}
                        className={inspectorSelectClassName}
                    >
                        {imageObjectFitOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Border radius</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min={minimumImageBorderRadius}
                    max={maximumImageBorderRadius}
                    step="any"
                    value={radiusDraft}
                    onChange={handleRadiusChange}
                    onBlur={handleRadiusBlur}
                    className={inspectorFieldClassName}
                />
            </label>
        </>
    );
}

function CardTextField({
    label,
    value,
    onChange,
    fieldPath,
}: CardTextFieldProps) {
    const issue = useFieldIssue(fieldPath);

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <input
                value={value}
                data-validation-path={fieldPath}
                aria-invalid={issue === null ? undefined : true}
                onChange={(event) => {
                    onChange(event.target.value);
                }}
                className={invalidFieldClassName(inspectorFieldClassName, issue)}
            />
            <FieldIssueNote message={issue} />
        </label>
    );
}

function CardImageSourceField({
    source,
    onInformationCardSettingsChange,
}: CardImageSourceFieldProps) {
    const [sourceDraft, setSourceDraft] = useState(source);
    const sourceIssue = useFieldIssue("imageSrc");

    function handleSourceChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        setSourceDraft(nextDraft);

        if (nextDraft !== nextDraft.trim() && nextDraft.trim().length > 0) {
            return;
        }

        const normalized = normalizeImageSource(nextDraft);

        if (normalized === null || normalized === source) {
            return;
        }

        onInformationCardSettingsChange({ imageSrc: normalized });

        if (normalized !== nextDraft) {
            setSourceDraft(normalized);
        }
    }

    function handleSourceBlur() {
        const normalized = normalizeImageSource(sourceDraft);

        if (normalized === null) {
            setSourceDraft(source);
            return;
        }

        setSourceDraft(normalized);

        if (normalized !== source) {
            onInformationCardSettingsChange({ imageSrc: normalized });
        }
    }

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Image source</span>
            <input
                value={sourceDraft}
                data-validation-path="imageSrc"
                aria-invalid={sourceIssue !== null}
                spellCheck={false}
                autoComplete="off"
                onChange={handleSourceChange}
                onBlur={handleSourceBlur}
                className={invalidFieldClassName(inspectorFieldClassName, sourceIssue)}
            />
            <FieldIssueNote message={sourceIssue} />
        </label>
    );
}

function InformationCardContentFields({
    title,
    subtitle,
    description,
    badge,
    imageSrc,
    onInformationCardSettingsChange,
}: InformationCardContentFieldsProps) {
    return (
        <>
            <CardTextField
                label="Title"
                fieldPath="title"
                value={title}
                onChange={(value) => {
                    onInformationCardSettingsChange({ title: value });
                }}
            />
            <CardTextField
                label="Subtitle"
                fieldPath="subtitle"
                value={subtitle}
                onChange={(value) => {
                    onInformationCardSettingsChange({ subtitle: value });
                }}
            />
            <CardTextField
                label="Description"
                fieldPath="description"
                value={description}
                onChange={(value) => {
                    onInformationCardSettingsChange({ description: value });
                }}
            />
            <CardTextField
                label="Badge"
                fieldPath="badge"
                value={badge}
                onChange={(value) => {
                    onInformationCardSettingsChange({ badge: value });
                }}
            />
            <CardImageSourceField
                source={imageSrc}
                onInformationCardSettingsChange={onInformationCardSettingsChange}
            />
        </>
    );
}

function InformationCardStyleFields({
    backgroundColor,
    textColor,
    borderRadius,
    onInformationCardSettingsChange,
    onColorSessionEnd,
}: InformationCardStyleFieldsProps) {
    const [radiusDraft, setRadiusDraft] = useState(String(borderRadius));

    function commitBorderRadius(value: string) {
        const radius = parseImageBorderRadius(value);

        if (radius === null || radius === borderRadius) {
            return;
        }

        onInformationCardSettingsChange({ borderRadius: radius });
    }

    function handleRadiusChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        setRadiusDraft(nextDraft);
        commitBorderRadius(nextDraft);
    }

    function handleRadiusBlur() {
        if (parseImageBorderRadius(radiusDraft) === null) {
            setRadiusDraft(String(borderRadius));
        }
    }

    return (
        <>
            <ColorField
                label="Background color"
                value={backgroundColor}
                onColorChange={(color) => {
                    onInformationCardSettingsChange({ backgroundColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <ColorField
                label="Text color"
                value={textColor}
                onColorChange={(color) => {
                    onInformationCardSettingsChange({ textColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Border radius</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min={minimumImageBorderRadius}
                    max={maximumImageBorderRadius}
                    step="any"
                    value={radiusDraft}
                    onChange={handleRadiusChange}
                    onBlur={handleRadiusBlur}
                    className={inspectorFieldClassName}
                />
            </label>
        </>
    );
}

function nextAnnouncementId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `announcement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createAnnouncementId(existingIds: ReadonlySet<string>): string {
    const id = nextAnnouncementId();

    if (existingIds.has(id)) {
        return createAnnouncementId(existingIds);
    }

    return id;
}

function AnnouncementItemFields({
    index,
    item,
    onItemChange,
    onRemove,
}: AnnouncementItemFieldsProps) {
    const itemLabel = item.title.length > 0 ? item.title : `Announcement ${index + 1}`;

    function handleIconChange(event: ChangeEvent<HTMLSelectElement>) {
        const icon = announcementIconOptions.find((option) => option.value === event.target.value);

        if (icon === undefined) {
            return;
        }

        onItemChange(item.id, {
            ...item,
            icon: icon.value,
        });
    }

    return (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-secondary">
                    {`Announcement ${index + 1}`}
                </span>
                <button
                    type="button"
                    aria-label={`Remove ${itemLabel}`}
                    onClick={() => {
                        onRemove(item.id);
                    }}
                    className="text-xs font-medium text-muted"
                >
                    Remove
                </button>
            </div>
            <CardTextField
                label="Title"
                fieldPath={`items.${index}.title`}
                value={item.title}
                onChange={(value) => {
                    onItemChange(item.id, {
                        ...item,
                        title: value,
                    });
                }}
            />
            <CardTextField
                label="Description"
                fieldPath={`items.${index}.description`}
                value={item.description ?? ""}
                onChange={(value) => {
                    onItemChange(item.id, {
                        ...item,
                        description: value,
                    });
                }}
            />
            <CardTextField
                label="Meta"
                fieldPath={`items.${index}.meta`}
                value={item.meta ?? ""}
                onChange={(value) => {
                    onItemChange(item.id, {
                        ...item,
                        meta: value,
                    });
                }}
            />
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Icon</span>
                <span className="relative">
                    <select
                        aria-label={`Icon for ${itemLabel}`}
                        value={item.icon ?? ""}
                        onChange={handleIconChange}
                        className={inspectorSelectClassName}
                    >
                        {item.icon === undefined ? (
                            <option value="">Select icon</option>
                        ) : null}
                        {announcementIconOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
        </div>
    );
}

function AnnouncementsContentFields({
    title,
    items,
    onAnnouncementsSettingsChange,
}: AnnouncementsContentFieldsProps) {
    function handleItemChange(itemId: string, nextItem: AnnouncementItem) {
        onAnnouncementsSettingsChange({
            items: items.map((item) => item.id === itemId ? nextItem : item),
        });
    }

    function handleRemove(itemId: string) {
        onAnnouncementsSettingsChange({
            items: items.filter((item) => item.id !== itemId),
        });
    }

    function handleAdd() {
        const existingIds = new Set(items.map((item) => item.id));

        onAnnouncementsSettingsChange({
            items: [
                ...items,
                {
                    id: createAnnouncementId(existingIds),
                    title: "New announcement",
                    description: "",
                    meta: "",
                    icon: "info",
                },
            ],
        });
    }

    return (
        <>
            <CardTextField
                label="Title"
                fieldPath="title"
                value={title}
                onChange={(value) => {
                    onAnnouncementsSettingsChange({ title: value });
                }}
            />
            {items.length === 0 ? (
                <p className="text-sm text-muted">No announcements.</p>
            ) : (
                items.map((item, index) => (
                    <AnnouncementItemFields
                        key={item.id}
                        index={index}
                        item={item}
                        onItemChange={handleItemChange}
                        onRemove={handleRemove}
                    />
                ))
            )}
            <button
                type="button"
                onClick={handleAdd}
                className="h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-foreground"
            >
                Add announcement
            </button>
        </>
    );
}

function AnnouncementsStyleFields({
    backgroundColor,
    textColor,
    borderRadius,
    onAnnouncementsSettingsChange,
    onColorSessionEnd,
}: AnnouncementsStyleFieldsProps) {
    const [radiusDraft, setRadiusDraft] = useState(String(borderRadius));

    function commitBorderRadius(value: string) {
        const radius = parseImageBorderRadius(value);

        if (radius === null || radius === borderRadius) {
            return;
        }

        onAnnouncementsSettingsChange({ borderRadius: radius });
    }

    function handleRadiusChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        setRadiusDraft(nextDraft);
        commitBorderRadius(nextDraft);
    }

    function handleRadiusBlur() {
        if (parseImageBorderRadius(radiusDraft) === null) {
            setRadiusDraft(String(borderRadius));
        }
    }

    return (
        <>
            <ColorField
                label="Background color"
                value={backgroundColor}
                onColorChange={(color) => {
                    onAnnouncementsSettingsChange({ backgroundColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <ColorField
                label="Text color"
                value={textColor}
                onColorChange={(color) => {
                    onAnnouncementsSettingsChange({ textColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Border radius</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min={minimumImageBorderRadius}
                    max={maximumImageBorderRadius}
                    step="any"
                    aria-label="Border radius"
                    value={radiusDraft}
                    onChange={handleRadiusChange}
                    onBlur={handleRadiusBlur}
                    className={inspectorFieldClassName}
                />
            </label>
        </>
    );
}

const tickerDirectionOptions: { value: TickerDirection; label: string }[] = [
    { value: "rtl", label: "Right to left" },
    { value: "ltr", label: "Left to right" },
];

const tickerOrderButtonClassName = "text-xs font-medium text-secondary";
const tickerOrderButtonDisabledClassName = "cursor-not-allowed text-xs font-medium text-muted opacity-50";

function nextTickerMessageId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `ticker-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createTickerMessageId(existingIds: ReadonlySet<string>): string {
    const id = nextTickerMessageId();

    if (existingIds.has(id)) {
        return createTickerMessageId(existingIds);
    }

    return id;
}

function parseTickerSpeed(value: string): number | null {
    if (!/^\d+$/.test(value.trim())) {
        return null;
    }

    const speed = Number(value);

    if (!tickerSpeedIsInRange(speed)) {
        return null;
    }

    return speed;
}

function moveTickerMessage(messages: TickerMessage[], index: number, offset: -1 | 1): TickerMessage[] {
    const nextIndex = index + offset;

    if (nextIndex < 0 || nextIndex >= messages.length) {
        return messages;
    }

    const nextMessages = messages.slice();
    const [message] = nextMessages.splice(index, 1);

    if (message === undefined) {
        return messages;
    }

    nextMessages.splice(nextIndex, 0, message);

    return nextMessages;
}

function TickerMessageTextField({
    index,
    messageNumber,
    text,
    onTextChange,
}: {
    index: number;
    messageNumber: number;
    text: string;
    onTextChange: (text: string) => void;
}) {
    const fieldPath = `messages.${index}.text`;
    const issue = useFieldIssue(fieldPath);

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Text</span>
            <input
                dir="auto"
                maxLength={maximumTickerMessageLength}
                aria-label={`Text for message ${messageNumber}`}
                aria-invalid={issue !== null}
                data-validation-path={fieldPath}
                placeholder="New message"
                value={text}
                onChange={(event) => {
                    onTextChange(event.target.value);
                }}
                className={invalidFieldClassName(inspectorFieldClassName, issue)}
            />
            <FieldIssueNote message={issue} />
        </label>
    );
}

function TickerMessageFields({
    index,
    message,
    canMoveUp,
    canMoveDown,
    onTextChange,
    onMove,
    onRemove,
}: TickerMessageFieldsProps) {
    const messageNumber = index + 1;

    return (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-secondary">
                    {`Message ${messageNumber}`}
                </span>
                <span className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={`Move message ${messageNumber} up`}
                        disabled={!canMoveUp}
                        onClick={() => {
                            onMove(index, -1);
                        }}
                        className={canMoveUp ? tickerOrderButtonClassName : tickerOrderButtonDisabledClassName}
                    >
                        Up
                    </button>
                    <button
                        type="button"
                        aria-label={`Move message ${messageNumber} down`}
                        disabled={!canMoveDown}
                        onClick={() => {
                            onMove(index, 1);
                        }}
                        className={canMoveDown ? tickerOrderButtonClassName : tickerOrderButtonDisabledClassName}
                    >
                        Down
                    </button>
                    <button
                        type="button"
                        aria-label={`Remove message ${messageNumber}`}
                        onClick={() => {
                            onRemove(message.id);
                        }}
                        className="text-xs font-medium text-muted"
                    >
                        Remove
                    </button>
                </span>
            </div>
            <TickerMessageTextField
                index={index}
                messageNumber={messageNumber}
                text={message.text}
                onTextChange={(text) => {
                    onTextChange(message.id, text);
                }}
            />
        </div>
    );
}

function TickerContentFields({
    messages,
    direction,
    speed,
    onTickerSettingsChange,
}: TickerContentFieldsProps) {
    const [invalidSpeed, setInvalidSpeed] = useState<string | null>(null);
    const speedIssue = useFieldIssue("speed");
    const canAddMessage = messages.length < maximumTickerMessages;

    function handleTextChange(messageId: string, text: string) {
        const current = messages.find((message) => message.id === messageId);

        if (current === undefined || current.text === text) {
            return;
        }

        onTickerSettingsChange({
            messages: messages.map((message) => message.id === messageId ? { ...message, text } : message),
        });
    }

    function handleRemove(messageId: string) {
        onTickerSettingsChange({
            messages: messages.filter((message) => message.id !== messageId),
        });
    }

    function handleMove(index: number, offset: -1 | 1) {
        const nextMessages = moveTickerMessage(messages, index, offset);

        if (nextMessages === messages) {
            return;
        }

        onTickerSettingsChange({ messages: nextMessages });
    }

    function handleAdd() {
        if (!canAddMessage) {
            return;
        }

        const existingIds = new Set(messages.map((message) => message.id));

        onTickerSettingsChange({
            messages: [
                ...messages,
                {
                    id: createTickerMessageId(existingIds),
                    text: "",
                },
            ],
        });
    }

    function handleDirectionChange(event: ChangeEvent<HTMLSelectElement>) {
        if (!isTickerDirection(event.target.value) || event.target.value === direction) {
            return;
        }

        onTickerSettingsChange({ direction: event.target.value });
    }

    function handleSpeedChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        const nextSpeed = parseTickerSpeed(nextDraft);

        if (nextSpeed === null) {
            setInvalidSpeed(nextDraft);
            return;
        }

        setInvalidSpeed(null);

        if (nextSpeed !== speed) {
            onTickerSettingsChange({ speed: nextSpeed });
        }
    }

    return (
        <>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Direction</span>
                <span className="relative">
                    <select
                        aria-label="Ticker direction"
                        value={direction}
                        onChange={handleDirectionChange}
                        className={inspectorSelectClassName}
                    >
                        {tickerDirectionOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Speed (px/s)</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={minimumTickerSpeed}
                    max={maximumTickerSpeed}
                    step={1}
                    aria-label="Ticker speed in pixels per second"
                    aria-invalid={speedIssue !== null}
                    data-validation-path="speed"
                    value={invalidSpeed ?? String(speed)}
                    onChange={handleSpeedChange}
                    onBlur={() => {
                        setInvalidSpeed(null);
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, speedIssue)}
                />
                <FieldIssueNote message={speedIssue} />
            </label>
            {messages.length === 0 ? (
                <p className="text-sm text-muted">No messages.</p>
            ) : (
                messages.map((message, index) => (
                    <TickerMessageFields
                        key={message.id}
                        index={index}
                        message={message}
                        canMoveUp={index > 0}
                        canMoveDown={index < messages.length - 1}
                        onTextChange={handleTextChange}
                        onMove={handleMove}
                        onRemove={handleRemove}
                    />
                ))
            )}
            <button
                type="button"
                disabled={!canAddMessage}
                onClick={handleAdd}
                className={
                    canAddMessage
                        ? "h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-foreground"
                        : "h-9 cursor-not-allowed rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-muted opacity-60"
                }
            >
                Add message
            </button>
        </>
    );
}

const tickerFontFamilyLabels: Record<TickerFontFamily, string> = {
    sans: "Sans",
    serif: "Serif",
    mono: "Mono",
};

const tickerFontWeightLabels: Record<TickerFontWeight, string> = {
    400: "Regular",
    500: "Medium",
    600: "Semibold",
    700: "Bold",
};

function TickerStyleFields({
    backgroundColor,
    textColor,
    accentColor,
    borderRadius,
    fontFamily,
    fontSize,
    fontWeight,
    onTickerSettingsChange,
    onColorSessionEnd,
}: TickerStyleFieldsProps) {
    const [invalidRadius, setInvalidRadius] = useState<string | null>(null);
    const [invalidFontSize, setInvalidFontSize] = useState<string | null>(null);

    function handleRadiusChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        const radius = parseImageBorderRadius(nextDraft);

        if (radius === null) {
            setInvalidRadius(nextDraft);
            return;
        }

        setInvalidRadius(null);

        if (radius !== borderRadius) {
            onTickerSettingsChange({ borderRadius: radius });
        }
    }

    function handleFontFamilyChange(event: ChangeEvent<HTMLSelectElement>) {
        if (!isTickerFontFamily(event.target.value) || event.target.value === fontFamily) {
            return;
        }

        onTickerSettingsChange({ fontFamily: event.target.value });
    }

    function handleFontWeightChange(event: ChangeEvent<HTMLSelectElement>) {
        const weight = Number(event.target.value);

        if (!isTickerFontWeight(weight) || weight === fontWeight) {
            return;
        }

        onTickerSettingsChange({ fontWeight: weight });
    }

    function handleFontSizeChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;

        if (!/^\d+$/.test(nextDraft.trim())) {
            setInvalidFontSize(nextDraft);
            return;
        }

        const size = Number(nextDraft);

        if (!tickerFontSizeIsInRange(size)) {
            setInvalidFontSize(nextDraft);
            return;
        }

        setInvalidFontSize(null);

        if (size !== fontSize) {
            onTickerSettingsChange({ fontSize: size });
        }
    }

    return (
        <>
            <ColorField
                label="Background color"
                value={backgroundColor}
                onColorChange={(color) => {
                    onTickerSettingsChange({ backgroundColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <ColorField
                label="Text color"
                value={textColor}
                onColorChange={(color) => {
                    onTickerSettingsChange({ textColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <ColorField
                label="Accent color"
                value={accentColor}
                onColorChange={(color) => {
                    onTickerSettingsChange({ accentColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Font</span>
                <span className="relative">
                    <select
                        aria-label="Ticker font"
                        value={fontFamily}
                        onChange={handleFontFamilyChange}
                        className={inspectorSelectClassName}
                    >
                        {tickerFontFamilies.map((family) => (
                            <option key={family} value={family}>{tickerFontFamilyLabels[family]}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Font size</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={minimumTickerFontSize}
                    max={maximumTickerFontSize}
                    step={1}
                    aria-label="Ticker font size"
                    value={invalidFontSize ?? String(fontSize)}
                    onChange={handleFontSizeChange}
                    onBlur={() => {
                        setInvalidFontSize(null);
                    }}
                    className={inspectorFieldClassName}
                />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Font weight</span>
                <span className="relative">
                    <select
                        aria-label="Ticker font weight"
                        value={String(fontWeight)}
                        onChange={handleFontWeightChange}
                        className={inspectorSelectClassName}
                    >
                        {tickerFontWeights.map((weight) => (
                            <option key={weight} value={weight}>{tickerFontWeightLabels[weight]}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Border radius</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min={minimumImageBorderRadius}
                    max={maximumImageBorderRadius}
                    step="any"
                    aria-label="Border radius"
                    value={invalidRadius ?? String(borderRadius)}
                    onChange={handleRadiusChange}
                    onBlur={() => {
                        setInvalidRadius(null);
                    }}
                    className={inspectorFieldClassName}
                />
            </label>
        </>
    );
}

function SelectChevron() {
    return (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
            >
                <path d="m6 9 6 6 6-6" />
            </svg>
        </span>
    );
}

function PropertyField({ property }: PropertyFieldProps) {
    const validationPath = property.kind === "toggle" ? undefined : property.validationPath;
    const issue = useFieldIssue(validationPath);

    if (property.kind === "toggle") {
        const trackClassName = property.enabled
            ? "relative h-5 w-9 rounded-full bg-accent"
            : "relative h-5 w-9 rounded-full bg-surface-hover";
        const knobClassName = property.enabled
            ? "absolute top-0.5 right-0.5 size-4 rounded-full bg-white"
            : "absolute top-0.5 left-0.5 size-4 rounded-full bg-white";

        return (
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-secondary">{property.label}</span>
                <span className="inline-flex items-center gap-2 text-xs font-medium text-secondary">
                    {property.enabled ? "On" : "Off"}
                    <span className={trackClassName} aria-hidden="true">
                        <span className={knobClassName} />
                    </span>
                </span>
            </div>
        );
    }

    const inputClassName = property.kind === "select"
        ? "h-9 w-full rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none"
        : "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none";

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{property.label}</span>
            <span className="relative">
                <input
                    readOnly
                    value={property.value}
                    data-validation-path={validationPath}
                    aria-invalid={issue === null ? undefined : true}
                    className={invalidFieldClassName(inputClassName, issue)}
                />
                {property.kind === "select" ? (
                    <SelectChevron />
                ) : null}
            </span>
            <FieldIssueNote message={issue} />
        </label>
    );
}

const verticalFontFamilyLabels: Record<TickerFontFamily, string> = {
    sans: "Sans",
    serif: "Serif",
    mono: "Mono",
};

const verticalFontWeightLabels: Record<TickerFontWeight, string> = {
    400: "Regular",
    500: "Medium",
    600: "Semibold",
    700: "Bold",
};

type VerticalAnnouncementFieldsProps = {
    index: number;
    item: VerticalAnnouncementItem;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onItemChange: (itemId: string, patch: Partial<VerticalAnnouncementItem>) => void;
    onMove: (index: number, offset: -1 | 1) => void;
    onRemove: (itemId: string) => void;
};

type VerticalAnnouncementsContentFieldsProps = {
    items: VerticalAnnouncementItem[];
    speed: number;
    pauseSeconds: number;
    onVerticalAnnouncementsSettingsChange: (settings: Partial<VerticalAnnouncementsWidgetSettings>) => void;
};

type VerticalAnnouncementsStyleFieldsProps = {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
    fontFamily: TickerFontFamily;
    titleFontSize: number;
    descriptionFontSize: number;
    fontWeight: TickerFontWeight;
    onVerticalAnnouncementsSettingsChange: (
        settings: Partial<VerticalAnnouncementsWidgetSettings>,
        gesture?: "color",
    ) => void;
    onColorSessionEnd: () => void;
};

function nextVerticalAnnouncementId(): string {
    return `vertical-announcement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createVerticalAnnouncementId(existingIds: ReadonlySet<string>): string {
    const id = nextVerticalAnnouncementId();

    if (existingIds.has(id)) {
        return createVerticalAnnouncementId(existingIds);
    }

    return id;
}

function parseBoundedInteger(value: string, isInRange: (parsed: number) => boolean): number | null {
    if (!/^\d+$/.test(value.trim())) {
        return null;
    }

    const parsed = Number(value);

    if (!isInRange(parsed)) {
        return null;
    }

    return parsed;
}

function moveVerticalAnnouncement(
    items: VerticalAnnouncementItem[],
    index: number,
    offset: -1 | 1,
): VerticalAnnouncementItem[] {
    const nextIndex = index + offset;

    if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
    }

    const nextItems = items.slice();
    const [item] = nextItems.splice(index, 1);

    if (item === undefined) {
        return items;
    }

    nextItems.splice(nextIndex, 0, item);

    return nextItems;
}

function VerticalAnnouncementFields({
    index,
    item,
    canMoveUp,
    canMoveDown,
    onItemChange,
    onMove,
    onRemove,
}: VerticalAnnouncementFieldsProps) {
    const announcementNumber = index + 1;
    const labelIssue = useFieldIssue(`items.${index}.label`);
    const titleIssue = useFieldIssue(`items.${index}.title`);
    const descriptionIssue = useFieldIssue(`items.${index}.description`);

    return (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-secondary">
                    {`Announcement ${announcementNumber}`}
                </span>
                <span className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-label={`Move announcement ${announcementNumber} up`}
                        disabled={!canMoveUp}
                        onClick={() => {
                            onMove(index, -1);
                        }}
                        className={canMoveUp ? tickerOrderButtonClassName : tickerOrderButtonDisabledClassName}
                    >
                        Up
                    </button>
                    <button
                        type="button"
                        aria-label={`Move announcement ${announcementNumber} down`}
                        disabled={!canMoveDown}
                        onClick={() => {
                            onMove(index, 1);
                        }}
                        className={canMoveDown ? tickerOrderButtonClassName : tickerOrderButtonDisabledClassName}
                    >
                        Down
                    </button>
                    <button
                        type="button"
                        aria-label={`Remove announcement ${announcementNumber}`}
                        onClick={() => {
                            onRemove(item.id);
                        }}
                        className="text-xs font-medium text-muted"
                    >
                        Remove
                    </button>
                </span>
            </div>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Label</span>
                <input
                    dir="auto"
                    maxLength={maximumVerticalAnnouncementLabelLength}
                    aria-label={`Label for announcement ${announcementNumber}`}
                    aria-invalid={labelIssue !== null}
                    data-validation-path={`items.${index}.label`}
                    placeholder="Label"
                    value={item.label ?? ""}
                    onChange={(event) => {
                        onItemChange(item.id, { label: event.target.value });
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, labelIssue)}
                />
                <FieldIssueNote message={labelIssue} />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Title</span>
                <input
                    dir="auto"
                    maxLength={maximumVerticalAnnouncementTitleLength}
                    aria-label={`Title for announcement ${announcementNumber}`}
                    aria-invalid={titleIssue !== null}
                    data-validation-path={`items.${index}.title`}
                    placeholder="Announcement title"
                    value={item.title}
                    onChange={(event) => {
                        onItemChange(item.id, { title: event.target.value });
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, titleIssue)}
                />
                <FieldIssueNote message={titleIssue} />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Description</span>
                <textarea
                    dir="auto"
                    rows={3}
                    maxLength={maximumVerticalAnnouncementDescriptionLength}
                    aria-label={`Description for announcement ${announcementNumber}`}
                    aria-invalid={descriptionIssue !== null}
                    data-validation-path={`items.${index}.description`}
                    placeholder="Description"
                    value={item.description ?? ""}
                    onChange={(event) => {
                        onItemChange(item.id, { description: event.target.value });
                    }}
                    className={invalidFieldClassName(`${inspectorFieldClassName} h-auto py-2`, descriptionIssue)}
                />
                <FieldIssueNote message={descriptionIssue} />
            </label>
        </div>
    );
}

function VerticalAnnouncementsContentFields({
    items,
    speed,
    pauseSeconds,
    onVerticalAnnouncementsSettingsChange,
}: VerticalAnnouncementsContentFieldsProps) {
    const [invalidSpeed, setInvalidSpeed] = useState<string | null>(null);
    const [invalidPause, setInvalidPause] = useState<string | null>(null);
    const speedIssue = useFieldIssue("speed");
    const pauseIssue = useFieldIssue("pauseSeconds");
    const canAdd = items.length < maximumVerticalAnnouncements;

    function handleItemChange(itemId: string, patch: Partial<VerticalAnnouncementItem>) {
        const current = items.find((item) => item.id === itemId);

        if (current === undefined) {
            return;
        }

        const nextItem: VerticalAnnouncementItem = {
            ...current,
            ...patch,
        };

        if (
            nextItem.title === current.title
            && (nextItem.description ?? "") === (current.description ?? "")
            && (nextItem.label ?? "") === (current.label ?? "")
        ) {
            return;
        }

        onVerticalAnnouncementsSettingsChange({
            items: items.map((item) => item.id === itemId ? nextItem : item),
        });
    }

    function handleMove(index: number, offset: -1 | 1) {
        const nextItems = moveVerticalAnnouncement(items, index, offset);

        if (nextItems === items) {
            return;
        }

        onVerticalAnnouncementsSettingsChange({ items: nextItems });
    }

    function handleRemove(itemId: string) {
        onVerticalAnnouncementsSettingsChange({
            items: items.filter((item) => item.id !== itemId),
        });
    }

    function handleAdd() {
        if (!canAdd) {
            return;
        }

        const existingIds = new Set(items.map((item) => item.id));

        onVerticalAnnouncementsSettingsChange({
            items: [
                ...items,
                {
                    id: createVerticalAnnouncementId(existingIds),
                    title: "",
                    description: "",
                    label: "",
                },
            ],
        });
    }

    function handleSpeedChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        const nextSpeed = parseBoundedInteger(nextDraft, verticalAnnouncementSpeedIsInRange);

        if (nextSpeed === null) {
            setInvalidSpeed(nextDraft);
            return;
        }

        setInvalidSpeed(null);

        if (nextSpeed !== speed) {
            onVerticalAnnouncementsSettingsChange({ speed: nextSpeed });
        }
    }

    function handlePauseChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        const nextPause = parseBoundedInteger(nextDraft, verticalAnnouncementPauseIsInRange);

        if (nextPause === null) {
            setInvalidPause(nextDraft);
            return;
        }

        setInvalidPause(null);

        if (nextPause !== pauseSeconds) {
            onVerticalAnnouncementsSettingsChange({ pauseSeconds: nextPause });
        }
    }

    return (
        <>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Speed</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={minimumVerticalAnnouncementSpeed}
                    max={maximumVerticalAnnouncementSpeed}
                    step={1}
                    aria-label="Vertical announcements speed in pixels per second"
                    aria-invalid={speedIssue !== null}
                    data-validation-path="speed"
                    value={invalidSpeed ?? String(speed)}
                    onChange={handleSpeedChange}
                    onBlur={() => {
                        setInvalidSpeed(null);
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, speedIssue)}
                />
                <FieldIssueNote message={speedIssue} />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Pause</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={minimumVerticalAnnouncementPauseSeconds}
                    max={maximumVerticalAnnouncementPauseSeconds}
                    step={1}
                    aria-label="Pause on each announcement in seconds"
                    aria-invalid={pauseIssue !== null}
                    data-validation-path="pauseSeconds"
                    value={invalidPause ?? String(pauseSeconds)}
                    onChange={handlePauseChange}
                    onBlur={() => {
                        setInvalidPause(null);
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, pauseIssue)}
                />
                <FieldIssueNote message={pauseIssue} />
            </label>
            {items.length === 0 ? (
                <p className="text-sm text-muted">No announcements.</p>
            ) : (
                items.map((item, index) => (
                    <VerticalAnnouncementFields
                        key={item.id}
                        index={index}
                        item={item}
                        canMoveUp={index > 0}
                        canMoveDown={index < items.length - 1}
                        onItemChange={handleItemChange}
                        onMove={handleMove}
                        onRemove={handleRemove}
                    />
                ))
            )}
            <button
                type="button"
                disabled={!canAdd}
                onClick={handleAdd}
                className={
                    canAdd
                        ? "h-9 rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-foreground"
                        : "h-9 cursor-not-allowed rounded-control border border-border bg-surface-raised/40 px-3 text-sm font-medium text-muted opacity-60"
                }
            >
                Add announcement
            </button>
        </>
    );
}

function VerticalAnnouncementsStyleFields({
    backgroundColor,
    textColor,
    accentColor,
    borderRadius,
    fontFamily,
    titleFontSize,
    descriptionFontSize,
    fontWeight,
    onVerticalAnnouncementsSettingsChange,
    onColorSessionEnd,
}: VerticalAnnouncementsStyleFieldsProps) {
    const [invalidRadius, setInvalidRadius] = useState<string | null>(null);
    const [invalidTitleSize, setInvalidTitleSize] = useState<string | null>(null);
    const [invalidDescriptionSize, setInvalidDescriptionSize] = useState<string | null>(null);
    const backgroundIssue = useFieldIssue("backgroundColor");
    const textIssue = useFieldIssue("textColor");
    const accentIssue = useFieldIssue("accentColor");
    const fontIssue = useFieldIssue("fontFamily");
    const titleSizeIssue = useFieldIssue("titleFontSize");
    const descriptionSizeIssue = useFieldIssue("descriptionFontSize");
    const weightIssue = useFieldIssue("fontWeight");
    const radiusIssue = useFieldIssue("borderRadius");

    function handleRadiusChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        const radius = parseImageBorderRadius(nextDraft);

        if (radius === null) {
            setInvalidRadius(nextDraft);
            return;
        }

        setInvalidRadius(null);

        if (radius !== borderRadius) {
            onVerticalAnnouncementsSettingsChange({ borderRadius: radius });
        }
    }

    function handleFontFamilyChange(event: ChangeEvent<HTMLSelectElement>) {
        if (!isTickerFontFamily(event.target.value) || event.target.value === fontFamily) {
            return;
        }

        onVerticalAnnouncementsSettingsChange({ fontFamily: event.target.value });
    }

    function handleFontWeightChange(event: ChangeEvent<HTMLSelectElement>) {
        const weight = Number(event.target.value);

        if (!isTickerFontWeight(weight) || weight === fontWeight) {
            return;
        }

        onVerticalAnnouncementsSettingsChange({ fontWeight: weight });
    }

    function handleTitleSizeChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        const size = parseBoundedInteger(nextDraft, verticalAnnouncementTitleFontSizeIsInRange);

        if (size === null) {
            setInvalidTitleSize(nextDraft);
            return;
        }

        setInvalidTitleSize(null);

        if (size !== titleFontSize) {
            onVerticalAnnouncementsSettingsChange({ titleFontSize: size });
        }
    }

    function handleDescriptionSizeChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        const size = parseBoundedInteger(nextDraft, verticalAnnouncementDescriptionFontSizeIsInRange);

        if (size === null) {
            setInvalidDescriptionSize(nextDraft);
            return;
        }

        setInvalidDescriptionSize(null);

        if (size !== descriptionFontSize) {
            onVerticalAnnouncementsSettingsChange({ descriptionFontSize: size });
        }
    }

    return (
        <>
            <ColorField
                label="Background color"
                value={backgroundColor}
                validationPath="backgroundColor"
                issueMessage={backgroundIssue}
                onColorChange={(color) => {
                    onVerticalAnnouncementsSettingsChange({ backgroundColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <ColorField
                label="Text color"
                value={textColor}
                validationPath="textColor"
                issueMessage={textIssue}
                onColorChange={(color) => {
                    onVerticalAnnouncementsSettingsChange({ textColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <ColorField
                label="Accent"
                hint="Marker beside each announcement."
                value={accentColor}
                validationPath="accentColor"
                issueMessage={accentIssue}
                onColorChange={(color) => {
                    onVerticalAnnouncementsSettingsChange({ accentColor: color }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Font</span>
                <span className="relative">
                    <select
                        aria-label="Vertical announcements font"
                        aria-invalid={fontIssue !== null}
                        data-validation-path="fontFamily"
                        value={fontFamily}
                        onChange={handleFontFamilyChange}
                        className={invalidFieldClassName(inspectorSelectClassName, fontIssue)}
                    >
                        {tickerFontFamilies.map((family) => (
                            <option key={family} value={family}>{verticalFontFamilyLabels[family]}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
                <FieldIssueNote message={fontIssue} />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Title size</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={minimumVerticalAnnouncementTitleFontSize}
                    max={maximumVerticalAnnouncementTitleFontSize}
                    step={1}
                    aria-label="Announcement title font size"
                    aria-invalid={titleSizeIssue !== null}
                    data-validation-path="titleFontSize"
                    value={invalidTitleSize ?? String(titleFontSize)}
                    onChange={handleTitleSizeChange}
                    onBlur={() => {
                        setInvalidTitleSize(null);
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, titleSizeIssue)}
                />
                <FieldIssueNote message={titleSizeIssue} />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Description size</span>
                <input
                    type="number"
                    inputMode="numeric"
                    min={minimumVerticalAnnouncementDescriptionFontSize}
                    max={maximumVerticalAnnouncementDescriptionFontSize}
                    step={1}
                    aria-label="Announcement description font size"
                    aria-invalid={descriptionSizeIssue !== null}
                    data-validation-path="descriptionFontSize"
                    value={invalidDescriptionSize ?? String(descriptionFontSize)}
                    onChange={handleDescriptionSizeChange}
                    onBlur={() => {
                        setInvalidDescriptionSize(null);
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, descriptionSizeIssue)}
                />
                <FieldIssueNote message={descriptionSizeIssue} />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Font weight</span>
                <span className="relative">
                    <select
                        aria-label="Vertical announcements font weight"
                        aria-invalid={weightIssue !== null}
                        data-validation-path="fontWeight"
                        value={String(fontWeight)}
                        onChange={handleFontWeightChange}
                        className={invalidFieldClassName(inspectorSelectClassName, weightIssue)}
                    >
                        {tickerFontWeights.map((weight) => (
                            <option key={weight} value={weight}>{verticalFontWeightLabels[weight]}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
                <FieldIssueNote message={weightIssue} />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Border radius</span>
                <input
                    type="number"
                    inputMode="decimal"
                    min={minimumImageBorderRadius}
                    max={maximumImageBorderRadius}
                    step="any"
                    aria-label="Vertical announcements border radius"
                    aria-invalid={radiusIssue !== null}
                    data-validation-path="borderRadius"
                    value={invalidRadius ?? String(borderRadius)}
                    onChange={handleRadiusChange}
                    onBlur={() => {
                        setInvalidRadius(null);
                    }}
                    className={invalidFieldClassName(inspectorFieldClassName, radiusIssue)}
                />
                <FieldIssueNote message={radiusIssue} />
            </label>
        </>
    );
}

function DraftIssueSummary({
    issues,
    focusedIndex,
    onFocusedIndexChange,
}: {
    issues: DraftFieldIssue[];
    focusedIndex: number;
    onFocusedIndexChange: (index: number) => void;
}) {
    const focused = issues[focusedIndex] ?? null;
    const summary = focused === null
        ? "Some fields need attention."
        : issues.length === 1
            ? focused.message
            : `${issues.length} fields need attention`;

    return (
        <div className="border-b border-danger-border bg-danger/10 px-4 py-3">
            <p className="text-sm text-danger">{summary}</p>
            {focused !== null && issues.length > 1 ? (
                <p className="mt-1 text-xs text-secondary">{focused.message}</p>
            ) : null}
            {issues.length > 1 ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-secondary">
                        {`${focusedIndex + 1} of ${issues.length}`}
                    </span>
                    <span className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onFocusedIndexChange(focusedIndex - 1);
                            }}
                            className="text-xs font-medium text-foreground"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onFocusedIndexChange(focusedIndex + 1);
                            }}
                            className="text-xs font-medium text-foreground"
                        >
                            Next
                        </button>
                    </span>
                </div>
            ) : null}
        </div>
    );
}

function PropertiesPanel({
    selectedWidget,
    onTextChange,
    onTextToneChange,
    onTextSizeChange,
    onClockSettingsChange,
    onImageSettingsChange,
    onInformationCardSettingsChange,
    onAnnouncementsSettingsChange,
    onTickerSettingsChange,
    onVerticalAnnouncementsSettingsChange,
    onColorSessionEnd,
    onDeleteWidget,
    draftIssues,
    focusedIssueIndex,
    onFocusedIssueIndexChange,
}: PropertiesPanelProps) {
    const panelRef = useRef<HTMLElement>(null);
    const [tabOverride, setTabOverride] = useState<PropertyTabName | null>(null);
    const [trackedFocusKey, setTrackedFocusKey] = useState("");
    const focusedIssue = draftIssues[focusedIssueIndex] ?? null;
    const focusKey = focusedIssue === null ? "" : `${focusedIssueIndex}:${focusedIssue.path}`;

    if (focusKey !== "" && focusKey !== trackedFocusKey) {
        setTrackedFocusKey(focusKey);
        setTabOverride(null);
    }

    const guidedTab = focusedIssue !== null && focusedIssue.widgetId === selectedWidget?.id
        ? focusedIssue.tab
        : null;
    const activeTab = tabOverride ?? guidedTab ?? "Content";
    const widgetIssues = selectedWidget === null
        ? []
        : draftIssues.filter((issue) => issue.widgetId === selectedWidget.id);

    useLayoutEffect(() => {
        if (focusedIssue === null || focusedIssue.widgetId !== selectedWidget?.id) {
            return;
        }

        const field = panelRef.current?.querySelector<HTMLElement>(
            `[data-validation-path="${CSS.escape(focusedIssue.fieldPath)}"]`,
        );

        if (field === null || field === undefined) {
            return;
        }

        field.scrollIntoView({ block: "center" });
        field.focus({ preventScroll: true });
    }, [activeTab, focusedIssue, selectedWidget?.id]);
    const properties = selectedWidget === null ? [] : propertiesForTab(selectedWidget, activeTab);
    const editingText = selectedWidget?.type === "text" && activeTab === "Content";
    const editingTextStyle = selectedWidget?.type === "text" && activeTab === "Style";
    const editingClock = selectedWidget?.type === "clock" && activeTab === "Content";
    const editingClockStyle = selectedWidget?.type === "clock" && activeTab === "Style";
    const editingImage = selectedWidget?.type === "image" && activeTab === "Content";
    const editingImageStyle = selectedWidget?.type === "image" && activeTab === "Style";
    const editingInformationCard = selectedWidget?.type === "information-card" && activeTab === "Content";
    const editingInformationCardStyle = selectedWidget?.type === "information-card" && activeTab === "Style";
    const editingAnnouncements = selectedWidget?.type === "announcements" && activeTab === "Content";
    const editingAnnouncementsStyle = selectedWidget?.type === "announcements" && activeTab === "Style";
    const editingTicker = selectedWidget?.type === "ticker" && activeTab === "Content";
    const editingTickerStyle = selectedWidget?.type === "ticker" && activeTab === "Style";
    const editingVerticalAnnouncements = selectedWidget?.type === "vertical-announcements" && activeTab === "Content";
    const editingVerticalAnnouncementsStyle = selectedWidget?.type === "vertical-announcements" && activeTab === "Style";
    const showingReadOnlyProperties = !editingText
        && !editingTextStyle
        && !editingClock
        && !editingClockStyle
        && !editingImage
        && !editingImageStyle
        && !editingInformationCard
        && !editingInformationCardStyle
        && !editingAnnouncements
        && !editingAnnouncementsStyle
        && !editingTicker
        && !editingTickerStyle
        && !editingVerticalAnnouncements
        && !editingVerticalAnnouncementsStyle
        && properties.length > 0;

    return (
        <aside ref={panelRef} className="flex w-80 shrink-0 flex-col border-l border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
                <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Properties
                </h2>
            </div>

            <div className="flex gap-1 border-b border-border px-3 py-2">
                {propertyTabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        aria-selected={tab === activeTab}
                        onClick={() => {
                            setTabOverride(tab);
                        }}
                        className={
                            tab === activeTab
                                ? "rounded-control bg-surface-raised px-3 py-1.5 text-sm font-medium text-foreground"
                                : "rounded-control px-3 py-1.5 text-sm font-medium text-muted"
                        }
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {draftIssues.length > 0 ? (
                <DraftIssueSummary
                    issues={draftIssues}
                    focusedIndex={focusedIssueIndex}
                    onFocusedIndexChange={onFocusedIssueIndexChange}
                />
            ) : null}
            <DraftFieldIssueContext.Provider value={widgetIssues}>
            {selectedWidget === null ? (
                <div className="flex flex-col gap-2 p-4">
                    <h3 className="text-sm font-semibold text-foreground">No widget selected</h3>
                    <p className="text-sm leading-5 text-muted">
                        Select a widget on the canvas to view its properties.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4 overflow-y-auto p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            {widgetTypeLabel(selectedWidget.type)}
                        </h3>
                        <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 text-xs font-medium text-cyan">
                            Widget
                        </span>
                    </div>
                    {editingText && selectedWidget.type === "text" ? (
                        <TextContentField
                            value={selectedWidget.settings.text}
                            onTextChange={onTextChange}
                        />
                    ) : null}
                    {editingTextStyle && selectedWidget.type === "text" ? (
                        <TextStyleFields
                            tone={selectedWidget.settings.tone}
                            size={selectedWidget.settings.size}
                            onToneChange={onTextToneChange}
                            onSizeChange={onTextSizeChange}
                        />
                    ) : null}
                    {editingClock && selectedWidget.type === "clock" ? (
                        <ClockContentFields
                            timeZone={selectedWidget.settings.timeZone}
                            showDate={selectedWidget.settings.showDate}
                            showSeconds={selectedWidget.settings.showSeconds}
                            onClockSettingsChange={onClockSettingsChange}
                        />
                    ) : null}
                    {editingClockStyle && selectedWidget.type === "clock" ? (
                        <ClockStyleFields
                            align={selectedWidget.settings.align}
                            onClockSettingsChange={onClockSettingsChange}
                        />
                    ) : null}
                    {editingImage && selectedWidget.type === "image" ? (
                        <ImageContentFields
                            key={selectedWidget.id}
                            source={selectedWidget.settings.src}
                            alt={selectedWidget.settings.alt}
                            onImageSettingsChange={onImageSettingsChange}
                        />
                    ) : null}
                    {editingImageStyle && selectedWidget.type === "image" ? (
                        <ImageStyleFields
                            key={selectedWidget.id}
                            objectFit={selectedWidget.settings.objectFit}
                            borderRadius={selectedWidget.settings.borderRadius}
                            onImageSettingsChange={onImageSettingsChange}
                        />
                    ) : null}
                    {editingInformationCard && selectedWidget.type === "information-card" ? (
                        <InformationCardContentFields
                            key={selectedWidget.id}
                            title={selectedWidget.settings.title}
                            subtitle={selectedWidget.settings.subtitle ?? ""}
                            description={selectedWidget.settings.description ?? ""}
                            badge={selectedWidget.settings.badge ?? ""}
                            imageSrc={selectedWidget.settings.imageSrc ?? ""}
                            onInformationCardSettingsChange={onInformationCardSettingsChange}
                        />
                    ) : null}
                    {editingInformationCardStyle && selectedWidget.type === "information-card" ? (
                        <InformationCardStyleFields
                            key={selectedWidget.id}
                            backgroundColor={selectedWidget.settings.backgroundColor}
                            textColor={selectedWidget.settings.textColor}
                            borderRadius={selectedWidget.settings.borderRadius}
                            onInformationCardSettingsChange={onInformationCardSettingsChange}
                            onColorSessionEnd={onColorSessionEnd}
                        />
                    ) : null}
                    {editingAnnouncements && selectedWidget.type === "announcements" ? (
                        <AnnouncementsContentFields
                            key={selectedWidget.id}
                            title={selectedWidget.settings.title}
                            items={selectedWidget.settings.items}
                            onAnnouncementsSettingsChange={onAnnouncementsSettingsChange}
                        />
                    ) : null}
                    {editingAnnouncementsStyle && selectedWidget.type === "announcements" ? (
                        <AnnouncementsStyleFields
                            key={selectedWidget.id}
                            backgroundColor={selectedWidget.settings.backgroundColor}
                            textColor={selectedWidget.settings.textColor}
                            borderRadius={selectedWidget.settings.borderRadius}
                            onAnnouncementsSettingsChange={onAnnouncementsSettingsChange}
                            onColorSessionEnd={onColorSessionEnd}
                        />
                    ) : null}
                    {editingTicker && selectedWidget.type === "ticker" ? (
                        <TickerContentFields
                            key={selectedWidget.id}
                            messages={selectedWidget.settings.messages}
                            direction={selectedWidget.settings.direction}
                            speed={selectedWidget.settings.speed}
                            onTickerSettingsChange={onTickerSettingsChange}
                        />
                    ) : null}
                    {editingTickerStyle && selectedWidget.type === "ticker" ? (
                        <TickerStyleFields
                            key={selectedWidget.id}
                            backgroundColor={selectedWidget.settings.backgroundColor}
                            textColor={selectedWidget.settings.textColor}
                            accentColor={selectedWidget.settings.accentColor}
                            borderRadius={selectedWidget.settings.borderRadius}
                            fontFamily={selectedWidget.settings.fontFamily ?? defaultTickerFontFamily}
                            fontSize={selectedWidget.settings.fontSize ?? defaultTickerFontSize}
                            fontWeight={selectedWidget.settings.fontWeight ?? defaultTickerFontWeight}
                            onTickerSettingsChange={onTickerSettingsChange}
                            onColorSessionEnd={onColorSessionEnd}
                        />
                    ) : null}
                    {editingVerticalAnnouncements && selectedWidget.type === "vertical-announcements" ? (
                        <VerticalAnnouncementsContentFields
                            key={selectedWidget.id}
                            items={selectedWidget.settings.items}
                            speed={selectedWidget.settings.speed}
                            pauseSeconds={selectedWidget.settings.pauseSeconds ?? defaultVerticalAnnouncementPauseSeconds}
                            onVerticalAnnouncementsSettingsChange={onVerticalAnnouncementsSettingsChange}
                        />
                    ) : null}
                    {editingVerticalAnnouncementsStyle && selectedWidget.type === "vertical-announcements" ? (
                        <VerticalAnnouncementsStyleFields
                            key={selectedWidget.id}
                            backgroundColor={selectedWidget.settings.backgroundColor}
                            textColor={selectedWidget.settings.textColor}
                            accentColor={selectedWidget.settings.accentColor}
                            borderRadius={selectedWidget.settings.borderRadius}
                            fontFamily={selectedWidget.settings.fontFamily ?? defaultVerticalAnnouncementFontFamily}
                            titleFontSize={selectedWidget.settings.titleFontSize ?? defaultVerticalAnnouncementTitleFontSize}
                            descriptionFontSize={selectedWidget.settings.descriptionFontSize ?? defaultVerticalAnnouncementDescriptionFontSize}
                            fontWeight={selectedWidget.settings.fontWeight ?? defaultVerticalAnnouncementFontWeight}
                            onVerticalAnnouncementsSettingsChange={onVerticalAnnouncementsSettingsChange}
                            onColorSessionEnd={onColorSessionEnd}
                        />
                    ) : null}
                    {!editingTextStyle && !editingClockStyle && !editingImageStyle && !editingInformationCardStyle && !editingAnnouncementsStyle && !editingTickerStyle && !editingVerticalAnnouncementsStyle && activeTab === "Style" && properties.length === 0 ? (
                        <p className="text-sm text-muted">No style properties.</p>
                    ) : null}
                    {showingReadOnlyProperties ? (
                        properties.map((property) => (
                            <PropertyField key={property.label} property={property} />
                        ))
                    ) : null}
                    <div className="border-t border-border pt-4">
                        <button
                            type="button"
                            onClick={onDeleteWidget}
                            className="h-9 w-full rounded-control border border-danger-border bg-surface-raised text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger/10"
                        >
                            Delete Widget
                        </button>
                    </div>
                </div>
            )}
            </DraftFieldIssueContext.Provider>
        </aside>
    );
}

export default PropertiesPanel;
