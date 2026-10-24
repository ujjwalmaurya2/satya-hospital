import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Alert } from '../common/Alert';
import { Panel } from '../dashboard/Dashboard';
import { PaymentCase, paymentCasesService } from '../../services/paymentCasesService';
import { formatInr } from '../../lib/queue';

/** Online payment exceptions, live-updated. Admin can record how a case was settled. */
export const PaymentCasesPanel: React.FC<{ today: string; canResolve: boolean }> = ({ today, canResolve }) => {
  const [cases, setCases] = useState<PaymentCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<PaymentCase | null>(null);
  const [resolution, setResolution] = useState<'refunded' | 'resolved'>('refunded');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCases(await paymentCasesService.list(today));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load payment cases.');
    }
  }, [today]);

  useEffect(() => {
    load();
    return paymentCasesService.subscribe(load);
  }, [load]);

  const save = async () => {
    if (!active) return;
    setSaving(true);
    setSaveError(null);
    try {
      await paymentCasesService.resolve(active.id, resolution, note.trim());
      setActive(null);
      setNote('');
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the resolution.');
    } finally {
      setSaving(false);
    }
  };

  if (!error && cases.length === 0) return null;

  return (
    <Panel
      flush
      className="border-warning-200"
      title={
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning-600" aria-hidden="true" /> Online payments needing attention
        </span>
      }
      description="Never confirm these at the desk. Refunds are issued from the Razorpay dashboard, then recorded here by an administrator."
      actions={<Badge variant="warning">{cases.length}</Badge>}
    >
      {error && <Alert type="error" className="m-5">{error}</Alert>}
      <ul className="divide-y divide-line">
        {cases.map(c => (
          <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink-900">{c.patientName}</p>
                <Badge variant={c.status === 'needs_reconciliation' ? 'warning' : 'neutral'} size="sm" dot>
                  {c.status === 'needs_reconciliation' ? 'Paid · not confirmed' : 'Payment failed'}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-xs text-ink-500">
                {c.bookingReference} · +91 {c.contactPhone} · {c.appointmentDate} · {formatInr(c.amountPaise / 100)}
                {c.razorpayPaymentId ? ` · ${c.razorpayPaymentId}` : ''}
              </p>
              <p className="mt-1.5 text-[13px] text-ink-700">{c.reconciliationReason || c.lastPaymentError}</p>
            </div>
            {canResolve && c.status === 'needs_reconciliation' && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => {
                  setActive(c);
                  setSaveError(null);
                }}
              >
                Record resolution
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Modal isOpen={Boolean(active)} onClose={() => setActive(null)} title="Record resolution" description={active ? `${active.bookingReference} · ${active.patientName}` : ''}>
        <div className="space-y-4">
          {saveError && <Alert type="error">{saveError}</Alert>}
          <div role="radiogroup" aria-label="Resolution" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['refunded', 'resolved'] as const).map(r => (
              <label key={r} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm ${resolution === r ? 'border-brand-500 bg-brand-50' : 'border-line'}`}>
                <input type="radio" name="resolution" checked={resolution === r} onChange={() => setResolution(r)} className="mt-0.5 accent-brand-700" />
                <span>
                  <span className="block font-medium text-ink-900">{r === 'refunded' ? 'Refund issued' : 'Handled another way'}</span>
                  <span className="text-xs text-ink-500">{r === 'refunded' ? 'Refunded in the Razorpay dashboard' : 'e.g. appointment arranged manually'}</span>
                </span>
              </label>
            ))}
          </div>
          <div>
            <label htmlFor="res-note" className="field-label">Note (required)</label>
            <textarea id="res-note" rows={3} value={note} onChange={e => setNote(e.target.value)} className="field-control resize-y" placeholder="Refund ID, who handled it, what the patient was told" />
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <Button onClick={save} isLoading={saving} loadingText="Saving…" disabled={!note.trim()}>
              Save resolution
            </Button>
          </div>
        </div>
      </Modal>
    </Panel>
  );
};
