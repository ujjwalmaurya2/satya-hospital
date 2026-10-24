import React from 'react';
import { CalendarX, AlertCircle, Clock } from 'lucide-react';
import { PageHero, Section } from '../../components/site/Section';
import { useHospital } from '../../context/HospitalContext';

export const CancellationPolicy: React.FC = () => {
  const { settings } = useHospital();

  return (
    <>
      <PageHero
        crumbs={[{ label: 'OPD Appointment & Cancellation Policy' }]}
        eyebrow={'Hospital Operational Rules'}
        title={<>OPD Appointment &amp; Cancellation Policy</>}
        description={<>Satya Hospital Outpatient Queue Rules &bull; Effective October 2026</>}
      />
      <Section size="md">
        <div className="mx-auto max-w-3xl space-y-8">

      <div className="legal-prose">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">1. Purpose of the Daily Queue Policy</h2>
          <p>
            Satya Hospital operates an integrated, shared sequential daily token queue across both online reservations and physical walk-in patients with no fixed ceiling on daily registrations. To ensure orderly clinic consultations and minimize waiting times, timely cancellations allow our clinical desks to manage consultation workflows efficiently.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">2. Same-Day Online Cutoff &amp; Rescheduling</h2>
          <p>
            Patients can reschedule or cancel their online booked token via their Patient Portal prior to <strong>{settings.onlineCutoffTime} AM IST</strong> on the appointment date without penalty.
          </p>
          <p>
            After {settings.onlineCutoffTime} AM, the OPD operational roster for the morning is locked and synchronized with doctor consulting rooms. Any late changes must be communicated to the reception desk via phone ({settings.phone}).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">3. Missed Appointments (No-Shows)</h2>
          <p>
            If a patient fails to check in at reception before the conclusion of morning clinic hours (01:30 PM), the token will be marked as <code className="text-brand-700">no_show</code>. 
          </p>
          <p>
            Satya Hospital does <strong>NOT</strong> levy automatic monetary penalties or blacklisting on patient profiles for missed appointments. However, patients are respectfully encouraged to cancel in advance to open slots for other waiting patients.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">4. Walk-In Patient Priority</h2>
          <p>
            Patients arriving as walk-ins after the 09:00 AM online cutoff are assigned sequential walk-in tokens by reception staff subject to remaining daily capacity.
          </p>
        </section>
      </div>
        </div>
      </Section>
    </>
  );
};
