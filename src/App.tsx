import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HospitalProvider } from './context/HospitalContext';

// Layouts
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { PatientLayout } from './components/layout/PatientLayout';
import { StaffLayout } from './components/layout/StaffLayout';

// Public Pages
import { Home } from './pages/public/Home';
import { About } from './pages/public/About';
import { Services } from './pages/public/Services';
import { Doctors } from './pages/public/Doctors';
import { Pathology } from './pages/public/Pathology';
import { Contact } from './pages/public/Contact';
import { BookAppointment } from './pages/public/BookAppointment';
import { BookingStatus } from './pages/public/BookingStatus';
import { Journey } from './pages/public/Journey';
import { Facilities } from './pages/public/Facilities';
import { Gallery } from './pages/public/Gallery';
import { Testimonials } from './pages/public/Testimonials';
import { News } from './pages/public/News';
import { PediatricCare } from './pages/public/PediatricCare';
import { NewbornCare } from './pages/public/NewbornCare';
import { PrivacyPolicy } from './pages/public/PrivacyPolicy';
import { ScrollToTop } from './components/common/ScrollToTop';
import { TermsAndConditions } from './pages/public/TermsAndConditions';
import { CancellationPolicy } from './pages/public/CancellationPolicy';
import { RefundPolicy } from './pages/public/RefundPolicy';
import { Accessibility } from './pages/public/Accessibility';
import { Disclaimer } from './pages/public/Disclaimer';

// Patient Pages
import { PatientLogin } from './pages/patient/PatientLogin';
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { PatientAppointments } from './pages/patient/PatientAppointments';
import { PatientReports } from './pages/patient/PatientReports';
import { PatientPrescriptions } from './pages/patient/PatientPrescriptions';
import { PatientProfilePage } from './pages/patient/PatientProfile';
import { PatientConsent } from './pages/patient/PatientConsent';

// Staff Pages
import { StaffLogin } from './pages/staff/StaffLogin';
import { ReceptionDashboard } from './pages/staff/ReceptionDashboard';
import { DoctorDashboard } from './pages/staff/DoctorDashboard';
import { PathologyDashboard } from './pages/staff/PathologyDashboard';
import { AdminDashboard } from './pages/staff/AdminDashboard';
import { QueueDesk } from './pages/staff/QueueDesk';
import { RequireRole } from './components/auth/RequireRole';
import { ROUTE_ROLES } from './lib/access';
import { UserRole } from './types';
import { NotFound } from './pages/NotFound';
import { FloatingAppointmentWidget } from './components/common/FloatingAppointmentWidget';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PageTransition } from './components/motion';

const ALL_STAFF_ROLES: UserRole[] = ['reception', 'doctor', 'pathology', 'admin'];
const PATIENT_ROLES: UserRole[] = ['patient'];

// Public Layout Wrapper
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-canvas">
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
    >
      Skip to content
    </a>
    <Navbar />
    <main id="main" className="flex-1">
      <ErrorBoundary>
        <PageTransition>
          {children}
        </PageTransition>
      </ErrorBoundary>
    </main>
    <FloatingAppointmentWidget />
    <Footer />
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <HospitalProvider>
          <Routes>
            {/* PUBLIC MULTI-PAGE ROUTES */}
            <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
            <Route path="/pediatric-care" element={<PublicLayout><PediatricCare /></PublicLayout>} />
            <Route path="/newborn-care" element={<PublicLayout><NewbornCare /></PublicLayout>} />
            <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
            <Route path="/departments" element={<PublicLayout><Services /></PublicLayout>} />
            <Route path="/doctors" element={<PublicLayout><Doctors /></PublicLayout>} />
            <Route path="/pathology-lab" element={<PublicLayout><Pathology /></PublicLayout>} />
            <Route path="/pathology" element={<PublicLayout><Pathology /></PublicLayout>} />
            <Route path="/journey" element={<PublicLayout><Journey /></PublicLayout>} />
            <Route path="/facilities" element={<PublicLayout><Facilities /></PublicLayout>} />
            <Route path="/gallery" element={<PublicLayout><Gallery /></PublicLayout>} />
            <Route path="/testimonials" element={<PublicLayout><Testimonials /></PublicLayout>} />
            <Route path="/news" element={<PublicLayout><News /></PublicLayout>} />
            <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />
            <Route path="/book-appointment" element={<PublicLayout><BookAppointment /></PublicLayout>} />
            <Route path="/booking/:reference" element={<PublicLayout><BookingStatus /></PublicLayout>} />
            
            {/* LEGAL & STATUTORY POLICY ROUTES */}
            <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />
            <Route path="/terms-and-conditions" element={<PublicLayout><TermsAndConditions /></PublicLayout>} />
            <Route path="/cancellation-policy" element={<PublicLayout><CancellationPolicy /></PublicLayout>} />
            <Route path="/refund-policy" element={<PublicLayout><RefundPolicy /></PublicLayout>} />
            <Route path="/accessibility" element={<PublicLayout><Accessibility /></PublicLayout>} />
            <Route path="/disclaimer" element={<PublicLayout><Disclaimer /></PublicLayout>} />

            {/* PATIENT AUTH */}
            <Route path="/patient/login" element={<PublicLayout><PatientLogin /></PublicLayout>} />

            {/* PATIENT PORTAL ROUTES (NESTED UNDER PATIENT LAYOUT) */}
            <Route path="/patient" element={<RequireRole roles={PATIENT_ROLES} loginPath="/patient/login"><PatientLayout /></RequireRole>}>
              <Route index element={<Navigate to="/patient/dashboard" replace />} />
              <Route path="dashboard" element={<PatientDashboard />} />
              <Route path="appointments" element={<PatientAppointments />} />
              <Route path="reports" element={<PatientReports />} />
              <Route path="prescriptions" element={<PatientPrescriptions />} />
              <Route path="profile" element={<PatientProfilePage />} />
              <Route path="consent-and-privacy" element={<PatientConsent />} />
            </Route>

            {/* STAFF AUTH */}
            <Route path="/staff/login" element={<PublicLayout><StaffLogin /></PublicLayout>} />

            {/* STAFF DASHBOARDS (NESTED UNDER STAFF LAYOUT, ROLE-GUARDED) */}
            <Route element={<RequireRole roles={ALL_STAFF_ROLES}><StaffLayout /></RequireRole>}>
              <Route path="/staff" element={<RequireRole roles={ROUTE_ROLES.staffDesk}><QueueDesk /></RequireRole>} />
              <Route path="/admin" element={<RequireRole roles={ROUTE_ROLES.admin}><AdminDashboard /></RequireRole>} />
              <Route path="/reception" element={<RequireRole roles={ROUTE_ROLES.reception}><ReceptionDashboard /></RequireRole>} />
              <Route path="/doctor" element={<RequireRole roles={ROUTE_ROLES.doctor}><DoctorDashboard /></RequireRole>} />
              <Route path="/pathology-dashboard" element={<RequireRole roles={ROUTE_ROLES.pathology}><PathologyDashboard /></RequireRole>} />
            </Route>

            {/* 404 CATCH ALL */}
            <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
          </Routes>
        </HospitalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
