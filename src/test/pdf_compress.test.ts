/**
 * Lossless compression checks with real PDF bytes. Sizes are measured and
 * printed so results can be reported as observed, not promised.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodePDFRawStream, PDFDocument, PDFName, PDFRawStream, StandardFonts } from '@cantoo/pdf-lib';
import { compressPdf, PdfFileError } from '../lib/pdfCompress';

const img = (name: string) => readFileSync(resolve(__dirname, '../../public/images', name));

/** Decoded bytes of every page's content stream and images, in page order (what a reader renders). */
async function pageContents(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const decoded = (s: unknown) => {
    if (!(s instanceof PDFRawStream)) return String(s);
    try {
      return Buffer.from(decodePDFRawStream(s).decode()).toString('base64');
    } catch {
      return Buffer.from(s.getContents()).toString('base64'); // JPEG (DCT) data: compare the exact bytes
    }
  };
  return doc.getPages().map(p => {
    const xobjects = p.node.Resources()?.lookupMaybe(PDFName.of('XObject'), Object as never) as unknown as { entries?: () => [unknown, unknown][] } | undefined;
    const images = xobjects?.entries?.().map(([, ref]) => decoded(doc.context.lookup(ref as never))) ?? [];
    return [decoded(doc.context.lookup(p.node.Contents()!)), ...images].join('|');
  });
}

/** Scanner-style output: uncompressed page content and an uncompressed greyscale bitmap. */
async function uncompressedScan() {
  const doc = await PDFDocument.create();
  const w = 600, h = 800, pixels = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) pixels[y * w + x] = (x % 40 < 2 || y % 24 < 2) ? 40 : 250; // ruled form, mostly white
  const image = doc.context.register(doc.context.stream(pixels, { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: 'DeviceGray', BitsPerComponent: 8 }));
  const rows = Array.from({ length: 300 }, (_, i) => `BT /F1 9 Tf 40 ${800 - (i % 80) * 10} Td (Result row ${i}) Tj ET`);
  const ops = [`q ${w} 0 0 ${h} 0 0 cm /Im1 Do Q`, ...rows].join('\n');
  const content = doc.context.register(doc.context.stream(new TextEncoder().encode(ops)));
  const page = doc.addPage([w, h]);
  page.node.set(PDFName.of('Contents'), content);
  page.node.set(PDFName.of('Resources'), doc.context.obj({ XObject: { Im1: image } }));
  return doc.save({ useObjectStreams: false });
}

async function textReport(pages: number, objectStreams: boolean) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595, 842]);
    for (let line = 0; line < 40; line++) page.drawText(`Page ${i + 1} · line ${line + 1} · Haemoglobin 13.2 g/dL reference 12–16`, { x: 40, y: 800 - line * 18, size: 10, font });
  }
  return doc.save({ useObjectStreams: objectStreams });
}

async function scannedReport() {
  const doc = await PDFDocument.create();
  for (const name of ['pediatric-hero.jpg', 'newborn-care.jpg', 'satya-hospital-building.jpg']) {
    const jpg = await doc.embedJpg(img(name));
    doc.addPage([jpg.width, jpg.height]).drawImage(jpg, { x: 0, y: 0, width: jpg.width, height: jpg.height });
  }
  return doc.save({ useObjectStreams: false });
}

const pct = (a: number, b: number) => `${(((a - b) / a) * 100).toFixed(1)}%`;
const log = (label: string, r: { originalSize: number; finalSize: number; compressed: boolean; note?: string }) =>
  console.log(`[pdf] ${label}: ${r.originalSize} → ${r.finalSize} bytes (saved ${pct(r.originalSize, r.finalSize)}) compressed=${r.compressed}${r.note ? ` · ${r.note}` : ''}`);

describe('compressPdf', () => {
  it('shrinks a text report without changing pages or content', async () => {
    const input = await textReport(12, false);
    const r = await compressPdf(input);
    log('12-page text report', r);
    expect(r.compressed).toBe(true);
    expect(r.finalSize).toBeLessThan(r.originalSize);
    expect(r.pageCount).toBe(12);
    expect(await pageContents(r.bytes)).toEqual(await pageContents(input)); // same pages, same order, same bytes
  });

  it('keeps scanned images byte-for-byte (no downsampling)', async () => {
    const input = await scannedReport();
    const r = await compressPdf(input);
    log('3-page scanned (JPEG) report', r);
    expect(r.pageCount).toBe(3);
    expect(await pageContents(r.bytes)).toEqual(await pageContents(input));
    if (r.compressed) expect(r.finalSize).toBeLessThan(r.originalSize);
    else expect(r.bytes).toBe(input);
  });

  it('losslessly compresses an uncompressed scanner-style PDF', async () => {
    const input = await uncompressedScan();
    const r = await compressPdf(input);
    log('uncompressed scan (600x800 bitmap + text)', r);
    expect(r.compressed).toBe(true);
    expect(r.finalSize).toBeLessThan(r.originalSize / 4);
    expect(await pageContents(r.bytes)).toEqual(await pageContents(input)); // identical pixels and drawing commands
  });

  it('never rewrites a digitally signed PDF', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.catalog.set(PDFName.of('AcroForm'), doc.context.obj({ Fields: [], SigFlags: 3 }));
    const input = await doc.save({ useObjectStreams: false });
    const r = await compressPdf(input);
    expect(r.compressed).toBe(false);
    expect(r.bytes).toBe(input);
    expect(r.note).toMatch(/digitally signed/);
  });

  it('keeps the original when the PDF is already compact', async () => {
    const input = await textReport(3, true);
    const r = await compressPdf(input);
    log('already-optimised report', r);
    expect(r.compressed).toBe(false);
    expect(r.bytes).toBe(input);
    expect(r.note).toMatch(/already compact/);
  });

  it('rejects damaged, non-PDF and encrypted files with a clear message', async () => {
    const good = await textReport(1, false);
    const truncated = good.slice(0, 200);
    await expect(compressPdf(truncated)).rejects.toThrow(PdfFileError);
    await expect(compressPdf(new TextEncoder().encode('hello, not a pdf'))).rejects.toThrow(/not a PDF/);

    // Minimal PDF whose trailer declares encryption.
    const enc = new TextEncoder().encode(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n3 0 obj<</Filter/Standard/V 1/R 2/O(x)/U(x)/P -4>>endobj\n' +
        'trailer<</Root 1 0 R/Encrypt 3 0 R/Size 4>>\n%%EOF'
    );
    await expect(compressPdf(enc)).rejects.toThrow(/password-protected/);
  });
});

describe('preparePdf (upload pipeline)', () => {
  it('compresses valid files and rejects non-PDF, damaged and oversized files before upload', async () => {
    const { preparePdf, PdfInputError, MAX_INPUT_PDF_BYTES } = await import('../lib/preparePdf');
    const bytes = await textReport(6, false);
    const ok = await preparePdf(new File([bytes], 'report.pdf', { type: '' })); // Windows sometimes reports no MIME type
    expect(ok.compressed).toBe(true);
    expect(ok.pageCount).toBe(6);

    await expect(preparePdf(new File(['not a pdf'], 'x.pdf'))).rejects.toThrow(PdfInputError);
    await expect(preparePdf(new File(['%PDF-1.4 garbage'], 'g.pdf'))).rejects.toThrow(PdfInputError); // header only
    await expect(preparePdf(new File([bytes.slice(0, 300)], 'cut.pdf'))).rejects.toThrow(/damaged|no pages/);
    const huge = new File([new Uint8Array(MAX_INPUT_PDF_BYTES + 1)], 'huge.pdf');
    await expect(preparePdf(huge)).rejects.toThrow(/The limit is/);
  });
});
