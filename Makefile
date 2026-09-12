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

.PHONY: all clean
