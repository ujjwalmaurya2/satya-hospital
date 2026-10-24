import React, { useId, useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

interface FileDropProps {
  file: File | null;
  onChange: (file: File | null) => void;
  /** Comma-separated accept list, e.g. "application/pdf". */
  accept: string;
  label: string;
  hint?: string;
  maxMb?: number;
}

/** Drag-and-drop file picker with type/size validation feedback. */
export const FileDrop: React.FC<FileDropProps> = ({ file, onChange, accept, label, hint, maxMb = 10 }) => {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepts = accept.split(',').map(s => s.trim());
  const pick = (f: File | undefined | null) => {
    setError(null);
    if (!f) return;
    if (!accepts.includes(f.type)) {
      setError(`“${f.name}” isn’t an accepted file type.`);
      return;
    }
    if (f.size > maxMb * 1024 * 1024) {
      setError(`“${f.name}” is larger than ${maxMb} MB.`);
      return;
    }
    onChange(f);
  };

  return (
    <div>
      <p className="field-label" id={`${id}-label`}>
        {label}
      </p>
      <div
        onDragOver={e => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'rounded-2xl border-2 border-dashed px-5 py-6 text-center transition-colors',
          over ? 'border-brand-500 bg-brand-50' : error ? 'border-danger-200 bg-danger-50/50' : 'border-line-strong bg-ink-50/40'
        )}
      >
        {file ? (
          <div className="flex items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-line">
            <FileText className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{file.name}</p>
              <p className="text-xs text-ink-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 hover:text-ink-900 cursor-pointer"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="mx-auto h-7 w-7 text-brand-500" aria-hidden="true" />
            <p className="mt-2 text-sm text-ink-700">Drag a file here, or</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => input.current?.click()}>
              Choose file
            </Button>
            {hint && <p className="mt-2.5 text-xs text-ink-500">{hint}</p>}
          </>
        )}
        <input
          ref={input}
          type="file"
          accept={accept}
          className="sr-only"
          aria-labelledby={`${id}-label`}
          onChange={e => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
