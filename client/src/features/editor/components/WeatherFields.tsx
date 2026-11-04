import { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import type { WeatherAlign, WeatherDirection, WeatherFontFamily, WeatherFontWeight, WeatherPreset, WeatherRefreshMinutes, WeatherWidgetSettings, WidgetLayout } from "../../boards/types/boardTypes.ts";
import { matchingWeatherCity, weatherCities, weatherCityById, weatherLocationFromCity } from "../../boards/weather/weatherCities.ts";
import {
    effectiveContentFontSize,
    effectiveTitleFontSize,
    effectiveTitleSpacing,
    effectiveWeatherPadding,
    maximumWeatherTitleSpacing,
    presetLabel,
    weatherPresetFit,
    weatherPresets,
} from "../../boards/weather/weatherPresentation.ts";
import { resolveWeatherRefreshMinutes, weatherRefreshChoices } from "../../boards/weather/weatherSchedule.ts";
import {
    initialWeatherStyleSections,
    toggleWeatherStyleSection,
    weatherStyleSections,
    type WeatherStyleSectionId,
} from "../weatherStyleSections.ts";
import {
    maximumImageBorderRadius,
    minimumImageBorderRadius,
    parseImageBorderRadius,
} from "../imageSettings.ts";
import ColorField from "./ColorField.tsx";
import {
    maximumWeatherFontSize,
    maximumWeatherOpacity,
    maximumWeatherPadding,
    maximumWeatherTitleFontSize,
    maximumWeatherTitleLength,
    minimumWeatherFontSize,
    minimumWeatherTitleFontSize,
    weatherUnits,
    type WeatherSettingsPatch,
} from "../weatherSettings.ts";

type WeatherContentFieldsProps = {
    settings: WeatherWidgetSettings;
    frame: WidgetLayout;
    onWeatherSettingsChange: (settings: WeatherSettingsPatch) => void;
};

type WeatherStyleFieldsProps = {
    settings: WeatherWidgetSettings;
    frame: WidgetLayout;
    onWeatherSettingsChange: (settings: WeatherSettingsPatch, gesture?: "color" | null) => void;
    onColorSessionEnd: () => void;
};

type LabeledOption<Value extends string> = {
    value: Value;
    label: string;
};

const selectClassName = "h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none";
const customLocationValue = "custom";

const directionOptions: LabeledOption<WeatherDirection>[] = [
    { value: "auto", label: "Auto" },
    { value: "ltr", label: "LTR" },
    { value: "rtl", label: "RTL" },
];

const alignmentOptions: LabeledOption<"left" | "center" | "right">[] = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
];

const fontOptions: LabeledOption<WeatherFontFamily | "">[] = [
    { value: "", label: "Default" },
    { value: "sans", label: "Sans" },
    { value: "serif", label: "Serif" },
    { value: "mono", label: "Mono" },
];

const weightOptions: LabeledOption<`${WeatherFontWeight}` | "">[] = [
    { value: "", label: "Default" },
    { value: "400", label: "Regular" },
    { value: "500", label: "Medium" },
    { value: "600", label: "Semibold" },
    { value: "700", label: "Bold" },
];

function WeatherContentFields({ settings, frame, onWeatherSettingsChange }: WeatherContentFieldsProps) {
    const matchedCity = matchingWeatherCity(settings.location);
    const locationValue = matchedCity?.id ?? customLocationValue;
    const fit = weatherPresetFit(settings, frame);

    return (
        <>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Location</span>
                <span className="relative">
                    <select
                        aria-label="Weather location"
                        value={locationValue}
                        onChange={(event) => {
                            const city = weatherCityById(event.target.value);

                            if (city === null) {
                                return;
                            }

                            onWeatherSettingsChange({ location: weatherLocationFromCity(city) });
                        }}
                        className={selectClassName}
                    >
                        {matchedCity === null ? (
                            <option value={customLocationValue}>
                                {`Custom: ${settings.location.label}`}
                            </option>
                        ) : null}
                        {weatherCities.map((city) => (
                            <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                    </select>
                    <SelectChevron />
                </span>
            </label>
            <p className="text-xs text-secondary">
                {`${settings.location.label} · ${settings.location.timezone}`}
            </p>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Title</span>
                <input
                    value={settings.title ?? ""}
                    maxLength={maximumWeatherTitleLength}
                    onChange={(event) => {
                        onWeatherSettingsChange({ title: event.target.value });
                    }}
                    className="h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none"
                />
            </label>
            <ChoiceField
                label="Temperature unit"
                value={settings.unit}
                options={weatherUnits.map((unit) => ({
                    value: unit,
                    label: unit === "celsius" ? "Celsius" : "Fahrenheit",
                }))}
                onChange={(unit) => {
                    onWeatherSettingsChange({ unit });
                }}
            />
            <WeatherToggle
                label="Show feels-like"
                enabled={settings.showFeelsLike}
                onChange={(showFeelsLike) => {
                    onWeatherSettingsChange({ showFeelsLike });
                }}
            />
            <WeatherToggle
                label="Show forecast"
                enabled={settings.showForecast}
                onChange={(showForecast) => {
                    onWeatherSettingsChange({ showForecast });
                }}
            />
            {fit.message !== null ? <p className="text-xs text-secondary">{fit.message}</p> : null}
        </>
    );
}

function WeatherStyleFields({
    settings,
    frame,
    onWeatherSettingsChange,
    onColorSessionEnd,
}: WeatherStyleFieldsProps) {
    const [openSections, setOpenSections] = useState(initialWeatherStyleSections);
    const fit = weatherPresetFit(settings, frame);
    const contentAlign = physicalAlign(settings.align);
    const titleAlign = settings.titleAlign === undefined ? "" : physicalAlign(settings.titleAlign);
    const refreshValue = String(resolveWeatherRefreshMinutes(settings.refreshIntervalMinutes)) as `${WeatherRefreshMinutes}`;

    function toggleSection(id: WeatherStyleSectionId) {
        setOpenSections((current) => toggleWeatherStyleSection(current, id));
    }

    return (
        <div className="flex flex-col gap-2">
            <WeatherStyleSection
                id="design"
                open={openSections.design}
                onToggle={() => {
                    toggleSection("design");
                }}
            >
            <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Design</span>
                <div className="grid grid-cols-2 gap-1.5">
                    {weatherPresets.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            aria-pressed={settings.preset === preset}
                            onClick={() => {
                                onWeatherSettingsChange({ preset });
                            }}
                            className={settings.preset === preset
                                ? "flex flex-col gap-1 rounded-control border border-accent bg-accent/15 p-1.5 text-left text-foreground"
                                : "flex flex-col gap-1 rounded-control border border-border bg-surface-raised p-1.5 text-left text-foreground"}
                        >
                            <PresetThumbnail preset={preset} />
                            <span className="px-0.5 text-xs">{presetLabel(preset)}</span>
                        </button>
                    ))}
                </div>
                {settings.preset === undefined && settings.layout === "expanded" ? (
                    <p className="text-xs text-secondary">This widget still uses its saved expanded layout.</p>
                ) : null}
                {fit.message !== null ? <p className="text-xs text-secondary">{fit.message}</p> : null}
            </div>
            <ChoiceField
                label="Text direction"
                hint="Sets the reading order for Hebrew or English. It does not choose the left or right side."
                value={settings.direction ?? "ltr"}
                options={directionOptions}
                onChange={(direction) => {
                    onWeatherSettingsChange({ direction });
                }}
            />
            <AlignField
                label="Content alignment"
                hint="Places the weather content on the left, in the center, or on the right."
                value={contentAlign}
                onChange={(align) => {
                    onWeatherSettingsChange({ align });
                }}
            />
            <AlignField
                label="Title alignment"
                hint="The title can follow the content or sit on its own side."
                value={titleAlign === "" ? null : titleAlign}
                matchLabel="Match content"
                onChange={(align) => {
                    onWeatherSettingsChange({ titleAlign: align });
                }}
            />
            <NumberField
                label="Padding"
                hint="Space between the widget border and its content, in pixels."
                value={settings.padding}
                fallback={effectiveWeatherPadding({ ...settings, padding: undefined })}
                minimum={0}
                maximum={maximumWeatherPadding}
                commitOnInput
                resetLabel={settings.padding === undefined ? undefined : "Reset padding"}
                onReset={() => {
                    onWeatherSettingsChange({ padding: null });
                }}
                onChange={(padding) => {
                    onWeatherSettingsChange({ padding });
                }}
            />
            </WeatherStyleSection>
            <WeatherStyleSection
                id="title"
                open={openSections.title}
                onToggle={() => {
                    toggleSection("title");
                }}
            >
            <TypographyFields
                label="Title"
                family={settings.titleFontFamily}
                size={settings.titleFontSize}
                weight={settings.titleFontWeight}
                minimumSize={minimumWeatherTitleFontSize}
                maximumSize={maximumWeatherTitleFontSize}
                fallbackSize={effectiveTitleFontSize({ ...settings, titleFontSize: undefined })}
                resetSizeLabel={settings.titleFontSize === undefined ? undefined : "Reset title size"}
                onResetSize={() => {
                    onWeatherSettingsChange({ titleFontSize: null });
                }}
                onChange={(patch) => {
                    onWeatherSettingsChange({
                        titleFontFamily: patch.family,
                        titleFontSize: patch.size,
                        titleFontWeight: patch.weight,
                    });
                }}
            />
            <NumberField
                label="Title spacing"
                hint="Space between the title and the weather reading. This is separate from padding."
                value={settings.titleSpacing}
                fallback={effectiveTitleSpacing({ ...settings, titleSpacing: undefined })}
                minimum={0}
                maximum={maximumWeatherTitleSpacing}
                commitOnInput
                resetLabel={settings.titleSpacing === undefined ? undefined : "Reset title spacing"}
                onReset={() => {
                    onWeatherSettingsChange({ titleSpacing: null });
                }}
                onChange={(titleSpacing) => {
                    onWeatherSettingsChange({ titleSpacing });
                }}
            />
            </WeatherStyleSection>
            <WeatherStyleSection
                id="content"
                open={openSections.content}
                onToggle={() => {
                    toggleSection("content");
                }}
            >
            <TypographyFields
                label="Content"
                family={settings.fontFamily}
                size={settings.fontSize}
                weight={settings.fontWeight}
                minimumSize={minimumWeatherFontSize}
                maximumSize={maximumWeatherFontSize}
                fallbackSize={effectiveContentFontSize({ ...settings, fontSize: undefined })}
                resetSizeLabel={settings.fontSize === undefined ? undefined : "Reset content size"}
                onResetSize={() => {
                    onWeatherSettingsChange({ fontSize: null });
                }}
                onChange={(patch) => {
                    onWeatherSettingsChange({
                        fontFamily: patch.family,
                        fontSize: patch.size,
                        fontWeight: patch.weight,
                    });
                }}
            />
            </WeatherStyleSection>
            <WeatherStyleSection
                id="colors"
                open={openSections.colors}
                onToggle={() => {
                    toggleSection("colors");
                }}
            >
            <ColorField
                label="Background"
                value={settings.backgroundColor}
                onColorChange={(backgroundColor) => {
                    onWeatherSettingsChange({ backgroundColor }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <NumberField
                label="Background opacity"
                hint="100 is solid. Lower values let the board show through."
                value={settings.backgroundOpacity}
                fallback={100}
                minimum={0}
                maximum={maximumWeatherOpacity}
                commitOnInput
                resetLabel={settings.backgroundOpacity === undefined ? undefined : "Reset opacity"}
                onReset={() => {
                    onWeatherSettingsChange({ backgroundOpacity: null });
                }}
                onChange={(backgroundOpacity) => {
                    onWeatherSettingsChange({ backgroundOpacity });
                }}
            />
            <ColorField
                label="Text"
                value={settings.textColor}
                onColorChange={(textColor) => {
                    onWeatherSettingsChange({ textColor }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <ColorField
                label="Title color"
                value={settings.titleColor ?? settings.textColor}
                onColorChange={(titleColor) => {
                    onWeatherSettingsChange({ titleColor }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            {settings.titleColor !== undefined ? (
                <button
                    type="button"
                    onClick={() => {
                        onWeatherSettingsChange({ titleColor: null });
                    }}
                    className="text-left text-xs text-secondary"
                >
                    Use text color for the title
                </button>
            ) : null}
            <ColorField
                label="Accent"
                value={settings.accentColor}
                onColorChange={(accentColor) => {
                    onWeatherSettingsChange({ accentColor }, "color");
                }}
                onSessionEnd={onColorSessionEnd}
            />
            <RadiusField
                value={settings.borderRadius}
                onChange={(borderRadius) => {
                    onWeatherSettingsChange({ borderRadius });
                }}
            />
            </WeatherStyleSection>
            <WeatherStyleSection
                id="updates"
                open={openSections.updates}
                onToggle={() => {
                    toggleSection("updates");
                }}
            >
            <ChoiceField
                label="Refresh interval"
                hint="How often the display requests fresh weather. A failed request retries sooner."
                value={refreshValue}
                options={weatherRefreshChoices.map((minutes) => ({
                    value: String(minutes) as `${WeatherRefreshMinutes}`,
                    label: refreshIntervalLabel(minutes),
                }))}
                onChange={(minutes) => {
                    onWeatherSettingsChange({
                        refreshIntervalMinutes: Number(minutes) as WeatherRefreshMinutes,
                    });
                }}
            />
            </WeatherStyleSection>
        </div>
    );
}

function refreshIntervalLabel(minutes: WeatherRefreshMinutes): string {
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

function WeatherStyleSection({
    id,
    open,
    onToggle,
    children,
}: {
    id: WeatherStyleSectionId;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    const section = weatherStyleSections.find((item) => item.id === id);
    const panelId = `weather-style-${id}`;

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

type TypographyPatch = {
    family?: WeatherFontFamily | null;
    size?: number | null;
    weight?: WeatherFontWeight | null;
};

type TypographyFieldsProps = {
    label: string;
    family: WeatherFontFamily | undefined;
    size: number | undefined;
    weight: WeatherFontWeight | undefined;
    minimumSize: number;
    maximumSize: number;
    fallbackSize: number;
    resetSizeLabel?: string;
    onResetSize?: () => void;
    onChange: (patch: TypographyPatch) => void;
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
}: TypographyFieldsProps) {
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
                value={weight === undefined ? "" : String(weight) as `${WeatherFontWeight}`}
                options={weightOptions}
                onChange={(nextWeight) => {
                    onChange({
                        weight: nextWeight === "" ? null : Number(nextWeight) as WeatherFontWeight,
                    });
                }}
            />
        </div>
    );
}

type NumberFieldProps = {
    label: string;
    hint?: string;
    value: number | undefined;
    fallback?: number;
    minimum: number;
    maximum: number;
    emptyLabel?: string;
    commitOnInput?: boolean;
    resetLabel?: string;
    onReset?: () => void;
    onChange: (value: number | null) => void;
};

function NumberField({
    label,
    hint,
    value,
    fallback,
    minimum,
    maximum,
    emptyLabel,
    commitOnInput = false,
    resetLabel,
    onReset,
    onChange,
}: NumberFieldProps) {
    const shown = value ?? fallback;
    const [draft, setDraft] = useState(shown === undefined ? "" : String(shown));
    const [source, setSource] = useState(shown);

    if (source !== shown) {
        setSource(shown);
        setDraft(shown === undefined ? "" : String(shown));
    }

    function commit(nextDraft: string) {
        if (emptyLabel !== undefined && nextDraft.trim() === "") {
            onChange(null);
            return;
        }

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
                placeholder={emptyLabel}
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
                <button
                    type="button"
                    onClick={onReset}
                    className="text-left text-xs text-secondary"
                >
                    {resetLabel}
                </button>
            ) : null}
        </label>
    );
}

type RadiusFieldProps = {
    value: number;
    onChange: (value: number) => void;
};

function RadiusField({ value, onChange }: RadiusFieldProps) {
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

type ChoiceFieldProps<Value extends string> = {
    label: string;
    hint?: string;
    value: Value;
    options: readonly LabeledOption<Value>[];
    onChange: (value: Value) => void;
};

function ChoiceField<Value extends string>({
    label,
    hint,
    value,
    options,
    onChange,
}: ChoiceFieldProps<Value>) {
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
                <SelectChevron />
            </span>
            {hint !== undefined ? <span className="text-xs text-secondary">{hint}</span> : null}
        </label>
    );
}

type AlignFieldProps = {
    label: string;
    hint: string;
    value: "left" | "center" | "right" | null;
    matchLabel?: string;
    onChange: (value: "left" | "center" | "right" | null) => void;
};

function AlignField({
    label,
    hint,
    value,
    matchLabel,
    onChange,
}: AlignFieldProps) {
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
                        <AlignIcon align={option.value} />
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

function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
    const lines = align === "left"
        ? ["M4 7h14", "M4 12h9", "M4 17h12"]
        : align === "right"
            ? ["M6 7h14", "M11 12h9", "M8 17h12"]
            : ["M5 7h14", "M7 12h10", "M6 17h12"];

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            {lines.map((line) => (
                <path key={line} d={line} />
            ))}
        </svg>
    );
}

function PresetThumbnail({ preset }: { preset: WeatherPreset }) {
    if (preset === "minimal") {
        return (
            <span aria-hidden="true" className="flex h-10 flex-col items-center justify-center gap-1 rounded bg-surface-hover/70">
                <span className="size-3 rounded-full border border-accent" />
                <span className="h-1.5 w-6 rounded-full bg-foreground/80" />
            </span>
        );
    }

    if (preset === "horizontal") {
        return (
            <span aria-hidden="true" className="flex h-10 items-center gap-1 rounded bg-surface-hover/70 px-1.5">
                <span className="size-3 shrink-0 rounded-full border border-accent" />
                <span className="h-2 w-5 shrink-0 rounded-full bg-foreground/80" />
                <span className="h-4 min-w-0 flex-1 rounded bg-foreground/15" />
            </span>
        );
    }

    if (preset === "forecast") {
        return (
            <span aria-hidden="true" className="flex h-10 flex-col gap-1 rounded bg-surface-hover/70 p-1">
                <span className="h-1.5 w-8 rounded-full bg-foreground/70" />
                <span className="grid min-h-0 flex-1 grid-cols-3 gap-0.5">
                    <span className="rounded bg-accent/35" />
                    <span className="rounded bg-accent/35" />
                    <span className="rounded bg-accent/35" />
                </span>
            </span>
        );
    }

    return (
        <span aria-hidden="true" className="flex h-10 flex-col justify-center gap-1 rounded bg-surface-hover/70 px-1.5">
            <span className="h-1 w-8 rounded-full bg-foreground/60" />
            <span className="flex items-center gap-1">
                <span className="size-3 rounded-full border border-accent" />
                <span className="h-2.5 w-7 rounded-full bg-foreground/80" />
            </span>
        </span>
    );
}

function SelectChevron() {
    return (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="m6 9 6 6 6-6" />
            </svg>
        </span>
    );
}

type WeatherToggleProps = {
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
};

function WeatherToggle({
    label,
    enabled,
    onChange,
}: WeatherToggleProps) {
    return (
        <button
            type="button"
            aria-pressed={enabled}
            onClick={() => {
                onChange(!enabled);
            }}
            className="flex items-center justify-between gap-3 text-left"
        >
            <span className="text-sm text-foreground">{label}</span>
            <span className={enabled ? "relative h-5 w-9 rounded-full bg-accent" : "relative h-5 w-9 rounded-full bg-surface-hover"}>
                <span className={enabled ? "absolute top-0.5 right-0.5 size-4 rounded-full bg-white" : "absolute top-0.5 left-0.5 size-4 rounded-full bg-white"} />
            </span>
        </button>
    );
}

function physicalAlign(align: WeatherAlign | undefined): "left" | "center" | "right" {
    if (align === "center") {
        return "center";
    }

    if (align === "right" || align === "end") {
        return "right";
    }

    return "left";
}

export { WeatherContentFields, WeatherStyleFields };
