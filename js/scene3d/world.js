// ==========================================================
// The 3D night forest, built from the layers of the original picture:
// sky + moon + stars + clouds, three mountain depths, three tree depths,
// lake, cabin with lit windows, mist and fireflies.
// Everything is generated here (no model or texture downloads).
// ==========================================================
import { LAKE, CABIN, MOON, WORLD, heightAt, groundColor, placeTrees, rng } from "./terrain.js";
import * as G from "./geo.js";
import { fovFor } from "./rig.js";

const HORIZON = 0x2f8cf4;
const HERO = [0, 11, 70];
const mix = (a, b, t) => a + (b - a) * t;

export function createWorld(THREE, canvas, q) {
    THREE.ColorManagement.enabled = false;           // colors are used exactly as written
    const renderer = new THREE.WebGLRenderer({
        canvas, antialias: q.antialias, powerPreference: q.tier === "low" ? "low-power" : "high-performance"
    });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setClearColor(HORIZON, 1);
    let pixelRatio = q.pixelRatio;
    let size = [1, 1];
    renderer.setPixelRatio(pixelRatio);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(HORIZON, 70, 330);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 900);

    const owned = [];                                 // everything that must be freed
    const own = (o) => { owned.push(o); return o; };

    const geometry = ({ position, color, uv, extra = [] }) => {
        const g = own(new THREE.BufferGeometry());
        g.setAttribute("position", new THREE.BufferAttribute(position, 3));
        if (color) g.setAttribute("color", new THREE.BufferAttribute(color, 3));
        if (uv) g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        extra.forEach(([name, data, n]) => g.setAttribute(name, new THREE.BufferAttribute(data, n)));
        return g;
    };

    const texture = (w, h, draw) => {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        draw(c.getContext("2d"), w, h);
        return own(new THREE.CanvasTexture(c));
    };
    const glowTexture = (rgb) => texture(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, `rgba(${rgb},0.95)`); g.addColorStop(0.35, `rgba(${rgb},0.35)`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    const streakTexture = () => texture(256, 64, (ctx, w, h) => {
        ctx.translate(w / 2, h / 2); ctx.scale(1, h / w);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w / 2);
        g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(-w / 2, -w / 2, w, w);
    });

    const basic = (opts) => own(new THREE.MeshBasicMaterial(opts));
    const timeU = { value: 0 };
    const pxU = { value: pixelRatio };

    /* ---------- Sky: dome, moon, stars, clouds (they follow the camera, like things at infinity) ---------- */
    const sky = new THREE.Group();
    scene.add(sky);

    const skyMesh = new THREE.Mesh(geometry({ position: G.sphere(480, 14, 24) }), own(new THREE.ShaderMaterial({
        uniforms: { uHorizon: { value: new THREE.Color(HORIZON) }, uMid: { value: new THREE.Color(0x4d9ef7) }, uTop: { value: new THREE.Color(0x9ecced) } },
        side: THREE.DoubleSide, depthWrite: false, fog: false,
        vertexShader: "varying float vH; void main(){ vH = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform vec3 uHorizon; uniform vec3 uMid; uniform vec3 uTop; varying float vH;"
            + "void main(){ float t = pow(clamp(vH * 2.2, 0.0, 1.0), 0.7); gl_FragColor = vec4(mix(uHorizon, mix(uMid, uTop, t), t), 1.0); }"
    })));
    skyMesh.renderOrder = -10;
    skyMesh.frustumCulled = false;
    sky.add(skyMesh);

    const moonDir = new THREE.Vector3(MOON.x - HERO[0], MOON.y - HERO[1], MOON.z - HERO[2]).normalize().multiplyScalar(420);
    const moon = new THREE.Mesh(geometry({ position: G.circle(12, 40) }), basic({ color: 0xe0f2f2, fog: false, depthWrite: false, side: THREE.DoubleSide }));
    moon.position.copy(moonDir);
    moon.lookAt(0, 0, 0);
    sky.add(moon);

    const halo = new THREE.Mesh(geometry(G.plane(110, 110)), basic({
        map: glowTexture("200,230,255"), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide
    }));
    halo.position.copy(moonDir).multiplyScalar(0.99);
    halo.lookAt(0, 0, 0);
    sky.add(halo);

    // Stars
    {
        const rand = rng(21), n = q.stars;
        const pos = new Float32Array(n * 3), phase = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const u = rand() * Math.PI * 2, y = 0.12 + rand() * 0.88, r = Math.sqrt(1 - y * y);
            pos.set([470 * r * Math.cos(u), 470 * y, 470 * r * Math.sin(u)], i * 3);
            phase[i] = rand();
        }
        const stars = new THREE.Points(geometry({ position: pos, extra: [["aPhase", phase, 1]] }), own(new THREE.ShaderMaterial({
            uniforms: { uTime: timeU, uPx: pxU }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
            vertexShader: "attribute float aPhase; uniform float uTime; uniform float uPx; varying float vA;"
                + "void main(){ vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + aPhase * 1.2) + aPhase * 40.0));"
                + "gl_PointSize = (1.3 + aPhase * 1.7) * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
            fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 1.0, 1.0, smoothstep(0.5, 0.0, d) * vA * 0.9); }"
        })));
        stars.frustumCulled = false;
        sky.add(stars);
    }

    // Clouds: long soft streaks that drift slowly
    const clouds = [];
    {
        const map = streakTexture();
        const rand = rng(33);
        for (let i = 0; i < 6; i++) {
            const mesh = new THREE.Mesh(geometry(G.plane(mix(240, 380, rand()), mix(16, 26, rand()))), basic({
                map, transparent: true, opacity: mix(0.28, 0.5, rand()), depthWrite: false, fog: false, side: THREE.DoubleSide
            }));
            const c = { mesh, az: mix(-1.0, 1.0, rand()), el: mix(0.1, 0.55, rand()), speed: mix(0.002, 0.006, rand()) };
            clouds.push(c);
            sky.add(mesh);
        }
        const place = (c) => {
            c.mesh.position.set(Math.sin(c.az) * Math.cos(c.el) * 400, Math.sin(c.el) * 400, -Math.cos(c.az) * Math.cos(c.el) * 400);
            c.mesh.lookAt(0, 0, 0);
        };
        clouds.forEach(place);
        clouds.place = place;
    }

    /* ---------- Ground: mountains, valley and hills in one flat-shaded mesh ---------- */
    const groundPos = G.terrain(heightAt, q.terrain, WORLD);
    const ground = new THREE.Mesh(
        geometry({ position: groundPos, color: G.shadeFaces(groundPos, (x, y, z) => groundColor(x, z, y)) }),
        basic({ vertexColors: true })
    );
    ground.frustumCulled = false;
    scene.add(ground);

    /* ---------- Lake ---------- */
    const water = new THREE.Mesh(geometry({ position: G.floor(LAKE.rx + 14, LAKE.rz + 14) }), own(new THREE.ShaderMaterial({
        uniforms: { uTime: timeU, uFog: { value: new THREE.Color(HORIZON) }, uNear: { value: 70 }, uFar: { value: 330 }, uMoonX: { value: 4 } },
        vertexShader: "varying vec3 vWorld; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;"
            + "vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }",
        fragmentShader: "uniform float uTime; uniform vec3 uFog; uniform float uNear; uniform float uFar; uniform float uMoonX;"
            + "varying vec3 vWorld; varying float vDepth;"
            + "void main(){"
            + "float r = sin(vWorld.x * 0.55 + uTime * 0.9) + sin(vWorld.z * 0.8 - uTime * 1.2) + sin((vWorld.x + vWorld.z) * 0.37 + uTime * 0.6);"
            + "vec3 shallow = vec3(0.23, 0.55, 0.96); vec3 deep = vec3(0.17, 0.2, 0.62);"
            + "vec3 col = mix(shallow, deep, clamp(vWorld.z / 40.0, 0.0, 1.0) * 0.7);"
            + "float d = (vWorld.x - uMoonX) * 0.06;"
            + "float streak = exp(-d * d) * (0.55 + 0.45 * sin(vWorld.z * 1.3 - uTime * 1.6 + r));"
            + "col += streak * 0.32 + (r / 3.0) * 0.04;"
            + "float f = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);"
            + "gl_FragColor = vec4(mix(col, uFog, f), 1.0); }"
    })));
    water.position.set(LAKE.x, LAKE.level, LAKE.z);
    water.frustumCulled = false;
    scene.add(water);

    /* ---------- Pine forest: one instanced mesh, swaying in the wind ---------- */
    const trees = placeTrees(q.trees);
    {
        const pine = G.merge([G.cone(2.7, 3.6, 7, 1.4), G.cone(2.2, 3.4, 7, 3.2), G.cone(1.7, 3.2, 7, 5.0), G.cone(1.2, 3.0, 7, 6.8), G.box(0.7, 1.6, 0.7)]);
        const colors = G.shadeFaces(pine, (x, y) => {
            const t = Math.min(1, Math.max(0, y / 9.8));
            return [mix(0.14, 0.30, t), mix(0.09, 0.22, t), mix(0.38, 0.68, t)];
        });
        const material = basic({ vertexColors: true, side: THREE.DoubleSide });
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = timeU;
            shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader.replace("#include <begin_vertex>", `
                #include <begin_vertex>
                #ifdef USE_INSTANCING
                    float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
                    float sc = length(instanceMatrix[0].xyz);
                #else
                    float ph = 0.0; float sc = 1.0;
                #endif
                float lift = clamp(position.y / 9.8, 0.0, 1.0);
                float sway = sin(uTime * (1.5 / sqrt(sc)) + ph) * 0.16 + sin(uTime * 2.7 + ph * 1.7) * 0.05;
                transformed.x += sway * lift * lift * 1.6;
                transformed.z += sway * lift * lift * 0.6;
            `);
        };
        const forest = new THREE.InstancedMesh(geometry({ position: pine, color: colors }), material, Math.max(1, trees.length));
        const m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(), quat = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        trees.forEach((t, i) => {
            quat.setFromAxisAngle(up, t.r);
            s.set(t.s, t.s * (0.9 + (i % 5) * 0.05), t.s);
            p.set(t.x, t.y - 0.4, t.z);
            m.compose(p, quat, s);
            forest.setMatrixAt(i, m);
        });
        forest.count = trees.length;
        forest.instanceMatrix.needsUpdate = true;
        forest.frustumCulled = false;
        scene.add(forest);
    }

    /* ---------- Cabin ---------- */
    const cabin = new THREE.Group();
    const windows = [];
    {
        const parts = [
            G.shadeFaces(G.box(6, 3.4, 4.6), () => [0.62, 0.79, 1.0]),
            G.shadeFaces(G.translate(G.prism(7.4, 2.5, 5.4), 0, 3.4, 0), () => [0.25, 0.33, 0.85]),
            G.shadeFaces(G.translate(G.box(0.8, 1.8, 0.8), 1.8, 3.9, -0.9), () => [0.33, 0.28, 0.8]),
            G.shadeFaces(G.translate(G.plane(1.1, 2.1).position, 0, 1.05, 2.32), () => [0.2, 0.15, 0.5])
        ];
        const position = G.merge([G.box(6, 3.4, 4.6), G.translate(G.prism(7.4, 2.5, 5.4), 0, 3.4, 0), G.translate(G.box(0.8, 1.8, 0.8), 1.8, 3.9, -0.9), G.translate(G.plane(1.1, 2.1).position, 0, 1.05, 2.32)]);
        const body = new THREE.Mesh(geometry({ position, color: G.merge(parts) }), basic({ vertexColors: true, side: THREE.DoubleSide }));
        cabin.add(body);

        const glass = G.merge([
            G.translate(G.plane(1.1, 1.35).position, -1.8, 1.9, 2.33),
            G.translate(G.plane(1.1, 1.35).position, 1.8, 1.9, 2.33),
            G.translate(G.rotateY(G.plane(1.1, 1.35).position, Math.PI / 2), 3.02, 1.9, 0.4)
        ]);
        const windowMat = basic({ color: 0xffd98a, side: THREE.DoubleSide });
        cabin.add(new THREE.Mesh(geometry({ position: glass }), windowMat));
        windows.push(windowMat);

        const glowMap = glowTexture("255,200,110");
        const glowMat = basic({ map: glowMap, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6, side: THREE.DoubleSide });
        [[-1.8, 1.9, 2.5], [1.8, 1.9, 2.5]].forEach(([x, y, z]) => {
            const g = new THREE.Mesh(geometry(G.plane(4, 4)), glowMat);
            g.position.set(x, y, z);
            cabin.add(g);
        });
        windows.push(glowMat);
    }
    cabin.position.set(CABIN.x, heightAt(CABIN.x, CABIN.z), CABIN.z);
    cabin.rotation.y = 0.35;
    cabin.scale.setScalar(1.15);
    scene.add(cabin);

    /* ---------- Mist between the layers ---------- */
    const mists = [];
    {
        const map = texture(8, 64, (ctx, w, h) => {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        });
        for (let i = 0; i < q.mist; i++) {
            const mesh = new THREE.Mesh(geometry(G.plane(420, 16)), basic({
                map, color: 0x7fb0ff, transparent: true, opacity: 0.3, depthWrite: false, fog: false, side: THREE.DoubleSide
            }));
            mesh.position.set(0, 4 + i * 2, 24 - i * 38);
            scene.add(mesh);
            mists.push({ mesh, i });
        }
    }

    /* ---------- Fireflies ---------- */
    let fireflies = null;
    if (q.particles > 0) {
        const rand = rng(77), n = q.particles;
        const pos = new Float32Array(n * 3), phase = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            pos.set([mix(-40, 60, rand()), mix(1.5, 14, rand()), mix(-10, 60, rand())], i * 3);
            phase[i] = rand();
        }
        fireflies = new THREE.Points(geometry({ position: pos, extra: [["aPhase", phase, 1]] }), own(new THREE.ShaderMaterial({
            uniforms: { uTime: timeU, uPx: pxU }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
            vertexShader: "attribute float aPhase; uniform float uTime; uniform float uPx; varying float vA;"
                + "void main(){ vec3 p = position; p.x += sin(uTime * 0.4 + aPhase * 6.28) * 1.6; p.y += sin(uTime * 0.6 + aPhase * 12.0) * 0.9;"
                + "p.z += cos(uTime * 0.35 + aPhase * 9.0) * 1.4; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;"
                + "gl_PointSize = clamp(5.0 * uPx * (60.0 / -mv.z), 1.0, 14.0 * uPx); vA = 0.45 + 0.55 * sin(uTime * 1.5 + aPhase * 20.0); }",
            fragmentShader: "varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.75, 0.88, 1.0, smoothstep(0.5, 0.0, d) * max(vA, 0.0)); }"
        })));
        fireflies.frustumCulled = false;
        scene.add(fireflies);
    }

    /* ---------- API ---------- */
    const lookAt = new THREE.Vector3();

    return {
        stats: { trees: trees.length, groundTriangles: groundPos.length / 9, objects: owned.length },
        renderer,

        resize(w, h) {
            size = [w, h];
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.fov = fovFor(camera.aspect);
            camera.updateProjectionMatrix();
        },

        // Cheaper rendering for slow devices
        lite() {
            pixelRatio = 1;
            pxU.value = 1;
            renderer.setPixelRatio(1);
            renderer.setSize(size[0], size[1], false);
            if (fireflies) fireflies.visible = false;
            mists.forEach((m) => { m.mesh.visible = false; });
        },

        update(t, dt, cam, animate = true) {
            camera.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
            lookAt.set(cam.look[0], cam.look[1], cam.look[2]);
            camera.lookAt(lookAt);
            sky.position.copy(camera.position);
            timeU.value = animate ? t : 0;

            if (animate) {
                clouds.forEach((c) => {
                    c.az += c.speed * dt;
                    if (c.az > 1.2) c.az = -1.2;
                    clouds.place(c);
                });
                mists.forEach(({ mesh, i }) => { mesh.position.x = Math.sin(t * 0.05 + i * 1.7) * 25; });
                const flick = 0.92 + 0.08 * Math.sin(t * 2.3) * Math.sin(t * 0.7);
                windows[0].color.setRGB(1 * flick, 0.85 * flick, 0.54 * flick);
                windows[1].opacity = 0.55 + 0.1 * flick;
            }
        },

        render() { renderer.render(scene, camera); },

        dispose() {
            owned.forEach((o) => { try { o.dispose(); } catch { /* already freed */ } });
            owned.length = 0;
            renderer.dispose();
            try { renderer.forceContextLoss(); } catch { /* not supported */ }
        }
    };
}
