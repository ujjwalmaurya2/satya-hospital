import { describe, expect, it } from 'vitest';
import { inr, SummaryCell, totalsOf, transactionsCsv, Transaction } from '../services/financeService';

const cell = (service: 'opd' | 'pathology', channel: 'online' | 'counter', gross: number, refunds = 0, payments = 1): SummaryCell =>
  ({ service, channel, gross, refunds, payments, refund_count: refunds ? 1 : 0, voids: 0 });

describe('sales totals', () => {
  const cells = [cell('opd', 'online', 50000), cell('opd', 'counter', 100000, 0, 2), cell('pathology', 'online', 35000, 5000), cell('pathology', 'counter', 70000)];

  it('total = OPD + Pathology and online + offline = total; net = gross − refunds', () => {
    const all = totalsOf(cells), opd = totalsOf(cells, c => c.service === 'opd'), lab = totalsOf(cells, c => c.service === 'pathology');
    expect(all.gross).toBe(opd.gross + lab.gross);
    expect(all.gross).toBe(all.online + all.counter);
    expect(all).toMatchObject({ gross: 255000, refunds: 5000, net: 250000, payments: 5 });
    expect(lab).toMatchObject({ online: 35000, counter: 70000, net: 100000 });
  });

  it('formats rupees and exports CSV without medical details', () => {
    expect(inr(255000)).toBe('₹2,550');
    expect(inr(12345)).toBe('₹123.45');
    const row = { receipt_number: 'RCPT-1', kind: 'payment', service: 'opd', occurred_at: '2026-10-26T18:31:00Z', patient_code: 'SH-2026-00001', patient_name: 'Secret Name', reference: 'SH-261027-ABC', channel: 'counter', method: 'cash', amount_paise: 50000, refunded_paise: 10000, voided: false, external_id: null, related_receipt: null, recorded_by_name: 'Desk, "A"' } as unknown as Transaction;
    const csv = transactionsCsv([row]);
    expect(csv).toContain('SH-2026-00001');
    expect(csv).not.toContain('Secret Name');
    expect(csv).toContain('27 Oct 2026'); // 00:01 IST on the 27th
    expect(csv.split('\n')[1]).toContain(',500.00,100.00,400.00,Partly refunded,');
    expect(csv).toContain('"Desk, ""A"""');
  });
});
