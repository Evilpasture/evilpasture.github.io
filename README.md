# evilpasture.github.io

My personal portfolio... or more like a bio page, and technical log — a terminal-inspired site built with a focus on performance, minimal dependencies, and hardware-sympathetic design. No frameworks, no bundler, no client-side API scraping: static files, a hand-rolled C++→WebAssembly particle engine behind a WebGPU renderer, and a nightly data pipeline.

**Live site:** [evilpasture.github.io](https://evilpasture.github.io)

## Architecture

### Frontend

- **Pure HTML5 + CSS3.** Theming driven by CSS custom properties (`data-theme` / `data-mode`) with dark/light mode and a lightweight terminal/CRT aesthetic.
- **Typography:** Self-hosted JetBrains Mono Nerd Font (`fonts/`).
- **Logs:** Client-side Markdown rendering via `marked.js`, with C/C++/Python syntax highlighting via `Prism.js`. Each log page also shows the file's last-commit author and date, fetched from the GitHub commits API.
- **Extras:** Command-line easter egg (press `:`) for theme switching, vim-style navigation mode, appearance and effects toggles (effects default to off on mobile).

### Background engine — WebGPU + WebAssembly

The animated blizzard background is a from-scratch GPU pipeline:

- **`src-wasm/`** — a freestanding **C++17** particle engine (`BlizzardEngine`, name after because I want blizzards): bump allocator over WASM linear memory, Xorshift PRNG, and structs laid out to exactly match the WGSL buffers (enforced with `static_assert`). No libc, no Emscripten.
- **`Makefile`** — compiles it with plain `clang++ --target=wasm32-unknown-unknown` (`-O3`, LTO, `-nostdlib`, stripped) into `blizzard.wasm`.
- **`shader.js`** — the WebGPU orchestrator: a compute pass advances 220 GPU-resident particles, an instanced draw call renders them, with volumetric fog layered on top. If WebGPU is unavailable, it degrades gracefully to a static background.

### Data pipeline

The frontend never hits the GitHub REST API for stats, so there are no rate limits to worry about:

- **`update_data.py`** fetches profile stats, merged upstream PRs, and star counts from the GitHub REST API and writes `data.json` (set `GH_TOKEN`; `USE_MOCK=true` to run from `mock_data.json`).
- **`.github/workflows/update-data.yml`** runs it nightly (cron) and auto-commits the refreshed `data.json`.
- **`script.js`** simply `fetch()`es the static `data.json` at page load.

### Deployment

**`.github/workflows/deploy.yml`** builds `blizzard.wasm` with clang/LLD on every push to `main` and deploys the site to **GitHub Pages**.

## Project Structure

```text
├── index.html            # Main landing page
├── log-viewer.html       # Markdown log viewer shell
├── script.js             # UI logic, GitHub data rendering, command line
├── shader.js             # WebGPU blizzard renderer + WASM orchestration
├── style.css             # Global styles & layout
├── log_style.css         # Prose/Markdown styles for logs
├── load_markdown.js      # Log loading, Markdown render, commit metadata
├── data.json             # GitHub stats snapshot (generated, committed)
├── update_data.py        # GitHub REST API → data.json pipeline
├── Makefile              # Builds blizzard.wasm (pure LLVM, no Emscripten)
├── src-wasm/             # Freestanding C++17 particle engine source
├── logs/                 # Technical log posts (.md)
├── fonts/                # Self-hosted JetBrains Mono NF
├── res/                  # Image & SVG assets
└── .github/workflows/    # Pages deploy + nightly data refresh
```

## Local Development

The site is fully static — any web server will do. (A server is required so `fetch()` works for `data.json` and the Markdown logs; `file://` won't.)

```bash
git clone https://github.com/Evilpasture/evilpasture.github.io.git
cd evilpasture.github.io
python -m http.server 8000
```

Open `http://localhost:8000`. Without a `blizzard.wasm` present, the blizzard background simply stays off and the rest of the site works normally.

### Building the WASM engine

Requires clang (with `wasm32` target support) and LLD:

```bash
make        # → blizzard.wasm
make clean
```

### Refreshing data.json

```bash
GH_TOKEN=<your token> uv run --with requests update_data.py   # live data
USE_MOCK=true uv run --with requests update_data.py           # from mock_data.json
```

CI does this automatically every night; locally you only need it if you're hacking on the stats UI.

## License

Distributed under the MIT License. See `LICENSE` for more information.
