#include "engine.hpp"

extern "C" {
[[gnu::visibility("default")]] gfx::BlizzardEngine *
engine_create(gfx::uint32_t particle_count) {
  return new gfx::BlizzardEngine(particle_count);
}

[[gnu::visibility("default")]] void
engine_destroy(gfx::BlizzardEngine *engine) {
  delete engine;
}

[[gnu::visibility("default")]] void engine_update(gfx::BlizzardEngine *engine,
                                                  float dt, float time, float w,
                                                  float h) {
  if (engine)
    engine->update(dt, time, w, h);
}

[[gnu::visibility("default")]] const gfx::Particle *
engine_get_particles(const gfx::BlizzardEngine *engine) {
  return engine ? engine->particle_data() : nullptr;
}

[[gnu::visibility("default")]] gfx::uint32_t
engine_get_byte_size(const gfx::BlizzardEngine *engine) {
  return engine ? engine->byte_size() : 0;
}

[[gnu::visibility("default")]] const gfx::Uniforms *
engine_get_uniforms(const gfx::BlizzardEngine *engine) {
  return engine ? engine->uniforms() : nullptr;
}
}
