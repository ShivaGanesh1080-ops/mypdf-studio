import os
import shutil
import tempfile
import json
import uuid
import re
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from services import core_service, visual_service, converter_service, ocr_service, ai_service

app = FastAPI(
    title="MyPDF Studio API", 
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# Robust CORS configuration: Local dev + Vercel production domains
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Original-Size", "X-New-Size", "X-Saved-Percent", "Content-Disposition"]
)

TEMP_DIR = os.path.join(tempfile.gettempdir(), "mypdf_studio")
os.makedirs(TEMP_DIR, exist_ok=True)

def create_job_workspace() -> str:
    """Creates a strictly isolated, per-request temporary workspace directory."""
    job_id = uuid.uuid4().hex
    job_dir = os.path.join(TEMP_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    return job_dir

def cleanup_workspace(job_dir: str):
    """Reliably removes the entire request workspace and all internal files."""
    try:
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir, ignore_errors=True)
    except Exception:
        pass

def sanitize_filename(name: Optional[str], default: str = "document.pdf") -> str:
    """Sanitizes user filename strictly for HTTP Content-Disposition headers."""
    if not name:
        return default
    basename = os.path.basename(name)
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', basename)
    return clean or default

@app.get("/api/health")
def health_check():
    return {
        "status": "ok", 
        "app": "MyPDF Studio", 
        "version": "1.0.0",
        "features": {
            "local_capable": ["merge", "split", "rotate", "delete", "watermark", "compress", "img2pdf", "txt2pdf", "ocr"],
            "server_capable": ["protect_aes256", "unlock", "docx2pdf", "pptx2pdf", "excel2pdf", "pdf2docx", "pdf2img"]
        }
    }

# ----------------- CORE PDF OPERATIONS -----------------

@app.post("/api/core/merge")
async def api_merge_pdfs(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Please upload at least 2 PDF files to merge.")
    
    job_dir = create_job_workspace()
    saved_paths = []
    try:
        for idx, f in enumerate(files):
            temp_path = os.path.join(job_dir, f"input_{idx}.pdf")
            content = await f.read()
            with open(temp_path, "wb") as out:
                out.write(content)
            saved_paths.append(temp_path)
            
        output_file = os.path.join(job_dir, "output.pdf")
        core_service.merge_pdfs(saved_paths, output_file)
        
        background_tasks.add_task(cleanup_workspace, job_dir)
        return FileResponse(output_file, media_type="application/pdf", filename="merged_document.pdf")
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Document merge failed: " + str(e))

@app.post("/api/core/split")
async def api_split_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    page_range: str = Form("1")
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        core_service.split_pdf(temp_input, page_range, output_file)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"split_{sanitize_filename(file.filename)}"
        return FileResponse(output_file, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Document split failed: " + str(e))

@app.post("/api/core/rotate")
async def api_rotate_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    angle: int = Form(90),
    page_range: str = Form("all")
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        core_service.rotate_pdf(temp_input, angle, page_range, output_file)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"rotated_{sanitize_filename(file.filename)}"
        return FileResponse(output_file, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Document rotation failed: " + str(e))

@app.post("/api/core/delete-pages")
async def api_delete_pages(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pages_to_delete: str = Form(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        core_service.delete_pages(temp_input, pages_to_delete, output_file)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"trimmed_{sanitize_filename(file.filename)}"
        return FileResponse(output_file, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Page deletion failed: " + str(e))

@app.post("/api/core/compress")
async def api_compress_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    quality: str = Form("medium")
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        stats = core_service.compress_pdf(temp_input, quality, output_file)
        background_tasks.add_task(cleanup_workspace, job_dir)
        
        safe_name = f"compressed_{sanitize_filename(file.filename)}"
        response = FileResponse(output_file, media_type="application/pdf", filename=safe_name)
        response.headers["X-Original-Size"] = str(stats["original_size"])
        response.headers["X-New-Size"] = str(stats["new_size"])
        response.headers["X-Saved-Percent"] = str(stats["saved_percent"])
        return response
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="PDF compression failed: " + str(e))

@app.post("/api/core/watermark")
async def api_watermark_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    text: str = Form("CONFIDENTIAL"),
    opacity: float = Form(0.25),
    font_size: int = Form(42),
    angle: int = Form(45),
    color: str = Form("#888888")
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        core_service.watermark_pdf(temp_input, text, output_file, opacity, font_size, angle, color)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"watermarked_{sanitize_filename(file.filename)}"
        return FileResponse(output_file, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Watermarking failed: " + str(e))

@app.post("/api/core/protect")
async def api_protect_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        core_service.protect_pdf(temp_input, password, output_file)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"protected_{sanitize_filename(file.filename)}"
        return FileResponse(output_file, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="AES-256 encryption failed: " + str(e))

@app.post("/api/core/unlock")
async def api_unlock_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        success = core_service.unlock_pdf(temp_input, password, output_file)
        if not success:
            cleanup_workspace(job_dir)
            raise HTTPException(status_code=400, detail="Incorrect password. Unable to unlock PDF.")
            
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"unlocked_{sanitize_filename(file.filename)}"
        return FileResponse(output_file, media_type="application/pdf", filename=safe_name)
    except HTTPException:
        cleanup_workspace(job_dir)
        raise
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Document decryption failed: " + str(e))

# ----------------- VISUAL PAGE STUDIO -----------------

@app.post("/api/visual/previews")
async def api_visual_previews(file: UploadFile = File(...)):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        previews = visual_service.get_pdf_page_previews(temp_input, max_width=320)
        cleanup_workspace(job_dir)
        return {"totalPages": len(previews), "pages": previews}
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Preview generation failed: " + str(e))

@app.post("/api/visual/apply")
async def api_visual_apply(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pages_config: str = Form(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_file = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        config = json.loads(pages_config)
        visual_service.apply_visual_transformations(temp_input, config, output_file)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"reorganized_{sanitize_filename(file.filename)}"
        return FileResponse(output_file, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Visual reorganizer failed: " + str(e))

# ----------------- FORMAT CONVERTERS -----------------

@app.post("/api/convert/pdf-to-images")
async def api_pdf_to_images(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    img_format: str = Form("png"),
    dpi: int = Form(150)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    out_dir = os.path.join(job_dir, "images_out")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        result = converter_service.pdf_to_images(temp_input, out_dir, img_format, dpi)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"{os.path.splitext(sanitize_filename(file.filename))[0]}_images.zip"
        return FileResponse(
            result["zip_path"],
            media_type="application/zip",
            filename=safe_name
        )
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="PDF to images conversion failed: " + str(e))

@app.post("/api/convert/images-to-pdf")
async def api_images_to_pdf(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    page_size: str = Form("fit"),
    orientation: str = Form("auto"),
    margin: int = Form(0)
):
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one image.")
    job_dir = create_job_workspace()
    saved_images = []
    try:
        for idx, f in enumerate(files):
            ext = os.path.splitext(f.filename or "")[1] or ".png"
            img_path = os.path.join(job_dir, f"img_{idx}{ext}")
            content = await f.read()
            with open(img_path, "wb") as out:
                out.write(content)
            saved_images.append(img_path)
            
        output_file = os.path.join(job_dir, "output.pdf")
        converter_service.images_to_pdf(saved_images, output_file, page_size, orientation, margin)
        background_tasks.add_task(cleanup_workspace, job_dir)
        return FileResponse(output_file, media_type="application/pdf", filename="created_from_images.pdf")
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Image to PDF failed: " + str(e))

@app.post("/api/convert/docx-to-pdf")
async def api_docx_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.docx")
    output_pdf = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        converter_service.docx_to_pdf(temp_input, output_pdf)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"{os.path.splitext(sanitize_filename(file.filename))[0]}.pdf"
        return FileResponse(output_pdf, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Word to PDF conversion failed: " + str(e))

@app.post("/api/convert/pptx-to-pdf")
async def api_pptx_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pptx")
    output_pdf = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        converter_service.pptx_to_pdf(temp_input, output_pdf)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"{os.path.splitext(sanitize_filename(file.filename))[0]}.pdf"
        return FileResponse(output_pdf, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="PowerPoint to PDF conversion failed: " + str(e))

@app.post("/api/convert/excel-to-pdf")
async def api_excel_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    job_dir = create_job_workspace()
    ext = os.path.splitext(file.filename or "")[1] or ".xlsx"
    temp_input = os.path.join(job_dir, f"input{ext}")
    output_pdf = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        converter_service.excel_to_pdf(temp_input, output_pdf)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"{os.path.splitext(sanitize_filename(file.filename))[0]}.pdf"
        return FileResponse(output_pdf, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Excel to PDF conversion failed: " + str(e))

@app.post("/api/convert/text-to-pdf")
async def api_text_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.txt")
    output_pdf = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        converter_service.text_to_pdf(temp_input, output_pdf)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"{os.path.splitext(sanitize_filename(file.filename))[0]}.pdf"
        return FileResponse(output_pdf, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Text to PDF conversion failed: " + str(e))

@app.post("/api/convert/md-to-pdf")
async def api_md_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.md")
    output_pdf = os.path.join(job_dir, "output.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        converter_service.markdown_to_pdf(temp_input, output_pdf)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"{os.path.splitext(sanitize_filename(file.filename))[0]}.pdf"
        return FileResponse(output_pdf, media_type="application/pdf", filename=safe_name)
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Markdown to PDF conversion failed: " + str(e))

@app.post("/api/convert/pdf-to-docx")
async def api_pdf_to_docx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    output_docx = os.path.join(job_dir, "output.docx")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        converter_service.pdf_to_docx(temp_input, output_docx)
        background_tasks.add_task(cleanup_workspace, job_dir)
        safe_name = f"{os.path.splitext(sanitize_filename(file.filename))[0]}.docx"
        return FileResponse(
            output_docx,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=safe_name
        )
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Word conversion failed: " + str(e))

@app.post("/api/convert/pdf-to-text")
async def api_pdf_to_text(file: UploadFile = File(...)):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
        text_content = converter_service.pdf_to_text(temp_input)
        cleanup_workspace(job_dir)
        return {"filename": sanitize_filename(file.filename), "text": text_content}
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Text extraction failed: " + str(e))

# ----------------- OCR STUDIO -----------------

@app.post("/api/ocr/extract")
async def api_ocr_extract(
    file: UploadFile = File(...),
    language: str = Form("eng")
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        result = ocr_service.run_ocr_on_pdf(temp_input, language)
        cleanup_workspace(job_dir)
        return result
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="OCR extraction failed: " + str(e))

# ----------------- AI DOCUMENT ASSISTANT -----------------

@app.post("/api/ai/summarize")
async def api_ai_summarize(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        res = ai_service.summarize_document(temp_input, api_key)
        cleanup_workspace(job_dir)
        return res
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="AI summarization failed: " + str(e))

@app.post("/api/ai/chat")
async def api_ai_chat(
    file: UploadFile = File(...),
    question: str = Form(...),
    api_key: Optional[str] = Form(None)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        res = ai_service.chat_with_document(temp_input, question, api_key=api_key)
        cleanup_workspace(job_dir)
        return res
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="AI document chat failed: " + str(e))

@app.post("/api/ai/extract-tables")
async def api_ai_extract_tables(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    job_dir = create_job_workspace()
    temp_input = os.path.join(job_dir, "input.pdf")
    try:
        content = await file.read()
        with open(temp_input, "wb") as out:
            out.write(content)
            
        res = ai_service.extract_tables_and_entities(temp_input, api_key=api_key)
        cleanup_workspace(job_dir)
        return res
    except Exception as e:
        cleanup_workspace(job_dir)
        raise HTTPException(status_code=500, detail="Table extraction failed: " + str(e))
