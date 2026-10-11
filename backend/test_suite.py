import os
import sys
import shutil

# Set stdout to UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

import pymupdf as fitz
from services import core_service, visual_service, converter_service, ocr_service

def test_all():
    print("--- Running MyPDF Studio Self-Test ---")
    test_dir = os.path.join(os.path.dirname(__file__), "test_tmp")
    os.makedirs(test_dir, exist_ok=True)
    
    # 1. Create dummy sample PDFs
    pdf1_path = os.path.join(test_dir, "doc1.pdf")
    doc1 = fitz.open()
    for i in range(3):
        p = doc1.new_page()
        p.insert_text((50, 70), f"Document 1 - Page {i+1}", fontsize=24)
    doc1.save(pdf1_path)
    doc1.close()
    
    pdf2_path = os.path.join(test_dir, "doc2.pdf")
    doc2 = fitz.open()
    for i in range(2):
        p = doc2.new_page()
        p.insert_text((50, 70), f"Document 2 - Page {i+1}", fontsize=24)
    doc2.save(pdf2_path)
    doc2.close()
    print("[PASS] Sample PDFs created.")
    
    # 2. Test Merge
    merged_path = os.path.join(test_dir, "merged.pdf")
    core_service.merge_pdfs([pdf1_path, pdf2_path], merged_path)
    merged_doc = fitz.open(merged_path)
    assert len(merged_doc) == 5, f"Expected 5 pages, got {len(merged_doc)}"
    merged_doc.close()
    print("[PASS] Merge service test passed (5 pages combined).")
    
    # 3. Test Visual Previews
    previews = visual_service.get_pdf_page_previews(merged_path, max_width=200)
    assert len(previews) == 5, f"Expected 5 previews, got {len(previews)}"
    assert previews[0]["thumbnail"].startswith("data:image/jpeg;base64,"), "Thumbnail not valid base64"
    print("[PASS] Visual thumbnails generator test passed (5 high-res previews rendered).")
    
    # 4. Test Split
    split_path = os.path.join(test_dir, "split.pdf")
    core_service.split_pdf(merged_path, "1-2, 4", split_path)
    split_doc = fitz.open(split_path)
    assert len(split_doc) == 3, f"Expected 3 pages in split, got {len(split_doc)}"
    split_doc.close()
    print("[PASS] Split service test passed (pages 1-2, 4 extracted).")
    
    # 5. Test Watermark
    wm_path = os.path.join(test_dir, "watermarked.pdf")
    core_service.watermark_pdf(split_path, "MYPDF TEST", wm_path)
    assert os.path.exists(wm_path), "Watermarked file missing"
    print("[PASS] Watermark service test passed.")
    
    # 6. Test Compression
    comp_path = os.path.join(test_dir, "compressed.pdf")
    comp_res = core_service.compress_pdf(wm_path, "medium", comp_path)
    assert os.path.exists(comp_path), "Compressed file missing"
    print(f"[PASS] Compression test passed (Original: {comp_res['original_size']}B, New: {comp_res['new_size']}B).")
    
    # 7. Test PDF to Images
    img_dir = os.path.join(test_dir, "images_out")
    img_res = converter_service.pdf_to_images(split_path, img_dir, img_format="png", dpi=100)
    assert os.path.exists(img_res["zip_path"]), "Images zip missing"
    print(f"[PASS] PDF to Images test passed ({img_res['image_count']} images rendered and zipped).")
    
    # 8. Test OCR & Text Extractor
    ocr_res = ocr_service.run_ocr_on_pdf(merged_path)
    assert ocr_res["totalPages"] == 5, "OCR total pages mismatch"
    assert "Document 1" in ocr_res["fullText"], "Extracted text missing expected content"
    print(f"[PASS] OCR & Text extractor test passed ({ocr_res['wordCount']} words extracted).")
    
    # Clean up test files
    shutil.rmtree(test_dir)
    print("\nALL 8 BACKEND SERVICES VALIDATED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
