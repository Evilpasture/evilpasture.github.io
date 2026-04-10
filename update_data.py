import requests
import json
import os
import sys
from typing import TypedDict

class Stats(TypedDict):
    commits: int
    repos: int
    followers: int
    since: str

class PR(TypedDict):
    title: str
    url: str
    repo: str

class GitHubData(TypedDict):
    stats: Stats
    prs: list[PR]
    stars: dict[str, int]
    projects: dict[str, dict[str, str | list[str]]]

# --- PROJECT CONFIGURATION ---
# Add your projects here. The key must match the GitHub repo name.
PROJECT_CONFIG: dict[str, dict[str, str | list[str]]] = {
    "culverin": {
        "title": "Culverin",
        "desc": "Python wrapper for Jolt Physics. Optimizing for free-threaded Python 3.14 environments.",
        "tech": ["C++23", "Python", "SIMD"]
    },
    "hypergl": {
        "title": "HyperGL",
        "desc": "Custom OpenGL-based rendering engine and performance heatmap analyzer.",
        "tech": ["OpenGL", "C++", "GLSL"]
    },
    "mag-mutex": {
        "title": "MagMutex",
        "desc": "A custom mutex 1 byte in size, inspired by PyMutex and WTF::Lock with the locking model.",
        "tech": ["C23", "Atomics", "Locking"]
    }
}

USERNAME = "Evilpasture"
TOKEN = os.getenv("GH_TOKEN")
HEADERS = {"Authorization": f"token {TOKEN}"} if TOKEN else {}

def get_json(url: str):
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

def main():
    try:
        # 1. User Stats
        user = get_json(f"https://api.github.com/users/{USERNAME}")
        
        # 2. Total Commits
        commits = get_json(f"https://api.github.com/search/commits?q=author:{USERNAME}")
        
        # 3. Merged PRs
        prs_search = get_json(f"https://api.github.com/search/issues?q=author:{USERNAME}+type:pr+is:merged+-user:{USERNAME}&per_page=5")
        
        # 4. Repo Data
        repos = get_json(f"https://api.github.com/users/{USERNAME}/repos?per_page=100")

        # Build Project Data Map
        project_map: dict[str, dict[str, str | list[str]]] = {}
        for repo in repos:
            name = repo['name'].lower()
            if name in PROJECT_CONFIG:
                project_map[name] = {
                    **PROJECT_CONFIG[name], # Spread title, desc, tech
                    "stars": repo['stargazers_count'],
                    "link": repo['html_url']
                }

        data: GitHubData = {
            "stats": {
                "commits": commits.get('total_count', 0),
                "repos": user.get('public_repos', 0),
                "followers": user.get('followers', 0),
                "since": user.get('created_at', "2025-01-01T00:00:00Z")
            },
            "prs": [
                {
                    "title": pr['title'],
                    "url": pr['html_url'],
                    "repo": "/".join(pr['repository_url'].split('/')[-2:])
                } for pr in prs_search.get('items', [])
            ],
            "stars": {repo['name'].lower(): repo['stargazers_count'] for repo in repos},
            "projects": project_map # New key for the modal previews
        }

        with open('data.json', 'w') as f:
            json.dump(data, f, indent=4)
            
        print("Successfully updated data.json with project metadata.")

    except Exception as e:
        print(f"Error fetching data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()