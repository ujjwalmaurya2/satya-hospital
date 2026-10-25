import React, { useCallback, useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Alert } from '../../components/common/Alert';
import { LinkButton } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { MedicalLoader } from '../../components/common/MedicalLoader';
import { PageHeader } from '../../components/dashboard/Dashboard';
import { LabOrderCard } from '../../components/lab/LabOrderCard';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { LabOrder, labService } from '../../services/labService';

export const PatientLabOrders: React.FC = () => {
  const { isLiveSession } = useAuth();
  const { settings } = useHospital();
  const [orders, setOrders] = useState<LabOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    labService.myOrders().then(setOrders).catch(e => setError(e instanceof Error ? e.message : 'Could not load your orders.'));
  }, []);
  useEffect(() => {
    if (isLiveSession) load();
  }, [isLiveSession, load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My pathology orders"
        description="Lab tests you booked, their payment and sample status, and released reports."
        actions={<LinkButton to="/lab-tests" size="sm" leftIcon={<FlaskConical className="h-4 w-4" />}>Book lab tests</LinkButton>}
      />
      {!isLiveSession ? (
        <Alert type="info">Sign in with Google to see your lab orders.</Alert>
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : orders === null ? (
        <MedicalLoader label="Loading your orders…" />
      ) : orders.length === 0 ? (
        <EmptyState title="No lab orders yet" description="Book individual tests or a health-checkup package online." actionLabel="Book lab tests" actionLink="/lab-tests" />
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <LabOrderCard key={o.id} order={o} receptionPhone={settings.phone} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
};
