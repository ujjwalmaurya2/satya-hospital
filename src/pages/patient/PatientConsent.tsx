import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Lock, FileText, Send, AlertCircle } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { auditLogger } from '../../lib/audit';

export const PatientConsent: React.FC = () => {
  const { patientProfile, user } = useAuth();

  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestType, setRequestType] = useState('data_export');
  const [requestDetails, setRequestDetails] = useState('');

  const handleDataRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDetails.trim()) return;

    auditLogger.record({
      actorId: user?.id || patientProfile?.id || 'patient',
      actorName: patientProfile?.fullName || 'Patient',
      actorRole: 'patient',
      actionType: 'document.access',
      targetEntity: 'consent_records',
      targetId: patientProfile?.patientId || 'unknown',
      description: `Patient lodged statutory DPDP request: ${requestType}`,
      metadata: { requestType, requestDetails },
    });

    setRequestSubmitted(true);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
          Consent &amp; Privacy Management
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Your statutory data rights under the Digital Personal Data Protection Act (DPDP Act 2023).
        </p>
      </div>

      {/* Acknowledged Consents Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#91BB40]" />
            <h2 className="text-sm font-bold text-[#243447]">Active Consents &amp; Acknowledgements</h2>
          </div>
        </CardHeader>

        <CardBody className="space-y-4 text-xs divide-y divide-[#E1E8ED]">
          <div className="pt-2 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-[#243447]">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                <span>Outpatient Clinical Treatment &amp; Triage</span>
              </div>
              <p className="text-[#667085] mt-1 pl-6">
                Consent to undergo physical outpatient examination and physician prescription formulation at Satya Hospital.
              </p>
            </div>
            <Badge variant="lime-green" size="sm">
              Active Consent
            </Badge>
          </div>

          <div className="pt-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-[#243447]">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                <span>Digital Health Record Retention</span>
              </div>
              <p className="text-[#667085] mt-1 pl-6">
                Consent to store and deliver laboratory reports and scanned handwritten prescriptions securely via private cloud storage.
              </p>
            </div>
            <Badge variant="lime-green" size="sm">
              Active Consent
            </Badge>
          </div>

          <div className="pt-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-[#243447]">
                <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0" />
                <span>Zero Mandatory Marketing Opt-In</span>
              </div>
              <p className="text-[#667085] mt-1 pl-6">
                Satya Hospital does not share patient records with commercial third parties or advertisers.
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              Protected
            </Badge>
          </div>
        </CardBody>
      </Card>

      {/* DPDP Formal Request Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#3DA9DF]" />
            <h2 className="text-sm font-bold text-[#243447]">Lodge a Privacy or Record Request</h2>
          </div>
        </CardHeader>

        <CardBody>
          {requestSubmitted ? (
            <Alert type="success" title="Statutory Request Logged">
              Your request has been dispatched to the Satya Hospital Grievance &amp; Medical Records Officer. We will process it within statutory timelines.
            </Alert>
          ) : (
            <form onSubmit={handleDataRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Request Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs focus:ring-2 focus:ring-[#3DA9DF]"
                >
                  <option value="data_export">Request Full Medical Record Summary (Export)</option>
                  <option value="correction">Request Correction of Incorrect Demographic Field</option>
                  <option value="nomination">Nominate Legal Health Representative</option>
                  <option value="grievance">File a Data Privacy Grievance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Specific Details of Request <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                  placeholder="Specify the exact record or reason for your request..."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs focus:ring-2 focus:ring-[#3DA9DF]"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Submit Formal Request
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
