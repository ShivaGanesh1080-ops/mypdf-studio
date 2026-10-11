import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CoreTools from './components/CoreTools';
import VisualStudio from './components/VisualStudio';
import FormatConverter from './components/FormatConverter';
import OcrStudio from './components/OcrStudio';
import AiAssistant from './components/AiAssistant';
import ComparisonModal from './components/ComparisonModal';
import { ShieldCheck, HardDrive, Cpu, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('core');
  const [apiKey, setApiKey] = useState('');
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('mypdf_gemini_key');
    if (saved) setApiKey(saved);

    // Check backend health
    fetch('/api/health')
      .then((res) => res.json())
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiKey={apiKey}
        setApiKey={setApiKey}
        backendHealthy={backendHealthy}
        onOpenComparison={() => setIsComparisonOpen(true)}
      />

      {/* Main Content Area with Smooth Tab Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'core' && <CoreTools />}
          {activeTab === 'visual' && <VisualStudio />}
          {activeTab === 'converter' && <FormatConverter />}
          {activeTab === 'ocr' && <OcrStudio />}
          {activeTab === 'ai' && (
            <AiAssistant
              apiKey={apiKey}
              onOpenKeyModal={() => {
                const navKeyBtn = document.querySelector('[data-key-btn]');
                if (navKeyBtn) navKeyBtn.click();
              }}
            />
          )}
        </div>
      </main>

      {/* Footer Banner */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-8 border-b border-slate-100 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">100% Private</h4>
                <p className="text-slate-500 mt-0.5">Files never leave your machine. Zero cloud storage or tracking.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Zero Arbitrary Limits</h4>
                <p className="text-slate-500 mt-0.5">No file size caps, no daily quotas, no paywalled tasks.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Native Engine</h4>
                <p className="text-slate-500 mt-0.5">FastAPI & PyMuPDF acceleration with C-level rendering speed.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Gemini AI Assistant</h4>
                <p className="text-slate-500 mt-0.5">Chat with documents, extract tables, and summarize insights.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              <strong>MyPDF Studio</strong> • Personal High-Power PDF Suite
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsComparisonOpen(true)}
                className="hover:text-slate-900 underline"
              >
                View iLovePDF vs MyPDF Limitations
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* Comparison Drawer / Modal */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
      />
    </div>
  );
}
