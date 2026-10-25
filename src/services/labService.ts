/**
 * Pathology test booking client. Pricing, duplicate rules, roles, payment and
 * report release are enforced in Postgres (20261027000006) and the lab Edge
 * Functions; this module only calls them. Rows keep the database's field names.
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { initialPathologyTests } from '../data/mockData';
import { openRazorpayCheckout } from '../lib/razorpayCheckout';
import { preparePdf } from '../lib/preparePdf';
import type { PdfCompressResult } from '../lib/pdfCompress';
import type { CartEntry } from '../lib/labCart';

export interface LabTest {
  id: string;
  test_code: string;
  name: string;
  category: string;
  description: string | null;
  preparation: string | null;
  specimen_type: string | null;
  fasting_required: boolean;
  turnaround_hours: number | null;
  price: number;
  is_active: boolean;
  is_demo: boolean;
}

export interface LabPackage {
  id: string;
  package_code: string;
  name: string;
  description: string | null;
  preparation: string | null;
  price: number;
  is_active: boolean;
  is_demo: boolean;
  tests: { id: string; name: string }[];
}

export interface LabConfig {
  duplicate_test_rule: 'skip_individual' | 'reject';
  online_payment_enabled: boolean;
  require_independent_verification: boolean;
  /** True only when switched on AND service areas, slots and fee are configured. */
  home_collection_enabled: boolean;
  home_collection_switch: boolean;
  home_collection_fee: number | null;
  home_collection_pincodes: string[];
  home_collection_slots: string[];
  home_collection_slot_capacity: number | null;
  home_collection_max_days: number;
  operating_days: string[];
  holidays: string[];
}

export const DEFAULT_LAB_CONFIG: LabConfig = {
  duplicate_test_rule: 'skip_individual',
  online_payment_enabled: false,
  require_independent_verification: false,
  home_collection_enabled: false,
  home_collection_switch: false,
  home_collection_fee: null,
  home_collection_pincodes: [],
  home_collection_slots: [],
  home_collection_slot_capacity: null,
  home_collection_max_days: 7,
  operating_days: [],
  holidays: [],
};

export interface HomeCollectionInput {
  address: string;
  pincode: string;
  slot: string;
}

export type UploadStage = 'preparing' | 'uploading' | 'saving';

export interface LabOrderItem {
  id: string;
  item_type: 'test' | 'package';
  test_id: string | null;
  package_id: string | null;
  name: string;
  price_paise: number;
  test_ids: string[];
  test_names: string[];
}

export interface LabSample {
  id: string;
  accession_number: string;
  specimen_type: string;
  status: 'collected' | 'received' | 'rejected';
  collected_at: string;
  rejection_reason: string | null;
}

export interface LabReport {
  id: string;
  order_id: string;
  test_id: string;
  test_name: string;
  status: 'pending_verification' | 'published' | 'superseded' | 'rejected' | 'unmatched';
  version_number: number;
  file_name: string;
  storage_key: string;
  uploaded_by: string;
  verified_at: string | null;
  published_at: string | null;
  correction_reason: string | null;
  created_at: string;
}

export interface LabOrder {
  id: string;
  order_number: string;
  patient_profile_id: string;
  patient_name: string;
  contact_phone: string;
  source: 'online' | 'walk_in';
  collection_method: 'hospital_lab' | 'home';
  preferred_date: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'refund_due' | 'refunded' | 'needs_reconciliation';
  payment_mode: 'online' | 'cash' | 'upi' | null;
  lab_status: 'awaiting_sample' | 'sample_collected' | 'processing' | 'completed';
  subtotal_paise: number;
  total_paise: number;
  collection_address: string | null;
  collection_pincode: string | null;
  collection_slot: string | null;
  collection_fee_paise: number;
  last_payment_error: string | null;
  reconciliation_reason: string | null;
  cancel_reason: string | null;
  created_at: string;
  items: LabOrderItem[];
  samples?: LabSample[];
  reports?: LabReport[];
}

export interface LabPatientInput {
  patientName: string;
  phone: string;
  gender: 'male' | 'female' | 'other' | null;
}

const ORDER_SELECT = '*, items:pathology_order_items(*)';

function client() {
  if (!supabase) throw new Error('Lab booking needs the hospital’s online system, which isn’t connected right now. Please call reception.');
  return supabase;
}

function fail(error: { message?: string } | null): never {
  throw new Error(error?.message || 'Something went wrong. Please try again.');
}

/** Edge Function errors carry the server's own message in the body. */
async function functionError(error: unknown): Promise<Error> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return new Error(body.error);
    } catch {
      /* fall through */
    }
  }
  return new Error((error as Error)?.message || 'Something went wrong. Please try again.');
}

async function withReports(orders: LabOrder[], includeSamples = false): Promise<LabOrder[]> {
  if (!orders.length) return orders;
  const ids = orders.map(o => o.id);
  // RLS decides what comes back: patients only ever receive released reports.
  const [{ data: reports }, samples] = await Promise.all([
    client().from('pathology_reports').select('*').in('order_id', ids).order('version_number', { ascending: false }),
    includeSamples ? client().from('pathology_samples').select('*').in('order_id', ids).order('collected_at') : Promise.resolve({ data: [] }),
  ]);
  return orders.map(o => ({
    ...o,
    reports: (reports ?? []).filter(r => r.order_id === o.id),
    samples: ((samples.data ?? []) as (LabSample & { order_id: string })[]).filter(s => s.order_id === o.id),
  }));
}

export const labService = {
  online: isSupabaseConfigured,

  async catalogue(): Promise<{ tests: LabTest[]; packages: LabPackage[] }> {
    if (!supabase) {
      // shortcut: offline preview shows the bundled demo tests only; ordering needs Supabase.
      return {
        tests: initialPathologyTests.map(t => ({
          id: t.id, test_code: t.testCode, name: t.name, category: t.category, description: null, preparation: null,
          specimen_type: t.specimenType, fasting_required: t.fastingRequired, turnaround_hours: t.turnaroundHours,
          price: t.price, is_active: t.isActive, is_demo: true,
        })),
        packages: [],
      };
    }
    const [tests, packages] = await Promise.all([
      supabase.from('pathology_tests').select('*').order('category').order('name'),
      supabase.from('pathology_packages').select('*, contents:pathology_package_tests(test:pathology_tests(id, name))').order('name'),
    ]);
    if (tests.error) fail(tests.error);
    if (packages.error) fail(packages.error);
    return {
      tests: tests.data.map(t => ({ ...t, price: Number(t.price) })),
      packages: packages.data.map(({ contents, ...p }) => ({
        ...p,
        price: Number(p.price),
        tests: (contents as { test: { id: string; name: string } }[]).map(c => c.test).sort((a, b) => a.name.localeCompare(b.name)),
      })),
    };
  },

  async config(): Promise<LabConfig> {
    if (!supabase) return DEFAULT_LAB_CONFIG;
    const { data, error } = await supabase.rpc('lab_config');
    if (error || !data) return DEFAULT_LAB_CONFIG;
    return { ...DEFAULT_LAB_CONFIG, ...data, home_collection_fee: data.home_collection_fee != null ? Number(data.home_collection_fee) : null };
  },

  /** Super Admin: home-collection setup (validated again in SQL). */
  async saveHomeCollection(cfg: { enabled: boolean; fee: number | null; pincodes: string[]; slots: string[]; slotCapacity: number | null; maxDays: number }) {
    const { error } = await client().rpc('set_lab_home_collection', {
      p_enabled: cfg.enabled,
      p_fee: cfg.fee,
      p_pincodes: cfg.pincodes,
      p_slots: cfg.slots,
      p_slot_capacity: cfg.slotCapacity,
      p_max_days: cfg.maxDays,
    });
    if (error) fail(error);
  },

  async createOrder(
    cart: CartEntry[],
    patient: LabPatientInput,
    collection: 'hospital_lab' | 'home',
    preferredDate: string | null,
    idempotencyKey: string,
    home?: HomeCollectionInput
  ): Promise<LabOrder> {
    const { data, error } = await client().rpc('create_lab_order', {
      p_items: cart,
      p_patient_name: patient.patientName,
      p_phone: patient.phone,
      p_gender: patient.gender,
      p_collection_method: collection,
      p_preferred_date: preferredDate,
      p_idempotency_key: idempotencyKey,
      p_address: collection === 'home' ? home?.address ?? null : null,
      p_pincode: collection === 'home' ? home?.pincode ?? null : null,
      p_slot: collection === 'home' ? home?.slot ?? null : null,
    });
    if (error) fail(error);
    return data;
  },

  /** Razorpay checkout for a pending order. Only the server marks it paid. */
  async pay(orderNumber: string, email?: string): Promise<'paid' | 'dismissed' | { failed: string }> {
    const { data: order, error } = await client().functions.invoke('lab-create-order', { body: { orderNumber } });
    if (error) throw await functionError(error);
    if (order.alreadyPaid) return 'paid';
    const result = await openRazorpayCheckout({
      keyId: order.keyId,
      orderId: order.razorpayOrderId,
      amountPaise: order.amountPaise,
      currency: order.currency,
      description: `Lab tests · ${order.orderNumber}`,
      prefill: { name: order.patientName, contact: order.phone, email },
    });
    if (result.kind === 'success') {
      // The status page polls the order, so a slow verification still resolves.
      await client().functions.invoke('lab-verify-payment', { body: result.response }).catch(() => undefined);
      return 'paid';
    }
    return result.kind === 'failed' ? { failed: result.message } : 'dismissed';
  },

  async myOrders(): Promise<LabOrder[]> {
    const { data, error } = await client().from('pathology_orders').select(ORDER_SELECT).order('created_at', { ascending: false });
    if (error) fail(error);
    return withReports(data as LabOrder[]);
  },

  async order(orderNumber: string): Promise<LabOrder | null> {
    const { data, error } = await client().from('pathology_orders').select(ORDER_SELECT).eq('order_number', orderNumber).maybeSingle();
    if (error) fail(error);
    return data ? (await withReports([data as LabOrder]))[0] : null;
  },

  async cancel(orderId: string, reason: string) {
    const { error } = await client().rpc('cancel_lab_order', { p_order_id: orderId, p_reason: reason });
    if (error) fail(error);
  },

  /** Short-lived signed link; storage RLS allows it only for authorised readers. */
  async openReport(storageKey: string) {
    const { data, error } = await client().storage.from('lab-reports').createSignedUrl(storageKey, 120);
    if (error || !data) throw new Error('This report isn’t available to your account.');
    window.open(data.signedUrl, '_blank', 'noopener');
  },

  // ------------------------------------------------------------- staff
  async staffOrders(): Promise<LabOrder[]> {
    // shortcut: latest 200 orders, filtered in the browser; add server-side paging when volume grows.
    const { data, error } = await client().from('pathology_orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(200);
    if (error) fail(error);
    return withReports(data as LabOrder[], true);
  },

  async walkIn(cart: CartEntry[], patient: LabPatientInput, paymentMode: 'cash' | 'upi' | null, idempotencyKey: string): Promise<LabOrder> {
    const { data, error } = await client().rpc('register_lab_walk_in', {
      p_items: cart,
      p_patient_name: patient.patientName,
      p_phone: patient.phone,
      p_gender: patient.gender,
      p_patient_profile_id: null,
      p_payment_mode: paymentMode,
      p_idempotency_key: idempotencyKey,
    });
    if (error) fail(error);
    return data;
  },

  async rpc(name: string, args: Record<string, unknown>) {
    const { error } = await client().rpc(name, args);
    if (error) fail(error);
  },

  /**
   * Validate + losslessly compress (in a worker), upload to the private bucket,
   * then register the report. If registering fails the just-uploaded file is
   * removed, so storage never keeps an orphan the database doesn't know about.
   */
  async uploadReport(orderId: string, testId: string, file: File, correctionReason: string | null, onStage?: (s: UploadStage) => void): Promise<PdfCompressResult> {
    onStage?.('preparing');
    const prepared = await preparePdf(file);
    const body = new Blob([prepared.bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
    const key = `orders/${orderId}/${crypto.randomUUID()}.pdf`;
    const digest = await crypto.subtle.digest('SHA-256', await body.arrayBuffer());
    const checksum = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const fileName = /\.pdf$/i.test(file.name) ? file.name : `${file.name || 'report'}.pdf`;

    onStage?.('uploading');
    const { error: upErr } = await client().storage.from('lab-reports').upload(key, body, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    onStage?.('saving');
    const { error } = await client().rpc('register_lab_report', {
      p_order_id: orderId,
      p_test_id: testId,
      p_storage_key: key,
      p_file_name: fileName,
      p_file_size: prepared.finalSize,
      p_checksum: checksum,
      p_correction_reason: correctionReason,
      p_original_file_size: prepared.originalSize,
    });
    if (error) {
      await client().storage.from('lab-reports').remove([key]).catch(() => undefined);
      fail(error);
    }
    return prepared;
  },

  async saveTest(test: Partial<LabTest> & { id?: string }) {
    const { id, ...row } = test;
    const { error } = id
      ? await client().from('pathology_tests').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id)
      : await client().from('pathology_tests').insert(row);
    if (error) fail(error);
  },

  async savePackage(pkg: Partial<Omit<LabPackage, 'tests'>> & { id?: string }, testIds?: string[]) {
    const { id, ...row } = pkg;
    const { data, error } = id
      ? await client().from('pathology_packages').update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select('id').maybeSingle()
      : await client().from('pathology_packages').insert(row).select('id').maybeSingle();
    if (error) fail(error);
    if (!data) throw new Error('You don’t have permission to change this package.');
    if (testIds) {
      const { error: delErr } = await client().from('pathology_package_tests').delete().eq('package_id', data.id);
      if (delErr) fail(delErr);
      const { error: insErr } = await client().from('pathology_package_tests').insert(testIds.map(test_id => ({ package_id: data.id, test_id })));
      if (insErr) fail(insErr);
    }
  },
};
