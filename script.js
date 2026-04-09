/**
 * Fetches the 5 most recent merged PRs by Evilpasture 
 * in repositories that they do not own.
 */
async function fetchMergedPRs() {
    const username = 'Evilpasture';
    const container = document.getElementById('pr-container');
    const list = document.getElementById('pr-list');
    
    // GitHub API Search Query: 
    // author:Evilpasture (you wrote it)
    // type:pr (it's a pull request)
    // is:merged (it was accepted)
    // -user:Evilpasture (not in your own repos)
    const url = `https://api.github.com/search/issues?q=author:${username}+type:pr+is:merged+-user:${username}&per_page=5`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('GitHub API request failed');
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            // Remove the loading text
            const loadingText = container.querySelector('.loading-text');
            if (loadingText) loadingText.remove();

            data.items.forEach(pr => {
                // Extract "owner/repo" from the repository_url
                const repoName = pr.repository_url.split('/').slice(-2).join('/');
                
                const li = document.createElement('li');
                li.className = 'pr-item';
                li.innerHTML = `
                    <a href="${pr.html_url}" target="_blank" rel="noopener noreferrer">${pr.title}</a>
                    <span class="pr-repo">${repoName}</span>
                `;
                list.appendChild(li);
            });
        } else {
            container.innerHTML = '<p class="loading-text">No external merged PRs found.</p>';
        }
    } catch (error) {
        console.error('Error fetching PRs:', error);
        container.innerHTML = '<p class="loading-text">Failed to load contributions.</p>';
    }
}

async function fetchGitHubStats() {
    const username = 'Evilpasture';
    const container = document.getElementById('github-stats-container');

    try {
        // We run both fetches in parallel for better performance
        const [userResponse, commitResponse] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`),
            // The search API counts every commit authored by you across all public repos
            fetch(`https://api.github.com/search/commits?q=author:${username}`)
        ]);

        if (!userResponse.ok || !commitResponse.ok) throw new Error('GitHub API error');
        
        const userData = await userResponse.json();
        const commitData = await commitResponse.json();

        const joinedDate = new Date(userData.created_at).getFullYear();
        const totalCommits = commitData.total_count; // This is the "magic" number
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${totalCommits}</span>
                    <span class="stat-label">Total Commits</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${userData.public_repos}</span>
                    <span class="stat-label">Repositories</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${userData.followers}</span>
                    <span class="stat-label">Followers</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${joinedDate}</span>
                    <span class="stat-label">User Since</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p class="loading-text">Stats currently unavailable</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubStats();
    fetchMergedPRs();
});