import { PDFDocument, rgb, degrees, StandardFonts, PDFName } from 'pdf-lib';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { decryptPDF, isEncrypted } from '@pdfsmaller/pdf-decrypt';

// Configure pdfjs worker to use local bundled worker (100% offline-ready, 0 external CDN calls)
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/**
 * Parses user input ranges like '1-3, 5, 8-10' (1-indexed) into 0-indexed integers.
 */
export function parsePageRange(rangeStr, maxPages) {
  if (!rangeStr || rangeStr.trim().toLowerCase() === 'all') {
    return Array.from({ length: maxPages }, (_, i) => i);
  }

  const pages = new Set();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = start; p <= end; p++) {
          if (p >= 1 && p <= maxPages) pages.add(p - 1);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p - 1);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Merge multiple PDFs completely inside the user's browser CPU/RAM.
 */
export async function clientMergePdfs(files) {
  const mergedDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedDoc.addPage(page));
  }

  const pdfBytes = await mergedDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Split / Extract specific pages completely in browser RAM.
 */
export async function clientSplitPdf(file, pageRangeStr) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const selectedIndices = parsePageRange(pageRangeStr, totalPages);

  if (selectedIndices.length === 0) {
    throw new Error('No valid pages selected for extraction.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Rotate pages in browser RAM.
 */
export async function clientRotatePdf(file, angle, pageRangeStr) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();
  const selectedIndices = parsePageRange(pageRangeStr, totalPages);

  const pages = pdfDoc.getPages();
  for (const idx of selectedIndices) {
    const page = pages[idx];
    const currentRot = page.getRotation().angle;
    page.setRotation(degrees((currentRot + angle) % 360));
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Delete specified pages in browser RAM.
 */
export async function clientDeletePages(file, pagesToDeleteStr) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const delSet = new Set(parsePageRange(pagesToDeleteStr, totalPages));

  const keepIndices = [];
  for (let i = 0; i < totalPages; i++) {
    if (!delSet.has(i)) keepIndices.push(i);
  }

  if (keepIndices.length === 0) {
    throw new Error('Cannot delete all pages. At least one page must remain.');
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, keepIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Watermark PDF in browser RAM.
 */
export async function clientWatermarkPdf(file, text, opacity = 0.25, fontSize = 42, angle = 45, colorHex = '#666666') {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Parse color hex to rgb (0-1)
  const cleanHex = colorHex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0.4;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0.4;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0.4;

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: fontSize,
      font: font,
      color: rgb(r, g, b),
      opacity: opacity,
      rotate: degrees(angle),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Encrypt a PDF with true AES-256 password protection directly in browser RAM via Web Crypto API.
 */
export async function clientProtectPdf(file, password) {
  if (!password || !password.trim()) {
    throw new Error('Please enter a password to encrypt the document.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);

  const encInfo = await isEncrypted(rawBytes);
  if (encInfo.encrypted) {
    throw new Error('This document is already password-protected.');
  }

  const encryptedBytes = await encryptPDF(rawBytes, password.trim(), {
    ownerPassword: password.trim(),
    algorithm: 'AES-256',
  });

  return new Blob([encryptedBytes], { type: 'application/pdf' });
}

/**
 * Decrypt / Remove password protection from a PDF in browser RAM using Web Crypto API.
 */
export async function clientUnlockPdf(file, password) {
  if (!password || !password.trim()) {
    throw new Error('Please enter the document password to unlock it.');
  }
  const arrayBuffer = await file.arrayBuffer();
  const rawBytes = new Uint8Array(arrayBuffer);

  const encInfo = await isEncrypted(rawBytes);
  if (!encInfo.encrypted) {
    throw new Error('This document is not password-protected. No password needed.');
  }

  try {
    const decryptedBytes = await decryptPDF(rawBytes, password.trim());
    return new Blob([decryptedBytes], { type: 'application/pdf' });
  } catch (err) {
    throw new Error('Incorrect password. Please verify and try again.');
  }
}

/**
 * Render all pages of a PDF to high-resolution images (PNG or JPG) and package into a ZIP file in browser RAM.
 */
export async function clientPdfToImages(file, format = 'png', dpi = 150) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const zip = new JSZip();
  const scale = dpi / 72.0; // Standard 72 DPI base scale
  const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' || format === 'jpg' ? 'jpg' : 'png';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    const base64Data = dataUrl.split(',')[1];
    zip.file(`page_${String(i).padStart(3, '0')}.${ext}`, base64Data, { base64: true });
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
}

/**
 * Convert Images (JPG, PNG, WebP) to PDF in browser RAM.
 */
export async function clientImagesToPdf(files, pageSize = 'fit', orientation = 'auto', margin = 0) {
  const pdfDoc = await PDFDocument.create();

  const standardSizes = {
    a4: [595.28, 841.89],
    letter: [612.0, 792.0],
  };

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let embeddedImg;

    if (file.type === 'image/png') {
      embeddedImg = await pdfDoc.embedPng(arrayBuffer);
    } else {
      // JPEG or convert via canvas
      try {
        embeddedImg = await pdfDoc.embedJpg(arrayBuffer);
      } catch (_) {
        // Fallback for WebP / other formats via HTML5 Canvas
        const bitmap = await createImageBitmap(new Blob([arrayBuffer]));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0);
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64Data = jpegDataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
        embeddedImg = await pdfDoc.embedJpg(bytes.buffer);
      }
    }

    const { width: imgW, height: imgH } = embeddedImg;

    if (pageSize in standardSizes) {
      let [pw, ph] = standardSizes[pageSize];
      if (orientation === 'landscape' || (orientation === 'auto' && imgW > imgH)) {
        [pw, ph] = [Math.max(pw, ph), Math.min(pw, ph)];
      } else {
        [pw, ph] = [Math.min(pw, ph), Math.max(pw, ph)];
      }

      const availW = Math.max(pw - 2 * margin, 10);
      const availH = Math.max(ph - 2 * margin, 10);
      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const x = margin + (availW - drawW) / 2;
      const y = margin + (availH - drawH) / 2;

      const page = pdfDoc.addPage([pw, ph]);
      page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH });
    } else {
      // 'fit': page size matches image exactly + margins
      const pw = imgW + 2 * margin;
      const ph = imgH + 2 * margin;
      const page = pdfDoc.addPage([pw, ph]);
      page.drawImage(embeddedImg, { x: margin, y: margin, width: imgW, height: imgH });
    }
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * In-browser PDF compression using object stream optimization and metadata stripping.
 */
export async function clientCompressPdf(file, quality = 'medium') {
  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Streamline document metadata
  pdfDoc.setProducer('MyPDF Studio (Local Engine)');
  pdfDoc.setCreator('MyPDF Studio');

  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const newSize = compressedBytes.byteLength;
  const savedBytes = Math.max(0, originalSize - newSize);
  const ratio = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : '0.0';

  return {
    blob: new Blob([compressedBytes], { type: 'application/pdf' }),
    originalSize,
    compressedSize: newSize,
    reductionRatio: parseFloat(ratio),
  };
}

/**
 * Convert Plain Text to PDF with font-width-aware word wrapping and multi-page flow.
 * Guarantees NO text truncation or character loss.
 */
export async function clientTextToPdf(file) {
  const textContent = await file.text();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = 10;
  const lineHeight = 14;
  const margin = 40;
  const pageWidth = 595.28; // A4 standard width in points
  const pageHeight = 841.89; // A4 standard height in points
  const usableWidth = pageWidth - 2 * margin; // 515.28 pt
  const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  // Normalize line endings and tabs
  const rawParagraphs = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const wrappedLines = [];
  for (const rawPara of rawParagraphs) {
    const para = rawPara.replace(/\t/g, '    ');
    if (para.length === 0) {
      wrappedLines.push('');
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // If a single unbroken token exceeds usable page width, split it cleanly across lines
      const wordWidth = font.widthOfTextAtSize(word, fontSize);
      if (wordWidth > usableWidth) {
        if (currentLine.length > 0) {
          wrappedLines.push(currentLine);
          currentLine = '';
        }
        let chunk = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, fontSize) > usableWidth) {
            wrappedLines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        if (chunk.length > 0) {
          currentLine = chunk;
        }
        continue;
      }

      const candidate = currentLine.length === 0 ? word : currentLine + ' ' + word;
      const candidateWidth = font.widthOfTextAtSize(candidate, fontSize);

      if (candidateWidth <= usableWidth) {
        currentLine = candidate;
      } else {
        wrappedLines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      wrappedLines.push(currentLine);
    }
  }

  // Draw wrapped lines across paginated pages
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let lineOnPage = 0;

  for (const line of wrappedLines) {
    if (lineOnPage >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      lineOnPage = 0;
    }

    if (line.trim().length > 0) {
      const y = pageHeight - margin - (lineOnPage + 1) * lineHeight;
      currentPage.drawText(line, {
        x: margin,
        y: y,
        size: fontSize,
        font: font,
        color: rgb(0.12, 0.16, 0.23),
      });
    }

    lineOnPage++;
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Reorder and apply visual edits directly in browser RAM.
 */
export async function clientApplyVisualEdits(file, pagesConfig) {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const item of pagesConfig) {
    if (!item.included) continue;
    const origIdx = item.originalIndex;
    const rotDelta = item.rotationDelta || 0;

    const [copiedPage] = await newDoc.copyPages(srcDoc, [origIdx]);
    if (rotDelta) {
      const curAngle = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((curAngle + rotDelta) % 360));
    }
    newDoc.addPage(copiedPage);
  }

  const pdfBytes = await newDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Extract digital text from all pages of a PDF directly in browser memory.
 */
export async function clientExtractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pages = [];
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    pages.push({
      pageNumber: i,
      text: pageText.trim(),
    });
    if (pageText.trim()) {
      fullText += `--- Page ${i} ---\n` + pageText.trim() + '\n\n';
    }
  }

  return {
    totalPages: numPages,
    pages,
    fullText: fullText.trim(),
  };
}

/**
 * Optical Character Recognition (OCR) for scanned PDFs using client CPU / WebAssembly.
 */
export async function clientOcrPdf(file, language = 'eng', onProgress = null) {
  // 1. Check if the PDF already contains embedded digital text
  if (onProgress) onProgress({ status: 'Inspecting document stream...', progress: 15 });
  const digitalResult = await clientExtractPdfText(file);

  // If digital text is found, return immediately!
  if (digitalResult.fullText && digitalResult.fullText.length > 30) {
    if (onProgress) onProgress({ status: 'Extracted digital text stream!', progress: 100 });
    return {
      ...digitalResult,
      engine: 'In-Browser Digital Text Engine (Instant)',
    };
  }

  // 2. If it is a scanned document (images), run in-browser OCR using Tesseract.js
  if (onProgress) onProgress({ status: 'Initializing in-browser OCR worker...', progress: 25 });
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(language, 1, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        const pct = 25 + Math.round(m.progress * 70);
        onProgress({ status: `Scanning text (${Math.round(m.progress * 100)}%)...`, progress: pct });
      }
    },
  });

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const ocrPages = [];
  let combinedText = '';

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) onProgress({ status: `Processing page ${i} of ${numPages}...`, progress: Math.round((i / numPages) * 85) });
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    const ret = await worker.recognize(canvas);
    const pageText = ret.data.text.trim();
    ocrPages.push({
      pageNumber: i,
      text: pageText,
    });
    if (pageText) {
      combinedText += `--- Page ${i} ---\n` + pageText + '\n\n';
    }
  }

  await worker.terminate();

  return {
    totalPages: numPages,
    pages: ocrPages,
    fullText: combinedText.trim() || 'No text recognized in scanned document.',
    engine: 'In-Browser Tesseract Engine (Device CPU/WASM)',
  };
}

/**
 * Generate visual thumbnails for every page in a PDF using browser canvas.
 */
export async function clientGenerateThumbnails(file, maxThumbWidth = 220) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const previews = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = maxThumbWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    previews.push({
      id: `page-${i - 1}-${Date.now()}`,
      originalIndex: i - 1,
      pageNumber: i,
      thumbnail: dataUrl,
      rotationDelta: 0,
      included: true,
    });
  }

  return previews;
}

/**
 * Parses raw CSV text handling quotes, escapes, commas, and line endings.
 */
function parseCsvRows(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += c;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
  }

  return rows;
}

/**
 * Convert CSV spreadsheet to a styled tabular PDF in browser RAM.
 */
export async function clientCsvToPdf(file) {
  const text = await file.text();
  const rows = parseCsvRows(text);

  if (rows.length === 0) {
    throw new Error('CSV file is empty or contains no parseable data.');
  }

  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const colCount = Math.max(...rows.map((r) => r.length));
  // Landscape if > 4 columns for readability
  const isLandscape = colCount > 4;
  const pageWidth = isLandscape ? 841.89 : 595.28;
  const pageHeight = isLandscape ? 595.28 : 841.89;

  const margin = 36;
  const usableWidth = pageWidth - 2 * margin;
  const colWidth = usableWidth / Math.max(1, colCount);

  const rowHeight = 22;
  const fontSize = colCount > 6 ? 8 : 9;
  const headerFontSize = colCount > 6 ? 8.5 : 9.5;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const drawHeader = (page, y) => {
    // Header background bar
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: usableWidth,
      height: rowHeight,
      color: rgb(0.92, 0.94, 0.98),
      borderColor: rgb(0.75, 0.8, 0.88),
      borderWidth: 1,
    });

    const headerRow = rows[0];
    for (let c = 0; c < colCount; c++) {
      const cellText = headerRow[c] || `Col ${c + 1}`;
      // Clean string truncation if wider than cell
      let displayText = cellText;
      while (displayText.length > 0 && fontBold.widthOfTextAtSize(displayText + '...', headerFontSize) > colWidth - 8) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== cellText) displayText += '...';

      page.drawText(displayText, {
        x: margin + c * colWidth + 5,
        y: y - rowHeight + 6,
        size: headerFontSize,
        font: fontBold,
        color: rgb(0.12, 0.16, 0.28),
      });
    }
  };

  // Draw initial header
  drawHeader(currentPage, currentY);
  currentY -= rowHeight;

  // Render Data Rows
  for (let r = 1; r < rows.length; r++) {
    if (currentY - rowHeight < margin + 20) {
      // Add page and repeat header
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
      drawHeader(currentPage, currentY);
      currentY -= rowHeight;
    }

    const row = rows[r];
    const isEven = r % 2 === 0;

    // Row background
    currentPage.drawRectangle({
      x: margin,
      y: currentY - rowHeight,
      width: usableWidth,
      height: rowHeight,
      color: isEven ? rgb(0.98, 0.99, 1.0) : rgb(1, 1, 1),
      borderColor: rgb(0.88, 0.9, 0.93),
      borderWidth: 0.5,
    });

    for (let c = 0; c < colCount; c++) {
      const val = row[c] || '';
      let displayText = String(val);

      while (displayText.length > 0 && fontReg.widthOfTextAtSize(displayText + '...', fontSize) > colWidth - 8) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== String(val)) displayText += '...';

      if (displayText) {
        currentPage.drawText(displayText, {
          x: margin + c * colWidth + 5,
          y: currentY - rowHeight + 6,
          size: fontSize,
          font: fontReg,
          color: rgb(0.18, 0.22, 0.28),
        });
      }
    }

    currentY -= rowHeight;
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert Markdown (.md) documents to beautifully styled PDFs with word wrapping & pagination.
 */
export async function clientMarkdownToPdf(file) {
  const textContent = await file.text();
  const pdfDoc = await PDFDocument.create();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 44;
  const usableWidth = pageWidth - 2 * margin;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentY = pageHeight - margin;

  const checkPageSpace = (neededHeight) => {
    if (currentY - neededHeight < margin) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - margin;
    }
  };

  const lines = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Code block toggle
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentY -= 6;
      continue;
    }

    if (inCodeBlock) {
      checkPageSpace(14);
      currentPage.drawRectangle({
        x: margin,
        y: currentY - 12,
        width: usableWidth,
        height: 14,
        color: rgb(0.95, 0.96, 0.98),
      });
      currentPage.drawText(line.slice(0, 80), {
        x: margin + 8,
        y: currentY - 10,
        size: 9,
        font: fontMono,
        color: rgb(0.18, 0.22, 0.32),
      });
      currentY -= 14;
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      checkPageSpace(16);
      currentPage.drawLine({
        start: { x: margin, y: currentY - 6 },
        end: { x: pageWidth - margin, y: currentY - 6 },
        thickness: 1,
        color: rgb(0.85, 0.88, 0.92),
      });
      currentY -= 16;
      continue;
    }

    // Blank line
    if (line.trim().length === 0) {
      currentY -= 10;
      continue;
    }

    // Heading 1 (# )
    if (line.startsWith('# ')) {
      checkPageSpace(32);
      currentY -= 8;
      currentPage.drawText(line.substring(2).trim(), {
        x: margin,
        y: currentY - 18,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.14, 0.22),
      });
      currentY -= 28;
      continue;
    }

    // Heading 2 (## )
    if (line.startsWith('## ')) {
      checkPageSpace(26);
      currentY -= 6;
      currentPage.drawText(line.substring(3).trim(), {
        x: margin,
        y: currentY - 14,
        size: 14,
        font: fontBold,
        color: rgb(0.15, 0.2, 0.3),
      });
      currentY -= 22;
      continue;
    }

    // Heading 3 (### )
    if (line.startsWith('### ')) {
      checkPageSpace(22);
      currentY -= 4;
      currentPage.drawText(line.substring(4).trim(), {
        x: margin,
        y: currentY - 12,
        size: 12,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });
      currentY -= 18;
      continue;
    }

    // Blockquote (> )
    if (line.startsWith('> ')) {
      const quoteText = line.substring(2).trim();
      checkPageSpace(16);
      currentPage.drawLine({
        start: { x: margin + 2, y: currentY },
        end: { x: margin + 2, y: currentY - 14 },
        thickness: 3,
        color: rgb(0.7, 0.75, 0.85),
      });
      currentPage.drawText(quoteText, {
        x: margin + 14,
        y: currentY - 10,
        size: 10,
        font: fontReg,
        color: rgb(0.35, 0.4, 0.48),
      });
      currentY -= 16;
      continue;
    }

    // List item (- or * or 1.)
    let isBullet = false;
    let listContent = line;
    if (line.startsWith('- ') || line.startsWith('* ')) {
      isBullet = true;
      listContent = line.substring(2).trim();
    } else if (/^\d+\.\s/.test(line)) {
      isBullet = true;
      listContent = line.replace(/^\d+\.\s/, '').trim();
    }

    // Word wrap paragraph or bullet
    const indent = isBullet ? 16 : 0;
    const availWidth = usableWidth - indent;
    const words = listContent.split(' ');
    let currentLine = '';

    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word;
      const testWidth = fontReg.widthOfTextAtSize(testLine, 10);

      if (testWidth <= availWidth) {
        currentLine = testLine;
      } else {
        if (currentLine.length > 0) {
          checkPageSpace(14);
          if (isBullet && w === words.indexOf(currentLine.split(' ')[0])) {
            currentPage.drawText('•', { x: margin + 4, y: currentY - 10, size: 12, font: fontBold, color: rgb(0.85, 0.2, 0.2) });
          }
          currentPage.drawText(currentLine, { x: margin + indent, y: currentY - 10, size: 10, font: fontReg, color: rgb(0.18, 0.22, 0.28) });
          currentY -= 14;
        }
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      checkPageSpace(14);
      if (isBullet && words.length <= currentLine.split(' ').length) {
        currentPage.drawText('•', { x: margin + 4, y: currentY - 10, size: 12, font: fontBold, color: rgb(0.85, 0.2, 0.2) });
      }
      currentPage.drawText(currentLine, { x: margin + indent, y: currentY - 10, size: 10, font: fontReg, color: rgb(0.18, 0.22, 0.28) });
      currentY -= 14;
    }
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Inspect document metadata (title, author, producer, timestamps, page count).
 */
export async function clientInspectMetadata(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  const formatDate = (d) => {
    if (!d) return 'Not specified';
    try {
      return new Date(d).toLocaleString();
    } catch (_) {
      return String(d);
    }
  };

  return {
    fileName: file.name,
    fileSize: (file.size / 1024).toFixed(1) + ' KB',
    pageCount: pdfDoc.getPageCount(),
    title: pdfDoc.getTitle() || '(Empty / Not set)',
    author: pdfDoc.getAuthor() || '(Empty / Not set)',
    subject: pdfDoc.getSubject() || '(Empty / Not set)',
    keywords: pdfDoc.getKeywords() || '(Empty / Not set)',
    creator: pdfDoc.getCreator() || '(Empty / Not set)',
    producer: pdfDoc.getProducer() || '(Empty / Not set)',
    creationDate: formatDate(pdfDoc.getCreationDate()),
    modificationDate: formatDate(pdfDoc.getModificationDate()),
  };
}

/**
 * Sanitize & strip metadata, author info, edit histories, and XMP streams for total privacy.
 */
export async function clientSanitizePdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Clear Info dictionary
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('MyPDF Studio (Sanitized In-Browser)');
  pdfDoc.setCreator('');
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));

  // Strip catalog XMP metadata stream
  try {
    const catalog = pdfDoc.catalog;
    const metadataKey = PDFName.of('Metadata');
    if (catalog.has(metadataKey)) {
      catalog.delete(metadataKey);
    }
    const pieceInfoKey = PDFName.of('PieceInfo');
    if (catalog.has(pieceInfoKey)) {
      catalog.delete(pieceInfoKey);
    }
  } catch (err) {
    console.warn('Metadata catalog strip warning:', err);
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Add customizable page numbers / bates stamping across all pages.
 */
export async function clientAddPageNumbers(file, options = {}) {
  const {
    position = 'bottom-center',
    format = 'page-n-of-total',
    startNumber = 1,
    fontSize = 10,
    colorHex = '#475569',
    margin = 32,
  } = options;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Convert hex color to rgb
  const cleanHex = colorHex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0.28;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0.33;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0.41;
  const textColor = rgb(r, g, b);

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    const curNum = startNumber + i;
    const totalCount = startNumber + totalPages - 1;

    let text = '';
    if (format === 'page-n-of-total') {
      text = `Page ${curNum} of ${totalCount}`;
    } else if (format === 'n-of-total') {
      text = `${curNum} / ${totalCount}`;
    } else if (format === 'page-n') {
      text = `Page ${curNum}`;
    } else {
      text = `${curNum}`;
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    let x = margin;
    let y = margin;

    // Horizontal
    if (position.includes('center')) {
      x = (width - textWidth) / 2;
    } else if (position.includes('right')) {
      x = width - margin - textWidth;
    } else {
      x = margin;
    }

    // Vertical
    if (position.includes('top')) {
      y = height - margin - fontSize;
    } else {
      y = margin;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: textColor,
    });
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert color PDF to grayscale monochrome directly in-browser for high ink-savings or print prep.
 */
export async function clientGrayscalePdf(file, onProgress = null) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const newDoc = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    if (onProgress) {
      onProgress({ status: `Converting page ${i} of ${numPages} to grayscale...`, progress: Math.round((i / numPages) * 88) });
    }

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // 144 DPI high crispness
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Fast luminance formula: Y = 0.299R + 0.587G + 0.114B
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let p = 0; p < data.length; p += 4) {
      const gray = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
      data[p] = gray;
      data[p + 1] = gray;
      data[p + 2] = gray;
    }
    ctx.putImageData(imgData, 0, 0);

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const base64Data = jpegDataUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const jpegBytes = new Uint8Array(binaryStr.length);
    for (let b = 0; b < binaryStr.length; b++) {
      jpegBytes[b] = binaryStr.charCodeAt(b);
    }

    const embeddedImg = await newDoc.embedJpg(jpegBytes);
    const origViewport = page.getViewport({ scale: 1.0 });
    const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
    newPage.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: origViewport.width,
      height: origViewport.height,
    });
  }

  if (onProgress) onProgress({ status: 'Finalizing monochrome document...', progress: 98 });
  const pdfBytes = await newDoc.save({ useObjectStreams: true });
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

