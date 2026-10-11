import React, { useState } from 'react';
import { 
  FileText, Key, ShieldCheck, Sparkles, 
  Wrench, LayoutGrid, FilePlus2, ScanText, Sun, Moon, Download
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  apiKey, 
  setApiKey, 
  backendHealthy,
  theme,
  toggleTheme,
  onInstallClick,
  isInstalled
}) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey || '');

  const handleSaveKey = () => {
    setApiKey(tempKey.trim());
    localStorage.setItem('mypdf_gemini_key', tempKey.trim());
    setShowKeyModal(false);
  };

  const navItems = [
    { id: 'core', label: 'Core Tools', icon: Wrench },
    { id: 'visual', label: 'Visual Page Studio', icon: LayoutGrid },
    { id: 'converter', label: 'Create & Convert', icon: FilePlus2 },
    { id: 'ocr', label: 'OCR Studio', icon: ScanText },
    { id: 'ai', label: 'AI Document Assistant', icon: Sparkles },
  ];

  return (
    <>
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer group select-none" 
              onClick={() => setActiveTab('core')}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-red-200 dark:shadow-red-950/40 group-hover:scale-105 group-active:scale-95 transition-all duration-200">
                <FileText className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">
                    My<span className="text-red-600">PDF</span>
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 uppercase tracking-wider">
                    Studio
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">100% Private • In-Browser Processing</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Desktop & Tablet) */}
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 transition-colors duration-200">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700 scale-[1.02]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-red-600' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action buttons */}
            <div className="flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Zero Server Uploads</span>
              </div>

              {/* Install App (PWA) Button */}
              {!isInstalled && (
                <button
                  onClick={onInstallClick}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Install MyPDF Studio as a desktop or mobile application"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-fade-in" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600 animate-fade-in" />
                )}
              </button>

              {/* Gemini Key Button */}
              <button
                data-key-btn
                onClick={() => {
                  setTempKey(apiKey || '');
                  setShowKeyModal(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs active:scale-95 ${
                  apiKey
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
                title="Configure Google Gemini API Key for smart document chat and analysis"
              >
                <Key className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{apiKey ? 'Gemini AI Ready' : 'Setup Gemini AI'}</span>
                <span className="sm:hidden">{apiKey ? 'AI' : 'AI'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs (Scrollable pill bar with hidden scrollbar) */}
        <div className="lg:hidden flex items-center overflow-x-auto px-3 py-2 bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800 gap-1.5 no-scrollbar scroll-smooth transition-colors duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Gemini Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Google Gemini API Key</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Powers live document summary, chat & table parsing</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Your key stays strictly in your browser local storage.
              Get a free API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-red-600 dark:text-red-400 underline font-semibold"
              >
                Google AI Studio
              </a>
              .
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Enter Gemini API Key</label>
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
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
