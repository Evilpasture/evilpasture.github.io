const meshVertexShader = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const meshFragmentShader = `
    precision lowp float;
    varying vec2 vUv;
    uniform float u_time;
    uniform vec3 u_colorBg;
    uniform vec3 u_colorAccent;
    uniform vec2 u_resolution;

    // Simple noise for a "data-stream" feel
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
        vec2 uv = vUv;
        float t = u_time * 0.2;
        
        // 1. Technical Grid with varying thickness
        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
        vec2 gridUv = uv * aspect * 40.0;
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5);
        float line = smoothstep(0.04, 0.0, min(grid.x, grid.y));
        
        // Secondary subtle grid
        vec2 gridUv2 = uv * aspect * 8.0;
        vec2 grid2 = abs(fract(gridUv2 - 0.5) - 0.5);
        float line2 = smoothstep(0.02, 0.0, min(grid2.x, grid2.y));

        // 2. Data "Nodes" (The Hotspots)
        vec2 p1 = vec2(0.5 + 0.3 * sin(t * 1.5), 0.5 + 0.2 * cos(t * 1.8));
        vec2 p2 = vec2(0.5 + 0.3 * cos(t * 1.2), 0.5 + 0.3 * sin(t * 0.9));
        
        float d1 = 0.015 / length(uv - p1);
        float d2 = 0.015 / length(uv - p2);
        
        // 3. Digital Grain / Dithering (Prevents color banding)
        float noise = hash(uv + t) * 0.03;

        // 4. Composition
        vec3 color = u_colorBg;
        
        // Layering
        color = mix(color, u_colorAccent, line * 0.15);  // Fine grid
        color = mix(color, u_colorAccent, line2 * 0.08); // Coarse grid
        color += u_colorAccent * (d1 + d2) * 0.6;        // Dynamic nodes
        color += noise;                                  // System grain

        gl_FragColor = vec4(color, 1.0);
    }
`;

function initLightShader() {
    const canvas = document.getElementById('bg-canvas') || document.createElement('canvas');
    if (!canvas.id) {
        canvas.id = 'bg-canvas';
        document.body.prepend(canvas);
    }

    const gl = canvas.getContext('webgl', { antialias: false, depth: false });
    if (!gl) return;

    // --- SHADER SETUP ---
    function createShader(gl, type, source) {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
    }

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, meshVertexShader));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, meshFragmentShader));
    gl.linkProgram(program);
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
        time: gl.getUniformLocation(program, "u_time"),
        bg: gl.getUniformLocation(program, "u_colorBg"),
        acc: gl.getUniformLocation(program, "u_colorAccent"),
        res: gl.getUniformLocation(program, "u_resolution")
    };

    // --- CACHED VALUES (Optimization) ---
    // We only update these when the theme changes, not every frame.
    let cachedBg = [0, 0, 0];
    let cachedAcc = [0, 1, 0];

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
        cachedBg = parseColor(style.getPropertyValue('--bg').trim() || "#000000");
        cachedAcc = parseColor(style.getPropertyValue('--accent').trim() || "#22c55e");
    }

    // Update colors initially and whenever the theme/mode changes
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] });

    function render(time) {
        if (document.documentElement.getAttribute('data-effects') === 'off') {
            requestAnimationFrame(render);
            return;
        }

        // Only resize if needed
        const quality = window.innerWidth < 950 ? 0.5 : 1.0;
        const displayWidth = Math.floor(window.innerWidth * quality);
        const displayHeight = Math.floor(window.innerHeight * quality);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        gl.uniform1f(uniforms.time, time * 0.001);
        gl.uniform2f(uniforms.res, canvas.width, canvas.height);
        gl.uniform3fv(uniforms.bg, cachedBg);
        gl.uniform3fv(uniforms.acc, cachedAcc);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

document.addEventListener('DOMContentLoaded', initLightShader);