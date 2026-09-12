#include "engine.hpp"

// ========================================================
// Freestanding Bump Allocator on WASM Linear Memory
// ========================================================
extern "C" unsigned char __heap_base;
static gfx::uintptr_t s_heap_ptr = 0;

void *operator new(gfx::size_t size) {
  if (s_heap_ptr == 0) {
    s_heap_ptr = reinterpret_cast<gfx::uintptr_t>(&__heap_base);
  }
  // 16-byte alignment for SIMD and WebGPU uniform/storage buffers
  s_heap_ptr = (s_heap_ptr + 15) & ~gfx::uintptr_t(15);
  void *ptr = reinterpret_cast<void *>(s_heap_ptr);
  s_heap_ptr += size;
  return ptr;
}

void *operator new[](gfx::size_t size) { return operator new(size); }

void operator delete(void *) noexcept {}
void operator delete[](void *) noexcept {}
void operator delete(void *, gfx::size_t) noexcept {}
void operator delete[](void *, gfx::size_t) noexcept {}

// ========================================================
// Engine Implementation
// ========================================================
namespace gfx {

float BlizzardEngine::random_float() noexcept {
  // 32-bit Xorshift PRNG
  m_prng_state ^= m_prng_state << 13;
  m_prng_state ^= m_prng_state >> 17;
  m_prng_state ^= m_prng_state << 5;
  return static_cast<float>(m_prng_state & 0x00FFFFFF) /
         static_cast<float>(0x01000000);
}

BlizzardEngine::BlizzardEngine(uint32_t particle_count) noexcept
    : m_particle_count(particle_count) {

  m_particles = new Particle[m_particle_count];

  for (uint32_t i = 0; i < m_particle_count; ++i) {
    m_particles[i].position = Vec2(random_float(), random_float());
    m_particles[i].velocity = Vec2(-0.908f, -0.418f);

    const float depth = random_float();
    const float size = 0.012f + (depth * depth) * 0.024f;
    const float speed = 0.40f + depth * 0.60f;
    const float rot_speed = (random_float() - 0.5f) * 1.8f;
    const float seed = random_float() * 100.0f;

    m_particles[i].params = Vec4(size, speed, rot_speed, seed);
  }
}

BlizzardEngine::~BlizzardEngine() noexcept {
  delete[] m_particles;
  m_particles = nullptr;
}

void BlizzardEngine::update(float dt, float total_time, float screen_w,
                            float screen_h) noexcept {
  m_uniforms.resolution = Vec2(screen_w, screen_h);
  m_uniforms.time = total_time;
  m_uniforms.delta_time = dt;
  m_uniforms.accent_color =
      Vec4(0.988f, 0.933f, 0.039f, 1.0f); // #fcee0a Neon Yellow
}

} // namespace gfx
