import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Printer, RefreshCw, Search, TriangleAlert } from 'lucide-react';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { SkeletonRows } from '../../components/common/Skeleton';
import { PageHeader, Panel } from '../../components/dashboard/Dashboard';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { getHospitalTodayDate } from '../../lib/tokens';
import { DateFilter, rangeFor, rangeLabel } from '../../lib/dateFilters';
import { cn } from '../../lib/cn';
import { Channel, FinanceSummary, financeService, inr, METHOD_LABEL, Service, Totals, totalsOf, Transaction, transactionsCsv, TxKind } from '../../services/financeService';

const PAGE = 25;
const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'date', label: 'Pick a date' },
  { id: 'range', label: 'Date range' },
  { id: 'all', label: 'All time' },
];
const SERVICE_LABEL: Record<Service, string> = { opd: 'OPD', pathology: 'Pathology' };
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/**
 * Sales & collections from the payment ledger. Super Admin: all three
 * categories (OPD, Pathology, Total). Reception: OPD only. Pathology: lab
 * only. The database enforces the same scoping.
 */
export const SalesPage: React.FC = () => {
  const { role, isLiveSession } = useAuth();
  const { settings } = useHospital();
  const live = isSupabaseConfigured && isLiveSession;
  const fixed: Service | null = role === 'reception' ? 'opd' : role === 'pathology' ? 'pathology' : null;
  const today = getHospitalTodayDate();

  const [category, setCategory] = useState<Service | 'total'>(fixed ?? 'total');
  const [filter, setFilter] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(today);
  const [rangeTo, setRangeTo] = useState(today);
  const [channel, setChannel] = useState<Channel | ''>('');
  const [kind, setKind] = useState<TxKind | ''>('');
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [tx, setTx] = useState<{ total: number; rows: Transaction[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recon, setRecon] = useState<Record<string, unknown[]> | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const range = useMemo(() => rangeFor(filter, today, { date: customDate, from: rangeFrom, to: rangeTo }), [filter, today, customDate, rangeFrom, rangeTo]);
  const service: Service | null = fixed ?? (category === 'total' ? null : category);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => setPage(0), [range.from, range.to, service, channel, kind, debounced, sort]);

  const load = useCallback(async () => {
    if (!live) return;
    setLoading(true);
    try {
      // Summary always covers both services for the Super Admin so the three categories stay side by side.
      const [s, t] = await Promise.all([
        financeService.summary(range.from, range.to, fixed, channel || null),
        financeService.transactions({ from: range.from, to: range.to, service, channel: channel || null, kind: kind || null, query: debounced, sort, limit: PAGE, offset: page * PAGE }),
      ]);
      setSummary(s);
      setTx(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load sales.');
    } finally {
      setLoading(false);
    }
  }, [live, range.from, range.to, fixed, channel, service, kind, debounced, sort, page]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (live && role === 'admin') financeService.reconciliation().then(setRecon).catch(() => setRecon(null));
  }, [live, role, tx]);

  const cells = summary?.cells ?? [];
  const opd = totalsOf(cells, c => c.service === 'opd');
  const lab = totalsOf(cells, c => c.service === 'pathology');
  const all = totalsOf(cells);
  const shown: Totals = service === 'opd' ? opd : service === 'pathology' ? lab : all;
  const pending = (summary?.pending ?? []).filter(p => !service || p.service === service);
  const pendingCount = pending.reduce((s, p) => s + Number(p.count), 0);
  const pendingAmount = pending.reduce((s, p) => s + Number(p.amount), 0);
  const voids = cells.filter(c => !service || c.service === service).reduce((s, c) => s + Number(c.voids), 0);

  // Card click = drill down into the exact transactions behind the figure.
  const drill = (next: { category?: Service | 'total'; channel?: Channel | ''; kind?: TxKind | '' }) => {
    if (next.category !== undefined && !fixed) setCategory(next.category);
    setChannel(next.channel ?? '');
    setKind(next.kind ?? '');
    document.getElementById('sales-transactions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const exportCsv = async () => {
    setBusy('export');
    try {
      const { rows, total } = await financeService.transactions({ from: range.from, to: range.to, service, channel: channel || null, kind: kind || null, query: debounced, sort, limit: 5000, offset: 0 });
      const blob = new Blob([transactionsCsv(rows)], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `satya-${service ?? 'hospital'}-sales-${range.from ?? 'start'}-to-${range.to ?? 'today'}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      if (total > rows.length) setNotice({ type: 'error', text: `Exported the first ${rows.length} of ${total} transactions. Narrow the dates to export the rest.` });
    } catch (e) {
      setNotice({ type: 'error', text: e instanceof Error ? e.message : 'Export failed.' });
    } finally {
      setBusy(null);
    }
  };

  const act = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
      await load();
      setNotice({ type: 'success', text: ok });
    } catch (e) {
      setNotice({ type: 'error', text: e instanceof Error ? e.message : 'Action failed.' });
    } finally {
      setBusy(null);
    }
  };

  const voidTx = (t: Transaction) => {
    const reason = window.prompt(`Void ${t.receipt_number} (${inr(t.amount_paise)} ${t.method}) for ${t.patient_name ?? 'this patient'}? It stays in the history but no longer counts. Reason:`)?.trim();
    if (reason) void act(`void-${t.id}`, () => financeService.voidPayment(t.id, reason), `${t.receipt_number} voided. The bill is open again.`);
  };
  const refundTx = (t: Transaction) => {
    const left = t.amount_paise - Number(t.refunded_paise);
    const amount = window.prompt(`Record a refund already made for ${t.receipt_number}. Amount in ₹ (up to ${(left / 100).toFixed(2)}):`, (left / 100).toFixed(2));
    if (!amount) return;
    const paise = Math.round(Number(amount) * 100);
    const reason = window.prompt('Refund reference or reason (e.g. Razorpay refund ID, cash returned):')?.trim();
    if (reason && window.confirm(`Record a refund of ${inr(paise)} against ${t.receipt_number}?`)) void act(`refund-${t.id}`, () => financeService.refund(t.id, paise, reason), `Refund of ${inr(paise)} recorded.`);
  };
  const printReceipt = (t: Transaction) => printReceiptWindow(t, settings.hospitalName || 'Satya Hospital & Pathology', cleanAddress(settings.address));

  const title = role === 'reception' ? 'OPD sales & collections' : role === 'pathology' ? 'Pathology sales & collections' : 'Sales & revenue';
  const issues = recon ? Object.entries(recon).filter(([, v]) => Array.isArray(v) && v.length > 0) : [];

  if (!live) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Finance" title={title} />
        <Alert type="warning" title="Not connected to the hospital database">Sales come from the live payment records. Sign in with a staff account on the live system.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title={title}
        description={`${rangeLabel(range)} · collections by payment date (IST); refunds by refund date`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => void load()} isLoading={loading} loadingText="Loading…" leftIcon={<RefreshCw className="h-4 w-4" />}>Refresh</Button>
            <Button size="sm" variant="outline" onClick={exportCsv} isLoading={busy === 'export'} loadingText="Exporting…" leftIcon={<Download className="h-4 w-4" />}>Export CSV</Button>
          </div>
        }
      />

      {/* Super Admin: the three primary categories */}
      {!fixed && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3" role="group" aria-label="Sales category">
          {([
            { id: 'opd', label: 'OPD sales', t: opd, tone: 'border-brand-300 bg-brand-50' },
            { id: 'pathology', label: 'Pathology sales', t: lab, tone: 'border-leaf-300 bg-leaf-50' },
            { id: 'total', label: 'Total hospital sales', t: all, tone: 'border-ink-300 bg-ink-50' },
          ] as const).map(c => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn('cursor-pointer rounded-3xl border-2 p-5 text-left transition-colors', category === c.id ? c.tone : 'border-line bg-white hover:border-ink-200')}
            >
              <p className="text-sm font-semibold text-ink-700">{c.label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-ink-900">{summary ? inr(c.t.gross) : '—'}</p>
              <p className="mt-1 text-[13px] text-ink-500">
                {summary ? `${inr(c.t.online)} online · ${inr(c.t.counter)} offline · net ${inr(c.t.net)}` : 'Loading…'}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <Panel>
        <div className="space-y-3 p-4 sm:p-5">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Reporting period">
            {DATE_FILTERS.map(f => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                className={cn('h-10 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-medium', filter === f.id ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line bg-white text-ink-600 hover:border-brand-300')}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {filter === 'date' && (
              <div>
                <label htmlFor="s-date" className="field-label">Date</label>
                <input id="s-date" type="date" max={today} value={customDate} onChange={e => setCustomDate(e.target.value || today)} className="field-control w-auto" />
              </div>
            )}
            {filter === 'range' && (
              <>
                <div>
                  <label htmlFor="s-from" className="field-label">From</label>
                  <input id="s-from" type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="field-control w-auto" />
                </div>
                <div>
                  <label htmlFor="s-to" className="field-label">To (included)</label>
                  <input id="s-to" type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="field-control w-auto" />
                </div>
              </>
            )}
            <div>
              <label htmlFor="s-channel" className="field-label">Payment channel</label>
              <select id="s-channel" value={channel} onChange={e => setChannel(e.target.value as Channel | '')} className="field-control w-auto">
                <option value="">All channels</option>
                <option value="online">Online</option>
                <option value="counter">Offline (counter)</option>
              </select>
            </div>
          </div>
        </div>
      </Panel>

      {error && <Alert type="error" title="Couldn’t load sales" action={<Button size="sm" variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</Alert>}
      {notice && <Alert type={notice.type}>{notice.text}</Alert>}

      {/* Summary cards for the selected category */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MoneyCard label={`${service ? SERVICE_LABEL[service] : 'Total'} sales`} value={summary ? inr(shown.gross) : '—'} hint={`${shown.payments} paid ${service === 'pathology' ? 'orders' : service === 'opd' ? 'consultations' : 'transactions'}`} onClick={() => drill({ kind: 'payment' })} />
        <MoneyCard label="Online collections" value={summary ? inr(shown.online) : '—'} hint="Verified Razorpay payments" onClick={() => drill({ channel: 'online', kind: 'payment' })} />
        <MoneyCard label="Offline collections" value={summary ? inr(shown.counter) : '—'} hint="Cash / UPI at the counter" onClick={() => drill({ channel: 'counter', kind: 'payment' })} />
        <MoneyCard label="Refunds" value={summary ? inr(shown.refunds) : '—'} hint={voids ? `${voids} counter entr${voids === 1 ? 'y' : 'ies'} voided (not counted)` : 'By refund date'} onClick={() => drill({ kind: 'refund' })} tone="warning" />
        <MoneyCard label="Net collections" value={summary ? inr(shown.net) : '—'} hint="Sales − refunds" tone="leaf" />
        <MoneyCard label="Pending payments" value={summary ? String(pendingCount) : '—'} hint={`${inr(pendingAmount)} not yet collected (not revenue)`} />
        {!service && (
          <>
            <MoneyCard label="OPD paid" value={String(opd.payments)} hint={inr(opd.gross)} onClick={() => drill({ category: 'opd', kind: 'payment' })} />
            <MoneyCard label="Pathology paid" value={String(lab.payments)} hint={inr(lab.gross)} onClick={() => drill({ category: 'pathology', kind: 'payment' })} />
          </>
        )}
      </div>

      {/* Charts from the same summary */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Online vs offline">
            <div className="p-5"><SplitBar parts={[{ label: 'Online', value: shown.online, cls: 'bg-brand-600' }, { label: 'Offline', value: shown.counter, cls: 'bg-leaf-600' }]} /></div>
          </Panel>
          {!service && (
            <Panel title="OPD vs pathology">
              <div className="p-5"><SplitBar parts={[{ label: 'OPD', value: opd.gross, cls: 'bg-brand-600' }, { label: 'Pathology', value: lab.gross, cls: 'bg-leaf-600' }]} /></div>
            </Panel>
          )}
          <Panel title="Daily collections" className={service ? 'lg:col-span-2' : ''}>
            <div className="p-5"><DailyBars daily={summary.daily.filter(d => !service || d.service === service)} /></div>
          </Panel>
        </div>
      )}

      {/* Reconciliation (Super Admin) */}
      {role === 'admin' && issues.length > 0 && (
        <Alert type="warning" title="Records needing reconciliation">
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {issues.map(([k, v]) => (
              <li key={k}>
                <strong>{RECON_LABEL[k] ?? k}</strong>: {v.length} — {(v as Record<string, unknown>[]).slice(0, 5).map(x => String(x.reference ?? (x.date ? `${x.date} token #${x.token}` : ''))).filter(Boolean).join(', ')}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px]">These are shown as they are; nothing is adjusted automatically.</p>
        </Alert>
      )}

      {/* Transactions */}
      <Panel flush title="Transactions" description="Every payment, refund and void behind the figures above." id="sales-transactions">
        <div className="grid grid-cols-1 gap-3 border-b border-line p-4 sm:grid-cols-4 sm:px-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <label htmlFor="s-search" className="sr-only">Search transactions</label>
            <input id="s-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Receipt, patient, booking/order ID, Razorpay ID" className="field-control pl-10" />
          </div>
          <select aria-label="Transaction type" value={kind} onChange={e => setKind(e.target.value as TxKind | '')} className="field-control">
            <option value="">Payments, refunds & voids</option>
            <option value="payment">Payments</option>
            <option value="refund">Refunds</option>
            <option value="void">Voids</option>
          </select>
          <select aria-label="Sort" value={sort} onChange={e => setSort(e.target.value as 'asc' | 'desc')} className="field-control">
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
        {!tx && loading ? (
          <SkeletonRows rows={5} label="Loading transactions" />
        ) : tx && tx.rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-500">No transactions in this period.</p>
        ) : tx ? (
          <>
            <ul className="divide-y divide-line">
              {tx.rows.map(t => {
                const refunded = Number(t.refunded_paise);
                const status = t.voided ? 'Voided' : t.kind === 'payment' ? (refunded >= t.amount_paise ? 'Refunded' : refunded > 0 ? 'Partly refunded' : 'Received') : t.kind === 'refund' ? 'Refund' : 'Void';
                const sameDay = new Date(t.occurred_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today;
                const canVoid = t.kind === 'payment' && t.channel === 'counter' && !t.voided && refunded === 0 && (role === 'admin' || sameDay);
                return (
                  <li key={t.id} className={cn('flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center', t.voided && 'opacity-60')}>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono font-semibold text-ink-900">{t.receipt_number}</span>
                        <Badge size="sm" variant={t.service === 'opd' ? 'sky-blue' : 'lime-green'}>{SERVICE_LABEL[t.service]}</Badge>
                        <Badge size="sm" variant={t.channel === 'online' ? 'medical-blue' : 'peach'}>{t.channel === 'online' ? 'Online' : 'Offline'}</Badge>
                        <Badge size="sm" variant={status === 'Received' ? 'success' : status === 'Voided' || status === 'Void' ? 'neutral' : 'warning'}>{status}</Badge>
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-500">
                        {fmtDateTime(t.occurred_at)} · {t.patient_name ?? 'Unknown patient'}{t.patient_code ? ` (${t.patient_code})` : ''}
                        {t.reference && ` · ${t.reference}`}{t.token_number ? ` · token #${t.token_number}` : ''}
                        {' · '}{METHOD_LABEL[t.method] ?? t.method}
                        {t.external_id && ` · ${t.external_id}`}
                        {t.related_receipt && ` · for ${t.related_receipt}`}
                        {t.recorded_by_name && ` · by ${t.recorded_by_name}`}
                      </p>
                      {t.notes && <p className="text-[13px] text-ink-600">{t.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className={cn('min-w-24 text-right font-semibold tabular-nums', t.kind === 'payment' ? 'text-ink-900' : 'text-warning-700')}>
                        {t.kind === 'payment' ? inr(t.amount_paise) : `− ${inr(t.amount_paise)}`}
                        {t.kind === 'payment' && refunded > 0 && <span className="block text-xs font-normal text-ink-500">net {inr(t.amount_paise - refunded)}</span>}
                      </span>
                      {t.kind === 'payment' && !t.voided && <Button size="sm" variant="ghost" leftIcon={<Printer className="h-4 w-4" />} onClick={() => printReceipt(t)}>Receipt</Button>}
                      {canVoid && <Button size="sm" variant="ghost" isLoading={busy === `void-${t.id}`} disabled={busy !== null} onClick={() => voidTx(t)}>Void</Button>}
                      {role === 'admin' && t.kind === 'payment' && !t.voided && refunded < t.amount_paise && (
                        <Button size="sm" variant="ghost" isLoading={busy === `refund-${t.id}`} disabled={busy !== null} onClick={() => refundTx(t)}>Record refund</Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {tx.total > PAGE && (
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm sm:px-6">
                <Button size="sm" variant="ghost" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
                <span className="text-ink-500">Page {page + 1} of {Math.ceil(tx.total / PAGE)} · {tx.total} transactions</span>
                <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE >= tx.total || loading} onClick={() => setPage(p => p + 1)} rightIcon={<ChevronRight className="h-4 w-4" />}>Next</Button>
              </div>
            )}
          </>
        ) : null}
      </Panel>

      <p className="flex items-start gap-2 text-[13px] text-ink-500">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Bookings and unpaid orders are never counted as sales. Online payments count only after the server has verified them with Razorpay. Recording a refund here does not send money — it records a refund already made.
      </p>
    </div>
  );
};

const RECON_LABEL: Record<string, string> = {
  opd_fee_without_ledger: 'OPD fees marked paid without a recorded collection',
  online_without_ledger: 'Online payments without amount or time',
  lab_paid_without_ledger: 'Lab orders marked paid without a recorded payment',
  multiple_payments: 'Orders paid more than once online',
  open_cases: 'Payment cases awaiting a decision',
};

const MoneyCard: React.FC<{ label: string; value: string; hint?: string; onClick?: () => void; tone?: 'leaf' | 'warning' }> = ({ label, value, hint, onClick, tone }) => {
  const body = (
    <>
      <p className="text-[13px] font-medium text-ink-500">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', tone === 'leaf' ? 'text-leaf-800' : tone === 'warning' ? 'text-warning-700' : 'text-ink-900')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="cursor-pointer rounded-2xl border border-line bg-white p-4 text-left shadow-soft transition-colors hover:border-brand-300" title="Show these transactions">{body}</button>
  ) : (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-soft">{body}</div>
  );
};

const SplitBar: React.FC<{ parts: { label: string; value: number; cls: string }[] }> = ({ parts }) => {
  const sum = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={parts.map(p => `${p.label} ${inr(p.value)}`).join(', ')}>
        {sum > 0 && parts.map(p => <span key={p.label} className={p.cls} style={{ width: `${(p.value / sum) * 100}%` }} />)}
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {parts.map(p => (
          <li key={p.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', p.cls)} aria-hidden="true" />{p.label}</span>
            <span className="tabular-nums text-ink-700">{inr(p.value)}{sum > 0 && <span className="text-ink-400"> · {Math.round((p.value / sum) * 100)}%</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const DailyBars: React.FC<{ daily: FinanceSummary['daily'] }> = ({ daily }) => {
  const byDay = new Map<string, { opd: number; pathology: number }>();
  for (const d of daily) {
    const e = byDay.get(d.day) ?? { opd: 0, pathology: 0 };
    e[d.service] += Number(d.gross);
    byDay.set(d.day, e);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-31);
  const max = Math.max(1, ...days.map(([, v]) => v.opd + v.pathology));
  if (days.length === 0) return <p className="text-sm text-ink-500">No collections in this period.</p>;
  return (
    <div>
      <div className="flex h-32 items-end gap-1" role="img" aria-label={`Daily collections, ${days.length} days`}>
        {days.map(([day, v]) => (
          <div key={day} className="flex min-w-0 flex-1 flex-col justify-end" title={`${day}: ${inr(v.opd + v.pathology)} (OPD ${inr(v.opd)}, Pathology ${inr(v.pathology)})`}>
            <span className="block bg-leaf-600" style={{ height: `${(v.pathology / max) * 100}%` }} />
            <span className="block rounded-t bg-brand-600" style={{ height: `${(v.opd / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <p className="mt-2 flex justify-between text-xs text-ink-500"><span>{days[0][0]}</span><span>{days[days.length - 1][0]}</span></p>
    </div>
  );
};

const cleanAddress = (s?: string) => (s || '').replace(/\s+/g, ' ').trim();

/** Printable receipt in its own window; only what a receipt needs. */
function printReceiptWindow(t: Transaction, hospital: string, address: string) {
  const w = window.open('', '_blank', 'width=420,height=640');
  if (!w) return;
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const rows: [string, string][] = [
    ['Receipt no.', t.receipt_number],
    ['Date', fmtDateTime(t.occurred_at)],
    ['Patient', `${t.patient_name ?? ''}${t.patient_code ? ` (${t.patient_code})` : ''}`],
    ['Service', t.service === 'opd' ? `OPD consultation${t.token_number ? ` · token #${t.token_number}` : ''}` : 'Pathology tests'],
    ['Reference', t.reference ?? '—'],
    ['Payment', `${METHOD_LABEL[t.method] ?? t.method} · ${t.channel === 'online' ? 'Online' : 'Paid at counter'}`],
    ['Received by', t.channel === 'online' ? 'Online (Razorpay)' : (t.recorded_by_name ?? '—')],
  ];
  w.document.write(`<!doctype html><title>${esc(t.receipt_number)}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#193247}h1{font-size:18px;margin:0}p{margin:2px 0;color:#647785;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}td{padding:6px 0;border-bottom:1px solid #E5ECEF}td:last-child{text-align:right}
.amt{font-size:22px;font-weight:700;margin-top:16px;text-align:right}</style>
<h1>${esc(hospital)}</h1><p>${esc(address)}</p><p>Payment receipt</p>
<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
<div class="amt">${esc(inr(t.amount_paise))}</div>
${Number(t.refunded_paise) > 0 ? `<p style="text-align:right">Refunded ${esc(inr(Number(t.refunded_paise)))}</p>` : ''}
<script>window.onload=()=>window.print()</script>`);
  w.document.close();
}
