// ==========================================================
// Immersive 3D background for the glass (night forest) theme only.
//  - the neumorphic theme never loads Three.js or draws anything
//  - switching themes stops the scene and frees WebGL; switching back rebuilds it
//  - without WebGL (or without vendor/three) the picture background stays
// Add ?scene3d=off to the address to turn it off for a comparison.
// ==========================================================
import { createRig } from "./rig.js";
import { pickQuality } from "./quality.js";

const THREE_URL = new URL("../../vendor/three/three.module.min.js", import.meta.url).href;
const SECTION_IDS = ["hero", "about", "skills", "services", "projects", "reviews", "faq", "contact"];
const REVEAL = ".about-card, .service-card, .review-card, .faq-item, .contact-box";
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createScene3D({ loadThree = () => import(THREE_URL), win = window, doc = document } = {}) {
    const root = doc.documentElement;
    let generation = 0;
    let active = null;

    const isGlass = () => root.dataset.theme === "glass";
    const off = () => new URLSearchParams(win.location.search).get("scene3d") === "off";

    async function start() {
        const mine = ++generation;
        if (off()) return;

        let THREE;
        try {
            THREE = await loadThree();
        } catch (err) {
            console.warn("3D scene: Three.js is not in vendor/three, keeping the picture background.", err);
            return;
        }
        if (mine !== generation || !isGlass()) return;      // the theme changed while loading

        const nav = win.navigator;
        const quality = pickQuality({
            cores: nav.hardwareConcurrency, memory: nav.deviceMemory, dpr: win.devicePixelRatio, width: win.innerWidth,
            saveData: Boolean(nav.connection && nav.connection.saveData),
            coarse: win.matchMedia("(pointer: coarse)").matches,
            reducedMotion: win.matchMedia("(prefers-reduced-motion: reduce)").matches
        });

        const host = doc.createElement("div");
        host.id = "scene3d";
        host.setAttribute("aria-hidden", "true");
        const canvas = doc.createElement("canvas");
        host.append(canvas);
        doc.body.prepend(host);

        let world;
        try {
            const { createWorld } = await import("./world.js");
            world = createWorld(THREE, canvas, quality);
        } catch (err) {
            console.warn("3D scene: WebGL is not available, keeping the picture background.", err);
            host.remove();
            return;
        }
        if (mine !== generation || !isGlass()) { world.dispose(); host.remove(); return; }

        const rig = createRig({ animate: quality.animate });
        const listeners = [];
        const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); listeners.push([target, type, fn, opts]); };
        const extras = [];                                   // observers and buttons to clean up
        let raf = 0, last = 0, ready = false, lite = false, slow = 0, frames = 0, dead = false;

        /* ---- layout: where each section is on the page ---- */
        function layout() {
            const list = SECTION_IDS.map((id) => {
                const el = id === "hero" ? doc.querySelector(".hero") : doc.getElementById(id);
                if (!el || el.hidden) return null;
                const r = el.getBoundingClientRect();
                return { id, y: id === "hero" ? 0 : r.top + win.scrollY + r.height / 2 - win.innerHeight / 2 };
            }).filter(Boolean);
            const max = Math.max(1, root.scrollHeight - win.innerHeight);
            if (list.length) list[list.length - 1].y = Math.min(list[list.length - 1].y, max);
            rig.setAnchors(list, max);
        }

        function resize() {
            world.resize(win.innerWidth, win.innerHeight);
            layout();
            request();
        }

        /* ---- drawing ---- */
        function draw(now) {
            const dt = Math.min(0.1, Math.max(0.001, (now - last) / 1000));
            last = now;
            world.update(now / 1000, dt, rig.update({ viewY: win.scrollY, dt, now }), quality.animate);
            world.render();

            if (!ready) { ready = true; host.classList.add("ready"); }
            if (quality.animate && !lite && ++frames % 60 === 0) {         // slow device: drop the extras once
                slow = dt > 0.034 ? slow + 1 : 0;
                if (slow >= 2) { lite = true; world.lite(); }
            }
        }

        function loop(now) {
            raf = win.requestAnimationFrame(loop);
            if (now - last < 1000 / quality.fps - 2) return;
            draw(now);
        }

        function request() {                                  // on-demand mode (reduced motion)
            if (quality.animate || raf || dead) return;
            raf = win.requestAnimationFrame((now) => { raf = 0; draw(now); });
        }

        function play() {
            if (quality.animate && !raf && !dead) { last = win.performance.now(); raf = win.requestAnimationFrame(loop); }
            else request();
        }
        function pause() { if (raf) { win.cancelAnimationFrame(raf); raf = 0; } }

        /* ---- input: scroll, mouse, finger, tilt ---- */
        on(win, "resize", resize);
        on(win, "scroll", request, { passive: true });
        on(win, "pointermove", (e) => {
            if (e.pointerType && e.pointerType !== "mouse") return;
            rig.look((e.clientX / win.innerWidth) * 2 - 1, (e.clientY / win.innerHeight) * 2 - 1, win.performance.now());
            request();
        });
        on(win, "touchmove", (e) => {
            const t = e.touches && e.touches[0];
            if (!t) return;
            rig.look(((t.clientX / win.innerWidth) * 2 - 1) * 0.6, ((t.clientY / win.innerHeight) * 2 - 1) * 0.6, win.performance.now());
            request();
        }, { passive: true });

        const tilt = (e) => {
            if (e.gamma == null || e.beta == null) return;       // no sensor
            rig.look(clamp(e.gamma / 30, -1, 1), clamp((e.beta - 45) / 30, -1, 1), win.performance.now());
            request();
        };
        const DOE = win.DeviceOrientationEvent;
        if (DOE && win.matchMedia("(pointer: coarse)").matches) {
            if (typeof DOE.requestPermission === "function") {   // iPhone: only ask when the visitor taps
                const btn = doc.createElement("button");
                btn.type = "button";
                btn.className = "switch-circle icon-btn scene3d-tilt";
                btn.title = "Move the view by tilting your phone";
                btn.setAttribute("aria-label", "Move the view by tilting your phone");
                btn.innerHTML = '<i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>';
                btn.addEventListener("click", async () => {
                    try {
                        if ((await DOE.requestPermission()) === "granted") on(win, "deviceorientation", tilt);
                    } catch { /* the visitor said no: touch still works */ }
                    btn.remove();
                });
                doc.body.append(btn);
                extras.push(() => btn.remove());
            } else {
                on(win, "deviceorientation", tilt);
            }
        }

        /* ---- pause when the tab is hidden; free the GPU if it is lost ---- */
        on(doc, "visibilitychange", () => (doc.hidden ? pause() : play()));
        on(canvas, "webglcontextlost", (e) => { e.preventDefault(); stop(); });

        if (typeof win.ResizeObserver === "function") {
            const ro = new win.ResizeObserver(() => { layout(); request(); });
            ro.observe(doc.body);
            extras.push(() => ro.disconnect());
        }

        /* ---- cards fade in as you reach them ---- */
        if (quality.animate && typeof win.IntersectionObserver === "function") {
            const io = new win.IntersectionObserver((entries) => entries.forEach((en) => {
                if (en.isIntersecting) { en.target.classList.add("s3d-in"); io.unobserve(en.target); }
            }), { threshold: 0.12 });
            const items = [...doc.querySelectorAll(REVEAL)];
            items.forEach((el) => { el.classList.add("s3d-reveal"); io.observe(el); });
            extras.push(() => { io.disconnect(); items.forEach((el) => el.classList.remove("s3d-reveal", "s3d-in")); });
        }

        root.classList.add("scene3d-on");
        resize();
        play();

        active = {
            dispose() {
                dead = true;
                pause();
                listeners.forEach(([t, type, fn, opts]) => t.removeEventListener(type, fn, opts));
                extras.forEach((fn) => fn());
                world.dispose();
                host.remove();
                root.classList.remove("scene3d-on");
            }
        };
    }

    function stop() {
        generation++;
        if (active) { active.dispose(); active = null; }
    }

    // Call whenever the theme may have changed
    function sync() {
        if (isGlass()) { if (!active) start().then(() => {}); }
        else stop();
    }

    return { sync, stop, get running() { return Boolean(active); } };
}

if (!globalThis.__SCENE3D_TEST__) {
    const scene = createScene3D();
    scene.sync();
    new MutationObserver(() => scene.sync()).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
