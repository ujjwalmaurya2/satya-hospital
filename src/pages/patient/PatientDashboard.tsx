import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  FileText, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  PlusCircle, 
  AlertCircle,
  Download,
  Stethoscope,
  Microscope,
  ShieldCheck
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useHospital } from '../../context/HospitalContext';
import { getAuthorizedSignedDocumentUrl } from '../../lib/storage';

export const PatientDashboard: React.FC = () => {
  const { user, patientProfile } = useAuth();
  const { appointments, pathologyReports, medicalDocuments } = useHospital();

  // Filter records belonging exclusively to this authenticated patient
  const myAppointments = appointments.filter(
    a => a.patientProfileId === patientProfile?.id || a.patientId === patientProfile?.patientId
  );

  const myReports = pathologyReports.filter(
    r => (r.patientProfileId === patientProfile?.id || r.patientId === patientProfile?.patientId) && r.status === 'published'
  );

  const myPrescriptions = medicalDocuments.filter(
    d => d.patientProfileId === patientProfile?.id && d.verificationStatus === 'verified'
  );

  const upcomingAppointments = myAppointments.filter(
    a => a.status === 'booked' || a.status === 'checked_in' || a.status === 'in_consultation'
  );

  const handleDownload = (storageKey: string, title: string) => {
    const res = getAuthorizedSignedDocumentUrl(storageKey, 'patient', patientProfile?.patientId, patientProfile?.patientId);
    if (res.success && res.url) {
      window.open(res.url, '_blank');
    } else {
      alert(res.error || 'Unable to open medical document.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Patient Welcome Banner */}
      <div className="bg-gradient-to-r from-[#193247] via-[#3DA9DF]/90 to-[#3DA9DF] text-white rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#EBF6FC] text-xs font-semibold backdrop-blur-xs border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-[#91BB40]" />
              <span>Verified Pediatric & Family Health Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Welcome, {patientProfile?.fullName || user?.fullName}
            </h1>
            <p className="text-xs text-sky-100">
              Hospital Patient ID: <strong className="text-white text-sm bg-white/20 px-2.5 py-0.5 rounded-lg font-mono">{patientProfile?.patientId}</strong>
              {patientProfile?.phone && (
                <span className="ml-3 text-sky-100">&bull; Phone: +91 {patientProfile.phone}</span>
              )}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link to="/book-appointment">
              <Button variant="accent" size="md" leftIcon={<PlusCircle className="w-4 h-4 text-white" />}>
                Book OPD Token
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-sky-100/80 bg-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#647785] font-medium">Upcoming OPD Visits</span>
            <div className="w-9 h-9 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#193247] mt-2">
            {upcomingAppointments.length}
          </div>
          <span className="text-[11px] text-[#3DA9DF] font-semibold mt-1 block">
            {upcomingAppointments.length > 0 ? `Token #${upcomingAppointments[0].tokenNumber} active` : 'No visits scheduled today'}
          </span>
        </Card>

        <Card className="p-5 border-lime-100/80 bg-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#647785] font-medium">Pathology Reports</span>
            <div className="w-9 h-9 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center">
              <Microscope className="w-4 h-4 text-[#91BB40]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#193247] mt-2">
            {myReports.length}
          </div>
          <span className="text-[11px] text-[#486812] font-semibold mt-1 block">
            Verified &amp; Published PDFs
          </span>
        </Card>

        <Card className="p-5 border-sky-100/80 bg-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#647785] font-medium">Verified Prescriptions</span>
            <div className="w-9 h-9 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-[#3DA9DF]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#193247] mt-2">
            {myPrescriptions.length}
          </div>
          <span className="text-[11px] text-[#647785] font-medium mt-1 block">
            Scanned Doctor Rx Files
          </span>
        </Card>
      </div>

      {/* Main Grid: Active Appointments & Recent Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Appointments (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="rounded-2xl border-sky-100 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-base font-bold text-[#193247] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#3DA9DF]" />
                  <span>My Outpatient Appointments</span>
                </h2>
                <Link to="/patient/appointments" className="text-xs font-semibold text-[#3DA9DF] hover:underline">
                  View All ({myAppointments.length})
                </Link>
              </div>
            </CardHeader>

            <CardBody className="p-0 divide-y divide-slate-100">
              {myAppointments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#647785]">
                  No appointment records found. Book an OPD slot to receive your daily token.
                </div>
              ) : (
                myAppointments.slice(0, 3).map((apt) => (
                  <div key={apt.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#FCFDFB] transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={apt.status === 'completed' ? 'success' : apt.status === 'in_consultation' ? 'medical-blue' : 'warning'} size="sm" dot>
                          {apt.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs font-bold text-[#193247]">
                          Token #{apt.tokenNumber}
                        </span>
                        <span className="text-[11px] text-[#647785]">
                          ({apt.appointmentCode})
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#193247]">
                        Date: {apt.appointmentDate} &bull; Doctor: {apt.doctorName}
                      </div>
                      {apt.notes && (
                        <p className="text-[11px] text-[#647785] italic">Reason: {apt.notes}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <Badge variant="neutral" size="sm">
                        {apt.queueType === 'online' ? 'Online Booking' : 'Walk-in'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Verified Prescriptions Card */}
          <Card className="rounded-2xl border-sky-100 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-base font-bold text-[#193247] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#3DA9DF]" />
                  <span>Doctor Handwritten Prescriptions</span>
                </h2>
                <Link to="/patient/prescriptions" className="text-xs font-semibold text-[#3DA9DF] hover:underline">
                  View All ({myPrescriptions.length})
                </Link>
              </div>
            </CardHeader>

            <CardBody className="p-0 divide-y divide-slate-100">
              {myPrescriptions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#647785]">
                  No scanned prescriptions uploaded yet. Doctor written prescriptions will appear here once verified.
                </div>
              ) : (
                myPrescriptions.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-[#FCFDFB]">
                    <div>
                      <h4 className="text-xs font-bold text-[#193247]">{doc.title}</h4>
                      <span className="text-[11px] text-[#647785] block mt-0.5">
                        Verified by: {doc.verifiedBy} &bull; {new Date(doc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.storageKey, doc.title)}
                      leftIcon={<Download className="w-3.5 h-3.5 text-[#3DA9DF]" />}
                    >
                      View Rx PDF
                    </Button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Pathology Reports (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-2xl border-lime-100 shadow-xs">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <h2 className="text-base font-bold text-[#193247] flex items-center gap-2">
                  <Microscope className="w-4 h-4 text-[#91BB40]" />
                  <span>Published Lab Reports</span>
                </h2>
                <Link to="/patient/reports" className="text-xs font-semibold text-[#3DA9DF] hover:underline">
                  All Reports ({myReports.length})
                </Link>
              </div>
            </CardHeader>

            <CardBody className="p-0 divide-y divide-slate-100">
              {myReports.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#647785]">
                  No published reports available. Unverified laboratory files are safeguarded until signed off by the pathologist.
                </div>
              ) : (
                myReports.map((rep) => (
                  <div key={rep.id} className="p-4 space-y-2 hover:bg-[#FCFDFB] transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#193247]">{rep.testName}</h4>
                        <span className="text-[11px] text-[#647785]">
                          Accession: {rep.labAccessionNumber} &bull; {rep.reportDate}
                        </span>
                      </div>
                      <Badge variant="lime-green" size="sm">
                        Verified &amp; Published
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#647785]">
                      <span>Sign-off: {rep.verifierName || 'Pathologist'}</span>
                      <button
                        onClick={() => handleDownload(rep.storageKey, rep.testName)}
                        className="font-semibold text-[#3DA9DF] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Signed PDF</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* DPDP Compliance Card */}
          <div className="bg-[#F3F8EC]/80 border border-[#D5E8BA] p-4 rounded-2xl text-xs text-[#193247] space-y-2 shadow-xs">
            <div className="font-semibold text-[#193247] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#91BB40]" />
              <span>Medical Document Confidentiality</span>
            </div>
            <p className="text-[#647785] leading-relaxed">
              Downloads utilize authenticated short-lived signed URLs. Unverified draft lab results are strictly withheld until medical certification.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
