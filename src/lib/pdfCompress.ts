/**
 * Lossless PDF size reduction for medical reports. Runs locally (browser
 * worker or tests); files are never sent to a third-party service.
 *
 * What it does: Flate-compresses streams stored uncompressed, then re-saves with
 * compressed object streams. Already-compressed content (JPEG scans, fonts) and
 * metadata are copied byte-for-byte; nothing is rasterised or downsampled.
 * The result is used only if it re-opens with the same pages and is smaller.
 */
import { EncryptedPDFError, PDFDict, PDFDocument, PDFName, PDFNumber, PDFObject, PDFRawStream } from '@cantoo/pdf-lib';

/** A problem with the file itself: the upload must not go ahead. */
export class PdfFileError extends Error {
  name = 'PdfFileError';
}

export interface PdfCompressResult {
  bytes: Uint8Array;
  originalSize: number;
  finalSize: number;
  compressed: boolean;
  pageCount: number;
  /** Why the original was kept, when it was. */
  note?: string;
}

export function hasPdfHeader(bytes: Uint8Array): boolean {
  // The header may follow a few junk bytes; the spec allows it within the first 1 KB.
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  return head.includes('%PDF-');
}

/**
 * Flate-compress streams stored with no filter at all (common in scanner and
 * report-generator output). Flate is lossless: readers decode the exact bytes.
 * XMP metadata stays uncompressed so it remains readable to archiving tools.
 */
function flateUncompressedStreams(doc: PDFDocument) {
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream) || obj.dict.has(PDFName.of('Filter'))) continue;
    if (obj.dict.get(PDFName.of('Type')) === PDFName.of('Metadata')) continue;
    const contents = obj.getContents();
    if (contents.length < 256) continue;
    const entries: Record<string, PDFObject> = {};
    for (const [key, value] of obj.dict.entries()) if (key !== PDFName.of('Length')) entries[key.decodeText()] = value;
    const packed = doc.context.flateStream(contents, entries);
    if (packed.getContents().length < contents.length) doc.context.assign(ref, packed);
  }
}

function pageShape(doc: PDFDocument) {
  return doc.getPages().map(p => {
    const { width, height } = p.getSize();
    return `${Math.round(width * 100)}x${Math.round(height * 100)}r${p.getRotation().angle}`;
  });
}

export async function compressPdf(input: Uint8Array): Promise<PdfCompressResult> {
  const originalSize = input.byteLength;
  if (!hasPdfHeader(input)) throw new PdfFileError('This file is not a PDF. Please choose the report PDF.');

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(input, { updateMetadata: false });
  } catch (e) {
    if (e instanceof EncryptedPDFError) throw new PdfFileError('This PDF is password-protected. Save an unprotected copy and upload that.');
    throw new PdfFileError('This PDF could not be read — it may be damaged. Please export it again.');
  }
  // Reading the page tree is part of validation: a file that parses but has no usable pages is not a report.
  let pageCount: number;
  try {
    pageCount = doc.getPageCount();
    pageShape(doc);
  } catch {
    throw new PdfFileError('This PDF could not be read — it may be damaged. Please export it again.');
  }
  if (pageCount === 0) throw new PdfFileError('This PDF has no pages.');

  const keep = (note: string): PdfCompressResult => ({ bytes: input, originalSize, finalSize: originalSize, compressed: false, pageCount, note });

  // Any rewrite invalidates a digital signature, so signed reports are stored exactly as received.
  const sigFlags = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)?.get(PDFName.of('SigFlags'));
  if (sigFlags instanceof PDFNumber && sigFlags.asNumber() > 0) return keep('This PDF is digitally signed, so it was uploaded unchanged.');

  try {
    flateUncompressedStreams(doc);
  } catch {
    return keep('Compression was skipped for this file; the original was uploaded.');
  }

  let output: Uint8Array;
  try {
    output = await doc.save({ useObjectStreams: true, updateFieldAppearances: false });
  } catch {
    return keep('Compression was skipped for this file; the original was uploaded.');
  }
  if (output.byteLength >= originalSize) return keep('This PDF is already compact; the original was uploaded.');

  // Integrity check: the smaller file must open and have identical pages.
  try {
    const check = await PDFDocument.load(output, { updateMetadata: false });
    if (check.getPageCount() !== pageCount || pageShape(check).join() !== pageShape(doc).join()) {
      return keep('Compression changed the page layout, so the original was uploaded.');
    }
  } catch {
    return keep('The compressed copy could not be verified, so the original was uploaded.');
  }

  return { bytes: output, originalSize, finalSize: output.byteLength, compressed: true, pageCount };
}
