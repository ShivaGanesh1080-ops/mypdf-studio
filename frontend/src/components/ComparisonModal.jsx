import React from 'react';
import { X, CheckCircle, AlertTriangle, Shield, Zap, Sparkles, Lock, Cpu, CloudOff } from 'lucide-react';

export default function ComparisonModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              Architecture & Limitations Breakdown
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              iLovePDF vs. MyPDF Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Honest architectural comparison, trade-offs, and feature limitations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-3">Criteria / Feature</th>
                <th className="py-3 px-3 text-red-700 bg-red-50/50 rounded-t-lg">iLovePDF (Cloud Service)</th>
                <th className="py-3 px-3 text-emerald-800 bg-emerald-50/50 rounded-t-lg font-bold">MyPDF Studio (Your App)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              
              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  Privacy & Data Security
                </td>
                <td className="py-3 px-3 bg-red-50/30 text-rose-950">
                  <span className="font-semibold text-rose-700">Cloud Risk:</span> Files uploaded to 3rd-party remote servers. Sensitive bank/legal data leaves your device.
                </td>
                <td className="py-3 px-3 bg-emerald-50/30 text-emerald-950 font-medium">
                  <span className="font-semibold text-emerald-700">100% Private:</span> Runs locally on your machine. Files never touch any external server.
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-400" />
                  File Size & Batch Caps
                </td>
                <td className="py-3 px-3 bg-red-50/30 text-rose-950">
                  <span className="font-semibold text-rose-700">Strict Free Tier Limits:</span> 15MB to 100MB max per file, max 2-3 files per batch. Hourly usage quotas.
                </td>
                <td className="py-3 px-3 bg-emerald-50/30 text-emerald-950 font-medium">
                  <span className="font-semibold text-emerald-700">Zero Arbitrary Caps:</span> Process 500MB+ files, unlimited pages, unlimited batches.
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  AI Document Intelligence
                </td>
                <td className="py-3 px-3 bg-red-50/30 text-rose-950">
                  <span className="font-semibold text-rose-700">None:</span> No Chat with PDF, no automatic executive summaries, no automated table parsing.
                </td>
                <td className="py-3 px-3 bg-emerald-50/30 text-emerald-950 font-medium">
                  <span className="font-semibold text-emerald-700">Built-in Gemini AI:</span> Chat with documents, instant summaries, and table to Markdown/JSON extraction.
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-400" />
                  OCR (Optical Character Recognition)
                </td>
                <td className="py-3 px-3 bg-red-50/30 text-rose-950">
                  <span className="font-semibold text-rose-700">Paywalled:</span> High-accuracy OCR requires a monthly Premium subscription.
                </td>
                <td className="py-3 px-3 bg-emerald-50/30 text-emerald-950 font-medium">
                  <span className="font-semibold text-emerald-700">Included Free:</span> Optical recognition and deep text extraction engine built-in.
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Cost & Paywalls
                </td>
                <td className="py-3 px-3 bg-red-50/30 text-rose-950">
                  Freemium ($7 - $10/month or pay-per-tool). Ads & CAPTCHAs.
                </td>
                <td className="py-3 px-3 bg-emerald-50/30 text-emerald-950 font-medium">
                  <span className="font-semibold text-emerald-700">100% Free Forever:</span> Open, personal tool with zero recurring fees or advertisements.
                </td>
              </tr>

              <tr>
                <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                  <CloudOff className="w-4 h-4 text-slate-400" />
                  Offline Capability
                </td>
                <td className="py-3 px-3 bg-red-50/30 text-rose-950">
                  Requires active internet connection and broadband upload speed.
                </td>
                <td className="py-3 px-3 bg-emerald-50/30 text-emerald-950 font-medium">
                  <span className="font-semibold text-emerald-700">Localhost Ready:</span> Works completely offline without internet (except live Gemini AI queries).
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Limitations of MyPDF section */}
        <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Honest Limitations of MyPDF Studio to Keep in Mind:</span>
          </div>
          <ul className="mt-2 text-xs text-amber-800 space-y-1.5 list-disc list-inside">
            <li>
              <strong>System Compute:</strong> Large 1,000+ page OCR or heavy Word conversion utilizes your local CPU/RAM rather than a server farm.
            </li>
            <li>
              <strong>Word Conversion Nuance:</strong> Converts text, tables, images, and standard formatting to editable Word docx accurately; heavily complex magazine layouts with overlapping floating vector vectors may occasionally require minor margin polish.
            </li>
            <li>
              <strong>Tesseract Dependency:</strong> For scanned paper photos, having Tesseract OCR binary installed on Windows gives the highest accuracy.
            </li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Got it, Let's Build & Use MyPDF
          </button>
        </div>

      </div>
    </div>
  );
}
