const { MIME_EXTENSIONS } = require("../storage/mediaStorage");

const MAX_FILENAME_CHARS = 255;

function sanitizeDisplayFilename(rawName, mimeType) {
    const extension = MIME_EXTENSIONS[mimeType] || "jpg";
    const fallback = `image.${extension}`;
    const baseName = decodeUploadFilename(rawName).replaceAll("\\", "/").split("/").pop();
    const cleaned = stripDisallowedFilenameChars(baseName).trim();
    const limited = limitCodePoints(cleaned, MAX_FILENAME_CHARS).trim();

    if (limited === "" || limited === "." || limited === "..") {
        return fallback;
    }

    return limited;
}

// Multipart parsers read header bytes as Latin-1. Browsers put UTF-8 in the
// filename parameter, and those bytes include C1 controls until they are
// decoded. A name that already contains a character above U+00FF came from
// a parser that decoded Unicode itself.
function decodeUploadFilename(rawName) {
    if (typeof rawName !== "string" || rawName.length === 0) {
        return "";
    }

    if (!isLatin1(rawName)) {
        return rawName;
    }

    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(rawName, "latin1"));
    } catch (error) {
        return rawName;
    }
}

function isLatin1(value) {
    for (const character of value) {
        if (character.codePointAt(0) > 0xff) {
            return false;
        }
    }

    return true;
}

function stripDisallowedFilenameChars(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
}

function limitCodePoints(value, maxChars) {
    const characters = Array.from(value);

    if (characters.length <= maxChars) {
        return value;
    }

    return characters.slice(0, maxChars).join("");
}

module.exports = {
    sanitizeDisplayFilename
};
