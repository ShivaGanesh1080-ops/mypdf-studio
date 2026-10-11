import os
import io
import tempfile
import uuid
import pymupdf
from pypdf import PdfReader, PdfWriter
from services import core_service, converter_service

def test_long_line_text_wrapping():
    print("\n--- Test 1: Long-Line Text Wrapping (Zero Content Loss) ---")
    long_line = "START " + ("A" * 110) + " END_SENTINEL"
    
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(long_line + "\nSecond line with numbers 1234567890.\n")
        txt_path = f.name
        
    out_pdf = txt_path.replace(".txt", ".pdf")
    try:
        converter_service.text_to_pdf(txt_path, out_pdf)
        
        # Read back with pymupdf and verify END_SENTINEL is present
        doc = pymupdf.open(out_pdf)
        extracted_text = "".join(page.get_text() for page in doc)
        doc.close()
        
        assert "START" in extracted_text, "Failed: START missing"
        assert "END_SENTINEL" in extracted_text, "Failed: END_SENTINEL was truncated!"
        assert "1234567890" in extracted_text, "Failed: Second line missing"
        print("[PASS] Long line wrapped without dropping characters. 'END_SENTINEL' is intact!")
    finally:
        if os.path.exists(txt_path): 
            try: os.remove(txt_path)
            except Exception: pass
        if os.path.exists(out_pdf): 
            try: os.remove(out_pdf)
            except Exception: pass

def test_aes_256_encryption():
    print("\n--- Test 2: Cryptographic AES-256 Verification ---")
    doc = pymupdf.open()
    doc.new_page(width=300, height=300)
    
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        src_path = f.name
    doc.save(src_path)
    doc.close()
    
    enc_path = src_path.replace(".pdf", "_enc.pdf")
    dec_path = src_path.replace(".pdf", "_dec.pdf")
    
    try:
        # Encrypt with core_service.protect_pdf
        core_service.protect_pdf(src_path, "SecretPass123", enc_path)
        
        # Inspect encryption metadata using pypdf
        reader = PdfReader(enc_path)
        assert reader.is_encrypted, "Failed: Document is not encrypted!"
        
        enc_dict = reader.trailer["/Encrypt"].get_object()
        v = enc_dict.get("/V")
        r = enc_dict.get("/R")
        length = enc_dict.get("/Length")
        
        print(f"Encryption Metadata: V={v}, R={r}, Length={length}")
        assert v == 5, f"Expected V=5 for AES-256, got {v}"
        assert r == 6, f"Expected R=6 for AES-256, got {r}"
        assert length == 256, f"Expected Length=256 for AES-256, got {length}"
        print("[PASS] Verified true AES-256 encryption parameters (V=5, R=6, 256-bit)!")
        
        # Test unlock with correct password
        unlocked = core_service.unlock_pdf(enc_path, "SecretPass123", dec_path)
        assert unlocked, "Failed: Could not unlock with correct password!"
        
        # Test unlock with wrong password
        wrong_attempt = core_service.unlock_pdf(enc_path, "WrongPassword", dec_path)
        assert not wrong_attempt, "Failed: Wrong password should have returned False!"
        print("[PASS] Password verification passes (correct unlocks, wrong rejected).")
    finally:
        for p in [src_path, enc_path, dec_path]:
            if os.path.exists(p):
                try: os.remove(p)
                except Exception: pass

def test_per_job_workspace_isolation():
    print("\n--- Test 3: Per-Job Workspace & File Collision Isolation ---")
    from main import create_job_workspace, cleanup_workspace, sanitize_filename
    
    ws1 = create_job_workspace()
    ws2 = create_job_workspace()
    
    assert ws1 != ws2, "Failed: Workspaces must have unique paths!"
    assert os.path.exists(ws1) and os.path.exists(ws2)
    
    # Simulate same filename uploaded in two concurrent requests
    file1 = os.path.join(ws1, "input.pdf")
    file2 = os.path.join(ws2, "input.pdf")
    
    with open(file1, "w") as f: f.write("User 1 Secret Data")
    with open(file2, "w") as f: f.write("User 2 Other Data")
    
    with open(file1, "r") as f: content1 = f.read()
    with open(file2, "r") as f: content2 = f.read()
    
    assert content1 == "User 1 Secret Data"
    assert content2 == "User 2 Other Data"
    print("[PASS] Concurrent same-name files remain strictly isolated across request UUID workspaces!")
    
    # Test filename sanitization
    dirty_name = "../../../etc/passwd;rm -rf;special$<>.pdf"
    clean = sanitize_filename(dirty_name)
    assert "/" not in clean and "\\" not in clean and ".." not in clean
    print(f"[PASS] Path sanitization: '{dirty_name}' -> '{clean}'")
    
    # Test cleanup
    cleanup_workspace(ws1)
    cleanup_workspace(ws2)
    assert not os.path.exists(ws1) and not os.path.exists(ws2)
    print("[PASS] Full workspace directory and internal contents cleaned up reliably!")

def test_csv_to_pdf_conversion():
    print("\n--- Test 4: Pure-Python CSV to PDF Conversion ---")
    csv_content = "ID,Name,Department,Salary\n1,Alice,Engineering,$120000\n2,Bob,Product,$110000\n3,Charlie,Security,$135000\n"
    with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False, encoding="utf-8") as f:
        f.write(csv_content)
        csv_path = f.name
    out_pdf = csv_path.replace(".csv", ".pdf")
    try:
        converter_service.excel_to_pdf(csv_path, out_pdf)
        assert os.path.exists(out_pdf) and os.path.getsize(out_pdf) > 0
        doc = pymupdf.open(out_pdf)
        text = "".join(p.get_text() for p in doc)
        doc.close()
        assert "Engineering" in text and "Security" in text
        print("[PASS] CSV converted to tabular PDF with ReportLab (Zero COM dependency)!")
    finally:
        if os.path.exists(csv_path):
            try: os.remove(csv_path)
            except Exception: pass
        if os.path.exists(out_pdf):
            try: os.remove(out_pdf)
            except Exception: pass

if __name__ == "__main__":
    print("==================================================")
    print("RUNNING MYPDF STUDIO AUDIT & SECURITY FIX TEST SUITE")
    print("==================================================")
    test_long_line_text_wrapping()
    test_aes_256_encryption()
    test_per_job_workspace_isolation()
    test_csv_to_pdf_conversion()
    print("\n==================================================")
    print("ALL 4 CRITICAL AUDIT FIX TEST SUITES PASSED! (4/4)")
    print("==================================================")
