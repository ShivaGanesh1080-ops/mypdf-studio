import base64
from typing import List, Dict, Any
import fitz  # PyMuPDF

def get_pdf_page_previews(file_path: str, max_width: int = 300) -> List[Dict[str, Any]]:
    """
    Renders every page of the PDF into a base64-encoded thumbnail image
    along with page metadata (dimensions, original index, rotation).
    """
    doc = fitz.open(file_path)
    previews = []
    
    for i, page in enumerate(doc):
        rect = page.rect
        scale = max_width / max(rect.width, 1.0)
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        img_bytes = pix.tobytes("jpeg")
        b64_str = base64.b64encode(img_bytes).decode("utf-8")
        
        previews.append({
            "pageNumber": i + 1,
            "originalIndex": i,
            "width": int(rect.width),
            "height": int(rect.height),
            "rotation": page.rotation,
            "thumbnail": f"data:image/jpeg;base64,{b64_str}"
        })
        
    doc.close()
    return previews

def apply_visual_transformations(file_path: str, pages_config: List[Dict[str, Any]], output_path: str) -> str:
    """
    Applies reordering, per-page rotation, and page omission from the Visual Page Studio.
    Each item in pages_config:
      - originalIndex: int (0-based)
      - rotationDelta: int (0, 90, 180, 270)
      - included: bool
    """
    src_doc = fitz.open(file_path)
    new_doc = fitz.open()
    
    for item in pages_config:
        if not item.get("included", True):
            continue
            
        orig_idx = item["originalIndex"]
        rot_delta = item.get("rotationDelta", 0)
        
        if 0 <= orig_idx < len(src_doc):
            # Insert page from source into destination
            new_doc.insert_pdf(src_doc, from_page=orig_idx, to_page=orig_idx)
            # The newly inserted page is at new_doc[-1]
            last_page = new_doc[-1]
            if rot_delta:
                last_page.set_rotation((last_page.rotation + rot_delta) % 360)
                
    new_doc.save(output_path)
    new_doc.close()
    src_doc.close()
    return output_path
