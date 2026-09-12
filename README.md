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

> **Pages must be set to "GitHub Actions"** as the source (Settings → Pages → Build and deployment → Source). If it's left on "Deploy from a branch", the built-in Jekyll build re-deploys the raw branch contents (which never contain `blizzard.wasm`) and overwrites the Actions artifact — the blizzard then 404s, *even though `deploy.yml` reports success*. See [Troubleshooting](#troubleshooting).
>
> `deploy.yml` now fails fast on this: its first step reads the Pages API and aborts the run with an explicit error if `build_type` is `legacy`, so a green build can no longer hide a misconfigured source. (An unreadable Pages API — e.g. a fork with Pages disabled, or a transient 5xx — only warns, so it can never block a legitimate deploy.) A committed `.nojekyll` additionally disables Jekyll for any branch-based build.

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
├── .nojekyll             # Skips Jekyll processing (matters only for branch-based Pages builds)
└── .github/workflows/    # Pages deploy + nightly data refresh
```

## Local Development

The site is fully static — any web server will do. (A server is required so `fetch()` works for `data.json` and the Markdown logs; `file://` won't.)

```bash
git clone https://github.com/Evilpasture/evilpasture.github.io.git
cd evilpasture.github.io
make                       # builds blizzard.wasm (optional, see below)
python -m http.server 8000
```

Open `http://localhost:8000`. Without a `blizzard.wasm` present, the blizzard background simply stays off and the rest of the site works normally — it logs one warning and never throws.

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

## Troubleshooting

**`Failed to load resource: the server responded with a status of 404` for `blizzard.wasm`, followed by**
**`TypeError: Failed to execute 'compile' on 'WebAssembly': HTTP status code is not ok`**

The renderer fetched `blizzard.wasm` and the server answered with a 404 page; `WebAssembly.compile` then rejected on the HTML body. `blizzard.wasm` is a **build artifact** produced by `make` from `src-wasm/` — it is gitignored and deliberately not committed, so it only exists if something built it:

- **Local dev:** run `make` in the repo root (needs clang with the `wasm32` target + LLD), then reload.
- **Live site:** check Settings → Pages → Build and deployment → Source is **GitHub Actions**. On "Deploy from a branch", Pages serves the raw contents of `main`, which never include `blizzard.wasm`, so the blizzard 404s even though `deploy.yml` built it successfully.

  Both deployments race on every push, and the branch build wins because it finishes *last* — e.g. from the run that produced this 404:

  | Workflow | Created | Finished |
  | --- | --- | --- |
  | `Build WASM and Deploy Pages` (ours) | 16:01:36Z | 16:02:19Z |
  | `pages-build-deployment` (GitHub's built-in) | 16:01:35Z | **16:02:23Z** ← overwrites |

  `concurrency: group: "pages"` in `deploy.yml` does not help here: `pages-build-deployment` is an internal workflow outside that group. The only fix is switching the source, after which the built-in workflow stops running entirely. Confirm with `gh api repos/<owner>/<repo>/pages --jq .build_type` → `workflow`, then re-run **Build WASM and Deploy Pages** and check `curl -I https://evilpasture.github.io/blizzard.wasm` returns `200` with `content-type: application/wasm`.

The page itself stays fully functional either way: `shader.js` catches the failure, logs `[blizzard] background disabled: ...`, hides `#bg-canvas`, and the static background remains.

## License

Distributed under the MIT License. See `LICENSE` for more information.
