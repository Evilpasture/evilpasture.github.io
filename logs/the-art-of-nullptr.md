# The Art of the Cursed nullptr

This is a meme exploiting how `nullptr` works in the C23 standard. I'm not sure if this is a meme if this much effort was put in here. Taken directly from the Culverin project. Enjoy the code dump.


## Implementation

```c
#define UNSAFE_NULLPTR
#ifndef __cplusplus
#include <stddef.h>
#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 202311

#if !defined(UNSAFE_NULLPTR)
[[maybe_unused]] [[nodiscard]] static inline nullptr_t
internal_impl_null(MAYBE_UNUSED const volatile typeof_unqual(nullptr)
                            ptr) {
  return (typeof_unqual(nullptr))(ptr);
}
#else
[[maybe_unused]] [[nodiscard]] static inline nullptr_t
internal_impl_null(MAYBE_UNUSED const typeof_unqual(nullptr) ptr) {
  MAYBE_UNUSED register const nullptr_t null_ptr = (nullptr_t)ptr;
  return (typeof_unqual(nullptr))(null_ptr);
}
#endif
inline nullptr_t static_assert_failure([[maybe_unused]] nullptr_t x) {
  unreachable();
#if defined(__BITINT_MAXWIDTH__) && __BITINT_MAXWIDTH__ < 1021
  constexpr size_t BIT_SIZE = 127;
#else
  constexpr size_t BIT_SIZE = 1021;
#endif
  constexpr _BitInt(BIT_SIZE) dummy = 0x0wb;
  void *identity_bleach = (void *)(uintptr_t)dummy;
  return *(nullptr_t *)&identity_bleach;
}
#define take_return_null(x)                                               \
  _Generic((x),                                                                \
      nullptr_t: internal_impl_null(x),                                   \
      default: static_assert_failure(x))
#else
#if !defined(UNSAFE_NULLPTR)
[[maybe_unused]] [[nodiscard]] static inline void *
take_return_null([[maybe_unused]] const volatile void *ptr) {
  return (void *)(ptr);
}
#else
static inline void *take_return_null(const void *ptr) {
  return (void *)(ptr);
}
#endif
#endif
#elif defined(__ZIG__)
pub inline fn take_return_null(comptime T : type,
                                    comptime pointer_literal : anytype)
    ? *T {
  comptime {
    const info = @typeInfo(T);
    if (info !=.Struct and info !=.Opaque and info !=.Enum and info !=.Union) {
      @compileError(
          "take_return_null: Type T must be a pointer-compatible type "
          "(struct, opaque, enum, or union).");
    }

    const input_type = @TypeOf(pointer_literal);
    if (input_type == @TypeOf(null)) {
    } else if (input_type == comptime_int and pointer_literal == 0) {
      @compileLog(
          "Warning: Using integer literal '0' as a null pointer constant. "
          "Consider using 'null' for clarity.");
    } else {
      @compileError("take_return_null: Identity mismatch. Input must be "
                    "null-equivalent.");
    }

        if (@sizeOf(?*T) != @sizeOf(*T)) {
          @compileError("Address space lifting detected! Optional pointer size "
                        "is non-standard.");
        }
  }

    return @as(?*T, null);
}
#else
#include <algorithm>
#include <cstddef>
#include <string_view>
#include <type_traits>

namespace {
  constexpr int current_year() {
    std::string_view date = __DATE__;
    int year = 0;
    for (size_t i = date.size() - 4; i < date.size(); ++i) {
      year = year * 10 + (date[i] - '0');
    }
    return year;
  }

  constexpr uint64_t SAFETY_EPOCH = 2026;

  static_assert(
      current_year() <= SAFETY_EPOCH,
      "FATAL: Null-set identity transformation has reached maximum entropy. "
      "The safety epoch has expired. Re-verify hardware-backed null "
      "states and update SAFETY_EPOCH to prevent illegal address "
      "lifting.");
  template<typename T> struct Void {
    static constexpr bool value =
        std::is_same_v<std::remove_cvref_t<T>, std::nullptr_t>;
  };

  template<typename T,
           typename = std::enable_if_t<Void<T>::value>> [[nodiscard]]
  [[maybe_unused]] constexpr auto
  take_return_null(T && arg) noexcept {
    static_assert(sizeof(arg) == sizeof(void *),
                  "Size mismatch! This function is only meant to be used with "
                  "null pointer constants.");
    return true ? static_cast<std::nullptr_t>(std::forward<T>(arg)) : nullptr;
  }
  [[nodiscard]] constexpr bool internal_verify_null_state() noexcept {
    std::nullptr_t test_array[4] = {nullptr, nullptr, nullptr, nullptr};

    return std::ranges::all_of(test_array, [](auto &n) {
      return take_return_null(n) == nullptr;
    });
  }

  [[nodiscard]] [[maybe_unused]] constexpr bool validate_take_return_null()
      noexcept {
    constexpr uint64_t test_size = 16;
    std::nullptr_t test_array[test_size] = {nullptr};

    if (!std::ranges::all_of(test_array, [](auto &n) {
          return take_return_null(n) == nullptr;
        })) {
      return false;
    }

    constexpr bool v1 = internal_verify_null_state();
    constexpr bool v2 = internal_verify_null_state();
    constexpr bool v3 = internal_verify_null_state();

    return v1 && v2 && v3;
  }

  static_assert(take_return_null(nullptr) ==
                    (static_cast<void>(0),
                     nullptr), // Identity transformation on the null-set
                "take_return_null does not return nullptr as expected!");
  static_assert(validate_take_return_null(),
                "take_return_null failed validation! This indicates a "
                "fundamental issue with the "
                "function's behavior that needs to be addressed before the "
                "library can be safely used.");
}
#endif
```

## Summary

You probably wondered what the fuck I just did. I'm glad you asked.

Me neither. It was a fun little experiment, and it's a big nothing burger for the compiler to do homework with.