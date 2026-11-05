// ==========================================================
// Firestore layer: site content, blog posts and visitor counters.
// Every public function fails softly so the site never breaks.
// ==========================================================
import { app, auth, isConfigured, onAuthStateChanged } from "./firebase.js";
import { ADMIN_EMAIL } from "./config.js";
import { dayKey } from "./config-utils.js";
import {
    getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where,
    orderBy, limit, writeBatch, increment, documentId, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = isConfigured ? getFirestore(app) : null;
export const hasDb = Boolean(db);

/* ---------- Who is signed in ---------- */

export async function authReady() {
    if (!auth) return null;
    if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
    } else {
        await new Promise((resolve) => {
            const stop = onAuthStateChanged(auth, () => { stop(); resolve(); });
        });
    }
    return auth.currentUser;
}

export async function isAdminUser() {
    const user = await authReady();
    return Boolean(user && user.email && user.email === ADMIN_EMAIL);
}

/* ---------- Site content (document site/config) ---------- */

const CACHE_KEY = "site-config-v1";

// Last config this browser saw: lets pages render instantly while the fresh one loads
export function getCachedConfig() {
    try {
        const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
        return (saved && saved.data) || null;
    } catch {
        return null;
    }
}

export async function getConfig() {
    if (!db) return {};
    try {
        const snap = await getDoc(doc(db, "site", "config"));
        const data = snap.exists() ? snap.data() : {};
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, time: Date.now() })); } catch { /* storage blocked */ }
        return data;
    } catch (err) {
        console.warn("Could not load the site config:", err);
        return getCachedConfig() || {};
    }
}

export async function saveConfig(patch) {
    await setDoc(doc(db, "site", "config"), { ...patch, updated: serverTimestamp() }, { merge: true });
    try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/* ---------- Blog posts (collection posts, one document per slug) ---------- */

export async function getPublishedPosts() {
    if (!db) return [];
    const snap = await getDocs(query(collection(db, "posts"), where("published", "==", true)));
    return snap.docs.map((d) => ({ slug: d.id, ...d.data() }));
}

export async function getAllPosts() {
    const snap = await getDocs(collection(db, "posts"));
    return snap.docs
        .map((d) => ({ slug: d.id, ...d.data() }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export async function savePost(post) {
    const { slug, ...data } = post;
    await setDoc(doc(db, "posts", slug), { ...data, updated: serverTimestamp() });
}

export async function deletePost(slug) {
    await deleteDoc(doc(db, "posts", slug));
}

/* ---------- Visitor counter ---------- */
// No cookies and no IP addresses: a random id lives in this browser only,
// to know if the device is new and if it already visited today.

export async function trackVisit(page) {
    if (!db) return;
    if (["localhost", "127.0.0.1", ""].includes(location.hostname)) return; // do not count testing
    if (navigator.webdriver) return;                                         // simple bot filter
    try {
        if (sessionStorage.getItem(`seen:${page}`)) return;                   // reloads do not count
        sessionStorage.setItem(`seen:${page}`, "1");
    } catch { /* storage blocked: count anyway */ }

    if (await isAdminUser()) return;                                         // your own visits do not count

    const today = dayKey();
    let brandNew = false;
    let firstToday = true;
    try {
        if (!localStorage.getItem("visitor-id")) {
            localStorage.setItem("visitor-id", crypto.randomUUID());
            brandNew = true;
        }
        firstToday = localStorage.getItem("visit-day") !== today;
        localStorage.setItem("visit-day", today);
    } catch { /* storage blocked */ }

    try {
        const batch = writeBatch(db);
        batch.set(doc(db, "daily", today), {
            visits: increment(1),
            unique: increment(firstToday ? 1 : 0),
            pages: { [page]: increment(1) }
        }, { merge: true });
        batch.set(doc(db, "stats", "total"), {
            visits: increment(1),
            newVisitors: increment(brandNew ? 1 : 0)
        }, { merge: true });
        await batch.commit();
    } catch (err) {
        console.warn("Visit not counted:", err);
    }
}

// Last `days` days of counters plus the all-time totals (admin only)
export async function getStats(days = 30) {
    const snap = await getDocs(query(collection(db, "daily"), orderBy(documentId(), "desc"), limit(days)));
    const rows = snap.docs.map((d) => ({ day: d.id, ...d.data() }));
    const totalSnap = await getDoc(doc(db, "stats", "total"));
    return { rows, total: totalSnap.exists() ? totalSnap.data() : { visits: 0, newVisitors: 0 } };
}
