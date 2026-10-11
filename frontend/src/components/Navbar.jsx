import React, { useState } from 'react';
import { FileText, Key, ShieldCheck, Sparkles, HelpCircle, Layers } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, apiKey, setApiKey, onOpenComparison }) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey || '');

  const handleSaveKey = () => {
    setApiKey(tempKey.trim());
    localStorage.setItem('mypdf_gemini_key', tempKey.trim());
    setShowKeyModal(false);
  };

  const navItems = [
    { id: 'core', label: 'Core Tools', icon: '🛠️' },
    { id: 'visual', label: 'Visual Page Studio', icon: '📑' },
    { id: 'converter', label: 'Create & Convert', icon: '➕' },
    { id: 'ocr', label: 'OCR Studio', icon: '👁️' },
    { id: 'ai', label: 'AI Document Assistant', icon: '🤖' },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('core')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-red-200">
                <FileText className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900">
                    My<span className="text-red-600">PDF</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 uppercase tracking-wider">
                    Studio
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">100% Private • No Limits • AI-Powered</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    activeTab === item.id
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Right Action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenComparison}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                title="View comparison between iLovePDF and MyPDF"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>iLovePDF vs MyPDF</span>
              </button>

              <button
                onClick={() => {
                  setTempKey(apiKey || '');
                  setShowKeyModal(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  apiKey
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>{apiKey ? 'Gemini Key Configured' : 'Setup Gemini AI'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 bg-slate-50 border-t border-slate-200 gap-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                activeTab === item.id
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Gemini Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Google Gemini API Key</h3>
                <p className="text-xs text-slate-500">Powers live document summary, chat & table parsing</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Your key stays strictly in your local browser and connects directly to your local FastAPI server.
              You can get a free API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-red-600 underline font-semibold"
              >
                Google AI Studio
              </a>
              .
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Enter Gemini API Key</label>
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
