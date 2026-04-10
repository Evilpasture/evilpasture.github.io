/**
 * Main Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    initGitHubData();
    setupSidebar();
    setupDiscordCopy();
    setupUptimeCounter();
    setupThemeSystem();
    setupEffectsSystem();
    setupLicenseButton();
    ModalManager.init();
    setupTerminalEasterEgg();
    setupProjectPreviews();
    initVimNavigation();
});

/**
 * 1. GitHub Stats & Projects
 */
window.PROJECT_LIST = [];

async function initGitHubData() {
    const statsContainer = document.getElementById('github-stats-container');
    const prList = document.getElementById('pr-list');
    const prContainer = document.getElementById('pr-container');
    const projectCards = document.querySelectorAll('.card-link[data-repo]');

    if (!statsContainer && !prList && projectCards.length === 0) return;

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Data file not found');
        const data = await response.json();

        if (statsContainer && data.stats) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    ${Object.entries(data.stats).map(([key, val]) => `
                        <div class="stat-item">
                            <span class="stat-value">
                                ${key === 'since' ? val.split('T')[0] : val}
                            </span>
                            <span class="stat-label">${key}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (prList && data.prs) {
            prContainer?.querySelector('.loading-text')?.remove();
            prList.innerHTML = data.prs.map(pr => `
                <li class="pr-item">
                    <a href="${pr.url}" target="_blank" rel="noopener">${pr.title}</a>
                    <span class="pr-repo">${pr.repo}</span>
                </li>
            `).join('');
        }

        if (projectCards.length > 0 && data.stars) {
            projectCards.forEach(card => {
                const repo = card.getAttribute('data-repo')?.toLowerCase();
                const badge = card.querySelector('.star-badge');
                if (badge && repo && data.stars[repo] !== undefined) {
                    badge.innerHTML = `󰓈 ${data.stars[repo]}`;
                }
            });
        }
        window.PROJECT_LIST = Object.keys(data.projects);
    } catch (err) {
        console.warn('GitHub Data Sync:', err.message);
        if (statsContainer) statsContainer.innerHTML = '<p class="loading-text">Stats unavailable</p>';
    }
}

/**
 * 2. Sidebar & Navigation
 */
function setupSidebar() {
    const sidebar = document.getElementById('sideNav');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('sidebarOpen');
    const closeBtn = document.getElementById('sidebarClose');

    if (!sidebar) return;

    const toggle = (s) => {
        sidebar.classList.toggle('active', s);
        overlay.classList.toggle('active', s);
        document.body.style.overflow = s ? 'hidden' : '';
    };

    openBtn?.addEventListener('click', () => toggle(true));
    closeBtn?.addEventListener('click', () => toggle(false));
    overlay?.addEventListener('click', () => toggle(false));

    // Optimization: Event Delegation
    sidebar.addEventListener('click', (e) => {
        if (e.target.closest('.nav-item')) toggle(false);
    });
}

/**
 * 3. Utilities
 */
function setupDiscordCopy() {
    const handle = document.querySelector('.discord-handle');
    if (!handle) return;

    handle.addEventListener('click', async () => {
        const valSpan = handle.querySelector('.contact-value');
        const textToCopy = handle.getAttribute('data-handle') || valSpan.innerText.replace('@', '');

        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalText = valSpan.innerText;
            valSpan.innerText = 'Copied!';
            handle.classList.add('copied');
            setTimeout(() => {
                valSpan.innerText = originalText;
                handle.classList.remove('copied');
            }, 2000);
        } catch (err) { console.error('Copy failed', err); }
    });
}

function setupUptimeCounter() {
    const counterEl = document.getElementById('uptime-counter');
    if (!counterEl) return;

    const startTime = Date.now();
    setInterval(() => {
        const delta = Date.now() - startTime;
        const h = Math.floor(delta / 3600000).toString().padStart(2, '0');
        const m = Math.floor((delta % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((delta % 60000) / 1000).toString().padStart(2, '0');
        counterEl.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

/**
 * 4. Theme & Appearance
 */
function setupThemeSystem() {
    const htmlEl = document.documentElement;
    const modeToggle = document.getElementById('modeToggle');
    const modeIcon = document.getElementById('modeIcon');

    // 1. Load Initial Theme
    const savedTheme = localStorage.getItem('theme') || 'default';
    htmlEl.setAttribute('data-theme', savedTheme);

    // --- A. Handle Custom Div Dropdown (index.html) ---
    const dropdown = document.getElementById('themeDropdown');
    const currentNameLabel = document.getElementById('currentThemeName');

    if (dropdown) {
        const options = dropdown.querySelectorAll('.option');
        const trigger = dropdown.querySelector('.select-trigger');

        // Set initial label
        const selectedOption = dropdown.querySelector(`[data-value="${savedTheme}"]`);
        if (selectedOption && currentNameLabel) currentNameLabel.innerText = selectedOption.innerText;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                const theme = opt.getAttribute('data-value');
                htmlEl.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                currentNameLabel.innerText = opt.innerText;
                dropdown.classList.remove('active');
            });
        });
        document.addEventListener('click', () => dropdown.classList.remove('active'));
    }

    // --- B. Handle Standard Select Dropdown (log-viewer.html) ---
    const select = document.getElementById('themeSelect');
    if (select) {
        select.value = savedTheme; // Sync current theme to select value
        select.addEventListener('change', (e) => {
            const theme = e.target.value;
            htmlEl.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        });
    }

    // --- C. Handle Mode Toggle ---
    if (modeToggle) {
        const savedMode = localStorage.getItem('mode') || 'auto';
        htmlEl.setAttribute('data-mode', savedMode);
        modeIcon.innerText = savedMode === 'light' ? '󰖨' : '󰖔';

        modeToggle.addEventListener('click', () => {
            const nextMode = htmlEl.getAttribute('data-mode') === 'light' ? 'dark' : 'light';
            htmlEl.setAttribute('data-mode', nextMode);
            localStorage.setItem('mode', nextMode);
            modeIcon.innerText = nextMode === 'light' ? '󰖨' : '󰖔';
        });
    }
}

function setupEffectsSystem() {
    const toggle = document.getElementById('effectsToggle');
    const icon = document.getElementById('effectsIcon');
    const htmlEl = document.documentElement;

    if (!toggle) return;

    const isMobile = window.innerWidth < 950;
    const savedState = localStorage.getItem('visualEffects') || (isMobile ? 'off' : 'on');

    htmlEl.setAttribute('data-effects', savedState);
    icon.innerText = savedState === 'on' ? '󰄬' : '󰅖';

    toggle.addEventListener('click', () => {
        const currentState = htmlEl.getAttribute('data-effects');
        const newState = currentState === 'on' ? 'off' : 'on';

        htmlEl.setAttribute('data-effects', newState);
        localStorage.setItem('visualEffects', newState);
        icon.innerText = newState === 'on' ? '󰄬' : '󰅖';
    });
}

/**
 * 5. Unified Modal Manager
 */
const ModalManager = {
    init() {
        this.modal = document.getElementById('unifiedModal');
        if (!this.modal) return;

        this.titleEl = document.getElementById('modalTitle');
        this.bodyEl = document.getElementById('modalBody');
        this.closeBtn = document.getElementById('modalCloseBtn');
        this.window = this.modal.querySelector('.modal-window');

        this.closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.hide();
            }
        });
    },
    show(title, content, options = {}) {
        console.log(`Attempting to show modal: ${title}`);
        if (!this.modal) {
            console.error("Modal element not found!");
            return;
        }

        this.titleEl.innerText = title;
        this.bodyEl.innerHTML = content;
        this.window.classList.toggle('large', !!options.large);

        document.body.style.overflow = 'hidden';
        this.modal.classList.add('active');
    },
    hide() {
        if (!this.modal) return;

        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

function setupLicenseButton() {
    const licenseBtn = document.getElementById('licenseBtn');
    if (!licenseBtn) return;

    let licenseContent = '<p class="loading-text">Fetching license...</p>';

    // Pre-fetch the license to make the modal feel instant
    (async () => {
        try {
            const response = await fetch('LICENSE');
            if (!response.ok) throw new Error('File not found in repo.');
            const text = await response.text();
            licenseContent = `<pre>${text}</pre>`;
        } catch (err) {
            licenseContent = `<p>Error: Could not load LICENSE file.</p>`;
        }
    })();

    licenseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        ModalManager.show('cat LICENSE', licenseContent, { large: true });
    });
}

/**
 * 6. Terminal Easter Egg (Vim Logic / Opcode Dispatcher)
 */
function setupTerminalEasterEgg() {
    const cmdBar = document.getElementById('cmd-bar');
    const cmdInput = document.getElementById('cmd-input');
    const htmlEl = document.documentElement;

    if (!cmdBar || !cmdInput) return;

    // --- 1. Opcode Definition (Enum) ---
    const OP = Object.freeze({
        NOP: 0x00,
        QUIT: 0x01,
        SET_THEME: 0x02,
        TOGGLE_GUI: 0x03,
        SHOW_LICENSE: 0x04,
        SUDO: 0x05,
        HELP: 0x06,
        WHOAMI: 0x07,
        EXPLORE: 0x08,
        VIM_TOGGLE: 0x09,
        MAN: 0x0A
    });

    // --- 2. String to Opcode Mapping ---
    const COMMAND_MAP = {
        'q': OP.QUIT,
        'quit': OP.QUIT,
        'exit': OP.QUIT,
        'theme': OP.SET_THEME,
        'gui': OP.TOGGLE_GUI,
        'license': OP.SHOW_LICENSE,
        'sudo': OP.SUDO,
        'help': OP.HELP,
        'whoami': OP.WHOAMI,
        'explore': OP.EXPLORE,
        'nvim': OP.VIM_TOGGLE,
        'man': OP.MAN,
    };

    // ... (Keep existing Global Input Listeners) ...
    document.addEventListener('keydown', (e) => {
        const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (e.key === ':' && !isTyping) {
            e.preventDefault();
            cmdBar.classList.add('active');
            cmdInput.value = '';
            cmdInput.focus();
        }
        if (e.key === 'Escape') closeCmd();
    });

    cmdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = cmdInput.value.trim().toLowerCase();
            const [rawCmd, arg] = val.split(' ');
            const opcode = COMMAND_MAP[rawCmd] || OP.NOP;
            dispatch(opcode, arg);
            closeCmd();
        }
    });

    function closeCmd() {
        cmdBar.classList.remove('active');
        cmdInput.blur();
    }

    // --- 4. Dispatcher ---
    function dispatch(opcode, arg) {
        switch (opcode) {
            case OP.QUIT:
                closeCmd();
                break;

            case OP.SET_THEME:
                const validThemes = ['default', 'dracula', 'gruvbox', 'terminal'];
                if (validThemes.includes(arg)) {
                    htmlEl.setAttribute('data-theme', arg);
                    localStorage.setItem('theme', arg);
                    const label = document.getElementById('currentThemeName');
                    if (label) {
                        const opt = document.querySelector(`.option[data-value="${arg}"]`);
                        if (opt) label.innerText = opt.innerText;
                    }
                }
                break;

            case OP.TOGGLE_GUI:
                const next = htmlEl.getAttribute('data-effects') === 'on' ? 'off' : 'on';
                htmlEl.setAttribute('data-effects', next);
                localStorage.setItem('visualEffects', next);
                const effIcon = document.getElementById('effectsIcon');
                if (effIcon) effIcon.innerText = next === 'on' ? '󰄬' : '󰅖';
                break;

            case OP.SHOW_LICENSE:
                document.getElementById('licenseBtn')?.click();
                break;

            case OP.EXPLORE:
                if (!arg) {
                    ModalManager.show("USAGE", "Usage: explore [repo-name]");
                    return;
                }
                const matchExplore = findBestRepoMatch(arg);
                if (matchExplore) {
                    openFileExplorer(matchExplore);
                } else {
                    ModalManager.show("EXEC_ERROR", `Repository <strong>${arg}</strong> does not exist.`);
                }
                break;

            case OP.SUDO:
                ModalManager.show("ACCESS_DENIED",
                    "<span style='color:var(--accent)'>󰀦 Critical Error:</span><br>Nice try. Evilpasture is the only root user here.");
                break;

            case OP.HELP:
                ModalManager.show("COMMAND_INDEX", `
                    <div style="text-align:left; font-family:monospace;">
                        <p>󰅂 theme [name]</p>
                        <p>󰅂 explore [repo]</p>
                        <p>󰅂 gui</p>
                        <p>󰅂 license</p>
                        <p>󰅂 whoami</p>
                        <p>󰅂 sudo</p>
                        <p>󰅂 q</p>
                    </div>
                `);
                break;

            case OP.WHOAMI:
                window.location.hash = "about";
                break;

            case OP.VIM_TOGGLE:
                const isVimEnabled = localStorage.getItem('vimMode') === 'true';
                const newState = !isVimEnabled;
                localStorage.setItem('vimMode', newState);

                // Add this line:
                window.dispatchEvent(new Event('vimModeChange'));

                ModalManager.show("VIM_MODE", `Vim navigation is now: <b>${newState ? 'ENABLED' : 'DISABLED'}</b>`);
                break;

            case OP.MAN:
                if (!arg) {
                    ModalManager.show("USAGE", "Usage: man [repo-name]");
                    return;
                }
                const match = findBestRepoMatch(arg);
                if (match) {
                    showReadme(match);
                } else {
                    ModalManager.show("EXEC_ERROR", `Repository <strong>${arg}</strong> does not exist.`);
                }
                break;

            case OP.NOP:
            default:
                if (cmdInput.value.length > 0) {
                    ModalManager.show("EXEC_ERROR", `Command not found: <span style="color:var(--accent)">${cmdInput.value}</span>`);
                }
                break;
        }
    }
}

/**
 * Project Preview System
 */
function setupProjectPreviews() {
    const cards = document.querySelectorAll('.card-link');

    cards.forEach(card => {
        card.addEventListener('click', async (e) => {
            e.preventDefault(); // Stop navigation
            const repo = card.getAttribute('data-repo');

            // Show a "Loading" state immediately
            ModalManager.show(repo.toUpperCase(), '<p>Loading project metadata...</p>');

            try {
                // Fetch your data.json
                const response = await fetch('data.json');
                const data = await response.json();
                const info = data.projects[repo];

                if (!info) throw new Error("Project details not found.");

                // Build interactive UI
                const html = `
                    <div class="project-modal">
                        <h3>${info.title}</h3>
                        <p>${info.desc}</p>
                        <div class="tech-stack">
                            ${info.tech.map(t => `<span>${t}</span>`).join('')}
                        </div>
                        <div style="margin-top: 20px; display:flex; gap:10px;">
                            <a href="${info.link}" target="_blank" class="github-link">GitHub</a>
                            <!-- NEW BUTTON -->
                            <button class="github-link" onclick="openFileExplorer('${repo}')">Browse Code</button>
                        </div>
                    </div>
                `;
                ModalManager.show(info.title, html, { large: true });
            } catch (err) {
                ModalManager.show("ERROR", `<p>Could not load project details: ${err.message}</p>`);
            }
        });
    });
}

/**
 * Interactive File Explorer
 * Uses on-demand fetching to keep data.json lightweight.
 */
async function openFileExplorer(repo) {
    const owner = "Evilpasture";
    const headers = { 'Accept': 'application/vnd.github.v3+json' };

    ModalManager.show("FILE_EXPLORER", `<p>Connecting to GitHub API for ${repo}...</p>`);

    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, { headers });
        if (response.status === 403) throw new Error("API rate limit reached.");
        if (!response.ok) {
            let errorData;
            try {
                // Attempt to parse the GitHub error response
                errorData = await response.json();
            } catch (e) {
                errorData = { message: "Unknown error occurred" };
            }

            const message = errorData.message || "";

            switch (response.status) {
                case 401:
                    throw new Error("Unauthorized: Check your GitHub Token.");
                case 403:
                    if (response.headers.get('X-RateLimit-Remaining') === '0') {
                        throw new Error("API rate limit exceeded. Try again later.");
                    }
                    throw new Error("Forbidden: You may not have permission to view this repo.");
                case 404:
                    throw new Error(`Repo '${repo}' not found or branch 'main' does not exist.`);
                case 409:
                    throw new Error("Git Repository is empty or being built.");
                case 422:
                    throw new Error("Validation failed: The recursive tree limit might be exceeded.");
                default:
                    throw new Error(`GitHub API Error: ${message} (Status: ${response.status})`);
            }
        }

        const data = await response.json();

        // 1. Prepare the tree HTML
        const treeHtml = data.tree
            .filter(item => item.type === 'blob' && !item.path.match(/\.(png|jpg|gif|pdf)$/i))
            .map(item => `
                <li class="explorer-item" data-url="${item.url}" data-path="${item.path}">
                    <span class="icon">󰈔</span> ${item.path}
                </li>
            `).join('');

        // 2. Define a helper to render the tree (so we can call it later)
        const renderTree = () => {
            ModalManager.show(`${repo}/tree/main`, `
                <div class="explorer-container">
                    <ul class="explorer-tree">${treeHtml}</ul>
                </div>
            `, { large: true });

            // Re-attach event listeners because ModalManager innerHTML resets
            document.querySelectorAll('.explorer-item').forEach(item => {
                item.addEventListener('click', () => renderFile(item));
            });
        };

        // 3. Define a helper to render the file content
        const renderFile = async (item) => {
            const url = item.getAttribute('data-url');
            const path = item.getAttribute('data-path');

            ModalManager.show(path, `<p>Loading contents...</p>`, { large: true });

            const fileRes = await fetch(url, { headers });
            const fileData = await fileRes.json();
            const content = decodeURIComponent(escape(atob(fileData.content)));

            // Add the Back Button here!
            ModalManager.show(path, `
                <button class="explorer-back-btn" id="backToTree">󰁍 Back to Explorer</button>
                <pre class="explorer-content"><code>${content}</code></pre>
            `, { large: true });

            document.getElementById('backToTree').addEventListener('click', renderTree);
        };

        // Initial launch
        renderTree();

    } catch (err) {
        ModalManager.show("ERROR", `<p>Failed to load explorer: ${err.message}</p>`);
    }
}

/**
 * Calculates Levenshtein Distance to find string similarity
 */
function getLevenshteinDistance(a, b) {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
}

/**
 * Vim-style Navigation System (Optimized)
 */
function initVimNavigation() {
    const MODES = { NORMAL: 'NORMAL', VISUAL: 'VISUAL' };
    let currentMode = MODES.NORMAL;
    const activeKeys = new Set();
    let lastKey = null;
    let animationFrame = null;
    const SCROLL_SPEED = 30;

    // 1. Create a mode indicator
    const indicator = document.createElement('div');
    indicator.id = 'vim-indicator';
    indicator.style.cssText = 'position:fixed; bottom:10px; right:10px; padding:5px 10px; background:var(--accent); color:var(--bg); font-family:monospace; font-size:12px; display:none; border-radius:4px; z-index:9999; pointer-events:none;';
    document.body.appendChild(indicator);

    function updateIndicator() {
        const enabled = localStorage.getItem('vimMode') === 'true';
        indicator.style.display = enabled ? 'block' : 'none';
        indicator.innerText = `-- ${currentMode} --`;
    }

    window.addEventListener('vimModeChange', updateIndicator);

    // 2. Selection helper
    function moveSelection(direction) {
        const sel = window.getSelection();
        if (!sel.rangeCount) {
            const range = document.createRange();
            range.setStart(document.body, 0);
            sel.addRange(range);
        }

        // Use 'line' for j/k, 'character' for h/l
        const granularity = (direction === 'down' || direction === 'up') ? 'line' : 'character';
        const dir = (direction === 'down' || direction === 'right') ? 'forward' : 'backward';

        sel.modify('extend', dir, granularity);
        sel.focusNode?.parentElement?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    function scrollLoop() {
        if (currentMode === MODES.NORMAL) {
            if (activeKeys.has('j')) window.scrollBy({ top: SCROLL_SPEED, behavior: 'auto' });
            if (activeKeys.has('k')) window.scrollBy({ top: -SCROLL_SPEED, behavior: 'auto' });
            if (activeKeys.has('h')) window.scrollBy({ left: -SCROLL_SPEED, behavior: 'auto' });
            if (activeKeys.has('l')) window.scrollBy({ left: SCROLL_SPEED, behavior: 'auto' });
        } else if (currentMode === MODES.VISUAL) {
            if (activeKeys.has('j')) moveSelection('down');
            if (activeKeys.has('k')) moveSelection('up');
            if (activeKeys.has('h')) moveSelection('left');
            if (activeKeys.has('l')) moveSelection('right');
        }

        // Keep loop alive if ANY movement key is held
        if (activeKeys.has('h') || activeKeys.has('j') || activeKeys.has('k') || activeKeys.has('l')) {
            animationFrame = requestAnimationFrame(scrollLoop);
        } else {
            animationFrame = null;
        }
    }

    document.addEventListener('keydown', (e) => {
        if (localStorage.getItem('vimMode') !== 'true') return;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

        // Mode Toggles
        if (e.key === 'v' && currentMode === MODES.NORMAL) {
            currentMode = MODES.VISUAL;
            updateIndicator();
        }
        if (e.key === 'Escape') {
            currentMode = MODES.NORMAL;
            window.getSelection().removeAllRanges();
            updateIndicator();
        }

        // Track movement keys
        if (['h', 'j', 'k', 'l'].includes(e.key)) {
            if (!activeKeys.has(e.key)) {
                activeKeys.add(e.key);
                if (!animationFrame) scrollLoop();
            }
        }

        // Top of page (gg)
        if (e.key === 'g') {
            if (lastKey === 'g') {
                window.scrollTo({ top: 0, behavior: 'auto' });
                lastKey = null;
            } else {
                lastKey = 'g';
                setTimeout(() => lastKey = null, 500);
            }
        }
    });

    document.addEventListener('keyup', (e) => activeKeys.delete(e.key));

    window.addEventListener('blur', () => {
        activeKeys.clear();
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
    });

    updateIndicator();
}

/**
 * Helper to find fuzzy matches for repos
 */
function findBestRepoMatch(input) {
    if (window.PROJECT_LIST.includes(input)) return input;

    let closestMatch = null;
    let minDistance = 3;

    window.PROJECT_LIST.forEach(repo => {
        const dist = getLevenshteinDistance(input, repo);
        if (dist < minDistance) {
            minDistance = dist;
            closestMatch = repo;
        }
    });
    return closestMatch;
}

/**
 * Fetch and Render README
 */
async function showReadme(repo) {
    ModalManager.show(`man ${repo}`, `<p class="loading-text">Fetching documentation from main/README.md...</p>`, { large: true });

    try {
        const res = await fetch(`https://api.github.com/repos/Evilpasture/${repo}/readme`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        
        if (!res.ok) throw new Error("README.md not found in this repository.");

        const data = await res.json();
        // Decode base64 UTF-8 string
        const text = decodeURIComponent(escape(atob(data.content)));

        // 1. Parse Markdown to HTML
        const htmlContent = marked.parse(text);

        // 2. Wrap in .prose container for styling
        const modalBody = `<div class="prose man-page">${htmlContent}</div>`;

        // 3. Show in Modal
        ModalManager.show(`man ${repo}`, modalBody, { large: true });

        // 4. Force Prism to highlight the new code blocks in the modal
        if (window.Prism) {
            Prism.highlightAllUnder(document.getElementById('modalBody'));
        }

    } catch (err) {
        ModalManager.show("EXEC_ERROR", `<p style="color:var(--accent)">󰀦 Man Error:</p><p>${err.message}</p>`);
    }
}