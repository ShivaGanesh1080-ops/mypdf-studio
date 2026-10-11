import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';

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
 * Convert Plain Text / Markdown to PDF in browser RAM.
 */
export async function clientTextToPdf(file) {
  const textContent = await file.text();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const lines = textContent.split('\n');
  const fontSize = 10;
  const lineHeight = 14;
  const margin = 40;
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let currentLineIndex = 0;

  for (const rawLine of lines) {
    if (currentLineIndex >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      currentLineIndex = 0;
    }

    const y = pageHeight - margin - (currentLineIndex + 1) * lineHeight;
    const cleanLine = rawLine.replace(/[\r\t]/g, '    ').substring(0, 95);

    currentPage.drawText(cleanLine, {
      x: margin,
      y: y,
      size: fontSize,
      font: font,
      color: rgb(0.12, 0.16, 0.23),
    });

    currentLineIndex++;
  }

  const pdfBytes = await pdfDoc.save();
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
