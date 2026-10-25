import { useEffect, useState } from 'react';
import type { LabConfig, LabPackage, LabTest } from '../services/labService';

export interface CartEntry {
  type: 'test' | 'package';
  id: string;
}

export interface CartLine {
  entry: CartEntry;
  name: string;
  pricePaise: number;
  testNames: string[];
}

export interface CartPreview {
  lines: CartLine[];
  /** Individual tests dropped because a selected package already covers them. */
  skipped: { name: string; packageName: string }[];
  /** Problems the server would reject (duplicate under the 'reject' rule, overlapping packages, unavailable items). */
  conflicts: string[];
  totalPaise: number;
}

/** Mirrors lab_price_cart() for an instant preview. The server's price is the one charged. */
export function previewCart(cart: CartEntry[], tests: LabTest[], packages: LabPackage[], rule: LabConfig['duplicate_test_rule']): CartPreview {
  const out: CartPreview = { lines: [], skipped: [], conflicts: [], totalPaise: 0 };
  const covered = new Map<string, string>(); // test id -> package name

  for (const e of cart.filter(e => e.type === 'package')) {
    const p = packages.find(x => x.id === e.id && x.is_active);
    if (!p) {
      out.conflicts.push('A selected package is no longer available.');
      continue;
    }
    const overlap = p.tests.find(t => covered.has(t.id));
    if (overlap) out.conflicts.push(`${p.name} and ${covered.get(overlap.id)} both include ${overlap.name}. Please choose one.`);
    p.tests.forEach(t => covered.set(t.id, p.name));
    out.lines.push({ entry: e, name: p.name, pricePaise: Math.round(p.price * 100), testNames: p.tests.map(t => t.name) });
  }

  for (const e of cart.filter(e => e.type === 'test')) {
    const t = tests.find(x => x.id === e.id && x.is_active);
    if (!t) {
      out.conflicts.push('A selected test is no longer available.');
      continue;
    }
    const inPackage = covered.get(t.id);
    if (inPackage) {
      if (rule === 'reject') out.conflicts.push(`${t.name} is already included in ${inPackage}. Please remove it.`);
      else out.skipped.push({ name: t.name, packageName: inPackage });
      continue;
    }
    out.lines.push({ entry: e, name: t.name, pricePaise: Math.round(t.price * 100), testNames: [t.name] });
  }

  out.totalPaise = out.lines.reduce((s, l) => s + l.pricePaise, 0);
  return out;
}

export const formatPaise = (p: number) => `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0 })}`;

const KEY = 'satya_lab_cart';

/** Cart kept in localStorage so it survives the Google sign-in redirect. */
export function useLabCart() {
  const [cart, setCart] = useState<CartEntry[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(e => (e?.type === 'test' || e?.type === 'package') && typeof e.id === 'string') : [];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(cart)), [cart]);

  const has = (e: CartEntry) => cart.some(c => c.type === e.type && c.id === e.id);
  return {
    cart,
    has,
    toggle: (e: CartEntry) => setCart(c => (has(e) ? c.filter(x => !(x.type === e.type && x.id === e.id)) : [...c, e])),
    remove: (e: CartEntry) => setCart(c => c.filter(x => !(x.type === e.type && x.id === e.id))),
    clear: () => setCart([]),
  };
}
