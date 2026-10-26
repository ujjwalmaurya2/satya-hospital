import { describe, expect, it } from 'vitest';
import { detectRecordFile } from '../services/receptionService';

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(20).fill(0)]);

describe('record upload file check (content, not just the name)', () => {
  it('accepts real PDF, JPEG and PNG files', async () => {
    expect(await detectRecordFile(new File(['%PDF-1.7\n...'], 'rx.pdf'))).toEqual({ mime: 'application/pdf', ext: 'pdf' });
    expect(await detectRecordFile(new File([bytes(0xff, 0xd8, 0xff, 0xe0)], 'scan.JPEG'))).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    expect(await detectRecordFile(new File([bytes(0x89, 0x50, 0x4e, 0x47)], 'photo.png', { type: '' }))).toEqual({ mime: 'image/png', ext: 'png' });
  });

  it('rejects renamed or unsupported files', async () => {
    expect(await detectRecordFile(new File(['MZ executable'], 'rx.pdf'))).toBeNull();
    expect(await detectRecordFile(new File([bytes(0x89, 0x50, 0x4e, 0x47)], 'photo.jpg'))).toBeNull(); // PNG named .jpg
    expect(await detectRecordFile(new File(['%PDF-1.7'], 'rx.docx'))).toBeNull();
    expect(await detectRecordFile(new File(['GIF89a'], 'x.gif'))).toBeNull();
  });
});
