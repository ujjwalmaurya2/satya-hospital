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
  Baby,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ScrollReveal, StaggerContainer, StaggerItem } from '../../components/motion';

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
  badgeVariant: 'teal' | 'sky-blue' | 'mint' | 'warning' | 'neutral';
}

export const hospitalNewsArticles: NewsArticle[] = [
  {
    id: 'news-pediatric-fever',
    title: 'Seasonal Viral Illnesses & Fever: Pediatric Care Advisory for Parents',
    category: 'clinical',
    categoryLabel: 'Pediatric Care',
    publishDate: 'October 20, 2026',
    department: 'Paediatrics & Neonatology Wing',
    readTime: '3 min read',
    summary: 'Clinical guidance on monitoring childhood fever, avoiding self-medication, maintaining hydration, and knowing when to present for an in-person pediatric evaluation.',
    fullContent: [
      'Seasonal temperature changes often bring an increase in acute viral upper respiratory tract infections and childhood fevers in Prayagraj.',
      'Our consulting pediatricians advise parents to maintain gentle oral rehydration, record temperature readings using digital axillary thermometers, and avoid over-the-counter antibiotic or heavy combination fever syrups without medical consultation.',
      'If your child displays persistent high fever beyond 48 hours, refusal to drink fluids, lethargy, or rapid breathing, schedule an early morning OPD consultation token or visit the hospital reception directly.'
    ],
    keyPoints: [
      'Never give aspirin or multi-drug combination cold remedies to toddlers without a prescription',
      'Encourage frequent small sips of fluids, oral rehydration salts (ORS), and light nourishing meals',
      'Online OPD bookings open at 1 day before appointment and close at 09:00 AM on consultation date'
    ],
    badgeVariant: 'teal',
  },
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
      'All diagnostic results continue to undergo a mandatory two-step sign-off by our Senior Pathologist before release to the Patient Health Portal. Emergency acute panels are given priority status.'
    ],
    keyPoints: [
      'Turnaround time reduced to under 2 hours for routine blood counts',
      'Daily 3-level internal quality control runs conducted each morning',
      'Automated barcoded tube indexing prevents specimen mix-ups'
    ],
    badgeVariant: 'sky-blue',
  },
  {
    id: 'news-2',
    title: 'Fair Queue Architecture: Same-Day 09:00 AM Cutoff Operational',
    category: 'operational',
    categoryLabel: 'Queue & OPD',
    publishDate: 'September 28, 2026',
    department: 'Hospital Administration & Reception',
    readTime: '2 min read',
    summary: 'A reminder to patients that online appointment bookings close at 09:00 AM on the day of consultation. Reception desk walk-in registration continues for all arriving patients without interruption.',
    fullContent: [
      'To maintain prompt morning doctor consultation start times at 09:30 AM, Satya Hospital enforces an automated 09:00 AM IST cutoff for same-day online bookings.',
      'This protocol gives consulting physicians and nursing staff 30 minutes to review morning rosters, prepare physical OPD patient cards, and ready diagnostic test requisitions.',
      'Patients arriving after 09:00 AM without an online reservation are welcomed at the ground-floor reception desk, where walk-in tokens are allocated seamlessly from the same sequential daily queue.'
    ],
    keyPoints: [
      'Same-day online booking closes at 09:00 AM IST',
      'OPD consultations begin at 09:30 AM daily',
      'Walk-in reception registration continues throughout morning clinic hours'
    ],
    badgeVariant: 'mint',
  },
  {
    id: 'news-3',
    title: 'Routine Childhood Vaccination Schedule Verification Service',
    category: 'community',
    categoryLabel: 'Child Health',
    publishDate: 'September 10, 2026',
    department: 'Paediatrics & Child Health',
    readTime: '4 min read',
    summary: 'Parents can now bring past immunization cards to their pediatric OPD visits for a complimentary verification of completed and upcoming vaccine doses.',
    fullContent: [
      'Timely childhood immunization is fundamental to long-term health and protection against preventable communicable diseases.',
      'Satya Hospital’s outpatient department now offers record verification during all pediatric visits. Doctors verify records against national and standard recommended timelines, highlighting any catch-up doses needed.',
      'Immunization records are preserved in the patient’s digital portal profile for permanent reference, preventing lost vaccination cards.'
    ],
    keyPoints: [
      'Bring child birth summary and past immunization card to consultation',
      'Guidance on catch-up vaccines for missed infant and school-age doses',
      'Digitized vaccination record accessible securely via Patient Portal'
    ],
    badgeVariant: 'teal',
  },
];

export const News: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  const categories = [
    { id: 'all', label: 'All News & Bulletins' },
    { id: 'clinical', label: 'Clinical Advisories' },
    { id: 'operational', label: 'OPD Operational Notices' },
    { id: 'lab', label: 'Pathology Upgrades' },
    { id: 'community', label: 'Child Health Guidance' },
  ];

  const filteredArticles = hospitalNewsArticles.filter((article) => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <ScrollReveal direction="up" distance={16}>
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F3F8EC] text-[#486812] border border-[#D5E8BA] text-xs font-bold">
              <Newspaper className="w-3.5 h-3.5 text-[#3DA9DF]" />
              <span>Official News &amp; Clinical Advisories &bull; Satya Hospital</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#193247] tracking-tight">
              Hospital Bulletins &amp; Health Updates
            </h1>
            <p className="text-sm sm:text-base text-[#647785] leading-relaxed">
              Stay informed with official operational notices, pediatric health advisories, diagnostic laboratory upgrades, and clinical announcements from Satya Hospital in Prayagraj.
            </p>
          </div>
        </ScrollReveal>

        {/* Search and Category Filters */}
        <ScrollReveal direction="up" delay={0.06} distance={12}>
          <div className="space-y-4">
            <div className="max-w-md relative">
              <Search className="w-4 h-4 text-[#647785] absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search news, advisories, or departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#CBD7DD] text-xs sm:text-sm text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#3DA9DF] text-white shadow-xs'
                      : 'bg-white border border-[#E5ECEF] text-[#193247] hover:bg-[#FCFDFB]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* News Grid */}
        <StaggerContainer staggerDelay={0.07} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => (
            <StaggerItem key={article.id} hoverLift className="h-full">
              <div
                className="bg-white rounded-2xl border border-[#CBD7DD] hover:border-[#3DA9DF]/50 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer h-full"
                onClick={() => setActiveArticle(article)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={article.badgeVariant} size="sm">
                      {article.categoryLabel}
                    </Badge>
                    <span className="text-[11px] text-[#647785] flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-[#3DA9DF]" />
                      <span>{article.publishDate}</span>
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-[#193247] group-hover:text-[#3DA9DF] transition-colors leading-snug">
                    {article.title}
                  </h2>

                  <p className="text-xs text-[#647785] leading-relaxed line-clamp-3">
                    {article.summary}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E5ECEF] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#3DA9DF] font-semibold truncate max-w-[170px]">
                    {article.department}
                  </span>
                  <span className="text-xs font-bold text-[#3DA9DF] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Read Full</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {filteredArticles.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E5ECEF] p-12 text-center max-w-lg mx-auto space-y-3">
            <AlertCircle className="w-8 h-8 text-[#647785] mx-auto opacity-40" />
            <h3 className="text-base font-bold text-[#193247]">No Matching Bulletins</h3>
            <p className="text-xs text-[#647785]">
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
              className="fixed inset-0 z-50 bg-[#193247]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
              onClick={() => setActiveArticle(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl max-w-2xl w-full border border-[#CBD7DD] shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={activeArticle.badgeVariant} size="sm">
                          {activeArticle.categoryLabel}
                        </Badge>
                        <span className="text-xs text-[#647785]">{activeArticle.publishDate}</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-[#193247] pt-1">
                        {activeArticle.title}
                      </h2>
                      <span className="text-xs text-[#3DA9DF] font-bold block">
                        {activeArticle.department} &bull; {activeArticle.readTime}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveArticle(null)}
                      className="w-8 h-8 rounded-full border border-[#E5ECEF] flex items-center justify-center text-[#193247] hover:bg-[#FCFDFB] transition-colors cursor-pointer shrink-0"
                      aria-label="Close modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-[#647785] leading-relaxed border-t border-[#E5ECEF] pt-4">
                    {activeArticle.fullContent.map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>

                  <div className="p-4 bg-[#F3F8EC] rounded-2xl border border-[#D5E8BA] space-y-2">
                    <span className="text-xs font-bold text-[#486812] block uppercase tracking-wider">
                      Key Takeaways for Patients &amp; Families:
                    </span>
                    <ul className="space-y-1.5 text-xs text-[#193247]">
                      {activeArticle.keyPoints.map((point, kIdx) => (
                        <li key={kIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#91BB40] shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-[#E5ECEF] flex items-center justify-between">
                    <span className="text-xs text-[#647785]">Official Hospital Clinical Communication</span>
                    <Link to="/book-appointment">
                      <Button variant="primary" size="sm" className="font-bold">
                        Book OPD Slot &rarr;
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};