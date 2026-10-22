import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Search, 
  PlusCircle, 
  Upload, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Phone, 
  AlertCircle,
  Eye,
  X
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Table } from '../../components/common/Table';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { getHospitalTodayDate, isValidIndianPhone } from '../../lib/tokens';
import { uploadDocumentToSecureStorage } from '../../lib/storage';
import { Appointment, PatientProfile } from '../../types';

export const ReceptionDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    settings, 
    appointments, 
    doctors, 
    patientProfiles, 
    registerPatient, 
    registerWalkInAppointment, 
    updateAppointmentStatus,
    uploadMedicalDocument,
    getTodayQueueStats,
    searchPatients
  } = useHospital();

  const today = getHospitalTodayDate();
  const queueStats = getTodayQueueStats();

  // Search state
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'search' | 'upload'>('queue');

  // Walk-in Registration Modal
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInGender, setWalkInGender] = useState<'male' | 'female' | 'other'>('male');
  const [walkInAge, setWalkInAge] = useState('40');
  const [walkInDoctorId, setWalkInDoctorId] = useState(doctors[0]?.id || '');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Document Upload State
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [uploadDocTitle, setUploadDocTitle] = useState('Handwritten Prescription Scan');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Today's appointments list
  const todayAppointments = appointments.filter(
    a => a.appointmentDate === today
  ).sort((a, b) => a.tokenNumber - b.tokenNumber);

  // Handle Walk-in Registration
  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError(null);

    if (!walkInName.trim()) {
      setWalkInError('Patient name is required.');
      return;
    }
    if (!isValidIndianPhone(walkInPhone)) {
      setWalkInError('Valid 10-digit phone number is required.');
      return;
    }

    // Step 1: Register or find patient
    const regRes = registerPatient(
      {
        fullName: walkInName.trim(),
        phone: walkInPhone.trim(),
        gender: walkInGender,
        age: parseInt(walkInAge, 10) || undefined,
      },
      'reception'
    );

    if (!regRes.success || !regRes.patient) {
      setWalkInError(regRes.error || 'Failed to register patient profile.');
      return;
    }

    // Step 2: Allocate Walk-In Token
    const walkInRes = registerWalkInAppointment({
      patientProfileId: regRes.patient.id,
      doctorId: walkInDoctorId,
      notes: walkInNotes.trim(),
    });

    if (!walkInRes.success || !walkInRes.appointment) {
      setWalkInError(walkInRes.error || 'Failed to allocate walk-in token.');
      return;
    }

    // Reset and close
    setWalkInModalOpen(false);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInNotes('');
  };

  // Handle Rx Scan Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!uploadFile) {
      setUploadError('Please choose a scanned PDF or image document.');
      return;
    }

    const patient = patientProfiles.find(
      p => p.patientId.toLowerCase() === uploadPatientId.trim().toLowerCase()
    );
    if (!patient) {
      setUploadError(`No patient found matching Patient ID: "${uploadPatientId}".`);
      return;
    }

    setUploading(true);

    try {
      const uploadRes = await uploadDocumentToSecureStorage(uploadFile, 'prescriptions', patient.patientId);
      if (!uploadRes.success || !uploadRes.storageKey) {
        setUploadError(uploadRes.error || 'File upload failed.');
        setUploading(false);
        return;
      }

      uploadMedicalDocument({
        patientProfileId: patient.id,
        documentType: 'handwritten_prescription_scan',
        title: `${uploadDocTitle} - ${patient.fullName}`,
        fileName: uploadRes.fileName || uploadFile.name,
        fileSize: uploadRes.fileSize || uploadFile.size,
        mimeType: uploadRes.mimeType || uploadFile.type,
        storageKey: uploadRes.storageKey,
        uploaderId: user?.id || 'reception',
        uploaderName: user?.fullName || 'Reception Desk',
        uploaderRole: 'reception',
        verificationStatus: 'unverified', // Doctor must verify before publishing
        notes: `Uploaded at reception desk. Awaiting Doctor review.`,
      });

      setUploadSuccess(`Document safely uploaded for ${patient.fullName} (${patient.patientId}). It is now in the Doctor's verification queue.`);
      setUploadFile(null);
      setUploadPatientId('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown upload error.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const searchedPatients = searchPatients(patientSearchQuery);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#243447]">
            Reception &amp; OPD Admissions Desk
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Today's Date: <strong>{today}</strong> &bull; OPD Clinics Active: <strong>{settings.opdStartTime} AM</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="accent"
            size="md"
            onClick={() => setWalkInModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
            disabled={queueStats.isCapacityFull}
          >
            Register Walk-In Patient
          </Button>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Total Registered Today</span>
          <div className="text-2xl font-bold text-[#243447] mt-1">{queueStats.totalBooked}</div>
          <span className="text-[11px] text-[#3DA9DF] font-semibold block mt-0.5">
            {queueStats.onlineCount} Online &bull; {queueStats.walkInCount} Walk-in
          </span>
        </Card>

        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Waiting in Lounge</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{queueStats.waitingCount}</div>
          <span className="text-[11px] text-[#667085] block mt-0.5">Tokens Booked / Arrived</span>
        </Card>

        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Consultations Completed</span>
          <div className="text-2xl font-bold text-[#91BB40] mt-1">{queueStats.completedCount}</div>
          <span className="text-[11px] text-[#667085] block mt-0.5">Signed off by doctor</span>
        </Card>

        <Card className="p-4 border-[#CBD5E1]">
          <span className="text-xs text-[#667085] font-medium block">Daily Patient Intake</span>
          <div className="text-2xl font-bold text-[#243447] mt-1">
            {queueStats.remainingCapacity !== null ? queueStats.remainingCapacity : 'Open'}
          </div>
          <span className="text-[11px] text-[#667085] block mt-0.5">
            {settings.maxDailyCapacity ? `Cap: ${settings.maxDailyCapacity}` : 'Unlimited Daily Intake'}
          </span>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E1E8ED] pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            activeTab === 'queue' ? 'bg-[#3DA9DF] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          Today's OPD Queue ({todayAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            activeTab === 'search' ? 'bg-[#3DA9DF] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          Patient Directory &amp; History
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
            activeTab === 'upload' ? 'bg-[#3DA9DF] text-white' : 'text-[#667085] hover:bg-[#F8FAFC]'
          }`}
        >
          Upload Scanned Document / Rx
        </button>
      </div>

      {/* TAB 1: TODAY OPD QUEUE */}
      {activeTab === 'queue' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-base font-bold text-[#243447]">
                Live OPD Token Worklist &bull; {today}
              </h2>
              <span className="text-xs text-[#667085]">
                {settings.maxDailyCapacity 
                  ? `Shared Capacity: ${todayAppointments.length} / ${settings.maxDailyCapacity}`
                  : `Shared Queue: ${todayAppointments.length} Patients (Unlimited Intake)`}
              </span>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            <Table
              data={todayAppointments}
              keyExtractor={(item) => item.id}
              emptyMessage="No patients scheduled for today's OPD."
              columns={[
                {
                  header: 'Token #',
                  cell: (item) => (
                    <span className="px-2.5 py-1 rounded-md bg-[#243447] text-white font-mono font-bold text-xs">
                      #{item.tokenNumber}
                    </span>
                  ),
                },
                {
                  header: 'Patient Details',
                  cell: (item) => (
                    <div>
                      <div className="font-bold text-[#243447]">{item.patientName}</div>
                      <div className="text-[11px] text-[#667085] font-mono">
                        {item.patientId} &bull; +91 {item.patientPhone}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'Queue Type',
                  cell: (item) => (
                    <Badge variant={item.queueType === 'online' ? 'medical-blue' : 'neutral'} size="sm">
                      {item.queueType === 'online' ? 'Online' : 'Walk-In'}
                    </Badge>
                  ),
                },
                {
                  header: 'Consulting Doctor',
                  cell: (item) => (
                    <span className="text-xs font-semibold text-[#243447]">
                      {item.doctorName}
                    </span>
                  ),
                },
                {
                  header: 'Status',
                  cell: (item) => {
                    const variant = 
                      item.status === 'completed' ? 'success' :
                      item.status === 'in_consultation' ? 'medical-blue' :
                      item.status === 'checked_in' ? 'lime-green' :
                      item.status === 'cancelled' ? 'danger' : 'warning';

                    return (
                      <Badge variant={variant} size="sm" dot>
                        {item.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    );
                  },
                },
                {
                  header: 'Reception Actions',
                  cell: (item) => (
                    <div className="flex items-center gap-1.5">
                      {item.status === 'booked' && (
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => updateAppointmentStatus(item.id, 'checked_in', 'reception')}
                        >
                          Mark Arrival
                        </Button>
                      )}
                      {item.status === 'checked_in' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateAppointmentStatus(item.id, 'in_consultation', 'reception')}
                        >
                          Call to Room
                        </Button>
                      )}
                      {item.status !== 'completed' && item.status !== 'cancelled' && (
                        <button
                          onClick={() => updateAppointmentStatus(item.id, 'cancelled', 'reception', 'Cancelled at desk')}
                          className="text-[11px] text-red-600 hover:underline px-2 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
      )}

      {/* TAB 2: PATIENT DIRECTORY & SEARCH */}
      {activeTab === 'search' && (
        <Card className="space-y-4">
          <CardHeader>
            <div className="w-full space-y-3">
              <h2 className="text-base font-bold text-[#243447]">
                Authorised Patient Registry Search
              </h2>
              <div className="relative">
                <Search className="w-4 h-4 text-[#667085] absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by Patient ID (e.g. SH-2026-00001), Full Name, or Phone..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-[#CBD5E1] text-xs focus:ring-2 focus:ring-[#3DA9DF]"
                />
              </div>
            </div>
          </CardHeader>

          <CardBody className="p-0">
            <Table
              data={searchedPatients}
              keyExtractor={(item) => item.id}
              emptyMessage="No patients match your search criteria."
              columns={[
                {
                  header: 'Patient ID',
                  cell: (item) => (
                    <span className="font-mono font-bold text-[#3DA9DF] text-xs">
                      {item.patientId}
                    </span>
                  ),
                },
                {
                  header: 'Full Name',
                  cell: (item) => (
                    <div className="font-semibold text-[#243447]">{item.fullName}</div>
                  ),
                },
                {
                  header: 'Phone Number',
                  cell: (item) => <span>+91 {item.phone}</span>,
                },
                {
                  header: 'Demographics',
                  cell: (item) => (
                    <span className="capitalize text-xs text-[#667085]">
                      {item.gender} {item.age ? `&bull; ${item.age} yrs` : ''} {item.bloodGroup ? `&bull; ${item.bloodGroup}` : ''}
                    </span>
                  ),
                },
                {
                  header: 'Address',
                  cell: (item) => <span className="text-xs text-[#667085]">{item.address || 'Prayagraj'}</span>,
                },
                {
                  header: 'Action',
                  cell: (item) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWalkInName(item.fullName);
                        setWalkInPhone(item.phone);
                        setWalkInGender(item.gender);
                        if (item.age) setWalkInAge(item.age.toString());
                        setWalkInModalOpen(true);
                      }}
                    >
                      Book OPD
                    </Button>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
      )}

      {/* TAB 3: UPLOAD SCANNED PRESCRIPTIONS */}
      {activeTab === 'upload' && (
        <Card className="max-w-2xl">
          <CardHeader>
            <div>
              <h2 className="text-base font-bold text-[#243447]">
                Scan &amp; Attach Clinical Prescription
              </h2>
              <p className="text-xs text-[#667085] mt-0.5">
                Upload scanned handwritten doctor notes or external reports directly to the patient's record.
              </p>
            </div>
          </CardHeader>

          <CardBody>
            {uploadSuccess && (
              <Alert type="success" title="Upload Completed">
                {uploadSuccess}
              </Alert>
            )}

            {uploadError && (
              <Alert type="error" title="Upload Notice">
                {uploadError}
              </Alert>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs mt-3">
              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Target Patient ID (e.g. SH-2026-00001) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="SH-2026-00001"
                  value={uploadPatientId}
                  onChange={(e) => setUploadPatientId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#CBD5E1] uppercase font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Document Title / Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadDocTitle}
                  onChange={(e) => setUploadDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#CBD5E1]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#243447] mb-1">
                  Select Scanned PDF / Image File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-[#CBD5E1] rounded-lg bg-[#F8FAFC]"
                  required
                />
                <span className="text-[11px] text-[#667085] mt-1 block">
                  Maximum file size: 10 MB. Supported formats: PDF, PNG, JPG.
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={uploading}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Upload &amp; Route to Doctor Queue
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* WALK-IN REGISTRATION MODAL */}
      <Modal
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        title="Register Walk-In Patient"
        description="Assign a daily token number on the shared OPD capacity."
      >
        <form onSubmit={handleWalkInSubmit} className="space-y-4 text-xs">
          {walkInError && (
            <Alert type="error" title="Registration Notice">
              {walkInError}
            </Alert>
          )}

          <div>
            <label className="block font-semibold text-[#243447] mb-1">
              Patient Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sunil Yadav"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#243447] mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="10 digits"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#243447] mb-1">
                Age (Years) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={walkInAge}
                onChange={(e) => setWalkInAge(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#243447] mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={walkInGender}
                onChange={(e) => setWalkInGender(e.target.value as 'male' | 'female' | 'other')}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#243447] mb-1">
                Consulting Doctor <span className="text-red-500">*</span>
              </label>
              <select
                value={walkInDoctorId}
                onChange={(e) => setWalkInDoctorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#243447] mb-1">
              Chief Complaints / Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Abdominal discomfort, knee pain..."
              value={walkInNotes}
              onChange={(e) => setWalkInNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E8ED]">
            <Button variant="ghost" size="sm" type="button" onClick={() => setWalkInModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Register &amp; Issue Token
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
