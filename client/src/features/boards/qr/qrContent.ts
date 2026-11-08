import { create as createQrCode } from "qrcode";

const maximumQrContentLength = 512;
const maximumQrContentDraftLength = 1024;
const qrQuietZoneModules = 4;
const qrErrorCorrectionLevel = "Q";
const minimumQrContrast = 7;
const opaqueHexPattern = /^#[0-9a-fA-F]{6}$/;
const unsafeQrSchemes = new Set(["javascript", "data", "vbscript", "file", "blob"]);

const qrContentMessages = {
    empty: "Add a URL or some text.",
    tooLong: "Use 512 characters or fewer so the code stays scannable.",
    unsafeLink: "Only http and https links are allowed.",
    invalidLink: "Enter a valid http or https link.",
    credentials: "Links with a username or password are not allowed.",
    contrast: "QR colors need more contrast so the code stays scannable.",
} as const;

function qrContentHasIllegalControl(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);

        if (code === 10 || code === 13) {
            continue;
        }

        if (code <= 31 || code === 127) {
            return true;
        }
    }

    return false;
}

function readQrScheme(value: string): { scheme: string; remainder: string } | null {
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);

    if (match === null) {
        return null;
    }

    return {
        scheme: (match[1] ?? "").toLowerCase(),
        remainder: value.slice(match[0].length),
    };
}

function qrContentIssue(value: string): string | null {
    const text = value.trim();

    if (text.length === 0) {
        return qrContentMessages.empty;
    }

    if (text.length > maximumQrContentLength) {
        return qrContentMessages.tooLong;
    }

    if (qrContentHasIllegalControl(text)) {
        return qrContentMessages.invalidLink;
    }

    const scheme = readQrScheme(text);

    if (scheme === null) {
        return null;
    }

    if (unsafeQrSchemes.has(scheme.scheme)) {
        return qrContentMessages.unsafeLink;
    }

    const looksLikeUrl = scheme.scheme === "http"
        || scheme.scheme === "https"
        || scheme.remainder.startsWith("//");

    if (!looksLikeUrl) {
        return null;
    }

    if (scheme.scheme !== "http" && scheme.scheme !== "https") {
        return qrContentMessages.unsafeLink;
    }

    let url: URL;

    try {
        url = new URL(text);
    } catch {
        return qrContentMessages.invalidLink;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return qrContentMessages.unsafeLink;
    }

    if (url.hostname.trim().length === 0) {
        return qrContentMessages.invalidLink;
    }

    if (url.username.length > 0 || url.password.length > 0) {
        return qrContentMessages.credentials;
    }

    return null;
}

function opaqueQrHex(value: string): string | null {
    const color = value.trim();

    if (!opaqueHexPattern.test(color)) {
        return null;
    }

    return color.toLowerCase();
}

function channelLuminance(channel: number): number {
    const value = channel / 255;

    if (value <= 0.03928) {
        return value / 12.92;
    }

    return ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
    const red = Number.parseInt(hex.slice(1, 3), 16);
    const green = Number.parseInt(hex.slice(3, 5), 16);
    const blue = Number.parseInt(hex.slice(5, 7), 16);

    return (0.2126 * channelLuminance(red))
        + (0.7152 * channelLuminance(green))
        + (0.0722 * channelLuminance(blue));
}

function qrContrastRatio(foreground: string, background: string): number | null {
    const dark = opaqueQrHex(foreground);
    const light = opaqueQrHex(background);

    if (dark === null || light === null) {
        return null;
    }

    const first = relativeLuminance(dark);
    const second = relativeLuminance(light);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);

    return (lighter + 0.05) / (darker + 0.05);
}

function qrColorsAreReadable(foreground: string, background: string): boolean {
    const ratio = qrContrastRatio(foreground, background);

    return ratio !== null && ratio >= minimumQrContrast;
}

function createQrSvg(content: string, foreground: string, background: string): string | null {
    if (qrContentIssue(content) !== null || !qrColorsAreReadable(foreground, background)) {
        return null;
    }

    const dark = opaqueQrHex(foreground);
    const light = opaqueQrHex(background);

    if (dark === null || light === null) {
        return null;
    }

    let code: ReturnType<typeof createQrCode>;

    try {
        code = createQrCode(content.trim(), { errorCorrectionLevel: qrErrorCorrectionLevel });
    } catch {
        return null;
    }

    const size = code.modules.size;
    const dimension = size + (qrQuietZoneModules * 2);
    const rects: string[] = [];

    for (let row = 0; row < size; row += 1) {
        let column = 0;

        while (column < size) {
            if (!code.modules.get(row, column)) {
                column += 1;
                continue;
            }

            let end = column + 1;

            while (end < size && code.modules.get(row, end)) {
                end += 1;
            }

            rects.push(
                `<rect x="${column + qrQuietZoneModules}" y="${row + qrQuietZoneModules}" width="${end - column}" height="1"/>`,
            );
            column = end;
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" shape-rendering="crispEdges" role="img"><rect width="${dimension}" height="${dimension}" fill="${light}"/><g fill="${dark}">${rects.join("")}</g></svg>`;
}

function encodedQrPayload(content: string): string | null {
    if (qrContentIssue(content) !== null) {
        return null;
    }

    try {
        const code = createQrCode(content.trim(), { errorCorrectionLevel: qrErrorCorrectionLevel });
        const segment = code.segments[0];

        if (segment === undefined || !("data" in segment)) {
            return null;
        }

        return code.segments.map((item) => {
            if (typeof item.data === "string") {
                return item.data;
            }

            return Array.from(item.data, (value) => String.fromCharCode(value)).join("");
        }).join("");
    } catch {
        return null;
    }
}

export {
    createQrSvg,
    encodedQrPayload,
    maximumQrContentDraftLength,
    maximumQrContentLength,
    minimumQrContrast,
    opaqueQrHex,
    qrColorsAreReadable,
    qrContentHasIllegalControl,
    qrContentIssue,
    qrContentMessages,
    qrContrastRatio,
    qrErrorCorrectionLevel,
    qrQuietZoneModules,
};
