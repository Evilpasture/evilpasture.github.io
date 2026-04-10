/**
 * Main Data Initialization
 */
async function initGitHubData() {
    // 1. Select all potential elements
    const statsContainer = document.getElementById('github-stats-container');
    const prList = document.getElementById('pr-list');
    const prContainer = document.getElementById('pr-container');
    const projectCards = document.querySelectorAll('.card-link[data-repo]');

    // If NONE of these elements exist (which might happen on a very minimal page), 
    // we can exit early and save a network request.
    if (!statsContainer && !prList && projectCards.length === 0) {
        return;
    }

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Data file not found');
        const data = await response.json();

        // 2. Render Stats (Only if container exists)
        if (statsContainer && data.stats) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${data.stats.commits}</span>
                        <span class="stat-label">Commits</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${data.stats.repos}</span>
                        <span class="stat-label">Repos</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${data.stats.followers}</span>
                        <span class="stat-label">Followers</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${data.stats.since}</span>
                        <span class="stat-label">Since</span>
                    </div>
                </div>
            `;
        }

        // 3. Render PRs (Safe check for both list and container)
        if (prList && data.prs) {
            // Use optional chaining (?.) to safely remove loading text if it exists
            prContainer?.querySelector('.loading-text')?.remove();
            
            prList.innerHTML = data.prs.map(pr => `
                <li class="pr-item">
                    <a href="${pr.url}" target="_blank" rel="noopener">${pr.title}</a>
                    <span class="pr-repo">${pr.repo}</span>
                </li>
            `).join('');
        }

        // 4. Render Stars (Only if cards were found)
        if (projectCards.length > 0 && data.stars) {
            projectCards.forEach(card => {
                const repoAttr = card.getAttribute('data-repo');
                if (!repoAttr) return;
                
                const repoName = repoAttr.toLowerCase();
                const badge = card.querySelector('.star-badge');
                if (badge && data.stars[repoName] !== undefined) {
                    badge.innerHTML = `󰓈 ${data.stars[repoName]}`;
                }
            });
        }

    } catch (err) {
        console.warn('GitHub Data Sync:', err.message);
        // Only show error message if we are actually on the page that needs it
        if (statsContainer) {
            statsContainer.innerHTML = '<p class="loading-text">Stats currently unavailable</p>';
        }
    }
}

/**
 * UI Setup Functions (Sidebar, Discord Copy, etc.)
 * These remain largely the same as your original script
 */
function setupDiscordCopy() {
    const handle = document.querySelector('.discord-handle');
    if (!handle) return;
    handle.addEventListener('click', async () => {
        try {
            const textToCopy = handle.getAttribute('data-handle') || handle.innerText.replace('@', '');
            await navigator.clipboard.writeText(textToCopy);
            const valSpan = handle.querySelector('.contact-value');
            const originalText = valSpan.innerText;
            valSpan.innerText = 'Copied!';
            handle.classList.add('copied');
            setTimeout(() => {
                valSpan.innerText = originalText;
                handle.classList.remove('copied');
            }, 2000);
        } catch (err) { console.error(err); }
    });
}

function setupSidebar() {
    const sidebar = document.getElementById('sideNav');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('sidebarOpen');
    const closeBtn = document.getElementById('sidebarClose');
    
    const toggle = (s) => {
        sidebar.classList.toggle('active', s);
        overlay.classList.toggle('active', s);
        document.body.style.overflow = s ? 'hidden' : '';
    };

    openBtn?.addEventListener('click', () => toggle(true));
    closeBtn?.addEventListener('click', () => toggle(false));
    overlay?.addEventListener('click', () => toggle(false));
    document.querySelectorAll('.nav-item').forEach(l => l.addEventListener('click', () => toggle(false)));
}

/**
 * Theme & Mode System
 */
function setupThemeSystem() {
    const themeSelect = document.getElementById('themeSelect');
    const modeToggle = document.getElementById('modeToggle');
    const modeIcon = document.getElementById('modeIcon');
    const htmlEl = document.documentElement;

    // 1. Load saved preferences
    const savedTheme = localStorage.getItem('theme') || 'default';
    const savedMode = localStorage.getItem('mode') || 'auto';

    htmlEl.setAttribute('data-theme', savedTheme);
    themeSelect.value = savedTheme;

    if (savedMode !== 'auto') {
        htmlEl.setAttribute('data-mode', savedMode);
        updateModeIcon(savedMode);
    }

    // 2. Handle Theme Change
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        htmlEl.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // 3. Handle Mode Toggle (Cycle: auto -> dark -> light)
    modeToggle.addEventListener('click', () => {
        const currentMode = htmlEl.getAttribute('data-mode');
        let nextMode;

        if (!currentMode) {
            nextMode = 'dark'; // From auto to dark
        } else if (currentMode === 'dark') {
            nextMode = 'light';
        } else {
            nextMode = 'dark'; // Toggle between dark/light
        }

        htmlEl.setAttribute('data-mode', nextMode);
        localStorage.setItem('mode', nextMode);
        updateModeIcon(nextMode);
    });

    function updateModeIcon(mode) {
        // Nerd Font Icons: 󰖨 is Sun, 󰖔 is Moon
        modeIcon.innerText = mode === 'light' ? '󰖨' : '󰖔';
    }
}

function startUptimeCounter() {
    const counterEl = document.getElementById('uptime-counter');
    const startTime = Date.now();

    setInterval(() => {
        const delta = Date.now() - startTime;
        const h = Math.floor(delta / 3600000).toString().padStart(2, '0');
        const m = Math.floor((delta % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((delta % 60000) / 1000).toString().padStart(2, '0');
        counterEl.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

// Ensure this is inside your DOMContentLoaded listener:
document.addEventListener('DOMContentLoaded', () => {
    initGitHubData();
    setupSidebar();
    setupDiscordCopy();
    setupThemeSystem();
    startUptimeCounter();
});