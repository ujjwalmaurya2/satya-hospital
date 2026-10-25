import React, { useState } from 'react';
import { FileText, FlaskConical, PhoneCall } from 'lucide-react';
import { Badge, BadgeVariant } from '../common/Badge';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { prettyDate } from '../patient/PatientUI';
import { formatPaise } from '../../lib/labCart';
import { phoneHref } from '../../lib/contact';
import { LabOrder, labService } from '../../services/labService';

export const ORDER_STATUS: Record<LabOrder['status'], { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Awaiting confirmation', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};
export const PAYMENT_STATUS: Record<LabOrder['payment_status'], { label: string; variant: BadgeVariant }> = {
  unpaid: { label: 'Unpaid', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  refund_due: { label: 'Refund due', variant: 'peach' },
  refunded: { label: 'Refunded', variant: 'neutral' },
  needs_reconciliation: { label: 'Payment under review', variant: 'danger' },
};
export const LAB_STATUS: Record<LabOrder['lab_status'], { label: string; variant: BadgeVariant }> = {
  awaiting_sample: { label: 'Sample not collected', variant: 'neutral' },
  sample_collected: { label: 'Sample collected', variant: 'info' },
  processing: { label: 'In the lab', variant: 'medical-blue' },
  completed: { label: 'Reports ready', variant: 'success' },
};

/** Patient-facing order summary with released reports and cancellation. */
export const LabOrderCard: React.FC<{
  order: LabOrder;
  receptionPhone?: string;
  onChanged?: () => void;
  onPay?: () => void;
  payBusy?: boolean;
}> = ({ order, receptionPhone, onChanged, onPay, payBusy }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const released = (order.reports ?? []).filter(r => r.status === 'published');
  const canCancel = order.status !== 'cancelled' && order.payment_status === 'unpaid' && order.lab_status === 'awaiting_sample';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-3xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-ink-900">{order.order_number}</p>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Booked {prettyDate(order.created_at)} · {order.patient_name}
            {order.preferred_date && ` · Visit ${prettyDate(order.preferred_date)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge size="sm" variant={ORDER_STATUS[order.status].variant}>{ORDER_STATUS[order.status].label}</Badge>
          <Badge size="sm" variant={PAYMENT_STATUS[order.payment_status].variant}>{PAYMENT_STATUS[order.payment_status].label}</Badge>
          {order.status !== 'cancelled' && <Badge size="sm" variant={LAB_STATUS[order.lab_status].variant}>{LAB_STATUS[order.lab_status].label}</Badge>}
        </div>
      </header>

      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
        {order.items.map(i => (
          <li key={i.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-ink-900">{i.name}</p>
              {i.item_type === 'package' && <p className="mt-0.5 text-[13px] text-ink-500">Includes {i.test_names.join(', ')}</p>}
            </div>
            <span className="shrink-0 tabular-nums text-ink-700">{formatPaise(i.price_paise)}</span>
          </li>
        ))}
        <li className="flex justify-between px-4 py-3 text-sm font-semibold text-ink-900">
          <span>Total</span>
          <span className="tabular-nums">{formatPaise(order.total_paise)}</span>
        </li>
      </ul>

      {released.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-ink-900">Reports</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {released.map(r => (
              <li key={r.id}>
                <Button size="sm" variant="soft" leftIcon={<FileText className="h-4 w-4" />} onClick={() => run(() => labService.openReport(r.storage_key))} disabled={busy}>
                  {r.test_name}
                  {r.version_number > 1 && ` (v${r.version_number})`}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.status === 'pending' && order.payment_status === 'unpaid' && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-brand-50 p-3 text-[13px] text-brand-900 ring-1 ring-brand-100">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {onPay ? 'Pay online to confirm, or pay at the lab counter when you visit.' : 'Visit the hospital lab with this order number. Payment is taken at the counter.'}
        </p>
      )}
      {order.payment_status === 'needs_reconciliation' && (
        <Alert type="warning" className="mt-4 text-sm">We received a payment that needs checking. The hospital will contact you; please keep your order number.</Alert>
      )}
      {order.payment_status === 'refund_due' && <Alert type="info" className="mt-4 text-sm">This order was cancelled after payment. Your refund is being processed by the hospital.</Alert>}
      {error && <Alert type="error" className="mt-4 text-sm">{error}</Alert>}

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        {onPay && order.status === 'pending' && order.payment_status === 'unpaid' && (
          <Button size="sm" onClick={onPay} isLoading={payBusy} loadingText="Opening payment…">
            Pay {formatPaise(order.total_paise)} online
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => window.confirm('Cancel this lab order?') && run(async () => {
              await labService.cancel(order.id, 'Cancelled by patient');
              onChanged?.();
            })}
          >
            Cancel order
          </Button>
        )}
        {!canCancel && order.status !== 'cancelled' && order.lab_status !== 'completed' && receptionPhone && (
          <a href={phoneHref(receptionPhone)} className="link inline-flex items-center gap-1.5 text-[13px]">
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" /> Need to change or cancel? Call reception
          </a>
        )}
      </footer>
    </article>
  );
};
