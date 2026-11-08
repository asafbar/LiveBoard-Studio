const SAMPLE_PUBLISHER = "LiveBoard Studio";
const SAMPLE_ATTRIBUTION = {
    text: "כותרות לדוגמה מקוריות של LiveBoard Studio. אלה אינן ידיעות של כלי תקשורת.",
    url: null
};

const SAMPLE_HEADLINES = {
    israel: [
        "לוח החדשות לדוגמה נפתח מימין לשמאל",
        "תרגיל סטודיו: עדכון עירוני ללא מקור חיצוני",
        "כותרת בדיקה על תחבורה ציבורית בעיר הדגמה",
        "הודעת דוגמה על פתיחת מרכז קהילתי שכונתי",
        "סיכום יומי לדוגמה נשאר בתוך המערכת"
    ],
    breaking: [
        "מבזק דוגמה: זהו טקסט מקורי ולא דיווח חדשותי",
        "בדיקת קצב: המבזק מתחלף בלי לפנות לרשת",
        "התראת סטודיו לדוגמה מוצגת בעברית בלבד",
        "שורת מבזק קצרה לבדיקת שורה נעה",
        "המערכת מסמנת שמדובר בתוכן לדוגמה"
    ],
    business: [
        "שוק הדגמה: מדד לדוגמה עלה בלי נתון אמיתי",
        "חברת בדיקה פרסמה דוח רבעוני בדוי",
        "כותרת כלכלה מקורית לבדיקת כרטיסי חדשות",
        "עוגן הדגמה מציג מטבע וזמן משמאל לימין",
        "סיכום עסקי לדוגמה אינו מגיע מסוחר או מבורסה"
    ],
    technology: [
        "גרסת דוגמה: מסך הקליטה שומר על כיוון עברי",
        "בדיקת מערכת מציגה שעון 12:30 בלי לערבב אותיות",
        "כלי הדגמה חדש נשאר מנותק מספקי חדשות",
        "עדכון טכנולוגיה לדוגמה נכתב עבור צילומי מסך",
        "המסך מציג מקור לדוגמה במקום שם של מוציא לאור"
    ]
};

function sampleHeadlines(category, limit, fetchedAt) {
    const titles = SAMPLE_HEADLINES[category] || [];
    const items = titles.slice(0, limit).map((title, index) => {
        const sequence = index + 1;

        return {
            id: `sample-${category}-${sequence}`,
            title,
            publisher: SAMPLE_PUBLISHER,
            publishedAt: "2026-11-04T08:00:00.000Z",
            category,
            articleUrl: null,
            source: "sample",
            attribution: SAMPLE_ATTRIBUTION
        };
    });

    return {
        mode: "sample",
        status: "fresh",
        source: "sample",
        category,
        fetchedAt,
        attribution: SAMPLE_ATTRIBUTION,
        items
    };
}

module.exports = {
    SAMPLE_ATTRIBUTION,
    SAMPLE_PUBLISHER,
    sampleHeadlines
};
