import { describe, expect, it } from 'vitest';
import { formatPaise, previewCart } from '../lib/labCart';
import type { LabPackage, LabTest } from '../services/labService';

const test = (id: string, price: number, active = true) => ({ id, name: id.toUpperCase(), price, is_active: active }) as LabTest;
const pkg = (id: string, price: number, testIds: string[]) =>
  ({ id, name: `Pkg ${id}`, price, is_active: true, tests: testIds.map(t => ({ id: t, name: t.toUpperCase() })) }) as LabPackage;

const tests = [test('cbc', 350), test('tsh', 360), test('lft', 750, false)];
const packages = [pkg('a', 500, ['cbc', 'urine']), pkg('b', 900, ['cbc', 'tsh'])];

describe('lab cart preview (mirrors lab_price_cart)', () => {
  it('totals packages and tests, skipping tests already in a package', () => {
    const p = previewCart([{ type: 'package', id: 'a' }, { type: 'test', id: 'cbc' }, { type: 'test', id: 'tsh' }], tests, packages, 'skip_individual');
    expect(p.lines.map(l => l.name)).toEqual(['Pkg a', 'TSH']);
    expect(p.skipped).toEqual([{ name: 'CBC', packageName: 'Pkg a' }]);
    expect(p.totalPaise).toBe(86000);
    expect(p.conflicts).toEqual([]);
  });

  it('reports duplicates under the reject rule, overlapping packages and unavailable tests', () => {
    expect(previewCart([{ type: 'package', id: 'a' }, { type: 'test', id: 'cbc' }], tests, packages, 'reject').conflicts[0]).toMatch(/already included/);
    expect(previewCart([{ type: 'package', id: 'a' }, { type: 'package', id: 'b' }], tests, packages, 'skip_individual').conflicts[0]).toMatch(/both include CBC/);
    expect(previewCart([{ type: 'test', id: 'lft' }], tests, packages, 'skip_individual').conflicts[0]).toMatch(/no longer available/);
  });

  it('formats paise as rupees', () => {
    expect(formatPaise(86000)).toBe('₹860');
    expect(formatPaise(12350)).toBe('₹123.50');
  });
});
