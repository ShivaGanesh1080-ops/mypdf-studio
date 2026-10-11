import os
from typing import Dict, Any
import fitz  # PyMuPDF
from PIL import Image

def run_ocr_on_pdf(file_path: str, language: str = "eng") -> Dict[str, Any]:
    """
    Performs OCR on PDF pages. Attempts PyMuPDF OCR / pytesseract.
    If Tesseract binary is not installed on the system, gracefully falls back
    to deep text extraction and provides a clear notice.
    """
    doc = fitz.open(file_path)
    total_pages = len(doc)
    extracted_pages = []
    ocr_used = False
    
    # Try pytesseract if available
    pytesseract_available = False
    try:
        import pytesseract
        # Quick check if tesseract is accessible
        pytesseract.get_tesseract_version()
        pytesseract_available = True
    except Exception:
        pytesseract_available = False
        
    for i, page in enumerate(doc):
        # 1. First check if page already has embedded selectable text
        regular_text = page.get_text("text").strip()
        
        page_content = ""
        method_used = "direct_text"
        
        if regular_text and len(regular_text) > 30:
            page_content = regular_text
        elif pytesseract_available:
            try:
                import pytesseract
                pix = page.get_pixmap(dpi=200)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                page_content = pytesseract.image_to_string(img, lang=language)
                ocr_used = True
                method_used = "tesseract_ocr"
            except Exception as e:
                page_content = regular_text or f"[OCR failed on page {i+1}: {str(e)}]"
        else:
            # Fallback to standard text extraction
            page_content = regular_text or "[Scanned image detected. Install Tesseract OCR on Windows for scanned-only documents.]"
            
        extracted_pages.append({
            "pageNumber": i + 1,
            "method": method_used,
            "text": page_content
        })
        
    doc.close()
    
    full_text = "\n\n".join([f"=== PAGE {p['pageNumber']} ===\n{p['text']}" for p in extracted_pages])
    word_count = len(full_text.split())
    
    return {
        "totalPages": total_pages,
        "ocrEngineUsed": ocr_used,
        "tesseractDetected": pytesseract_available,
        "wordCount": word_count,
        "fullText": full_text,
        "pages": extracted_pages
    }
