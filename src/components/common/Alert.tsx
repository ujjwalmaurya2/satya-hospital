import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

const styles = {
  info: { box: 'bg-brand-50 border-brand-200/80', icon: <Info className="w-[18px] h-[18px] text-brand-600" />, title: 'text-brand-900', body: 'text-brand-800' },
  success: { box: 'bg-leaf-50 border-leaf-200', icon: <CheckCircle2 className="w-[18px] h-[18px] text-leaf-600" />, title: 'text-leaf-900', body: 'text-leaf-800' },
  warning: { box: 'bg-warning-50 border-warning-200', icon: <AlertTriangle className="w-[18px] h-[18px] text-warning-600" />, title: 'text-warning-700', body: 'text-warning-700' },
  error: { box: 'bg-danger-50 border-danger-200', icon: <AlertCircle className="w-[18px] h-[18px] text-danger-600" />, title: 'text-danger-700', body: 'text-danger-700' },
};

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children, className = '', action }) => {
  const s = styles[type];
  return (
    <div
      role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm', s.box, className)}
    >
      <span className="mt-px shrink-0" aria-hidden="true">{s.icon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className={cn('font-semibold text-sm', s.title)}>{title}</p>}
        <div className={cn('text-[13px] leading-relaxed', title && 'mt-0.5', s.body)}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
