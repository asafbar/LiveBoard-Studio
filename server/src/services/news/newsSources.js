const NEWS_SOURCES = ["walla", "ynet", "sample", "usgs"];
const NEWS_CATEGORIES = ["israel", "breaking", "business", "technology", "earthquakes"];
const MAX_NEWS_LIMIT = 10;
const MAX_STORED_ITEMS = 10;

const WALLA_REDIRECT_HOSTS = ["www.walla.co.il"];
const WALLA_ARTICLE_HOSTS = ["walla.co.il"];

// Only feeds inspected in this phase are listed. Category feeds that were
// not fetched are absent, so the API cannot invent a URL for them.
const NEWS_FEEDS = [
    {
        source: "walla",
        category: "israel",
        publisher: "וואלה",
        url: "https://www.walla.co.il/rss/feed/news/israel",
        redirectHosts: WALLA_REDIRECT_HOSTS,
        articleHosts: WALLA_ARTICLE_HOSTS,
        attribution: {
            text: "כותרות מערוץ ה-RSS של וואלה. התצוגה כפופה לתנאי השימוש של וואלה.",
            url: "https://www.walla.co.il/rss"
        }
    },
    {
        source: "walla",
        category: "breaking",
        publisher: "וואלה",
        url: "https://www.walla.co.il/rss/feed/news/breaking-news",
        redirectHosts: WALLA_REDIRECT_HOSTS,
        articleHosts: WALLA_ARTICLE_HOSTS,
        attribution: {
            text: "מבזקים מערוץ ה-RSS של וואלה. התצוגה כפופה לתנאי השימוש של וואלה.",
            url: "https://www.walla.co.il/rss"
        }
    }
];

function findNewsFeed(source, category) {
    return NEWS_FEEDS.find((feed) => {
        return feed.source === source && feed.category === category;
    }) || null;
}

module.exports = {
    MAX_NEWS_LIMIT,
    MAX_STORED_ITEMS,
    NEWS_CATEGORIES,
    NEWS_FEEDS,
    NEWS_SOURCES,
    findNewsFeed
};
