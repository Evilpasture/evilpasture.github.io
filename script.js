// Configuration
const STATS_CACHE_KEY = 'github_stats_cache';
const PRS_CACHE_KEY = 'github_prs_cache';
const CACHE_EXPIRY = 3600000; // 1 hour

/**
 * Generic Cache Helpers
 */
function getCachedData(key) {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
        localStorage.removeItem(key);
        return null;
    }
    return data;
}

function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify({
        timestamp: Date.now(),
        data: data
    }));
}

/**
 * GitHub Stats Logic
 */
async function fetchGitHubStats() {
    const username = 'Evilpasture';
    const container = document.getElementById('github-stats-container');
    if (!container) return;

    // 1. Check Cache
    const cached = getCachedData(STATS_CACHE_KEY);
    if (cached) {
        renderStats(cached);
        return;
    }

    try {
        const [userRes, commitRes] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`),
            fetch(`https://api.github.com/search/commits?q=author:${username}`)
        ]);

        if (userRes.status === 403 || commitRes.status === 403) {
            container.innerHTML = '<p class="loading-text">Rate limit exceeded. Try later!</p>';
            return;
        }

        if (!userRes.ok || !commitRes.ok) throw new Error('API Error');

        const userData = await userRes.json();
        const commitData = await commitRes.json();

        const stats = {
            commits: commitData.total_count,
            repos: userData.public_repos,
            followers: userData.followers,
            since: new Date(userData.created_at).getFullYear()
        };

        setCachedData(STATS_CACHE_KEY, stats);
        renderStats(stats);

    } catch (err) {
        console.error('Stats Error:', err);
        container.innerHTML = '<p class="loading-text">Stats unavailable</p>';
    }
}

function renderStats(data) {
    const container = document.getElementById('github-stats-container');
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-value">${data.commits}</span>
                <span class="stat-label">Commits</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${data.repos}</span>
                <span class="stat-label">Repos</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${data.followers}</span>
                <span class="stat-label">Followers</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${data.since}</span>
                <span class="stat-label">Since</span>
            </div>
        </div>
    `;
}

/**
 * Merged PRs Logic
 */
async function fetchMergedPRs() {
    const username = 'Evilpasture';
    const list = document.getElementById('pr-list');
    const container = document.getElementById('pr-container');
    if (!list) return;

    const cached = getCachedData(PRS_CACHE_KEY);
    if (cached) {
        renderPRs(cached);
        return;
    }

    try {
        const response = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:pr+is:merged+-user:${username}&per_page=5`);

        if (response.status === 403) {
            container.innerHTML = '<p class="loading-text">Rate limit exceeded.</p>';
            return;
        }

        const data = await response.json();
        if (data.items) {
            const prs = data.items.map(pr => ({
                title: pr.title,
                url: pr.html_url,
                repo: pr.repository_url.split('/').slice(-2).join('/')
            }));
            setCachedData(PRS_CACHE_KEY, prs);
            renderPRs(prs);
        }
    } catch (err) {
        console.error('PR Error:', err);
    }
}

function renderPRs(prs) {
    const list = document.getElementById('pr-list');
    const container = document.getElementById('pr-container');
    if (prs.length > 0) {
        const loadingText = container.querySelector('.loading-text');
        if (loadingText) loadingText.remove();
        list.innerHTML = prs.map(pr => `
            <li class="pr-item">
                <a href="${pr.url}" target="_blank" rel="noopener">${pr.title}</a>
                <span class="pr-repo">${pr.repo}</span>
            </li>
        `).join('');
    }
}

/**
 * Discord Copy Logic
 */
function setupDiscordCopy() {
    const handle = document.querySelector('.discord-handle');
    if (!handle) return;

    handle.addEventListener('click', async () => {
        try {
            const textToCopy = handle.getAttribute('data-handle') || handle.innerText.replace('@', '');
            await navigator.clipboard.writeText(textToCopy);

            // Inside your setupDiscordCopy() function, find the text update part:
            const originalText = handle.querySelector('.contact-value').innerText;
            handle.querySelector('.contact-value').innerText = 'Copied!';
            handle.classList.add('copied');

            setTimeout(() => {
                handle.querySelector('.contact-value').innerText = originalText;
                handle.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    });
}

/**
 * Sidebar Toggle Logic
 */
function setupSidebar() {
    const sidebar = document.getElementById('sideNav');
    const overlay = document.getElementById('overlay');
    const openBtn = document.getElementById('sidebarOpen');
    const closeBtn = document.getElementById('sidebarClose');
    const navLinks = document.querySelectorAll('.nav-item');

    const toggleSidebar = (state) => {
        sidebar.classList.toggle('active', state);
        overlay.classList.toggle('active', state);
        // Prevent body scrolling when menu is open
        document.body.style.overflow = state ? 'hidden' : '';
    };

    openBtn.addEventListener('click', () => toggleSidebar(true));
    closeBtn.addEventListener('click', () => toggleSidebar(false));
    overlay.addEventListener('click', () => toggleSidebar(false));

    // Close sidebar when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => toggleSidebar(false));
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggleSidebar(false);
    });
}


document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubStats();
    fetchMergedPRs();
    setupDiscordCopy();
    setupSidebar();
});