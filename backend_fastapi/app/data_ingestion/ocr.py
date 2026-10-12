import asyncio
import io
import re
from typing import Union, List, Optional
from PIL import Image, ImageEnhance
import pytesseract
import pymupdf

def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """
    Standard image preprocessing for OCR:
    - Convert to RGB / Grayscale
    - Slight contrast enhancement to sharpen text against noisy backgrounds
    """
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")
    
    gray = image.convert("L")
    enhancer = ImageEnhance.Contrast(gray)
    enhanced = enhancer.enhance(1.8)
    return enhanced

def _extract_text_sync(image_input: Union[str, bytes, Image.Image], lang: str = "eng") -> str:
    """
    Synchronous OCR extraction using Tesseract.
    """
    try:
        if isinstance(image_input, str):
            img = Image.open(image_input)
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            img = image_input
        else:
            return ""

        processed = preprocess_image_for_ocr(img)
        config = "--oem 1 --psm 3"
        raw_text = pytesseract.image_to_string(processed, lang=lang, config=config) or ""
        
        cleaned = re.sub(r'[ \t]+', ' ', raw_text)
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()
        return cleaned
    except Exception as e:
        print(f"⚠️ [OCR Error] Tesseract extraction failed: {e}")
        return ""

async def extract_text_from_image_async(
    image_input: Union[str, bytes, Image.Image],
    lang: str = "eng"
) -> str:
    """
    Non-blocking async wrapper for Tesseract OCR.
    """
    return await asyncio.to_thread(_extract_text_sync, image_input, lang)

async def ocr_pymupdf_page_async(
    page: pymupdf.Page,
    dpi: int = 200,
    lang: str = "eng"
) -> str:
    """
    Renders a PyMuPDF page to an in-memory pixmap and extracts text via Tesseract OCR.
    """
    try:
        pix = page.get_pixmap(dpi=dpi)
        img_bytes = pix.tobytes("png")
        return await extract_text_from_image_async(img_bytes, lang=lang)
    except Exception as e:
        print(f"⚠️ [OCR Error] Failed to OCR PDF page: {e}")
        return ""

async def extract_and_ocr_embedded_images(
    page: pymupdf.Page,
    doc: pymupdf.Document,
    min_dimension: int = 120,
    lang: str = "eng"
) -> List[str]:
    """
    Extracts embedded raster images on a page and runs OCR on qualifying images.
    """
    extracted_texts = []
    try:
        images = page.get_images(full=True)
        for img_info in images:
            xref = img_info[0]
            try:
                base_img = doc.extract_image(xref)
                if not base_img:
                    continue

                width = base_img.get("width", 0)
                height = base_img.get("height", 0)
                
                if width < min_dimension or height < min_dimension:
                    continue

                image_bytes = base_img.get("image")
                if not image_bytes:
                    continue

                text = await extract_text_from_image_async(image_bytes, lang=lang)
                if text and len(text.strip()) >= 15:
                    extracted_texts.append(text.strip())
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️ [OCR Error] Failed to extract embedded images: {e}")

    return extracted_texts
