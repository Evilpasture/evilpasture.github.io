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
});

/**
 * 1. GitHub Stats & Projects
 */
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
                            <span class="stat-value">${val}</span>
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
    const dropdown = document.getElementById('themeDropdown');
    const trigger = dropdown?.querySelector('.select-trigger');
    const options = dropdown?.querySelectorAll('.option');
    const currentNameLabel = document.getElementById('currentThemeName');
    const htmlEl = document.documentElement;
    const modeToggle = document.getElementById('modeToggle');
    const modeIcon = document.getElementById('modeIcon');

    if (!dropdown) return;

    // 1. Load Initial Theme
    const savedTheme = localStorage.getItem('theme') || 'default';
    htmlEl.setAttribute('data-theme', savedTheme);
    updateDropdownUI(savedTheme);

    // 2. Toggle Dropdown Open/Close
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    // 3. Handle Option Selection
    options.forEach(opt => {
        opt.addEventListener('click', () => {
            const theme = opt.getAttribute('data-value');
            htmlEl.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            updateDropdownUI(theme);
            dropdown.classList.remove('active');
        });
    });

    // 4. Close dropdown when clicking outside
    document.addEventListener('click', () => dropdown.classList.remove('active'));

    function updateDropdownUI(themeValue) {
        options.forEach(opt => {
            const isSelected = opt.getAttribute('data-value') === themeValue;
            opt.classList.toggle('selected', isSelected);
            if (isSelected) {
                currentNameLabel.innerText = opt.innerText;
            }
        });
    }

    // 5. Handle Mode Toggle (Remains the same)
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
        console.log(`Attempting to show modal: ${title}`); // ADD THIS
        if (!this.modal) {
            console.error("Modal element not found!"); // ADD THIS
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
        WHOAMI: 0x07
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
        'whoami': OP.WHOAMI
    };

    // --- 3. Global Input Listeners ---
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
                break;

            case OP.SET_THEME:
                const validThemes = ['default', 'dracula', 'gruvbox', 'terminal'];
                if (validThemes.includes(arg)) {
                    htmlEl.setAttribute('data-theme', arg);
                    localStorage.setItem('theme', arg);
                    // Update the custom dropdown text if it exists
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
                // We can now call the manager directly or trigger the button
                document.getElementById('licenseBtn')?.click();
                break;


            case OP.SUDO:
                ModalManager.show("ACCESS_DENIED",
                    "<span style='color:var(--accent)'>󰀦 Critical Error:</span><br>Nice try. Evilpasture is the only root user here.");
                break;

            case OP.HELP:
                console.log("Dispatching HELP command...");
                ModalManager.show("COMMAND_INDEX", `
                    <div style="text-align:left; font-family:monospace;">
                        <p>󰅂 theme [name]</p>
                        <p>󰅂 gui (toggle shaders)</p>
                        <p>󰅂 license</p>
                        <p>󰅂 whoami</p>
                        <p>󰅂 sudo</p>
                        <p>󰅂 q (exit console)</p>
                    </div>
                `);
                break;

            case OP.WHOAMI:
                window.location.hash = "about";
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