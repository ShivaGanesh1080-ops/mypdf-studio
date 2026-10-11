import os
import sys
import zipfile
from typing import List, Dict, Any, Optional
import pymupdf as fitz
from PIL import Image
from pdf2docx import Converter
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# ----------------- IMAGES TO PDF (JPG, PNG, WEBP, BMP, TIFF, GIF) -----------------

def images_to_pdf(
    image_paths: List[str],
    output_path: str,
    page_size: str = "fit",
    orientation: str = "auto",
    margin: int = 0
) -> str:
    """
    Combines uploaded images (JPG, JPEG, PNG, WEBP, BMP, TIFF) into a PDF.
    - page_size: 'fit' (image dimensions), 'a4' (595x842 pt), 'letter' (612x792 pt)
    - orientation: 'auto', 'portrait', 'landscape'
    - margin: margin around image in points (0, 15, 30)
    """
    doc = fitz.open()
    
    # Standard dimensions in points
    sizes = {
        "a4": (595.0, 842.0),
        "letter": (612.0, 792.0)
    }

    for img_path in image_paths:
        try:
            with Image.open(img_path) as pil_img:
                img_w, img_h = pil_img.size
                
                # Determine target page width and height
                if page_size in sizes:
                    base_w, base_h = sizes[page_size]
                    if orientation == "landscape" or (orientation == "auto" and img_w > img_h):
                        pw, ph = max(base_w, base_h), min(base_w, base_h)
                    else:
                        pw, ph = min(base_w, base_h), max(base_w, base_h)
                        
                    # Calculate scaled image rect preserving aspect ratio inside margins
                    avail_w = max(pw - (2 * margin), 10)
                    avail_h = max(ph - (2 * margin), 10)
                    scale = min(avail_w / img_w, avail_h / img_h)
                    scaled_w = img_w * scale
                    scaled_h = img_h * scale
                    
                    x0 = margin + (avail_w - scaled_w) / 2.0
                    y0 = margin + (avail_h - scaled_h) / 2.0
                    x1 = x0 + scaled_w
                    y1 = y0 + scaled_h
                    img_rect = fitz.Rect(x0, y0, x1, y1)
                else:
                    # 'fit': page size matches image size exactly + margins
                    pw = img_w + (2 * margin)
                    ph = img_h + (2 * margin)
                    img_rect = fitz.Rect(margin, margin, margin + img_w, margin + img_h)

                # Ensure RGB mode for PDF insertion
                temp_to_clean = None
                img_insert_path = img_path
                if pil_img.mode in ("RGBA", "P", "LA"):
                    temp_rgb = img_path + ".temp_rgb.jpg"
                    rgb_converted = pil_img.convert("RGB")
                    rgb_converted.save(temp_rgb, "JPEG", quality=95)
                    img_insert_path = temp_rgb
                    temp_to_clean = temp_rgb

                page = doc.new_page(width=pw, height=ph)
                page.insert_image(img_rect, filename=img_insert_path)

                if temp_to_clean and os.path.exists(temp_to_clean):
                    try:
                        os.remove(temp_to_clean)
                    except Exception:
                        pass
        except Exception as e:
            print(f"Skipping image {img_path}: {e}")

    doc.save(output_path)
    doc.close()
    return output_path

# ----------------- PDF TO IMAGES -----------------

def pdf_to_images(file_path: str, output_dir: str, img_format: str = "png", dpi: int = 150) -> Dict[str, Any]:
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(file_path)
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    
    zoom = dpi / 72.0
    matrix = fitz.Matrix(zoom, zoom)
    
    image_paths = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        out_filename = f"{base_name}_page_{i+1:03d}.{img_format.lower()}"
        out_file = os.path.join(output_dir, out_filename)
        pix.save(out_file)
        image_paths.append(out_file)
        
    doc.close()
    
    zip_path = os.path.join(output_dir, f"{base_name}_images.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for img in image_paths:
            zipf.write(img, arcname=os.path.basename(img))
            
    return {
        "zip_path": zip_path,
        "image_count": len(image_paths),
        "image_files": [os.path.basename(p) for p in image_paths]
    }

# ----------------- PDF TO DOCX -----------------

def pdf_to_docx(file_path: str, output_path: str) -> str:
    cv = Converter(file_path)
    cv.convert(output_path, start=0, end=None)
    cv.close()
    return output_path

# ----------------- DOCX / DOC TO PDF -----------------

def docx_to_pdf(input_path: str, output_path: str) -> str:
    """
    Converts Word (.docx, .doc) to PDF.
    First tries Microsoft Word COM (pixel-perfect fidelity).
    """
    abs_input = os.path.abspath(input_path)
    abs_output = os.path.abspath(output_path)
    
    # Try Word COM Automation
    try:
        import pythoncom
        import win32com.client
        pythoncom.CoInitialize()
        try:
            word = win32com.client.DispatchEx("Word.Application")
            word.Visible = False
            word.DisplayAlerts = 0
            doc = word.Documents.Open(abs_input, ReadOnly=True)
            # 17 = wdExportFormatPDF
            doc.SaveAs(abs_output, FileFormat=17)
            doc.Close(False)
            word.Quit()
            return output_path
        finally:
            pythoncom.CoUninitialize()
    except Exception as com_err:
        print(f"Word COM error: {com_err}. Attempting pure Python fallback...")

    # Fallback: Read text/paragraphs with python-docx and build PDF via reportlab
    try:
        import docx
        doc = docx.Document(input_path)
        pdf_doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        story = []
        for p in doc.paragraphs:
            txt = p.text.strip()
            if txt:
                story.append(Paragraph(txt, styles["Normal"]))
                story.append(Spacer(1, 6))
        pdf_doc.build(story)
        return output_path
    except Exception as fallback_err:
        raise RuntimeError(f"Could not convert Word to PDF: {com_err}; Fallback: {fallback_err}")

# ----------------- PPTX / PPT TO PDF -----------------

def pptx_to_pdf(input_path: str, output_path: str) -> str:
    """
    Converts PowerPoint (.pptx, .ppt) to PDF using PowerPoint COM automation.
    """
    abs_input = os.path.abspath(input_path)
    abs_output = os.path.abspath(output_path)
    
    try:
        import pythoncom
        import win32com.client
        pythoncom.CoInitialize()
        try:
            powerpoint = win32com.client.DispatchEx("PowerPoint.Application")
            deck = powerpoint.Presentations.Open(abs_input, WithWindow=False)
            # 32 = ppSaveAsPDF
            deck.SaveAs(abs_output, 32)
            deck.Close()
            powerpoint.Quit()
            return output_path
        finally:
            pythoncom.CoUninitialize()
    except Exception as com_err:
        raise RuntimeError(f"PowerPoint to PDF conversion error: {com_err}")

# ----------------- EXCEL (XLSX, XLS, CSV) TO PDF -----------------

def excel_to_pdf(input_path: str, output_path: str) -> str:
    """
    Converts Excel (.xlsx, .xls, .csv) to PDF.
    CSV uses pure-Python ReportLab Table generation with zero COM requirement.
    XLS/XLSX uses Excel automation when available.
    """
    abs_input = os.path.abspath(input_path)
    abs_output = os.path.abspath(output_path)
    
    # Pure Python CSV conversion with zero desktop COM dependency
    if input_path.lower().endswith(".csv"):
        try:
            import csv
            from reportlab.platypus import Table, TableStyle
            with open(input_path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                data = [row for row in reader if any(cell.strip() for cell in row)]
            if not data:
                data = [["Empty CSV file"]]
            doc = SimpleDocTemplate(abs_output, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
            t = Table(data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ]))
            doc.build([t])
            return output_path
        except Exception as csv_err:
            print(f"CSV fallback error: {csv_err}")

    try:
        import pythoncom
        import win32com.client
        pythoncom.CoInitialize()
        try:
            excel = win32com.client.DispatchEx("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            wb = excel.Workbooks.Open(abs_input, ReadOnly=True)
            # 0 = xlTypePDF
            wb.ExportAsFixedFormat(0, abs_output)
            wb.Close(False)
            excel.Quit()
            return output_path
        finally:
            pythoncom.CoUninitialize()
    except Exception as com_err:
        raise RuntimeError(f"Excel to PDF conversion error: {com_err}. For cloud/Linux deployment, spreadsheet rendering requires LibreOffice engine.")

# ----------------- TEXT & MARKDOWN TO PDF -----------------

def text_to_pdf(input_path: str, output_path: str) -> str:
    """
    Converts plain text (.txt) into a cleanly formatted PDF document.
    """
    with open(input_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    mono_style = ParagraphStyle(
        'MonoBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1e293b")
    )
    
    story = []
    lines = content.split("\n")
    for line in lines:
        if line.strip():
            story.append(Paragraph(line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"), mono_style))
        else:
            story.append(Spacer(1, 8))
            
    doc.build(story)
    return output_path

def markdown_to_pdf(input_path: str, output_path: str) -> str:
    """
    Converts Markdown (.md) into a styled PDF document with headings and formatted blocks.
    """
    with open(input_path, "r", encoding="utf-8", errors="replace") as f:
        md_text = f.read()

    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=18, leading=22, textColor=colors.HexColor("#0f172a"), spaceAfter=10)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, leading=18, textColor=colors.HexColor("#1e293b"), spaceAfter=8)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor("#334155"), spaceAfter=6)

    story = []
    for line in md_text.split("\n"):
        clean = line.strip()
        if clean.startswith("# "):
            story.append(Paragraph(clean[2:], h1_style))
        elif clean.startswith("## "):
            story.append(Paragraph(clean[3:], h2_style))
        elif clean.startswith("- ") or clean.startswith("* "):
            story.append(Paragraph(f"&bull; {clean[2:]}", body_style))
        elif clean:
            story.append(Paragraph(clean, body_style))
        else:
            story.append(Spacer(1, 6))

    doc.build(story)
    return output_path

# ----------------- PDF TO TEXT -----------------

def pdf_to_text(file_path: str) -> str:
    doc = fitz.open(file_path)
    extracted = []
    for i, page in enumerate(doc):
        extracted.append(f"--- [PAGE {i+1}] ---\n")
        extracted.append(page.get_text("text"))
        extracted.append("\n\n")
    doc.close()
    return "".join(extracted)
