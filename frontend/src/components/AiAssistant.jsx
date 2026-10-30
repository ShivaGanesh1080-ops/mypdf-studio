import React, { useState } from 'react';
import { 
  Sparkles, MessageSquare, Table, FileText, Send, 
  Upload, Loader2, AlertCircle, Copy, CheckCircle, Bot, User, Key, Download, ShieldCheck
} from 'lucide-react';
import { clientExtractPdfText } from '../services/clientPdfService';

async function callDirectGemini(apiKey, prompt, systemInstruction = '') {
  // Use recommended stable gemini-2.5-flash with fallback
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
      };
      if (systemInstruction) {
        body.system_instruction = { parts: [{ text: systemInstruction }] };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      const errData = await res.json().catch(() => ({}));
      lastErr = new Error(errData?.error?.message || `Gemini API call to ${model} failed (${res.status}).`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini API request failed.');
}

export default function AiAssistant({ apiKey, onOpenKeyModal }) {
  const [activeSubTab, setActiveSubTab] = useState('summary');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cachedText, setCachedText] = useState('');

  // Summary State
  const [summaryData, setSummaryData] = useState(null);

  // Chat State
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  // Table Extractor State
  const [tableData, setTableData] = useState('');
  const [copied, setCopied] = useState(false);

  const getDocText = async (targetFile) => {
    if (cachedText) return cachedText;
    const extracted = await clientExtractPdfText(targetFile);
    const txt = extracted.fullText || 'Document has minimal digital text.';
    setCachedText(txt);
    return txt;
  };

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg('');
      setSummaryData(null);
      setTableData('');
      setChatMessages([]);
      setCachedText('');
    }
  };

  const handleGenerateSummary = async () => {
    if (!file) {
      setErrorMsg('Please select a PDF document.');
      return;
    }

    if (!apiKey) {
      setErrorMsg('Please enter your free Google Gemini API key to enable AI document analysis.');
      if (onOpenKeyModal) onOpenKeyModal();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const docText = await getDocText(file);
      const prompt = `Analyze this document and provide a comprehensive structured summary.
Format with:
- Executive Overview (2-3 concise paragraphs)
- Key Takeaways & Highlights (bullet points)
- Action Items & Next Steps (if applicable)

Document Text:
${docText.substring(0, 45000)}`;

      const summaryText = await callDirectGemini(
        apiKey, 
        prompt, 
        'You are a senior executive document analysis assistant. Provide clear, professional, well-formatted summaries.'
      );

      setSummaryData({
        success: true,
        summary: summaryText,
        wordCount: docText.split(/\s+/).filter(Boolean).length,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error communicating with Google Gemini API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!question.trim() || !file || loading) return;

    if (!apiKey) {
      setChatMessages((prev) => [
        ...prev, 
        { sender: 'ai', text: '⚠️ Please enter your free Gemini API key using the "Setup Gemini AI" button in the top navbar to enable document chat.' }
      ]);
      if (onOpenKeyModal) onOpenKeyModal();
      return;
    }

    const userQ = question.trim();
    setQuestion('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setLoading(true);
    setErrorMsg('');

    try {
      const docText = await getDocText(file);
      const prompt = `You are an AI document assistant answering a user question about the following PDF document.
Answer clearly, accurately, and reference specific sections or pages when possible.

Document Text:
${docText.substring(0, 45000)}

User Question: ${userQ}`;

      const answer = await callDirectGemini(apiKey, prompt);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: answer }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: 'ai', text: `⚠️ Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExtractTables = async () => {
    if (!file) {
      setErrorMsg('Please select a PDF document.');
      return;
    }

    if (!apiKey) {
      setErrorMsg('Please enter your free Google Gemini API key to enable table extraction.');
      if (onOpenKeyModal) onOpenKeyModal();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const docText = await getDocText(file);
      const prompt = `Find all structured data, tables, figures, financial metrics, and entities in this document.
Format them as clean Markdown tables with column headers and dividers (| Col1 | Col2 |).
If no formal tables exist, organize structured lists, key-values, and data rows into tabular format.

Document Text:
${docText.substring(0, 45000)}`;

      const markdownTables = await callDirectGemini(apiKey, prompt, 'You are a data extraction specialist. Output clean Markdown tables.');
      setTableData(markdownTables);
    } catch (err) {
      setErrorMsg(err.message || 'Error extracting tables from document.');
    } finally {
      setLoading(false);
    }
  };

  const copyMarkdown = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTextFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          <span>AI Document Assistant</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Chat with your PDFs, generate executive summaries, and extract structured tables powered by Gemini.
        </p>
      </div>

      {/* Direct Browser-to-Gemini Security Disclosure */}
      <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200/80 dark:border-purple-900/60 flex items-start gap-2.5 text-[11px] text-purple-900 dark:text-purple-300 max-w-3xl mx-auto shadow-2xs">
        <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>Direct Browser Security:</strong> Your Gemini API key and document text are sent directly from your browser to Google Generative Language API over encrypted HTTPS. No intermediary backend server touches your key or files.
        </span>
      </div>

      {/* API Key Banner if not set */}
      {!apiKey && (
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-950 dark:text-purple-200">Google Gemini API Key Required for AI Features</p>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">Add your free API key from Google AI Studio to unlock live document analysis.</p>
            </div>
          </div>
          <button
            onClick={onOpenKeyModal}
            className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold text-xs shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Enter API Key
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors duration-200">
        
        {/* Document Selector */}
        <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Upload Document to Analyze</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>{file ? 'Change PDF' : 'Select PDF Document'}</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-md font-medium">
              {file ? `Selected: ${file.name}` : 'No file chosen yet'}
            </span>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'summary'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Executive Summary</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'chat'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat with PDF</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tables')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'tables'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Table & Data Extractor</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-xs rounded-lg flex items-center gap-2 border border-red-200 dark:border-red-900/60">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Subtab 1: Executive Summary */}
        {activeSubTab === 'summary' && (
          <div className="space-y-4">
            {!summaryData && (
              <div className="text-center py-10 bg-slate-50/60 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Generate instant executive highlights, key findings & structured summary
                </p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={loading || !file}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 dark:shadow-purple-950/40 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Document...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate AI Summary
                    </span>
                  )}
                </button>
              </div>
            )}

            {summaryData && (
              <div className="p-6 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      AI Executive Summary
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      ({summaryData.wordCount} words scanned)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyMarkdown(summaryData.summary)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => downloadTextFile(summaryData.summary, `${file.name.replace('.pdf', '')}_summary.md`)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .MD</span>
                    </button>
                  </div>
                </div>
                <div className="prose prose-xs max-w-none text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-line font-sans">
                  {summaryData.summary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subtab 2: Chat with PDF */}
        {activeSubTab === 'chat' && (
          <div className="space-y-4">
            <div className="h-[360px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                  <Bot className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-medium">Ask any question about your uploaded PDF document.</p>
                  <p className="text-[11px] mt-1 text-slate-400 dark:text-slate-500">Answers are reasoned directly against your document text.</p>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-slate-900 text-white font-medium'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-xs whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Researching document...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={file ? 'Ask a question about this PDF...' : 'Please upload a PDF first...'}
                disabled={!file || loading}
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={!file || !question.trim() || loading}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-200 dark:shadow-purple-950/40 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        )}

        {/* Subtab 3: Table & Data Extractor */}
        {activeSubTab === 'tables' && (
          <div className="space-y-4">
            {!tableData && (
              <div className="text-center py-10 bg-slate-50/60 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <Table className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Detect and extract tables, financial line items, and data into structured Markdown
                </p>
                <button
                  onClick={handleExtractTables}
                  disabled={loading || !file}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 dark:shadow-purple-950/40 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing Tables...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Table className="w-4 h-4" />
                      Extract Tables & Figures
                    </span>
                  )}
                </button>
              </div>
            )}

            {tableData && (
              <div className="p-6 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                    Extracted Tables & Structured Data
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyMarkdown(tableData)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Copied!' : 'Copy Tables'}</span>
                    </button>
                    <button
                      onClick={() => downloadTextFile(tableData, `${file.name.replace('.pdf', '')}_tables.md`)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .MD</span>
                    </button>
                  </div>
                </div>
                <div className="prose prose-xs max-w-none text-slate-800 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-line font-mono bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  {tableData}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
