import React, { useState } from 'react';
import { User, Phone, MapPin, Heart, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { isValidIndianPhone } from '../../lib/tokens';

export const PatientProfilePage: React.FC = () => {
  const { patientProfile, user } = useAuth();

  const [phone, setPhone] = useState(patientProfile?.phone || '');
  const [address, setAddress] = useState(patientProfile?.address || '');
  const [emergencyContact, setEmergencyContact] = useState(patientProfile?.emergencyContact || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!isValidIndianPhone(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
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

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
          Patient Demographic Profile
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Immutable hospital identification and manageable contact preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#3DA9DF]" />
              <h2 className="text-sm font-bold text-[#243447]">Official Hospital Identification</h2>
            </div>
            <Badge variant="lime-green" size="sm">
              Verified
            </Badge>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {saveSuccess && (
            <Alert type="success" title="Profile Updated">
              Your contact details have been successfully saved to your hospital profile.
            </Alert>
          )}

          {errorMsg && (
            <Alert type="error" title="Validation Notice">
              {errorMsg}
            </Alert>
          )}

          {/* Immutable Fields Notice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E1E8ED] text-xs">
            <div>
              <span className="text-[#667085] block mb-0.5">Hospital Patient ID (Immutable):</span>
              <strong className="text-sm font-mono text-[#3DA9DF]">{patientProfile?.patientId}</strong>
            </div>
            <div>
              <span className="text-[#667085] block mb-0.5">Registered Full Name:</span>
              <strong className="text-sm text-[#243447]">{patientProfile?.fullName}</strong>
            </div>
            <div>
              <span className="text-[#667085] block mb-0.5">Gender / Age:</span>
              <strong className="text-xs capitalize text-[#243447]">
                {patientProfile?.gender} {patientProfile?.age ? `(${patientProfile.age} yrs)` : ''}
              </strong>
            </div>
            <div>
              <span className="text-[#667085] block mb-0.5">Blood Group:</span>
              <strong className="text-xs text-[#243447]">{patientProfile?.bloodGroup || 'Not Recorded'}</strong>
            </div>
          </div>

          <p className="text-[11px] text-[#667085] italic">
            * Note: To protect medical record integrity, changes to your legal name or date of birth require physical verification of government ID at reception.
          </p>

          {/* Editable Contact Fields Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-[#243447] uppercase tracking-wider">
              Manageable Contact Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#243447] mb-1">
                Primary Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#243447] mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 24/B Tagore Town, Prayagraj, UP"
                className="w-full px-3.5 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#243447] mb-1">
                Emergency Contact Name &amp; Phone
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Spouse / Relative Name &amp; Contact"
                className="w-full px-3.5 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF]"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" size="sm">
                Save Contact Updates
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
