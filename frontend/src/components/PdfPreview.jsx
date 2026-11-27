import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  Download,
  ExternalLink,
  FileText,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Ensure local bundled PDF.js worker is set (zero external CDN calls)
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/**
 * Reusable in-browser PDF Previewer powered by local pdfjs-dist canvas rendering.
 * Works consistently across Desktop, Mobile browsers (iOS/Android), and offline PWA mode.
 *
 * Props:
 * - url?: string        Blob URL of generated/output PDF
 * - file?: File|Blob    Raw PDF File/Blob (for input previews)
 * - fileName?: string   Display & download filename
 * - password?: string   Optional password for freshly encrypted PDFs
 * - onClose?: () => void
 */
export default function PdfPreview({
  url,
  file,
  fileName = 'document.pdf',
  password = '',
  onClose,
}) {
  const canvasRef = useRef(null);
  const viewportBoxRef = useRef(null);
  const renderTaskRef = useRef(null);
  const pdfDocRef = useRef(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1.0);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [renderingPage, setRenderingPage] = useState(false);
  const [error, setError] = useState('');
  const [isEncryptedError, setIsEncryptedError] = useState(false);
  const [manualPassword, setManualPassword] = useState(password || '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleOpenOrDownload = (mode) => {
    const targetUrl = url || (file ? window.URL.createObjectURL(file) : null);
    if (!targetUrl) return;

    if (mode === 'open') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.download = fileName;
      link.click();
    }

    if (!url && file) {
      setTimeout(() => window.URL.revokeObjectURL(targetUrl), 60000);
    }
  };

  // Close fullscreen on Escape key
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  // Load PDF document into pdf.js
  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      if (!url && !file) return;
      setLoadingDoc(true);
      setError('');
      setIsEncryptedError(false);

      if (pdfDocRef.current) {
        try {
          await pdfDocRef.current.destroy();
        } catch {}
        pdfDocRef.current = null;
      }

      try {
        let data;
        if (file) {
          data = new Uint8Array(await file.arrayBuffer());
        } else {
          const resp = await fetch(url);
          data = new Uint8Array(await resp.arrayBuffer());
        }

        const loadingTask = pdfjsLib.getDocument({
          data,
          password: manualPassword || password || undefined,
        });

        const doc = await loadingTask.promise;
        if (cancelled) {
          await doc.destroy();
          return;
        }

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setPageNum(1);
        setPageInput('1');

        // Auto-fit initial zoom to container width cleanly
        try {
          const firstPage = await doc.getPage(1);
          const baseVp = firstPage.getViewport({ scale: 1.0 });
          const boxWidth = viewportBoxRef.current?.clientWidth || window.innerWidth - 64;
          const fitScale = (boxWidth - 48) / baseVp.width;
          const clamped = Math.max(0.55, Math.min(1.15, parseFloat(fitScale.toFixed(2))));
          setScale(clamped);
        } catch {}
      } catch (err) {
        if (cancelled) return;
        if (err?.name === 'PasswordException') {
          setIsEncryptedError(true);
          setError('This PDF is password-protected. Enter the password below to preview.');
        } else {
          setError(err?.message || 'Unable to render PDF preview.');
        }
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {}
        pdfDocRef.current = null;
      }
    };
  }, [url, file, password, manualPassword]);

  // Render active page to canvas
  const renderPage = useCallback(async () => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || pageNum < 1 || pageNum > doc.numPages) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    setRenderingPage(true);
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('PDF page render error:', err);
      }
    } finally {
      setRenderingPage(false);
    }
  }, [pageNum, scale]);

  useEffect(() => {
    if (!loadingDoc && !error && numPages > 0) {
      renderPage();
    }
  }, [loadingDoc, error, numPages, renderPage]);

  const goToPage = (target) => {
    const clamped = Math.max(1, Math.min(numPages || 1, target));
    setPageNum(clamped);
    setPageInput(String(clamped));
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(pageNum));
    }
  };

  const adjustZoom = (delta) => {
    setScale((prev) => Math.max(0.5, Math.min(2.4, parseFloat((prev + delta).toFixed(2)))));
  };

  const wrapperClasses = isFullscreen
    ? 'fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col'
    : 'mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-fade-in-up';

  return (
    <div className={wrapperClasses}>
      {/* Preview Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-xs">
        {/* Left: Filename */}
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[180px] sm:max-w-[260px]">
            {fileName}
          </span>
          {numPages > 0 && (
            <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 tabular-nums">
              {numPages} {numPages === 1 ? 'page' : 'pages'}
            </span>
          )}
        </div>

        {/* Center: Pagination & Zoom */}
        {numPages > 0 && !error && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Page Nav */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => goToPage(pageNum - 1)}
                disabled={pageNum <= 1}
                className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 px-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="text"
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={handlePageInputSubmit}
                  aria-label="Page number"
                  className="w-8 text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 text-[11px] tabular-nums focus:outline-none focus:border-red-500"
                />
                <span className="text-slate-400 dark:text-slate-500">/ {numPages}</span>
              </form>
              <button
                type="button"
                onClick={() => goToPage(pageNum + 1)}
                disabled={pageNum >= numPages}
                className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => adjustZoom(-0.15)}
                disabled={scale <= 0.5}
                className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setScale(1.1)}
                className="px-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 tabular-nums cursor-pointer"
                title="Reset zoom"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => adjustZoom(0.15)}
                disabled={scale >= 2.4}
                className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {(url || file) && (
            <>
              <button
                type="button"
                onClick={() => handleOpenOrDownload('open')}
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-[11px] transition-colors cursor-pointer"
                title="Open PDF in new browser tab"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Open Tab</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenOrDownload('download')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                title="Download PDF"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                setIsFullscreen(false);
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              title="Close preview"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Viewport */}
      <div
        ref={viewportBoxRef}
        className={`relative overflow-auto bg-slate-200/75 dark:bg-slate-950/90 p-4 sm:p-6 ${
          isFullscreen ? 'flex-1' : 'max-h-[640px] min-h-[320px]'
        }`}
      >
        {loadingDoc && (
          <div className="my-auto flex flex-col items-center gap-2 text-slate-600 dark:text-slate-300 py-12">
            <Loader2 className="w-7 h-7 animate-spin text-red-600" />
            <span className="text-xs font-semibold">Rendering PDF preview locally...</span>
          </div>
        )}

        {!loadingDoc && error && (
          <div className="my-auto max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-center shadow-sm space-y-3">
            {isEncryptedError ? (
              <>
                <Lock className="w-7 h-7 text-amber-500 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{error}</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const pwdInput = e.currentTarget.elements.previewPwd.value;
                    setManualPassword(pwdInput);
                  }}
                  className="flex items-center gap-2 justify-center"
                >
                  <input
                    name="previewPwd"
                    type="password"
                    placeholder="Enter PDF password..."
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Unlock Preview
                  </button>
                </form>
              </>
            ) : (
              <>
                <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
              </>
            )}
          </div>
        )}

        {!loadingDoc && !error && (
          <div className="relative mx-auto w-fit">
            <canvas
              ref={canvasRef}
              className="block rounded-md shadow-xl bg-white border border-slate-300/70 dark:border-slate-700"
            />
            {renderingPage && (
              <div className="absolute top-2 right-2 bg-slate-900/75 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Rendering</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
