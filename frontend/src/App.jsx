import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CoreTools from './components/CoreTools';
import VisualStudio from './components/VisualStudio';
import FormatConverter from './components/FormatConverter';
import OcrStudio from './components/OcrStudio';
import AiAssistant from './components/AiAssistant';
import CommandPalette from './components/CommandPalette';
import { ShieldCheck, HardDrive, Cpu, Sparkles, WifiOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('core');
  const [activeCoreToolId, setActiveCoreToolId] = useState('merge');
  const [apiKey, setApiKey] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Dark Mode State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('mypdf_theme');
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('mypdf_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global Command Palette Shortcut (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } else {
      alert("📲 To install MyPDF Studio on your device:\n\n• On Chrome/Edge: Click the install icon in the URL search bar.\n• On iPhone/iPad (Safari): Tap 'Share' then 'Add to Home Screen'.\n• On Android: Tap menu (⋮) then 'Install app' or 'Add to Home screen'.");
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('mypdf_gemini_key');
    if (savedKey) setApiKey(savedKey);

    // Check backend health
    fetch('/api/health')
      .then((res) => res.json())
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
  }, []);

  const handleCommandPaletteSelect = (action) => {
    if (action.tab) {
      setActiveTab(action.tab);
    }
    if (action.toolId) {
      setActiveCoreToolId(action.toolId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-100 antialiased transition-colors duration-200 selection:bg-red-500/20 selection:text-red-600">
      {/* Offline Toast Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-xs z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are currently offline. All core PDF editing, creation, and OCR tools run 100% locally in your browser!</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiKey={apiKey}
        setApiKey={setApiKey}
        backendHealthy={backendHealthy}
        theme={theme}
        toggleTheme={toggleTheme}
        onInstallClick={handleInstallClick}
        isInstalled={isInstalled}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        isOffline={isOffline}
      />

      {/* Main Content Area with Smooth Tab Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div key={activeTab} className="animate-fade-in-up">
          {activeTab === 'core' && (
            <CoreTools 
              backendHealthy={backendHealthy} 
              activeToolId={activeCoreToolId}
              onToolChange={setActiveCoreToolId}
            />
          )}
          {activeTab === 'visual' && <VisualStudio />}
          {activeTab === 'converter' && <FormatConverter backendHealthy={backendHealthy} />}
          {activeTab === 'ocr' && <OcrStudio />}
          {activeTab === 'ai' && (
            <AiAssistant
              apiKey={apiKey}
              backendHealthy={backendHealthy}
              onOpenKeyModal={() => {
                const navKeyBtn = document.querySelector('[data-key-btn]');
                if (navKeyBtn) navKeyBtn.click();
              }}
            />
          )}
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={handleCommandPaletteSelect}
      />

      {/* Modern High-End Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-white/10 mt-auto py-8 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pb-8 border-b border-slate-100 dark:border-white/10 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">100% Client Privacy</h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Files are processed in browser memory. Zero cloud storage or tracking.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Zero Arbitrary Limits</h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">No file size caps, no task queues, and no paywalls. Unlimited usage.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Dual Processing Engine</h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Client-side pdf-lib for privacy & PyMuPDF acceleration for OCR and docs.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/60 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">Gemini AI Assistant</h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Ask questions, extract structured tables, and summarize multi-page PDFs.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200">MyPDF Studio</span>
              <span>•</span>
              <span>Ultra-fast, Private & Unlimited PDF Suite</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <span>Client-Side PWA Architecture</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Ready for Production
              </span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
