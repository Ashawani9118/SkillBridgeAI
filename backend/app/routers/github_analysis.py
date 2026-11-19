from urllib.parse import quote

import requests
from fastapi import APIRouter, HTTPException


router = APIRouter(
    prefix="/github",
    tags=["GitHub Analysis"],
)

GITHUB_API = "https://api.github.com"

GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "SkillBridgeAI",
}


def github_request(url: str):
    try:
        response = requests.get(
            url,
            headers=GITHUB_HEADERS,
            timeout=20,
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="The GitHub API request timed out. Please try again.",
        )
    except requests.exceptions.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Unable to connect to GitHub. Please try again.",
        )

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail="GitHub user not found.",
        )

    if response.status_code == 403:
        raise HTTPException(
            status_code=429,
            detail="GitHub API rate limit reached. Please try again later.",
        )

    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API request failed (HTTP {response.status_code}).",
        )

    try:
        return response.json()
    except ValueError:
        raise HTTPException(
            status_code=502,
            detail="GitHub returned an invalid response.",
        )


def calculate_project_level(profile: dict, repos: list):
    non_fork_repos = [
        repo for repo in repos if not repo.get("fork", False)
    ]

    total_repos = len(non_fork_repos)

    total_stars = sum(
        repo.get("stargazers_count") or 0
        for repo in non_fork_repos
    )

    total_forks = sum(
        repo.get("forks_count") or 0
        for repo in non_fork_repos
    )

    languages = list(dict.fromkeys(
        repo.get("language")
        for repo in non_fork_repos
        if repo.get("language")
    ))

    score = 0

    if total_repos >= 3:
        score += 20
    if total_repos >= 6:
        score += 15
    if total_repos >= 10:
        score += 15

    if total_stars >= 5:
        score += 10
    if total_stars >= 20:
        score += 10

    if total_forks >= 3:
        score += 5

    if len(languages) >= 2:
        score += 10
    if len(languages) >= 4:
        score += 10

    if (profile.get("followers") or 0) >= 10:
        score += 5

    if score >= 75:
        level = "Advanced"
        description = (
            "Your public GitHub profile shows strong project activity "
            "and technology diversity."
        )
    elif score >= 45:
        level = "Intermediate"
        description = (
            "Your public GitHub profile shows consistent project work "
            "and developing technical breadth."
        )
    else:
        level = "Beginner"
        description = (
            "Your public GitHub profile shows an early-stage project "
            "portfolio with room to build more projects."
        )

    return {
        "level": level,
        "score": score,
        "description": description,
    }


def generate_project_suggestions(languages: list, repos: list):
    suggestions = []

    language_set = {
        language.lower()
        for language in languages
    }

    repo_text = " ".join(
        f"{repo.get('name', '')} "
        f"{repo.get('description') or ''} "
        f"{repo.get('language') or ''}"
        for repo in repos
    ).lower()

    if (
        "python" in language_set
        or "machine learning" in repo_text
        or "data science" in repo_text
    ):
        suggestions.append({
            "title": "AI Career Recommendation System",
            "description": (
                "Build an AI-based system that recommends career paths "
                "based on skills, interests and project history."
            ),
            "technology": "Python, Machine Learning, Pandas, Scikit-learn",
        })

    if (
        "javascript" in language_set
        or "typescript" in language_set
        or "react" in language_set
    ):
        suggestions.append({
            "title": "AI-Powered Developer Dashboard",
            "description": (
                "Create a dashboard that analyzes GitHub activity and "
                "presents developer skills, projects and progress."
            ),
            "technology": "React, JavaScript, Node.js, REST API",
        })

    if "java" in language_set:
        suggestions.append({
            "title": "Student Management System",
            "description": (
                "Build a complete student management application with "
                "authentication, database operations and reporting."
            ),
            "technology": "Java, Spring Boot, MySQL",
        })

    if "sql" in language_set or "database" in repo_text:
        suggestions.append({
            "title": "Data Analytics Dashboard",
            "description": (
                "Build a dashboard that converts database records into "
                "useful charts, reports and insights."
            ),
            "technology": "SQL, Python, Pandas, Power BI",
        })

    if not suggestions:
        suggestions.extend([
            {
                "title": "Personal Portfolio Website",
                "description": (
                    "Create a professional portfolio showing your "
                    "projects, skills, education and achievements."
                ),
                "technology": "HTML, CSS, JavaScript",
            },
            {
                "title": "Task Management Application",
                "description": (
                    "Build a full-stack application for creating, "
                    "updating and tracking personal tasks."
                ),
                "technology": "React, Node.js, Express",
            },
            {
                "title": "AI Resume Analyzer",
                "description": (
                    "Build a tool that analyzes resumes and identifies "
                    "skills, missing keywords and suitable career roles."
                ),
                "technology": "Python, NLP, Machine Learning",
            },
        ])

    return suggestions[:3]


@router.get("/analyze/{username}")
def analyze_github_profile(username: str):
    clean_username = username.strip()

    if not clean_username:
        raise HTTPException(
            status_code=400,
            detail="GitHub username is required.",
        )

    encoded_username = quote(clean_username, safe="")

    profile = github_request(
        f"{GITHUB_API}/users/{encoded_username}"
    )

    repos = github_request(
        f"{GITHUB_API}/users/{encoded_username}/repos"
        "?per_page=100&sort=updated"
    )

    if not isinstance(profile, dict) or not isinstance(repos, list):
        raise HTTPException(
            status_code=502,
            detail="GitHub returned an unexpected response.",
        )

    non_fork_repos = [
        repo for repo in repos if not repo.get("fork", False)
    ]

    languages = list(dict.fromkeys(
        repo.get("language")
        for repo in non_fork_repos
        if repo.get("language")
    ))

    existing_projects = [
        {
            "name": repo.get("name") or "Unnamed project",
            "description": (
                repo.get("description") or "No project description available."
            ),
            "language": repo.get("language") or "Not specified",
            "stars": repo.get("stargazers_count") or 0,
            "forks": repo.get("forks_count") or 0,
            "url": repo.get("html_url") or "",
            "updatedAt": repo.get("updated_at"),
        }
        for repo in non_fork_repos[:10]
    ]

    project_level = calculate_project_level(profile, repos)
    project_suggestions = generate_project_suggestions(languages, repos)

    data = {
        "profile": {
            "username": profile.get("login") or clean_username,
            "name": profile.get("name") or profile.get("login") or clean_username,
            "avatar": profile.get("avatar_url") or "",
            "bio": profile.get("bio") or "",
            "location": profile.get("location") or "",
            "publicRepos": profile.get("public_repos") or 0,
            "followers": profile.get("followers") or 0,
            "following": profile.get("following") or 0,
            "profileUrl": profile.get("html_url") or "",
        },
        "skills": languages,
        "projectLevel": project_level,
        "existingProjects": existing_projects,
        "projectSuggestions": project_suggestions,
        "summary": {
            "totalProjects": len(non_fork_repos),
            "technologies": len(languages),
            "totalStars": sum(
                repo.get("stargazers_count") or 0
                for repo in non_fork_repos
            ),
        },
    }

    return {
        "success": True,
        "data": data,
    }