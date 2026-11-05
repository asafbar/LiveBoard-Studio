const crypto = require("crypto");

const MAX_RSS_CHARS = 200000;
const MAX_PARSED_ITEMS = 10;
const MAX_TITLE_CHARS = 180;
const MAX_URL_CHARS = 500;

function parseRss(xml, feed) {
    if (typeof xml !== "string" || xml.length === 0 || xml.length > MAX_RSS_CHARS) {
        throw parserError("invalid", "RSS document has an unsupported size.");
    }

    if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) {
        throw parserError("unsafe", "RSS document contains a forbidden declaration.");
    }

    if (!/<rss\b/i.test(xml) || !/<channel\b/i.test(xml)) {
        throw parserError("invalid", "RSS document is missing a channel.");
    }

    const items = [];
    const pattern = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let match = pattern.exec(xml);

    while (match !== null && items.length < MAX_PARSED_ITEMS) {
        const item = normalizeItem(match[1], feed);

        if (item !== null) {
            items.push(item);
        }

        match = pattern.exec(xml);
    }

    if (items.length === 0) {
        throw parserError("invalid", "RSS document did not contain a usable headline.");
    }

    return items;
}

function normalizeItem(fragment, feed) {
    const title = readPlainText(readTag(fragment, "title"));
    const articleUrl = readArticleUrl(fragment, feed);
    const publishedAt = readPublishedAt(readTag(fragment, "pubDate"));

    if (title === null || articleUrl === null || publishedAt === null) {
        return null;
    }

    return {
        id: headlineId(articleUrl),
        title,
        publisher: feed.publisher,
        publishedAt,
        category: feed.category,
        articleUrl,
        source: feed.source,
        attribution: feed.attribution
    };
}

function readArticleUrl(fragment, feed) {
    const link = readTag(fragment, "link");
    const guid = readTag(fragment, "guid");
    const candidate = firstHttpsUrl(link) || firstHttpsUrl(guid);

    if (candidate === null || candidate.length > MAX_URL_CHARS) {
        return null;
    }

    let url;

    try {
        url = new URL(candidate);
    } catch (error) {
        return null;
    }

    if (url.protocol !== "https:" || url.username !== "" || url.password !== "") {
        return null;
    }

    if (url.port !== "" && url.port !== "443") {
        return null;
    }

    if (!hostMatches(url.hostname, feed.articleHosts)) {
        return null;
    }

    return url.toString();
}

function firstHttpsUrl(raw) {
    if (raw === null) {
        return null;
    }

    const href = raw.attributes.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
    const value = href ? (href[1] || href[2] || "") : raw.body;

    return readPlainText({
        attributes: "",
        body: value
    });
}

function readPublishedAt(raw) {
    const text = readPlainText(raw);

    if (text === null) {
        return null;
    }

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString();
}

function readTag(fragment, name) {
    const expression = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "i");
    const match = fragment.match(expression);

    if (match === null) {
        return null;
    }

    return {
        attributes: match[1],
        body: match[2]
    };
}

function readPlainText(raw) {
    if (raw === null) {
        return null;
    }

    const cdata = raw.body.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
    const decoded = decodeEntities(cdata === null ? raw.body : cdata[1]);

    if (decoded === null) {
        return null;
    }

    const withoutDanger = decoded
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
    const plain = withoutDanger
        .replace(/<[^>]+>/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    if (plain.length === 0 || plain.length > MAX_TITLE_CHARS || /[<>]/.test(plain)) {
        return null;
    }

    return plain;
}

function decodeEntities(value) {
    let unknown = false;
    const text = value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token) => {
        const lower = token.toLowerCase();

        if (lower === "amp") {
            return "&";
        }

        if (lower === "lt") {
            return "<";
        }

        if (lower === "gt") {
            return ">";
        }

        if (lower === "quot") {
            return "\"";
        }

        if (lower === "apos") {
            return "'";
        }

        const codePoint = readCodePoint(token);

        if (codePoint === null) {
            unknown = true;
            return "";
        }

        return String.fromCodePoint(codePoint);
    });

    if (unknown) {
        return null;
    }

    return text;
}

function readCodePoint(token) {
    const hexadecimal = token.match(/^#x([0-9a-f]+)$/i);
    const decimal = token.match(/^#([0-9]+)$/);
    const digits = hexadecimal ? hexadecimal[1] : decimal ? decimal[1] : null;

    if (digits === null) {
        return null;
    }

    const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);

    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
        return null;
    }

    if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
        return null;
    }

    return codePoint;
}

function hostMatches(hostname, suffixes) {
    const host = hostname.toLowerCase();

    return suffixes.some((suffix) => {
        return host === suffix || host.endsWith(`.${suffix}`);
    });
}

function headlineId(articleUrl) {
    return crypto.createHash("sha256").update(articleUrl).digest("hex").slice(0, 16);
}

function parserError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

module.exports = {
    MAX_PARSED_ITEMS,
    MAX_RSS_CHARS,
    parseRss
};
