import React, { useState } from 'react';
import { 
  FileText, Image as ImageIcon, FileCode, FileDown, 
  Upload, Download, Loader2, CheckCircle, AlertCircle, ArrowRight, Copy,
  Presentation, Sheet, FileType, Settings2, Trash2, ArrowLeft
} from 'lucide-react';
import { clientImagesToPdf, clientTextToPdf } from '../services/clientPdfService';

export default function FormatConverter() {
  const [activeCategory, setActiveCategory] = useState('to_pdf'); // 'to_pdf' or 'from_pdf'
  const [activeMode, setActiveMode] = useState('img2pdf');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultUrl, setResultUrl] = useState(null);
  const [resultFileName, setResultFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Image to PDF options
  const [pageSize, setPageSize] = useState('fit');
  const [orientation, setOrientation] = useState('auto');
  const [margin, setMargin] = useState(0);

  // PDF to Image options
  const [imgFormat, setImgFormat] = useState('png');
  const [dpi, setDpi] = useState(150);

  const toPdfTools = [
    { 
      id: 'img2pdf', 
      title: 'Images / JPG to PDF', 
      desc: 'Create a clean PDF from JPG, PNG, WebP, or BMP photos with custom page sizing.', 
      icon: ImageIcon, 
      accept: 'image/jpeg,image/png,image/webp,image/bmp,image/tiff',
      multiple: true,
      color: 'text-rose-600 bg-rose-50 border-rose-200' 
    },
    { 
      id: 'docx2pdf', 
      title: 'Word (.docx) to PDF', 
      desc: 'Convert Microsoft Word (.docx, .doc) documents into pixel-perfect PDFs.', 
      icon: FileCode, 
      accept: '.docx,.doc',
      multiple: false,
      color: 'text-blue-600 bg-blue-50 border-blue-200' 
    },
    { 
      id: 'pptx2pdf', 
      title: 'PowerPoint (.pptx) to PDF', 
      desc: 'Convert slide presentations (.pptx, .ppt) into high-fidelity PDF slide decks.', 
      icon: Presentation, 
      accept: '.pptx,.ppt',
      multiple: false,
      color: 'text-amber-600 bg-amber-50 border-amber-200' 
    },
    { 
      id: 'excel2pdf', 
      title: 'Excel (.xlsx) to PDF', 
      desc: 'Convert spreadsheets (.xlsx, .xls, .csv) into clean formatted PDF sheets.', 
      icon: Sheet, 
      accept: '.xlsx,.xls,.csv',
      multiple: false,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200' 
    },
    { 
      id: 'txt2pdf', 
      title: 'Text / Markdown to PDF', 
      desc: 'Transform plain text (.txt) or formatted Markdown (.md) into a styled PDF document.', 
      icon: FileType, 
      accept: '.txt,.md',
      multiple: false,
      color: 'text-purple-600 bg-purple-50 border-purple-200' 
    },
  ];

  const fromPdfTools = [
    { 
      id: 'pdf2docx', 
      title: 'PDF to Word (.docx)', 
      desc: 'Extract tables, layout, and text into an editable Microsoft Word document.', 
      icon: FileCode, 
      accept: '.pdf',
      multiple: false,
      color: 'text-blue-600 bg-blue-50 border-blue-200' 
    },
    { 
      id: 'pdf2img', 
      title: 'PDF to Images (PNG/JPG)', 
      desc: 'Render every page to crisp high-resolution images, packaged in a ZIP download.', 
      icon: ImageIcon, 
      accept: '.pdf',
      multiple: false,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200' 
    },
    { 
      id: 'pdf2txt', 
      title: 'PDF to Clean Text', 
      desc: 'Extract clean plain text with page separators without formatting noise.', 
      icon: FileDown, 
      accept: '.pdf',
      multiple: false,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200' 
    },
  ];

  const currentToolList = activeCategory === 'to_pdf' ? toPdfTools : fromPdfTools;
  const currentMode = currentToolList.find((m) => m.id === activeMode) || currentToolList[0];

  const handleCategorySwitch = (cat) => {
    setActiveCategory(cat);
    const newTool = cat === 'to_pdf' ? 'img2pdf' : 'pdf2docx';
    setActiveMode(newTool);
    setFiles([]);
    setResultUrl(null);
    setExtractedText('');
    setErrorMsg('');
  };

  const handleFileChange = (e) => {
    setErrorMsg('');
    setResultUrl(null);
    setExtractedText('');
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select a file to convert.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setResultUrl(null);
    setExtractedText('');

    const formData = new FormData();

    try {
      let endpoint = '';
      let defaultName = 'output.pdf';

      if (activeMode === 'img2pdf') {
        try {
          const clientBlob = await clientImagesToPdf(files, pageSize, orientation, margin);
          setResultUrl(window.URL.createObjectURL(clientBlob));
          setResultFileName('created_from_images.pdf');
          setLoading(false);
          return;
        } catch (clientErr) {
          console.warn('Client-side image conversion fallback to server:', clientErr);
          // Fall through to server endpoint
          endpoint = '/api/convert/images-to-pdf';
          files.forEach((f) => formData.append('files', f));
          formData.append('page_size', pageSize);
          formData.append('orientation', orientation);
          formData.append('margin', margin);
          defaultName = 'created_from_images.pdf';
        }
      } 
      else if (activeMode === 'txt2pdf' && !files[0].name.endsWith('.md')) {
        try {
          const clientBlob = await clientTextToPdf(files[0]);
          setResultUrl(window.URL.createObjectURL(clientBlob));
          setResultFileName(`${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`);
          setLoading(false);
          return;
        } catch (clientErr) {
          console.warn('Client-side text conversion fallback to server:', clientErr);
          endpoint = '/api/convert/text-to-pdf';
          formData.append('file', files[0]);
          defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
        }
      }
      else if (activeMode === 'docx2pdf') {
        endpoint = '/api/convert/docx-to-pdf';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
      }
      else if (activeMode === 'pptx2pdf') {
        endpoint = '/api/convert/pptx-to-pdf';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
      }
      else if (activeMode === 'excel2pdf') {
        endpoint = '/api/convert/excel-to-pdf';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
      }
      else if (activeMode === 'txt2pdf') {
        endpoint = '/api/convert/md-to-pdf';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
      }
      else if (activeMode === 'pdf2docx') {
        endpoint = '/api/convert/pdf-to-docx';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace('.pdf', '')}.docx`;
      }
      else if (activeMode === 'pdf2img') {
        endpoint = '/api/convert/pdf-to-images';
        formData.append('file', files[0]);
        formData.append('img_format', imgFormat);
        formData.append('dpi', dpi);
        defaultName = `${files[0].name.replace('.pdf', '')}_images.zip`;
      }
      else if (activeMode === 'pdf2txt') {
        endpoint = '/api/convert/pdf-to-text';
        formData.append('file', files[0]);
      }

      const res = await fetch(endpoint, { method: 'POST', body: formData });
      
      if (!res.ok) {
        let errDetail = 'Conversion failed.';
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      if (activeMode === 'pdf2txt') {
        const data = await res.json();
        setExtractedText(data.text);
      } else {
        const blob = await res.blob();
        setResultUrl(window.URL.createObjectURL(blob));
        setResultFileName(defaultName);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Conversion encountered an error.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create & Convert Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Turn JPG, Word, PowerPoint, Excel, and Text into PDFs — or convert PDFs to editable Office & Image formats.
        </p>
      </div>

      {/* Main Switcher: Create PDF vs Convert From PDF */}
      <div className="flex justify-center">
        <div className="bg-slate-200/80 p-1 rounded-2xl flex flex-col sm:flex-row items-center gap-1 border border-slate-300/60 shadow-xs w-full sm:w-auto">
          <button
            onClick={() => handleCategorySwitch('to_pdf')}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'to_pdf'
                ? 'bg-red-600 text-white shadow-sm scale-[1.01]'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/40'
            }`}
          >
            ➕ Create PDF (From Images, Word, PPT, Excel, Text)
          </button>
          <button
            onClick={() => handleCategorySwitch('from_pdf')}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'from_pdf'
                ? 'bg-red-600 text-white shadow-sm scale-[1.01]'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/40'
            }`}
          >
            🔄 Convert From PDF (To Word, Images, Text)
          </button>
        </div>
      </div>

      {/* Tool Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${activeCategory === 'to_pdf' ? 'lg:grid-cols-3 xl:grid-cols-5' : 'lg:grid-cols-3'} gap-3.5`}>
        {currentToolList.map((tool) => {
          const Icon = tool.icon;
          const isSelected = activeMode === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveMode(tool.id);
                setFiles([]);
                setResultUrl(null);
                setExtractedText('');
                setErrorMsg('');
              }}
              className={`group p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer interactive-card ${
                isSelected
                  ? 'border-red-500 bg-red-50/40 shadow-sm ring-2 ring-red-500/20 scale-[1.01]'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 transition-transform duration-200 group-hover:scale-110 shadow-xs ${tool.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 group-hover:text-red-600 transition-colors">{tool.title}</div>
                <div className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{tool.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Workstation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${currentMode?.color}`}>
            {currentMode && <currentMode.icon className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{currentMode?.title}</h2>
            <p className="text-xs text-slate-500">{currentMode?.desc}</p>
          </div>
        </div>

        {/* Upload Box */}
        <div className="mt-6">
          <div className="relative border-2 border-dashed border-slate-300 hover:border-red-400 bg-slate-50/60 hover:bg-red-50/20 rounded-xl p-8 text-center transition-all cursor-pointer">
            <input
              type="file"
              accept={currentMode.accept}
              multiple={currentMode.multiple}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center pointer-events-none">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                {files.length > 0
                  ? `${files.length} file(s) selected: ${files.map((f) => f.name).join(', ')}`
                  : `Select ${currentMode.title.split(' ')[0]} file(s)`}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Accepted: {currentMode.accept} • Converted 100% locally
              </p>
            </div>
          </div>
        </div>

        {/* File previews list if multiple files selected */}
        {files.length > 0 && currentMode.multiple && (
          <div className="mt-4 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs text-slate-700 border border-slate-200">
                <span className="truncate max-w-[200px]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Config Options for Image to PDF */}
        {activeMode === 'img2pdf' && (
          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Page Sizing</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="fit">Fit to Image Size (Exact Photo Dimensions)</option>
                <option value="a4">Standard A4 (595 x 842 pt)</option>
                <option value="letter">US Letter (612 x 792 pt)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Page Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="auto">Auto (Detects Landscape / Portrait)</option>
                <option value="portrait">Portrait (Vertical)</option>
                <option value="landscape">Landscape (Horizontal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Margins</label>
              <select
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value={0}>No Margins (Edge-to-Edge)</option>
                <option value={15}>Small Margin (15 pt)</option>
                <option value={30}>Wide Margin (30 pt)</option>
              </select>
            </div>
          </div>
        )}

        {/* Options for PDF to Image */}
        {activeMode === 'pdf2img' && (
          <div className="mt-6 flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Image Format</label>
              <select
                value={imgFormat}
                onChange={(e) => setImgFormat(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="png">PNG (Lossless & Crisp)</option>
                <option value="jpg">JPG (Smaller file size)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Resolution (DPI)</label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value={72}>72 DPI (Web)</option>
                <option value={150}>150 DPI (High Clarity - Recommended)</option>
                <option value={300}>300 DPI (Ultra Print Quality)</option>
              </select>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action button */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleConvert}
            disabled={loading || files.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Converting...</span>
              </>
            ) : (
              <>
                <span>Execute {currentMode?.title}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Download button */}
          {resultUrl && (
            <a
              href={resultUrl}
              download={resultFileName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download {resultFileName}</span>
            </a>
          )}
        </div>

        {/* Extracted Text display */}
        {extractedText && (
          <div className="mt-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <span className="text-xs font-bold text-slate-800">Extracted Plain Text</span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={12}
              value={extractedText}
              className="w-full text-xs font-mono bg-white p-3 rounded-lg border border-slate-200 text-slate-800 focus:outline-none"
            />
          </div>
        )}

      </div>
    </div>
  );
}
