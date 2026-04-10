import requests
import json
import os
import sys
from typing import TypedDict, Any

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
        "tech": ["C23", "C++23", "Python", "SIMD"]
    },
    "hypergl": {
        "title": "HyperGL",
        "desc": "Custom OpenGL-based rendering engine and performance heatmap analyzer.",
        "tech": ["OpenGL", "C", "Python", "GLSL"]
    },
    "mag-mutex": {
        "title": "MagMutex",
        "desc": "A custom mutex 1 byte in size, inspired by PyMutex and WTF::Lock with the locking model.",
        "tech": ["C23", "Atomics", "Locking", "Concurrency"]
    }
}

USERNAME = "Evilpasture"
TOKEN = os.getenv("GH_TOKEN")
HEADERS = {"Authorization": f"token {TOKEN}"} if TOKEN else {}
# Toggle this to True to use 'mock_data.json' instead of live API calls
USE_MOCK = os.getenv("USE_MOCK", "false").lower() == "true" 

def get_safe(session: requests.Session, url: str, default: Any = None):
    """Fetches JSON, returns default if request fails."""
    try:
        response = session.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Warning: Failed to fetch {url}. Error: {e}")
        return default

def get_json(url: str):
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

def main():
    if USE_MOCK:
        print("--- RUNNING IN MOCK MODE ---")
        if os.path.exists('mock_data.json'):
            with open('mock_data.json', 'r') as f:
                data = json.load(f)
                with open('data.json', 'w') as out:
                    json.dump(data, out, indent=4)
            return
        else:
            print("Error: mock_data.json not found.")
            sys.exit(1)

    session = requests.Session()
    if TOKEN:
        session.headers.update({"Authorization": f"token {TOKEN}"})

    # 1. Fetch data with graceful failure
    user = get_safe(session, f"https://api.github.com/users/{USERNAME}", {})
    commits = get_safe(session, f"https://api.github.com/search/commits?q=author:{USERNAME}", {"total_count": 0})
    prs_search = get_safe(session, f"https://api.github.com/search/issues?q=author:{USERNAME}+type:pr+is:merged+-user:{USERNAME}&per_page=5", {"items": []})
    repos = get_safe(session, f"https://api.github.com/users/{USERNAME}/repos?per_page=100", [])

    # 2. Process data
    project_map = {}
    for repo in repos:
        name = repo.get('name', '').lower()
        if name in PROJECT_CONFIG:
            project_map[name] = {
                **PROJECT_CONFIG[name],
                "stars": repo.get('stargazers_count', 0),
                "link": repo.get('html_url', '')
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
                "title": pr.get('title', 'Unknown'),
                "url": pr.get('html_url', '#'),
                "repo": "/".join(pr.get('repository_url', '').split('/')[-2:])
            } for pr in prs_search.get('items', [])
        ],
        "stars": {r.get('name', '').lower(): r.get('stargazers_count', 0) for r in repos},
        "projects": project_map
    }

    with open('data.json', 'w') as f:
        json.dump(data, f, indent=4)
    print("Successfully updated data.json")

if __name__ == "__main__":
    main()