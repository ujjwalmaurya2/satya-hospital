/**
 * Sales reporting from the payment ledger (20261031000010). The database
 * scopes every call by role: Super Admin sees all, reception only OPD,
 * pathology only pathology — whatever service the browser asks for.
 */
import { supabase } from '../lib/supabase';

export type Service = 'opd' | 'pathology';
export type Channel = 'online' | 'counter';
export type TxKind = 'payment' | 'refund' | 'void';

export interface SummaryCell {
  service: Service;
  channel: Channel;
  gross: number;
  payments: number;
  refunds: number;
  refund_count: number;
  voids: number;
}

export interface FinanceSummary {
  service: Service | null;
  cells: SummaryCell[];
  daily: { day: string; service: Service; gross: number; refunds: number }[];
  pending: { service: Service; count: number; amount: number }[];
}

export interface Transaction {
  id: string;
  receipt_number: string;
  service: Service;
  kind: TxKind;
  amount_paise: number;
  channel: Channel;
  method: string;
  provider: string | null;
  external_id: string | null;
  occurred_at: string;
  related_id: string | null;
  related_receipt: string | null;
  recorded_by_name: string | null;
  notes: string | null;
  patient_name: string | null;
  patient_code: string | null;
  reference: string | null;
  token_number: number | null;
  appointment_date: string | null;
  refunded_paise: number;
  voided: boolean;
}

export interface TxQuery {
  from: string | null;
  to: string | null;
  service: Service | null;
  channel: Channel | null;
  kind: TxKind | null;
  query: string;
  sort: 'asc' | 'desc';
  limit: number;
  offset: number;
}

export interface Totals {
  gross: number;
  refunds: number;
  net: number;
  payments: number;
  online: number;
  counter: number;
}

/** Roll summary cells up for any service/channel slice (all figures in paise). */
export function totalsOf(cells: SummaryCell[], f: (c: SummaryCell) => boolean = () => true): Totals {
  const sel = cells.filter(f);
  const sum = (k: keyof SummaryCell, g: (c: SummaryCell) => boolean = () => true) => sel.filter(g).reduce((s, c) => s + Number(c[k]), 0);
  const gross = sum('gross');
  const refunds = sum('refunds');
  return { gross, refunds, net: gross - refunds, payments: sum('payments'), online: sum('gross', c => c.channel === 'online'), counter: sum('gross', c => c.channel === 'counter') };
}

export const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const METHOD_LABEL: Record<string, string> = { cash: 'Cash', upi: 'UPI', card: 'Card', netbanking: 'Net banking', wallet: 'Wallet', emi: 'EMI', unknown: 'Not reported' };

function client() {
  if (!supabase) throw new Error('The hospital database is not connected.');
  return supabase;
}
function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || 'Request failed. Please try again.');
}

export const financeService = {
  async summary(from: string | null, to: string | null, service: Service | null, channel: Channel | null): Promise<FinanceSummary> {
    const { data, error } = await client().rpc('finance_summary', { p_from: from, p_to: to, p_service: service, p_channel: channel });
    if (error) fail(error);
    return data;
  },

  async transactions(q: TxQuery): Promise<{ total: number; rows: Transaction[] }> {
    const { data, error } = await client().rpc('finance_transactions', {
      p_from: q.from, p_to: q.to, p_service: q.service, p_channel: q.channel, p_kind: q.kind,
      p_query: q.query.trim() || null, p_sort: q.sort, p_limit: q.limit, p_offset: q.offset,
    });
    if (error) fail(error);
    return { total: Number(data?.total ?? 0), rows: data?.rows ?? [] };
  },

  async reconciliation(): Promise<Record<string, unknown[]>> {
    const { data, error } = await client().rpc('finance_reconciliation');
    if (error) fail(error);
    return data;
  },

  async voidPayment(id: string, reason: string) {
    const { error } = await client().rpc('void_counter_payment', { p_transaction_id: id, p_reason: reason });
    if (error) fail(error);
  },

  async refund(id: string, amountPaise: number, reason: string) {
    const { error } = await client().rpc('record_payment_refund', { p_transaction_id: id, p_amount_paise: amountPaise, p_reason: reason });
    if (error) fail(error);
  },
};

/** CSV with the same columns the table shows; only a patient ID, no medical details. */
export function transactionsCsv(rows: Transaction[]): string {
  const head = ['Receipt', 'Type', 'Service', 'Date (IST)', 'Time (IST)', 'Patient ID', 'Reference', 'Channel', 'Method', 'Amount (INR)', 'Refunded (INR)', 'Net (INR)', 'Status', 'Provider ID', 'Applies to', 'Recorded by'];
  const ist = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString('en-IN', { ...o, timeZone: 'Asia/Kolkata' });
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map(r => {
    const sign = r.kind === 'payment' ? 1 : -1;
    const net = r.kind === 'payment' ? (r.voided ? 0 : r.amount_paise - Number(r.refunded_paise)) : r.kind === 'refund' ? -r.amount_paise : 0;
    return [
      r.receipt_number, r.kind, r.service === 'opd' ? 'OPD' : 'Pathology', ist(r.occurred_at, { dateStyle: 'medium' }), ist(r.occurred_at, { timeStyle: 'short' }),
      r.patient_code ?? '', r.reference ?? '', r.channel === 'online' ? 'Online' : 'Offline (counter)', METHOD_LABEL[r.method] ?? r.method,
      ((sign * r.amount_paise) / 100).toFixed(2), (Number(r.refunded_paise) / 100).toFixed(2), (net / 100).toFixed(2),
      r.voided ? 'Voided' : r.kind === 'payment' ? (Number(r.refunded_paise) >= r.amount_paise ? 'Refunded' : Number(r.refunded_paise) > 0 ? 'Partly refunded' : 'Received') : r.kind === 'refund' ? 'Refund' : 'Void',
      r.external_id ?? '', r.related_receipt ?? '', r.recorded_by_name ?? '',
    ].map(esc).join(',');
  });
  return [head.join(','), ...lines].join('\n');
}
