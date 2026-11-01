import { useEffect, useState, type ChangeEvent } from "react";
import {
    listMediaAssets,
    mediaAssetIdFromSource,
    resolveBoardImageSource,
    type MediaAsset,
} from "../../media/api/mediaApi.ts";
import MediaManagerDialog from "../../media/components/MediaManagerDialog.tsx";
import type {
    AnnouncementIconName,
    AnnouncementItem,
    AnnouncementsWidgetSettings,
    ClockWidgetSettings,
    ImageWidgetSettings,
    InformationCardWidgetSettings,
    TextWidgetSettings,
    Widget,
} from "../../boards/types/boardTypes.ts";
import { clockTimeZones } from "../clockTimeZones.ts";
import { hexColorInputValue, normalizeCssColor } from "../cssColor.ts";
import {
    imageObjectFitOptions,
    maximumImageBorderRadius,
    minimumImageBorderRadius,
    normalizeImageSource,
    parseImageBorderRadius,
} from "../imageSettings.ts";

type PropertiesPanelProps = {
    selectedWidget: Widget | null;
    onTextChange: (text: string) => void;
    onTextToneChange: (tone: TextWidgetSettings["tone"]) => void;
    onTextSizeChange: (size: TextWidgetSettings["size"]) => void;
    onClockSettingsChange: (settings: Partial<ClockWidgetSettings>) => void;
    onImageSettingsChange: (settings: Partial<ImageWidgetSettings>) => void;
    onInformationCardSettingsChange: (settings: Partial<InformationCardWidgetSettings>) => void;
    onAnnouncementsSettingsChange: (settings: Partial<AnnouncementsWidgetSettings>) => void;
    onDeleteWidget: () => void;
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
    onInformationCardSettingsChange: (settings: Partial<InformationCardWidgetSettings>) => void;
};

type CardColorFieldProps = {
    label: string;
    value: string;
    onColorChange: (color: string) => void;
};

type CardTextFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
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
    onAnnouncementsSettingsChange: (settings: Partial<AnnouncementsWidgetSettings>) => void;
};

type AnnouncementItemFieldsProps = {
    index: number;
    item: AnnouncementItem;
    onItemChange: (itemId: string, item: AnnouncementItem) => void;
    onRemove: (itemId: string) => void;
};

const inspectorFieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none";
const inspectorSelectClassName = "h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none";

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
            return [];
    }
}

function positionProperties(widget: Widget): Property[] {
    return [
        { kind: "text", label: "X", value: String(widget.layout.x) },
        { kind: "text", label: "Y", value: String(widget.layout.y) },
        { kind: "text", label: "Width", value: String(widget.layout.width) },
        { kind: "text", label: "Height", value: String(widget.layout.height) },
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
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Text</span>
            <textarea
                value={value}
                rows={4}
                onChange={(event) => {
                    onTextChange(event.target.value);
                }}
                className="min-h-24 w-full resize-y rounded-control border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none"
            />
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
}: CardTextFieldProps) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <input
                value={value}
                onChange={(event) => {
                    onChange(event.target.value);
                }}
                className={inspectorFieldClassName}
            />
        </label>
    );
}

function CardImageSourceField({
    source,
    onInformationCardSettingsChange,
}: CardImageSourceFieldProps) {
    const [sourceDraft, setSourceDraft] = useState(source);

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
                spellCheck={false}
                autoComplete="off"
                onChange={handleSourceChange}
                onBlur={handleSourceBlur}
                className={inspectorFieldClassName}
            />
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
                value={title}
                onChange={(value) => {
                    onInformationCardSettingsChange({ title: value });
                }}
            />
            <CardTextField
                label="Subtitle"
                value={subtitle}
                onChange={(value) => {
                    onInformationCardSettingsChange({ subtitle: value });
                }}
            />
            <CardTextField
                label="Description"
                value={description}
                onChange={(value) => {
                    onInformationCardSettingsChange({ description: value });
                }}
            />
            <CardTextField
                label="Badge"
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

function CardColorField({ label, value, onColorChange }: CardColorFieldProps) {
    const [draft, setDraft] = useState(value);

    function handleDraftChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        setDraft(nextDraft);

        if (nextDraft !== nextDraft.trim() && nextDraft.trim().length > 0) {
            return;
        }

        const color = normalizeCssColor(nextDraft);

        if (color === null || color === value) {
            return;
        }

        onColorChange(color);

        if (color !== nextDraft) {
            setDraft(color);
        }
    }

    function handleDraftBlur() {
        if (normalizeCssColor(draft) === null) {
            setDraft(value);
        }
    }

    function handlePickerChange(event: ChangeEvent<HTMLInputElement>) {
        const color = normalizeCssColor(event.target.value);

        if (color === null) {
            return;
        }

        setDraft(color);

        if (color !== value) {
            onColorChange(color);
        }
    }

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    aria-label={`${label} picker`}
                    value={hexColorInputValue(value)}
                    onChange={handlePickerChange}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-control border border-border bg-surface-raised p-1"
                />
                <input
                    aria-label={label}
                    value={draft}
                    spellCheck={false}
                    onChange={handleDraftChange}
                    onBlur={handleDraftBlur}
                    className={`${inspectorFieldClassName} min-w-0 flex-1`}
                />
            </div>
        </div>
    );
}

function InformationCardStyleFields({
    backgroundColor,
    textColor,
    borderRadius,
    onInformationCardSettingsChange,
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
            <CardColorField
                label="Background color"
                value={backgroundColor}
                onColorChange={(color) => {
                    onInformationCardSettingsChange({ backgroundColor: color });
                }}
            />
            <CardColorField
                label="Text color"
                value={textColor}
                onColorChange={(color) => {
                    onInformationCardSettingsChange({ textColor: color });
                }}
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
            <CardColorField
                label="Background color"
                value={backgroundColor}
                onColorChange={(color) => {
                    onAnnouncementsSettingsChange({ backgroundColor: color });
                }}
            />
            <CardColorField
                label="Text color"
                value={textColor}
                onColorChange={(color) => {
                    onAnnouncementsSettingsChange({ textColor: color });
                }}
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
                    className={inputClassName}
                />
                {property.kind === "select" ? (
                    <SelectChevron />
                ) : null}
            </span>
        </label>
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
    onDeleteWidget,
}: PropertiesPanelProps) {
    const [activeTab, setActiveTab] = useState<PropertyTabName>("Content");
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
        && properties.length > 0;

    return (
        <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-surface">
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
                            setActiveTab(tab);
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
                        />
                    ) : null}
                    {!editingTextStyle && !editingClockStyle && !editingImageStyle && !editingInformationCardStyle && !editingAnnouncementsStyle && activeTab === "Style" && properties.length === 0 ? (
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
        </aside>
    );
}

export default PropertiesPanel;
