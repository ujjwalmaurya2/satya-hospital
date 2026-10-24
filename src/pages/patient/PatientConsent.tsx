import React, { useState } from 'react';
import { CheckCircle2, Send, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { PageHeader, Panel } from '../../components/dashboard/Dashboard';
import { useAuth } from '../../context/AuthContext';
import { auditLogger } from '../../lib/audit';

const consents = [
  {
    title: 'Outpatient examination and treatment',
    text: 'Consent to outpatient examination and prescriptions at Satya Hospital.',
    status: 'Active',
  },
  {
    title: 'Digital health records',
    text: 'Consent to store lab reports and scanned prescriptions securely and deliver them through this portal.',
    status: 'Active',
  },
  {
    title: 'No marketing use',
    text: 'Satya Hospital does not share patient records with advertisers or commercial third parties.',
    status: 'Protected',
  },
];

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
      <PageHeader title="Privacy & consent" description="Your data rights under India’s Digital Personal Data Protection Act, 2023." />

      <Panel
        flush
        title={
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-leaf-600" aria-hidden="true" /> Your consents
          </span>
        }
      >
        <ul className="divide-y divide-line">
          {consents.map(c => (
            <li key={c.title} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf-600" aria-hidden="true" />
                <div>
                  <p className="font-medium text-ink-900">{c.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-500">{c.text}</p>
                </div>
              </div>
              <Badge variant={c.status === 'Active' ? 'lime-green' : 'neutral'} size="sm">
                {c.status}
              </Badge>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Make a privacy or records request" description="Requests go to the hospital’s grievance and medical records officer.">
        {requestSubmitted ? (
          <Alert type="success" title="Request recorded">
            Your request has been logged for the grievance and medical records officer, who will respond within the statutory timelines.
          </Alert>
        ) : (
          <form onSubmit={handleDataRequest} className="space-y-5">
            <div>
              <label htmlFor="dp-type" className="field-label">Request type</label>
              <select id="dp-type" value={requestType} onChange={e => setRequestType(e.target.value)} className="field-control">
                <option value="data_export">A copy of my medical record summary</option>
                <option value="correction">Correct a wrong detail</option>
                <option value="nomination">Nominate a legal health representative</option>
                <option value="grievance">Raise a privacy grievance</option>
              </select>
            </div>
            <div>
              <label htmlFor="dp-details" className="field-label">Details</label>
              <textarea
                id="dp-details"
                rows={4}
                value={requestDetails}
                onChange={e => setRequestDetails(e.target.value)}
                placeholder="Which record, or what should change?"
                className="field-control resize-y"
                required
              />
            </div>
            <Button type="submit" leftIcon={<Send className="h-4 w-4" />}>
              Submit request
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
};
