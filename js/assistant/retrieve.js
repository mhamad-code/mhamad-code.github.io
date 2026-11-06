// ==========================================================
// Finds the pieces of the site that answer a question.
// BM25 ranking that understands English and Arabic. Pure functions, no DOM.
// ==========================================================

function normalize(word) {
    let w = word
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")   // Arabic diacritics and tatweel
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه");

    if (/^[\u0600-\u06FF]/.test(w)) {
        const stripped = w.replace(/^(وال|بال|كال|فال|لل|ال)/, "");
        if (stripped.length >= 3) w = stripped;
    } else if (/^[a-z]+$/.test(w) && w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) {
        w = w.slice(0, -1);
    }
    return w;
}

const STOP = new Set([
    "the", "and", "for", "with", "that", "this", "from", "are", "was", "you", "your", "have", "has", "can",
    "what", "how", "who", "when", "where", "which", "about", "there", "their", "into", "out", "not", "but",
    "all", "any", "its", "our", "his", "her", "they", "them", "then", "than", "also", "just", "will", "would",
    "should", "could", "does", "did", "is", "it", "in", "on", "at", "to", "of", "a", "an", "as", "be", "by",
    "or", "if", "do", "me", "my", "i", "we", "he", "she", "tell", "show", "please",
    "في", "من", "على", "الى", "إلى", "عن", "هل", "ما", "ماذا", "كيف", "هو", "هي", "هذا", "هذه", "ذلك", "تلك",
    "او", "أو", "مع", "كل", "لا", "لم", "لن", "ان", "أن", "إن", "كان", "يكون", "انا", "أنا", "انت", "أنت",
    "هناك", "عند", "بعد", "قبل", "التي", "الذي", "لي", "لك", "عندك", "بدي", "شو", "ايش", "وين"
].map(normalize));

export function tokenize(text) {
    return String(text)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 2)
        .map(normalize)
        .filter((w) => w.length >= 2 && !STOP.has(w));
}

function stats(chunk) {
    if (!chunk._tf) {
        const tf = new Map();
        const tokens = tokenize(`${chunk.title || ""} ${chunk.title || ""} ${chunk.text}`); // the title counts double
        tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
        chunk._tf = tf;
        chunk._len = tokens.length || 1;
    }
    return chunk;
}

// Best `limit` chunks for the question, most relevant first
export function rank(query, chunks, limit = 6) {
    const terms = [...new Set(tokenize(query))];
    if (!terms.length || !chunks.length) return [];

    chunks.forEach(stats);
    const avg = chunks.reduce((sum, c) => sum + c._len, 0) / chunks.length;
    const k1 = 1.4;
    const b = 0.75;

    const idf = new Map(terms.map((t) => {
        const df = chunks.reduce((n, c) => n + (c._tf.has(t) ? 1 : 0), 0);
        return [t, Math.log(1 + (chunks.length - df + 0.5) / (df + 0.5))];
    }));

    return chunks
        .map((chunk) => {
            let score = 0;
            for (const t of terms) {
                const f = chunk._tf.get(t);
                if (f) score += idf.get(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * chunk._len) / avg)));
            }
            return { chunk, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b2) => b2.score - a.score)
        .slice(0, limit)
        .map((r) => r.chunk);
}

// Cuts text into pieces of at most `max` characters, on paragraph then sentence edges
export function chunkText(text, max = 800) {
    const out = [];
    let current = "";
    const push = () => {
        if (current.trim()) out.push(current.trim());
        current = "";
    };
    const pieces = String(text).split(/\n\s*\n/).flatMap((para) =>
        para.length <= max ? [para] : para.split(/(?<=[.!?؟。])\s+/));

    for (let piece of pieces) {
        while (piece.length > max) {            // a single huge sentence: hard cut
            push();
            out.push(piece.slice(0, max));
            piece = piece.slice(max);
        }
        if (current && current.length + piece.length + 2 > max) push();
        current += (current ? "\n\n" : "") + piece;
    }
    push();
    return out;
}

// Splits Markdown by headings (ignoring "#" lines inside code fences)
export function chunkMarkdown(markdown, max = 800) {
    const sections = [];
    let heading = "";
    let lines = [];
    let fenced = false;
    const flush = () => {
        const body = lines.join("\n").trim();
        if (body) chunkText(body, max).forEach((text) => sections.push({ heading, text }));
        lines = [];
    };

    for (const line of String(markdown).split("\n")) {
        if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
        const h = !fenced && line.match(/^#{1,4}\s+(.*)$/);
        if (h) {
            flush();
            heading = h[1].trim();
        } else {
            lines.push(line);
        }
    }
    flush();
    return sections;
}

/* ---------- Arabic <-> English bridge ---------- */
// The site texts are mostly English, visitors may write Arabic (and the other way round).
// Each group lists the same idea in both languages.
const GROUPS = [
    [["تواصل", "اتصال", "واتساب", "واتس", "تلغرام", "تيليجرام", "انستقرام", "انستغرام", "ايميل", "بريد", "رقم", "هاتف"],
        ["contact", "whatsapp", "telegram", "instagram", "email", "phone", "number", "reach"]],
    [["مشاريع", "مشروع", "اعمال", "عمل"], ["project", "projects", "github", "repository", "work"]],
    [["خدمات", "خدمه", "خدمة", "تقدم", "تعمل"], ["service", "services", "offer", "hire", "build"]],
    [["مهارات", "مهاره", "تقنيات", "لغات"], ["skill", "skills", "technology", "technologies", "tools", "languages"]],
    [["نبذه", "نبذة", "تعريف", "شخص", "مطور"], ["about", "who", "developer", "introduction"]],
    [["مدونه", "مدونة", "مقالات", "مقال", "منشورات", "منشور"], ["blog", "post", "posts", "article", "articles"]],
    [["ادوات", "أدوات", "اداة", "أداة"], ["tool", "tools"]],
    [["باركود", "كيو"], ["qr", "code"]],
    [["كلمه", "كلمة", "سر", "باسورد", "مرور"], ["password", "passwords"]],
    [["جيسون"], ["json"]],
    [["لون", "ألوان", "الوان"], ["color", "colors", "hex", "rgb", "hsl"]],
    [["اعدادات", "إعدادات", "ثيم", "مظهر", "زجاجي"], ["settings", "theme", "glass", "appearance"]],
    [["تسجيل", "دخول", "حساب", "انشاء"], ["login", "sign", "account", "register", "signup"]],
    [["اسئله", "أسئلة", "شائعه", "شائعة", "سؤال"], ["faq", "question", "questions"]],
    [["اراء", "آراء", "تقييمات", "تقييم", "عملاء", "عميل"], ["review", "reviews", "client", "clients", "testimonial"]],
    [["سعر", "اسعار", "أسعار", "تكلفه", "تكلفة"], ["price", "prices", "cost", "pricing", "rate"]]
].map(([ar, en]) => ({
    ar, en,
    arSet: new Set(ar.flatMap(tokenize)),
    enSet: new Set(en.flatMap(tokenize))
}));

// Adds the other language's words for every idea found in the question
export function expandQuery(query) {
    const tokens = new Set(tokenize(query));
    const extra = [];
    for (const g of GROUPS) {
        if ([...tokens].some((t) => g.arSet.has(t))) extra.push(...g.en);
        if ([...tokens].some((t) => g.enSet.has(t))) extra.push(...g.ar);
    }
    return extra.length ? `${query} ${extra.join(" ")}` : query;
}
