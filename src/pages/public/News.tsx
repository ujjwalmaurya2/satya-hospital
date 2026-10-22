import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Newspaper, 
  Calendar, 
  Tag, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Search, 
  AlertCircle,
  X,
  Building,
  Microscope,
  Stethoscope,
  HeartPulse,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export interface NewsArticle {
  id: string;
  title: string;
  category: 'operational' | 'clinical' | 'lab' | 'community';
  categoryLabel: string;
  publishDate: string;
  department: string;
  readTime: string;
  summary: string;
  fullContent: string[];
  keyPoints: string[];
  badgeVariant: 'medical-blue' | 'lime-green' | 'warning';
}

export const hospitalNewsArticles: NewsArticle[] = [
  {
    id: 'news-1',
    title: 'New Calibrated 5-Part Hematology Auto-Analyzer Commissioned',
    category: 'lab',
    categoryLabel: 'Diagnostic & Lab',
    publishDate: 'October 15, 2026',
    department: 'Pathology & Diagnostic Laboratory',
    readTime: '3 min read',
    summary: 'The hospital laboratory has successfully commissioned an automated 5-part differential cell counter, reducing Complete Blood Count (CBC) turnaround times to under 2 hours for OPD patients.',
    fullContent: [
      'Satya Hospital’s clinical laboratory wing has completed installation and multi-level calibration of a 5-part automated hematology analyzer on the hospital ground floor.',
      'This diagnostic upgrade significantly reduces turnaround times for routine Complete Blood Counts (CBC), Erythrocyte Sedimentation Rate (ESR), and differential leukocyte profiling from the previous 4 hours down to under 2 hours.',
      'All diagnostic results continue to undergo a mandatory two-step sign-off by our Senior Pathologist, Dr. N. Tandon, before release to the Patient Health Portal. Emergency acute panels are given priority status.'
    ],
    keyPoints: [
      'Turnaround time reduced to under 2 hours for routine blood counts',
      'Daily 3-level internal quality control runs conducted each morning',
      'Automated barcoded tube indexing prevents specimen mix-ups'
    ],
    badgeVariant: 'lime-green',
  },
  {
    id: 'news-2',
    title: 'OPD Schedule & 09:00 AM Online Cutoff Policy Advisory',
    category: 'operational',
    categoryLabel: 'Operational Notice',
    publishDate: 'October 08, 2026',
    department: 'Outpatient Administration',
    readTime: '2 min read',
    summary: 'An advisory for patients regarding our daily token queue: online token booking closes strictly at 09:00 AM on the appointment date, while in-person walk-in registration continues uninterrupted at reception.',
    fullContent: [
      'To maintain prompt clinical consultation rosters and dispensary workflow, online appointment reservations for a target date open 1 calendar day in advance and close strictly at 09:00 AM IST on the appointment day.',
      'This ensures consulting doctors receive finalized patient registers prior to commencing 09:30 AM morning clinics.',
      'Patients arriving after 09:00 AM can continue to obtain same-day consultation tokens in-person at the ground-floor reception desk without restriction. Both online and walk-in patients share the identical sequential daily queue.'
    ],
    keyPoints: [
      'Online booking window: Opens 1 day before, closes at 09:00 AM on OPD day',
      'Walk-in token registration: Open from 08:30 AM at the central reception counter',
      'Consultations start daily at 09:30 AM across all Ground and First Floor OPD chambers'
    ],
    badgeVariant: 'medical-blue',
  },
  {
    id: 'news-3',
    title: 'Seasonal Health Advisory: Viral Fever & Platelet Vigilance in Prayagraj',
    category: 'clinical',
    categoryLabel: 'Clinical Advisory',
    publishDate: 'September 28, 2026',
    department: 'Department of General Medicine',
    readTime: '4 min read',
    summary: 'Clinical guidance from Dr. V. K. Sharma on recognizing warning signs of seasonal vector-borne illnesses, safe fever management, and timely diagnostic blood evaluations.',
    fullContent: [
      'Following post-monsoon weather changes across Prayagraj and surrounding districts, the Department of General Medicine has issued clinical recommendations for patients presenting with sudden high-grade fever, retro-orbital pain, and body ache.',
      'Self-medication with non-steroidal anti-inflammatory drugs (NSAIDs) such as ibuprofen or diclofenac should be strictly avoided due to potential risks of gastric irritation and platelet impairment.',
      'Patients experiencing high fever persisting beyond 48 hours, abdominal pain, or extreme fatigue are advised to attend morning OPD for baseline Complete Blood Count (CBC) and platelet count evaluation.'
    ],
    keyPoints: [
      'Paracetamol is recommended as safe initial antipyretic therapy',
      'Maintain adequate oral fluid intake (ORS, fresh coconut water, clean boiled water)',
      'Immediate hospital evaluation advised if warning signs such as dizziness or mucosal bleeding appear'
    ],
    badgeVariant: 'warning',
  },
  {
    id: 'news-4',
    title: 'Pediatric Immunization & Growth Assessment Clinics',
    category: 'community',
    categoryLabel: 'Community Health',
    publishDate: 'September 12, 2026',
    department: 'Paediatrics & Neonatology',
    readTime: '3 min read',
    summary: 'Daily morning pediatric consultation chambers provide routine childhood immunizations, developmental milestone tracking, and infant nutrition counseling.',
    fullContent: [
      'The Department of Paediatrics provides comprehensive outpatient services for newborns, infants, and children up to 14 years of age. All standard National Immunization Schedule vaccines and recommended optional vaccines are stocked in certified cold-chain refrigeration.',
      'Consultations with Dr. P. Verma (MD, Paed) include detailed growth velocity plotting (height, weight, and head circumference percentiles) and age-appropriate nutritional guidance for nursing mothers.',
      'Morning pediatric slots are available Monday through Saturday starting at 09:30 AM.'
    ],
    keyPoints: [
      'Certified temperature-monitored vaccine storage',
      'Separate examination and immunization area for infant comfort',
      'Digital vaccination record tracking on the patient health portal'
    ],
    badgeVariant: 'lime-green',
  },
  {
    id: 'news-5',
    title: 'Patient Health Portal & DPDP-Compliant Digital Records Rollout',
    category: 'operational',
    categoryLabel: 'Operational Notice',
    publishDate: 'August 24, 2026',
    department: 'Hospital Administration & IT',
    readTime: '3 min read',
    summary: 'Satya Hospital has implemented encrypted digital health records with Row Level Security (RLS) and authenticated PDF lab report delivery in compliance with India’s DPDP Act.',
    fullContent: [
      'In alignment with the Digital Personal Data Protection (DPDP) Act, Satya Hospital has modernized patient record archiving. Patients can now access their digital consultation summaries, scanned prescriptions, and signed lab reports from any smartphone or browser.',
      'Medical PDF files are protected by short-lived, authenticated URLs, preventing unauthorized public web scraping. No third-party tracking or commercial data sharing is permitted on the platform.',
      'Patients can sign in using their Unique Hospital Patient ID (SH-YYYY-XXXXX) printed on physical OPD slips.'
    ],
    keyPoints: [
      'Direct, authenticated download of signed pathology PDF reports',
      'Scanned doctor prescriptions linked directly to patient profiles',
      'Patient consent and data withdrawal controls available in the portal'
    ],
    badgeVariant: 'medical-blue',
  },
  {
    id: 'news-6',
    title: 'Preventive Cardiology: 12-Lead ECG Evaluation for Adults Over 40',
    category: 'clinical',
    categoryLabel: 'Clinical Advisory',
    publishDate: 'August 10, 2026',
    department: 'Cardiology & General Medicine',
    readTime: '4 min read',
    summary: 'Understanding the importance of baseline resting electrocardiograms for early detection of asymptomatic arrhythmias, ischemia, and hypertensive cardiac changes.',
    fullContent: [
      'Non-communicable cardiovascular conditions often develop gradually without acute symptoms. Satya Hospital encourages adults over 40 years of age, especially those with family history of hypertension or diabetes, to undergo an annual resting 12-lead ECG evaluation.',
      'Our digital ECG unit in Room 102 provides multi-channel recordings with instantaneous physician evaluation and automatic archiving into the patient’s health record.',
      'A routine ECG takes less than 10 minutes and does not require fasting or advance preparation.'
    ],
    keyPoints: [
      'Rapid, non-invasive cardiac evaluation performed in Room 102',
      'Immediate physician review and printed diagnostic strip provided',
      'Helps detect early rhythm abnormalities and chamber enlargement'
    ],
    badgeVariant: 'warning',
  },
];

export const News: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  const categories = [
    { id: 'all', label: 'All Updates' },
    { id: 'operational', label: 'Operational Notices' },
    { id: 'clinical', label: 'Clinical Advisories' },
    { id: 'lab', label: 'Diagnostic & Lab' },
    { id: 'community', label: 'Community Health' },
  ];

  const filteredArticles = hospitalNewsArticles.filter((article) => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Page Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Newspaper className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Hospital Bulletins &amp; Medical Advisories</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#243447] tracking-tight">
          News &amp; Clinical Updates
        </h1>
        <p className="text-base text-[#667085] leading-relaxed">
          Stay informed with official operational notices, preventive healthcare guidelines, diagnostic laboratory upgrades, and clinical announcements from Satya Hospital in Prayagraj.
        </p>
      </div>

      {/* Search and Category Filters */}
      <div className="space-y-4">
        <div className="max-w-md relative">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search news, advisories, or departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#3DA9DF] text-white shadow-xs'
                  : 'bg-white border border-[#E1E8ED] text-[#243447] hover:bg-[#F8FAFC]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#3DA9DF] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
            onClick={() => setActiveArticle(article)}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={article.badgeVariant} size="sm">
                  {article.categoryLabel}
                </Badge>
                <span className="text-[11px] text-[#667085] flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#3DA9DF]" />
                  <span>{article.publishDate}</span>
                </span>
              </div>

              <h2 className="text-base font-bold text-[#243447] group-hover:text-[#3DA9DF] transition-colors leading-snug">
                {article.title}
              </h2>

              <p className="text-xs text-[#667085] leading-relaxed line-clamp-3">
                {article.summary}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-[#E1E8ED] flex items-center justify-between text-xs">
              <span className="text-[11px] text-[#1E78A4] font-medium truncate max-w-[170px]">
                {article.department}
              </span>
              <span className="text-xs font-semibold text-[#3DA9DF] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Read Full</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E1E8ED] p-12 text-center max-w-lg mx-auto space-y-3">
          <AlertCircle className="w-8 h-8 text-[#667085] mx-auto opacity-40" />
          <h3 className="text-base font-bold text-[#243447]">No Matching Bulletins</h3>
          <p className="text-xs text-[#667085]">
            No announcements matched your search terms. Try clearing your search query or selecting a different category.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
            Reset Filters
          </Button>
        </div>
      )}

      {/* Article Detail Modal */}
      <AnimatePresence>
        {activeArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#243447]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            onClick={() => setActiveArticle(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl max-w-2xl w-full border border-[#CBD5E1] shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-7 border-b border-[#E1E8ED] flex items-start justify-between gap-4 bg-[#F8FAFC]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={activeArticle.badgeVariant} size="sm">
                      {activeArticle.categoryLabel}
                    </Badge>
                    <span className="text-xs text-[#667085] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#3DA9DF]" />
                      <span>{activeArticle.readTime}</span>
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#243447] leading-snug">
                    {activeArticle.title}
                  </h2>
                  <div className="text-xs text-[#667085] pt-0.5">
                    Published: {activeArticle.publishDate} &bull; {activeArticle.department}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center text-[#243447] hover:bg-slate-50 cursor-pointer shrink-0 shadow-2xs"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 sm:p-7 overflow-y-auto space-y-5 text-xs sm:text-sm text-[#243447] leading-relaxed">
                {activeArticle.fullContent.map((paragraph, pIdx) => (
                  <p key={pIdx} className="text-[#667085] leading-relaxed">
                    {paragraph}
                  </p>
                ))}

                {/* Key Points */}
                <div className="bg-[#F4F8FA] border border-[#CBD5E1] p-5 rounded-2xl space-y-2.5">
                  <strong className="text-xs font-bold text-[#243447] block uppercase tracking-wider">
                    Key Highlights &amp; Advisory Points:
                  </strong>
                  <div className="space-y-2 text-xs">
                    {activeArticle.keyPoints.map((pt, ptIdx) => (
                      <div key={ptIdx} className="flex items-start gap-2 text-[#243447]">
                        <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-[#E1E8ED] bg-[#F8FAFC] flex items-center justify-between text-xs">
                <span className="text-[#667085]">
                  Hospital Official Bulletin &bull; Prayagraj
                </span>
                <Link to="/book-appointment">
                  <Button variant="primary" size="sm" leftIcon={<Calendar className="w-3.5 h-3.5" />}>
                    Book OPD Slot
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hospital Notice Compliance Banner */}
      <div className="bg-[#F8FAFC] rounded-2xl border border-[#E1E8ED] p-6 flex items-start gap-3.5 text-xs text-[#667085]">
        <ShieldCheck className="w-5 h-5 text-[#3DA9DF] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-sm font-semibold text-[#243447] block">
            Official Hospital Information Standards
          </strong>
          <p className="leading-relaxed">
            All bulletins and medical advisories published here are issued directly by the medical administration of Satya Hospital &amp; Pathology in Prayagraj. Information is provided for public awareness and does not replace individualized clinical consultations.
          </p>
        </div>
      </div>
    </div>
  );
};
