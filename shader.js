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
        float t = u_time * 0.4;
        
        // Lightweight organic movement
        vec2 p1 = vec2(0.5 + 0.2 * sin(t), 0.5 + 0.2 * cos(t * 0.7));
        vec2 p2 = vec2(0.5 + 0.2 * cos(t * 0.8), 0.5 + 0.2 * sin(t * 1.1));
        
        float d1 = distance(uv, p1);
        float d2 = distance(uv, p2);
        
        vec3 color = mix(u_colorBg, u_colorAccent, 0.1 / (d1 + 0.4));
        color = mix(color, u_colorAccent, 0.08 / (d2 + 0.5));

        // Subtle grid
        vec2 gridUv = uv * vec2(u_resolution.x / u_resolution.y, 1.0) * 40.0;
        vec2 grid = abs(fract(gridUv - 0.5) - 0.5);
        float line = min(grid.x, grid.y);
        color += u_colorAccent * (smoothstep(0.02, 0.0, line) * 0.03);

        gl_FragColor = vec4(color, 1.0);
    }
`;

function initLightShader() {
    const canvas = document.getElementById('bg-canvas') || document.createElement('canvas');
    if (!canvas.id) { canvas.id = 'bg-canvas'; document.body.prepend(canvas); }

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

    // ROBUST COLOR PARSER (Handles HEX and RGB)
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
        // Use devicePixelRatio for sharper rendering on high-end screens
        const displayWidth  = window.innerWidth;
        const displayHeight = window.innerHeight;

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
document.addEventListener('DOMContentLoaded', initLightShader);