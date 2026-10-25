/// <reference lib="webworker" />
// Runs compressPdf off the main thread so large reports don't freeze the desk.
import { compressPdf, PdfFileError } from './pdfCompress';

self.onmessage = async (e: MessageEvent<ArrayBuffer>) => {
  try {
    const r = await compressPdf(new Uint8Array(e.data));
    const copy = r.bytes.slice(); // own buffer, safe to transfer
    self.postMessage({ ok: true, result: { ...r, bytes: copy } }, [copy.buffer]);
  } catch (err) {
    self.postMessage({ ok: false, fileError: err instanceof PdfFileError, message: err instanceof Error ? err.message : 'Could not process the PDF.' });
  }
};
