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

# Since you're targeting 3.14, let's log the version for your Action logs
print(f"Running on Python version: {sys.version}")

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
        
        # 3. Merged PRs (External)
        prs_search = get_json(f"https://api.github.com/search/issues?q=author:{USERNAME}+type:pr+is:merged+-user:{USERNAME}&per_page=5")
        
        # 4. Repo Stars
        repos = get_json(f"https://api.github.com/users/{USERNAME}/repos?per_page=100")

        data: GitHubData = {
            "stats": {
                "commits": commits.get('total_count', 0),
                "repos": user.get('public_repos', 0),
                "followers": user.get('followers', 0),
                "since": user.get('created_at', "2024")[:4]
            },
            "prs": [
                {
                    "title": pr['title'],
                    "url": pr['html_url'],
                    "repo": "/".join(pr['repository_url'].split('/')[-2:])
                } for pr in prs_search.get('items', [])
            ],
            "stars": {repo['name'].lower(): repo['stargazers_count'] for repo in repos}
        }

        with open('data.json', 'w') as f:
            json.dump(data, f, indent=4)
            
        print("Successfully updated data.json")

    except Exception as e:
        print(f"Error fetching data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()