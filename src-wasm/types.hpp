#pragma once

namespace gfx {

// Freestanding scalar types (independent of host OS headers)
using uint32_t = unsigned int;
using uint64_t = unsigned long long;
using size_t = decltype(sizeof(0));
using uintptr_t = __UINTPTR_TYPE__;

// WGSL: vec2<f32> requires 8-byte alignment
struct alignas(8) Vec2 {
  float x{0.0f};
  float y{0.0f};

  constexpr Vec2() noexcept = default;
  constexpr Vec2(float x_, float y_) noexcept : x(x_), y(y_) {}

  constexpr Vec2 operator+(const Vec2 &rhs) const noexcept {
    return {x + rhs.x, y + rhs.y};
  }
  constexpr Vec2 operator*(float s) const noexcept { return {x * s, y * s}; }
  constexpr Vec2 &operator+=(const Vec2 &rhs) noexcept {
    x += rhs.x;
    y += rhs.y;
    return *this;
  }
};

// WGSL: vec4<f32> requires 16-byte alignment
struct alignas(16) Vec4 {
  float x{0.0f};
  float y{0.0f};
  float z{0.0f};
  float w{0.0f};

  constexpr Vec4() noexcept = default;
  constexpr Vec4(float x_, float y_, float z_, float w_) noexcept
      : x(x_), y(y_), z(z_), w(w_) {}
};

// Matches WGSL Particle struct layout exactly (32 bytes)
struct alignas(16) Particle {
  Vec2 position; // Offset 0,  Size 8
  Vec2 velocity; // Offset 8,  Size 8
  Vec4 params;   // Offset 16, Size 16: [size, speed, rotSpeed, seed]
};
static_assert(sizeof(Particle) == 32, "Particle struct must be 32 bytes");
static_assert(alignof(Particle) == 16,
              "Particle struct must be 16-byte aligned");

// Matches WGSL Uniforms layout (32 bytes)
struct alignas(16) Uniforms {
  Vec2 resolution;   // Offset 0,  Size 8
  float time;        // Offset 8,  Size 4
  float delta_time;  // Offset 12, Size 4
  Vec4 accent_color; // Offset 16, Size 16
};
static_assert(sizeof(Uniforms) == 32, "Uniforms struct must be 32 bytes");

} // namespace gfx
