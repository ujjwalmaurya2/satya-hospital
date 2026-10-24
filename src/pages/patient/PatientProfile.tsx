import React, { useState } from 'react';
import { BadgeCheck, Lock, Save } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Avatar, PageHeader, Panel } from '../../components/dashboard/Dashboard';
import { useAuth } from '../../context/AuthContext';
import { isValidIndianPhone } from '../../lib/tokens';

export const PatientProfilePage: React.FC = () => {
  const { patientProfile } = useAuth();

  const [phone, setPhone] = useState(patientProfile?.phone || '');
  const [address, setAddress] = useState(patientProfile?.address || '');
  const [emergencyContact, setEmergencyContact] = useState(patientProfile?.emergencyContact || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isValidIndianPhone(phone)) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (patientProfile) {
      patientProfile.phone = phone.trim();
      patientProfile.address = address.trim();
      patientProfile.emergencyContact = emergencyContact.trim();
      patientProfile.updatedAt = new Date().toISOString();
      localStorage.setItem('satya_auth_patient', JSON.stringify(patientProfile));
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const facts: [string, React.ReactNode][] = [
    ['Patient ID', <span className="font-mono text-brand-700">{patientProfile?.patientId}</span>],
    ['Full name', patientProfile?.fullName],
    ['Sex · age', <span className="capitalize">{[patientProfile?.gender, patientProfile?.age ? `${patientProfile.age} yrs` : null].filter(Boolean).join(' · ')}</span>],
    ['Blood group', patientProfile?.bloodGroup || 'Not recorded'],
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Profile" description="Your hospital identity and contact details." />

      <Panel>
        <div className="flex items-center gap-4">
          <Avatar name={patientProfile?.fullName || 'Patient'} className="h-14 w-14 text-base" />
          <div>
            <p className="text-lg font-semibold text-ink-900">{patientProfile?.fullName}</p>
            <p className="inline-flex items-center gap-1.5 text-[13px] text-leaf-700">
              <BadgeCheck className="h-4 w-4" aria-hidden="true" /> Verified hospital record
            </p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3.5">
              <dt className="text-[13px] text-ink-500">{k}</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-start gap-2 text-[13px] text-ink-500">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
          To protect record integrity, changes to your name or date of birth need ID verification at reception.
        </p>
      </Panel>

      <Panel title="Contact details" description="Keep these up to date so the hospital can reach you.">
        <form onSubmit={handleSave} className="space-y-5">
          {saveSuccess && <Alert type="success">Your contact details have been saved.</Alert>}
          {errorMsg && <Alert type="error">{errorMsg}</Alert>}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-phone" className="field-label">Mobile number</label>
              <input
                id="pf-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="field-control"
                required
              />
            </div>
            <div>
              <label htmlFor="pf-emergency" className="field-label">Emergency contact</label>
              <input id="pf-emergency" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} placeholder="Name and phone" className="field-control" />
            </div>
          </div>
          <div>
            <label htmlFor="pf-address" className="field-label">Address</label>
            <input id="pf-address" autoComplete="street-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 24/B Tagore Town, Prayagraj" className="field-control" />
          </div>
          <Button type="submit" leftIcon={<Save className="h-4 w-4" />}>
            Save changes
          </Button>
        </form>
      </Panel>
    </div>
  );
};
