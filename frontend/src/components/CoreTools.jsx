import React, { useState, useEffect } from 'react';
import { 
  Combine, Scissors, RotateCw, Trash2, Minimize2, 
  Stamp, Lock, Unlock, Upload, Download, CheckCircle, 
  AlertCircle, Loader2, ArrowRight, Hash, ShieldCheck, 
  SunMedium, FileText, X, Copy, Check, FileCheck, Layers, Eye, EyeOff
} from 'lucide-react';
import PdfPreview from './PdfPreview';

import { 
  clientMergePdfs, 
  clientSplitPdf, 
  clientRotatePdf, 
  clientDeletePages, 
  clientWatermarkPdf,
  clientCompressPdf,
  clientProtectPdf,
  clientUnlockPdf,
  clientAddPageNumbers,
  clientSanitizePdf,
  clientInspectMetadata,
  clientGrayscalePdf
} from '../services/clientPdfService';

export default function CoreTools({ backendHealthy, activeToolId, onToolChange }) {
  const [selectedTool, setSelectedTool] = useState(activeToolId || 'merge');
  const [engineMode, setEngineMode] = useState('client'); // 'client' (Local In-Browser) or 'server'
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultFileName, setResultFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewInputFile, setPreviewInputFile] = useState(null);
  const [compressStats, setCompressStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progressStatus, setProgressStatus] = useState('');
  const [metadataInfo, setMetadataInfo] = useState(null);
  const [copiedMeta, setCopiedMeta] = useState(false);

  // Tool parameter states
  const [splitRange, setSplitRange] = useState('1-3');
  const [rotateAngle, setRotateAngle] = useState(90);
  const [rotateRange, setRotateRange] = useState('all');
  const [deleteRange, setDeleteRange] = useState('2');
  const [compressQuality, setCompressQuality] = useState('medium');
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkSize, setWatermarkSize] = useState(42);
  const [watermarkAngle, setWatermarkAngle] = useState(45);
  const [watermarkColor, setWatermarkColor] = useState('#888888');
  const [password, setPassword] = useState('');

  // New tool parameters
  const [pageNumberPosition, setPageNumberPosition] = useState('bottom-center');
  const [pageNumberFormat, setPageNumberFormat] = useState('page-n-of-total');
  const [pageNumberStart, setPageNumberStart] = useState(1);
  const [pageNumberSize, setPageNumberSize] = useState(10);
  const [pageNumberColor, setPageNumberColor] = useState('#475569');

  useEffect(() => {
    if (activeToolId && activeToolId !== selectedTool) {
      setSelectedTool(activeToolId);
      setFiles([]);
      setResultUrl(null);
      setShowPreview(false);
      setPreviewInputFile(null);
      setErrorMsg('');
      setCompressStats(null);
      setMetadataInfo(null);
    }
  }, [activeToolId]);

  const tools = [
    { id: 'merge', title: 'Merge PDFs', desc: 'Combine multiple PDFs into a single document in your chosen order.', icon: Combine, color: 'text-red-500 bg-red-500/10 border-red-500/20', mode: 'Local' },
    { id: 'split', title: 'Split PDF', desc: 'Extract specific page ranges (e.g. 1-4, 7) into a separate clean PDF.', icon: Scissors, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', mode: 'Local' },
    { id: 'compress', title: 'Compress PDF', desc: 'Stream-deflate and deduplicate PDF object streams in browser RAM.', icon: Minimize2, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', mode: 'Local' },
    { id: 'pagenumber', title: 'Add Page Numbers', desc: 'Stamp dynamic numbering (Page X of Y, Bates numbering) across all pages.', icon: Hash, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', mode: 'New • Local' },
    { id: 'sanitize', title: 'Sanitize & Privacy', desc: 'Strip hidden author info, edit history, and XMP streams before sharing.', icon: ShieldCheck, color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', mode: 'New • Local' },
    { id: 'grayscale', title: 'Grayscale / Ink Saver', desc: 'Convert color documents to clean monochrome to save printer ink.', icon: SunMedium, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', mode: 'New • Local' },
    { id: 'rotate', title: 'Rotate PDF', desc: 'Rotate specific pages or entire documents 90°, 180°, or 270° clockwise.', icon: RotateCw, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', mode: 'Local' },
    { id: 'delete', title: 'Delete Pages', desc: 'Strip out unwanted pages from your document effortlessly.', icon: Trash2, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', mode: 'Local' },
    { id: 'watermark', title: 'Add Watermark', desc: 'Stamp text watermarks across every page with custom angle & opacity.', icon: Stamp, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', mode: 'Local' },
    { id: 'metadata', title: 'Inspect Metadata', desc: 'View title, author, producer, creation timestamps, and page metrics.', icon: FileText, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20', mode: 'New • Local' },
    { id: 'protect', title: 'Protect PDF', desc: 'Encrypt document with true client-side AES-256 password protection.', icon: Lock, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', mode: 'Local' },
    { id: 'unlock', title: 'Unlock PDF', desc: 'Remove password restrictions and decrypt protected documents in browser.', icon: Unlock, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20', mode: 'Local' },
  ];

  const handleSelectTool = (toolId) => {
    setSelectedTool(toolId);
    setFiles([]);
    setResultUrl(null);
    setShowPreview(false);
    setPreviewInputFile(null);
    setErrorMsg('');
    setCompressStats(null);
    setMetadataInfo(null);
    if (onToolChange) onToolChange(toolId);
  };

  const handleFileChange = (e) => {
    setErrorMsg('');
    setResultUrl(null);
    setShowPreview(false);
    setPreviewInputFile(null);
    setCompressStats(null);
    setMetadataInfo(null);
    if (e.target.files) {
      if (selectedTool === 'merge') {
        setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
      } else {
        setFiles(Array.from(e.target.files));
      }
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResultUrl(null);
    setShowPreview(false);
    setPreviewInputFile(null);
    setMetadataInfo(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopyMetadata = () => {
    if (!metadataInfo) return;
    const text = Object.entries(metadataInfo)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedMeta(true);
    setTimeout(() => setCopiedMeta(false), 2000);
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      setErrorMsg('Please select at least one PDF file.');
      return;
    }
    if (selectedTool === 'merge' && files.length < 2) {
      setErrorMsg('Merge requires at least 2 PDF files.');
      return;
    }
    if ((selectedTool === 'protect' || selectedTool === 'unlock') && !password) {
      setErrorMsg('Please enter a password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setProgressStatus('');
    setShowPreview(false);
    if (resultUrl) {
      window.URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }

    try {
      // 1. Client-Side Execution (Local in browser memory)
      const isClientCapable = [
        'merge', 'split', 'rotate', 'delete', 'watermark', 
        'compress', 'protect', 'unlock', 'pagenumber', 
        'sanitize', 'grayscale', 'metadata'
      ].includes(selectedTool);

      if (engineMode === 'client' || (engineMode === 'server' && backendHealthy === false)) {
        if (engineMode === 'server' && backendHealthy === false) {
          setEngineMode('client');
        }

        if (!isClientCapable) {
          throw new Error(`The '${selectedTool}' feature requires the server engine.`);
        }

        let clientBlob = null;
        let defaultName = 'output.pdf';

        if (selectedTool === 'merge') {
          clientBlob = await clientMergePdfs(files);
          defaultName = 'merged_document.pdf';
        } else if (selectedTool === 'split') {
          clientBlob = await clientSplitPdf(files[0], splitRange);
          defaultName = `split_${files[0].name}`;
        } else if (selectedTool === 'rotate') {
          clientBlob = await clientRotatePdf(files[0], rotateAngle, rotateRange);
          defaultName = `rotated_${files[0].name}`;
        } else if (selectedTool === 'delete') {
          clientBlob = await clientDeletePages(files[0], deleteRange);
          defaultName = `trimmed_${files[0].name}`;
        } else if (selectedTool === 'watermark') {
          clientBlob = await clientWatermarkPdf(files[0], watermarkText, watermarkOpacity, watermarkSize, watermarkAngle, watermarkColor);
          defaultName = `watermarked_${files[0].name}`;
        } else if (selectedTool === 'compress') {
          const compResult = await clientCompressPdf(files[0], compressQuality);
          clientBlob = compResult.blob;
          defaultName = `compressed_${files[0].name}`;
          setCompressStats({
            orig: (compResult.originalSize / (1024 * 1024)).toFixed(2) + ' MB',
            nw: (compResult.compressedSize / (1024 * 1024)).toFixed(2) + ' MB',
            saved: compResult.reductionRatio + '%',
          });
        } else if (selectedTool === 'pagenumber') {
          clientBlob = await clientAddPageNumbers(files[0], {
            position: pageNumberPosition,
            format: pageNumberFormat,
            startNumber: pageNumberStart,
            fontSize: pageNumberSize,
            colorHex: pageNumberColor,
          });
          defaultName = `numbered_${files[0].name}`;
        } else if (selectedTool === 'sanitize') {
          clientBlob = await clientSanitizePdf(files[0]);
          defaultName = `sanitized_${files[0].name}`;
        } else if (selectedTool === 'grayscale') {
          clientBlob = await clientGrayscalePdf(files[0], ({ status }) => setProgressStatus(status));
          defaultName = `grayscale_${files[0].name}`;
        } else if (selectedTool === 'metadata') {
          const meta = await clientInspectMetadata(files[0]);
          setMetadataInfo(meta);
          setLoading(false);
          return;
        } else if (selectedTool === 'protect') {
          clientBlob = await clientProtectPdf(files[0], password);
          defaultName = `protected_${files[0].name}`;
        } else if (selectedTool === 'unlock') {
          clientBlob = await clientUnlockPdf(files[0], password);
          defaultName = `unlocked_${files[0].name}`;
        }

        if (clientBlob) {
          const downloadUrl = window.URL.createObjectURL(clientBlob);
          setResultUrl(downloadUrl);
          setResultFileName(defaultName);
          setLoading(false);
          return;
        }
      }

      // 2. Server Execution Mode (Explicit server request)
      if (backendHealthy === false) {
        throw new Error('Local Python server is offline. Switch to "Client Device Mode" above to process this document 100% locally in your browser.');
      }

      const formData = new FormData();
      let endpoint = '';
      let defaultName = 'output.pdf';

      if (selectedTool === 'merge') {
        endpoint = '/api/core/merge';
        files.forEach((f) => formData.append('files', f));
        defaultName = 'merged_document.pdf';
      } else {
        formData.append('file', files[0]);

        if (selectedTool === 'split') {
          endpoint = '/api/core/split';
          formData.append('page_range', splitRange);
          defaultName = `split_${files[0].name}`;
        } else if (selectedTool === 'rotate') {
          endpoint = '/api/core/rotate';
          formData.append('angle', rotateAngle);
          formData.append('page_range', rotateRange);
          defaultName = `rotated_${files[0].name}`;
        } else if (selectedTool === 'delete') {
          endpoint = '/api/core/delete-pages';
          formData.append('pages_to_delete', deleteRange);
          defaultName = `trimmed_${files[0].name}`;
        } else if (selectedTool === 'compress') {
          endpoint = '/api/core/compress';
          formData.append('quality', compressQuality);
          defaultName = `compressed_${files[0].name}`;
        } else if (selectedTool === 'watermark') {
          endpoint = '/api/core/watermark';
          formData.append('text', watermarkText);
          formData.append('opacity', watermarkOpacity);
          formData.append('font_size', watermarkSize);
          formData.append('angle', watermarkAngle);
          formData.append('color', watermarkColor);
          defaultName = `watermarked_${files[0].name}`;
        } else if (selectedTool === 'protect') {
          endpoint = '/api/core/protect';
          formData.append('password', password);
          defaultName = `protected_${files[0].name}`;
        } else if (selectedTool === 'unlock') {
          endpoint = '/api/core/unlock';
          formData.append('password', password);
          defaultName = `unlocked_${files[0].name}`;
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errDetail = 'Processing failed.';
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errDetail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      setResultUrl(downloadUrl);
      setResultFileName(defaultName);
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
      setProgressStatus('');
    }
  };

  const activeToolObj = tools.find((t) => t.id === selectedTool);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
            Core PDF Power Tools
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unlimited, zero-upload PDF operations running 100% locally on your computer.
          </p>
        </div>

        {/* Engine mode bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6">
          <div className="bg-slate-100/90 dark:bg-slate-900/90 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setEngineMode('client')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                engineMode === 'client'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚡ Client Device Mode</span>
              <span className="hidden md:inline text-[10px] font-normal opacity-90">(Your CPU & RAM)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (backendHealthy === false) {
                  setErrorMsg('Notice: Local Python server is offline. All core PDF tools run 100% locally on your computer in Client Device Mode without needing any server.');
                  return;
                }
                setEngineMode('server');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                engineMode === 'server'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🚀 Server Mode</span>
              <span className="hidden md:inline text-[10px] font-normal opacity-90">
                {backendHealthy === false ? '(Offline)' : '(Python Engine)'}
              </span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            {engineMode === 'client' 
              ? '• 0 server load & instant execution in browser RAM' 
              : backendHealthy === false
                ? '• ⚠️ Local Python backend offline (launch start.ps1)'
                : '• Deep PyMuPDF engine processing'}
          </span>
        </div>

        {/* Tool Selector Cards Grid (12 Tools) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => handleSelectTool(tool.id)}
                className={`group p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[140px] ${
                  isSelected
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30 shadow-md ring-2 ring-red-500/20 scale-[1.01]'
                    : 'border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 transition-transform duration-200 group-hover:scale-110 shadow-2xs ${tool.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {tool.title}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                      tool.mode.includes('New')
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-extrabold'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {tool.mode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {tool.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tool Workspace Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-xs transition-colors duration-200">
        
        {/* Workspace Title Header */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100 dark:border-white/10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${activeToolObj?.color}`}>
            {activeToolObj && <activeToolObj.icon className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{activeToolObj?.title}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                In-Browser Memory
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{activeToolObj?.desc}</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {selectedTool === 'merge' ? 'Select 2 or more PDF documents' : 'Select PDF document'}
            </label>
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFiles([]);
                  setResultUrl(null);
                  setShowPreview(false);
                  setPreviewInputFile(null);
                  setMetadataInfo(null);
                }}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
              >
                Clear Selected Files
              </button>
            )}
          </div>

          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-red-50/20 dark:hover:bg-red-950/20 rounded-2xl p-8 text-center transition-all cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              multiple={selectedTool === 'merge'}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center pointer-events-none">
              <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                {selectedTool === 'merge'
                  ? 'Click or drag & drop multiple PDF files to combine'
                  : 'Click or drag & drop a PDF document here'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Zero file size limits • Processed entirely in browser RAM
              </p>
            </div>
          </div>

          {/* Selected Files Badge List */}
          {files.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Attached Files ({files.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate font-medium">{f.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                        ({formatFileSize(f.size)})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewInputFile(previewInputFile === f ? null : f)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          previewInputFile === f
                            ? 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                        title={previewInputFile === f ? 'Close preview' : 'Preview uploaded PDF'}
                      >
                        {previewInputFile === f ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {previewInputFile && (
                <PdfPreview
                  file={previewInputFile}
                  fileName={previewInputFile.name}
                  onClose={() => setPreviewInputFile(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* Tool Parameters Card */}
        <div className="mt-6 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/80 dark:border-white/10 transition-colors">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
            Tool Parameters
          </h3>

          {/* Merge Parameters */}
          {selectedTool === 'merge' && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Files will be concatenated in the order uploaded. You can reorder pages visually in the{' '}
              <span className="text-red-600 font-semibold cursor-pointer">Visual Page Studio</span>.
            </p>
          )}

          {/* Split Parameters */}
          {selectedTool === 'split' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pages to Extract (1-indexed)
              </label>
              <input
                type="text"
                value={splitRange}
                onChange={(e) => setSplitRange(e.target.value)}
                placeholder="e.g. 1-3, 5, 8-10 or all"
                className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Enter comma-separated single pages or ranges (e.g. 1-3, 5).
              </p>
            </div>
          )}

          {/* Compress Parameters */}
          {selectedTool === 'compress' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Compression Engine Level
              </label>
              <div className="flex flex-wrap gap-2">
                {['low', 'medium', 'high'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setCompressQuality(lvl)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize cursor-pointer transition-all ${
                      compressQuality === lvl
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lvl === 'low' ? 'Maximum Compression' : lvl === 'medium' ? 'Standard Balanced' : 'High Visual Quality'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add Page Numbers Parameters */}
          {selectedTool === 'pagenumber' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Position
                </label>
                <select
                  value={pageNumberPosition}
                  onChange={(e) => setPageNumberPosition(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="bottom-center">Bottom Center (Standard)</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Format Style
                </label>
                <select
                  value={pageNumberFormat}
                  onChange={(e) => setPageNumberFormat(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="page-n-of-total">Page 1 of 10</option>
                  <option value="n-of-total">1 / 10</option>
                  <option value="page-n">Page 1</option>
                  <option value="n">1 (Number only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Start Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={pageNumberStart}
                  onChange={(e) => setPageNumberStart(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Font Size ({pageNumberSize}pt)
                </label>
                <input
                  type="number"
                  min="6"
                  max="24"
                  value={pageNumberSize}
                  onChange={(e) => setPageNumberSize(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Sanitize & Privacy Parameters */}
          {selectedTool === 'sanitize' && (
            <div className="p-3 bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/40 rounded-xl text-xs text-cyan-900 dark:text-cyan-200">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Total Document Privacy Sanitization</p>
                  <p className="text-cyan-800 dark:text-cyan-300/90 leading-relaxed text-[11px]">
                    This operation will strip out all document metadata, author details, creator software, edit history, modification timestamps, and embedded XMP streams in browser RAM before saving.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Grayscale Parameters */}
          {selectedTool === 'grayscale' && (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <SunMedium className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Ink-Saver Monochrome Conversion</p>
                  <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed text-[11px]">
                    Converts full-color PDF documents to monochrome grayscale using standard luminance analysis (0.299R + 0.587G + 0.114B). Perfect for contracts and textbooks to prevent excessive color toner consumption.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rotate Parameters */}
          {selectedTool === 'rotate' && (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Rotation Angle</label>
                <select
                  value={rotateAngle}
                  onChange={(e) => setRotateAngle(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value={90}>90° Clockwise</option>
                  <option value={180}>180° Upside Down</option>
                  <option value={270}>270° Counter-Clockwise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pages to Rotate</label>
                <input
                  type="text"
                  value={rotateRange}
                  onChange={(e) => setRotateRange(e.target.value)}
                  placeholder="all or 1-2, 5"
                  className="w-48 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Delete Parameters */}
          {selectedTool === 'delete' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pages to Remove</label>
              <input
                type="text"
                value={deleteRange}
                onChange={(e) => setDeleteRange(e.target.value)}
                placeholder="e.g. 2, 4-6"
                className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">These pages will be stripped from the final output.</p>
            </div>
          )}

          {/* Watermark Parameters */}
          {selectedTool === 'watermark' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Watermark Text</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.9"
                  step="0.05"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-full mt-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Font Size ({watermarkSize}px)</label>
                <input
                  type="number"
                  value={watermarkSize}
                  onChange={(e) => setWatermarkSize(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Angle ({watermarkAngle}°)</label>
                <input
                  type="number"
                  value={watermarkAngle}
                  onChange={(e) => setWatermarkAngle(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Protect & Unlock Parameters */}
          {(selectedTool === 'protect' || selectedTool === 'unlock') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {selectedTool === 'protect' ? 'Set Encryption Password (AES-256)' : 'Enter Document Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Inspect Metadata Placeholder */}
          {selectedTool === 'metadata' && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Click &quot;Inspect Document Metadata&quot; below to read the embedded metadata tags, author info, and creation timestamps directly from the document stream.
            </p>
          )}
        </div>

        {/* Progress Status Message */}
        {progressStatus && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs rounded-xl flex items-center gap-2 border border-blue-200 dark:border-blue-900/60">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{progressStatus}</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-red-200 dark:border-red-900/60">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {errorMsg.includes('Client Device Mode') && (
              <button
                type="button"
                onClick={() => {
                  setEngineMode('client');
                  setErrorMsg('');
                  setTimeout(handleProcess, 50);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-all"
              >
                Switch to Client Mode & Run Now
              </button>
            )}
          </div>
        )}

        {/* Action Button & Download */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleProcess}
            disabled={loading || files.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 dark:shadow-none disabled:opacity-50 transition-all cursor-pointer active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing PDF...</span>
              </>
            ) : (
              <>
                <span>Execute {activeToolObj?.title}</span>
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 dark:shadow-none transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download {resultFileName}</span>
              </a>

              <button
                type="button"
                onClick={() => setShowPreview((prev) => !prev)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 ${
                  showPreview
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'
                }`}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showPreview ? 'Hide Preview' : 'Preview PDF'}</span>
              </button>
            </>
          )}
        </div>

        {/* Compression statistics */}
        {compressStats && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center gap-4 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              {parseFloat(compressStats.saved) > 1.0 ? (
                <>
                  <strong>Compression Result:</strong> Reduced from {compressStats.orig} to {compressStats.nw} ({compressStats.saved} space saved).
                </>
              ) : (
                <>
                  <strong>Compression Result:</strong> {compressStats.orig} &rarr; {compressStats.nw} ({compressStats.saved} saved). <span className="opacity-80">This PDF is already highly optimized or consists of vector text. Maximum visual sharpness was preserved.</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Live Result PDF Preview */}
        {showPreview && resultUrl && (
          <PdfPreview
            url={resultUrl}
            fileName={resultFileName}
            password={selectedTool === 'protect' ? password : ''}
            onClose={() => setShowPreview(false)}
          />
        )}

        {/* Metadata Inspector Card */}
        {metadataInfo && (
          <div className="mt-6 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Extracted Document Metadata
              </span>
              <button
                type="button"
                onClick={handleCopyMetadata}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
              >
                {copiedMeta ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMeta ? 'Copied!' : 'Copy Metadata'}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-semibold">Title</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{metadataInfo.title}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-semibold">Author</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{metadataInfo.author}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-semibold">Total Pages</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{metadataInfo.pageCount} pages</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-semibold">Creator</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{metadataInfo.creator}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-semibold">Producer</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{metadataInfo.producer}</span>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-white/5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-semibold">Created Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{metadataInfo.creationDate}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
