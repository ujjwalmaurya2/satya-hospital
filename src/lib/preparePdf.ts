// Types only: the PDF library (~550 KB) loads on demand, never with the public lab pages.
import type { PdfCompressResult } from './pdfCompress';

/** A problem with the file itself (mirrors PdfFileError without importing the library). */
export class PdfInputError extends Error {}
const isFileError = (e: unknown) => e instanceof PdfInputError || (e instanceof Error && e.name === 'PdfFileError');
const inline = async (bytes: Uint8Array) => (await import('./pdfCompress')).compressPdf(bytes);

/** Largest file staff may pick; the stored file must still fit the 10 MB bucket limit. */
export const MAX_INPUT_PDF_BYTES = 30 * 1024 * 1024;
export const MAX_STORED_PDF_BYTES = 10 * 1024 * 1024;
const WORKER_TIMEOUT_MS = 60_000;

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function inWorker(buffer: ArrayBuffer): Promise<PdfCompressResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./pdfCompress.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('timeout'));
    }, WORKER_TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timer);
      worker.terminate();
      if (e.data.ok) resolve(e.data.result);
      else reject(e.data.fileError ? new PdfInputError(e.data.message) : new Error(e.data.message));
    };
    worker.onerror = () => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error('worker failed'));
    };
    worker.postMessage(buffer, [buffer]);
  });
}

/**
 * Validate a report PDF and try to make it smaller. File problems (not a PDF,
 * damaged, password-protected, too big) throw; a failed compression attempt
 * just falls back to the original bytes.
 */
export async function preparePdf(file: File): Promise<PdfCompressResult> {
  if (file.size > MAX_INPUT_PDF_BYTES) throw new PdfInputError(`This PDF is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_INPUT_PDF_BYTES)}.`);
  const original = new Uint8Array(await file.arrayBuffer());

  let result: PdfCompressResult;
  try {
    result = typeof Worker !== 'undefined' ? await inWorker(original.slice().buffer) : await inline(original);
  } catch (e) {
    if (isFileError(e)) throw new PdfInputError((e as Error).message);
    // Worker unavailable or timed out: still validate the file, then keep the original.
    try {
      result = await inline(original);
    } catch (inner) {
      if (isFileError(inner)) throw new PdfInputError((inner as Error).message);
      result = { bytes: original, originalSize: file.size, finalSize: file.size, compressed: false, pageCount: 0, note: 'Compression was not available; the original was uploaded.' };
    }
  }

  if (result.finalSize > MAX_STORED_PDF_BYTES) {
    throw new PdfInputError(`Even after compression this PDF is ${formatBytes(result.finalSize)}. Reports must be ${formatBytes(MAX_STORED_PDF_BYTES)} or smaller.`);
  }
  return result;
}
