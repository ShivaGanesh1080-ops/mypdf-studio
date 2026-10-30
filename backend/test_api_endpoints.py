import os
import io
import tempfile
import pymupdf
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def create_sample_pdf_bytes(num_pages=3, text_prefix="Page"):
    doc = pymupdf.open()
    for i in range(num_pages):
        page = doc.new_page(width=300, height=300)
        page.insert_text((50, 50), f"{text_prefix} {i + 1} Content", fontsize=14)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["app"] == "MyPDF Studio"
    print("[PASS] GET /api/health")

def test_core_merge():
    pdf1 = create_sample_pdf_bytes(2, "DocA")
    pdf2 = create_sample_pdf_bytes(3, "DocB")
    files = [
        ("files", ("doc1.pdf", io.BytesIO(pdf1), "application/pdf")),
        ("files", ("doc2.pdf", io.BytesIO(pdf2), "application/pdf")),
    ]
    res = client.post("/api/core/merge", files=files)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    doc = pymupdf.open(stream=res.content, filetype="pdf")
    assert doc.page_count == 5
    doc.close()
    print("[PASS] POST /api/core/merge (2 + 3 = 5 pages)")

def test_core_split():
    pdf = create_sample_pdf_bytes(4, "SplitDoc")
    files = {"file": ("input.pdf", io.BytesIO(pdf), "application/pdf")}
    data = {"page_range": "2-3"}
    res = client.post("/api/core/split", files=files, data=data)
    assert res.status_code == 200
    doc = pymupdf.open(stream=res.content, filetype="pdf")
    assert doc.page_count == 2
    doc.close()
    print("[PASS] POST /api/core/split (Extracted 2 pages)")

def test_core_rotate():
    pdf = create_sample_pdf_bytes(2, "RotateDoc")
    files = {"file": ("input.pdf", io.BytesIO(pdf), "application/pdf")}
    data = {"angle": 90, "page_range": "all"}
    res = client.post("/api/core/rotate", files=files, data=data)
    assert res.status_code == 200
    doc = pymupdf.open(stream=res.content, filetype="pdf")
    assert doc[0].rotation == 90
    doc.close()
    print("[PASS] POST /api/core/rotate (90 degree rotation)")

def test_core_delete_pages():
    pdf = create_sample_pdf_bytes(4, "DeleteDoc")
    files = {"file": ("input.pdf", io.BytesIO(pdf), "application/pdf")}
    data = {"pages_to_delete": "2,4"}
    res = client.post("/api/core/delete-pages", files=files, data=data)
    assert res.status_code == 200
    doc = pymupdf.open(stream=res.content, filetype="pdf")
    assert doc.page_count == 2
    doc.close()
    print("[PASS] POST /api/core/delete-pages (Deleted 2 pages from 4)")

def test_core_watermark():
    pdf = create_sample_pdf_bytes(2, "WatermarkDoc")
    files = {"file": ("input.pdf", io.BytesIO(pdf), "application/pdf")}
    data = {"text": "MYPDF_TEST_MARK", "opacity": 0.5, "font_size": 36, "angle": 45, "color": "#ff0000"}
    res = client.post("/api/core/watermark", files=files, data=data)
    assert res.status_code == 200
    doc = pymupdf.open(stream=res.content, filetype="pdf")
    text = "".join(p.get_text() for p in doc)
    doc.close()
    assert "MYPDF_TEST_MARK" in text
    print("[PASS] POST /api/core/watermark (Watermark verified)")

def test_core_compress():
    pdf = create_sample_pdf_bytes(3, "CompressDoc")
    files = {"file": ("input.pdf", io.BytesIO(pdf), "application/pdf")}
    data = {"quality": "medium"}
    res = client.post("/api/core/compress", files=files, data=data)
    assert res.status_code == 200
    assert "X-Original-Size" in res.headers
    assert "X-New-Size" in res.headers
    print("[PASS] POST /api/core/compress (Headers present)")

def test_core_protect_and_unlock():
    pdf = create_sample_pdf_bytes(2, "SecureDoc")
    files = {"file": ("input.pdf", io.BytesIO(pdf), "application/pdf")}
    data = {"password": "TestPassword456"}
    res = client.post("/api/core/protect", files=files, data=data)
    assert res.status_code == 200
    enc_bytes = res.content

    # Verify unlocking with correct password
    files_unlock = {"file": ("protected.pdf", io.BytesIO(enc_bytes), "application/pdf")}
    data_unlock = {"password": "TestPassword456"}
    res_unlock = client.post("/api/core/unlock", files=files_unlock, data=data_unlock)
    assert res_unlock.status_code == 200
    doc = pymupdf.open(stream=res_unlock.content, filetype="pdf")
    assert not doc.is_encrypted
    assert doc.page_count == 2
    doc.close()
    print("[PASS] POST /api/core/protect & /api/core/unlock (AES-256 workflow)")

def test_convert_csv_to_pdf():
    csv_bytes = b"ID,Name,Department\n101,John Doe,Engineering\n102,Jane Smith,Design\n"
    files = {"file": ("report.csv", io.BytesIO(csv_bytes), "text/csv")}
    res = client.post("/api/convert/excel-to-pdf", files=files)
    assert res.status_code == 200
    doc = pymupdf.open(stream=res.content, filetype="pdf")
    text = "".join(p.get_text() for p in doc)
    doc.close()
    assert "Engineering" in text and "Design" in text
    print("[PASS] POST /api/convert/excel-to-pdf (CSV pure-python tabular PDF)")

def test_visual_apply():
    pdf = create_sample_pdf_bytes(3, "VisualDoc")
    config = [
        {"originalIndex": 1, "rotationDelta": 90, "included": True},
        {"originalIndex": 0, "rotationDelta": 0, "included": True},
        {"originalIndex": 2, "rotationDelta": 0, "included": False},
    ]
    import json
    files = {"file": ("input.pdf", io.BytesIO(pdf), "application/pdf")}
    data = {"pages_config": json.dumps(config)}
    res = client.post("/api/visual/apply", files=files, data=data)
    assert res.status_code == 200
    doc = pymupdf.open(stream=res.content, filetype="pdf")
    assert doc.page_count == 2
    assert doc[0].rotation == 90
    doc.close()
    print("[PASS] POST /api/visual/apply (Visual reorder, rotation & exclusion)")

if __name__ == "__main__":
    print("==================================================")
    print("RUNNING MYPDF STUDIO FASTAPI IN-PROCESS API SUITE")
    print("==================================================")
    test_health()
    test_core_merge()
    test_core_split()
    test_core_rotate()
    test_core_delete_pages()
    test_core_watermark()
    test_core_compress()
    test_core_protect_and_unlock()
    test_convert_csv_to_pdf()
    test_visual_apply()
    print("==================================================")
    print("ALL 10 API ENDPOINT TEST SUITES PASSED! (10/10)")
    print("==================================================")
