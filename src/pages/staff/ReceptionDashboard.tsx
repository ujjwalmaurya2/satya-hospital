import React, { useRef, useState } from 'react';
import { CalendarPlus, FileUp, Search, Upload, UploadCloud, UserPlus, X } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Table } from '../../components/common/Table';
import { APPOINTMENT_BADGE, Avatar, PageHeader, Panel, StatCard, Tabs } from '../../components/dashboard/Dashboard';
import { useHospital } from '../../context/HospitalContext';
import { useAuth } from '../../context/AuthContext';
import { getHospitalTodayDate, isValidIndianPhone } from '../../lib/tokens';
import { uploadDocumentToSecureStorage } from '../../lib/storage';
import { to12h } from '../../lib/contact';
import { cn } from '../../lib/cn';

type Tab = 'queue' | 'search' | 'upload';

export const ReceptionDashboard: React.FC = () => {
  const { user } = useAuth();
  const { settings, appointments, doctors, patientProfiles, registerPatient, registerWalkInAppointment, updateAppointmentStatus, uploadMedicalDocument, getTodayQueueStats, searchPatients } =
    useHospital();

  const today = getHospitalTodayDate();
  const queueStats = getTodayQueueStats();

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('queue');

  // Walk-in registration modal
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInGender, setWalkInGender] = useState<'male' | 'female' | 'other'>('male');
  const [walkInAge, setWalkInAge] = useState('4');
  const [walkInDoctorId, setWalkInDoctorId] = useState(doctors[0]?.id || '');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Document upload
  const [uploadPatientId, setUploadPatientId] = useState('');
  const [uploadDocTitle, setUploadDocTitle] = useState('Handwritten prescription scan');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const todayAppointments = appointments.filter(a => a.appointmentDate === today).sort((a, b) => a.tokenNumber - b.tokenNumber);

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError(null);
    if (!walkInName.trim()) return setWalkInError('Patient name is required.');
    if (!isValidIndianPhone(walkInPhone)) return setWalkInError('A valid 10-digit phone number is required.');

    const regRes = registerPatient(
      { fullName: walkInName.trim(), phone: walkInPhone.trim(), gender: walkInGender, age: parseInt(walkInAge, 10) || undefined },
      'reception'
    );
    if (!regRes.success || !regRes.patient) return setWalkInError(regRes.error || 'Failed to register patient profile.');

    const walkInRes = registerWalkInAppointment({ patientProfileId: regRes.patient.id, doctorId: walkInDoctorId, notes: walkInNotes.trim() });
    if (!walkInRes.success || !walkInRes.appointment) return setWalkInError(walkInRes.error || 'Failed to allocate walk-in token.');

    setWalkInModalOpen(false);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInNotes('');
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);
    if (!uploadFile) return setUploadError('Choose a scanned PDF or image.');

    const patient = patientProfiles.find(p => p.patientId.toLowerCase() === uploadPatientId.trim().toLowerCase());
    if (!patient) return setUploadError(`No patient found with ID “${uploadPatientId}”.`);

    setUploading(true);
    try {
      const uploadRes = await uploadDocumentToSecureStorage(uploadFile, 'prescriptions', patient.patientId);
      if (!uploadRes.success || !uploadRes.storageKey) {
        setUploadError(uploadRes.error || 'File upload failed.');
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
        notes: 'Uploaded at reception desk. Awaiting doctor review.',
      });
      setUploadSuccess(`Uploaded for ${patient.fullName} (${patient.patientId}). It is now waiting in the doctor’s verification queue.`);
      setUploadFile(null);
      setUploadPatientId('');
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Unknown upload error.');
    } finally {
      setUploading(false);
    }
  };

  const searchedPatients = searchPatients(patientSearchQuery);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reception"
        title="Records & uploads"
        description={`Today’s list, patient directory and prescription scans · OPD from ${to12h(settings.opdStartTime)}`}
        actions={
          <Button variant="accent" onClick={() => setWalkInModalOpen(true)} leftIcon={<UserPlus className="h-4 w-4" />} disabled={queueStats.isCapacityFull}>
            Register walk-in
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Registered today" value={queueStats.totalBooked} hint={`${queueStats.onlineCount} online · ${queueStats.walkInCount} walk-in`} />
        <StatCard label="Waiting" value={queueStats.waitingCount} hint="Booked or arrived" />
        <StatCard label="Completed" value={queueStats.completedCount} hint="Seen by a doctor" />
        <StatCard
          label="Daily intake"
          value={queueStats.remainingCapacity !== null ? queueStats.remainingCapacity : 'Open'}
          hint={settings.maxDailyCapacity ? `Cap ${settings.maxDailyCapacity}` : 'No daily cap'}
        />
      </div>

      <Panel flush>
        <Tabs
          label="Reception sections"
          layoutId="reception-tab"
          value={activeTab}
          onChange={setActiveTab}
          className="px-3 sm:px-4"
          items={[
            { id: 'queue', label: 'Today’s list', count: todayAppointments.length },
            { id: 'search', label: 'Patient directory' },
            { id: 'upload', label: 'Upload scan' },
          ]}
        />

        {activeTab === 'queue' && (
          <Table
            caption="Today's OPD appointments"
            data={todayAppointments}
            keyExtractor={item => item.id}
            emptyMessage="No patients scheduled today"
            emptyHint="Online bookings and walk-ins will appear here."
            columns={[
              {
                header: 'Token',
                cell: item => <span className="inline-flex h-8 min-w-11 items-center justify-center rounded-lg bg-ink-800 px-2 font-mono text-xs font-bold text-white">#{item.tokenNumber}</span>,
              },
              {
                header: 'Patient',
                cell: item => (
                  <div>
                    <p className="font-semibold text-ink-900">{item.patientName}</p>
                    <p className="font-mono text-xs text-ink-500">
                      {item.patientId} · +91 {item.patientPhone}
                    </p>
                  </div>
                ),
              },
              {
                header: 'Type',
                cell: item => (
                  <Badge variant={item.queueType === 'online' ? 'medical-blue' : 'mint'} size="sm">
                    {item.queueType === 'online' ? 'Online' : 'Walk-in'}
                  </Badge>
                ),
              },
              { header: 'Doctor', cell: item => <span className="text-ink-700">{item.doctorName}</span> },
              {
                header: 'Status',
                cell: item => (
                  <Badge variant={APPOINTMENT_BADGE[item.status].variant} size="sm" dot>
                    {APPOINTMENT_BADGE[item.status].label}
                  </Badge>
                ),
              },
              {
                header: 'Actions',
                cell: item => (
                  <div className="flex items-center gap-1.5">
                    {item.status === 'booked' && (
                      <Button variant="accent" size="sm" onClick={() => updateAppointmentStatus(item.id, 'checked_in', 'reception')}>
                        Mark arrival
                      </Button>
                    )}
                    {item.status === 'checked_in' && (
                      <Button variant="outline" size="sm" onClick={() => updateAppointmentStatus(item.id, 'in_consultation', 'reception')}>
                        Call to room
                      </Button>
                    )}
                    {item.status !== 'completed' && item.status !== 'cancelled' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger-700 hover:bg-danger-50 hover:text-danger-700"
                        onClick={() => updateAppointmentStatus(item.id, 'cancelled', 'reception', 'Cancelled at desk')}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}

        {activeTab === 'search' && (
          <>
            <div className="border-b border-line p-4 sm:px-6">
              <div className="relative max-w-xl">
                <label htmlFor="patient-search" className="sr-only">Search patients</label>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
                <input
                  id="patient-search"
                  type="search"
                  placeholder="Search by patient ID, name or phone"
                  value={patientSearchQuery}
                  onChange={e => setPatientSearchQuery(e.target.value)}
                  className="field-control pl-10"
                />
              </div>
            </div>
            <Table
              caption="Patient directory"
              data={searchedPatients}
              keyExtractor={item => item.id}
              emptyMessage="No patients match your search"
              emptyHint="Try a patient ID such as SH-2026-00001, a name or a phone number."
              columns={[
                {
                  header: 'Patient',
                  cell: item => (
                    <div className="flex items-center gap-3">
                      <Avatar name={item.fullName} size="sm" />
                      <div>
                        <p className="font-semibold text-ink-900">{item.fullName}</p>
                        <p className="font-mono text-xs text-brand-700">{item.patientId}</p>
                      </div>
                    </div>
                  ),
                },
                { header: 'Phone', cell: item => <span className="tabular-nums">+91 {item.phone}</span> },
                {
                  header: 'Details',
                  cell: item => (
                    <span className="capitalize text-ink-500">
                      {[item.gender, item.age ? `${item.age} yrs` : null, item.bloodGroup].filter(Boolean).join(' · ')}
                    </span>
                  ),
                },
                { header: 'Address', cell: item => <span className="text-ink-500">{item.address || 'Prayagraj'}</span> },
                {
                  header: '',
                  cell: item => (
                    <Button
                      variant="soft"
                      size="sm"
                      leftIcon={<CalendarPlus className="h-4 w-4" />}
                      onClick={() => {
                        setWalkInName(item.fullName);
                        setWalkInPhone(item.phone);
                        if (item.gender) setWalkInGender(item.gender);
                        if (item.age) setWalkInAge(item.age.toString());
                        setWalkInModalOpen(true);
                      }}
                    >
                      Issue token
                    </Button>
                  ),
                },
              ]}
            />
          </>
        )}

        {activeTab === 'upload' && (
          <div className="max-w-2xl p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold text-ink-900">Attach a scanned prescription</h2>
            <p className="mt-1 text-[13px] text-ink-500">Scans go to the doctor’s verification queue before patients can see them.</p>

            <div className="mt-5 space-y-3">
              {uploadSuccess && <Alert type="success" title="Upload complete">{uploadSuccess}</Alert>}
              {uploadError && <Alert type="error" title="Upload not completed">{uploadError}</Alert>}
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="up-pid" className="field-label">Patient ID</label>
                  <input
                    id="up-pid"
                    placeholder="SH-2026-00001"
                    value={uploadPatientId}
                    onChange={e => setUploadPatientId(e.target.value.toUpperCase())}
                    className="field-control font-mono"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="up-title" className="field-label">Document title</label>
                  <input id="up-title" value={uploadDocTitle} onChange={e => setUploadDocTitle(e.target.value)} className="field-control" required />
                </div>
              </div>

              <div>
                <p className="field-label" id="up-file-label">File</p>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) setUploadFile(f);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                    dragOver ? 'border-brand-500 bg-brand-50' : 'border-line-strong bg-ink-50/40'
                  )}
                >
                  {uploadFile ? (
                    <div className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-line">
                      <FileUp className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900">{uploadFile.name}</p>
                        <p className="text-xs text-ink-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadFile(null)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-50 hover:text-ink-900 cursor-pointer"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-brand-500" aria-hidden="true" />
                      <p className="mt-3 text-sm font-medium text-ink-800">Drag a file here, or</p>
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fileInput.current?.click()}>
                        Choose file
                      </Button>
                      <p className="mt-3 text-xs text-ink-500">PDF, PNG or JPG · up to 10 MB</p>
                    </>
                  )}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="sr-only"
                    aria-labelledby="up-file-label"
                  />
                </div>
              </div>

              <Button type="submit" isLoading={uploading} loadingText="Uploading…" leftIcon={<Upload className="h-4 w-4" />}>
                Upload & send to doctor
              </Button>
            </form>
          </div>
        )}
      </Panel>

      <Modal isOpen={walkInModalOpen} onClose={() => setWalkInModalOpen(false)} title="Register walk-in patient" description="Assigns the next token in today’s shared queue.">
        <form onSubmit={handleWalkInSubmit} className="space-y-4">
          {walkInError && <Alert type="error">{walkInError}</Alert>}
          <div>
            <label htmlFor="m-name" className="field-label">Patient full name</label>
            <input id="m-name" placeholder="e.g. Sunil Yadav" value={walkInName} onChange={e => setWalkInName(e.target.value)} className="field-control" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="m-phone" className="field-label">Mobile number</label>
              <input
                id="m-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 digits"
                value={walkInPhone}
                onChange={e => setWalkInPhone(e.target.value.replace(/\D/g, ''))}
                className="field-control"
                required
              />
            </div>
            <div>
              <label htmlFor="m-age" className="field-label">Age (years)</label>
              <input id="m-age" type="number" min={0} max={120} value={walkInAge} onChange={e => setWalkInAge(e.target.value)} className="field-control" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="m-gender" className="field-label">Sex</label>
              <select id="m-gender" value={walkInGender} onChange={e => setWalkInGender(e.target.value as 'male' | 'female' | 'other')} className="field-control">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="m-doctor" className="field-label">Doctor</label>
              <select id="m-doctor" value={walkInDoctorId} onChange={e => setWalkInDoctorId(e.target.value)} className="field-control">
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="m-notes" className="field-label">
              Reason for visit <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <input id="m-notes" placeholder="e.g. Abdominal discomfort" value={walkInNotes} onChange={e => setWalkInNotes(e.target.value)} className="field-control" />
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" type="button" onClick={() => setWalkInModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Register & issue token</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
