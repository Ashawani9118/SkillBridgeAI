import requests
import sys
from pathlib import Path


# =========================================================
# CONFIGURATION
# =========================================================

BASE_URL = "http://127.0.0.1:8000"

TEST_EMAIL = "skillbridge.test@example.com"
TEST_PASSWORD = "Test@12345"

RESUME_FILENAME = "Aditya_Clickable_Resume (1).pdf"


# =========================================================
# FIND RESUME AUTOMATICALLY
# =========================================================

def find_resume():
    """
    Search common locations for the resume PDF.
    """

    user_home = Path.home()

    possible_locations = [
        user_home / "Downloads",
        user_home / "Desktop",
        user_home / "OneDrive" / "Desktop",
        Path.cwd(),
        Path.cwd().parent,
    ]

    # First check exact common locations
    for folder in possible_locations:

        file_path = folder / RESUME_FILENAME

        if file_path.exists():
            return file_path

    # Search recursively in common folders
    for folder in possible_locations:

        if not folder.exists():
            continue

        try:
            for file_path in folder.rglob(RESUME_FILENAME):

                if file_path.is_file():
                    return file_path

        except (PermissionError, OSError):
            continue

    return None


# =========================================================
# RESULT HELPER
# =========================================================

def print_result(name, passed, details=""):

    if passed:
        print(f"✅ {name:<32} PASS")
    else:
        print(f"❌ {name:<32} FAIL {details}")


# =========================================================
# START
# =========================================================

print()
print("==============================================")
print("     SkillBridgeAI FastAPI Test Suite")
print("==============================================")
print()


# =========================================================
# 1. TEST SERVER
# =========================================================

try:

    response = requests.get(
        BASE_URL + "/",
        timeout=10
    )

    print_result(
        "GET /",
        response.status_code == 200,
        f"- Status {response.status_code}"
        if response.status_code != 200
        else ""
    )

except requests.RequestException as exc:

    print_result(
        "GET /",
        False,
        f"- {exc}"
    )

    print()
    print("❌ FastAPI server is not reachable.")
    print("Start backend with:")
    print()
    print("python -m uvicorn main:app --reload")
    print()

    sys.exit(1)


# =========================================================
# 2. LOGIN
# =========================================================

try:

    response = requests.post(
        BASE_URL + "/auth/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD,
        },
        timeout=10
    )

    if response.status_code == 200:

        login_data = response.json()

        token = login_data.get("access_token")

        print_result(
            "POST /auth/login",
            bool(token)
        )

    else:

        token = None

        print_result(
            "POST /auth/login",
            False,
            f"- Status {response.status_code}"
        )

except requests.RequestException as exc:

    token = None

    print_result(
        "POST /auth/login",
        False,
        f"- {exc}"
    )


# =========================================================
# STOP IF LOGIN FAILED
# =========================================================

if not token:

    print()
    print("❌ Login failed.")
    print("Protected API tests cannot continue.")
    print()

    sys.exit(1)


# =========================================================
# AUTHORIZATION HEADER
# =========================================================

headers = {
    "Authorization": f"Bearer {token}"
}


# =========================================================
# 3. PROFILE
# =========================================================

try:

    response = requests.get(
        BASE_URL + "/profile/",
        headers=headers,
        timeout=10
    )

    print_result(
        "GET /profile/",
        response.status_code == 200,
        f"- Status {response.status_code}"
        if response.status_code != 200
        else ""
    )

except requests.RequestException as exc:

    print_result(
        "GET /profile/",
        False,
        f"- {exc}"
    )


# =========================================================
# 4. ALL SKILLS
# =========================================================

try:

    response = requests.get(
        BASE_URL + "/skills/",
        headers=headers,
        timeout=10
    )

    print_result(
        "GET /skills/",
        response.status_code == 200,
        f"- Status {response.status_code}"
        if response.status_code != 200
        else ""
    )

except requests.RequestException as exc:

    print_result(
        "GET /skills/",
        False,
        f"- {exc}"
    )


# =========================================================
# 5. MY SKILLS
# =========================================================

try:

    response = requests.get(
        BASE_URL + "/skills/my",
        headers=headers,
        timeout=10
    )

    if response.status_code == 200:

        skills = response.json()

        print_result(
            "GET /skills/my",
            isinstance(skills, list)
        )

        print(f"    Skills found: {len(skills)}")

    else:

        print_result(
            "GET /skills/my",
            False,
            f"- Status {response.status_code}"
        )

except requests.RequestException as exc:

    print_result(
        "GET /skills/my",
        False,
        f"- {exc}"
    )


# =========================================================
# 6. DASHBOARD
# =========================================================

try:

    response = requests.get(
        BASE_URL + "/dashboard/",
        headers=headers,
        timeout=10
    )

    if response.status_code == 200:

        dashboard = response.json()

        valid_dashboard = (
            "user" in dashboard
            and "profile" in dashboard
            and "skill_count" in dashboard
            and "skills" in dashboard
        )

        print_result(
            "GET /dashboard/",
            valid_dashboard
        )

        if valid_dashboard:
            print(
                f"    User: {dashboard['user'].get('name', 'Unknown')}"
            )

            print(
                f"    Skill count: {dashboard.get('skill_count', 0)}"
            )

    else:

        print_result(
            "GET /dashboard/",
            False,
            f"- Status {response.status_code}"
        )

except requests.RequestException as exc:

    print_result(
        "GET /dashboard/",
        False,
        f"- {exc}"
    )


# =========================================================
# 7. SKILL ANALYZER
# =========================================================

try:

    response = requests.get(
        BASE_URL + "/skill-analyzer/analyze",
        headers=headers,
        params={
            "career": "Python Developer"
        },
        timeout=30
    )

    if response.status_code == 200:

        analyzer_data = response.json()

        print_result(
            "GET /skill-analyzer/analyze",
            isinstance(analyzer_data, dict)
        )

        # Print match if available
        if isinstance(analyzer_data, dict):

            if "skill_match_percentage" in analyzer_data:

                print(
                    "    Match: "
                    f"{analyzer_data['skill_match_percentage']}%"
                )

    else:

        print_result(
            "GET /skill-analyzer/analyze",
            False,
            f"- Status {response.status_code}"
        )

except requests.RequestException as exc:

    print_result(
        "GET /skill-analyzer/analyze",
        False,
        f"- {exc}"
    )


# =========================================================
# 8. FIND RESUME
# =========================================================

resume_path = find_resume()

if resume_path:

    print()
    print(f"📄 Resume found:")
    print(f"   {resume_path}")
    print()

else:

    print()
    print("⚠️ Resume PDF was not found automatically.")
    print(f"   Expected filename: {RESUME_FILENAME}")
    print()


# =========================================================
# 9. RESUME ANALYZER
# =========================================================

if resume_path:

    try:

        with open(
            resume_path,
            "rb"
        ) as resume_file:

            response = requests.post(
                BASE_URL + "/resume/analyze",
                headers=headers,
                files={
                    "file": (
                        resume_path.name,
                        resume_file,
                        "application/pdf"
                    )
                },
                timeout=180
            )

        if response.status_code == 200:

            resume_data = response.json()

            valid_resume = (
                "filename" in resume_data
                and "analysis" in resume_data
                and bool(
                    resume_data.get("analysis", "").strip()
                )
            )

            print_result(
                "POST /resume/analyze",
                valid_resume
            )

            if valid_resume:

                analysis = resume_data["analysis"]

                print()
                print("    AI Resume Analysis:")
                print("    --------------------")
                print(analysis[:1000])

                if len(analysis) > 1000:
                    print("    ...")

        else:

            print_result(
                "POST /resume/analyze",
                False,
                f"- Status {response.status_code}"
            )

            try:
                print(
                    f"    Error: {response.json()}"
                )

            except ValueError:
                print(
                    f"    Response: {response.text}"
                )

    except requests.RequestException as exc:

        print_result(
            "POST /resume/analyze",
            False,
            f"- {exc}"
        )


# =========================================================
# FINAL
# =========================================================

print()
print("==============================================")
print("              TEST COMPLETE")
print("==============================================")
print()
