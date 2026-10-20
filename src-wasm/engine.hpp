#pragma once
#include "types.hpp"

namespace gfx {

class BlizzardEngine {
  public:
    explicit BlizzardEngine(uint32_t particleCount) noexcept;
    ~BlizzardEngine() noexcept;

    // Strict ownership: non-copyable, non-movable
    BlizzardEngine(const BlizzardEngine&)            = delete;
    BlizzardEngine& operator=(const BlizzardEngine&) = delete;
    BlizzardEngine(BlizzardEngine&&)                 = delete;
    BlizzardEngine& operator=(BlizzardEngine&&)      = delete;

    void Update(float dt, float totalTime, float screenW, float screenH) noexcept;

    [[nodiscard]] const Particle* ParticleData() const noexcept {
        return mParticles;
    }
    [[nodiscard]] uint32_t ParticleCount() const noexcept {
        return mParticleCount;
    }
    [[nodiscard]] uint32_t ByteSize() const noexcept {
        return mParticleCount * sizeof(Particle);
    }
    [[nodiscard]] const Uniforms* Uniforms() const noexcept {
        return &mUniforms;
    }

  private:
    uint32_t mPrngState {0x1337BEEF};
    float    RandomFloat() noexcept;

    uint32_t        mParticleCount {0};
    Particle*       mParticles {nullptr};
    struct Uniforms mUniforms {};
};

} // namespace gfx
