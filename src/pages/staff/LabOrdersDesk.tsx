import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileText, RefreshCw, Search, Upload } from 'lucide-react';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { PageHeader, Panel, Segmented } from '../../components/dashboard/Dashboard';
import { LAB_STATUS, ORDER_STATUS, PAYMENT_STATUS } from '../../components/lab/LabOrderCard';
import { prettyDate } from '../../components/patient/PatientUI';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/cn';
import { CartEntry, formatPaise, previewCart } from '../../lib/labCart';
import { newBookingKey } from '../../lib/opdForm';
import { isValidIndianPhone } from '../../lib/tokens';
import { formatBytes } from '../../lib/preparePdf';
import { LabConfig, LabOrder, LabPackage, LabReport, LabTest, labService } from '../../services/labService';
import { UserRole } from '../../types';

type View = 'orders' | 'walkin' | 'catalogue';
type Filter = 'active' | 'payment' | 'lab' | 'completed' | 'cancelled' | 'all';

const FILTERS: Record<Filter, (o: LabOrder) => boolean> = {
  active: o => o.status !== 'cancelled' && o.lab_status !== 'completed',
  payment: o => o.status !== 'cancelled' && o.payment_status === 'unpaid',
  lab: o => o.status === 'confirmed' && (o.lab_status === 'sample_collected' || o.lab_status === 'processing'),
  completed: o => o.lab_status === 'completed',
  cancelled: o => o.status === 'cancelled',
  all: () => true,
};

/** Pathology orders: one desk, actions shown by role. The database enforces the same rules. */
export const LabOrdersDesk: React.FC = () => {
  const { role } = useAuth();
  const isDesk = role === 'reception' || role === 'admin';
  const isLab = role === 'pathology' || role === 'admin';
  const [view, setView] = useState<View>('orders');

  const views: { id: View; label: string }[] = [
    { id: 'orders', label: 'Orders' },
    ...(isDesk ? [{ id: 'walkin' as const, label: 'Walk-in order' }] : []),
    ...(isLab ? [{ id: 'catalogue' as const, label: 'Catalogue & prices' }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pathology"
        title="Pathology orders"
        description="Lab test orders, payments, samples and reports. OPD appointments and tokens stay on the queue desk."
      />
      <Segmented value={view} onChange={setView} items={views} layoutId="lab-desk-view" label="Pathology desk sections" />
      {view === 'orders' && <OrdersView role={role} />}
      {view === 'walkin' && isDesk && <WalkInView onDone={() => setView('orders')} />}
      {view === 'catalogue' && isLab && <CatalogueView />}
    </div>
  );
};

// ---------------------------------------------------------------- orders
const OrdersView: React.FC<{ role: UserRole }> = ({ role }) => {
  const [orders, setOrders] = useState<LabOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(role === 'pathology' ? 'lab' : 'active');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const [requireIndependent, setRequireIndependent] = useState(false);
  const load = useCallback(() => {
    setError(null);
    labService.config().then(c => setRequireIndependent(c.require_independent_verification));
    return labService.staffOrders().then(setOrders).catch(e => setError(e instanceof Error ? e.message : 'Could not load orders.'));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const list = (orders ?? []).filter(FILTERS[filter]).filter(o => !q || [o.order_number, o.patient_name, o.contact_phone].some(f => f.toLowerCase().includes(q)));
  const counts = useMemo(() => Object.fromEntries((Object.keys(FILTERS) as Filter[]).map(f => [f, (orders ?? []).filter(FILTERS[f]).length])), [orders]);

  return (
    <Panel
      flush
      title="Orders"
      description="Newest first. Online orders and walk-ins share this list."
      actions={
        <Button size="sm" variant="ghost" onClick={load} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Refresh
        </Button>
      }
    >
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          layoutId="lab-filter"
          label="Filter orders"
          items={[
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'payment', label: 'Unpaid', count: counts.payment },
            { id: 'lab', label: 'In the lab', count: counts.lab },
            { id: 'completed', label: 'Completed', count: counts.completed },
            { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            { id: 'all', label: 'All', count: counts.all },
          ]}
        />
        <div className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <label htmlFor="lab-desk-search" className="sr-only">Search orders</label>
          <input id="lab-desk-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Order no., name or phone" className="field-control py-2 pl-10" />
        </div>
      </div>
      {error && <Alert type="error" className="m-5">{error}</Alert>}
      {orders === null && !error ? (
        <div className="p-8"><MedicalLoader label="Loading orders…" /></div>
      ) : list.length === 0 ? (
        <div className="p-6"><EmptyState title="No orders here" description="Nothing matches this filter right now." /></div>
      ) : (
        <ul className="divide-y divide-line">
          {list.map(o => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => setOpen(open === o.id ? null : o.id)}
                aria-expanded={open === o.id}
                className="flex w-full cursor-pointer flex-col gap-2 px-5 py-4 text-left hover:bg-ink-50/50 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {o.patient_name} <span className="ml-1 font-mono text-xs font-normal text-ink-500">{o.order_number}</span>
                  </p>
                  <p className="text-[13px] text-ink-500">
                    {o.source === 'online' ? 'Online' : 'Walk-in'} · {prettyDate(o.created_at)} · {o.items.length} item{o.items.length === 1 ? '' : 's'} · {formatPaise(o.total_paise)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge size="sm" variant={ORDER_STATUS[o.status].variant}>{ORDER_STATUS[o.status].label}</Badge>
                  <Badge size="sm" variant={PAYMENT_STATUS[o.payment_status].variant}>{PAYMENT_STATUS[o.payment_status].label}</Badge>
                  {o.status !== 'cancelled' && <Badge size="sm" variant={LAB_STATUS[o.lab_status].variant}>{LAB_STATUS[o.lab_status].label}</Badge>}
                  <ChevronDown className={cn('h-4 w-4 text-ink-400 transition-transform', open === o.id && 'rotate-180')} aria-hidden="true" />
                </div>
              </button>
              {open === o.id && <OrderDetail order={o} role={role} reload={load} requireIndependent={requireIndependent} />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

const OrderDetail: React.FC<{ order: LabOrder; role: UserRole; reload: () => Promise<unknown>; requireIndependent: boolean }> = ({ order: o, role, reload, requireIndependent }) => {
  const { user } = useAuth();
  const isDesk = role === 'reception' || role === 'admin';
  const isLab = role === 'pathology' || role === 'admin';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [specimen, setSpecimen] = useState('');

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };
  const ask = (msg: string) => window.prompt(msg)?.trim() || null;

  // Every test the order covers, with package tests expanded.
  const tests = o.items.flatMap(i => i.test_ids.map((id, n) => ({ id, name: i.test_names[n] })));
  const active = o.status !== 'cancelled';

  return (
    <div className="space-y-5 bg-ink-50/40 px-5 pb-6 pt-2 sm:px-6">
      {error && <Alert type="error">{error}</Alert>}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <Info label="Phone" value={o.contact_phone} />
        <Info label="Collection" value={o.collection_method === 'home' ? 'Home visit' : 'Hospital lab'} />
        <Info label={o.collection_method === 'home' ? 'Visit date & slot' : 'Planned visit'} value={o.preferred_date ? `${prettyDate(o.preferred_date)}${o.collection_slot ? ` · ${o.collection_slot}` : ''}` : '—'} />
        <Info label="Payment" value={o.payment_mode ? `${o.payment_mode.toUpperCase()} · ${formatPaise(o.total_paise)}` : formatPaise(o.total_paise)} />
      </dl>
      {o.collection_method === 'home' && (
        <div className="rounded-2xl bg-white p-3 text-sm ring-1 ring-line">
          <p className="text-[13px] text-ink-500">Collection address · pincode {o.collection_pincode}</p>
          <p className="mt-0.5 whitespace-pre-line font-medium text-ink-900">{o.collection_address}</p>
          {o.collection_fee_paise > 0 && <p className="mt-1 text-[13px] text-ink-500">Home collection fee {formatPaise(o.collection_fee_paise)} (included in the total)</p>}
        </div>
      )}
      <ul className="space-y-1 text-sm">
        {o.items.map(i => (
          <li key={i.id} className="flex justify-between gap-4">
            <span className="text-ink-800">
              {i.name}
              {i.item_type === 'package' && <span className="text-ink-500"> — {i.test_names.join(', ')}</span>}
            </span>
            <span className="tabular-nums text-ink-600">{formatPaise(i.price_paise)}</span>
          </li>
        ))}
      </ul>
      {(o.reconciliation_reason || o.last_payment_error || o.cancel_reason) && (
        <Alert type="warning" className="text-sm">{o.reconciliation_reason || o.cancel_reason || `Last payment attempt: ${o.last_payment_error}`}</Alert>
      )}

      {isDesk && active && (
        <div className="flex flex-wrap items-end gap-2">
          {o.status === 'pending' && <Button size="sm" disabled={busy} onClick={() => act(() => labService.rpc('confirm_lab_order', { p_order_id: o.id }))}>Confirm order</Button>}
          {o.payment_status === 'unpaid' && (
            <>
              <Button size="sm" variant="accent" disabled={busy} onClick={() => window.confirm(`Record ${formatPaise(o.total_paise)} received in cash?`) && act(() => labService.rpc('record_lab_payment', { p_order_id: o.id, p_mode: 'cash' }))}>Paid in cash</Button>
              <Button size="sm" variant="accent" disabled={busy} onClick={() => window.confirm(`Record ${formatPaise(o.total_paise)} received by UPI?`) && act(() => labService.rpc('record_lab_payment', { p_order_id: o.id, p_mode: 'upi' }))}>Paid by UPI</Button>
            </>
          )}
          {o.lab_status === 'awaiting_sample' && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => { const r = ask('Reason for cancelling this order?'); if (r) act(() => labService.rpc('cancel_lab_order', { p_order_id: o.id, p_reason: r })); }}>
              Cancel order
            </Button>
          )}
        </div>
      )}
      {role === 'admin' && (o.payment_status === 'refund_due' || o.payment_status === 'needs_reconciliation') && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => { const n = ask('Note: how was this settled (e.g. refund ID)?'); if (n) act(() => labService.rpc('resolve_lab_payment', { p_order_id: o.id, p_note: n })); }}>
          Mark refunded / resolved
        </Button>
      )}

      {/* Samples */}
      <section>
        <h3 className="text-sm font-semibold text-ink-900">Samples</h3>
        {(o.samples ?? []).length === 0 ? <p className="mt-1 text-[13px] text-ink-500">No sample collected yet.</p> : (
          <ul className="mt-2 space-y-2">
            {o.samples!.map(s => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs text-ink-700">{s.accession_number}</span>
                <span className="text-ink-700">{s.specimen_type}</span>
                <Badge size="sm" variant={s.status === 'received' ? 'success' : s.status === 'rejected' ? 'danger' : 'info'}>{s.status}</Badge>
                {s.rejection_reason && <span className="text-[13px] text-ink-500">{s.rejection_reason}</span>}
                {isLab && s.status === 'collected' && (
                  <>
                    <Button size="sm" variant="soft" disabled={busy} onClick={() => act(() => labService.rpc('update_lab_sample', { p_sample_id: s.id, p_status: 'received', p_reason: null }))}>Mark received</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => { const r = ask('Why is the sample rejected?'); if (r) act(() => labService.rpc('update_lab_sample', { p_sample_id: s.id, p_status: 'rejected', p_reason: r })); }}>Reject</Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {active && o.status === 'confirmed' && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor={`spec-${o.id}`} className="field-label">Sample type</label>
              <input id={`spec-${o.id}`} value={specimen} onChange={e => setSpecimen(e.target.value)} placeholder="e.g. Blood (EDTA)" className="field-control w-56 py-2" />
            </div>
            <Button size="sm" disabled={busy || !specimen.trim()} onClick={() => act(async () => { await labService.rpc('record_lab_sample', { p_order_id: o.id, p_specimen_type: specimen }); setSpecimen(''); })}>
              Record sample collected
            </Button>
          </div>
        )}
        {active && o.status === 'pending' && <p className="mt-2 text-[13px] text-ink-500">Confirm the order (or record payment) before collecting a sample.</p>}
      </section>

      {/* Reports */}
      <section>
        <h3 className="text-sm font-semibold text-ink-900">Reports</h3>
        <ul className="mt-2 space-y-3">
          {tests.map(t => (
            <TestReports key={t.id} order={o} test={t} reports={(o.reports ?? []).filter(r => r.test_id === t.id)} canUpload={(isLab || role === 'reception') && o.status === 'confirmed'} canReview={isLab && o.status === 'confirmed'} canOpen={isLab || role === 'reception'} requireIndependent={requireIndependent} myId={user?.id} reload={reload} />
          ))}
        </ul>
      </section>
    </div>
  );
};

const REPORT_BADGE: Record<LabReport['status'], { label: string; variant: 'warning' | 'success' | 'neutral' | 'danger' }> = {
  pending_verification: { label: 'Awaiting verification', variant: 'warning' },
  published: { label: 'Released', variant: 'success' },
  superseded: { label: 'Superseded', variant: 'neutral' },
  rejected: { label: 'Rejected', variant: 'danger' },
  unmatched: { label: 'Unmatched', variant: 'neutral' },
};

type Stage = 'idle' | 'preparing' | 'uploading' | 'saving';
const STAGE_TEXT: Record<Stage, string> = { idle: '', preparing: 'Checking & compressing…', uploading: 'Uploading…', saving: 'Saving…' };

const TestReports: React.FC<{
  order: LabOrder;
  test: { id: string; name: string };
  reports: LabReport[];
  canUpload: boolean;
  canReview: boolean;
  canOpen: boolean;
  requireIndependent: boolean;
  myId?: string;
  reload: () => Promise<unknown>;
}> = ({ order, test, reports, canUpload, canReview, canOpen, requireIndependent, myId, reload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [reason, setReason] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const hasCurrent = reports.some(r => r.status === 'pending_verification' || r.status === 'published');

  // Every mutation waits for the server; the UI only changes after a confirmed success and a refetch.
  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key);
    setMsg(null);
    try {
      const text = await fn();
      await reload();
      if (text) setMsg({ type: 'success', text });
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Action failed.' });
    } finally {
      setBusy(null);
      setStage('idle');
    }
  };

  const upload = () =>
    run('upload', async () => {
      const r = await labService.uploadReport(order.id, test.id, file!, reason.trim() || null, setStage);
      setFile(null);
      setReason('');
      setInputKey(k => k + 1);
      const sizes = r.compressed
        ? `${formatBytes(r.originalSize)} → ${formatBytes(r.finalSize)} (saved ${(((r.originalSize - r.finalSize) / r.originalSize) * 100).toFixed(1)}%)`
        : `${formatBytes(r.finalSize)}${r.note ? ` · ${r.note}` : ''}`;
      return `Report uploaded for ${test.name}. ${sizes}. It stays hidden from the patient until verified and released.`;
    });

  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm font-medium text-ink-900">{test.name}</p>
      {reports.length === 0 && <p className="mt-1 text-[13px] text-ink-500">No report uploaded.</p>}
      <ul className="mt-2 space-y-2">
        {reports.map(r => {
          const badge = REPORT_BADGE[r.status];
          const ownUploadBlocked = requireIndependent && r.uploaded_by === myId;
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-ink-700">v{r.version_number}</span>
              <Badge size="sm" variant={badge.variant}>{r.status === 'pending_verification' && r.verified_at ? 'Verified · not released' : badge.label}</Badge>
              <span className="text-ink-500">{r.file_name}</span>
              {r.correction_reason && <span className="text-ink-500">· {r.correction_reason}</span>}
              {canOpen && (
                <Button size="sm" variant="ghost" leftIcon={<FileText className="h-3.5 w-3.5" />} disabled={busy !== null} onClick={() => run(`open-${r.id}`, async () => labService.openReport(r.storage_key))}>
                  View
                </Button>
              )}
              {canReview && r.status === 'pending_verification' && !r.verified_at && (
                <>
                  <Button
                    size="sm"
                    variant="soft"
                    isLoading={busy === `verify-${r.id}`}
                    loadingText="Verifying…"
                    disabled={busy !== null || ownUploadBlocked}
                    title={ownUploadBlocked ? 'Hospital policy: a different staff member must verify your upload' : undefined}
                    onClick={() => run(`verify-${r.id}`, async () => { await labService.rpc('verify_lab_report', { p_report_id: r.id }); return `${test.name} v${r.version_number} verified. Release it when ready.`; })}
                  >
                    Verify
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => { const why = window.prompt('Why is this report rejected?')?.trim(); if (why) run(`reject-${r.id}`, async () => { await labService.rpc('reject_lab_report', { p_report_id: r.id, p_reason: why }); return 'Report rejected. Upload a corrected version.'; }); }}>
                    Reject
                  </Button>
                </>
              )}
              {canReview && r.status === 'pending_verification' && r.verified_at && (
                <Button
                  size="sm"
                  variant="accent"
                  isLoading={busy === `release-${r.id}`}
                  loadingText="Releasing…"
                  disabled={busy !== null}
                  onClick={() => window.confirm(`Release ${test.name} to ${order.patient_name}? The patient will be able to download it.`) && run(`release-${r.id}`, async () => { await labService.rpc('release_lab_report', { p_report_id: r.id }); return `${test.name} released to ${order.patient_name}.`; })}
                >
                  Release to patient
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {canUpload && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-0">
            <label htmlFor={`file-${order.id}-${test.id}`} className="field-label">{hasCurrent ? 'Upload corrected version (PDF)' : 'Upload report (PDF)'}</label>
            <input key={inputKey} id={`file-${order.id}-${test.id}`} type="file" accept="application/pdf,.pdf" disabled={busy !== null} onChange={e => setFile(e.target.files?.[0] ?? null)} className="max-w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-800" />
          </div>
          {hasCurrent && (
            <div>
              <label htmlFor={`reason-${order.id}-${test.id}`} className="field-label">Reason for new version</label>
              <input id={`reason-${order.id}-${test.id}`} value={reason} onChange={e => setReason(e.target.value)} className="field-control w-60 py-2" />
            </div>
          )}
          <Button
            size="sm"
            leftIcon={<Upload className="h-4 w-4" />}
            isLoading={busy === 'upload'}
            loadingText={STAGE_TEXT[stage] || 'Working…'}
            disabled={busy !== null || !file || (hasCurrent && !reason.trim())}
            onClick={upload}
          >
            Upload
          </Button>
        </div>
      )}
      {msg && <Alert type={msg.type} className="mt-3 text-[13px]">{msg.text}</Alert>}
    </li>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-[13px] text-ink-500">{label}</dt>
    <dd className="font-medium text-ink-900">{value}</dd>
  </div>
);

// ---------------------------------------------------------------- walk-in
function useCatalogue() {
  const [data, setData] = useState<{ tests: LabTest[]; packages: LabPackage[]; config: LabConfig } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    Promise.all([labService.catalogue(), labService.config()])
      .then(([c, config]) => setData({ ...c, config }))
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load the catalogue.'));
  }, []);
  useEffect(load, [load]);
  return { data, error, reload: load };
}

const WalkInView: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { data, error } = useCatalogue();
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'' | 'male' | 'female' | 'other'>('');
  const [mode, setMode] = useState<'' | 'cash' | 'upi'>('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [key, setKey] = useState(newBookingKey);
  useEffect(() => setKey(newBookingKey()), [JSON.stringify(cart), name, phone, gender, mode]);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <MedicalLoader label="Loading catalogue…" />;

  const preview = previewCart(cart, data.tests, data.packages, data.config.duplicate_test_rule);
  const toggle = (e: CartEntry) => setCart(c => (c.some(x => x.id === e.id) ? c.filter(x => x.id !== e.id) : [...c, e]));
  const q = query.trim().toLowerCase();
  const options = [
    ...data.packages.filter(p => p.is_active).map(p => ({ entry: { type: 'package' as const, id: p.id }, name: p.name, price: p.price, note: p.tests.map(t => t.name).join(', ') })),
    ...data.tests.filter(t => t.is_active).map(t => ({ entry: { type: 'test' as const, id: t.id }, name: t.name, price: t.price, note: t.category })),
  ].filter(o => !q || o.name.toLowerCase().includes(q));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !isValidIndianPhone(phone)) return setFormError('Enter the patient’s name and a valid 10-digit mobile number.');
    if (!preview.lines.length || preview.conflicts.length) return setFormError(preview.conflicts[0] || 'Choose at least one test.');
    setBusy(true);
    try {
      const order = await labService.walkIn(cart, { patientName: name.trim(), phone, gender: gender || null }, mode || null, key);
      setDone(order.order_number);
      setCart([]);
      setName('');
      setPhone('');
      setGender('');
      setMode('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not register the order.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-12" noValidate>
      <Panel title="Patient" className="lg:col-span-5">
        <div className="space-y-4 p-5 sm:p-6">
          {done && (
            <Alert type="success">
              Order <span className="font-mono">{done}</span> registered.{' '}
              <button type="button" className="link cursor-pointer" onClick={onDone}>View orders</button>
            </Alert>
          )}
          {formError && <Alert type="error">{formError}</Alert>}
          <div>
            <label htmlFor="wi-name" className="field-label">Patient name</label>
            <input id="wi-name" value={name} onChange={e => setName(e.target.value)} className="field-control" />
          </div>
          <div>
            <label htmlFor="wi-phone" className="field-label">Mobile number</label>
            <input id="wi-phone" type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} className="field-control" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="wi-gender" className="field-label">Gender</label>
              <select id="wi-gender" value={gender} onChange={e => setGender(e.target.value as typeof gender)} className="field-control">
                <option value="">Not given</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="wi-pay" className="field-label">Payment</label>
              <select id="wi-pay" value={mode} onChange={e => setMode(e.target.value as typeof mode)} className="field-control">
                <option value="">Not paid yet</option>
                <option value="cash">Cash received</option>
                <option value="upi">UPI received</option>
              </select>
            </div>
          </div>
          <div className="border-t border-line pt-4 text-sm">
            {preview.lines.map(l => (
              <p key={l.entry.id} className="flex justify-between gap-3"><span>{l.name}</span><span className="tabular-nums">{formatPaise(l.pricePaise)}</span></p>
            ))}
            {preview.skipped.map(s => <p key={s.name} className="text-[13px] text-ink-500">{s.name} is included in {s.packageName}.</p>)}
            {preview.conflicts.map(c => <p key={c} className="text-[13px] text-warning-700">{c}</p>)}
            <p className="mt-2 flex justify-between font-semibold"><span>Total</span><span className="tabular-nums">{formatPaise(preview.totalPaise)}</span></p>
          </div>
          <Button type="submit" className="w-full" isLoading={busy} loadingText="Registering…">Register walk-in order</Button>
        </div>
      </Panel>
      <Panel title="Tests" description="Select tests or packages." className="lg:col-span-7" flush>
        <div className="border-b border-line p-4">
          <label htmlFor="wi-search" className="sr-only">Search tests</label>
          <input id="wi-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tests" className="field-control py-2" />
        </div>
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
          {options.map(o => (
            <li key={o.entry.id}>
              <label className="flex cursor-pointer items-center gap-3 px-5 py-3 text-sm hover:bg-ink-50/50">
                <input type="checkbox" checked={cart.some(c => c.id === o.entry.id)} onChange={() => toggle(o.entry)} className="h-4 w-4 accent-brand-700" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink-900">{o.entry.type === 'package' ? `Package: ${o.name}` : o.name}</span>
                  <span className="block truncate text-[13px] text-ink-500">{o.note}</span>
                </span>
                <span className="tabular-nums text-ink-700">{formatPaise(Math.round(o.price * 100))}</span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>
    </form>
  );
};

// ---------------------------------------------------------------- catalogue
const CatalogueView: React.FC = () => {
  const { role } = useAuth();
  const { data, error, reload } = useCatalogue();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const save = async (fn: () => Promise<void>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ type: 'success', text: ok });
      reload();
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Could not save.' });
    }
  };

  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <MedicalLoader label="Loading catalogue…" />;

  return (
    <div className="space-y-6">
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      <Alert type="info" className="text-sm">
        Price changes apply to new orders only — existing orders keep the price they were booked at. Fill in sample type, turnaround and preparation only once verified; untick <strong>Demo</strong> when an item is real.
      </Alert>
      {role === 'admin' && <HomeCollectionSettings config={data.config} onSaved={reload} />}
      <Panel title="Tests" flush>
        <ul className="divide-y divide-line">
          {data.tests.map(t => <TestRow key={t.id} test={t} onSave={row => save(() => labService.saveTest({ id: t.id, ...row }), `${t.name} saved.`)} />)}
          <TestRow onSave={row => save(() => labService.saveTest(row), 'Test added.')} />
        </ul>
      </Panel>
      <Panel title="Packages" flush>
        <ul className="divide-y divide-line">
          {data.packages.map(p => (
            <PackageRow key={p.id} pkg={p} tests={data.tests} onSave={(row, ids) => save(() => labService.savePackage({ id: p.id, ...row }, ids), `${p.name} saved.`)} />
          ))}
          <PackageRow tests={data.tests} onSave={(row, ids) => save(() => labService.savePackage(row, ids), 'Package added.')} />
        </ul>
      </Panel>
    </div>
  );
};

/** Super Admin: home sample collection. Nothing here is pre-filled; the hospital enters its real values. */
const HomeCollectionSettings: React.FC<{ config: LabConfig; onSaved: () => void }> = ({ config, onSaved }) => {
  const [enabled, setEnabled] = useState(config.home_collection_switch);
  const [fee, setFee] = useState(config.home_collection_fee == null ? '' : String(config.home_collection_fee));
  const [pincodes, setPincodes] = useState(config.home_collection_pincodes.join(', '));
  const [slots, setSlots] = useState(config.home_collection_slots.join(', '));
  const [capacity, setCapacity] = useState(config.home_collection_slot_capacity == null ? '' : String(config.home_collection_slot_capacity));
  const [maxDays, setMaxDays] = useState(String(config.home_collection_max_days));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const list = (v: string) => v.split(/[,\s]+/).map(x => x.trim()).filter(Boolean);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await labService.saveHomeCollection({
        enabled,
        fee: fee.trim() === '' ? null : Number(fee),
        pincodes: list(pincodes),
        slots: list(slots),
        slotCapacity: capacity.trim() === '' ? null : Number(capacity),
        maxDays: Number(maxDays) || 7,
      });
      setMsg({ type: 'success', text: enabled ? 'Saved. Home collection is now offered at checkout.' : 'Saved. Home collection is switched off.' });
      onSaved();
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Home sample collection" description={config.home_collection_enabled ? 'Offered to patients at checkout.' : 'Not offered yet. Enter the confirmed service details to switch it on.'}>
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6">
        <Field id="hc-pins" label="Service pincodes (comma separated)" value={pincodes} onChange={setPincodes} wide />
        <Field id="hc-slots" label="Time slots, e.g. 07:00-09:00, 09:00-11:00" value={slots} onChange={setSlots} wide />
        <Field id="hc-fee" label="Visit fee (₹, 0 if free)" type="number" value={fee} onChange={setFee} />
        <Field id="hc-cap" label="Visits per slot (empty = no limit)" type="number" value={capacity} onChange={setCapacity} />
        <Field id="hc-days" label="Book up to (days ahead)" type="number" value={maxDays} onChange={setMaxDays} />
        <p className="text-[13px] text-ink-500 sm:col-span-3">Visits are offered on OPD days ({config.operating_days.join(', ') || 'not set'}) and not on hospital holidays.</p>
        <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-3">
          <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-brand-700" /> Offer home collection to patients</label>
          <Button size="sm" className="ml-auto" isLoading={busy} loadingText="Saving…" onClick={save}>Save</Button>
        </div>
        {msg && <Alert type={msg.type} className="text-sm sm:col-span-3">{msg.text}</Alert>}
      </div>
    </Panel>
  );
};

const blankTest: Partial<LabTest> = { test_code: '', name: '', category: '', price: 0, specimen_type: null, turnaround_hours: null, preparation: null, description: null, is_active: true, is_demo: false };

const TestRow: React.FC<{ test?: LabTest; onSave: (row: Partial<LabTest>) => void }> = ({ test, onSave }) => {
  const [row, setRow] = useState<Partial<LabTest>>(test ?? blankTest);
  const [open, setOpen] = useState(false);
  const set = <K extends keyof LabTest>(k: K, v: LabTest[K]) => setRow(r => ({ ...r, [k]: v }));
  const id = test?.id ?? 'new';

  return (
    <li className="px-5 py-3 sm:px-6">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm">
        <span className="font-medium text-ink-900">
          {test ? test.name : '+ Add a test'}
          {test && !test.is_active && <Badge size="sm" variant="neutral" className="ml-2">Unavailable</Badge>}
          {test?.is_demo && <Badge size="sm" variant="warning" className="ml-2">Demo</Badge>}
        </span>
        {test && <span className="tabular-nums text-ink-600">{formatPaise(Math.round(test.price * 100))}</span>}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field id={`${id}-code`} label="Code" value={row.test_code ?? ''} onChange={v => set('test_code', v)} disabled={Boolean(test)} />
          <Field id={`${id}-name`} label="Name" value={row.name ?? ''} onChange={v => set('name', v)} />
          <Field id={`${id}-cat`} label="Category" value={row.category ?? ''} onChange={v => set('category', v)} />
          <Field id={`${id}-price`} label="Price (₹)" type="number" value={String(row.price ?? 0)} onChange={v => set('price', Number(v))} />
          <Field id={`${id}-spec`} label="Sample type (verified)" value={row.specimen_type ?? ''} onChange={v => set('specimen_type', v || null)} />
          <Field id={`${id}-tat`} label="Turnaround hours (verified)" type="number" value={row.turnaround_hours == null ? '' : String(row.turnaround_hours)} onChange={v => set('turnaround_hours', v === '' ? null : Number(v))} />
          <Field id={`${id}-prep`} label="Preparation (verified)" value={row.preparation ?? ''} onChange={v => set('preparation', v || null)} wide />
          <Field id={`${id}-desc`} label="Description" value={row.description ?? ''} onChange={v => set('description', v || null)} wide />
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={row.is_active ?? true} onChange={e => set('is_active', e.target.checked)} className="accent-brand-700" /> Available</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={row.fasting_required ?? false} onChange={e => set('fasting_required', e.target.checked)} className="accent-brand-700" /> Fasting required (verified)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={row.is_demo ?? false} onChange={e => set('is_demo', e.target.checked)} className="accent-brand-700" /> Demo data</label>
            <Button size="sm" className="ml-auto" disabled={!row.name || !row.category || !row.test_code || (row.price ?? -1) < 0} onClick={() => onSave(row)}>Save</Button>
          </div>
        </div>
      )}
    </li>
  );
};

const PackageRow: React.FC<{ pkg?: LabPackage; tests: LabTest[]; onSave: (row: Partial<LabPackage>, testIds: string[]) => void }> = ({ pkg, tests, onSave }) => {
  const [row, setRow] = useState<Partial<LabPackage>>(pkg ? { package_code: pkg.package_code, name: pkg.name, description: pkg.description, preparation: pkg.preparation, price: pkg.price, is_active: pkg.is_active, is_demo: pkg.is_demo } : { package_code: '', name: '', price: 0, is_active: true, is_demo: false });
  const [ids, setIds] = useState<string[]>(pkg?.tests.map(t => t.id) ?? []);
  const [open, setOpen] = useState(false);
  const set = <K extends keyof LabPackage>(k: K, v: LabPackage[K]) => setRow(r => ({ ...r, [k]: v }));
  const id = pkg?.id ?? 'newpkg';

  return (
    <li className="px-5 py-3 sm:px-6">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm">
        <span className="font-medium text-ink-900">
          {pkg ? pkg.name : '+ Add a package'}
          {pkg && !pkg.is_active && <Badge size="sm" variant="neutral" className="ml-2">Unavailable</Badge>}
          {pkg?.is_demo && <Badge size="sm" variant="warning" className="ml-2">Demo</Badge>}
        </span>
        {pkg && <span className="tabular-nums text-ink-600">{formatPaise(Math.round(pkg.price * 100))}</span>}
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field id={`${id}-code`} label="Code" value={row.package_code ?? ''} onChange={v => set('package_code', v)} disabled={Boolean(pkg)} />
          <Field id={`${id}-name`} label="Name" value={row.name ?? ''} onChange={v => set('name', v)} />
          <Field id={`${id}-price`} label="Price (₹)" type="number" value={String(row.price ?? 0)} onChange={v => set('price', Number(v))} />
          <Field id={`${id}-desc`} label="Description" value={row.description ?? ''} onChange={v => set('description', v || null)} wide />
          <Field id={`${id}-prep`} label="Preparation (verified)" value={row.preparation ?? ''} onChange={v => set('preparation', v || null)} wide />
          <fieldset className="sm:col-span-3">
            <legend className="field-label">Included tests</legend>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {tests.map(t => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={ids.includes(t.id)} onChange={e => setIds(s => (e.target.checked ? [...s, t.id] : s.filter(x => x !== t.id)))} className="accent-brand-700" />
                  {t.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={row.is_active ?? true} onChange={e => set('is_active', e.target.checked)} className="accent-brand-700" /> Available</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={row.is_demo ?? false} onChange={e => set('is_demo', e.target.checked)} className="accent-brand-700" /> Demo data</label>
            <Button size="sm" className="ml-auto" disabled={!row.name || !row.package_code || ids.length === 0} onClick={() => onSave(row, ids)}>Save</Button>
          </div>
        </div>
      )}
    </li>
  );
};

const Field: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; type?: string; disabled?: boolean; wide?: boolean }> = ({ id, label, value, onChange, type = 'text', disabled, wide }) => (
  <div className={wide ? 'sm:col-span-3' : undefined}>
    <label htmlFor={id} className="field-label">{label}</label>
    <input id={id} type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="field-control py-2" />
  </div>
);
