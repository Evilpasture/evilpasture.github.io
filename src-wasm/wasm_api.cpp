#include "engine.hpp"

extern "C" {
[[gnu::visibility("default")]] gfx::BlizzardEngine* engine_create(gfx::uint32_t particleCount) {
    return new gfx::BlizzardEngine(particleCount);
}

[[gnu::visibility("default")]] void engine_destroy(gfx::BlizzardEngine* engine) {
    delete engine;
}

[[gnu::visibility("default")]] void engine_update(gfx::BlizzardEngine* engine, float dt, float time, float w, float h) {
    if (engine) {
        engine->Update(dt, time, w, h);
    }
}

[[gnu::visibility("default")]] const gfx::Particle* engine_get_particles(const gfx::BlizzardEngine* engine) {
    return engine ? engine->ParticleData() : nullptr;
}

[[gnu::visibility("default")]] gfx::uint32_t engine_get_byte_size(const gfx::BlizzardEngine* engine) {
    return engine ? engine->ByteSize() : 0;
}

[[gnu::visibility("default")]] const gfx::Uniforms* engine_get_uniforms(const gfx::BlizzardEngine* engine) {
    return engine ? engine->Uniforms() : nullptr;
}
}
