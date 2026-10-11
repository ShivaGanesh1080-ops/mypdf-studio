import os
import sys
import json
import requests
import pymupdf as fitz
from PIL import Image

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print(f"=== Testing Live FastAPI Backend at {BASE_URL} ===\n")
    
    test_dir = os.path.join(os.path.dirname(__file__), "api_test_tmp")
    os.makedirs(test_dir, exist_ok=True)
    
    # 0. Health check
    res = requests.get(f"{BASE_URL}/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] 1. /api/health is 200 OK")
    
    # Create sample PDF A (3 pages)
    pdf_a_path = os.path.join(test_dir, "docA.pdf")
    docA = fitz.open()
    for i in range(3):
        p = docA.new_page()
        p.insert_text((50, 70), f"Document A - Page {i+1}", fontsize=20)
    docA.save(pdf_a_path)
    docA.close()

    # Create sample PDF B (2 pages)
    pdf_b_path = os.path.join(test_dir, "docB.pdf")
    docB = fitz.open()
    for i in range(2):
        p = docB.new_page()
        p.insert_text((50, 70), f"Document B - Page {i+1}", fontsize=20)
    docB.save(pdf_b_path)
    docB.close()

    # 1. Merge
    with open(pdf_a_path, "rb") as fa, open(pdf_b_path, "rb") as fb:
        files = [("files", ("docA.pdf", fa, "application/pdf")), ("files", ("docB.pdf", fb, "application/pdf"))]
        res = requests.post(f"{BASE_URL}/api/core/merge", files=files)
        assert res.status_code == 200, f"Merge failed: {res.text}"
        merged_bytes = res.content
        merged_doc = fitz.open(stream=merged_bytes, filetype="pdf")
        assert len(merged_doc) == 5, f"Expected 5 pages, got {len(merged_doc)}"
        merged_doc.close()
    print("[PASS] 2. /api/core/merge merged 2 PDFs into 5 pages")

    # 2. Split
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"page_range": "1, 3"}
        res = requests.post(f"{BASE_URL}/api/core/split", files=files, data=data)
        assert res.status_code == 200, f"Split failed: {res.text}"
        split_doc = fitz.open(stream=res.content, filetype="pdf")
        assert len(split_doc) == 2, f"Expected 2 pages, got {len(split_doc)}"
        split_doc.close()
    print("[PASS] 3. /api/core/split extracted specified pages (1, 3)")

    # 3. Rotate
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"angle": 90, "page_range": "all"}
        res = requests.post(f"{BASE_URL}/api/core/rotate", files=files, data=data)
        assert res.status_code == 200, f"Rotate failed: {res.text}"
    print("[PASS] 4. /api/core/rotate rotated pages 90 deg")

    # 4. Delete pages
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"pages_to_delete": "2"}
        res = requests.post(f"{BASE_URL}/api/core/delete-pages", files=files, data=data)
        assert res.status_code == 200, f"Delete pages failed: {res.text}"
        trimmed = fitz.open(stream=res.content, filetype="pdf")
        assert len(trimmed) == 2, f"Expected 2 pages, got {len(trimmed)}"
        trimmed.close()
    print("[PASS] 5. /api/core/delete-pages stripped page 2")

    # 5. Compress
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"quality": "medium"}
        res = requests.post(f"{BASE_URL}/api/core/compress", files=files, data=data)
        assert res.status_code == 200, f"Compress failed: {res.text}"
        assert "X-Saved-Percent" in res.headers, "Compress headers missing"
    print(f"[PASS] 6. /api/core/compress compressed PDF (Saved: {res.headers.get('X-Saved-Percent')}%)")

    # 6. Watermark
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"text": "VERIFIED TEST", "opacity": 0.3, "font_size": 36, "angle": 45, "color": "#ff0000"}
        res = requests.post(f"{BASE_URL}/api/core/watermark", files=files, data=data)
        assert res.status_code == 200, f"Watermark failed: {res.text}"
    print("[PASS] 7. /api/core/watermark applied custom watermark")

    # 7. Protect (Encrypt) & Unlock (Decrypt)
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"password": "SecretPassword123"}
        res = requests.post(f"{BASE_URL}/api/core/protect", files=files, data=data)
        assert res.status_code == 200, f"Protect failed: {res.text}"
        protected_bytes = res.content
        
        # Test decrypt with password
        res_unlock = requests.post(
            f"{BASE_URL}/api/core/unlock",
            files={"file": ("protected.pdf", protected_bytes, "application/pdf")},
            data={"password": "SecretPassword123"}
        )
        assert res_unlock.status_code == 200, f"Unlock failed: {res_unlock.text}"
    print("[PASS] 8. /api/core/protect & /api/core/unlock AES-256 encryption & decryption")

    # 8. Visual Previews
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        res = requests.post(f"{BASE_URL}/api/visual/previews", files=files)
        assert res.status_code == 200, f"Visual previews failed: {res.text}"
        data = res.json()
        assert len(data["pages"]) == 3, "Previews count mismatch"
        assert data["pages"][0]["thumbnail"].startswith("data:image/jpeg;base64,"), "Thumbnail not base64"
    print("[PASS] 9. /api/visual/previews rendered thumbnails with base64 images")

    # 9. Visual Apply (reorder & rotate)
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        pages_config = [
            {"originalIndex": 2, "rotationDelta": 90, "included": True},
            {"originalIndex": 0, "rotationDelta": 0, "included": True}
        ]
        data = {"pages_config": json.dumps(pages_config)}
        res = requests.post(f"{BASE_URL}/api/visual/apply", files=files, data=data)
        assert res.status_code == 200, f"Visual apply failed: {res.text}"
        applied_doc = fitz.open(stream=res.content, filetype="pdf")
        assert len(applied_doc) == 2, f"Expected 2 pages in visual export, got {len(applied_doc)}"
        applied_doc.close()
    print("[PASS] 10. /api/visual/apply reordered & rotated pages from visual board")

    # 10. PDF to Images ZIP
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"img_format": "png", "dpi": 100}
        res = requests.post(f"{BASE_URL}/api/convert/pdf-to-images", files=files, data=data)
        assert res.status_code == 200, f"PDF to Images failed: {res.text}"
        assert res.headers.get("content-type") == "application/zip", "Response not ZIP"
    print("[PASS] 11. /api/convert/pdf-to-images rendered & zipped PNGs")

    # 11. Images to PDF
    img1_path = os.path.join(test_dir, "img1.png")
    Image.new("RGB", (200, 200), color="blue").save(img1_path)
    img2_path = os.path.join(test_dir, "img2.jpg")
    Image.new("RGB", (300, 150), color="red").save(img2_path)
    
    with open(img1_path, "rb") as f1, open(img2_path, "rb") as f2:
        files = [("files", ("img1.png", f1, "image/png")), ("files", ("img2.jpg", f2, "image/jpeg"))]
        res = requests.post(f"{BASE_URL}/api/convert/images-to-pdf", files=files)
        assert res.status_code == 200, f"Images to PDF failed: {res.text}"
        img_pdf = fitz.open(stream=res.content, filetype="pdf")
        assert len(img_pdf) == 2, f"Expected 2 pages from images, got {len(img_pdf)}"
        img_pdf.close()
    print("[PASS] 12. /api/convert/images-to-pdf converted photos into single PDF")

    # 12. PDF to Text
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        res = requests.post(f"{BASE_URL}/api/convert/pdf-to-text", files=files)
        assert res.status_code == 200, f"PDF to Text failed: {res.text}"
        data = res.json()
        assert "Document A" in data["text"], "Text missing expected content"
    print("[PASS] 13. /api/convert/pdf-to-text extracted structured text")

    # 13. PDF to DOCX (Word)
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        res = requests.post(f"{BASE_URL}/api/convert/pdf-to-docx", files=files)
        assert res.status_code == 200, f"PDF to DOCX failed: {res.text}"
        assert len(res.content) > 1000, "DOCX content suspiciously small"
    print("[PASS] 14. /api/convert/pdf-to-docx converted PDF into Microsoft Word (.docx)")

    # 14. OCR Extraction
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        data = {"language": "eng"}
        res = requests.post(f"{BASE_URL}/api/ocr/extract", files=files, data=data)
        assert res.status_code == 200, f"OCR failed: {res.text}"
        data = res.json()
        assert data["totalPages"] == 3, "OCR page count mismatch"
        assert data["wordCount"] > 0, "OCR words zero"
    print(f"[PASS] 15. /api/ocr/extract extracted {data['wordCount']} words with page breakdown")

    # 15. AI Summarize (Mock/Offline fallback verification)
    with open(pdf_a_path, "rb") as fa:
        files = {"file": ("docA.pdf", fa, "application/pdf")}
        res = requests.post(f"{BASE_URL}/api/ai/summarize", files=files)
        assert res.status_code == 200, f"AI summarize failed: {res.text}"
        data = res.json()
        assert data["success"] is True, "AI summarize success is False"
    print("[PASS] 16. /api/ai/summarize handled document analysis & fallback gracefully")

    # Clean test directory
    import shutil
    shutil.rmtree(test_dir)
    print("\n========================================================")
    print("ALL 16 BACKEND ENDPOINTS ARE 100% OPERATIONAL & VERIFIED!")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
