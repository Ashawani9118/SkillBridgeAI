```python
import requests
import pytesseract
import fitz  # PyMuPDF

from io import BytesIO
from PIL import Image

from fastapi import APIRouter, UploadFile, File, HTTPException
from pypdf import PdfReader


# Windows Tesseract OCR executable
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


router = APIRouter(
    prefix="/resume",
    tags=["Resume Analyzer"]
)


def extract_text_from_pdf(file_data: bytes) -> str:
    """
    Extract readable text from a PDF.

    First, normal PDF text extraction is attempted.
    If no text is found, OCR is used as a fallback.
    """

    # --------------------------------------------------
    # 1. Normal PDF text extraction
    # --------------------------------------------------
    try:
        reader = PdfReader(BytesIO(file_data))

        text = ""

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

        if text.strip():
            return text.strip()

    except Exception as exc:
        print(f"PDF text extraction error: {exc}")

    # --------------------------------------------------
    # 2. OCR fallback
    # --------------------------------------------------
    try:
        pdf_document = fitz.open(
            stream=file_data,
            filetype="pdf"
        )

        ocr_text = ""

        for page in pdf_document:

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
                ocr_text += page_text + "\n"

        pdf_document.close()

        return ocr_text.strip()

    except Exception as exc:
        print(f"OCR error: {exc}")
        return ""


@router.post("/analyze")
async def analyze_resume(
    file: UploadFile = File(...)
):
    # --------------------------------------------------
    # 1. Validate file
    # --------------------------------------------------
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed"
        )

    # --------------------------------------------------
    # 2. Read uploaded file
    # --------------------------------------------------
    file_data = await file.read()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    # --------------------------------------------------
    # 3. Extract resume text
    # --------------------------------------------------
    text = extract_text_from_pdf(file_data)

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from the resume"
        )

    # --------------------------------------------------
    # 4. Limit input size
    # --------------------------------------------------
    text = text[:15000]

    # --------------------------------------------------
    # 5. Resume analysis prompt
    # --------------------------------------------------
    prompt = f"""
You are a professional resume analysis assistant for SkillBridgeAI.

Analyze this student's resume.

Return these sections:

1. Candidate Name
2. Education
3. Skills
4. Certifications
5. Strengths
6. Recommended Skills
7. Short Career Suggestion

Keep the response concise, accurate, and useful for a college student.

Do not mention the underlying model, API, service, or implementation.

Resume:
{text}
"""

    # --------------------------------------------------
    # 6. Generate analysis
    # --------------------------------------------------
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
            raise HTTPException(
                status_code=500,
                detail="Unable to analyze the resume"
            )

        result = response.json()

        analysis = result.get(
            "response",
            ""
        ).strip()

        if not analysis:
            raise HTTPException(
                status_code=500,
                detail="Unable to generate resume analysis"
            )

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=500,
            detail="Resume analysis service is unavailable"
        )

    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=500,
            detail="Resume analysis timed out"
        )

    except requests.exceptions.RequestException:
        raise HTTPException(
            status_code=500,
            detail="Could not process the resume"
        )

    # --------------------------------------------------
    # 7. Return result
    # --------------------------------------------------
    return {
        "filename": file.filename,
        "analysis": analysis
    }
```
