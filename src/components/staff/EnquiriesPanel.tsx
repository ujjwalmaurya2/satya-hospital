import React, { useCallback, useEffect, useState } from 'react';
import { Phone, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Alert } from '../common/Alert';
import { Table } from '../common/Table';
import { EnquiryRecord, EnquiryStatus, supabaseService } from '../../services/supabaseService';

const ENQUIRY_BADGE: Record<EnquiryStatus, { label: string; variant: 'warning' | 'medical-blue' | 'neutral' }> = {
  new: { label: 'New', variant: 'warning' },
  contacted: { label: 'Contacted', variant: 'medical-blue' },
  closed: { label: 'Closed', variant: 'neutral' },
};

/** Contact-page enquiries for reception (moved unchanged from the old Records page). */
export const EnquiriesPanel: React.FC<{ onCount?: (newCount: number) => void }> = ({ onCount }) => {
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [enquirySource, setEnquirySource] = useState<'supabase' | 'local'>('supabase');
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);
  const [enquiriesError, setEnquiriesError] = useState<string | null>(null);
  const [enquiryBusyId, setEnquiryBusyId] = useState<string | null>(null);

  const loadEnquiries = useCallback(async () => {
    setEnquiriesLoading(true);
    setEnquiriesError(null);
    const res = await supabaseService.listEnquiries();
    setEnquiries(res.enquiries);
    setEnquirySource(res.source);
    setEnquiriesError(res.error || null);
    setEnquiriesLoading(false);
  }, []);

  useEffect(() => {
    void loadEnquiries();
  }, [loadEnquiries]);

  useEffect(() => onCount?.(enquiries.filter(e => e.status === 'new').length), [enquiries, onCount]);

  const setEnquiryStatus = async (id: string, status: EnquiryStatus) => {
    setEnquiryBusyId(id);
    setEnquiriesError(null);
    const res = await supabaseService.updateEnquiryStatus(id, status);
    setEnquiryBusyId(null);
    if (!res.success) return setEnquiriesError(res.error || 'Could not update the enquiry.');
    setEnquiries(list => list.map(e => (e.id === id ? { ...e, status } : e)));
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-6">
        <p className="text-[13px] text-ink-500">Messages sent from the public Contact page, newest first.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void loadEnquiries()}
          isLoading={enquiriesLoading}
          loadingText="Refreshing…"
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>
      {(enquiriesError || enquirySource === 'local') && (
        <div className="space-y-3 border-b border-line p-4 sm:px-6">
          {enquiriesError && (
            <Alert
              type="error"
              title="Enquiries not updated"
              action={
                <Button variant="outline" size="sm" onClick={() => void loadEnquiries()}>
                  Try again
                </Button>
              }
            >
              {enquiriesError}
            </Alert>
          )}
          {enquirySource === 'local' && (
            <Alert type="warning" title="Local demo mode">
              Supabase is not configured, so only enquiries typed in this browser are listed. Visitors are told to call reception instead.
            </Alert>
          )}
        </div>
      )}
      <Table
        caption="Contact enquiries"
        data={enquiries}
        keyExtractor={item => item.id}
        emptyMessage={enquiriesLoading ? 'Loading enquiries…' : 'No enquiries yet'}
        emptyHint="New messages from the Contact page will appear here."
        columns={[
          {
            header: 'From',
            cell: item => (
              <div>
                <p className="font-semibold text-ink-900">{item.name}</p>
                <a href={`tel:+91${item.phone}`} className="inline-flex items-center gap-1 font-mono text-xs text-brand-700 hover:underline">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  +91 {item.phone}
                </a>
                {item.email && <p className="text-xs text-ink-500">{item.email}</p>}
              </div>
            ),
          },
          { header: 'Topic', cell: item => <span className="text-ink-700">{item.topic}</span> },
          { header: 'Message', cell: item => <p className="max-w-md whitespace-pre-line break-words text-ink-700">{item.message}</p> },
          {
            header: 'Received',
            cell: item => (
              <span className="whitespace-nowrap text-xs text-ink-500">
                {new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
              </span>
            ),
          },
          {
            header: 'Status',
            cell: item => (
              <Badge variant={ENQUIRY_BADGE[item.status].variant} size="sm" dot>
                {ENQUIRY_BADGE[item.status].label}
              </Badge>
            ),
          },
          {
            header: 'Actions',
            cell: item => (
              <div className="flex items-center gap-1.5">
                {item.status === 'new' && (
                  <Button variant="accent" size="sm" disabled={enquiryBusyId === item.id} onClick={() => void setEnquiryStatus(item.id, 'contacted')}>
                    Mark contacted
                  </Button>
                )}
                {item.status !== 'closed' ? (
                  <Button variant="ghost" size="sm" disabled={enquiryBusyId === item.id} onClick={() => void setEnquiryStatus(item.id, 'closed')}>
                    Close
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" disabled={enquiryBusyId === item.id} onClick={() => void setEnquiryStatus(item.id, 'new')}>
                    Reopen
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </>
  );
};
