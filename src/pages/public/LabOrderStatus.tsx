import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Alert } from '../../components/common/Alert';
import { LinkButton } from '../../components/common/Button';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { PageHero, Section } from '../../components/site/Section';
import { LabOrderCard } from '../../components/lab/LabOrderCard';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { LabOrder, labService } from '../../services/labService';

const POLL_MS = 2500;
const POLL_LIMIT_MS = 60_000;

/** Order confirmation and status. After a payment it polls until the server confirms it. */
export const LabOrderStatus: React.FC = () => {
  const { orderNumber = '' } = useParams();
  const location = useLocation();
  const { settings } = useHospital();
  const { user, isLiveSession, isLoading } = useAuth();
  const state = (location.state as { notice?: string; justPaid?: boolean } | null) ?? {};

  const [order, setOrder] = useState<LabOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(state.notice ?? null);
  const [waiting, setWaiting] = useState(Boolean(state.justPaid));
  const [paying, setPaying] = useState(false);
  const [onlinePay, setOnlinePay] = useState(false);

  const load = useCallback(async () => {
    const o = await labService.order(orderNumber);
    setOrder(o);
    setMissing(!o);
    return o;
  }, [orderNumber]);

  useEffect(() => {
    if (isLoading || !isLiveSession) return;
    labService.config().then(c => setOnlinePay(c.online_payment_enabled));
    let stop = false;
    const started = Date.now();
    const tick = async () => {
      const o = await load().catch(() => null);
      if (stop) return;
      const stillPending = waiting && o?.payment_status === 'unpaid' && Date.now() - started < POLL_LIMIT_MS;
      if (stillPending) window.setTimeout(tick, POLL_MS);
      else setWaiting(false);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [isLoading, isLiveSession, load]);

  const pay = async () => {
    if (!order) return;
    setPaying(true);
    setError(null);
    try {
      const r = await labService.pay(order.order_number, user?.email);
      if (r === 'paid') setWaiting(true);
      else if (r !== 'dismissed') setError(`${r.failed} You can try again.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment could not start.');
    } finally {
      setPaying(false);
    }
  };

  let body: React.ReactNode;
  if (isLoading || (!order && !missing && isLiveSession)) body = <MedicalLoader label="Loading your order…" />;
  else if (!isLiveSession) body = <Alert type="info">Please sign in with the Google account you used to book to see this order.</Alert>;
  else if (missing || !order) body = <Alert type="warning">We couldn’t find this order in your account.</Alert>;
  else
    body = (
      <div className="mx-auto max-w-2xl space-y-5">
        {waiting && order.payment_status === 'unpaid' ? (
          <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100" role="status">
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Confirming your payment… please keep this page open.
          </div>
        ) : (
          order.status !== 'cancelled' && (
            <div className="flex items-start gap-3 rounded-2xl bg-leaf-50 p-4 text-sm text-ink-800 ring-1 ring-leaf-200" role="status">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf-700" aria-hidden="true" />
              <p>
                <strong>Order placed.</strong> Show order number <span className="font-mono">{order.order_number}</span> at the lab counter. Reports appear here and in your patient portal once the lab has verified them.
              </p>
            </div>
          )
        )}
        {error && <Alert type="warning">{error}</Alert>}
        <LabOrderCard order={order} receptionPhone={settings.phone} onChanged={load} onPay={onlinePay ? pay : undefined} payBusy={paying} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <LinkButton to="/patient/lab-orders" className="flex-1">My pathology orders</LinkButton>
          <LinkButton to="/lab-tests" variant="outline" className="flex-1">Book more tests</LinkButton>
        </div>
      </div>
    );

  return (
    <>
      <PageHero crumbs={[{ label: 'Book lab tests', to: '/lab-tests' }, { label: 'Order status' }]} eyebrow="Pathology lab" title="Your lab order" />
      <Section size="md">{body}</Section>
    </>
  );
};
