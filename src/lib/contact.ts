/**
 * Display helpers for hospital contact settings. Settings values may carry an
 * editorial annotation such as "[Hospital Landline Placeholder]" until the
 * hospital supplies verified details; the annotation is stripped for display
 * and surfaced through `isPlaceholder` so the UI never fabricates certainty.
 */
const ANNOTATION = /\s*\[[^\]]*\]\s*/g;

export function cleanSettingText(value: string | undefined | null): string {
  return (value || '').replace(ANNOTATION, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function isPlaceholder(value: string | undefined | null): boolean {
  return /placeholder/i.test(value || '');
}

export function phoneDisplay(value: string | undefined | null): string {
  return cleanSettingText(value);
}

/** tel: href with digits and a leading + only. */
export function phoneHref(value: string | undefined | null): string {
  const digits = cleanSettingText(value).replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}
