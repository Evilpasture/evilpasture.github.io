#include "engine.hpp"

// ========================================================
// Freestanding Bump Allocator on WASM Linear Memory
// ========================================================
extern "C" unsigned char __heap_base;

namespace {
gfx::uintptr_t s_heap_ptr = 0;
}
void* operator new(gfx::size_t size) {
    if (s_heap_ptr == 0) {
        s_heap_ptr = reinterpret_cast<gfx::uintptr_t>(&__heap_base);
    }
    // 16-byte alignment for SIMD and WebGPU uniform/storage buffers
    s_heap_ptr = (s_heap_ptr + 15) & ~gfx::uintptr_t(15);
    void* ptr  = reinterpret_cast<void*>(s_heap_ptr);
    s_heap_ptr += size;
    return ptr;
}

void* operator new[](gfx::size_t size) {
    return operator new(size);
}

void operator delete(void*) noexcept {
}
void operator delete[](void*) noexcept {
}
void operator delete(void*, gfx::size_t) noexcept {
}
void operator delete[](void*, gfx::size_t) noexcept {
}

// ========================================================
// Engine Implementation
// ========================================================
namespace gfx {

float BlizzardEngine::RandomFloat() noexcept {
    // 32-bit Xorshift PRNG
    mPrngState ^= mPrngState << 13;
    mPrngState ^= mPrngState >> 17;
    mPrngState ^= mPrngState << 5;
    return static_cast<float>(mPrngState & 0x00FFFFFF) / static_cast<float>(0x01000000);
}

BlizzardEngine::BlizzardEngine(uint32_t particleCount) noexcept: mParticleCount(particleCount), mParticles(new Particle[particleCount]) {
    for (uint32_t i = 0; i < particleCount; ++i) {
        mParticles[i].position = Vec2(RandomFloat(), RandomFloat());
        mParticles[i].velocity = Vec2(-0.908f, -0.418f);

        const float depth     = RandomFloat();
        const float size      = 0.012f + ((depth * depth) * 0.024f);
        const float speed     = 0.40f + (depth * 0.60f);
        const float rot_speed = (RandomFloat() - 0.5f) * 1.8f;
        const float seed      = RandomFloat() * 100.0f;

        mParticles[i].params = Vec4(size, speed, rot_speed, seed);
    }
}

BlizzardEngine::~BlizzardEngine() noexcept {
    delete[] mParticles;
    mParticles = nullptr;
}

void BlizzardEngine::Update(float dt, float totalTime, float screenW, float screenH) noexcept {
    mUniforms.resolution  = Vec2(screenW, screenH);
    mUniforms.time        = totalTime;
    mUniforms.deltaTime   = dt;
    mUniforms.accentColor = Vec4(0.988f, 0.933f, 0.039f, 1.0f); // #fcee0a Neon Yellow
}

} // namespace gfx
