import React, { lazy, Suspense } from 'react';
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
const About = lazy(() => import('./pages/public/About').then(m => ({ default: m.About })));
const Services = lazy(() => import('./pages/public/Services').then(m => ({ default: m.Services })));
const Doctors = lazy(() => import('./pages/public/Doctors').then(m => ({ default: m.Doctors })));
const Pathology = lazy(() => import('./pages/public/Pathology').then(m => ({ default: m.Pathology })));
const Contact = lazy(() => import('./pages/public/Contact').then(m => ({ default: m.Contact })));
const BookAppointment = lazy(() => import('./pages/public/BookAppointment').then(m => ({ default: m.BookAppointment })));
const BookingStatus = lazy(() => import('./pages/public/BookingStatus').then(m => ({ default: m.BookingStatus })));
const Journey = lazy(() => import('./pages/public/Journey').then(m => ({ default: m.Journey })));
const Facilities = lazy(() => import('./pages/public/Facilities').then(m => ({ default: m.Facilities })));
const Gallery = lazy(() => import('./pages/public/Gallery').then(m => ({ default: m.Gallery })));
const Testimonials = lazy(() => import('./pages/public/Testimonials').then(m => ({ default: m.Testimonials })));
const News = lazy(() => import('./pages/public/News').then(m => ({ default: m.News })));
const PediatricCare = lazy(() => import('./pages/public/PediatricCare').then(m => ({ default: m.PediatricCare })));
const NewbornCare = lazy(() => import('./pages/public/NewbornCare').then(m => ({ default: m.NewbornCare })));
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
import { ScrollToTop } from './components/common/ScrollToTop';
const TermsAndConditions = lazy(() => import('./pages/public/TermsAndConditions').then(m => ({ default: m.TermsAndConditions })));
const CancellationPolicy = lazy(() => import('./pages/public/CancellationPolicy').then(m => ({ default: m.CancellationPolicy })));
const RefundPolicy = lazy(() => import('./pages/public/RefundPolicy').then(m => ({ default: m.RefundPolicy })));
const Accessibility = lazy(() => import('./pages/public/Accessibility').then(m => ({ default: m.Accessibility })));
const Disclaimer = lazy(() => import('./pages/public/Disclaimer').then(m => ({ default: m.Disclaimer })));
const LabTests = lazy(() => import('./pages/public/LabTests').then(m => ({ default: m.LabTests })));
const LabCheckout = lazy(() => import('./pages/public/LabCheckout').then(m => ({ default: m.LabCheckout })));
const LabOrderStatus = lazy(() => import('./pages/public/LabOrderStatus').then(m => ({ default: m.LabOrderStatus })));

// Patient Pages
const PatientLogin = lazy(() => import('./pages/patient/PatientLogin').then(m => ({ default: m.PatientLogin })));
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const PatientAppointments = lazy(() => import('./pages/patient/PatientAppointments').then(m => ({ default: m.PatientAppointments })));
const PatientReports = lazy(() => import('./pages/patient/PatientReports').then(m => ({ default: m.PatientReports })));
const PatientPrescriptions = lazy(() => import('./pages/patient/PatientPrescriptions').then(m => ({ default: m.PatientPrescriptions })));
const PatientProfilePage = lazy(() => import('./pages/patient/PatientProfile').then(m => ({ default: m.PatientProfilePage })));
const PatientConsent = lazy(() => import('./pages/patient/PatientConsent').then(m => ({ default: m.PatientConsent })));
const PatientLabOrders = lazy(() => import('./pages/patient/PatientLabOrders').then(m => ({ default: m.PatientLabOrders })));

// Staff Pages
const StaffLogin = lazy(() => import('./pages/staff/StaffLogin').then(m => ({ default: m.StaffLogin })));
const ReceptionDashboard = lazy(() => import('./pages/staff/ReceptionDashboard').then(m => ({ default: m.ReceptionDashboard })));
const DoctorDashboard = lazy(() => import('./pages/staff/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const PathologyDashboard = lazy(() => import('./pages/staff/PathologyDashboard').then(m => ({ default: m.PathologyDashboard })));
const AdminDashboard = lazy(() => import('./pages/staff/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const QueueDesk = lazy(() => import('./pages/staff/QueueDesk').then(m => ({ default: m.QueueDesk })));
const LabOrdersDesk = lazy(() => import('./pages/staff/LabOrdersDesk').then(m => ({ default: m.LabOrdersDesk })));
import { RequireRole } from './components/auth/RequireRole';
import { ROUTE_ROLES } from './lib/access';
import { UserRole } from './types';
import { NotFound } from './pages/NotFound';
import { FloatingAppointmentWidget } from './components/common/FloatingAppointmentWidget';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PageTransition } from './components/motion';
import { PageFallback } from './components/common/MedicalLoader';

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
        <Suspense fallback={<PageFallback />}>
          <PageTransition>
            {children}
          </PageTransition>
        </Suspense>
      </ErrorBoundary>
    </main>
    <FloatingAppointmentWidget />
    <Footer />
    <div aria-hidden="true" className="h-[var(--tabbar-space)] md:hidden" />
    <MobileTabBar />
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
            <Route path="/lab-tests" element={<PublicLayout><LabTests /></PublicLayout>} />
            <Route path="/lab-tests/checkout" element={<PublicLayout><LabCheckout /></PublicLayout>} />
            <Route path="/lab-tests/orders/:orderNumber" element={<PublicLayout><LabOrderStatus /></PublicLayout>} />
            
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
              <Route path="lab-orders" element={<PatientLabOrders />} />
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
              <Route path="/lab-orders" element={<RequireRole roles={ROUTE_ROLES.labOrders}><LabOrdersDesk /></RequireRole>} />
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
