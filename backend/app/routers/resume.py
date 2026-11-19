import os
import re
import shutil
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO

import pymupdf as fitz
import pytesseract
import requests
from PIL import Image
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pypdf import PdfReader

from app.core.security import get_current_user_id

import logging

logger = logging.getLogger(__name__)


# Use an explicitly configured OCR executable when provided.
# Otherwise detect Tesseract from PATH (Linux/cloud and Windows).
# Keep the standard Windows installation path as a fallback.
_tesseract_cmd = os.getenv("TESSERACT_CMD")

if not _tesseract_cmd:
    _tesseract_cmd = shutil.which("tesseract")

if not _tesseract_cmd and os.name == "nt":
    _windows_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.isfile(_windows_tesseract):
        _tesseract_cmd = _windows_tesseract

if _tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd

router = APIRouter(
    prefix="/resume",
    tags=["Resume Analyzer"]
)

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_PDF_PAGES = 20
MAX_OCR_PIXELS = 20_000_000
MAX_DOCX_ENTRIES = 2000
MAX_DOCX_UNCOMPRESSED_SIZE = 25 * 1024 * 1024
MAX_DOCX_XML_SIZE = 10 * 1024 * 1024
MAX_DOCX_COMPRESSION_RATIO = 200
WORD_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

SKILLS = [
    "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#",
    "HTML", "CSS", "React", "React.js", "Node.js", "Express",
    "MongoDB", "MySQL", "SQL", "PostgreSQL", "Git", "GitHub",
    "Docker", "AWS", "Azure", "Machine Learning", "Deep Learning",
    "Artificial Intelligence", "Data Science", "Data Analysis",
    "Pandas", "NumPy", "Matplotlib", "Seaborn", "Scikit-learn",
    "TensorFlow", "PyTorch", "NLP", "Power BI", "Tableau", "Excel",
    "Statistics", "Figma", "UI/UX", "REST API", "REST APIs"
]

SECTION_PATTERNS = {
    "contact": [
        "contact", "phone", "mobile", "email", "linkedin", "github"
    ],
    "summary": [
        "summary", "career summary", "professional summary",
        "profile", "objective", "career objective"
    ],
    "education": [
        "education", "academic", "qualification",
        "university", "college", "degree"
    ],
    "experience": [
        "experience", "work experience", "employment",
        "internship", "professional experience"
    ],
    "skills": [
        "skills", "technical skills", "technical knowledge",
        "technologies", "competencies"
    ],
    "projects": [
        "projects", "project", "personal projects", "academic projects"
    ],
    "certifications": [
        "certifications", "certificates", "achievements", "credentials"
    ]
}


def normalize_text(text=""):
    text = text.replace("\u00a0", " ").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def validate_pdf_file(file_data: bytes) -> None:
    document = None

    try:
        document = fitz.open(stream=file_data, filetype="pdf")

        if document.needs_pass:
            raise HTTPException(
                status_code=400,
                detail="Password-protected PDFs are not supported."
            )

        if document.page_count < 1 or document.page_count > MAX_PDF_PAGES:
            raise HTTPException(
                status_code=400,
                detail=f"PDF must contain between 1 and {MAX_PDF_PAGES} pages."
            )

    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("PDF validation failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF is invalid or damaged."
        ) from exc
    finally:
        if document is not None:
            document.close()


def validate_docx_file(file_data: bytes) -> None:
    try:
        with zipfile.ZipFile(BytesIO(file_data)) as document:
            entries = document.infolist()

            if len(entries) > MAX_DOCX_ENTRIES:
                raise HTTPException(
                    status_code=400,
                    detail="DOCX contains too many archive entries."
                )

            total_size = sum(entry.file_size for entry in entries)

            if total_size > MAX_DOCX_UNCOMPRESSED_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="DOCX expanded content exceeds the allowed size."
                )

            for entry in entries:
                if (
                    entry.file_size > 0
                    and (
                        entry.compress_size == 0
                        or entry.file_size / entry.compress_size
                        > MAX_DOCX_COMPRESSION_RATIO
                    )
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="DOCX compression ratio exceeds the allowed limit."
                    )

            try:
                xml_info = document.getinfo("word/document.xml")
            except KeyError as exc:
                raise HTTPException(
                    status_code=400,
                    detail="DOCX document content is missing."
                ) from exc

            if xml_info.file_size > MAX_DOCX_XML_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="DOCX document content exceeds the allowed size."
                )

    except HTTPException:
        raise
    except (zipfile.BadZipFile, OSError, ValueError) as exc:
        logger.warning("DOCX archive validation failed: %s", type(exc).__name__)
        raise HTTPException(
            status_code=400,
            detail="The uploaded DOCX document is invalid or damaged."
        ) from exc


def extract_text_from_pdf(file_data: bytes) -> str:
    try:
        reader = PdfReader(BytesIO(file_data))
        pages = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text)

        text = normalize_text("\n".join(pages))
        if text:
            return text

    except Exception as exc:
        logger.warning("PDF text extraction failed: %s", type(exc).__name__)

    document = None

    try:
        document = fitz.open(stream=file_data, filetype="pdf")
        pages = []

        for page in document:
            width = page.rect.width * 2
            height = page.rect.height * 2

            if (
                width <= 0
                or height <= 0
                or width > 10000
                or height > 10000
                or width * height > MAX_OCR_PIXELS
            ):
                logger.warning("PDF page exceeds OCR pixel limits")
                return ""

            pix = page.get_pixmap(
                matrix=fitz.Matrix(2, 2),
                alpha=False
            )
            image = Image.frombytes(
                "RGB",
                [pix.width, pix.height],
                pix.samples
            )
            page_text = pytesseract.image_to_string(
                image,
                lang="eng"
            )
            if page_text:
                pages.append(page_text)

        return normalize_text("\n".join(pages))

    except Exception as exc:
        logger.warning("PDF OCR failed: %s", type(exc).__name__)
        return ""

    finally:
        if document is not None:
            document.close()


def extract_text_from_docx(file_data: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(file_data)) as document:
            xml_data = document.read("word/document.xml")

        root = ET.fromstring(xml_data)
        paragraphs = []

        for paragraph in root.iter(f"{WORD_NS}p"):
            text_parts = [
                node.text or ""
                for node in paragraph.iter(f"{WORD_NS}t")
            ]
            line = "".join(text_parts).strip()

            if line:
                paragraphs.append(line)

        return normalize_text("\n".join(paragraphs))

    except Exception as exc:
        logger.warning("DOCX extraction failed: %s", type(exc).__name__)
        return ""


def extract_skills(text):
    found = []

    for skill in SKILLS:
        pattern = re.compile(
            r"(^|[^a-zA-Z0-9+#.-])"
            + re.escape(skill)
            + r"(?=$|[^a-zA-Z0-9+#.-])",
            re.IGNORECASE
        )

        if pattern.search(text):
            found.append(skill)

    return list(dict.fromkeys(found))


def detect_sections(text):
    normalized = text.lower()

    sections = {
        section: any(
            keyword.lower() in normalized
            for keyword in keywords
        )
        for section, keywords in SECTION_PATTERNS.items()
    }

    # Detect actual email addresses, even without an "Email" label.
    has_email = re.search(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        text,
        re.IGNORECASE
    ) is not None

    # Detect a 10-digit phone number, including an optional country code.
    has_phone = re.search(
        r"(?<!\d)(?:\+?\d{1,3}[\s().-]+)?(?:\d[\s().-]*){10}(?!\d)",
        text
    ) is not None

    sections["contact"] = (
        sections["contact"] or has_email or has_phone
    )

    return sections

def calculate_score(sections, skill_count):
    score = 0
    weights = {
        "contact": 10,
        "summary": 10,
        "education": 15,
        "experience": 20,
        "skills": 15,
        "projects": 15,
        "certifications": 5
    }

    for section, weight in weights.items():
        if sections.get(section):
            score += weight

    score += min(skill_count, 10)
    return min(score, 100)


def get_score_level(score):
    if score >= 85:
        return "Excellent"
    if score >= 70:
        return "Strong"
    if score >= 50:
        return "Good"
    if score >= 30:
        return "Needs Improvement"
    return "Beginner"


def generate_recommendations(text, sections, skills):
    recommendations = []

    checks = [
        ("summary", "Add a clear professional summary or career objective."),
        ("skills", "Add a dedicated Technical Skills section."),
        ("projects", "Add relevant academic or personal projects with measurable outcomes."),
        ("experience", "Add internship, work experience, or practical experience if available."),
        ("education", "Add a clear Education section with degree and institution details."),
        ("certifications", "Add relevant certifications, courses or achievements.")
    ]

    for section, message in checks:
        if not sections.get(section):
            recommendations.append(message)

    if len(skills) < 5:
        recommendations.append(
            "Highlight more relevant technical skills and tools used in your projects."
        )

    if "linkedin" not in text.lower():
        recommendations.append(
            "Add your LinkedIn profile URL to strengthen your professional presence."
        )

    if "github" not in text.lower():
        recommendations.append(
            "Add your GitHub profile URL to showcase coding projects."
        )

    return recommendations[:8]


def get_ai_analysis(text):
    prompt = f"""
You are a professional resume analysis assistant for SkillBridgeAI.

Analyze this student's resume and return concise, useful findings:
1. Candidate Name
2. Education
3. Skills
4. Certifications
5. Strengths
6. Recommended Skills
7. Short Career Suggestion

Be accurate. Do not invent qualifications or experience.
Do not mention the underlying model, API, service or implementation.

Resume:
{text[:15000]}
"""

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )

        if response.status_code != 200:
            return None

        result = response.json().get("response", "").strip()
        return result or None

    except requests.exceptions.RequestException as exc:
        logger.info("Optional AI resume analysis unavailable: %s", type(exc).__name__)
        return None


@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    filename = file.filename or "resume"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if extension not in {"pdf", "docx"}:
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF or DOCX resume. Legacy DOC files are not supported."
        )

    file_data = await file.read(MAX_FILE_SIZE + 1)

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Resume size must not exceed 10 MB."
        )

    if extension == "pdf":
        if not file_data.startswith(b"%PDF"):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid PDF."
            )
        validate_pdf_file(file_data)
        text = extract_text_from_pdf(file_data)
    else:
        if not file_data.startswith(b"PK"):
            raise HTTPException(
                status_code=400,
                detail="The uploaded file is not a valid DOCX document."
            )
        validate_docx_file(file_data)
        text = extract_text_from_docx(file_data)

    if len(text.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Could not extract enough text. Please try a readable PDF or DOCX resume."
        )

    skills = extract_skills(text)
    sections = detect_sections(text)
    word_count = len(text.split())
    score = calculate_score(sections, len(skills))

    analysis = {
        "success": True,
        "score": score,
        "level": get_score_level(score),
        "wordCount": word_count,
        "skills": skills,
        "skillCount": len(skills),
        "sections": sections,
        "recommendations": generate_recommendations(text, sections, skills),
        "extractedText": text,
        "aiAnalysis": get_ai_analysis(text),
    }

    return {
        "success": True,
        "filename": filename,
        "file": {
            "originalName": filename,
            "size": len(file_data),
            "type": file.content_type or "application/octet-stream",
        },
        "analysis": analysis,
    }
