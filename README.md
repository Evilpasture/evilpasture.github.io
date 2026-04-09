# evilpasture.github.io

My personal portfolio and technical log. Built with a focus on performance, minimal dependencies, and hardware-sympathetic design.

## 🚀 Technical Overview

- **Frontend:** Pure HTML5, CSS3 (with CSS Variables for Dark Mode).
- **Typography:** JetBrains Mono Nerd Font (Self-hosted).
- **Data:** 
    - Real-time GitHub statistics and PR tracking via GitHub REST API.
    - Custom JavaScript caching layer (`localStorage`) with 1-hour TTL to respect rate limits.
- **Logs/Blog:** 
    - Dynamic client-side Markdown rendering using `Marked.js`.
    - Technical syntax highlighting for C++, C, and Python via `Prism.js`.

## 📂 Project Structure

```text
├── index.html          # Main landing page
├── log-viewer.html     # Dynamic Markdown renderer shell
├── style.css           # Global styles & layout
├── script.js           # GitHub API logic & UI interactions
├── logs/               # Technical blog posts (.md)
├── fonts/              # Self-hosted JetBrains Mono NF
└── LICENSE             # MIT License
```

## 🛠️ Local Development

To run the site locally and test the Markdown fetching/API logic:

1. Clone the repository:
   ```bash
   git clone https://github.com/Evilpasture/evilpasture.github.io.git
   cd evilpasture.github.io
   ```

2. Start a local server (to avoid CORS issues with local files):
   ```bash
   python -m http.server 8000
   ```

3. Visit `http://localhost:8000` in your browser.

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
