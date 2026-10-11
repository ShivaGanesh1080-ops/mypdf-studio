import os
import shutil
import tempfile
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from services import core_service, visual_service, converter_service, ocr_service, ai_service

app = FastAPI(title="MyPDF Studio API", version="1.0.0")

# Enable CORS for local Vite dev server and production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = os.path.join(tempfile.gettempdir(), "mypdf_studio")
os.makedirs(TEMP_DIR, exist_ok=True)

def cleanup_file(path: str):
    """Background task to remove temporary files after response is sent."""
    try:
        if os.path.isfile(path):
            os.remove(path)
        elif os.path.isdir(path):
            shutil.rmtree(path)
    except Exception:
        pass

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "MyPDF Studio", "version": "1.0.0"}

# ----------------- CORE PDF OPERATIONS -----------------

@app.post("/api/core/merge")
async def api_merge_pdfs(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Please upload at least 2 PDF files to merge.")
    
    saved_paths = []
    try:
        for f in files:
            temp_path = os.path.join(TEMP_DIR, f"merge_{f.filename}")
            with open(temp_path, "wb") as out:
                content = await f.read()
                out.write(content)
            saved_paths.append(temp_path)
            
        output_file = os.path.join(TEMP_DIR, "merged_document.pdf")
        core_service.merge_pdfs(saved_paths, output_file)
        
        for p in saved_paths:
            cleanup_file(p)
            
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename="merged_document.pdf")
    except Exception as e:
        for p in saved_paths:
            cleanup_file(p)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/core/split")
async def api_split_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    page_range: str = Form("1")
):
    temp_input = os.path.join(TEMP_DIR, f"input_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"split_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        core_service.split_pdf(temp_input, page_range, output_file)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename=f"split_{file.filename}")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/core/rotate")
async def api_rotate_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    angle: int = Form(90),
    page_range: str = Form("all")
):
    temp_input = os.path.join(TEMP_DIR, f"rotate_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"rotated_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        core_service.rotate_pdf(temp_input, angle, page_range, output_file)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename=f"rotated_{file.filename}")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/core/delete-pages")
async def api_delete_pages(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pages_to_delete: str = Form(...)
):
    temp_input = os.path.join(TEMP_DIR, f"del_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"trimmed_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        core_service.delete_pages(temp_input, pages_to_delete, output_file)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename=f"trimmed_{file.filename}")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/core/compress")
async def api_compress_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    quality: str = Form("medium")
):
    temp_input = os.path.join(TEMP_DIR, f"comp_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"compressed_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        stats = core_service.compress_pdf(temp_input, quality, output_file)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_file)
        
        # We can return the file directly and pass savings info in headers
        response = FileResponse(output_file, media_type="application/pdf", filename=f"compressed_{file.filename}")
        response.headers["X-Original-Size"] = str(stats["original_size"])
        response.headers["X-New-Size"] = str(stats["new_size"])
        response.headers["X-Saved-Percent"] = str(stats["saved_percent"])
        response.headers["Access-Control-Expose-Headers"] = "X-Original-Size, X-New-Size, X-Saved-Percent"
        return response
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

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
    temp_input = os.path.join(TEMP_DIR, f"wm_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"watermarked_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        core_service.watermark_pdf(temp_input, text, output_file, opacity, font_size, angle, color)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename=f"watermarked_{file.filename}")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/core/protect")
async def api_protect_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    temp_input = os.path.join(TEMP_DIR, f"prot_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"protected_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        core_service.protect_pdf(temp_input, password, output_file)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename=f"protected_{file.filename}")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/core/unlock")
async def api_unlock_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    password: str = Form(...)
):
    temp_input = os.path.join(TEMP_DIR, f"unlock_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"unlocked_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        success = core_service.unlock_pdf(temp_input, password, output_file)
        cleanup_file(temp_input)
        if not success:
            raise HTTPException(status_code=400, detail="Incorrect password. Unable to unlock PDF.")
            
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename=f"unlocked_{file.filename}")
    except HTTPException:
        raise
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- VISUAL PAGE STUDIO -----------------

@app.post("/api/visual/previews")
async def api_visual_previews(file: UploadFile = File(...)):
    temp_input = os.path.join(TEMP_DIR, f"vis_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        previews = visual_service.get_pdf_page_previews(temp_input, max_width=320)
        cleanup_file(temp_input)
        return {"totalPages": len(previews), "pages": previews}
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/visual/apply")
async def api_visual_apply(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pages_config: str = Form(...)  # JSON string of List[Dict]
):
    temp_input = os.path.join(TEMP_DIR, f"vis_apply_{file.filename}")
    output_file = os.path.join(TEMP_DIR, f"reorganized_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        config = json.loads(pages_config)
        visual_service.apply_visual_transformations(temp_input, config, output_file)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename=f"reorganized_{file.filename}")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- FORMAT CONVERTERS -----------------

@app.post("/api/convert/pdf-to-images")
async def api_pdf_to_images(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    img_format: str = Form("png"),
    dpi: int = Form(150)
):
    temp_input = os.path.join(TEMP_DIR, f"p2i_{file.filename}")
    out_dir = os.path.join(TEMP_DIR, f"p2i_out_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        result = converter_service.pdf_to_images(temp_input, out_dir, img_format, dpi)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, out_dir)
        return FileResponse(
            result["zip_path"],
            media_type="application/zip",
            filename=os.path.basename(result["zip_path"])
        )
    except Exception as e:
        cleanup_file(temp_input)
        cleanup_file(out_dir)
        raise HTTPException(status_code=500, detail=str(e))

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
    saved_images = []
    try:
        for f in files:
            img_path = os.path.join(TEMP_DIR, f"img_{f.filename}")
            with open(img_path, "wb") as out:
                out.write(await f.read())
            saved_images.append(img_path)
            
        output_file = os.path.join(TEMP_DIR, "images_combined.pdf")
        converter_service.images_to_pdf(saved_images, output_file, page_size, orientation, margin)
        for p in saved_images:
            cleanup_file(p)
            
        background_tasks.add_task(cleanup_file, output_file)
        return FileResponse(output_file, media_type="application/pdf", filename="images_combined.pdf")
    except Exception as e:
        for p in saved_images:
            cleanup_file(p)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert/docx-to-pdf")
async def api_docx_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_input = os.path.join(TEMP_DIR, f"in_{file.filename}")
    base_name = os.path.splitext(file.filename)[0]
    output_pdf = os.path.join(TEMP_DIR, f"{base_name}.pdf")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        converter_service.docx_to_pdf(temp_input, output_pdf)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_pdf)
        return FileResponse(output_pdf, media_type="application/pdf", filename=f"{base_name}.pdf")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=f"Word to PDF error: {str(e)}")

@app.post("/api/convert/pptx-to-pdf")
async def api_pptx_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_input = os.path.join(TEMP_DIR, f"in_{file.filename}")
    base_name = os.path.splitext(file.filename)[0]
    output_pdf = os.path.join(TEMP_DIR, f"{base_name}.pdf")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        converter_service.pptx_to_pdf(temp_input, output_pdf)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_pdf)
        return FileResponse(output_pdf, media_type="application/pdf", filename=f"{base_name}.pdf")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=f"PowerPoint to PDF error: {str(e)}")

@app.post("/api/convert/excel-to-pdf")
async def api_excel_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_input = os.path.join(TEMP_DIR, f"in_{file.filename}")
    base_name = os.path.splitext(file.filename)[0]
    output_pdf = os.path.join(TEMP_DIR, f"{base_name}.pdf")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        converter_service.excel_to_pdf(temp_input, output_pdf)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_pdf)
        return FileResponse(output_pdf, media_type="application/pdf", filename=f"{base_name}.pdf")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=f"Excel to PDF error: {str(e)}")

@app.post("/api/convert/text-to-pdf")
async def api_text_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_input = os.path.join(TEMP_DIR, f"in_{file.filename}")
    base_name = os.path.splitext(file.filename)[0]
    output_pdf = os.path.join(TEMP_DIR, f"{base_name}.pdf")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        converter_service.text_to_pdf(temp_input, output_pdf)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_pdf)
        return FileResponse(output_pdf, media_type="application/pdf", filename=f"{base_name}.pdf")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=f"Text to PDF error: {str(e)}")

@app.post("/api/convert/md-to-pdf")
async def api_md_to_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_input = os.path.join(TEMP_DIR, f"in_{file.filename}")
    base_name = os.path.splitext(file.filename)[0]
    output_pdf = os.path.join(TEMP_DIR, f"{base_name}.pdf")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        converter_service.markdown_to_pdf(temp_input, output_pdf)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_pdf)
        return FileResponse(output_pdf, media_type="application/pdf", filename=f"{base_name}.pdf")
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=f"Markdown to PDF error: {str(e)}")

@app.post("/api/convert/pdf-to-docx")
async def api_pdf_to_docx(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_input = os.path.join(TEMP_DIR, f"docx_in_{file.filename}")
    base_name = os.path.splitext(file.filename)[0]
    output_docx = os.path.join(TEMP_DIR, f"{base_name}.docx")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        converter_service.pdf_to_docx(temp_input, output_docx)
        cleanup_file(temp_input)
        background_tasks.add_task(cleanup_file, output_docx)
        return FileResponse(
            output_docx,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"{base_name}.docx"
        )
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=f"Word conversion error: {str(e)}")

@app.post("/api/convert/pdf-to-text")
async def api_pdf_to_text(file: UploadFile = File(...)):
    temp_input = os.path.join(TEMP_DIR, f"txt_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
        text_content = converter_service.pdf_to_text(temp_input)
        cleanup_file(temp_input)
        return {"filename": file.filename, "text": text_content}
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- OCR STUDIO -----------------

@app.post("/api/ocr/extract")
async def api_ocr_extract(
    file: UploadFile = File(...),
    language: str = Form("eng")
):
    temp_input = os.path.join(TEMP_DIR, f"ocr_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        result = ocr_service.run_ocr_on_pdf(temp_input, language)
        cleanup_file(temp_input)
        return result
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- AI DOCUMENT ASSISTANT -----------------

@app.post("/api/ai/summarize")
async def api_ai_summarize(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    temp_input = os.path.join(TEMP_DIR, f"ai_sum_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        res = ai_service.summarize_document(temp_input, api_key)
        cleanup_file(temp_input)
        return res
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/chat")
async def api_ai_chat(
    file: UploadFile = File(...),
    question: str = Form(...),
    api_key: Optional[str] = Form(None)
):
    temp_input = os.path.join(TEMP_DIR, f"ai_chat_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        res = ai_service.chat_with_document(temp_input, question, api_key=api_key)
        cleanup_file(temp_input)
        return res
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/extract-tables")
async def api_ai_extract_tables(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None)
):
    temp_input = os.path.join(TEMP_DIR, f"ai_tab_{file.filename}")
    try:
        with open(temp_input, "wb") as out:
            out.write(await file.read())
            
        res = ai_service.extract_tables_and_entities(temp_input, api_key=api_key)
        cleanup_file(temp_input)
        return res
    except Exception as e:
        cleanup_file(temp_input)
        raise HTTPException(status_code=500, detail=str(e))
