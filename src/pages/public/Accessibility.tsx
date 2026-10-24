import React from 'react';
import { Eye, CheckCircle2, ShieldCheck } from 'lucide-react';
import { PageHero, Section } from '../../components/site/Section';

export const Accessibility: React.FC = () => {
  return (
    <>
      <PageHero
        crumbs={[{ label: 'Digital Accessibility Statement' }]}
        eyebrow={'Universal Healthcare Access'}
        title={<>Digital Accessibility Statement</>}
        description={<>WCAG 2.1 Level AA Conformance Target &bull; Satya Hospital</>}
      />
      <Section size="md">
        <div className="mx-auto max-w-3xl space-y-8">

      <div className="legal-prose">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">Our Commitment to Digital Accessibility</h2>
          <p>
            Satya Hospital is committed to ensuring that our digital portal is accessible to all individuals, including patients with visual, auditory, cognitive, or motor impairments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-ink-900">Standards &amp; Measures Implemented</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-ink-50/60 rounded-xl border border-line flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-leaf-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink-900">Accessible Color Contrast</strong>
                All brand buttons and status badges strictly comply with contrast standards. Dark navy text (#243447) is used over light green to prevent low-contrast white text.
              </div>
            </div>

            <div className="p-3 bg-ink-50/60 rounded-xl border border-line flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-leaf-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink-900">Keyboard Operability</strong>
                All forms, modals, tabs, and navigation links feature visible focus rings and can be operated solely using keyboard navigation (Tab, Enter, Escape).
              </div>
            </div>

            <div className="p-3 bg-ink-50/60 rounded-xl border border-line flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-leaf-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink-900">Screen Reader Semantic Tags</strong>
                Standard HTML5 landmarks (`header`, `main`, `nav`, `footer`, `dialog`) and ARIA labels are utilized throughout the portal.
              </div>
            </div>

            <div className="p-3 bg-ink-50/60 rounded-xl border border-line flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-leaf-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-ink-900">Reduced Motion Support</strong>
                Our CSS respect OS-level `prefers-reduced-motion` settings, disabling unnecessary animations for sensitive patients.
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">Feedback &amp; Accessibility Assistance</h2>
          <p>
            If you encounter any difficulty accessing information on our website or patient portal, please notify our reception team at <span className="font-semibold">+91 532 2900000</span> or email us at <span className="font-semibold">contact@satyahospital.com</span>. We will gladly assist you.
          </p>
        </section>
      </div>
        </div>
      </Section>
    </>
  );
};
