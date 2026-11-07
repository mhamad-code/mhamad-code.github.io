// ==========================================================
// Site settings. This is the only file you need to edit.
// ==========================================================

// GitHub account the projects are loaded from
export const GITHUB_USER = "mhamad-code";

// Firebase web config:
// Firebase Console > Project settings > Your apps > Web app > SDK setup
export const firebaseConfig = {
    apiKey: "AIzaSyABa7Ih5fyUvtzLKhivJvuMguu2WTc8M-M",
    authDomain: "ai-platform-204e3.firebaseapp.com",
    projectId: "ai-platform-204e3",
    storageBucket: "ai-platform-204e3.firebasestorage.app",
    messagingSenderId: "1089351203997",
    appId: "1:1089351203997:web:ba3998419970ae422c2874",
};

// The only account allowed into the admin panel (Firestore rules must use the same email)
export const ADMIN_EMAIL = "mhamra148@gmail.com";

// Address of the assistant service (Cloudflare Worker). Leave empty to hide the chat button.
export const ASSISTANT_URL = "https://portfolio-assistant.mhamra148.workers.dev";

// Public site key of the Cloudflare Turnstile human check (safe to publish). Empty = no check.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAF3V3o0vHj_3qGK7";
