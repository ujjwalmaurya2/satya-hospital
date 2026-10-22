import React from 'react';
import clsx from 'clsx';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className = '',
  action,
}) => {
  const styles = {
    info: {
      container: 'bg-[#EBF6FC] border-[#BCE1F5] text-[#1E78A4]',
      icon: <Info className="w-5 h-5 text-[#3DA9DF] shrink-0" />,
      titleColor: 'text-[#19597B]',
    },
    success: {
      container: 'bg-[#F3F8EC] border-[#D5E8B5] text-[#3A5612]',
      icon: <CheckCircle2 className="w-5 h-5 text-[#91BB40] shrink-0" />,
      titleColor: 'text-[#2C420D]',
    },
    warning: {
      container: 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]',
      icon: <AlertTriangle className="w-5 h-5 text-[#D97706] shrink-0" />,
      titleColor: 'text-[#78350F]',
    },
    error: {
      container: 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]',
      icon: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
      titleColor: 'text-[#7F1D1D]',
    },
  };

  const current = styles[type];

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 p-4 rounded-xl border text-sm',
        current.container,
        className
      )}
    >
      {current.icon}
      <div className="flex-1">
        {title && <h4 className={clsx('font-semibold text-sm mb-0.5', current.titleColor)}>{title}</h4>}
        <div className="text-xs leading-relaxed opacity-95">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
