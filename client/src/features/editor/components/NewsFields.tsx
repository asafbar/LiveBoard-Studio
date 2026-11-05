import { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type {
    NewsAlign,
    NewsDirection,
    NewsFontFamily,
    NewsFontWeight,
    NewsPreset,
    NewsRefreshMinutes,
    NewsScrollDirection,
    NewsWidgetSettings,
    WidgetLayout,
} from "../../boards/types/boardTypes.ts";
import {
    effectiveNewsFontSize,
    effectiveNewsPadding,
    effectiveNewsTitleFontSize,
    effectiveNewsTitleSpacing,
    newsCategoriesForSource,
    newsCategoryLabel,
    newsPresetFit,
    newsPresetLabel,
    newsPresets,
    resolveNewsDirection,
    maximumNewsTitleSpacing,
} from "../../boards/news/newsPresentation.ts";
import {
    defaultNewsScrollSpeed,
    maximumNewsScrollSpeed,
    minimumNewsScrollSpeed,
    resolveNewsScrollSpeed,
    resolveScrollDirection,
    resolveTickerMotion,
} from "../../boards/news/newsMotion.ts";
import { newsRefreshChoices, resolveNewsRefreshMinutes } from "../../boards/news/newsSchedule.ts";
import { defaultNewsSettings } from "../../boards/news/newsDefaults.ts";
import {
    initialNewsStyleSections,
    newsStyleSections,
    toggleNewsStyleSection,
    type NewsStyleSectionId,
} from "../newsStyleSections.ts";
import {
    maximumImageBorderRadius,
    minimumImageBorderRadius,
    parseImageBorderRadius,
} from "../imageSettings.ts";
import ColorAlphaField from "./ColorAlphaField.tsx";
import {
    maximumNewsFontSize,
    maximumNewsHeadlines,
    maximumNewsPadding,
    maximumNewsRotationSeconds,
    maximumNewsTitleFontSize,
    maximumNewsTitleLength,
    minimumNewsFontSize,
    minimumNewsHeadlines,
    minimumNewsRotationSeconds,
    minimumNewsTitleFontSize,
    type NewsSettingsPatch,
} from "../newsSettings.ts";

type NewsContentFieldsProps = {
    settings: NewsWidgetSettings;
    frame: WidgetLayout;
    onNewsSettingsChange: (patch: NewsSettingsPatch, gesture?: "color" | null) => void;
};

type NewsStyleFieldsProps = NewsContentFieldsProps;

type LabeledOption<Value extends string> = {
    value: Value;
    label: string;
};

const selectClassName = "h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none";

const directionOptions: LabeledOption<NewsDirection>[] = [
    { value: "auto", label: "Auto" },
    { value: "ltr", label: "Left to right" },
    { value: "rtl", label: "Right to left" },
];

const scrollDirectionOptions: LabeledOption<NewsScrollDirection>[] = [
    { value: "ltr", label: "Left to right" },
    { value: "rtl", label: "Right to left" },
];

const alignmentOptions: LabeledOption<"left" | "center" | "right">[] = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
];

const fontOptions: LabeledOption<NewsFontFamily | "">[] = [
    { value: "", label: "Default" },
    { value: "sans", label: "Sans" },
    { value: "serif", label: "Serif" },
    { value: "mono", label: "Mono" },
];

const weightOptions: LabeledOption<`${NewsFontWeight}` | "">[] = [
    { value: "", label: "Default" },
    { value: "400", label: "Regular" },
    { value: "500", label: "Medium" },
    { value: "600", label: "Semibold" },
    { value: "700", label: "Bold" },
];

function NewsContentFields({ settings, frame, onNewsSettingsChange }: NewsContentFieldsProps) {
    const fit = newsPresetFit(settings, frame);

    return (
        <>
            <ChoiceField
                label="Source"
                hint="Walla and Ynet stay unavailable until public display is approved."
                value={settings.source}
                options={[
                    { value: "sample", label: "Sample headlines" },
                    { value: "usgs", label: "Live Earthquake Updates (USGS)" },
                ]}
                onChange={(source) => {
                    if (source === "usgs") {
                        onNewsSettingsChange({ source, category: "earthquakes", direction: "ltr" });
                        return;
                    }

                    onNewsSettingsChange({
                        source,
                        ...(settings.category === "earthquakes" ? { category: "israel" as const } : {}),
                    });
                }}
            />
            <ChoiceField
                label="Category"
                value={settings.category}
                options={newsCategoriesForSource(settings.source).map((category) => ({
                    value: category,
                    label: newsCategoryLabel(category),
                }))}
                onChange={(category) => {
                    onNewsSettingsChange({ category });
                }}
            />
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Title</span>
                <input
                    type="text"
                    value={settings.title ?? ""}
                    maxLength={maximumNewsTitleLength}
                    aria-label="Title"
                    onChange={(event) => {
                        onNewsSettingsChange({ title: event.target.value });
                    }}
                    className="h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none"
                />
            </label>
            <NumberField
                label="Maximum headlines"
                hint="How many headlines the widget requests."
                value={settings.maxHeadlines}
                minimum={minimumNewsHeadlines}
                maximum={maximumNewsHeadlines}
                commitOnInput
                onChange={(maxHeadlines) => {
                    if (maxHeadlines !== null) {
                        onNewsSettingsChange({ maxHeadlines });
                    }
                }}
            />
            {settings.preset === "ticker" ? (
                <ChoiceField
                    label="Ticker motion"
                    hint="Continuous scroll moves the full Hebrew line. Slide pauses, then changes the headline."
                    value={resolveTickerMotion(settings.tickerMotion)}
                    options={[
                        { value: "scroll", label: "Continuous scroll" },
                        { value: "slide", label: "Slide between headlines" },
                    ]}
                    onChange={(tickerMotion) => {
                        onNewsSettingsChange({ tickerMotion });
                    }}
                />
            ) : null}
            {settings.preset === "ticker" && resolveTickerMotion(settings.tickerMotion) === "scroll" ? (
                <ChoiceField
                    label="Scroll direction"
                    hint="Moves the ticker line. It does not reverse the letters."
                    value={resolveScrollDirection(
                        settings.scrollDirection,
                        resolveNewsDirection(settings, settings.title ?? ""),
                    )}
                    options={scrollDirectionOptions}
                    onChange={(scrollDirection) => {
                        onNewsSettingsChange({ scrollDirection });
                    }}
                />
            ) : null}
            {settings.preset === "ticker" && resolveTickerMotion(settings.tickerMotion) === "scroll" ? (
                <NumberField
                    label="Scroll speed"
                    hint="Pixels per second. A long Hebrew headline keeps moving until it has fully passed."
                    value={settings.scrollSpeed}
                    fallback={defaultNewsScrollSpeed}
                    minimum={minimumNewsScrollSpeed}
                    maximum={maximumNewsScrollSpeed}
                    commitOnInput
                    resetLabel={settings.scrollSpeed === undefined ? undefined : "Reset speed"}
                    onReset={() => {
                        onNewsSettingsChange({ scrollSpeed: null });
                    }}
                    onChange={(scrollSpeed) => {
                        onNewsSettingsChange({ scrollSpeed });
                    }}
                />
            ) : null}
            {settings.preset === "list" || (settings.preset === "ticker" && resolveTickerMotion(settings.tickerMotion) === "scroll") ? null : (
                <NumberField
                    label={settings.preset === "cards" ? "Crossfade interval" : "Slide interval"}
                    hint={settings.preset === "cards"
                        ? "Seconds between card headlines. The card fades from one headline to the next."
                        : "Seconds the headline stays before the next one slides in."}
                    value={settings.rotationSeconds}
                    minimum={minimumNewsRotationSeconds}
                    maximum={maximumNewsRotationSeconds}
                    commitOnInput
                    onChange={(rotationSeconds) => {
                        if (rotationSeconds !== null) {
                            onNewsSettingsChange({ rotationSeconds });
                        }
                    }}
                />
            )}
            {settings.preset === "ticker" && resolveTickerMotion(settings.tickerMotion) === "scroll" ? (
                <p className="text-xs text-muted">Effective speed: {resolveNewsScrollSpeed(settings.scrollSpeed)} px/s</p>
            ) : null}
            {fit.message !== null ? <p className="text-xs text-secondary">{fit.message}</p> : null}
        </>
    );
}

function NewsStyleFields({
    settings,
    frame,
    onNewsSettingsChange,
    onColorSessionEnd,
}: NewsStyleFieldsProps & { onColorSessionEnd: () => void }) {
    const [openSections, setOpenSections] = useState(initialNewsStyleSections);
    const contentAlign = physicalAlign(settings.align);
    const titleAlign = settings.titleAlign === undefined ? "" : physicalAlign(settings.titleAlign);
    const refreshValue = String(resolveNewsRefreshMinutes(settings.refreshIntervalMinutes)) as `${NewsRefreshMinutes}`;

    function toggleSection(id: NewsStyleSectionId) {
        setOpenSections((current) => toggleNewsStyleSection(current, id));
    }

    return (
        <div className="flex flex-col gap-2">
            <NewsStyleSection id="design" open={openSections.design} onToggle={() => toggleSection("design")}>
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted">Design</span>
                    <div className="grid grid-cols-3 gap-1.5">
                        {newsPresets.map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                aria-pressed={settings.preset === preset}
                                onClick={() => {
                                    onNewsSettingsChange({ preset });
                                }}
                                className={settings.preset === preset
                                    ? "flex flex-col gap-1 rounded-control border border-accent bg-accent/15 p-1.5 text-left text-foreground"
                                    : "flex flex-col gap-1 rounded-control border border-border bg-surface-raised p-1.5 text-left text-foreground"}
                            >
                                <PresetThumbnail preset={preset} />
                                <span className="px-0.5 text-[11px] leading-4">{newsPresetLabel(preset)}</span>
                            </button>
                        ))}
                    </div>
                    {newsPresetFit(settings, frame).message !== null ? (
                        <p className="text-xs text-secondary">{newsPresetFit(settings, frame).message}</p>
                    ) : null}
                </div>
                <ChoiceField
                    label="Text direction"
                    hint="Sets the reading order of the text. Scroll direction moves the ticker."
                    value={settings.direction ?? "rtl"}
                    options={directionOptions}
                    onChange={(direction) => {
                        onNewsSettingsChange({ direction });
                    }}
                />
                <AlignField
                    label="Content alignment"
                    hint="Places the headlines on the left, in the center, or on the right."
                    value={contentAlign}
                    onChange={(align) => {
                        onNewsSettingsChange({ align });
                    }}
                />
                <AlignField
                    label="Title alignment"
                    hint="The title can follow the content or sit on its own side."
                    value={titleAlign === "" ? null : titleAlign}
                    matchLabel="Match content"
                    onChange={(align) => {
                        onNewsSettingsChange({ titleAlign: align });
                    }}
                />
                <NumberField
                    label="Padding"
                    hint="Space between the widget border and its content, in pixels."
                    value={settings.padding}
                    fallback={effectiveNewsPadding({ ...settings, padding: undefined })}
                    minimum={0}
                    maximum={maximumNewsPadding}
                    commitOnInput
                    resetLabel={settings.padding === undefined ? undefined : "Reset padding"}
                    onReset={() => {
                        onNewsSettingsChange({ padding: null });
                    }}
                    onChange={(padding) => {
                        onNewsSettingsChange({ padding });
                    }}
                />
            </NewsStyleSection>
            <NewsStyleSection id="title" open={openSections.title} onToggle={() => toggleSection("title")}>
                <TypographyFields
                    label="Title"
                    family={settings.titleFontFamily}
                    size={settings.titleFontSize}
                    weight={settings.titleFontWeight}
                    minimumSize={minimumNewsTitleFontSize}
                    maximumSize={maximumNewsTitleFontSize}
                    fallbackSize={effectiveNewsTitleFontSize({ ...settings, titleFontSize: undefined })}
                    resetSizeLabel={settings.titleFontSize === undefined ? undefined : "Reset title size"}
                    onResetSize={() => {
                        onNewsSettingsChange({ titleFontSize: null });
                    }}
                    onChange={(patch) => {
                        onNewsSettingsChange({
                            titleFontFamily: patch.family,
                            titleFontSize: patch.size,
                            titleFontWeight: patch.weight,
                        });
                    }}
                />
                <NumberField
                    label="Title spacing"
                    hint="Space between the title and the headlines. This is separate from padding."
                    value={settings.titleSpacing}
                    fallback={effectiveNewsTitleSpacing({ ...settings, titleSpacing: undefined })}
                    minimum={0}
                    maximum={maximumNewsTitleSpacing}
                    commitOnInput
                    resetLabel={settings.titleSpacing === undefined ? undefined : "Reset title spacing"}
                    onReset={() => {
                        onNewsSettingsChange({ titleSpacing: null });
                    }}
                    onChange={(titleSpacing) => {
                        onNewsSettingsChange({ titleSpacing });
                    }}
                />
            </NewsStyleSection>
            <NewsStyleSection id="content" open={openSections.content} onToggle={() => toggleSection("content")}>
                <TypographyFields
                    label="Content"
                    family={settings.fontFamily}
                    size={settings.fontSize}
                    weight={settings.fontWeight}
                    minimumSize={minimumNewsFontSize}
                    maximumSize={maximumNewsFontSize}
                    fallbackSize={effectiveNewsFontSize({ ...settings, fontSize: undefined })}
                    resetSizeLabel={settings.fontSize === undefined ? undefined : "Reset content size"}
                    onResetSize={() => {
                        onNewsSettingsChange({ fontSize: null });
                    }}
                    onChange={(patch) => {
                        onNewsSettingsChange({
                            fontFamily: patch.family,
                            fontSize: patch.size,
                            fontWeight: patch.weight,
                        });
                    }}
                />
            </NewsStyleSection>
            <NewsStyleSection id="colors" open={openSections.colors} onToggle={() => toggleSection("colors")}>
                <ColorAlphaField
                    label="Background"
                    value={settings.backgroundColor}
                    opacity={settings.backgroundOpacity}
                    defaultColor={defaultNewsSettings.backgroundColor}
                    onColorChange={(backgroundColor) => {
                        onNewsSettingsChange({ backgroundColor }, "color");
                    }}
                    onOpacityChange={(backgroundOpacity) => {
                        onNewsSettingsChange({ backgroundOpacity }, "color");
                    }}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Text"
                    value={settings.textColor}
                    opacity={settings.textOpacity}
                    defaultColor={defaultNewsSettings.textColor}
                    onColorChange={(textColor) => {
                        onNewsSettingsChange({ textColor }, "color");
                    }}
                    onOpacityChange={(textOpacity) => {
                        onNewsSettingsChange({ textOpacity }, "color");
                    }}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Title color"
                    value={settings.titleColor ?? settings.textColor}
                    opacity={settings.titleOpacity}
                    onColorChange={(titleColor) => {
                        onNewsSettingsChange({ titleColor }, "color");
                    }}
                    onOpacityChange={(titleOpacity) => {
                        onNewsSettingsChange({ titleOpacity }, "color");
                    }}
                    onReset={settings.titleColor === undefined && settings.titleOpacity === undefined
                        ? undefined
                        : () => {
                            onNewsSettingsChange({ titleColor: null, titleOpacity: null }, "color");
                        }}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Accent"
                    value={settings.accentColor}
                    opacity={settings.accentOpacity}
                    defaultColor={defaultNewsSettings.accentColor}
                    onColorChange={(accentColor) => {
                        onNewsSettingsChange({ accentColor }, "color");
                    }}
                    onOpacityChange={(accentOpacity) => {
                        onNewsSettingsChange({ accentOpacity }, "color");
                    }}
                    onSessionEnd={onColorSessionEnd}
                />
                <RadiusField
                    value={settings.borderRadius}
                    onChange={(borderRadius) => {
                        onNewsSettingsChange({ borderRadius });
                    }}
                />
            </NewsStyleSection>
            <NewsStyleSection id="updates" open={openSections.updates} onToggle={() => toggleSection("updates")}>
                <ChoiceField
                    label="Refresh interval"
                    hint="How often the display requests headlines. A failed request retries sooner."
                    value={refreshValue}
                    options={newsRefreshChoices.map((minutes) => ({
                        value: String(minutes) as `${NewsRefreshMinutes}`,
                        label: refreshLabel(minutes),
                    }))}
                    onChange={(minutes) => {
                        onNewsSettingsChange({
                            refreshIntervalMinutes: Number(minutes) as NewsRefreshMinutes,
                        });
                    }}
                />
            </NewsStyleSection>
        </div>
    );
}

function refreshLabel(minutes: NewsRefreshMinutes): string {
    if (minutes === 10) {
        return "Every 10 minutes";
    }

    if (minutes === 30) {
        return "Every 30 minutes";
    }

    if (minutes === 60) {
        return "Every hour";
    }

    return "Once a day";
}

function physicalAlign(align: NewsAlign | undefined): "left" | "center" | "right" {
    if (align === "center") {
        return "center";
    }

    if (align === "left" || align === "start") {
        return "left";
    }

    return "right";
}

function NewsStyleSection({
    id,
    open,
    onToggle,
    children,
}: {
    id: NewsStyleSectionId;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    const section = newsStyleSections.find((item) => item.id === id);
    const panelId = `news-style-${id}`;

    return (
        <section className="border-t border-border pt-2 first:border-t-0 first:pt-0">
            <h3>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={onToggle}
                    className="flex h-8 w-full items-center justify-between text-left text-xs font-semibold text-foreground"
                >
                    <span>{section?.label}</span>
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className={open ? "size-4 text-muted" : "size-4 -rotate-90 text-muted"}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
            </h3>
            {open ? (
                <div id={panelId} className="flex flex-col gap-3 pb-1">
                    {children}
                </div>
            ) : null}
        </section>
    );
}

function PresetThumbnail({ preset }: { preset: NewsPreset }) {
    if (preset === "cards") {
        return (
            <span aria-hidden="true" className="flex h-10 flex-col justify-center gap-1 rounded bg-surface-hover/70 px-1.5">
                <span className="h-2 w-full rounded-full bg-foreground/80" />
                <span className="h-1.5 w-2/3 rounded-full bg-accent/70" />
            </span>
        );
    }

    if (preset === "list") {
        return (
            <span aria-hidden="true" className="flex h-10 flex-col justify-center gap-1 rounded bg-surface-hover/70 px-1.5">
                <span className="h-1 w-full rounded-full bg-foreground/70" />
                <span className="h-1 w-full rounded-full bg-foreground/45" />
                <span className="h-1 w-4/5 rounded-full bg-foreground/45" />
            </span>
        );
    }

    return (
        <span aria-hidden="true" className="flex h-10 items-center rounded bg-surface-hover/70 px-1.5">
            <span className="h-1.5 w-full rounded-full bg-foreground/80" />
        </span>
    );
}

type TypographyPatch = {
    family?: NewsFontFamily | null;
    size?: number | null;
    weight?: NewsFontWeight | null;
};

function TypographyFields({
    label,
    family,
    size,
    weight,
    minimumSize,
    maximumSize,
    fallbackSize,
    resetSizeLabel,
    onResetSize,
    onChange,
}: {
    label: string;
    family: NewsFontFamily | undefined;
    size: number | undefined;
    weight: NewsFontWeight | undefined;
    minimumSize: number;
    maximumSize: number;
    fallbackSize: number;
    resetSizeLabel?: string;
    onResetSize?: () => void;
    onChange: (patch: TypographyPatch) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{`${label} type`}</span>
            <ChoiceField
                label="Font"
                value={family ?? ""}
                options={fontOptions}
                onChange={(nextFamily) => {
                    onChange({ family: nextFamily === "" ? null : nextFamily });
                }}
            />
            <NumberField
                label="Size"
                value={size}
                fallback={fallbackSize}
                minimum={minimumSize}
                maximum={maximumSize}
                commitOnInput
                resetLabel={resetSizeLabel}
                onReset={onResetSize}
                onChange={(nextSize) => {
                    onChange({ size: nextSize });
                }}
            />
            <ChoiceField
                label="Weight"
                value={weight === undefined ? "" : String(weight) as `${NewsFontWeight}`}
                options={weightOptions}
                onChange={(nextWeight) => {
                    onChange({
                        weight: nextWeight === "" ? null : Number(nextWeight) as NewsFontWeight,
                    });
                }}
            />
        </div>
    );
}

function NumberField({
    label,
    hint,
    value,
    fallback,
    minimum,
    maximum,
    commitOnInput = false,
    resetLabel,
    onReset,
    onChange,
}: {
    label: string;
    hint?: string;
    value: number | undefined;
    fallback?: number;
    minimum: number;
    maximum: number;
    commitOnInput?: boolean;
    resetLabel?: string;
    onReset?: () => void;
    onChange: (value: number | null) => void;
}) {
    const shown = value ?? fallback;
    const [draft, setDraft] = useState(shown === undefined ? "" : String(shown));
    const [source, setSource] = useState(shown);

    if (source !== shown) {
        setSource(shown);
        setDraft(shown === undefined ? "" : String(shown));
    }

    function commit(nextDraft: string) {
        const parsed = Number(nextDraft);

        if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
            if (!commitOnInput) {
                setDraft(shown === undefined ? "" : String(shown));
            }
            return;
        }

        if (value === undefined && fallback !== undefined && parsed === fallback) {
            return;
        }

        if (parsed === value) {
            return;
        }

        onChange(parsed);
    }

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <input
                type="number"
                inputMode="numeric"
                min={minimum}
                max={maximum}
                value={draft}
                aria-label={label}
                onChange={(event) => {
                    const nextDraft = event.target.value;
                    setDraft(nextDraft);

                    if (commitOnInput) {
                        commit(nextDraft);
                    }
                }}
                onBlur={() => {
                    commit(draft);
                }}
                className="h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none"
            />
            {hint !== undefined ? <span className="text-xs text-secondary">{hint}</span> : null}
            {resetLabel !== undefined && onReset !== undefined ? (
                <button type="button" onClick={onReset} className="text-left text-xs text-secondary">
                    {resetLabel}
                </button>
            ) : null}
        </label>
    );
}

function RadiusField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    const [draft, setDraft] = useState(String(value));
    const [source, setSource] = useState(value);

    if (source !== value) {
        setSource(value);
        setDraft(String(value));
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        const radius = parseImageBorderRadius(nextDraft);

        if (radius !== null && radius !== value) {
            onChange(radius);
        }
    }

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Border radius</span>
            <input
                type="number"
                min={minimumImageBorderRadius}
                max={maximumImageBorderRadius}
                value={draft}
                onChange={handleChange}
                onBlur={() => {
                    if (parseImageBorderRadius(draft) === null) {
                        setDraft(String(value));
                    }
                }}
                className="h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none"
            />
        </label>
    );
}

function ChoiceField<Value extends string>({
    label,
    hint,
    value,
    options,
    onChange,
}: {
    label: string;
    hint?: string;
    value: Value;
    options: readonly LabeledOption<Value>[];
    onChange: (value: Value) => void;
}) {
    function handleChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextValue = options.find((option) => option.value === event.target.value);

        if (nextValue !== undefined) {
            onChange(nextValue.value);
        }
    }

    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <span className="relative">
                <select value={value} onChange={handleChange} className={selectClassName}>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </span>
            </span>
            {hint !== undefined ? <span className="text-xs text-secondary">{hint}</span> : null}
        </label>
    );
}

function AlignField({
    label,
    hint,
    value,
    matchLabel,
    onChange,
}: {
    label: string;
    hint: string;
    value: "left" | "center" | "right" | null;
    matchLabel?: string;
    onChange: (value: "left" | "center" | "right" | null) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <div className="flex gap-1" role="group" aria-label={label}>
                {matchLabel !== undefined ? (
                    <button
                        type="button"
                        aria-pressed={value === null}
                        onClick={() => {
                            onChange(null);
                        }}
                        className={alignButtonClass(value === null)}
                    >
                        {matchLabel}
                    </button>
                ) : null}
                {alignmentOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-label={option.label}
                        aria-pressed={value === option.value}
                        onClick={() => {
                            onChange(option.value);
                        }}
                        className={alignButtonClass(value === option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
            <span className="text-xs text-secondary">{hint}</span>
        </div>
    );
}

function alignButtonClass(selected: boolean): string {
    const base = "grid h-9 min-w-9 place-items-center rounded-control border px-2 text-xs text-foreground";

    if (selected) {
        return `${base} border-accent bg-accent/15`;
    }

    return `${base} border-border bg-surface-raised`;
}

export { NewsContentFields, NewsStyleFields };
