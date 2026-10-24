import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  description?: string;
}

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl', '2xl': 'sm:max-w-2xl' };

/** Accessible dialog: bottom sheet on phones, centred card on larger screens. */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'md', description }) => {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([data-modal-close]), [href], [tabindex]:not([tabindex="-1"])'
      );
      (el || panelRef.current)?.focus();
    };
    const id = window.setTimeout(focusFirst, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-ink-950/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative w-full bg-white shadow-float border border-line overflow-hidden flex flex-col outline-none',
              'rounded-t-3xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[86vh]',
              widths[maxWidth]
            )}
          >
            <div className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink-200" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-line">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold text-ink-900 tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="text-[13px] text-ink-500 mt-1 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                data-modal-close
                onClick={onClose}
                className="-mr-1.5 p-2 text-ink-500 hover:text-ink-900 hover:bg-ink-50 rounded-full transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 sm:px-6 py-5 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
