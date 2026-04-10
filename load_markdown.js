// Add these variables at the top of load_markdown.js
const GITHUB_USERNAME = "Evilpasture";
const REPO_NAME = "evilpasture.github.io"; // Change this if your repo name is different

async function fetchLastCommitInfo(file) {
    const authorContainer = document.getElementById('author-container');
    const filePath = `logs/${file}.md`;

    try {
        // Fetch commit history for this specific file
        const response = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?path=${filePath}&per_page=1`);

        if (!response.ok) throw new Error("API Limit or Repo not found");

        const commits = await response.json();

        if (commits.length > 0) {
            const lastCommit = commits[0];
            const author = lastCommit.author;
            const commitDetails = lastCommit.commit.author;

            const date = new Date(commitDetails.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Wrap the whole content in an <a> tag
            authorContainer.innerHTML = `
                <a href="${author.html_url}" target="_blank" rel="noopener" class="author-link">
                    <img src="${author.avatar_url}" class="author-avatar" alt="Avatar">
                    <div class="author-info">
                        <span class="author-name">${author.login} 󰓈</span>
                        <span class="commit-date">Last updated: ${date}</span>
                    </div>
                </a>
            `;
        }
    } catch (err) {
        console.error("Failed to fetch author:", err);
        // Clear skeleton and show fallback
        authorContainer.innerHTML = `<span class="author-name">${GITHUB_USERNAME}</span>`;
    }
}

// Update your existing loadMarkdown function to call this
async function loadMarkdown() {
    const params = new URLSearchParams(window.location.search);
    const file = params.get('file');
    const contentDiv = document.getElementById('content');

    if (!file) {
        contentDiv.innerHTML = "<h1>Log not found</h1>";
        return;
    }

    fetchLastCommitInfo(file);

    try {
        const response = await fetch(`logs/${file}.md`);
        if (!response.ok) throw new Error("File not found");

        const markdown = await response.text();

        // 1. Render Markdown
        contentDiv.innerHTML = marked.parse(markdown);

        // 2. TRIGGER HIGHLIGHTING
        // We use highlightAllUnder to ensure Prism looks inside the #content div
        if (window.Prism) {
            Prism.highlightAllUnder(contentDiv);
        }

        const firstH1 = contentDiv.querySelector('h1');
        if (firstH1) document.title = firstH1.innerText + " | Evilpasture";

    } catch (err) {
        contentDiv.innerHTML = `<h1>Error</h1><p>${err.message}</p>`;
    }
}

loadMarkdown();