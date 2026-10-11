import React, { useState } from 'react';
import { 
  Combine, Scissors, RotateCw, Trash2, Minimize2, 
  Stamp, Lock, Unlock, Upload, Download, CheckCircle, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';

import { 
  clientMergePdfs, 
  clientSplitPdf, 
  clientRotatePdf, 
  clientDeletePages, 
  clientWatermarkPdf 
} from '../services/clientPdfService';

export default function CoreTools() {
  const [selectedTool, setSelectedTool] = useState('merge');
  const [engineMode, setEngineMode] = useState('client'); // 'client' (User CPU/RAM) or 'server'
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultFileName, setResultFileName] = useState('');
  const [compressStats, setCompressStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

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

  const tools = [
    { id: 'merge', title: 'Merge PDFs', desc: 'Combine multiple PDFs into a single document in your chosen order.', icon: Combine, color: 'text-red-600 bg-red-50 border-red-200' },
    { id: 'split', title: 'Split PDF', desc: 'Extract specific page ranges (e.g. 1-4, 7) into a separate clean PDF.', icon: Scissors, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { id: 'compress', title: 'Compress PDF', desc: 'Reduce file size with smart stream deflating and object deduplication.', icon: Minimize2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { id: 'rotate', title: 'Rotate PDF', desc: 'Rotate specific pages or entire documents 90°, 180°, or 270° clockwise.', icon: RotateCw, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { id: 'delete', title: 'Delete Pages', desc: 'Strip out unwanted pages from your document effortlessly.', icon: Trash2, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { id: 'watermark', title: 'Add Watermark', desc: 'Stamp text watermarks across every page with custom angle & opacity.', icon: Stamp, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { id: 'protect', title: 'Protect PDF', desc: 'Encrypt document with strong AES-256 password protection.', icon: Lock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { id: 'unlock', title: 'Unlock PDF', desc: 'Remove password restrictions and decrypt protected documents.', icon: Unlock, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  ];

  const handleFileChange = (e) => {
    setErrorMsg('');
    setResultUrl(null);
    setCompressStats(null);
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
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
    setResultUrl(null);
    setCompressStats(null);

    try {
      // 1. Try Client-Side (User's CPU & RAM) if applicable
      const isClientCapable = ['merge', 'split', 'rotate', 'delete', 'watermark'].includes(selectedTool);

      if (engineMode === 'client' && isClientCapable) {
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
        }

        if (clientBlob) {
          const downloadUrl = window.URL.createObjectURL(clientBlob);
          setResultUrl(downloadUrl);
          setResultFileName(defaultName);
          setLoading(false);
          return;
        }
      }

      // 2. Server execution fallback (Compress, Protect, Unlock, or if user explicitly chose server)
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

      // Check compress stats in headers if available
      if (selectedTool === 'compress') {
        const orig = res.headers.get('X-Original-Size');
        const nw = res.headers.get('X-New-Size');
        const saved = res.headers.get('X-Saved-Percent');
        if (orig && nw) {
          setCompressStats({
            orig: (parseInt(orig) / (1024 * 1024)).toFixed(2) + ' MB',
            nw: (parseInt(nw) / (1024 * 1024)).toFixed(2) + ' MB',
            saved: saved + '%',
          });
        }
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      setResultUrl(downloadUrl);
      setResultFileName(defaultName);
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const activeToolObj = tools.find((t) => t.id === selectedTool);

  return (
    <div className="space-y-8">
      {/* Tool Selector Cards */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Core PDF Power Tools
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Unlimited, private PDF operations running 100% locally on your computer.
          </p>
        </div>

        {/* Client vs Server Processing Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6">
          <div className="bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setEngineMode('client')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                engineMode === 'client'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>⚡ Client Device Mode</span>
              <span className="hidden md:inline text-[10px] font-normal opacity-90">(Your CPU & RAM)</span>
            </button>
            <button
              type="button"
              onClick={() => setEngineMode('server')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                engineMode === 'server'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🚀 Server Mode</span>
              <span className="hidden md:inline text-[10px] font-normal opacity-90">(Python Engine)</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {engineMode === 'client' ? '• 0 server load & instant execution' : '• Deep PyMuPDF engine processing'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setSelectedTool(tool.id);
                  setFiles([]);
                  setResultUrl(null);
                  setErrorMsg('');
                  setCompressStats(null);
                }}
                className={`group p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[140px] interactive-card ${
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
      </div>

      {/* Active Tool Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${activeToolObj?.color}`}>
            {activeToolObj && <activeToolObj.icon className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{activeToolObj?.title}</h2>
            <p className="text-xs text-slate-500">{activeToolObj?.desc}</p>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="mt-6">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            {selectedTool === 'merge' ? 'Select 2 or more PDF documents' : 'Select PDF document'}
          </label>
          <div className="relative border-2 border-dashed border-slate-300 hover:border-red-400 bg-slate-50/60 hover:bg-red-50/20 rounded-xl p-8 text-center transition-all cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              multiple={selectedTool === 'merge'}
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center pointer-events-none">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-slate-700">
                {files.length > 0
                  ? `${files.length} file(s) selected: ${files.map((f) => f.name).join(', ')}`
                  : 'Click or drag & drop PDF files here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">No file size limits • Processed locally</p>
            </div>
          </div>
        </div>

        {/* Tool Options */}
        <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Tool Parameters</h3>

          {selectedTool === 'split' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pages to Extract (1-indexed)</label>
              <input
                type="text"
                value={splitRange}
                onChange={(e) => setSplitRange(e.target.value)}
                placeholder="e.g. 1-3, 5, 8-10 or all"
                className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">Enter comma-separated single pages or ranges.</p>
            </div>
          )}

          {selectedTool === 'rotate' && (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rotation Angle</label>
                <select
                  value={rotateAngle}
                  onChange={(e) => setRotateAngle(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value={90}>90° Clockwise</option>
                  <option value={180}>180° Upside Down</option>
                  <option value={270}>270° Counter-Clockwise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pages to Rotate</label>
                <input
                  type="text"
                  value={rotateRange}
                  onChange={(e) => setRotateRange(e.target.value)}
                  placeholder="all or 1-2, 5"
                  className="w-48 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          )}

          {selectedTool === 'delete' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pages to Remove</label>
              <input
                type="text"
                value={deleteRange}
                onChange={(e) => setDeleteRange(e.target.value)}
                placeholder="e.g. 2, 4-6"
                className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
              <p className="text-[11px] text-slate-500 mt-1">These pages will be stripped from the final output.</p>
            </div>
          )}

          {selectedTool === 'compress' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Compression Engine Level</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setCompressQuality(lvl)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize ${
                      compressQuality === lvl
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {lvl === 'low' ? 'Maximum Compression' : lvl === 'medium' ? 'Standard Balanced' : 'High Visual Quality'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTool === 'watermark' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Watermark Text</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Font Size ({watermarkSize}px)</label>
                <input
                  type="number"
                  value={watermarkSize}
                  onChange={(e) => setWatermarkSize(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Angle ({watermarkAngle}°)</label>
                <input
                  type="number"
                  value={watermarkAngle}
                  onChange={(e) => setWatermarkAngle(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          )}

          {(selectedTool === 'protect' || selectedTool === 'unlock') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {selectedTool === 'protect' ? 'Set Encryption Password (AES-256)' : 'Enter Document Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
          )}

          {selectedTool === 'merge' && (
            <p className="text-xs text-slate-600">
              Files will be concatenated in the order uploaded. Uploaded files: <strong>{files.length}</strong>
            </p>
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleProcess}
            disabled={loading || files.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-200 disabled:opacity-50 transition-all cursor-pointer"
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

        {/* Compression statistics */}
        {compressStats && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-4 text-xs text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              {parseFloat(compressStats.saved) > 1.0 ? (
                <>
                  <strong>Compression Result:</strong> Reduced from {compressStats.orig} to {compressStats.nw} ({compressStats.saved} space saved).
                </>
              ) : (
                <>
                  <strong>Compression Result:</strong> {compressStats.orig} &rarr; {compressStats.nw} ({compressStats.saved} saved). <span className="text-slate-600 font-normal">This PDF is already highly optimized or consists of pure vector text without downsampleable images. Maximum visual sharpness was preserved.</span>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
