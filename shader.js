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

    void main() {
        vec2 uv = vUv;
        float t = u_time * 0.5;
        
        // 1. Digital "Hotspots" (representing memory/threads)
        vec2 p1 = vec2(0.5 + 0.3 * sin(t * 0.8), 0.5 + 0.3 * cos(t * 1.2));
        vec2 p2 = vec2(0.5 + 0.3 * cos(t * 1.1), 0.5 + 0.2 * sin(t * 0.7));
        
        float d1 = 0.02 / distance(uv, p1);
        float d2 = 0.02 / distance(uv, p2);
        
        // 2. Sharp Technical Grid
        vec2 gridUv = uv * vec2(u_resolution.x / u_resolution.y, 1.0) * 30.0;
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5);
        float line = smoothstep(0.03, 0.0, min(grid.x, grid.y));
        
        // 3. Moving Scanline (The "Digital Pulse")
        float scanline = smoothstep(0.05, 0.0, abs(fract(uv.y - t * 0.2) - 0.5));

        // 4. Composition
        vec3 color = u_colorBg;
        
        // Add Grid (subtle)
        color += u_colorAccent * line * 0.1;
        
        // Add Hotspots (glow)
        color += u_colorAccent * (d1 + d2) * 0.4;
        
        // Add Scanline
        color += u_colorAccent * scanline * 0.05;

        gl_FragColor = vec4(color, 1.0);
    }
`;

function initLightShader() {
    const canvas = document.getElementById('bg-canvas') || document.createElement('canvas');
    if (!canvas.id) { 
        canvas.id = 'bg-canvas'; 
        document.body.prepend(canvas); 
    }

    const gl = canvas.getContext('webgl');
    if (!gl) return;

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

    const vertices = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
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

    function parseColor(color) {
        if (color.startsWith('rgb')) {
            const vals = color.match(/\d+/g).map(Number);
            return [vals[0]/255, vals[1]/255, vals[2]/255];
        }
        const hex = color.replace('#', '');
        const b = parseInt(hex, 16);
        return [((b >> 16) & 255)/255, ((b >> 8) & 255)/255, (b & 255)/255];
    }

    function render(time) {
        // High-performance: scale down the resolution on mobile to save GPU
        const quality = window.innerWidth < 950 ? 0.5 : 1.0;
        const displayWidth  = Math.floor(window.innerWidth * quality);
        const displayHeight = Math.floor(window.innerHeight * quality);

        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width  = displayWidth;
            canvas.height = displayHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }

        const style = getComputedStyle(document.documentElement);
        const bgColor = parseColor(style.getPropertyValue('--bg').trim() || "#000000");
        const accColor = parseColor(style.getPropertyValue('--accent').trim() || "#22c55e");

        gl.uniform1f(uniforms.time, time * 0.001);
        gl.uniform2f(uniforms.res, canvas.width, canvas.height);
        gl.uniform3fv(uniforms.bg, bgColor);
        gl.uniform3fv(uniforms.acc, accColor);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

// Initialize based on device power
document.addEventListener('DOMContentLoaded', () => {
    // We run it on mobile too now because we scaled the 'quality' down to 0.5
    initLightShader();
});