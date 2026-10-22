import React from 'react';
import { CalendarX, AlertCircle, Clock } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useHospital } from '../../context/HospitalContext';

export const CancellationPolicy: React.FC = () => {
  const { settings } = useHospital();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <CalendarX className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Hospital Operational Rules</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#243447]">
          OPD Appointment &amp; Cancellation Policy
        </h1>
        <p className="text-xs text-[#667085]">
          Satya Hospital Outpatient Queue Rules &bull; Effective October 2026
        </p>
      </div>

      <Card className="p-6 sm:p-8 space-y-6 text-xs text-[#243447] leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">1. Purpose of the Daily Queue Policy</h2>
          <p>
            Satya Hospital operates an integrated, shared sequential daily token queue across both online reservations and physical walk-in patients with no fixed ceiling on daily registrations. To ensure orderly clinic consultations and minimize waiting times, timely cancellations allow our clinical desks to manage consultation workflows efficiently.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">2. Same-Day Online Cutoff &amp; Rescheduling</h2>
          <p>
            Patients can reschedule or cancel their online booked token via their Patient Portal prior to <strong>{settings.onlineCutoffTime} AM IST</strong> on the appointment date without penalty.
          </p>
          <p>
            After {settings.onlineCutoffTime} AM, the OPD operational roster for the morning is locked and synchronized with doctor consulting rooms. Any late changes must be communicated to the reception desk via phone ({settings.phone}).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">3. Missed Appointments (No-Shows)</h2>
          <p>
            If a patient fails to check in at reception before the conclusion of morning clinic hours (01:30 PM), the token will be marked as <code className="text-[#3DA9DF]">no_show</code>. 
          </p>
          <p>
            Satya Hospital does <strong>NOT</strong> levy automatic monetary penalties or blacklisting on patient profiles for missed appointments. However, patients are respectfully encouraged to cancel in advance to open slots for other waiting patients.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#243447]">4. Walk-In Patient Priority</h2>
          <p>
            Patients arriving as walk-ins after the 09:00 AM online cutoff are assigned sequential walk-in tokens by reception staff subject to remaining daily capacity.
          </p>
        </section>
      </Card>
    </div>
  );
};
