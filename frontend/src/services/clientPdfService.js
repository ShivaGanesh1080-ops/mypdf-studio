import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to use unpkg CDN matching installed version
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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

