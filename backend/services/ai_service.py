import os
from typing import Dict, Any, List, Optional
import fitz  # PyMuPDF

def extract_pdf_context(file_path: str, max_chars: int = 150000) -> str:
    """Extracts text from PDF up to character limit for LLM context window."""
    doc = fitz.open(file_path)
    text_chunks = []
    total_len = 0
    
    for i, page in enumerate(doc):
        page_text = page.get_text("text").strip()
        if page_text:
            chunk = f"--- [Page {i+1}] ---\n{page_text}\n"
            text_chunks.append(chunk)
            total_len += len(chunk)
            if total_len > max_chars:
                break
                
    doc.close()
    return "\n".join(text_chunks)

def get_gemini_model(api_key: Optional[str] = None):
    """Initializes Gemini model with key from parameter or environment."""
    key = api_key or os.environ.get("GEMINI_API_KEY")
    if not key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=key)
        # Use gemini-1.5-flash or gemini-2.0-flash
        return genai.GenerativeModel("gemini-1.5-flash")
    except Exception:
        return None

def summarize_document(file_path: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Generates an executive summary and key takeaways of the document."""
    context = extract_pdf_context(file_path)
    if not context.strip():
        return {
            "success": False,
            "error": "No text content could be extracted from this document."
        }
        
    model = get_gemini_model(api_key)
    if not model:
        # Provide helpful built-in analysis fallback when API key is missing
        lines = [line.strip() for line in context.split("\n") if line.strip()]
        first_lines = lines[:15]
        return {
            "success": True,
            "isOfflineMock": True,
            "summary": "### ⚠️ Gemini API Key Required for Live AI Processing\n\nYou can input your free Google Gemini API key in the top settings bar to enable live AI analysis.\n\n#### Document Overview:\n- **Total Extracted Text Length:** " + f"{len(context):,} characters\n" +
            "- **Sample Heading:** " + (first_lines[0] if first_lines else "Untitled") + "\n\n" +
            "#### Preview of Content:\n" + "\n".join([f"> {l}" for l in first_lines[:8]])
        }
        
    prompt = f"""You are a professional document analysis expert. Analyze the following document and provide:
1. **Executive Summary**: A concise 2-3 paragraph overview of what the document is about.
2. **Key Takeaways & Highlights**: 4-6 bullet points of crucial insights.
3. **Important Dates, Figures, or Obligations**: Any specific deadlines, financial values, or key commitments.
4. **Suggested Next Steps / Action Items** (if applicable).

DOCUMENT CONTENT:
{context}
"""
    try:
        response = model.generate_content(prompt)
        return {
            "success": True,
            "isOfflineMock": False,
            "summary": response.text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def chat_with_document(file_path: str, question: str, chat_history: Optional[List[Dict[str, str]]] = None, api_key: Optional[str] = None) -> Dict[str, Any]:
    """Answers specific questions strictly based on document content."""
    context = extract_pdf_context(file_path)
    model = get_gemini_model(api_key)
    
    if not model:
        return {
            "success": True,
            "isOfflineMock": True,
            "answer": "To get live AI answers grounded in this PDF, please enter your Gemini API key in the settings above. (Get a free key from Google AI Studio at https://aistudio.google.com/)."
        }
        
    system_instruction = f"""You are an intelligent PDF research assistant. Answer the user's question accurately using ONLY the document content provided below.
If the answer cannot be found in the document, explicitly say: "This information is not mentioned in the provided document."
Always cite the relevant page number when possible (e.g. '[Page 2]').

DOCUMENT CONTENT:
{context}
"""
    try:
        prompt = f"{system_instruction}\n\nUSER QUESTION: {question}"
        response = model.generate_content(prompt)
        return {
            "success": True,
            "isOfflineMock": False,
            "answer": response.text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def extract_tables_and_entities(file_path: str, extraction_type: str = "tables", api_key: Optional[str] = None) -> Dict[str, Any]:
    """Extracts tables, financial numbers, or key structured entities into Markdown / JSON."""
    context = extract_pdf_context(file_path)
    model = get_gemini_model(api_key)
    
    if not model:
        return {
            "success": True,
            "isOfflineMock": True,
            "data": "Enter your Gemini API key to automatically parse and structure tables, invoices, line items, and form fields into Markdown tables."
        }
        
    prompt = f"""Inspect the following document text and extract all tabular data, structured lists, key financial figures, or form entities.
Format the output as clean Markdown tables with column headers.

DOCUMENT CONTENT:
{context}
"""
    try:
        response = model.generate_content(prompt)
        return {
            "success": True,
            "isOfflineMock": False,
            "data": response.text
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
