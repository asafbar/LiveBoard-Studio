import type { QrWidgetSettings } from "../types/boardTypes.ts";

const defaultQrContent = "https://example.com";

function defaultQrSettings(): QrWidgetSettings {
    return {
        content: defaultQrContent,
        title: "Scan the code",
        subtitle: "Point your camera at the code",
        preset: "classic",
        direction: "auto",
        align: "center",
        foregroundColor: "#000000",
        codeBackgroundColor: "#ffffff",
        backgroundColor: "color-mix(in srgb, var(--canvas-board) 88%, var(--foreground))",
        textColor: "var(--foreground)",
        borderRadius: 24,
    };
}

export { defaultQrContent, defaultQrSettings };
