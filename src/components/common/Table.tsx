import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  emptyHint?: string;
  className?: string;
  /** Visually hidden caption for screen readers. */
  caption?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  emptyHint = 'New entries will appear here once registered.',
  className = '',
  caption,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
        <div className="w-11 h-11 rounded-2xl bg-ink-50 ring-1 ring-line flex items-center justify-center text-ink-400 mb-3">
          <Inbox className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold text-ink-800">{emptyMessage}</p>
        <p className="text-[13px] text-ink-500 mt-1 max-w-sm">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full text-left text-sm text-ink-800">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="border-b border-line bg-ink-50/60">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                scope="col"
                className={cn('px-5 py-3 text-xs font-semibold text-ink-500 whitespace-nowrap first:pl-6 last:pr-6', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="transition-colors hover:bg-brand-50/40">
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={cn('px-5 py-4 whitespace-nowrap align-middle first:pl-6 last:pr-6', col.className)}>
                  {col.cell ? col.cell(item) : col.accessorKey ? String(item[col.accessorKey] ?? '') : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
