import { useState, type ChangeEvent, type ReactNode } from "react";
import type {
    CountdownAlign,
    CountdownDirection,
    CountdownFontFamily,
    CountdownFontWeight,
    CountdownPreset,
    CountdownWidgetSettings,
} from "../../boards/types/boardTypes.ts";
import { defaultCountdownSettings } from "../../boards/countdown/countdownDefaults.ts";
import {
    countdownPresetLabel,
    countdownPresets,
    resolveCountdownAlign,
    resolveCountdownDirection,
    resolveCountdownFontFamily,
    resolveCountdownFontSize,
    resolveCountdownFontWeight,
    resolveCountdownPadding,
    resolveCountdownTitleFontFamily,
    resolveCountdownTitleFontSize,
    resolveCountdownTitleFontWeight,
    resolveCountdownTitleSpacing,
} from "../../boards/countdown/countdownPresentation.ts";
import { countdownTimeZones } from "../../boards/countdown/countdownTime.ts";
import ColorAlphaField from "./ColorAlphaField.tsx";
import {
    maximumCountdownFontSize,
    maximumCountdownMessageLength,
    maximumCountdownPadding,
    maximumCountdownTitleFontSize,
    maximumCountdownTitleLength,
    maximumCountdownTitleSpacing,
    minimumCountdownFontSize,
    minimumCountdownTitleFontSize,
    type CountdownSettingsPatch,
} from "../countdownSettings.ts";

type CountdownFieldsProps = {
    settings: CountdownWidgetSettings;
    onCountdownSettingsChange: (patch: CountdownSettingsPatch, gesture?: "color" | null) => void;
    onColorSessionEnd?: () => void;
};

type StyleSectionId = "design" | "title" | "colors";

const fieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none";
const selectClassName = "h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none";
const defaults = defaultCountdownSettings(new Date("2026-01-01T00:00:00Z"));

function CountdownContentFields({ settings, onCountdownSettingsChange }: CountdownFieldsProps) {
    return (
        <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Title</span>
                <input
                    className={fieldClassName}
                    data-validation-path="title"
                    maxLength={maximumCountdownTitleLength}
                    value={settings.title ?? ""}
                    onChange={(event) => {
                        onCountdownSettingsChange({
                            title: event.target.value.trim().length === 0 ? null : event.target.value,
                        });
                    }}
                />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Target date</span>
                <input
                    type="date"
                    className={fieldClassName}
                    data-validation-path="targetDate"
                    value={settings.targetDate}
                    onChange={(event) => {
                        onCountdownSettingsChange({ targetDate: event.target.value });
                    }}
                />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Target time</span>
                <input
                    type="time"
                    step="1"
                    className={fieldClassName}
                    data-validation-path="targetTime"
                    value={settings.targetTime}
                    onChange={(event) => {
                        onCountdownSettingsChange({ targetTime: event.target.value });
                    }}
                />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Time zone</span>
                <select
                    className={selectClassName}
                    data-validation-path="timeZone"
                    value={settings.timeZone}
                    onChange={(event) => {
                        onCountdownSettingsChange({ timeZone: event.target.value });
                    }}
                >
                    {countdownTimeZones.map((zone) => (
                        <option key={zone} value={zone}>{zone}</option>
                    ))}
                </select>
            </label>
            <fieldset className="flex flex-col gap-2">
                <legend className="text-xs text-muted">Visible units</legend>
                <UnitToggle label="Days" checked={settings.showDays} onChange={(showDays) => onCountdownSettingsChange({ showDays })} />
                <UnitToggle label="Hours" checked={settings.showHours} onChange={(showHours) => onCountdownSettingsChange({ showHours })} />
                <UnitToggle label="Minutes" checked={settings.showMinutes} onChange={(showMinutes) => onCountdownSettingsChange({ showMinutes })} />
                <UnitToggle label="Seconds" checked={settings.showSeconds} onChange={(showSeconds) => onCountdownSettingsChange({ showSeconds })} />
            </fieldset>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Completion message</span>
                <input
                    className={fieldClassName}
                    data-validation-path="completionMessage"
                    maxLength={maximumCountdownMessageLength}
                    placeholder={resolveCountdownDirection(settings) === "rtl" ? "הסתיים" : "Complete"}
                    value={settings.completionMessage ?? ""}
                    onChange={(event) => {
                        onCountdownSettingsChange({
                            completionMessage: event.target.value.trim().length === 0 ? null : event.target.value,
                        });
                    }}
                />
            </label>
        </div>
    );
}

function CountdownStyleFields({ settings, onCountdownSettingsChange, onColorSessionEnd }: CountdownFieldsProps) {
    const [open, setOpen] = useState<Record<StyleSectionId, boolean>>({
        design: true,
        title: false,
        colors: false,
    });

    return (
        <div className="flex flex-col">
            <StyleSection id="design" label="Design & Layout" open={open.design} onToggle={() => toggle(setOpen, "design")}>
                <div className="grid grid-cols-2 gap-2">
                    {countdownPresets.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            aria-pressed={settings.preset === preset}
                            onClick={() => onCountdownSettingsChange({ preset })}
                            className={
                                settings.preset === preset
                                    ? "rounded-md border border-cyan/70 bg-surface-raised px-2 py-2 text-xs font-medium text-foreground"
                                    : "rounded-md border border-border bg-surface-raised/40 px-2 py-2 text-xs font-medium text-secondary"
                            }
                        >
                            <PresetMark preset={preset} />
                            <span className="mt-1 block">{countdownPresetLabel(preset)}</span>
                        </button>
                    ))}
                </div>
                <ChoiceField
                    label="Direction"
                    value={resolveCountdownDirection(settings)}
                    options={[
                        ["auto", "Auto"],
                        ["ltr", "Left to right"],
                        ["rtl", "Right to left"],
                    ]}
                    onChange={(direction) => onCountdownSettingsChange({ direction: direction as CountdownDirection })}
                />
                <ChoiceField
                    label="Alignment"
                    value={resolveCountdownAlign(settings)}
                    options={[
                        ["start", "Start"],
                        ["center", "Center"],
                        ["end", "End"],
                        ["left", "Left"],
                        ["right", "Right"],
                    ]}
                    onChange={(align) => onCountdownSettingsChange({ align: align as CountdownAlign })}
                />
                <NumberField
                    label="Padding"
                    value={resolveCountdownPadding(settings)}
                    minimum={0}
                    maximum={maximumCountdownPadding}
                    onChange={(padding) => onCountdownSettingsChange({ padding })}
                />
                <NumberField
                    label="Corner radius"
                    value={settings.borderRadius}
                    minimum={0}
                    maximum={240}
                    onChange={(borderRadius) => onCountdownSettingsChange({ borderRadius })}
                />
            </StyleSection>
            <StyleSection id="title" label="Title & Typography" open={open.title} onToggle={() => toggle(setOpen, "title")}>
                <ChoiceField
                    label="Title alignment"
                    value={settings.titleAlign ?? resolveCountdownAlign(settings)}
                    options={[
                        ["start", "Start"],
                        ["center", "Center"],
                        ["end", "End"],
                        ["left", "Left"],
                        ["right", "Right"],
                    ]}
                    onChange={(titleAlign) => onCountdownSettingsChange({ titleAlign: titleAlign as CountdownAlign })}
                />
                <NumberField
                    label="Title spacing"
                    value={resolveCountdownTitleSpacing(settings)}
                    minimum={0}
                    maximum={maximumCountdownTitleSpacing}
                    onChange={(titleSpacing) => onCountdownSettingsChange({ titleSpacing })}
                />
                <ChoiceField
                    label="Title font"
                    value={resolveCountdownTitleFontFamily(settings)}
                    options={[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]]}
                    onChange={(titleFontFamily) => onCountdownSettingsChange({ titleFontFamily: titleFontFamily as CountdownFontFamily })}
                />
                <NumberField
                    label="Title size"
                    value={resolveCountdownTitleFontSize(settings)}
                    minimum={minimumCountdownTitleFontSize}
                    maximum={maximumCountdownTitleFontSize}
                    onChange={(titleFontSize) => onCountdownSettingsChange({ titleFontSize })}
                />
                <ChoiceField
                    label="Title weight"
                    value={String(resolveCountdownTitleFontWeight(settings))}
                    options={[["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"]]}
                    onChange={(titleFontWeight) => onCountdownSettingsChange({ titleFontWeight: Number(titleFontWeight) as CountdownFontWeight })}
                />
                <ChoiceField
                    label="Number font"
                    value={resolveCountdownFontFamily(settings)}
                    options={[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]]}
                    onChange={(fontFamily) => onCountdownSettingsChange({ fontFamily: fontFamily as CountdownFontFamily })}
                />
                <NumberField
                    label="Number size"
                    value={resolveCountdownFontSize(settings)}
                    minimum={minimumCountdownFontSize}
                    maximum={maximumCountdownFontSize}
                    onChange={(fontSize) => onCountdownSettingsChange({ fontSize })}
                />
                <ChoiceField
                    label="Number weight"
                    value={String(resolveCountdownFontWeight(settings))}
                    options={[["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"]]}
                    onChange={(fontWeight) => onCountdownSettingsChange({ fontWeight: Number(fontWeight) as CountdownFontWeight })}
                />
            </StyleSection>
            <StyleSection id="colors" label="Colors & Background" open={open.colors} onToggle={() => toggle(setOpen, "colors")}>
                <ColorAlphaField
                    label="Background"
                    value={settings.backgroundColor}
                    opacity={settings.backgroundOpacity}
                    defaultColor={defaults.backgroundColor}
                    onColorChange={(backgroundColor) => onCountdownSettingsChange({ backgroundColor }, "color")}
                    onOpacityChange={(backgroundOpacity) => onCountdownSettingsChange({ backgroundOpacity }, "color")}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Text"
                    value={settings.textColor}
                    opacity={settings.textOpacity}
                    defaultColor={defaults.textColor}
                    onColorChange={(textColor) => onCountdownSettingsChange({ textColor }, "color")}
                    onOpacityChange={(textOpacity) => onCountdownSettingsChange({ textOpacity }, "color")}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Title"
                    value={settings.titleColor ?? settings.textColor}
                    opacity={settings.titleOpacity}
                    defaultColor={defaults.textColor}
                    onColorChange={(titleColor) => onCountdownSettingsChange({ titleColor }, "color")}
                    onOpacityChange={(titleOpacity) => onCountdownSettingsChange({ titleOpacity }, "color")}
                    onReset={() => onCountdownSettingsChange({ titleColor: null, titleOpacity: null }, "color")}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Accent"
                    value={settings.accentColor}
                    opacity={settings.accentOpacity}
                    defaultColor={defaults.accentColor}
                    onColorChange={(accentColor) => onCountdownSettingsChange({ accentColor }, "color")}
                    onOpacityChange={(accentOpacity) => onCountdownSettingsChange({ accentOpacity }, "color")}
                    onSessionEnd={onColorSessionEnd}
                />
            </StyleSection>
        </div>
    );
}

function StyleSection({
    id,
    label,
    open,
    onToggle,
    children,
}: {
    id: StyleSectionId;
    label: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    const panelId = `countdown-style-${id}`;

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
                    <span>{label}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className={open ? "size-4 text-muted" : "size-4 -rotate-90 text-muted"} fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
            </h3>
            {open ? <div id={panelId} className="flex flex-col gap-3 pb-1">{children}</div> : null}
        </section>
    );
}

function PresetMark({ preset }: { preset: CountdownPreset }) {
    if (preset === "minimal") {
        return (
            <span aria-hidden="true" className="flex h-10 items-end justify-center gap-1 rounded bg-surface-hover/70 px-2">
                <span className="text-sm font-medium text-foreground">12</span>
                <span className="mb-0.5 text-[9px] text-secondary">days</span>
            </span>
        );
    }

    return (
        <span aria-hidden="true" className="flex h-10 items-center justify-center gap-1 rounded bg-surface-hover/70 px-2">
            <span className="rounded bg-foreground/80 px-1 text-[10px] text-canvas">00</span>
            <span className="rounded bg-foreground/80 px-1 text-[10px] text-canvas">00</span>
        </span>
    );
}

function UnitToggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between text-sm text-foreground">
            <span>{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />
        </label>
    );
}

function ChoiceField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: readonly (readonly [string, string])[];
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <select
                className={selectClassName}
                value={value}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>{optionLabel}</option>
                ))}
            </select>
        </label>
    );
}

function NumberField({
    label,
    value,
    minimum,
    maximum,
    onChange,
}: {
    label: string;
    value: number;
    minimum: number;
    maximum: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">{label}</span>
            <input
                type="number"
                className={fieldClassName}
                min={minimum}
                max={maximum}
                value={value}
                onChange={(event) => {
                    const next = Number(event.target.value);

                    if (Number.isInteger(next) && next >= minimum && next <= maximum) {
                        onChange(next);
                    }
                }}
            />
        </label>
    );
}

function toggle(
    setOpen: (update: (current: Record<StyleSectionId, boolean>) => Record<StyleSectionId, boolean>) => void,
    id: StyleSectionId,
) {
    setOpen((current) => ({
        ...current,
        [id]: !current[id],
    }));
}

export { CountdownContentFields, CountdownStyleFields };
