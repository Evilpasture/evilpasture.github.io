// =========================================================
// 1. BACKGROUND & VOLUMETRIC BLIZZARD SHADERS (PASS 1)
// =========================================================
const bgVertexShader = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const bgFragmentShader = `
    precision mediump float;
    varying vec2 vUv;
    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_imageResolution;
    uniform vec3 u_colorBg;
    uniform vec3 u_colorAccent;
    uniform sampler2D u_texture;

    const vec2 WIND_DIR = vec2(-0.908, -0.418);
    const vec2 WIND_PERP = vec2(0.418, -0.908);

    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        v += 0.5000 * noise(p); p *= 2.02;
        v += 0.2500 * noise(p); p *= 2.03;
        v += 0.1250 * noise(p);
        return v;
    }

    vec2 getCoverUV(vec2 uv, vec2 screenRes, vec2 imgRes) {
        float sAspect = screenRes.x / screenRes.y;
        float iAspect = imgRes.x / imgRes.y;
        vec2 newUv = uv;
        if (sAspect > iAspect) {
            float scale = sAspect / iAspect;
            newUv.y = (uv.y - 0.5) / scale + 0.5;
        } else {
            float scale = iAspect / sAspect;
            newUv.x = (uv.x - 0.5) / scale + 0.5;
        }
        return newUv;
    }

    float snowLayer(vec2 uv, float stormTime, float speed, float scale, float elongation, float seed) {
        // Horizontal aerodynamic drift (no vertical reversal)
        vec2 fluidWarp = vec2(
            sin(uv.y * 2.2 + stormTime * 1.2 + seed) * 0.04,
            cos(uv.x * 1.5 + stormTime * 0.8 + seed * 1.5) * 0.015
        );

        vec2 p = (uv + fluidWarp - WIND_DIR * (stormTime * speed)) * scale;
        vec2 id = floor(p);
        vec2 f = fract(p) - 0.5;

        float flakes = 0.0;
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec2 neighbor = vec2(float(x), float(y));
                vec2 cellId = id + neighbor;
                float r1 = hash(cellId + vec2(seed, seed * 1.31));
                float r2 = hash(cellId + vec2(seed * 2.17, seed * 3.73));

                float densityMask = step(0.12, r1);
                
                // Pure horizontal fluttering wobble
                vec2 eddy = vec2(
                    sin(stormTime * 2.4 + r1 * 6.28) * 0.12,
                    cos(stormTime * 1.8 + r2 * 6.28) * 0.04
                );
                vec2 pos = (vec2(r1, r2) - 0.5) * 0.65 + eddy;
                vec2 d = (f - neighbor) - pos;

                float dAlong = dot(d, WIND_DIR) * elongation;
                float dAcross = dot(d, WIND_PERP);
                float dist = sqrt(dAlong * dAlong + dAcross * dAcross);

                float radius = 0.026 + r1 * 0.038;
                float flake = smoothstep(radius, 0.0, dist);

                flake *= 0.7 + 0.3 * sin(stormTime * 4.0 + r2 * 6.28);
                flakes += flake * (0.35 + 0.65 * r1) * densityMask;
            }
        }
        return flakes;
    }

    void main() {
        vec2 uv = vUv;
        vec2 coverUv = getCoverUV(uv, u_resolution, u_imageResolution);
        vec4 bgTex = texture2D(u_texture, coverUv);

        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
        vec2 aspectUv = uv * aspect;

        float stormTime = u_time * 1.25;

        // Volumetric fog sweeping down-left
        vec2 fogUv = aspectUv - WIND_DIR * (stormTime * 0.45);
        fogUv += vec2(sin(fogUv.y * 1.8 + stormTime * 0.6) * 0.10, cos(fogUv.x * 1.5) * 0.06);
        float mist = fbm(fogUv * 1.2);

        float squallCycle = sin(dot(aspectUv, WIND_PERP) * 2.0 - dot(aspectUv, WIND_DIR) * 0.7 + stormTime * 1.4 + mist * 1.6);
        float squall = smoothstep(0.35, 0.85, squallCycle) * (0.35 + 0.45 * (0.5 + 0.5 * sin(u_time * 0.7)));
        float totalMist = mist * 0.38 + squall * 0.40;

        // Blizzard needle layers
        float snow1 = snowLayer(aspectUv, stormTime, 0.55, 28.0, 0.32, 13.7);
        float snow2 = snowLayer(aspectUv, stormTime, 1.05, 14.0, 0.16, 47.3);

        vec3 coldWhite = vec3(0.92, 0.96, 1.0);
        vec3 snowTint = mix(coldWhite, u_colorAccent, 0.14);

        vec3 scene = mix(bgTex.rgb, snowTint, totalMist * 0.45);
        scene += snowTint * (snow1 * 0.35 + snow2 * 0.70);
        scene += u_colorAccent * squall * 0.12;

        float vignette = smoothstep(1.3, 0.35, length((uv - 0.5) * vec2(1.0, u_resolution.y / u_resolution.x)));
        scene *= mix(0.82, 1.0, vignette);
        scene += (hash(uv + u_time) - 0.5) * 0.015;

        gl_FragColor = vec4(scene, 1.0);
    }
`;

// =========================================================
// 2. SVG SNOWFLAKE PARTICLE SHADERS (PASS 2)
// =========================================================
const particleVertexShader = `
    attribute vec2 a_corner;   // Quad corner: (-1, -1) to (1, 1)
    attribute vec2 a_basePos;  // Spawn pos [0, 1]
    attribute vec4 a_params;   // x: size, y: speed, z: rotSpeed, w: seed

    uniform float u_time;
    uniform vec2 u_resolution;

    varying vec2 vUv;
    varying float vAlpha;

    const vec2 WIND_DIR = vec2(-0.908, -0.418);

    void main() {
        float size = a_params.x;
        float speed = a_params.y;
        float rotSpeed = a_params.z;
        float seed = a_params.w;

        // Steady linear displacement along wind (NO time-amplified acceleration)
        vec2 move = WIND_DIR * (u_time * 0.35 * speed);

        // Gentle, bounded flutter (amplitude cannot exceed 0.015)
        vec2 flutter = vec2(
            sin(u_time * 1.5 + seed * 6.28) * 0.015,
            cos(u_time * 1.1 + seed * 3.14) * 0.008
        );

        // Infinite, seamless periodic boundary wrapping [-0.1, 1.1] (span = 1.2)
        // Uses fract() to prevent negative-sign modulo bugs on GPU drivers
        vec2 rawPos = a_basePos + move + flutter;
        vec2 pos = vec2(
            fract((rawPos.x + 0.1) / 1.2) * 1.2 - 0.1,
            fract((rawPos.y + 0.1) / 1.2) * 1.2 - 0.1
        );

        // Crystal rotation
        float angle = seed * 10.0 + u_time * rotSpeed;
        float cosA = cos(angle);
        float sinA = sin(angle);
        mat2 rot = mat2(cosA, -sinA, sinA, cosA);

        float aspect = u_resolution.x / u_resolution.y;

        // Clip-space positioning
        vec2 centerClip = pos * 2.0 - 1.0;
        vec2 cornerOffset = rot * (a_corner * size);
        cornerOffset.x /= aspect;

        gl_Position = vec4(centerClip + cornerOffset, 0.0, 1.0);

        vUv = a_corner * 0.5 + 0.5;
        vAlpha = mix(0.4, 0.9, smoothstep(0.010, 0.028, size));
    }
`;

const particleFragmentShader = `
    precision mediump float;
    varying vec2 vUv;
    varying float vAlpha;

    uniform sampler2D u_flakeTexture;
    uniform vec3 u_colorAccent;

    void main() {
        vec4 tex = texture2D(u_flakeTexture, vUv);
        if (tex.a < 0.02) discard;

        vec3 flakeColor = mix(vec3(0.95, 0.98, 1.0), u_colorAccent, 0.16);
        gl_FragColor = vec4(flakeColor, tex.a * vAlpha);
    }
`;

// =========================================================
// 3. SVG TEXTURE CREATION (ONCE)
// =========================================================
function createSnowflakeTexture(gl) {
    const svgString = `<svg width="256" height="256" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g transform="translate(100,100)" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.95">
    <g id="branch">
      <line x1="0" y1="0" x2="0" y2="-80" />
      <line x1="0" y1="-30" x2="-15" y2="-45" />
      <line x1="0" y1="-30" x2="15" y2="-45" />
      <line x1="0" y1="-55" x2="-15" y2="-70" />
      <line x1="0" y1="-55" x2="15" y2="-70" />
      <line x1="0" y1="-80" x2="-10" y2="-70" />
      <line x1="0" y1="-80" x2="10" y2="-70" />
    </g>
    <use href="#branch" xlink:href="#branch" transform="rotate(60)" />
    <use href="#branch" xlink:href="#branch" transform="rotate(120)" />
    <use href="#branch" xlink:href="#branch" transform="rotate(180)" />
    <use href="#branch" xlink:href="#branch" transform="rotate(240)" />
    <use href="#branch" xlink:href="#branch" transform="rotate(300)" />
    <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="none" />
  </g>
</svg>`;

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 0]));

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = 256;
        offscreen.height = 256;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(img, 0, 0, 256, 256);
        URL.revokeObjectURL(url);

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreen);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    img.src = url;

    return texture;
}

// =========================================================
// 4. PARTICLE GEOMETRY GENERATION
// =========================================================
function createParticleBuffer(gl, count = 160) {
    const corners = [
        [-1, -1], [ 1, -1], [ 1,  1],
        [-1, -1], [ 1,  1], [-1,  1]
    ];

    const vertexData = [];
    for (let i = 0; i < count; i++) {
        const baseX = Math.random();
        const baseY = Math.random();
        const depth = Math.pow(Math.random(), 2.0);
        
        const size = 0.010 + depth * 0.018;
        const speed = 0.55 + depth * 0.45;
        const rotSpeed = (Math.random() - 0.5) * 1.2;
        const seed = Math.random() * 100.0;

        for (let c = 0; c < 6; c++) {
            vertexData.push(
                corners[c][0], corners[c][1],
                baseX, baseY,
                size, speed, rotSpeed, seed
            );
        }
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

    return { buffer, count: count * 6 };
}

// =========================================================
// 5. MAIN INITIALIZATION & RENDER LOOP
// =========================================================
function initLightShader() {
    const canvas = document.getElementById('bg-canvas') || document.createElement('canvas');
    if (!canvas.id) {
        canvas.id = 'bg-canvas';
        document.body.prepend(canvas);
    }

    const gl = canvas.getContext('webgl', { antialias: false, depth: false });
    if (!gl) return;

    function createShader(gl, type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
    }

    function createProgram(vSrc, fSrc) {
        const p = gl.createProgram();
        gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vSrc));
        gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fSrc));
        gl.linkProgram(p);
        return p;
    }

    const bgProg = createProgram(bgVertexShader, bgFragmentShader);
    const partProg = createProgram(particleVertexShader, particleFragmentShader);

    // Quad buffer
    const quadVertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
    const bgPosLoc = gl.getAttribLocation(bgProg, "position");

    const bgUniforms = {
        time: gl.getUniformLocation(bgProg, "u_time"),
        bg: gl.getUniformLocation(bgProg, "u_colorBg"),
        acc: gl.getUniformLocation(bgProg, "u_colorAccent"),
        res: gl.getUniformLocation(bgProg, "u_resolution"),
        imgRes: gl.getUniformLocation(bgProg, "u_imageResolution"),
        tex: gl.getUniformLocation(bgProg, "u_texture")
    };

    // Particle buffer
    const particles = createParticleBuffer(gl, 160);
    const partAttribs = {
        corner: gl.getAttribLocation(partProg, "a_corner"),
        basePos: gl.getAttribLocation(partProg, "a_basePos"),
        params: gl.getAttribLocation(partProg, "a_params")
    };

    const partUniforms = {
        time: gl.getUniformLocation(partProg, "u_time"),
        res: gl.getUniformLocation(partProg, "u_resolution"),
        flakeTex: gl.getUniformLocation(partProg, "u_flakeTexture"),
        acc: gl.getUniformLocation(partProg, "u_colorAccent")
    };

    const flakeTexture = createSnowflakeTexture(gl);

    const bgTexture = gl.createTexture();
    let imageResolution = [1920, 1080];
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([15, 23, 42, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const bgImage = new Image();
    bgImage.src = 'res/background.jpg';
    bgImage.onload = () => {
        imageResolution = [bgImage.naturalWidth, bgImage.naturalHeight];
        gl.bindTexture(gl.TEXTURE_2D, bgTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgImage);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };

    let cachedBg = [0.06, 0.09, 0.16];
    let cachedAcc = [0.22, 0.74, 0.97];

    function parseColor(color) {
        if (color.startsWith('rgb')) {
            const vals = color.match(/\d+/g).map(Number);
            return [vals[0] / 255, vals[1] / 255, vals[2] / 255];
        }
        const hex = color.replace('#', '');
        const b = parseInt(hex, 16);
        return [((b >> 16) & 255) / 255, ((b >> 8) & 255) / 255, (b & 255) / 255];
    }

    function updateColors() {
        const style = getComputedStyle(document.documentElement);
        cachedBg = parseColor(style.getPropertyValue('--bg').trim() || "#0f172a");
        cachedAcc = parseColor(style.getPropertyValue('--accent').trim() || "#38bdf8");
    }

    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });

    function render(time) {
        if (document.documentElement.getAttribute('data-effects') === 'off') {
            requestAnimationFrame(render);
            return;
        }

        const quality = window.innerWidth < 950 ? 0.6 : 1.0;
        const displayWidth = Math.floor(window.innerWidth * quality);
        const displayHeight = Math.floor(window.innerHeight * quality);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        const tSec = time * 0.001;

        // --------------------------------------------------
        // PASS 1: Background Quad
        // --------------------------------------------------
        gl.disable(gl.BLEND);
        gl.useProgram(bgProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.enableVertexAttribArray(bgPosLoc);
        gl.vertexAttribPointer(bgPosLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniform1f(bgUniforms.time, tSec);
        gl.uniform2f(bgUniforms.res, canvas.width, canvas.height);
        gl.uniform2f(bgUniforms.imgRes, imageResolution[0], imageResolution[1]);
        gl.uniform3fv(bgUniforms.bg, cachedBg);
        gl.uniform3fv(bgUniforms.acc, cachedAcc);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, bgTexture);
        gl.uniform1i(bgUniforms.tex, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // --------------------------------------------------
        // PASS 2: Snowflake Particles
        // --------------------------------------------------
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(partProg);

        gl.bindBuffer(gl.ARRAY_BUFFER, particles.buffer);
        const stride = 32;
        gl.enableVertexAttribArray(partAttribs.corner);
        gl.vertexAttribPointer(partAttribs.corner, 2, gl.FLOAT, false, stride, 0);

        gl.enableVertexAttribArray(partAttribs.basePos);
        gl.vertexAttribPointer(partAttribs.basePos, 2, gl.FLOAT, false, stride, 8);

        gl.enableVertexAttribArray(partAttribs.params);
        gl.vertexAttribPointer(partAttribs.params, 4, gl.FLOAT, false, stride, 16);

        gl.uniform1f(partUniforms.time, tSec);
        gl.uniform2f(partUniforms.res, canvas.width, canvas.height);
        gl.uniform3fv(partUniforms.acc, cachedAcc);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, flakeTexture);
        gl.uniform1i(partUniforms.flakeTex, 1);

        gl.drawArrays(gl.TRIANGLES, 0, particles.count);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', initLightShader);
