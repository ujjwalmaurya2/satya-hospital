import React, { useState } from 'react';
import { Microscope, Download, ShieldCheck, AlertCircle, FileCheck, Search } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { getAuthorizedSignedDocumentUrl } from '../../lib/storage';

export const PatientReports: React.FC = () => {
  const { patientProfile } = useAuth();
  const { pathologyReports } = useHospital();
  const [searchQuery, setSearchQuery] = useState('');

  // Show only reports linked to this patient
  const myReports = pathologyReports.filter(
    r => r.patientProfileId === patientProfile?.id || r.patientId === patientProfile?.patientId
  );

  const filteredReports = myReports.filter(
    r => r.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
         r.labAccessionNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = (storageKey: string, testName: string) => {
    const res = getAuthorizedSignedDocumentUrl(
      storageKey, 
      'patient', 
      patientProfile?.patientId, 
      patientProfile?.patientId
    );
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      alert(res.error || 'Unable to open pathology report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#193247]">
            Diagnostic Pathology Reports
          </h1>
          <p className="text-xs text-[#647785] mt-0.5">
            Certified laboratory reports verified by Satya Hospital pathologists.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#647785] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search test or accession..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-teal-100 text-xs bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#168C8C]"
          />
        </div>
      </div>

      {/* Clinical Disclaimer */}
      <div className="bg-[#DFF3FA]/50 border border-teal-200/60 p-4 rounded-2xl text-xs text-[#193247] flex items-start gap-2.5 shadow-xs">
        <AlertCircle className="w-4 h-4 text-[#168C8C] shrink-0 mt-0.5" />
        <div>
          <strong className="block mb-0.5 text-[#193247]">Clinical Review Notice:</strong>
          Diagnostic laboratory values should always be interpreted by your consulting physician in conjunction with clinical symptoms. Self-interpreting reference values without clinical context is not advised.
        </div>
      </div>

      <Card className="rounded-2xl border-teal-100 shadow-xs">
        <CardBody className="p-0 divide-y divide-slate-100">
          {filteredReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#647785]">
              No matching diagnostic reports found for your account.
            </div>
          ) : (
            filteredReports.map((report) => {
              const isPublished = report.status === 'published';
              const isSuperseded = report.status === 'superseded';

              return (
                <div key={report.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#FCFDFB] transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={isPublished ? 'teal' : isSuperseded ? 'warning' : 'neutral'} size="sm" dot>
                        {report.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-sm font-bold text-[#193247]">
                        {report.testName}
                      </span>
                      {report.versionNumber > 1 && (
                        <Badge variant="neutral" size="sm">
                          Version {report.versionNumber}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-[#647785] flex flex-wrap items-center gap-2">
                      <span>Lab Accession: <strong className="text-[#193247]">{report.labAccessionNumber}</strong></span>
                      <span>&bull; Date: {report.reportDate}</span>
                      {report.verifierName && (
                        <span>&bull; Certified By: <strong className="text-[#193247]">{report.verifierName}</strong></span>
                      )}
                    </div>

                    {report.correctionReason && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                        Correction Note: {report.correctionReason}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isPublished ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(report.storageKey, report.testName)}
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                      >
                        Download PDF
                      </Button>
                    ) : (
                      <span className="text-xs text-[#647785] italic">
                        Under Laboratory Verification
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
};
