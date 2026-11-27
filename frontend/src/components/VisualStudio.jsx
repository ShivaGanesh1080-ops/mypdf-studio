import React, { useState } from 'react';
import { 
  Upload, RotateCw, RotateCcw, Trash2, ArrowLeft, ArrowRight, 
  Copy, Download, Loader2, CheckCircle, RefreshCw, EyeOff, Eye, LayoutGrid, CheckSquare, FileText
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { clientApplyVisualEdits, clientGenerateThumbnails } from '../services/clientPdfService';
import PdfPreview from './PdfPreview';

export default function VisualStudio() {
  const [file, setFile] = useState(null);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [pages, setPages] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultFileName, setResultFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const [initialPages, setInitialPages] = useState([]);

  // Invalidate any active export link so users never download a stale document
  const invalidateExport = () => {
    setShowPreview(false);
    if (resultUrl) {
      window.URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selected = e.target.files[0];
    setFile(selected);
    setLoadingPreviews(true);
    setErrorMsg('');
    invalidateExport();
    setPages([]);
    setInitialPages([]);

    // 1. Client-Side in-browser thumbnail generation (100% private in browser memory)
    try {
      const thumbs = await clientGenerateThumbnails(selected);
      setPages(thumbs);
      setInitialPages(JSON.parse(JSON.stringify(thumbs)));
      setLoadingPreviews(false);
      return;
    } catch (clientErr) {
      console.warn('Canvas thumbnail error, falling back to pdf-lib page count:', clientErr);
    }

    // 2. Client-side lightweight fallback using pdf-lib page count
    try {
      const arrayBuffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const count = pdfDoc.getPageCount();

      const fallbackPages = Array.from({ length: count }, (_, idx) => ({
        id: `page-${idx}-${Date.now()}`,
        originalIndex: idx,
        pageNumber: idx + 1,
        thumbnail: null,
        rotationDelta: 0,
        included: true,
      }));
      setPages(fallbackPages);
      setInitialPages(JSON.parse(JSON.stringify(fallbackPages)));
    } catch (err) {
      setErrorMsg(err.message || 'Error parsing document.');
    } finally {
      setLoadingPreviews(false);
    }
  };

  const handleRotate = (index, delta) => {
    invalidateExport();
    setPages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        rotationDelta: (updated[index].rotationDelta + delta + 360) % 360,
      };
      return updated;
    });
  };

  const handleToggleInclude = (index) => {
    invalidateExport();
    setPages((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        included: !updated[index].included,
      };
      return updated;
    });
  };

  const handleMove = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    invalidateExport();
    setPages((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      return updated;
    });
  };

  const handleDuplicate = (index) => {
    invalidateExport();
    setPages((prev) => {
      const itemToDup = prev[index];
      const duplicated = {
        ...itemToDup,
        id: `page-dup-${Date.now()}-${Math.random()}`,
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, duplicated);
      return updated;
    });
  };

  const handleRotateAll = (delta) => {
    invalidateExport();
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotationDelta: (p.rotationDelta + delta + 360) % 360,
      }))
    );
  };

  const handleResetAll = () => {
    invalidateExport();
    if (initialPages && initialPages.length > 0) {
      // True restore of original document layout, ordering, count, and rotations
      setPages(JSON.parse(JSON.stringify(initialPages)));
    }
  };

  const handleExport = async () => {
    if (!file || pages.length === 0) return;
    setExporting(true);
    setErrorMsg('');
    setResultUrl(null);

    const activePages = pages.filter((p) => p.included);
    if (activePages.length === 0) {
      setErrorMsg('You must include at least one page in your export.');
      setExporting(false);
      return;
    }

    const payloadConfig = pages.map((p) => ({
      originalIndex: p.originalIndex,
      rotationDelta: p.rotationDelta,
      included: p.included,
    }));

    // 1. Try client-side export directly in browser RAM
    try {
      const clientBlob = await clientApplyVisualEdits(file, payloadConfig);
      const url = window.URL.createObjectURL(clientBlob);
      setResultUrl(url);
      setResultFileName(`rearranged_${file.name}`);
      setExporting(false);
      return;
    } catch (_) {
      // Fallback to server endpoint
    }

    // 2. Server fallback
    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages_config', JSON.stringify(payloadConfig));

    try {
      const res = await fetch('/api/visual/apply', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to export reorganized PDF.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setResultUrl(url);
      setResultFileName(`rearranged_${file.name}`);
    } catch (err) {
      setErrorMsg(err.message || 'Export error.');
    } finally {
      setExporting(false);
    }
  };

  const activeCount = pages.filter((p) => p.included).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800/60 shadow-xs">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span>Visual Page Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Drag, reorder, rotate individual pages, duplicate, or delete visually with instant feedback.
          </p>
        </div>

        {pages.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRotateAll(90)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate All 90°</span>
            </button>
            <button
              onClick={handleResetAll}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-200 dark:shadow-red-950/40 cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export PDF ({activeCount} pages)</span>
            </button>
          </div>
        )}
      </div>

      {/* Upload Zone if no file loaded */}
      {pages.length === 0 && !loadingPreviews && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center shadow-xs transition-colors">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-200 dark:border-red-800/60 animate-float shadow-sm">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Open PDF in Visual Studio</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Upload any PDF document to generate an interactive visual board of all its pages.
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs shadow-md shadow-red-200 dark:shadow-red-950/40 cursor-pointer transition-all active:scale-95">
              <Upload className="w-4 h-4" />
              <span>Select PDF File</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loadingPreviews && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-16 text-center shadow-xs transition-colors">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Rendering Page Boards...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Extracting page layers and orientations in browser memory.</p>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-900/60">
          {errorMsg}
        </div>
      )}

      {/* Download & Preview Bar when export is ready */}
      {resultUrl && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fade-in-up">
            <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Reorganized document ready: {resultFileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview((prev) => !prev)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer ${
                  showPreview
                    ? 'bg-slate-800 dark:bg-slate-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPreview ? 'Hide Preview' : 'Preview PDF'}</span>
              </button>
              <a
                href={resultUrl}
                download={resultFileName}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Now</span>
              </a>
            </div>
          </div>

          {showPreview && (
            <PdfPreview
              url={resultUrl}
              fileName={resultFileName}
              onClose={() => setShowPreview(false)}
            />
          )}
        </div>
      )}

      {/* Page Thumbnails Grid */}
      {pages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {pages.map((p, idx) => (
            <div
              key={p.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 p-3 flex flex-col justify-between shadow-xs interactive-card ${
                p.included
                  ? 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-lg'
                  : 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20 opacity-60'
              }`}
            >
              {/* Card top toolbar */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                    p.included
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400'
                  }`}
                >
                  Page {idx + 1} {p.pageNumber !== idx + 1 && `(Orig #${p.pageNumber})`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRotate(idx, 90)}
                    title="Rotate 90° Clockwise"
                    className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleInclude(idx)}
                    title={p.included ? 'Exclude this page' : 'Include this page'}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      p.included
                        ? 'text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        : 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Thumbnail with rotation transform */}
              <div className="relative bg-slate-100/80 dark:bg-slate-950/60 rounded-xl p-2 min-h-[190px] flex items-center justify-center overflow-hidden border border-slate-200/60 dark:border-slate-800/60">
                {p.thumbnail ? (
                  <img
                    src={p.thumbnail}
                    alt={`Page ${idx + 1}`}
                    style={{ transform: `rotate(${p.rotationDelta}deg)` }}
                    className="max-h-[180px] max-w-full object-contain shadow-xs transition-transform duration-300 ease-out"
                  />
                ) : (
                  <div 
                    style={{ transform: `rotate(${p.rotationDelta}deg)` }}
                    className="w-28 h-36 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs flex flex-col items-center justify-center p-3 text-center transition-transform duration-300 ease-out"
                  >
                    <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-1.5" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Page {idx + 1}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">PDF Sheet</span>
                  </div>
                )}

                {!p.included && (
                  <div className="absolute inset-0 bg-red-900/50 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-red-600 px-2.5 py-1 rounded-lg shadow-sm">
                      Excluded
                    </span>
                  </div>
                )}
                {p.rotationDelta !== 0 && (
                  <span className="absolute bottom-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-slate-900/85 dark:bg-slate-800/90 text-white shadow-xs">
                    {p.rotationDelta}°
                  </span>
                )}
              </div>

              {/* Bottom reorder controls */}
              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, idx - 1)}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                  title="Move page left"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicate(idx)}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title="Duplicate this page"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={idx === pages.length - 1}
                  onClick={() => handleMove(idx, idx + 1)}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                  title="Move page right"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
