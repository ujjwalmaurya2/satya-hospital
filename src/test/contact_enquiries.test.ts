import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mock = vi.hoisted(() => ({
  configured: false,
  insert: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mock.configured;
  },
  get supabase() {
    return mock.configured ? { from: () => ({ insert: mock.insert }) } : null;
  },
}));

import { normalizeEnquiry, supabaseService } from '../services/supabaseService';

const valid = {
  name: '  Asha Verma ',
  phone: '98765 43210',
  email: '',
  topic: 'Pediatric Enquiry',
  message: ' Is the vaccination clinic open on Saturday? ',
};

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
}

describe('Contact enquiries — validation', () => {
  it('trims fields, strips phone formatting and drops a blank email', () => {
    const { value, error } = normalizeEnquiry(valid);
    expect(error).toBeUndefined();
    expect(value).toEqual({
      name: 'Asha Verma',
      phone: '9876543210',
      email: undefined,
      topic: 'Pediatric Enquiry',
      message: 'Is the vaccination clinic open on Saturday?',
    });
  });

  it('rejects input the database CHECK constraints would reject', () => {
    expect(normalizeEnquiry({ ...valid, name: '   ' }).error).toBeDefined();
    expect(normalizeEnquiry({ ...valid, phone: '1234567890' }).error).toBeDefined();
    expect(normalizeEnquiry({ ...valid, email: 'not-an-email' }).error).toBeDefined();
    expect(normalizeEnquiry({ ...valid, message: 'x'.repeat(2001) }).error).toBeDefined();
  });
});

describe('Contact enquiries — submitEnquiry fallback', () => {
  beforeEach(() => {
    mock.configured = false;
    mock.insert.mockReset();
    vi.stubGlobal('localStorage', memoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the enquiry locally and reports `local`, not `sent`, when Supabase is not configured', async () => {
    const res = await supabaseService.submitEnquiry(valid);
    expect(res).toEqual({ status: 'local' });
    expect(mock.insert).not.toHaveBeenCalled();

    const { enquiries, source } = await supabaseService.listEnquiries();
    expect(source).toBe('local');
    expect(enquiries).toHaveLength(1);
    expect(enquiries[0]).toMatchObject({ name: 'Asha Verma', phone: '9876543210', status: 'new' });
  });

  it('reports `sent` only after Supabase accepts the row', async () => {
    mock.configured = true;
    mock.insert.mockResolvedValue({ error: null });
    const res = await supabaseService.submitEnquiry(valid);
    expect(res).toEqual({ status: 'sent' });
    expect(mock.insert).toHaveBeenCalledWith({
      name: 'Asha Verma',
      phone: '9876543210',
      email: null,
      topic: 'Pediatric Enquiry',
      message: 'Is the vaccination clinic open on Saturday?',
    });
  });

  it('returns a retryable error when the insert is rejected', async () => {
    mock.configured = true;
    mock.insert.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });
    const res = await supabaseService.submitEnquiry(valid);
    expect(res.status).toBe('error');
    // Database internals are not shown to the public.
    if (res.status === 'error') expect(res.error).not.toContain('row-level security');
  });

  it('passes the throttle message through so the visitor knows to wait', async () => {
    mock.configured = true;
    mock.insert.mockResolvedValue({ error: { message: 'Too many enquiries from this number. Please wait a few minutes or call reception.' } });
    const res = await supabaseService.submitEnquiry(valid);
    expect(res).toMatchObject({ status: 'error', error: expect.stringContaining('Too many enquiries') });
  });

  it('times out to an error instead of hanging when the network stalls', async () => {
    mock.configured = true;
    mock.insert.mockReturnValue(new Promise(() => {}));
    const res = await supabaseService.submitEnquiry(valid);
    expect(res.status).toBe('error');
  });

  it('never calls Supabase for invalid input', async () => {
    mock.configured = true;
    const res = await supabaseService.submitEnquiry({ ...valid, phone: '12' });
    expect(res.status).toBe('error');
    expect(mock.insert).not.toHaveBeenCalled();
  });
});

describe('Contact enquiries — migration', () => {
  const sql = readFileSync(resolve(__dirname, '../../supabase/migrations/20261024000004_contact_enquiries.sql'), 'utf8');

  it('enables RLS and limits anon to INSERT', () => {
    expect(sql).toMatch(/ALTER TABLE public\.contact_enquiries ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/FOR INSERT TO anon, authenticated/);
    expect(sql).not.toMatch(/FOR SELECT TO anon/);
    expect(sql).toMatch(/FOR SELECT TO authenticated\s+USING \(public\.get_auth_role\(\) IN \('reception', 'admin'\)\)/);
    expect(sql).toMatch(/FOR UPDATE TO authenticated/);
  });
});
