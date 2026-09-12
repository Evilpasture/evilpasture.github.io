#pragma once
#include "types.hpp"

namespace gfx {

class BlizzardEngine {
public:
  explicit BlizzardEngine(uint32_t particle_count) noexcept;
  ~BlizzardEngine() noexcept;

  // Strict ownership: non-copyable, non-movable
  BlizzardEngine(const BlizzardEngine &) = delete;
  BlizzardEngine &operator=(const BlizzardEngine &) = delete;
  BlizzardEngine(BlizzardEngine &&) = delete;
  BlizzardEngine &operator=(BlizzardEngine &&) = delete;

  void update(float dt, float total_time, float screen_w,
              float screen_h) noexcept;

  [[nodiscard]] const Particle *particle_data() const noexcept {
    return m_particles;
  }
  [[nodiscard]] uint32_t particle_count() const noexcept {
    return m_particle_count;
  }
  [[nodiscard]] uint32_t byte_size() const noexcept {
    return m_particle_count * sizeof(Particle);
  }
  [[nodiscard]] const Uniforms *uniforms() const noexcept {
    return &m_uniforms;
  }

private:
  uint32_t m_prng_state{0x1337BEEF};
  float random_float() noexcept;

  uint32_t m_particle_count{0};
  Particle *m_particles{nullptr};
  Uniforms m_uniforms{};
};

} // namespace gfx
