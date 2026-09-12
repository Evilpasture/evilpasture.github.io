/**
 * WebGPU + C++17 WASM Blizzard Orchestrator
 * Volumetric Atmospheric Fog + Instanced SVG Snowflakes
 * evilpasture.github.io
 */

const SVG_SNOWFLAKE = `<svg width="256" height="256" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(100,100)" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" fill="none">
    <g id="branch">
      <line x1="0" y1="0" x2="0" y2="-80" />
      <line x1="0" y1="-30" x2="-15" y2="-45" />
      <line x1="0" y1="-30" x2="15" y2="-45" />
      <line x1="0" y1="-55" x2="-15" y2="-70" />
      <line x1="0" y1="-55" x2="15" y2="-70" />
      <line x1="0" y1="-80" x2="-10" y2="-70" />
      <line x1="0" y1="-80" x2="10" y2="-70" />
    </g>
    <use href="#branch" transform="rotate(60)" />
    <use href="#branch" transform="rotate(120)" />
    <use href="#branch" transform="rotate(180)" />
    <use href="#branch" transform="rotate(240)" />
    <use href="#branch" transform="rotate(300)" />
    <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="none" />
  </g>
</svg>`;

const COMMON_STRUCTS = /* wgsl */ `
struct Particle {
    pos: vec2<f32>,
    vel: vec2<f32>,
    params: vec4<f32>, // x: size, y: speed, z: rotSpeed, w: seed
};

struct Uniforms {
    resolution: vec2<f32>,
    time: f32,
    deltaTime: f32,
    accentColor: vec4<f32>,
};
`;

// ========================================================
// 1. VOLUMETRIC ATMOSPHERE SHADER (Mist, Squalls & Vignette)
// ========================================================
const VOLUMETRIC_SHADER = /* wgsl */ `
${COMMON_STRUCTS}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct BgOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
};

const WIND_DIR: vec2<f32> = vec2<f32>(-0.908, -0.418);
const WIND_PERP: vec2<f32> = vec2<f32>(0.418, -0.908);

fn hash(p: vec2<f32>) -> f32 {
    var q = fract(p * vec2<f32>(123.34, 456.21));
    q += dot(q, q + 45.32);
    return fract(q.x * q.y);
}

fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let u_smooth = f * f * (3.0 - 2.0 * f);
    let a = hash(i);
    let b = hash(i + vec2<f32>(1.0, 0.0));
    let c = hash(i + vec2<f32>(0.0, 1.0));
    let d = hash(i + vec2<f32>(1.0, 1.0));
    return mix(mix(a, b, u_smooth.x), mix(c, d, u_smooth.x), u_smooth.y);
}

fn fbm(p_in: vec2<f32>) -> f32 {
    var p = p_in;
    var v: f32 = 0.0;
    v += 0.5000 * noise(p); p *= 2.02;
    v += 0.2500 * noise(p); p *= 2.03;
    v += 0.1250 * noise(p);
    return v;
}

// Single fullscreen triangle trick (covers [-1, 1] clip space)
@vertex
fn vs_bg(@builtin(vertex_index) v_idx: u32) -> BgOutput {
    var pos = array<vec2<f32>, 3>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 3.0, -1.0),
        vec2<f32>(-1.0,  3.0)
    );
    let p = pos[v_idx];
    var out: BgOutput;
    out.position = vec4<f32>(p, 0.0, 1.0);
    out.uv = p * 0.5 + 0.5;
    return out;
}

@fragment
fn fs_bg(in: BgOutput) -> @location(0) vec4<f32> {
    let aspect = vec2<f32>(u.resolution.x / u.resolution.y, 1.0);
    let aspectUv = in.uv * aspect;
    let stormTime = u.time * 1.25;

    // Sweeping volumetric mist
    var fogUv = aspectUv - WIND_DIR * (stormTime * 0.40);
    fogUv += vec2<f32>(sin(fogUv.y * 1.8 + stormTime * 0.6) * 0.10, cos(fogUv.x * 1.5) * 0.06);
    let mist = fbm(fogUv * 1.2);

    // Dynamic wind squalls
    let squallCycle = sin(dot(aspectUv, WIND_PERP) * 2.0 - dot(aspectUv, WIND_DIR) * 0.7 + stormTime * 1.4 + mist * 1.6);
    let squall = smoothstep(0.35, 0.85, squallCycle) * (0.35 + 0.45 * (0.5 + 0.5 * sin(u.time * 0.7)));
    let totalMist = mist * 0.35 + squall * 0.32;

    // Atmospheric snow tint
    let coldWhite = vec3<f32>(0.92, 0.96, 1.0);
    let snowTint = mix(coldWhite, u.accentColor.rgb, 0.12);

    // Subtle edge vignette
    let vignette = smoothstep(1.3, 0.35, length((in.uv - vec2<f32>(0.5)) * vec2<f32>(1.0, u.resolution.y / u.resolution.x)));

    // Volumetric density alpha
    let alpha = totalMist * 0.42 * vignette;

    return vec4<f32>(snowTint, clamp(alpha, 0.0, 0.60));
}
`;

// ========================================================
// 2. COMPUTE PHYSICS SHADER
// ========================================================
const COMPUTE_SHADER = /* wgsl */ `
${COMMON_STRUCTS}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
    let index = id.x;
    if (index >= arrayLength(&particles)) {
        return;
    }

    var p = particles[index];

    let flutter = vec2<f32>(
        sin(u.time * 1.5 + p.params.w) * 0.0008,
        cos(u.time * 1.1 + p.params.w) * 0.0004
    );

    p.pos += (p.vel * (p.params.y * 0.25) * u.deltaTime) + flutter;

    p.pos.x = fract((p.pos.x + 0.1) / 1.2) * 1.2 - 0.1;
    p.pos.y = fract((p.pos.y + 0.1) / 1.2) * 1.2 - 0.1;

    particles[index] = p;
}
`;

// ========================================================
// 3. INSTANCED SNOWFLAKE RENDER SHADER
// ========================================================
const RENDER_SHADER = /* wgsl */ `
${COMMON_STRUCTS}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> particles: array<Particle>;
@group(0) @binding(2) var s_sampler: sampler;
@group(0) @binding(3) var t_flake: texture_2d<f32>;

struct VertexOutput {
    @builtin(position) clip_pos: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) alpha: f32,
};

@vertex
fn vs_main(
    @builtin(vertex_index) v_idx: u32,
    @builtin(instance_index) inst_idx: u32
) -> VertexOutput {
    let p = particles[inst_idx];

    var corners = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0)
    );
    let corner = corners[v_idx];

    let angle = p.params.w + u.time * p.params.z;
    let cosA = cos(angle);
    let sinA = sin(angle);
    let rot = mat2x2<f32>(cosA, -sinA, sinA, cosA);

    let aspect = u.resolution.x / u.resolution.y;
    var offset = rot * (corner * p.params.x);
    offset.x /= aspect;

    var out: VertexOutput;
    let center_clip = p.pos * 2.0 - 1.0;
    out.clip_pos = vec4<f32>(center_clip + offset, 0.0, 1.0);
    out.uv = corner * 0.5 + 0.5;
    out.alpha = mix(0.45, 0.95, smoothstep(0.010, 0.035, p.params.x));

    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let tex = textureSample(t_flake, s_sampler, in.uv);
    if (tex.a < 0.02) {
        discard;
    }

    let coldWhite = vec3<f32>(0.96, 0.98, 1.0);
    let snowColor = mix(coldWhite, u.accentColor.rgb, 0.10);

    return vec4<f32>(snowColor, tex.a * in.alpha);
}
`;

class WebGPUBlizzard {
    constructor() {
        this.canvas = document.getElementById('bg-canvas');
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'bg-canvas';
            document.body.prepend(this.canvas);
        }

        this.device = null;
        this.context = null;
        this.wasm = null;
        this.enginePtr = null;
        this.particleCount = 220;
        this.lastTime = performance.now();
        this.isPaused = false;
    }

    async start() {
        if (!navigator.gpu) {
            console.warn("WebGPU not available; using static background.");
            return;
        }

        const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (!adapter) return;
        this.device = await adapter.requestDevice();

        this.context = this.canvas.getContext("webgpu");
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "premultiplied",
        });

        const wasmRes = await fetch("blizzard.wasm");
        const { instance } = await WebAssembly.instantiateStreaming(wasmRes);
        this.wasm = instance.exports;

        this.enginePtr = this.wasm.engine_create(this.particleCount);

        const byteSize = this.wasm.engine_get_byte_size(this.enginePtr);
        const particleOffset = this.wasm.engine_get_particles(this.enginePtr);

        this.particleBuffer = this.device.createBuffer({
            size: byteSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.device.queue.writeBuffer(
            this.particleBuffer,
            0,
            this.wasm.memory.buffer,
            particleOffset,
            byteSize
        );

        this.uniformBuffer = this.device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        await this.loadSnowflakeTexture();
        this.setupPipelines();

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
        document.addEventListener('visibilitychange', () => {
            this.isPaused = document.hidden;
            if (!this.isPaused) this.lastTime = performance.now();
        });

        requestAnimationFrame((t) => this.loop(t));
    }

    async loadSnowflakeTexture() {
        const blob = new Blob([SVG_SNOWFLAKE], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await img.decode();
        URL.revokeObjectURL(url);

        const bitmap = await createImageBitmap(img);

        this.flakeTexture = this.device.createTexture({
            size: [256, 256, 1],
            format: "rgba8unorm",
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.device.queue.copyExternalImageToTexture(
            { source: bitmap },
            { texture: this.flakeTexture },
            [256, 256]
        );

        this.sampler = this.device.createSampler({
            magFilter: "linear",
            minFilter: "linear",
        });
    }

    setupPipelines() {
        const blendState = {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
        };

        // 1. VOLUMETRIC BACKGROUND PASS
        const volModule = this.device.createShaderModule({ code: VOLUMETRIC_SHADER });

        this.volBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } }
            ]
        });

        this.volBindGroup = this.device.createBindGroup({
            layout: this.volBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } }
            ]
        });

        this.volPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.volBindGroupLayout] }),
            vertex: { module: volModule, entryPoint: "vs_bg" },
            fragment: {
                module: volModule,
                entryPoint: "fs_bg",
                targets: [{ format: this.format, blend: blendState }]
            },
            primitive: { topology: "triangle-list" }
        });

        // 2. COMPUTE PARTICLES PASS
        const computeModule = this.device.createShaderModule({ code: COMPUTE_SHADER });

        this.computeBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }
            ]
        });

        this.computeBindGroup = this.device.createBindGroup({
            layout: this.computeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.particleBuffer } }
            ]
        });

        this.computePipeline = this.device.createComputePipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.computeBindGroupLayout] }),
            compute: { module: computeModule, entryPoint: "cs_main" }
        });

        // 3. INSTANCED PARTICLES RENDER PASS
        const renderModule = this.device.createShaderModule({ code: RENDER_SHADER });

        this.renderBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
                { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
                { binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
            ]
        });

        this.renderBindGroup = this.device.createBindGroup({
            layout: this.renderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.particleBuffer } },
                { binding: 2, resource: this.sampler },
                { binding: 3, resource: this.flakeTexture.createView() }
            ]
        });

        this.renderPipeline = this.device.createRenderPipeline({
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.renderBindGroupLayout] }),
            vertex: { module: renderModule, entryPoint: "vs_main" },
            fragment: {
                module: renderModule,
                entryPoint: "fs_main",
                targets: [{ format: this.format, blend: blendState }]
            },
            primitive: { topology: "triangle-list" }
        });
    }

    handleResize() {
        const dpr = Math.min(window.devicePixelRatio || 1.0, 1.5);
        const w = Math.floor(window.innerWidth * dpr);
        const h = Math.floor(window.innerHeight * dpr);

        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
    }

    loop(timestamp) {
        if (this.isPaused || document.documentElement.getAttribute('data-effects') === 'off') {
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        const dt = Math.min((timestamp - this.lastTime) * 0.001, 0.05);
        this.lastTime = timestamp;

        this.wasm.engine_update(this.enginePtr, dt, timestamp * 0.001, this.canvas.width, this.canvas.height);

        const uboOffset = this.wasm.engine_get_uniforms(this.enginePtr);
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.wasm.memory.buffer, uboOffset, 32);

        const encoder = this.device.createCommandEncoder();

        // 1. Compute step: Advance particles
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(this.computePipeline);
        computePass.setBindGroup(0, this.computeBindGroup);
        computePass.dispatchWorkgroups(Math.ceil(this.particleCount / 64));
        computePass.end();

        // 2. Render step: Unified draw passes
        const renderPass = encoder.beginRenderPass({
            colorAttachments: [{
                view: this.context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 }
            }]
        });

        // Draw 1: Fullscreen volumetric fog & squall gusts
        renderPass.setPipeline(this.volPipeline);
        renderPass.setBindGroup(0, this.volBindGroup);
        renderPass.draw(3, 1, 0, 0); // 1 procedural triangle covering screen

        // Draw 2: Instanced SVG snowflakes on top
        renderPass.setPipeline(this.renderPipeline);
        renderPass.setBindGroup(0, this.renderBindGroup);
        renderPass.draw(6, this.particleCount, 0, 0); // 6 vertices per instance

        renderPass.end();

        this.device.queue.submit([encoder.finish()]);

        requestAnimationFrame((t) => this.loop(t));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const blizzard = new WebGPUBlizzard();
    blizzard.start();
});
