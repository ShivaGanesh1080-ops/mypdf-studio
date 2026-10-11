import React, { useState } from 'react';
import { 
  Sparkles, MessageSquare, Table, FileText, Send, 
  Upload, Loader2, AlertCircle, Copy, CheckCircle, Bot, User, Key
} from 'lucide-react';
import { clientExtractPdfText } from '../services/clientPdfService';

async function callDirectGemini(apiKey, prompt, systemInstruction = '') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
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
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Gemini API call failed.');
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
  const [tableData, setTableData] = useState(null);
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
      setTableData(null);
      setChatMessages([]);
      setCachedText('');
    }
  };

  const handleGenerateSummary = async () => {
    if (!file) {
      setErrorMsg('Please select a PDF document.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // 1. Try local server endpoint if reachable
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (apiKey) formData.append('api_key', apiKey);

      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSummaryData(data);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // 2. Direct client-side Gemini fallback
    if (!apiKey) {
      setErrorMsg('Please enter your Google Gemini API key to enable AI analysis in your browser.');
      setLoading(false);
      return;
    }

    try {
      const docText = await getDocText(file);
      const prompt = `Analyze this document and provide a structured JSON response with exactly this schema:
{
  "summary": "2-3 paragraph overview",
  "key_points": ["bullet 1", "bullet 2", "bullet 3"],
  "action_items": ["action 1", "action 2"],
  "word_count": 0
}
Document Text:
${docText.substring(0, 40000)}`;

      const raw = await callDirectGemini(apiKey, prompt, 'You are an executive document analysis assistant. Respond ONLY with valid JSON.');
      const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      setSummaryData({
        success: true,
        summary: parsed.summary,
        key_points: parsed.key_points || [],
        action_items: parsed.action_items || [],
        word_count: docText.split(/\s+/).length,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error communicating with Gemini.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!question.trim() || !file || loading) return;

    const userQ = question.trim();
    setQuestion('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userQ }]);
    setLoading(true);
    setErrorMsg('');

    // 1. Try server endpoint
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('question', userQ);
      if (apiKey) formData.append('api_key', apiKey);

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setChatMessages((prev) => [...prev, { sender: 'ai', text: data.answer }]);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // 2. Direct browser Gemini fallback
    if (!apiKey) {
      setChatMessages((prev) => [
        ...prev, 
        { sender: 'ai', text: '⚠️ Please enter your free Gemini API key using the top-right button to enable live document chat in the browser.' }
      ]);
      setLoading(false);
      return;
    }

    try {
      const docText = await getDocText(file);
      const prompt = `You are an AI document assistant answering a user's question about the following PDF document.
Answer clearly, accurately, and politely based on the document text.

Document Text:
${docText.substring(0, 40000)}

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

    setLoading(true);
    setErrorMsg('');

    // 1. Try server endpoint
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (apiKey) formData.append('api_key', apiKey);

      const res = await fetch('/api/ai/extract-tables', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTableData(data.data);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // 2. Direct browser Gemini fallback
    if (!apiKey) {
      setErrorMsg('Please enter your Google Gemini API key to enable table extraction in your browser.');
      setLoading(false);
      return;
    }

    try {
      const docText = await getDocText(file);
      const prompt = `Find all structured data, tabular information, rows, and columns in this document.
Format each table as clean Markdown tables with header and row dividers (| col1 | col2 |).
If no tabular data exists, summarize numeric lists into a markdown table.

Document Text:
${docText.substring(0, 40000)}`;

      const markdownTables = await callDirectGemini(apiKey, prompt, 'You are a data extraction assistant. Return markdown tables.');
      setTableData({
        markdown: markdownTables,
        tableCount: 1,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Error extracting tables.');
    } finally {
      setLoading(false);
    }
  };

  const copyMarkdown = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-7 h-7 text-purple-600" />
          <span>AI Document Assistant</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Chat with your PDFs, generate executive summaries, and extract structured tables powered by Gemini.
        </p>
      </div>

      {/* API Key Banner if not set */}
      {!apiKey && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-950">Free Google Gemini API Key Recommended</p>
              <p className="text-[11px] text-purple-700">Add your free API key to enable live AI analysis on your documents.</p>
            </div>
          </div>
          <button
            onClick={onOpenKeyModal}
            className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shrink-0 shadow-xs"
          >
            Enter API Key
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        
        {/* Document Selector */}
        <div className="mb-6 pb-6 border-b border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-2">Upload Document to Analyze</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{file ? 'Change PDF' : 'Select PDF Document'}</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            <span className="text-xs text-slate-600 truncate max-w-md font-medium">
              {file ? `Selected: ${file.name}` : 'No file chosen yet'}
            </span>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'summary'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Executive Summary</span>
          </button>

          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'chat'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat with PDF</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tables')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === 'tables'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Table & Data Extractor</span>
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Subtab 1: Executive Summary */}
        {activeSubTab === 'summary' && (
          <div className="space-y-4">
            {!summaryData && (
              <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-300">
                <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  Generate instant executive highlights, key dates, obligations & summary
                </p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={loading || !file}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 disabled:opacity-50 cursor-pointer"
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
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI Summary Analysis
                  </span>
                  <button
                    onClick={() => copyMarkdown(summaryData.summary)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                </div>
                <div className="prose prose-xs max-w-none text-slate-800 text-xs leading-relaxed whitespace-pre-line font-sans">
                  {summaryData.summary}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subtab 2: Chat with PDF */}
        {activeSubTab === 'chat' && (
          <div className="space-y-4">
            <div className="h-[360px] overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                  <Bot className="w-10 h-10 mb-2 text-slate-300" />
                  <p className="text-xs font-medium">Ask any question about your uploaded document.</p>
                  <p className="text-[11px] mt-1 text-slate-400">Answers will cite specific pages from the PDF.</p>
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
                        : 'bg-white text-slate-800 border border-slate-200 shadow-xs whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-purple-600 text-xs font-semibold py-2">
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
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={!file || !question.trim() || loading}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-purple-200 disabled:opacity-50 cursor-pointer"
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
              <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-300">
                <Table className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  Detect and extract tables, financial line items, and entities into structured Markdown
                </p>
                <button
                  onClick={handleExtractTables}
                  disabled={loading || !file}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-200 disabled:opacity-50 cursor-pointer"
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
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Extracted Tables & Structured Data
                  </span>
                  <button
                    onClick={() => copyMarkdown(tableData)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copied!' : 'Copy Tables'}</span>
                  </button>
                </div>
                <div className="prose prose-xs max-w-none text-slate-800 text-xs leading-relaxed whitespace-pre-line font-mono bg-white p-4 rounded-lg border border-slate-200">
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
