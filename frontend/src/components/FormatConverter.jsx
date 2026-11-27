import React, { useState } from 'react';
import { 
  FileText, Image as ImageIcon, FileCode, FileDown, 
  Upload, Download, Loader2, CheckCircle, AlertCircle, ArrowRight, Copy,
  Presentation, Sheet, FileType, Settings2, Trash2, ArrowLeft, FilePlus2, ArrowRightLeft,
  Info, Cpu, Eye, EyeOff
} from 'lucide-react';
import PdfPreview from './PdfPreview';
import { 
  clientImagesToPdf, 
  clientTextToPdf, 
  clientExtractPdfText, 
  clientPdfToImages,
  clientCsvToPdf,
  clientMarkdownToPdf
} from '../services/clientPdfService';

export default function FormatConverter({ backendHealthy }) {
  const [activeCategory, setActiveCategory] = useState('to_pdf'); // 'to_pdf' or 'from_pdf'
  const [activeMode, setActiveMode] = useState('img2pdf');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultUrl, setResultUrl] = useState(null);
  const [resultFileName, setResultFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewInputPdf, setPreviewInputPdf] = useState(false);
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
      mode: 'Local',
      color: 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-900/60' 
    },
    { 
      id: 'txt2pdf', 
      title: 'Text / Plain Text to PDF', 
      desc: 'Transform plain text (.txt) with zero-loss word wrapping and multi-page pagination.', 
      icon: FileType, 
      accept: '.txt,.text',
      multiple: false,
      mode: 'Local',
      color: 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950/40 dark:border-purple-900/60' 
    },
    { 
      id: 'md2pdf', 
      title: 'Markdown (.md) to PDF', 
      desc: 'Convert formatted Markdown documents with headings, lists, code boxes & blockquotes.', 
      icon: FileCode, 
      accept: '.md,.markdown',
      multiple: false,
      mode: 'Local',
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-950/40 dark:border-cyan-900/60' 
    },
    { 
      id: 'csv2pdf', 
      title: 'CSV Table to PDF', 
      desc: 'Transform comma-separated spreadsheets (.csv) into styled, paginated PDF tables in browser.', 
      icon: Sheet, 
      accept: '.csv',
      multiple: false,
      mode: 'Local',
      color: 'text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-950/40 dark:border-teal-900/60' 
    },
    { 
      id: 'docx2pdf', 
      title: 'Word (.docx) to PDF', 
      desc: 'Convert Microsoft Word (.docx, .doc) documents into PDFs.', 
      icon: FileCode, 
      accept: '.docx,.doc',
      multiple: false,
      mode: 'Server Required',
      color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900/60' 
    },
    { 
      id: 'pptx2pdf', 
      title: 'PowerPoint (.pptx) to PDF', 
      desc: 'Convert slide presentations (.pptx, .ppt) into PDF slide decks.', 
      icon: Presentation, 
      accept: '.pptx,.ppt',
      multiple: false,
      mode: 'Server Required',
      color: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/60' 
    },
    { 
      id: 'excel2pdf', 
      title: 'Excel (.xlsx) to PDF', 
      desc: 'Convert spreadsheets (.xlsx, .xls) into clean PDF sheets.', 
      icon: Sheet, 
      accept: '.xlsx,.xls,.csv',
      multiple: false,
      mode: 'Server Required',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/60' 
    },
  ];

  const fromPdfTools = [
    { 
      id: 'pdf2txt', 
      title: 'PDF to Clean Text', 
      desc: 'Extract clean digital text stream from pages directly inside browser memory.', 
      icon: FileDown, 
      accept: '.pdf',
      multiple: false,
      mode: 'Local',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900/60' 
    },
    { 
      id: 'pdf2img', 
      title: 'PDF to Images (PNG/JPG)', 
      desc: 'Render every page to crisp high-resolution images, packaged in a ZIP download in browser RAM.', 
      icon: ImageIcon, 
      accept: '.pdf',
      multiple: false,
      mode: 'Local',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/60' 
    },
    { 
      id: 'pdf2docx', 
      title: 'PDF to Word (.docx)', 
      desc: 'Extract tables, layout, and text into an editable Microsoft Word document.', 
      icon: FileCode, 
      accept: '.pdf',
      multiple: false,
      mode: 'Server Required',
      color: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-900/60' 
    },
  ];

  const currentToolList = activeCategory === 'to_pdf' ? toPdfTools : fromPdfTools;
  const currentMode = currentToolList.find((m) => m.id === activeMode) || currentToolList[0];

  const handleCategorySwitch = (cat) => {
    setActiveCategory(cat);
    const newTool = cat === 'to_pdf' ? 'img2pdf' : 'pdf2txt';
    setActiveMode(newTool);
    setFiles([]);
    setResultUrl(null);
    setShowPreview(false);
    setPreviewInputPdf(false);
    setExtractedText('');
    setErrorMsg('');
  };

  const handleFileChange = (e) => {
    setErrorMsg('');
    if (resultUrl) {
      window.URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setShowPreview(false);
    setPreviewInputPdf(false);
    setExtractedText('');
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviewInputPdf(false);
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select a file to convert.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setShowPreview(false);
    if (resultUrl) {
      window.URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
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
          console.warn('Client-side image conversion error:', clientErr);
          throw new Error('In-browser image conversion failed: ' + (clientErr.message || 'Invalid image'));
        }
      } 
      else if (activeMode === 'txt2pdf') {
        try {
          const clientBlob = await clientTextToPdf(files[0]);
          setResultUrl(window.URL.createObjectURL(clientBlob));
          setResultFileName(`${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`);
          setLoading(false);
          return;
        } catch (clientErr) {
          console.warn('Client-side text conversion error:', clientErr);
          throw new Error('Text to PDF conversion error: ' + (clientErr.message || 'Failed'));
        }
      }
      else if (activeMode === 'pdf2txt') {
        try {
          const textResult = await clientExtractPdfText(files[0]);
          setExtractedText(textResult.fullText || 'No extractable digital text stream found in document.');
          setLoading(false);
          return;
        } catch (extractErr) {
          throw new Error('Digital text extraction error: ' + (extractErr.message || 'Failed to read PDF'));
        }
      }
      else if (activeMode === 'pdf2img') {
        try {
          const zipBlob = await clientPdfToImages(files[0], imgFormat, dpi);
          setResultUrl(window.URL.createObjectURL(zipBlob));
          setResultFileName(`${files[0].name.replace('.pdf', '')}_images.zip`);
          setLoading(false);
          return;
        } catch (imgErr) {
          throw new Error('PDF to Images conversion error: ' + (imgErr.message || 'Failed'));
        }
      }
      else if (activeMode === 'md2pdf') {
        try {
          const clientBlob = await clientMarkdownToPdf(files[0]);
          setResultUrl(window.URL.createObjectURL(clientBlob));
          setResultFileName(`${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`);
          setLoading(false);
          return;
        } catch (clientErr) {
          throw new Error('Markdown to PDF conversion error: ' + (clientErr.message || 'Failed'));
        }
      }
      else if (activeMode === 'csv2pdf' || (activeMode === 'excel2pdf' && files[0].name.toLowerCase().endsWith('.csv'))) {
        try {
          const clientBlob = await clientCsvToPdf(files[0]);
          setResultUrl(window.URL.createObjectURL(clientBlob));
          setResultFileName(`${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`);
          setLoading(false);
          return;
        } catch (clientErr) {
          throw new Error('CSV to PDF conversion error: ' + (clientErr.message || 'Failed'));
        }
      }
      else if (activeMode === 'docx2pdf') {
        if (backendHealthy === false) {
          throw new Error('The Microsoft Word converter requires the local Python desktop engine. Run start.ps1 or run_app.bat on your PC to enable Office conversions.');
        }
        endpoint = '/api/convert/docx-to-pdf';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
      }
      else if (activeMode === 'pptx2pdf') {
        if (backendHealthy === false) {
          throw new Error('The PowerPoint converter requires the local Python desktop engine. Run start.ps1 or run_app.bat on your PC to enable Office conversions.');
        }
        endpoint = '/api/convert/pptx-to-pdf';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
      }
      else if (activeMode === 'excel2pdf') {
        if (backendHealthy === false) {
          throw new Error('The Excel (.xlsx) converter requires the local Python desktop engine. For comma-separated sheets, please select the in-browser "CSV Table to PDF" converter instead.');
        }
        endpoint = '/api/convert/excel-to-pdf';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace(/\.[^/.]+$/, '')}.pdf`;
      }
      else if (activeMode === 'pdf2docx') {
        if (backendHealthy === false) {
          throw new Error('The PDF-to-Word converter requires the local Python engine. To extract text directly in your browser without a server, use the "PDF to Clean Text" or "OCR Studio" tabs.');
        }
        endpoint = '/api/convert/pdf-to-docx';
        formData.append('file', files[0]);
        defaultName = `${files[0].name.replace('.pdf', '')}.docx`;
      }

      const res = await fetch(endpoint, { method: 'POST', body: formData });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Backend server is offline or unreachable (404). Run the local Python backend server to enable server-assisted Office conversions.');
        }
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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Create & Convert Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Turn JPG, Word, PowerPoint, Excel, CSV, Markdown, and Text into PDFs — or extract images & clean text locally.
        </p>
      </div>

      {/* Main Switcher: Create PDF vs Convert From PDF */}
      <div className="flex justify-center">
        <div className="bg-slate-200/70 dark:bg-slate-900/90 p-1.5 rounded-2xl flex flex-col sm:flex-row items-center gap-1.5 border border-slate-300/60 dark:border-slate-800 shadow-xs w-full sm:w-auto">
          <button
            onClick={() => handleCategorySwitch('to_pdf')}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'to_pdf'
                ? 'bg-red-600 text-white shadow-sm scale-[1.01]'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-slate-800'
            }`}
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Create PDF (Images, Markdown, CSV, Word, Text)</span>
          </button>
          <button
            onClick={() => handleCategorySwitch('from_pdf')}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'from_pdf'
                ? 'bg-red-600 text-white shadow-sm scale-[1.01]'
                : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/40 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Convert From PDF (To Images, Text, Word)</span>
          </button>
        </div>
      </div>

      {/* Tool Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${activeCategory === 'to_pdf' ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-3'} gap-3.5`}>
        {currentToolList.map((tool) => {
          const Icon = tool.icon;
          const isSelected = activeMode === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveMode(tool.id);
                setFiles([]);
                if (resultUrl) window.URL.revokeObjectURL(resultUrl);
                setResultUrl(null);
                setShowPreview(false);
                setPreviewInputPdf(false);
                setExtractedText('');
                setErrorMsg('');
              }}
              className={`group p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer interactive-card ${
                isSelected
                  ? 'border-red-500 bg-red-50/40 dark:bg-red-950/30 shadow-sm ring-2 ring-red-500/20 scale-[1.01]'
                  : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 transition-transform duration-200 group-hover:scale-110 shadow-xs ${tool.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{tool.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                    tool.mode === 'Local' 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                  }`}>
                    {tool.mode}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{tool.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Workstation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${currentMode?.color}`}>
            {currentMode && <currentMode.icon className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{currentMode?.title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentMode?.desc}</p>
          </div>
        </div>

        {/* Server Required Notice if backend is offline */}
        {currentMode.mode === 'Server Required' && backendHealthy === false && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">Desktop Python Engine Required:</strong> Microsoft Office binary conversions (.docx, .pptx) rely on local Windows/Office COM automation. To run them, launch <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">start.ps1</code> or <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">run_app.bat</code> on your machine.
              <span className="block mt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                💡 Tip: Image to PDF, Text to PDF, CSV to PDF, Markdown to PDF, and PDF to Images (ZIP) run 100% locally in your browser right now without any server!
              </span>
            </div>
          </div>
        )}

        {/* Upload Box */}
        <div className="mt-6">
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-red-50/20 dark:hover:bg-red-950/20 rounded-xl p-8 text-center transition-all cursor-pointer">
            <input
              type="file"
              accept={currentMode.accept}
              multiple={currentMode.multiple}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center pointer-events-none">
              <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                {files.length > 0
                  ? `${files.length} file(s) selected: ${files.map((f) => f.name).join(', ')}`
                  : `Select ${currentMode.title.split(' ')[0]} file(s)`}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Accepted: {currentMode.accept} • {currentMode.mode === 'Local' ? 'Runs 100% in browser RAM' : 'Server-assisted conversion'}
              </p>
            </div>
          </div>
        </div>

        {/* Single PDF input preview toggle (for From-PDF tools) */}
        {files.length > 0 && !currentMode.multiple && files[0]?.name.toLowerCase().endsWith('.pdf') && (
          <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
              Selected PDF: {files[0].name}
            </span>
            <button
              type="button"
              onClick={() => setPreviewInputPdf((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors"
            >
              {previewInputPdf ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{previewInputPdf ? 'Hide Source Preview' : 'Preview Source PDF'}</span>
            </button>
          </div>
        )}

        {previewInputPdf && files[0]?.name.toLowerCase().endsWith('.pdf') && (
          <PdfPreview
            file={files[0]}
            fileName={files[0].name}
            onClose={() => setPreviewInputPdf(false)}
          />
        )}

        {/* File previews list if multiple files selected */}
        {files.length > 0 && currentMode.multiple && (
          <div className="mt-4 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <span className="truncate max-w-[200px]">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Config Options for Image to PDF */}
        {activeMode === 'img2pdf' && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Page Sizing</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="fit">Fit to Image Size (Exact Photo Dimensions)</option>
                <option value="a4">Standard A4 (595 x 842 pt)</option>
                <option value="letter">US Letter (612 x 792 pt)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Page Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="auto">Auto (Detects Landscape / Portrait)</option>
                <option value="portrait">Portrait (Vertical)</option>
                <option value="landscape">Landscape (Horizontal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Margins</label>
              <select
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
          <div className="mt-6 flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Image Format</label>
              <select
                value={imgFormat}
                onChange={(e) => setImgFormat(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="png">PNG (Lossless & Crisp)</option>
                <option value="jpg">JPG (Smaller file size)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Resolution (DPI)</label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-900/60">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action button */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleConvert}
            disabled={loading || files.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 dark:shadow-red-950/40 disabled:opacity-50 transition-all cursor-pointer"
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

          {/* Download & Preview buttons */}
          {resultUrl && (
            <>
              <a
                href={resultUrl}
                download={resultFileName}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 dark:shadow-emerald-950/40 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download {resultFileName}</span>
              </a>

              {resultFileName.toLowerCase().endsWith('.pdf') && (
                <button
                  type="button"
                  onClick={() => setShowPreview((prev) => !prev)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 ${
                    showPreview
                      ? 'bg-slate-800 dark:bg-slate-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-950/40'
                  }`}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPreview ? 'Hide Preview' : 'Preview PDF'}</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Live PDF Preview Panel */}
        {showPreview && resultUrl && resultFileName.toLowerCase().endsWith('.pdf') && (
          <PdfPreview
            url={resultUrl}
            fileName={resultFileName}
            onClose={() => setShowPreview(false)}
          />
        )}

        {/* Extracted Text display */}
        {extractedText && (
          <div className="mt-6 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Extracted Plain Text</span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={12}
              value={extractedText}
              className="w-full text-xs font-mono bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        )}

      </div>
    </div>
  );
}
