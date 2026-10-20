CXX = clang++
CXXFLAGS = --target=wasm32-unknown-unknown \
           -std=c++17 \
           -O3 \
           -flto \
           -nostdlib \
           -fno-builtin \
           -fno-exceptions \
           -fno-rtti \
           -mbulk-memory \
           -Wall \
           -Wextra

LDFLAGS = -nostdlib \
          -Wl,--no-entry \
          -Wl,--export-dynamic \
          -Wl,--lto-O3 \
          -Wl,--initial-memory=2097152 \
          -Wl,--strip-all

SOURCES = src-wasm/engine.cpp src-wasm/wasm_api.cpp
OUTPUT = blizzard.wasm

all: $(OUTPUT)

$(OUTPUT): $(SOURCES)
	$(CXX) $(CXXFLAGS) $(LDFLAGS) $(SOURCES) -o $(OUTPUT)
	@echo "Build successful: $(OUTPUT) built with pure LLVM."

clean:
	rm -f $(OUTPUT)

.PHONY: all clean tidy tidy-fix tidy-check

CLANG_TIDY ?= clang-tidy
TIDY_FIX_CHECKS = -*,modernize-avoid-c-style-cast,modernize-use-nullptr,\
modernize-use-override,modernize-use-equals-default,modernize-use-emplace,\
readability-braces-around-statements,readability-math-missing-parentheses,\
readability-uppercase-literal-suffix,readability-redundant-member-init,\
misc-const-correctness,cppcoreguidelines-prefer-member-initializer,\
cppcoreguidelines-use-default-member-init,cppcoreguidelines-init-variables
tidy:
	$(CLANG_TIDY) --quiet $(SOURCES) -- $(CXXFLAGS) -fsyntax-only
tidy-fix:
	$(CLANG_TIDY) --quiet --fix --format-style=file \
	  --checks='$(TIDY_FIX_CHECKS)' $(SOURCES) -- $(CXXFLAGS) -fsyntax-only
tidy-check:
	@out=$$($(CLANG_TIDY) --quiet $(firstword $(SOURCES)) -- $(CXXFLAGS) -fsyntax-only 2>&1); \
	if echo "$$out" | grep -q 'invalid configuration value'; then \
	  echo "$$out" | grep 'invalid configuration value'; \
	  echo "ERROR: clang-tidy rejected the values above; those checks ran with no style configured."; \
	  exit 1; \
	fi; \
	echo ".clang-tidy: all CheckOptions accepted."
