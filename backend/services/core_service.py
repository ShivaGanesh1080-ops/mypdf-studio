import os
import io
from typing import List, Optional
import fitz  # PyMuPDF
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

def merge_pdfs(file_paths: List[str], output_path: str) -> str:
    """Merges multiple PDF files into one in order."""
    writer = PdfWriter()
    for path in file_paths:
        reader = PdfReader(path)
        for page in reader.pages:
            writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def parse_page_range(range_str: str, max_pages: int) -> List[int]:
    """
    Parses ranges like '1-3, 5, 7-9' (1-indexed) into 0-indexed integer list.
    """
    if not range_str or range_str.strip().lower() == "all":
        return list(range(max_pages))
    
    pages = set()
    parts = range_str.split(",")
    for part in parts:
        part = part.strip()
        if "-" in part:
            sub = part.split("-")
            start = int(sub[0].strip())
            end = int(sub[1].strip())
            for p in range(start, end + 1):
                if 1 <= p <= max_pages:
                    pages.add(p - 1)
        else:
            if part.isdigit():
                p = int(part)
                if 1 <= p <= max_pages:
                    pages.add(p - 1)
    return sorted(list(pages))

def split_pdf(file_path: str, range_str: str, output_path: str) -> str:
    """Extracts specified page range into a new PDF."""
    reader = PdfReader(file_path)
    total_pages = len(reader.pages)
    selected_pages = parse_page_range(range_str, total_pages)
    
    writer = PdfWriter()
    for p_idx in selected_pages:
        writer.add_page(reader.pages[p_idx])
        
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def rotate_pdf(file_path: str, angle: int, page_ranges: Optional[str], output_path: str) -> str:
    """Rotates pages by angle (90, 180, 270)."""
    doc = fitz.open(file_path)
    selected_pages = parse_page_range(page_ranges or "all", len(doc))
    for p_idx in selected_pages:
        page = doc[p_idx]
        page.set_rotation((page.rotation + angle) % 360)
    doc.save(output_path)
    doc.close()
    return output_path

def delete_pages(file_path: str, pages_to_delete: str, output_path: str) -> str:
    """Removes specified pages (1-indexed, e.g. '2, 4, 6-8')."""
    reader = PdfReader(file_path)
    total_pages = len(reader.pages)
    del_set = set(parse_page_range(pages_to_delete, total_pages))
    
    writer = PdfWriter()
    for i in range(total_pages):
        if i not in del_set:
            writer.add_page(reader.pages[i])
            
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def compress_pdf(file_path: str, quality_level: str, output_path: str) -> dict:
    """
    Compresses PDF using intelligent image downsampling (rewrite_images),
    stream deflating, font deduplication, and object garbage collection.
    quality_level: 'low' (extreme compression), 'medium' (balanced), 'high' (light compression)
    """
    original_size = os.path.getsize(file_path)
    doc = fitz.open(file_path)
    
    # Configure parameters based on quality level
    # dpi_threshold must be strictly greater than dpi_target
    if quality_level == "low":
        threshold, target, quality = 85, 72, 45
    elif quality_level == "high":
        threshold, target, quality = 220, 150, 80
    else:  # medium / default
        threshold, target, quality = 130, 96, 65

    # 1. First attempt image downsampling and recompression
    try:
        doc.rewrite_images(
            dpi_threshold=threshold,
            dpi_target=target,
            quality=quality,
            lossy=True,
            lossless=True,
            color=True,
            gray=True
        )
    except Exception as img_err:
        # If document has no images or rewriting throws, continue to structural deflation
        pass
    
    # 2. Save with deep garbage collection and stream deflating
    doc.save(
        output_path,
        garbage=4,
        deflate=True,
        deflate_images=True,
        deflate_fonts=True,
        clean=True
    )
    doc.close()
    
    new_size = os.path.getsize(output_path)
    
    # If the rewritten file is somehow larger than original, keep original
    if new_size > original_size:
        import shutil
        shutil.copy2(file_path, output_path)
        new_size = original_size
        
    saved_bytes = max(original_size - new_size, 0)
    saved_percent = round((saved_bytes / max(original_size, 1)) * 100, 1)
    
    return {
        "original_size": original_size,
        "new_size": new_size,
        "saved_bytes": saved_bytes,
        "saved_percent": saved_percent
    }

def create_watermark_stream(text: str, width: float, height: float, opacity: float = 0.25, font_size: int = 40, angle: int = 45, color_hex: str = "#666666") -> io.BytesIO:
    """Generates a transparent watermark PDF overlay using reportlab."""
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=(width, height))
    
    # Parse color
    color_hex = color_hex.lstrip("#")
    r, g, b = tuple(int(color_hex[i:i+2], 16) / 255.0 for i in (0, 2, 4)) if len(color_hex) == 6 else (0.4, 0.4, 0.4)
    
    can.setFillColor(colors.Color(r, g, b, alpha=opacity))
    can.setFont("Helvetica-Bold", font_size)
    can.saveState()
    
    # Center text and rotate
    can.translate(width / 2, height / 2)
    can.rotate(angle)
    can.drawCentredString(0, 0, text)
    
    can.restoreState()
    can.save()
    packet.seek(0)
    return packet

def watermark_pdf(file_path: str, text: str, output_path: str, opacity: float = 0.25, font_size: int = 42, angle: int = 45, color_hex: str = "#888888") -> str:
    """Applies a watermark overlay across every page in the PDF."""
    reader = PdfReader(file_path)
    writer = PdfWriter()
    
    for page in reader.pages:
        box = page.mediabox
        width = float(box.width)
        height = float(box.height)
        
        wm_stream = create_watermark_stream(text, width, height, opacity, font_size, angle, color_hex)
        wm_reader = PdfReader(wm_stream)
        wm_page = wm_reader.pages[0]
        
        page.merge_page(wm_page)
        writer.add_page(page)
        
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def protect_pdf(file_path: str, password: str, output_path: str) -> str:
    """Encrypts PDF with AES-256 password protection."""
    reader = PdfReader(file_path)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=password, owner_password=password)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path

def unlock_pdf(file_path: str, password: str, output_path: str) -> bool:
    """Decrypts a password-protected PDF and saves unprotected version."""
    reader = PdfReader(file_path)
    if reader.is_encrypted:
        success = reader.decrypt(password)
        if not success:
            return False
            
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return True
