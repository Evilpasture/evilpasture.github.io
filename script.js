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
    setupLicenseModal();
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
 * 5. License Modal System
 */
function setupLicenseModal() {
    const licenseBtn = document.getElementById('licenseBtn');
    const modal = document.getElementById('licenseModal');
    const closeBtn = document.getElementById('closeLicenseBtn');
    const licenseText = document.getElementById('licenseText');
    const sidebar = document.getElementById('sideNav');
    const overlay = document.getElementById('overlay');

    if (!licenseBtn || !modal) return;

    let isLoaded = false;

    const openModal = async (e) => {
        e.preventDefault();
        
        // 1. Close sidebar if it's open
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        // 2. Lock body scroll
        document.body.style.overflow = 'hidden';
        
        // 3. Show Modal
        modal.classList.add('active');

        // 4. Fetch License (Only fetch once per page load)
        if (!isLoaded) {
            try {
                // Fetch the LICENSE file directly from the root directory
                const response = await fetch('LICENSE');
                if (!response.ok) throw new Error('License file not found in repository.');
                
                const text = await response.text();
                licenseText.textContent = text;
                licenseText.classList.remove('loading-text');
                isLoaded = true;
            } catch (err) {
                licenseText.textContent = `[ERROR]: ${err.message}\nMake sure a file named 'LICENSE' exists in the root of your GitHub repo.`;
                licenseText.style.color = 'var(--accent)'; // Highlight error
            }
        }
    };

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Unlock body scroll
    };

    // Event Listeners
    licenseBtn.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    
    // Close when clicking outside the modal window
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
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
        NOP:          0x00,
        QUIT:         0x01,
        SET_THEME:    0x02,
        TOGGLE_GUI:   0x03,
        SHOW_LICENSE: 0x04,
        SUDO:         0x05,
        HELP:         0x06,
        WHOAMI:       0x07
    });

    // --- 2. String to Opcode Mapping ---
    const COMMAND_MAP = {
        'q':       OP.QUIT,
        'quit':    OP.QUIT,
        'exit':    OP.QUIT,
        'theme':   OP.SET_THEME,
        'gui':     OP.TOGGLE_GUI,
        'license': OP.SHOW_LICENSE,
        'sudo':    OP.SUDO,
        'help':    OP.HELP,
        'whoami':  OP.WHOAMI
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
            const [rawCmd, arg] = cmdInput.value.trim().toLowerCase().split(' ');
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
                break; // Handled by closeCmd()

            case OP.SET_THEME:
                const validThemes = ['default', 'dracula', 'gruvbox', 'terminal'];
                if (validThemes.includes(arg)) {
                    htmlEl.setAttribute('data-theme', arg);
                    localStorage.setItem('theme', arg);
                    const selector = document.getElementById('themeSelect');
                    if (selector) selector.value = arg;
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

            case OP.SUDO:
                alert("Nice try. Evilpasture is the only root user here.");
                break;

            case OP.HELP:
                alert("OPCODES: theme [default|dracula|gruvbox|terminal], gui, license, sudo, whoami, q");
                break;

            case OP.WHOAMI:
                window.location.hash = "about";
                break;

            case OP.NOP:
            default:
                if (cmdInput.value.length > 0) {
                    console.warn(`0x${opcode.toString(16).toUpperCase().padStart(2, '0')} // ERR_UNKNOWN_OPCODE`);
                }
                break;
        }
    }
}