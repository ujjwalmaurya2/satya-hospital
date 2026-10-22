import React from 'react';
import clsx from 'clsx';
import { Inbox } from 'lucide-react';

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
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records found.',
  className = '',
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-xl border border-[#E1E8ED]">
        <div className="w-12 h-12 rounded-full bg-[#F4F8FA] flex items-center justify-center text-[#667085] mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-[#243447]">{emptyMessage}</p>
        <p className="text-xs text-[#667085] mt-1">New entries will appear here once registered.</p>
      </div>
    );
  }

  return (
    <div className={clsx('w-full overflow-x-auto rounded-xl border border-[#E1E8ED] bg-white shadow-xs', className)}>
      <table className="w-full text-left text-sm text-[#243447]">
        <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#667085] uppercase tracking-wider border-b border-[#E1E8ED]">
          <tr>
            {columns.map((col, index) => (
              <th key={index} scope="col" className={clsx('px-5 py-3.5 whitespace-nowrap', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E1E8ED]">
          {data.map((item, rowIdx) => (
            <tr
              key={keyExtractor(item)}
              className={clsx(
                'transition-colors hover:bg-[#F8FAFC]',
                rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#FAFCFD]'
              )}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={clsx('px-5 py-3.5 whitespace-nowrap text-sm', col.className)}>
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
