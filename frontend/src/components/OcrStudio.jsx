import React, { useState } from 'react';
import { ScanText, Upload, Copy, Download, Loader2, CheckCircle, AlertCircle, Cpu, FileText } from 'lucide-react';

export default function OcrStudio() {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState('eng');
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setOcrResult(null);
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    try {
      const res = await fetch('/api/ocr/extract', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('OCR extraction failed.');
      }

      const data = await res.json();
      setOcrResult(data);
    } catch (err) {
      setErrorMsg(err.message || 'Error executing OCR.');
    } finally {
      setLoading(false);
    }
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
    link.download = `${file.name.replace('.pdf', '')}_ocr_extracted.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <ScanText className="w-7 h-7 text-red-600" />
          <span>Advanced OCR Studio</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Turn scanned PDFs, receipts, and image documents into selectable, searchable text with optical recognition.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        {/* Upload & Config Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-2">Select Scanned Document</label>
            <div className="relative border-2 border-dashed border-slate-300 hover:border-red-400 bg-slate-50/60 hover:bg-red-50/20 rounded-xl p-8 text-center transition-all cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center pointer-events-none">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  {file ? file.name : 'Upload PDF document to extract text'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Multi-page scanned contracts, forms, or papers</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between h-full">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">OCR Primary Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              >
                <option value="eng">English (eng)</option>
                <option value="spa">Spanish (spa)</option>
                <option value="fra">French (fra)</option>
                <option value="deu">German (deu)</option>
                <option value="ita">Italian (ita)</option>
                <option value="hin">Hindi (hin)</option>
              </select>

              <div className="mt-4 p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  Local Engine:
                </span>
                Extracts existing embedded text instantly, with optical image character recognition fallback for scanned papers.
              </div>
            </div>

            <button
              onClick={handleRunOcr}
              disabled={loading || !file}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning Pages...</span>
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

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* OCR Result View */}
        {ocrResult && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            
            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed ({ocrResult.totalPages} pages)
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Total Words: <strong className="text-slate-800">{ocrResult.wordCount.toLocaleString()}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>
                <button
                  onClick={downloadTextFile}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .TXT</span>
                </button>
              </div>
            </div>

            {/* Extracted text container */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <textarea
                readOnly
                rows={16}
                value={ocrResult.fullText}
                className="w-full text-xs font-mono bg-white p-4 rounded-lg border border-slate-200 text-slate-800 focus:outline-none leading-relaxed"
              />
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
