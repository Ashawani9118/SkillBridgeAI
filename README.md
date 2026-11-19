# SkillBridge AI

**An AI-powered career development and skill assessment platform.**

SkillBridge AI is a student-focused platform designed to help users understand their skills, identify career opportunities, analyze skill gaps, and build personalized learning roadmaps.

## Features

- **User Authentication:** Secure registration and login.
- **Personalized Dashboard:** View career and learning information in one place.
- **Career Analysis:** Explore suitable career paths.
- **Skill Gap Analysis:** Identify skills that need improvement.
- **Learning Roadmap:** Follow a structured learning journey.
- **Resume Analysis:** Upload and analyze resumes.
- **GitHub Analysis:** Analyze GitHub profiles and development activity.
- **Progress Tracking:** Monitor learning progress.
- **Profile Management:** Manage personal profile information.

## Technology Stack

### Frontend
- React 19
- Vite
- JavaScript
- React Router
- CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT Authentication

### Testing and Tools
- Playwright
- ESLint
- Git and GitHub
- Tesseract OCR

## Project Structure

```text
SkillBridgeAI/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── routers/
│   │   └── schemas/
│   ├── main.py
│   ├── create_tables.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── utils/
│   ├── tests/
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

## Requirements

Before running the project, install:

- Python 3.10 or later
- Node.js and npm
- PostgreSQL
- Git
- Tesseract OCR (for OCR-based resume processing)

## Installation and Setup

### 1. Clone the Repository

After the project is available on GitHub:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd SkillBridgeAI
```

### 2. Backend Setup

Open PowerShell in the project root:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

Configure the database connection and a secure JWT secret in `backend/.env`.

Start the backend:

```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend URL:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Frontend Setup

Open a second terminal:

```powershell
cd frontend
npm install
```

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

Set the backend API URL in `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```powershell
npm run dev
```

Frontend URL:

`http://localhost:5173`

## Testing

### Run ESLint

```powershell
cd frontend
npm run lint
```

### Create Production Build

```powershell
npm run build
```

### Run Playwright Tests

```powershell
npx playwright install chromium
npx playwright test
```

## Security

- Environment files containing credentials must never be committed.
- Keep database passwords and JWT secrets private.
- Use `.env.example` to document required environment variables.
- Protected API endpoints require authentication.
- Resume uploads include file validation and size restrictions.

## Project Status

SkillBridge AI is an academic team project under active development. Features and implementation may evolve as development continues.

## Contributors

Developed as a student team project.

## License

No open-source license has been specified yet.