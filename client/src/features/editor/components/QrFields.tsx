import { useState, type ChangeEvent, type ReactNode } from "react";
import type {
    QrAlign,
    QrDirection,
    QrFontFamily,
    QrFontWeight,
    QrPreset,
    QrWidgetSettings,
} from "../../boards/types/boardTypes.ts";
import { defaultQrSettings } from "../../boards/qr/qrDefaults.ts";
import { qrColorsAreReadable, qrContentIssue, qrContentMessages } from "../../boards/qr/qrContent.ts";
import {
    qrPresetLabel,
    qrPresets,
    resolveQrAlign,
    resolveQrDirection,
    resolveQrFontFamily,
    resolveQrFontSize,
    resolveQrFontWeight,
    resolveQrPadding,
    resolveQrTitleFontFamily,
    resolveQrTitleFontSize,
    resolveQrTitleFontWeight,
    resolveQrTitleSpacing,
} from "../../boards/qr/qrPresentation.ts";
import ColorAlphaField from "./ColorAlphaField.tsx";
import ColorField from "./ColorField.tsx";
import {
    maximumQrFontSize,
    maximumQrPadding,
    maximumQrSubtitleLength,
    maximumQrTitleFontSize,
    maximumQrTitleLength,
    maximumQrTitleSpacing,
    minimumQrFontSize,
    minimumQrTitleFontSize,
    type QrSettingsPatch,
} from "../qrSettings.ts";

type QrFieldsProps = {
    settings: QrWidgetSettings;
    onQrSettingsChange: (patch: QrSettingsPatch, gesture?: "color" | null) => void;
    onColorSessionEnd?: () => void;
};

type StyleSectionId = "design" | "title" | "colors";

const fieldClassName = "h-9 w-full rounded-control border border-border bg-surface-raised px-3 text-sm text-foreground outline-none";
const textAreaClassName = "min-h-24 w-full rounded-control border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none";
const selectClassName = "h-9 w-full appearance-none rounded-control border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground outline-none";
const defaults = defaultQrSettings();

function QrContentFields({ settings, onQrSettingsChange }: QrFieldsProps) {
    const issue = qrContentIssue(settings.content);

    return (
        <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">URL or text</span>
                <textarea
                    className={textAreaClassName}
                    data-validation-path="content"
                    value={settings.content}
                    onChange={(event) => {
                        onQrSettingsChange({ content: event.target.value });
                    }}
                />
                {issue === null ? (
                    <span className="text-xs text-secondary">The code updates as you type. Only http and https links are accepted.</span>
                ) : (
                    <span className="text-xs text-danger">{issue}</span>
                )}
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Title</span>
                <input
                    className={fieldClassName}
                    data-validation-path="title"
                    maxLength={maximumQrTitleLength}
                    value={settings.title ?? ""}
                    onChange={(event) => {
                        onQrSettingsChange({
                            title: event.target.value.length === 0 ? null : event.target.value,
                        });
                    }}
                />
            </label>
            <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">Subtitle</span>
                <input
                    className={fieldClassName}
                    data-validation-path="subtitle"
                    maxLength={maximumQrSubtitleLength}
                    value={settings.subtitle ?? ""}
                    onChange={(event) => {
                        onQrSettingsChange({
                            subtitle: event.target.value.length === 0 ? null : event.target.value,
                        });
                    }}
                />
            </label>
        </div>
    );
}

function QrStyleFields({ settings, onQrSettingsChange, onColorSessionEnd }: QrFieldsProps) {
    const [open, setOpen] = useState<Record<StyleSectionId, boolean>>({
        design: true,
        title: false,
        colors: false,
    });
    const [contrastError, setContrastError] = useState<string | null>(null);

    function changeQrColor(key: "foregroundColor" | "codeBackgroundColor", color: string) {
        const foreground = key === "foregroundColor" ? color : settings.foregroundColor;
        const background = key === "codeBackgroundColor" ? color : settings.codeBackgroundColor;

        if (!qrColorsAreReadable(foreground, background)) {
            setContrastError(qrContentMessages.contrast);
            return;
        }

        setContrastError(null);
        onQrSettingsChange({ [key]: color }, "color");
    }

    return (
        <div className="flex flex-col">
            <StyleSection id="design" label="Design & Layout" open={open.design} onToggle={() => toggle(setOpen, "design")}>
                <div className="grid grid-cols-2 gap-2">
                    {qrPresets.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            aria-pressed={settings.preset === preset}
                            onClick={() => onQrSettingsChange({ preset })}
                            className={
                                settings.preset === preset
                                    ? "rounded-md border border-cyan/70 bg-surface-raised px-2 py-2 text-xs font-medium text-foreground"
                                    : "rounded-md border border-border bg-surface-raised/40 px-2 py-2 text-xs font-medium text-secondary"
                            }
                        >
                            <PresetMark preset={preset} />
                            <span className="mt-1 block">{qrPresetLabel(preset)}</span>
                        </button>
                    ))}
                </div>
                <ChoiceField
                    label="Direction"
                    value={resolveQrDirection(settings)}
                    options={[["auto", "Auto"], ["ltr", "Left to right"], ["rtl", "Right to left"]]}
                    onChange={(direction) => onQrSettingsChange({ direction: direction as QrDirection })}
                />
                <ChoiceField
                    label="Alignment"
                    value={resolveQrAlign(settings)}
                    options={[["start", "Start"], ["center", "Center"], ["end", "End"], ["left", "Left"], ["right", "Right"]]}
                    onChange={(align) => onQrSettingsChange({ align: align as QrAlign })}
                />
                <NumberField
                    label="Padding"
                    value={resolveQrPadding(settings)}
                    minimum={0}
                    maximum={maximumQrPadding}
                    onChange={(padding) => onQrSettingsChange({ padding })}
                />
                <NumberField
                    label="Corner radius"
                    value={settings.borderRadius}
                    minimum={0}
                    maximum={240}
                    onChange={(borderRadius) => onQrSettingsChange({ borderRadius })}
                />
            </StyleSection>
            <StyleSection id="title" label="Title & Typography" open={open.title} onToggle={() => toggle(setOpen, "title")}>
                <ChoiceField
                    label="Title alignment"
                    value={settings.titleAlign ?? resolveQrAlign(settings)}
                    options={[["start", "Start"], ["center", "Center"], ["end", "End"], ["left", "Left"], ["right", "Right"]]}
                    onChange={(titleAlign) => onQrSettingsChange({ titleAlign: titleAlign as QrAlign })}
                />
                <NumberField
                    label="Title spacing"
                    value={resolveQrTitleSpacing(settings)}
                    minimum={0}
                    maximum={maximumQrTitleSpacing}
                    onChange={(titleSpacing) => onQrSettingsChange({ titleSpacing })}
                />
                <ChoiceField
                    label="Title font"
                    value={resolveQrTitleFontFamily(settings)}
                    options={[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]]}
                    onChange={(titleFontFamily) => onQrSettingsChange({ titleFontFamily: titleFontFamily as QrFontFamily })}
                />
                <NumberField
                    label="Title size"
                    value={resolveQrTitleFontSize(settings)}
                    minimum={minimumQrTitleFontSize}
                    maximum={maximumQrTitleFontSize}
                    onChange={(titleFontSize) => onQrSettingsChange({ titleFontSize })}
                />
                <ChoiceField
                    label="Title weight"
                    value={String(resolveQrTitleFontWeight(settings))}
                    options={[["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"]]}
                    onChange={(titleFontWeight) => onQrSettingsChange({ titleFontWeight: Number(titleFontWeight) as QrFontWeight })}
                />
                <ChoiceField
                    label="Text font"
                    value={resolveQrFontFamily(settings)}
                    options={[["sans", "Sans"], ["serif", "Serif"], ["mono", "Mono"]]}
                    onChange={(fontFamily) => onQrSettingsChange({ fontFamily: fontFamily as QrFontFamily })}
                />
                <NumberField
                    label="Text size"
                    value={resolveQrFontSize(settings)}
                    minimum={minimumQrFontSize}
                    maximum={maximumQrFontSize}
                    onChange={(fontSize) => onQrSettingsChange({ fontSize })}
                />
                <ChoiceField
                    label="Text weight"
                    value={String(resolveQrFontWeight(settings))}
                    options={[["400", "Regular"], ["500", "Medium"], ["600", "Semibold"], ["700", "Bold"]]}
                    onChange={(fontWeight) => onQrSettingsChange({ fontWeight: Number(fontWeight) as QrFontWeight })}
                />
            </StyleSection>
            <StyleSection id="colors" label="Colors & Background" open={open.colors} onToggle={() => toggle(setOpen, "colors")}>
                <ColorAlphaField
                    label="Background"
                    value={settings.backgroundColor}
                    opacity={settings.backgroundOpacity}
                    defaultColor={defaults.backgroundColor}
                    onColorChange={(backgroundColor) => onQrSettingsChange({ backgroundColor }, "color")}
                    onOpacityChange={(backgroundOpacity) => onQrSettingsChange({ backgroundOpacity }, "color")}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Text"
                    value={settings.textColor}
                    opacity={settings.textOpacity}
                    defaultColor={defaults.textColor}
                    onColorChange={(textColor) => onQrSettingsChange({ textColor }, "color")}
                    onOpacityChange={(textOpacity) => onQrSettingsChange({ textOpacity }, "color")}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorAlphaField
                    label="Title"
                    value={settings.titleColor ?? settings.textColor}
                    opacity={settings.titleOpacity}
                    defaultColor={defaults.textColor}
                    onColorChange={(titleColor) => onQrSettingsChange({ titleColor }, "color")}
                    onOpacityChange={(titleOpacity) => onQrSettingsChange({ titleOpacity }, "color")}
                    onReset={() => onQrSettingsChange({ titleColor: null, titleOpacity: null }, "color")}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorField
                    label="QR foreground"
                    value={settings.foregroundColor}
                    validationPath="foregroundColor"
                    issueMessage={contrastError}
                    onColorChange={(foregroundColor) => changeQrColor("foregroundColor", foregroundColor)}
                    onSessionEnd={onColorSessionEnd}
                />
                <ColorField
                    label="QR background"
                    value={settings.codeBackgroundColor}
                    validationPath="codeBackgroundColor"
                    issueMessage={contrastError}
                    hint="The quiet zone uses this color and stays opaque."
                    onColorChange={(codeBackgroundColor) => changeQrColor("codeBackgroundColor", codeBackgroundColor)}
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
    const panelId = `qr-style-${id}`;

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

function PresetMark({ preset }: { preset: QrPreset }) {
    if (preset === "split") {
        return (
            <span aria-hidden="true" className="flex h-10 items-center gap-1 rounded bg-surface-hover/70 px-1.5">
                <span className="flex flex-1 flex-col gap-1">
                    <span className="h-1.5 w-full rounded-full bg-foreground/80" />
                    <span className="h-1 w-2/3 rounded-full bg-foreground/40" />
                </span>
                <span className="size-6 rounded-sm bg-foreground/80" />
            </span>
        );
    }

    return (
        <span aria-hidden="true" className="flex h-10 flex-col items-center justify-center gap-1 rounded bg-surface-hover/70">
            <span className="h-1 w-8 rounded-full bg-foreground/70" />
            <span className="size-4 rounded-sm bg-foreground/80" />
        </span>
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

export { QrContentFields, QrStyleFields };
