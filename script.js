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
    const themeSelect = document.getElementById('themeSelect');
    const modeToggle = document.getElementById('modeToggle');
    const modeIcon = document.getElementById('modeIcon');
    const htmlEl = document.documentElement;

    if (themeSelect) {
        themeSelect.value = localStorage.getItem('theme') || 'default';
        themeSelect.addEventListener('change', (e) => {
            htmlEl.setAttribute('data-theme', e.target.value);
            localStorage.setItem('theme', e.target.value);
        });
    }

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