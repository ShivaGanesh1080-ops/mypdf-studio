import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Command, X, ArrowRight, CornerDownLeft,
  Combine, Scissors, Minimize2, RotateCw, Trash2,
  Stamp, Lock, Unlock, Hash, ShieldCheck, SunMedium,
  FileText, LayoutGrid, FilePlus2, ScanText, Sparkles, Layers
} from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onSelectAction }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const actions = [
    // Core Tools
    {
      id: 'tool-merge',
      tab: 'core',
      toolId: 'merge',
      title: 'Merge PDFs',
      desc: 'Combine multiple PDF files into one ordered document',
      category: 'Core Tools',
      icon: Combine,
      color: 'text-red-500 bg-red-500/10',
      badge: 'Local',
    },
    {
      id: 'tool-split',
      tab: 'core',
      toolId: 'split',
      title: 'Split PDF',
      desc: 'Extract specific pages or page ranges into a separate PDF',
      category: 'Core Tools',
      icon: Scissors,
      color: 'text-orange-500 bg-orange-500/10',
      badge: 'Local',
    },
    {
      id: 'tool-compress',
      tab: 'core',
      toolId: 'compress',
      title: 'Compress PDF',
      desc: 'Stream-deflate object streams in browser RAM to reduce file size',
      category: 'Core Tools',
      icon: Minimize2,
      color: 'text-emerald-500 bg-emerald-500/10',
      badge: 'Local',
    },
    {
      id: 'tool-rotate',
      tab: 'core',
      toolId: 'rotate',
      title: 'Rotate PDF',
      desc: 'Rotate pages 90°, 180°, or 270° clockwise',
      category: 'Core Tools',
      icon: RotateCw,
      color: 'text-blue-500 bg-blue-500/10',
      badge: 'Local',
    },
    {
      id: 'tool-delete',
      tab: 'core',
      toolId: 'delete',
      title: 'Delete Pages',
      desc: 'Remove unwanted pages from a document',
      category: 'Core Tools',
      icon: Trash2,
      color: 'text-rose-500 bg-rose-500/10',
      badge: 'Local',
    },
    {
      id: 'tool-watermark',
      tab: 'core',
      toolId: 'watermark',
      title: 'Add Watermark',
      desc: 'Stamp text watermarks across every page with custom opacity',
      category: 'Core Tools',
      icon: Stamp,
      color: 'text-purple-500 bg-purple-500/10',
      badge: 'Local',
    },
    {
      id: 'tool-pagenumber',
      tab: 'core',
      toolId: 'pagenumber',
      title: 'Add Page Numbers / Bates Stamp',
      desc: 'Stamp dynamic page numbering (Page X of Y, X/Y) across all pages',
      category: 'Core Tools',
      icon: Hash,
      color: 'text-indigo-500 bg-indigo-500/10',
      badge: 'New • Local',
    },
    {
      id: 'tool-sanitize',
      tab: 'core',
      toolId: 'sanitize',
      title: 'Sanitize & Strip Metadata',
      desc: 'Remove hidden authors, edit histories, and XMP streams for total privacy',
      category: 'Core Tools',
      icon: ShieldCheck,
      color: 'text-cyan-500 bg-cyan-500/10',
      badge: 'New • Local',
    },
    {
      id: 'tool-grayscale',
      tab: 'core',
      toolId: 'grayscale',
      title: 'Grayscale / Ink Saver',
      desc: 'Convert color pages to monochrome for printer ink savings',
      category: 'Core Tools',
      icon: SunMedium,
      color: 'text-amber-500 bg-amber-500/10',
      badge: 'New • Local',
    },
    {
      id: 'tool-metadata',
      tab: 'core',
      toolId: 'metadata',
      title: 'Inspect Metadata',
      desc: 'View title, author, producer, timestamps, and page metrics',
      category: 'Core Tools',
      icon: FileText,
      color: 'text-slate-500 bg-slate-500/10',
      badge: 'New • Local',
    },
    {
      id: 'tool-protect',
      tab: 'core',
      toolId: 'protect',
      title: 'Protect PDF (AES-256)',
      desc: 'Lock documents with standard AES-256 client-side encryption',
      category: 'Core Tools',
      icon: Lock,
      color: 'text-yellow-500 bg-yellow-500/10',
      badge: 'Local',
    },
    {
      id: 'tool-unlock',
      tab: 'core',
      toolId: 'unlock',
      title: 'Unlock PDF',
      desc: 'Remove password restrictions directly in browser RAM',
      category: 'Core Tools',
      icon: Unlock,
      color: 'text-teal-500 bg-teal-500/10',
      badge: 'Local',
    },

    // Visual Studio
    {
      id: 'nav-visual',
      tab: 'visual',
      title: 'Visual Page Studio',
      desc: 'Interactive visual grid to drag, reorder, rotate, duplicate & delete pages',
      category: 'Workstation',
      icon: LayoutGrid,
      color: 'text-red-500 bg-red-500/10',
      badge: 'Interactive',
    },

    // Convert & Create
    {
      id: 'nav-converter-img',
      tab: 'converter',
      converterType: 'img2pdf',
      title: 'Images to PDF',
      desc: 'Convert PNG, JPG, WebP, SVG images into a unified PDF document',
      category: 'Create & Convert',
      icon: FilePlus2,
      color: 'text-blue-500 bg-blue-500/10',
      badge: 'Local',
    },
    {
      id: 'nav-converter-txt',
      tab: 'converter',
      converterType: 'txt2pdf',
      title: 'Text / Code to PDF',
      desc: 'Generate clean paginated PDFs with automatic word-wrapping',
      category: 'Create & Convert',
      icon: FileText,
      color: 'text-emerald-500 bg-emerald-500/10',
      badge: 'Local',
    },
    {
      id: 'nav-converter-md',
      tab: 'converter',
      converterType: 'md2pdf',
      title: 'Markdown to PDF',
      desc: 'Transform markdown files with headings, code blocks, lists into PDF',
      category: 'Create & Convert',
      icon: Layers,
      color: 'text-purple-500 bg-purple-500/10',
      badge: 'Local',
    },
    {
      id: 'nav-converter-csv',
      tab: 'converter',
      converterType: 'csv2pdf',
      title: 'CSV / Excel to PDF',
      desc: 'Render data spreadsheets into beautifully styled landscape/portrait tables',
      category: 'Create & Convert',
      icon: FilePlus2,
      color: 'text-teal-500 bg-teal-500/10',
      badge: 'Local',
    },

    // OCR Studio
    {
      id: 'nav-ocr',
      tab: 'ocr',
      title: 'OCR Studio',
      desc: 'Optical character recognition for scanned image-only PDFs (WASM)',
      category: 'Text Extraction',
      icon: ScanText,
      color: 'text-amber-500 bg-amber-500/10',
      badge: 'CPU/WASM',
    },

    // AI Assistant
    {
      id: 'nav-ai',
      tab: 'ai',
      title: 'AI Document Assistant',
      desc: 'Ask questions, summarize long documents, and extract tables with Gemini AI',
      category: 'AI Engine',
      icon: Sparkles,
      color: 'text-pink-500 bg-pink-500/10',
      badge: 'Gemini AI',
    },
  ];

  const filteredActions = actions.filter((act) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      act.title.toLowerCase().includes(q) ||
      act.desc.toLowerCase().includes(q) ||
      act.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          handleSelect(filteredActions[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredActions]);

  const handleSelect = (action) => {
    onSelectAction(action);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/10">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a tool name or action (e.g. merge, split, page number, sanitize)..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No matching tools found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Try searching for merge, protect, numbers, or ocr</p>
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? 'bg-red-50 dark:bg-red-950/40 text-slate-900 dark:text-white ring-1 ring-red-500/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs sm:text-sm truncate">{item.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{item.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/10">
                      {item.badge}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px]">↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-[10px]">↵</kbd>
              <span>select</span>
            </span>
          </div>
          <span className="font-medium text-slate-500 dark:text-slate-400">
            MyPDF Studio Fast Action Palette
          </span>
        </div>
      </div>
    </div>
  );
}
