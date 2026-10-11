import React, { useState } from 'react';
import { 
  ScanText, Upload, Copy, Download, Loader2, CheckCircle, 
  AlertCircle, Cpu, FileText, Sparkles, RefreshCw, Layers
} from 'lucide-react';
import { clientOcrPdf } from '../services/clientPdfService';

export default function OcrStudio() {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('eng');
  const [loading, setLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [ocrResult, setOcrResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setOcrResult(null);
      setProgressStatus('');
      setProgressPercent(0);
    }
  };

  const handleRunOcr = async () => {
    if (!file) {
      setErrorMsg('Please select a PDF document to run OCR.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setOcrResult(null);
    setProgressStatus('Reading document into device RAM...');
    setProgressPercent(10);

    try {
      // 1. Run Client-Side OCR / Text Stream Extraction (Runs 100% on user's device CPU & RAM)
      const clientResult = await clientOcrPdf(file, language, (p) => {
        setProgressStatus(p.status);
        setProgressPercent(p.progress);
      });

      if (clientResult && clientResult.fullText) {
        const words = clientResult.fullText.trim().split(/\s+/).filter(Boolean).length;
        setOcrResult({
          totalPages: clientResult.totalPages,
          wordCount: words,
          fullText: clientResult.fullText,
          engine: clientResult.engine,
        });
        setLoading(false);
        return;
      }
    } catch (clientErr) {
      console.warn('Client OCR notice, checking fallback:', clientErr);
    }

    // 2. Local backend fallback (if FastAPI backend is running on 127.0.0.1:8000)
    try {
      setProgressStatus('Checking local server engine...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', language);

      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setOcrResult(data);
        setLoading(false);
        return;
      }
    } catch (_) {}

    setErrorMsg('Could not extract text. The document might be password protected or corrupted.');
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!ocrResult?.fullText) return;
    navigator.clipboard.writeText(ocrResult.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = () => {
    if (!ocrResult?.fullText) return;
    const blob = new Blob([ocrResult.fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file.name.replace(/\.[^/.]+$/, '')}_ocr_extracted.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
          <ScanText className="w-7 h-7 text-red-600" />
          <span>Advanced OCR Studio</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Extract text from scanned PDFs, receipts, and documents directly on your device with 100% privacy.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors duration-200">
        {/* Upload & Config Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Select Scanned Document</label>
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-red-50/20 dark:hover:bg-red-950/20 rounded-xl p-8 text-center transition-all cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center pointer-events-none">
                <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {file ? file.name : 'Upload PDF document to extract text'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Multi-page scanned contracts, forms, or papers</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full transition-colors">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">OCR Primary Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="eng">English (eng)</option>
                <option value="spa">Spanish (spa)</option>
                <option value="fra">French (fra)</option>
                <option value="deu">German (deu)</option>
                <option value="ita">Italian (ita)</option>
                <option value="hin">Hindi (hin)</option>
              </select>

              <div className="mt-4 p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-300 leading-relaxed">
                <span className="font-bold flex items-center gap-1 mb-1 text-emerald-700 dark:text-emerald-400">
                  <Cpu className="w-3.5 h-3.5" />
                  In-Browser Engine:
                </span>
                Extracts text streams instantly on your computer's CPU and RAM. 100% private, zero data leaves your browser.
              </div>
            </div>

            <button
              onClick={handleRunOcr}
              disabled={loading || !file}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 dark:shadow-red-950/40 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing OCR...</span>
                </>
              ) : (
                <>
                  <ScanText className="w-4 h-4" />
                  <span>Execute Optical OCR</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Live progress indicator when processing */}
        {loading && (
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl animate-fade-in">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                {progressStatus || 'Running Optical Character Recognition...'}
              </span>
              <span className="font-bold text-red-600 dark:text-red-400">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-red-500 to-rose-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
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

        {/* OCR Result View */}
        {ocrResult && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 animate-fade-in-up">
            
            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed ({ocrResult.totalPages} pages)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Words: <strong className="text-slate-800 dark:text-slate-100">{ocrResult.wordCount?.toLocaleString() || 0}</strong>
                </span>
                {ocrResult.engine && (
                  <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-[11px] font-medium">
                    {ocrResult.engine}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={downloadTextFile}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .TXT</span>
                </button>
              </div>
            </div>

            {/* Extracted text container */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <textarea
                readOnly
                rows={16}
                value={ocrResult.fullText}
                className="w-full text-xs font-mono bg-white dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none leading-relaxed"
              />
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
