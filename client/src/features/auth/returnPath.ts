const FALLBACK_PATH = "/boards";

function readSafeNextPath(value: string | null): string {
    if (value === null || value.trim() === "") {
        return FALLBACK_PATH;
    }

    let decoded: string;

    try {
        decoded = decodeURIComponent(value);
    } catch {
        return FALLBACK_PATH;
    }

    if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
        return FALLBACK_PATH;
    }

    let url: URL;

    try {
        url = new URL(decoded, "http://liveboard.local");
    } catch {
        return FALLBACK_PATH;
    }

    if (url.username !== "" || url.password !== "" || url.host !== "liveboard.local") {
        return FALLBACK_PATH;
    }

    if (url.pathname === "/login" || url.pathname.startsWith("/login/")) {
        return FALLBACK_PATH;
    }

    return `${url.pathname}${url.search}${url.hash}`;
}

export { readSafeNextPath };
