import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, FlaskConical, Package, Plus, Search, ShoppingBag, X } from 'lucide-react';
import { Button, LinkButton } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { PageHero, Section } from '../../components/site/Section';
import { cn } from '../../lib/cn';
import { CartEntry, CartPreview, formatPaise, previewCart, useLabCart } from '../../lib/labCart';
import { LabConfig, LabPackage, LabTest, labService } from '../../services/labService';

const PACKAGES = 'Packages';

/** Hook shared by the catalogue and checkout: catalogue + config + priced cart. */
export function useLabCatalogue() {
  const cartApi = useLabCart();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [packages, setPackages] = useState<LabPackage[]>([]);
  const [config, setConfig] = useState<LabConfig>({ duplicate_test_rule: 'skip_individual', home_collection_enabled: false, online_payment_enabled: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([labService.catalogue(), labService.config()])
      .then(([c, cfg]) => {
        setTests(c.tests.filter(t => t.is_active));
        setPackages(c.packages.filter(p => p.is_active));
        setConfig(cfg);
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load the test list.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const preview = useMemo(() => previewCart(cartApi.cart, tests, packages, config.duplicate_test_rule), [cartApi.cart, tests, packages, config]);
  return { ...cartApi, tests, packages, config, loading, error, reload: load, preview };
}

export const LabTests: React.FC = () => {
  const { tests, packages, loading, error, reload, preview, has, toggle, remove, cart } = useLabCatalogue();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => ['All', ...(packages.length ? [PACKAGES] : []), ...Array.from(new Set(tests.map(t => t.category))).sort()], [tests, packages]);
  const q = query.trim().toLowerCase();
  const match = (...fields: (string | null)[]) => !q || fields.some(f => f?.toLowerCase().includes(q));
  const shownPackages = packages.filter(p => (category === 'All' || category === PACKAGES) && match(p.name, p.description, ...p.tests.map(t => t.name)));
  const shownTests = tests.filter(t => (category === 'All' || category === t.category) && match(t.name, t.category, t.test_code, t.description));
  const hasDemo = tests.some(t => t.is_demo) || packages.some(p => p.is_demo);

  return (
    <>
      <PageHero
        crumbs={[{ label: 'Pathology lab', to: '/pathology-lab' }, { label: 'Book lab tests' }]}
        eyebrow="Pathology lab"
        title="Book lab tests"
        description="Tests and health packages — no doctor appointment needed. Verified reports arrive in your account."
      />
      <Section size="md">
        {loading ? (
          <MedicalLoader label="Loading tests…" />
        ) : error ? (
          <Alert type="error" title="We couldn’t load the test list">
            {error}{' '}
            <button type="button" className="link cursor-pointer" onClick={reload}>Try again</button>
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-8 pb-20 lg:grid-cols-12 lg:pb-0">
            <div className="space-y-6 lg:col-span-8">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <label htmlFor="lab-search" className="sr-only">Search tests</label>
                <input
                  id="lab-search"
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search tests, e.g. thyroid, CBC, sugar"
                  className="field-control pl-11"
                />
              </div>
              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Filter by category">
                {categories.map(c => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      'shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                      category === c ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line bg-white text-ink-600 hover:border-brand-300'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {hasDemo && (
                <p className="flex items-start gap-2 rounded-2xl bg-warning-50 px-4 py-2.5 text-[13px] text-warning-700 ring-1 ring-inset ring-warning-200">
                  <strong className="font-semibold">Demo</strong> items are sample data — names and prices are not confirmed by the hospital.
                </p>
              )}

              {shownPackages.length > 0 && (
                <section aria-labelledby="pkg-heading" className="space-y-3">
                  <h2 id="pkg-heading" className="text-lg font-semibold tracking-tight text-ink-900">Health-checkup packages</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {shownPackages.map(p => (
                      <ItemCard
                        key={p.id}
                        icon={<Package className="h-5 w-5" />}
                        title={p.name}
                        demo={p.is_demo}
                        description={p.description}
                        meta={[`${p.tests.length} tests: ${p.tests.map(t => t.name).join(', ')}`]}
                        preparation={p.preparation}
                        price={p.price}
                        selected={has({ type: 'package', id: p.id })}
                        onToggle={() => toggle({ type: 'package', id: p.id })}
                      />
                    ))}
                  </div>
                </section>
              )}

              {category !== PACKAGES && (
                <section aria-labelledby="tests-heading" className="space-y-3">
                  <h2 id="tests-heading" className="text-lg font-semibold tracking-tight text-ink-900">Individual tests</h2>
                  {shownTests.length === 0 ? (
                    <EmptyState title="No tests match your search" description="Try a different word, or call the lab and we’ll help you find the right test." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {shownTests.map(t => (
                        <ItemCard
                          key={t.id}
                          icon={<FlaskConical className="h-5 w-5" />}
                          title={t.name}
                          demo={t.is_demo}
                          description={t.description}
                          meta={[
                            t.category,
                            t.specimen_type && `Sample: ${t.specimen_type}`,
                            t.turnaround_hours != null && `Report in about ${t.turnaround_hours} h`,
                          ]}
                          preparation={t.preparation}
                          price={t.price}
                          selected={has({ type: 'test', id: t.id })}
                          onToggle={() => toggle({ type: 'test', id: t.id })}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="hidden lg:col-span-4 lg:block" aria-label="Your lab cart">
              <div className="lg:sticky lg:top-28">
                <CartPanel preview={preview} onRemove={remove} />
              </div>
            </aside>

            {/* Phones: compact bar; the full cart is shown again at checkout. */}
            {cart.length > 0 && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-3 backdrop-blur max-md:bottom-[var(--tabbar-space)] lg:hidden">
                <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
                  <p className="text-sm">
                    <span className="font-semibold text-ink-900">{preview.lines.length} item{preview.lines.length === 1 ? '' : 's'}</span>
                    <span className="ml-2 tabular-nums text-ink-600">{formatPaise(preview.totalPaise)}</span>
                  </p>
                  <LinkButton to="/lab-tests/checkout" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Checkout
                  </LinkButton>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>
    </>
  );
};

const ItemCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  demo: boolean;
  description: string | null;
  meta: (string | false | null)[];
  preparation: string | null;
  price: number;
  selected: boolean;
  onToggle: () => void;
}> = ({ icon, title, demo, description, meta, preparation, price, selected, onToggle }) => (
  <div className={cn('flex flex-col rounded-3xl border bg-white p-5 transition-colors', selected ? 'border-brand-600 ring-1 ring-brand-600' : 'border-line')}>
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">{icon}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug text-ink-900">{title}</h3>
        {demo && <Badge size="sm" variant="warning" className="mt-1">Demo</Badge>}
      </div>
    </div>
    {description && <p className="mt-3 text-sm leading-relaxed text-ink-600">{description}</p>}
    <ul className="mt-3 space-y-1 text-[13px] text-ink-500">
      {meta.filter(Boolean).map(m => <li key={m as string}>{m}</li>)}
    </ul>
    {preparation && <p className="mt-3 rounded-xl bg-warning-50 px-3 py-2 text-[13px] text-warning-700 ring-1 ring-inset ring-warning-200">Preparation: {preparation}</p>}
    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
      <span className="text-lg font-bold tabular-nums text-ink-900">{formatPaise(Math.round(price * 100))}</span>
      <Button
        size="sm"
        variant={selected ? 'soft' : 'outline'}
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={`${selected ? 'Remove' : 'Add'} ${title}`}
        leftIcon={selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      >
        {selected ? 'Added' : 'Add'}
      </Button>
    </div>
  </div>
);

/** Itemised cart with package contents, skipped duplicates and conflicts. */
export const CartPanel: React.FC<{ preview: CartPreview; onRemove?: (e: CartEntry) => void; checkout?: boolean }> = ({ preview, onRemove, checkout = true }) => (
  <div className="rounded-3xl border border-line bg-white p-6 shadow-card">
    <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
      <ShoppingBag className="h-4 w-4 text-brand-600" aria-hidden="true" /> Your tests
    </h2>
    {preview.lines.length === 0 && preview.skipped.length === 0 ? (
      <p className="mt-4 text-sm text-ink-500">Add tests or a package to get started.</p>
    ) : (
      <ul className="mt-4 space-y-3 text-sm">
        {preview.lines.map(l => (
          <li key={`${l.entry.type}-${l.entry.id}`} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink-900">{l.name}</p>
              {l.entry.type === 'package' && <p className="text-[13px] text-ink-500">Includes {l.testNames.join(', ')}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="tabular-nums text-ink-700">{formatPaise(l.pricePaise)}</span>
              {onRemove && (
                <button type="button" onClick={() => onRemove(l.entry)} className="-my-2 -mr-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink-700" aria-label={`Remove ${l.name}`}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
        {preview.skipped.map(s => (
          <li key={s.name} className="text-[13px] text-ink-500">
            {s.name} is already in {s.packageName}, so it isn’t charged separately.
          </li>
        ))}
      </ul>
    )}
    {preview.conflicts.map(c => (
      <Alert key={c} type="warning" className="mt-3 text-[13px]">{c}</Alert>
    ))}
    <div className="mt-5 flex justify-between border-t border-line pt-4 text-sm">
      <span className="font-semibold text-ink-900">Total</span>
      <span className="font-bold tabular-nums text-ink-900">{formatPaise(preview.totalPaise)}</span>
    </div>
    <p className="mt-1 text-xs text-ink-500">Final price is confirmed by the hospital system when you place the order.</p>
    {checkout && (
      <LinkButton
        to="/lab-tests/checkout"
        size="lg"
        className={cn('mt-5 w-full', (preview.lines.length === 0 || preview.conflicts.length > 0) && 'pointer-events-none opacity-55')}
        aria-disabled={preview.lines.length === 0 || preview.conflicts.length > 0}
        rightIcon={<ArrowRight className="h-4 w-4" />}
      >
        Continue to checkout
      </LinkButton>
    )}
  </div>
);
