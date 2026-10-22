import React from 'react';
import { Eye, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/common/Card';

export const Accessibility: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Eye className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Universal Healthcare Access</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#243447]">
          Digital Accessibility Statement
        </h1>
        <p className="text-xs text-[#667085]">
          WCAG 2.1 Level AA Conformance Target &bull; Satya Hospital
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 text-xs text-[#243447] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">Our Commitment to Digital Accessibility</h2>
          <p>
            Satya Hospital is committed to ensuring that our digital portal is accessible to all individuals, including patients with visual, auditory, cognitive, or motor impairments.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-[#243447]">Standards &amp; Measures Implemented</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#243447]">Accessible Color Contrast</strong>
                All brand buttons and status badges strictly comply with contrast standards. Dark navy text (#243447) is used over light green to prevent low-contrast white text.
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#243447]">Keyboard Operability</strong>
                All forms, modals, tabs, and navigation links feature visible focus rings and can be operated solely using keyboard navigation (Tab, Enter, Escape).
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#243447]">Screen Reader Semantic Tags</strong>
                Standard HTML5 landmarks (`header`, `main`, `nav`, `footer`, `dialog`) and ARIA labels are utilized throughout the portal.
              </div>
            </div>

            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E1E8ED] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
              <div>
                <strong className="block text-[#243447]">Reduced Motion Support</strong>
                Our CSS respect OS-level `prefers-reduced-motion` settings, disabling unnecessary animations for sensitive patients.
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">Feedback &amp; Accessibility Assistance</h2>
          <p>
            If you encounter any difficulty accessing information on our website or patient portal, please notify our reception team at <span className="font-semibold">+91 532 2900000</span> or email us at <span className="font-semibold">contact@satyahospital.com</span>. We will gladly assist you.
          </p>
        </section>
      </Card>
    </div>
  );
};
