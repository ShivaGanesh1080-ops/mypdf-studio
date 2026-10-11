# 🚀 MyPDF Studio — Your Personal, Private & AI-Powered PDF Suite

A modern, high-performance alternative to commercial tools like **iLovePDF**, running **100% locally on your computer** with **zero file size limits**, **complete privacy**, and **cutting-edge Gemini AI integration**.

---

## ⚡ Quick Start (One-Click Launch)

### On Windows:
Double-click `run_app.bat` or run in PowerShell:
```powershell
.\start.ps1
```
This automatically starts:
- **FastAPI Backend**: `http://127.0.0.1:8000`
- **React + Tailwind Frontend**: `http://localhost:5173`
- Opens your browser directly to the studio!

---

## ⚖️ iLovePDF vs. MyPDF Studio: In-Depth Comparison

| Feature / Criteria | iLovePDF (Commercial Cloud) | MyPDF Studio (Your Local App) |
| :--- | :--- | :--- |
| **Data Privacy & Security** | ❌ **Cloud Risk**: Files uploaded to 3rd-party remote servers. High risk for contracts, tax forms, or sensitive ID data. | ✅ **100% Private**: Runs exclusively on your device (`localhost`). Files never leave your machine. |
| **File Size & Batch Caps** | ❌ **Strict Limits**: Free tier caps at 15MB - 100MB per file and 1-3 files per batch. | ✅ **No Limits**: Process 500MB+ files, unlimited pages, unlimited batches. |
| **Usage Throttling** | ❌ **Task Limits**: "You've reached your free hourly limit, upgrade to Premium". | ✅ **Unlimited**: Run as many operations as you want, forever. |
| **AI Document Assistant** | ❌ **None**: No Chat with PDF, no executive summary, no automated table extraction. | ✅ **Built-in Gemini AI**: Summarize 100-page documents, chat with page citations, extract tables to Markdown/JSON. |
| **Visual Page Studio** | ⚠️ Basic page arranger on web | ✅ **Interactive Studio**: Real-time thumbnail previews, per-page rotation (90°/180°/270°), duplicate, exclude, and reorder. |
| **OCR (Optical Recognition)**| ❌ **Paywalled**: Requires paid monthly subscription. | ✅ **Included Free**: Embedded text extraction and optical character recognition. |
| **Format Conversion** | ⚠️ Good, but Word conversion is rate-limited on free tier. | ✅ **Included**: High-fidelity PDF to Word (`.docx`), PDF to Images (`.zip`), Images to PDF, and Plain Text. |
| **Offline Mode** | ❌ Requires continuous high-speed internet connection. | ✅ **100% Offline-Ready**: Works without internet (except live Gemini AI queries). |
| **Cost & Ads** | ❌ \$7 - \$10 / month subscription + ads on free tier. | ✅ **100% Free & Open Source**: No ads, no tracking. |

### Limitations of MyPDF Studio to Keep in Mind:
1. **Local System Resources**: Large 1,000-page OCR or rendering heavy vector blueprints depends on your computer's CPU and RAM.
2. **Complex Layout Reflow**: Converts standard PDFs, forms, and tables to editable Word (`.docx`) accurately; complex artistic magazines with overlapping multi-layer floating vectors may require minor margin adjustments.
3. **Scanned Images OCR**: Scanned documents with degraded handwriting or low-DPI photos perform best when Tesseract OCR is installed on Windows.

---

## 🌟 Feature Breakdown

### 1. 🛠️ Core Power Tools
- **Merge PDFs**: Concatenate multiple PDF documents seamlessly.
- **Split PDF**: Extract page ranges (e.g. `1-3, 5, 8-12`) into a new file.
- **Rotate PDF**: Rotate selected pages or entire documents 90°, 180°, or 270°.
- **Delete Pages**: Strip unwanted pages effortlessly.
- **Compress PDF**: Multi-level stream deflating, font deduplication, and image optimization with live byte-savings metrics.
- **Add Watermark**: Stamp custom watermark text across all pages with custom opacity, font size, angle, and color.
- **Protect PDF**: Strong AES-256 password encryption.
- **Unlock PDF**: Decrypt password-protected files.

### 2. 📑 Visual Page Studio
- Upload any PDF to view a grid of high-resolution page thumbnails.
- Reorder pages with interactive left/right controls.
- Rotate individual pages independently.
- Exclude/delete or duplicate pages with instant visual feedback.
- Export reorganized document with one click.

### 3. ➕ Create & Convert Studio
#### ➕ Create PDF From:
- **Images / JPG to PDF**: Batch convert JPG, PNG, WebP, BMP, TIFF photos into a PDF with configurable page sizing (Fit-to-Image, A4, Letter), orientation (Auto, Portrait, Landscape), and margins.
- **Word (.docx, .doc) to PDF**: Convert Microsoft Word documents to PDF with 100% native layout precision using your installed Office engine.
- **PowerPoint (.pptx, .ppt) to PDF**: Convert slide presentations into high-fidelity PDF slide decks.
- **Excel (.xlsx, .xls, .csv) to PDF**: Convert spreadsheets and workbooks into clean formatted PDF sheets.
- **Text / Markdown (.txt, .md) to PDF**: Transform notes and documentation into styled PDFs with proper typography and headings.

#### 🔄 Convert From PDF To:
- **PDF to Images**: Convert pages to high-resolution PNG or JPG at 72, 150, or 300 DPI, packaged in a `.zip` download.
- **PDF to Word (.docx)**: Convert layout and text into editable Microsoft Word documents.
- **PDF to Text / Markdown**: Extract clean readable text with copy and download options.

### 4. 👁️ Advanced OCR Studio
- Extract text from scanned contracts, invoices, and documents.
- Supports multi-language recognition (English, Spanish, French, German, Italian, Hindi).
- Real-time word count and instant `.txt` export.

### 5. 🤖 AI Document Assistant (Gemini)
- **Executive Summary**: Generates high-level summaries, bullet points, key dates, obligations, and action items.
- **Chat with PDF**: Ask questions directly to your document with page citations.
- **Table & Financial Extractor**: Detects tables and invoices, converting them into structured Markdown tables.

---

## 🏗️ Architecture

```
mypdf-studio/
├── backend/
│   ├── services/
│   │   ├── core_service.py       # PyMuPDF & pypdf operations
│   │   ├── visual_service.py     # High-res thumbnail rendering & page mapping
│   │   ├── converter_service.py  # PDF to DOCX, Images, and Text
│   │   ├── ocr_service.py        # Optical character recognition
│   │   └── ai_service.py         # Google Gemini AI integration
│   ├── main.py                   # FastAPI REST API endpoints
│   ├── test_suite.py             # Automated end-to-end self test
│   ├── requirements.txt          # Python dependencies
│   └── .venv/                    # Virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── CoreTools.jsx
│   │   │   ├── VisualStudio.jsx
│   │   │   ├── FormatConverter.jsx
│   │   │   ├── OcrStudio.jsx
│   │   │   ├── AiAssistant.jsx
│   │   │   └── ComparisonModal.jsx
│   │   ├── App.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
├── run_app.bat                   # One-click Windows batch launcher
├── start.ps1                     # One-click PowerShell launcher
└── README.md
```
