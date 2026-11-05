const assert = require("node:assert/strict");
const test = require("node:test");
const { parseRss } = require("./rssParser");

const wallaFeed = {
    source: "walla",
    category: "israel",
    publisher: "וואלה",
    articleHosts: ["walla.co.il"],
    attribution: {
        text: "כותרות מערוץ ה-RSS של וואלה.",
        url: "https://www.walla.co.il/rss"
    }
};

test("parses Hebrew RSS titles without taking descriptions or images", () => {
    const items = parseRss(`<?xml version="1.0" encoding="utf-8"?>
        <rss version="2.0">
            <channel>
                <title>בדיקה</title>
                <item>
                    <title>לוח החדשות לדוגמה נפתח מימין לשמאל</title>
                    <link>https://www.walla.co.il/item/100</link>
                    <guid>https://www.walla.co.il/item/100</guid>
                    <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
                    <description><p>טקסט מלא שלא אמור להישמר</p></description>
                    <enclosure url="https://www.walla.co.il/image.jpg" type="image/jpeg" />
                </item>
            </channel>
        </rss>`, wallaFeed);

    assert.equal(items.length, 1);
    assert.equal(items[0].title, "לוח החדשות לדוגמה נפתח מימין לשמאל");
    assert.equal(items[0].title[0], "ל");
    assert.equal(items[0].publisher, "וואלה");
    assert.equal(items[0].publishedAt, "2026-11-04T10:00:00.000Z");
    assert.equal(items[0].category, "israel");
    assert.equal(items[0].articleUrl, "https://www.walla.co.il/item/100");
    assert.equal(items[0].source, "walla");
    assert.equal(JSON.stringify(items[0]).includes("טקסט מלא"), false);
    assert.equal(JSON.stringify(items[0]).includes("image.jpg"), false);
    assert.match(items[0].id, /^[a-f0-9]{16}$/);
});

test("keeps Hebrew direction and decodes a CDATA title into plain text", () => {
    const items = parseRss(`<rss version="2.0"><channel><item>
        <title><![CDATA[מבזק דוגמה <b>12:30</b> מימין לשמאל]]></title>
        <link>https://www.ynet.co.il/news/1</link>
        <pubDate>Wed, 04 Nov 2026 11:11:52 +0200</pubDate>
    </item></channel></rss>`, {
        ...wallaFeed,
        source: "ynet",
        publisher: "ynet",
        articleHosts: ["ynet.co.il"]
    });

    assert.equal(items[0].title, "מבזק דוגמה 12:30 מימין לשמאל");
    assert.equal(items[0].title.codePointAt(0), 0x05DE);
    assert.equal(items[0].publishedAt, "2026-11-04T09:11:52.000Z");
});

test("rejects documents with DTD or external entity declarations", () => {
    const document = `<?xml version="1.0"?>
        <!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
        <rss version="2.0"><channel><item>
            <title>&xxe;</title>
            <link>https://www.walla.co.il/item/1</link>
            <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
        </item></channel></rss>`;

    assert.throws(() => parseRss(document, wallaFeed), (error) => error.code === "unsafe");
});

test("drops a headline that uses an undeclared entity or an unapproved link", () => {
    assert.throws(() => parseRss(`<rss version="2.0"><channel><item>
        <title>כותרת &secret;</title>
        <link>https://www.walla.co.il/item/1</link>
        <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
    </item></channel></rss>`, wallaFeed), (error) => error.code === "invalid");

    assert.throws(() => parseRss(`<rss version="2.0"><channel><item>
        <title>כותרת בטוחה</title>
        <link>http://www.walla.co.il/item/1</link>
        <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
    </item></channel></rss>`, wallaFeed), (error) => error.code === "invalid");
});

test("removes embedded markup from a title and ignores a broken document", () => {
    const items = parseRss(`<rss version="2.0"><channel><item>
        <title>שלום<script>alert(1)</script>עולם &#1489;דיקה</title>
        <link>https://news.walla.co.il/item/2</link>
        <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
    </item></channel></rss>`, wallaFeed);

    assert.equal(items[0].title, "שלוםעולם בדיקה");
    assert.equal(items[0].title.includes("alert"), false);
    assert.throws(() => parseRss("<html><title>לא RSS</title></html>", wallaFeed), (error) => {
        return error.code === "invalid";
    });
});
