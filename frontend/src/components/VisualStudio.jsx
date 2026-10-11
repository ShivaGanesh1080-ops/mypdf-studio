import React, { useState } from 'react';
import { 
  Upload, RotateCw, RotateCcw, Trash2, ArrowLeft, ArrowRight, 
  Copy, Download, Loader2, CheckCircle, RefreshCw, EyeOff, LayoutGrid, CheckSquare
} from 'lucide-react';

export default function VisualStudio() {
  const [file, setFile] = useState(null);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [pages, setPages] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultFileName, setResultFileName] = useState('');

  const handleFileUpload = async (e) => {
    if (!e.target.files || !e.target.files[0]) return;
    const selected = e.target.files[0];
    setFile(selected);
    setLoadingPreviews(true);
    setErrorMsg('');
    setResultUrl(null);
    setPages([]);

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res = await fetch('/api/visual/previews', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to load page previews.');
      }

      const data = await res.json();
      // Initialize state for each page
      const initialized = data.pages.map((p, idx) => ({
        id: `page-${idx}-${Date.now()}`,
        originalIndex: p.originalIndex,
        pageNumber: p.pageNumber,
        thumbnail: p.thumbnail,
        rotationDelta: 0,
        included: true,
      }));
      setPages(initialized);
    } catch (err) {
      setErrorMsg(err.message || 'Error parsing document.');
    } finally {
      setLoadingPreviews(false);
    }
  };

  const handleRotate = (index, delta) => {
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
    setPages((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      return updated;
    });
  };

  const handleDuplicate = (index) => {
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
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotationDelta: (p.rotationDelta + delta + 360) % 360,
      }))
    );
  };

  const handleResetAll = () => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotationDelta: 0,
        included: true,
      }))
    );
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pages_config', JSON.stringify(payloadConfig));

    try {
      const res = await fetch('/api/visual/apply', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to export reorganized PDF.');
      }

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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-7 h-7 text-red-600" />
            <span>Visual Page Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Drag, reorder, rotate individual pages, duplicate, or delete visually with real-time thumbnail previews.
          </p>
        </div>

        {pages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRotateAll(90)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Rotate All 90°</span>
            </button>
            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-200 cursor-pointer disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export PDF ({activeCount} pages)</span>
            </button>
          </div>
        )}
      </div>

      {/* Upload Zone if no file loaded */}
      {pages.length === 0 && !loadingPreviews && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Open PDF in Visual Studio</h2>
            <p className="text-xs text-slate-500 mb-6">
              Upload any PDF document to generate an interactive visual board of all its pages.
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 cursor-pointer transition-all">
              <Upload className="w-4 h-4" />
              <span>Select PDF File</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loadingPreviews && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <h3 className="font-bold text-slate-900 text-base">Rendering High-Res Page Thumbnails...</h3>
          <p className="text-xs text-slate-500 mt-1">This renders directly inside your local FastAPI engine.</p>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
          {errorMsg}
        </div>
      )}

      {/* Download Bar when export is ready */}
      {resultUrl && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Reorganized document ready: {resultFileName}</span>
          </div>
          <a
            href={resultUrl}
            download={resultFileName}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Now</span>
          </a>
        </div>
      )}

      {/* Page Thumbnails Grid */}
      {pages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pages.map((p, idx) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border transition-all duration-150 p-2.5 flex flex-col justify-between shadow-xs ${
                p.included
                  ? 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                  : 'border-red-200 bg-red-50/20 opacity-60'
              }`}
            >
              {/* Card top toolbar */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                    p.included ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  Page {idx + 1} {p.pageNumber !== idx + 1 && `(Orig #${p.pageNumber})`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRotate(idx, 90)}
                    title="Rotate 90° Clockwise"
                    className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleInclude(idx)}
                    title={p.included ? 'Exclude this page' : 'Include this page'}
                    className={`p-1 rounded ${
                      p.included
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-rose-600 bg-rose-100'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Thumbnail with rotation transform */}
              <div className="relative bg-slate-100 rounded-lg p-2 min-h-[190px] flex items-center justify-center overflow-hidden border border-slate-200/60">
                <img
                  src={p.thumbnail}
                  alt={`Page ${idx + 1}`}
                  style={{ transform: `rotate(${p.rotationDelta}deg)` }}
                  className="max-h-[180px] max-w-full object-contain shadow-xs transition-transform duration-200"
                />
                {!p.included && (
                  <div className="absolute inset-0 bg-red-900/40 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-red-600/90 px-2 py-1 rounded-md">
                      Excluded
                    </span>
                  </div>
                )}
                {p.rotationDelta !== 0 && (
                  <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1 rounded bg-slate-900/80 text-white">
                    {p.rotationDelta}°
                  </span>
                )}
              </div>

              {/* Bottom reorder controls */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <button
                  disabled={idx === 0}
                  onClick={() => handleMove(idx, idx - 1)}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20"
                  title="Move page left"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicate(idx)}
                  className="p-1 rounded text-slate-400 hover:text-slate-800"
                  title="Duplicate this page"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={idx === pages.length - 1}
                  onClick={() => handleMove(idx, idx + 1)}
                  className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20"
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
