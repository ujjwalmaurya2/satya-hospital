import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Microscope, 
  Search, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck, 
  PhoneCall, 
  AlertCircle,
  FileText,
  Baby
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useHospital } from '../../context/HospitalContext';

export const Pathology: React.FC = () => {
  const { pathologyTests, settings } = useHospital();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Hematology', 'Biochemistry', 'Diabetes Care', 'Endocrinology', 'Clinical Pathology'];

  const filteredTests = pathologyTests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.testCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || test.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const phoneRaw = settings.phone.split(' ')[0] || '+915322900000';

  return (
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] text-[#486812] border border-[#D5E8BA] text-xs font-bold">
            <Microscope className="w-3.5 h-3.5 text-[#3DA9DF]" />
            <span>Certified Diagnostic Laboratory &amp; Pathology &bull; Satya Hospital</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#193247] tracking-tight">
            In-House Automated Diagnostic Pathology
          </h1>
          <p className="text-sm text-[#647785] leading-relaxed">
            Satya Hospital's certified laboratory delivers high-precision clinical pathology, hematology, and biochemistry testing. Every patient report undergoes mandatory validation before publication to your secure patient account.
          </p>
        </div>

        {/* Lab Safety & Workflow 4-Step Card */}
        <div className="bg-white rounded-3xl border border-[#CBD7DD] p-6 sm:p-8 shadow-xs">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-lg font-bold text-[#193247]">4-Step Diagnostic Quality Safeguard</h2>
            <p className="text-xs text-[#647785] mt-1">
              How we protect patient sample integrity from collection to digital report delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="p-4 rounded-2xl bg-[#FCFDFB] border border-[#E5ECEF] space-y-2">
              <span className="w-7 h-7 rounded-full bg-[#3DA9DF] text-white flex items-center justify-center text-xs font-bold mx-auto sm:mx-0 shadow-2xs">
                1
              </span>
              <h3 className="text-sm font-bold text-[#193247]">Barcoded Phlebotomy</h3>
              <p className="text-xs text-[#647785]">
                Blood &amp; urine specimens are labeled with unique lab accession numbers to prevent sample mix-ups.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FCFDFB] border border-[#E5ECEF] space-y-2">
              <span className="w-7 h-7 rounded-full bg-[#91BB40] text-white flex items-center justify-center text-xs font-bold mx-auto sm:mx-0 shadow-2xs">
                2
              </span>
              <h3 className="text-sm font-bold text-[#193247]">Automated Analysis</h3>
              <p className="text-xs text-[#647785]">
                Processed on calibrated auto-analyzers with daily quality control checks and internal controls.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FCFDFB] border border-[#E5ECEF] space-y-2">
              <span className="w-7 h-7 rounded-full bg-[#3DA9DF] text-white flex items-center justify-center text-xs font-bold mx-auto sm:mx-0 shadow-2xs">
                3
              </span>
              <h3 className="text-sm font-bold text-[#193247]">Pathologist Sign-Off</h3>
              <p className="text-xs text-[#647785]">
                A qualified medical pathologist reviews critical values before authorising digital publication.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FCFDFB] border border-[#E5ECEF] space-y-2">
              <span className="w-7 h-7 rounded-full bg-[#91BB40] text-white flex items-center justify-center text-xs font-bold mx-auto sm:mx-0 shadow-2xs">
                4
              </span>
              <h3 className="text-sm font-bold text-[#193247]">Secure PDF Access</h3>
              <p className="text-xs text-[#647785]">
                Instant access in your Patient Portal via signed, encrypted links with no public web exposure.
              </p>
            </div>
          </div>
        </div>

        {/* Tests Catalogue with Search & Filters */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-[#193247]">Diagnostic Test Catalogue &amp; Pricing</h3>
              <p className="text-xs text-[#647785]">Transparent hospital lab rates with expected turnaround times.</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#647785] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tests (e.g. CBC, TSH)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#CBD7DD] text-xs text-[#193247] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
              />
            </div>
          </div>

          {/* Categories Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#3DA9DF] text-white shadow-xs'
                    : 'bg-white border border-[#E5ECEF] text-[#193247] hover:bg-[#FCFDFB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Test Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTests.map((test) => (
              <Card key={test.id} className="p-5 flex flex-col justify-between border-[#CBD7DD] hover:border-[#3DA9DF]/50 transition-colors bg-white hover:shadow-md">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="medical-blue" size="sm">
                      {test.category}
                    </Badge>
                    <span className="text-base font-extrabold text-[#193247]">
                      ₹{test.price}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#193247]">{test.name}</h4>
                    <span className="text-[11px] font-bold text-[#3DA9DF] block mt-0.5">
                      Code: {test.testCode}
                    </span>
                  </div>

                  <div className="bg-[#FCFDFB] p-3 rounded-xl border border-[#E5ECEF] text-xs space-y-1.5">
                    <div className="flex justify-between text-[#647785]">
                      <span>Specimen:</span>
                      <strong className="text-[#193247]">{test.specimenType}</strong>
                    </div>
                    <div className="flex justify-between text-[#647785]">
                      <span>Fasting Required:</span>
                      <Badge variant={test.fastingRequired ? 'warning' : 'success'} size="sm">
                        {test.fastingRequired ? 'Yes (8-10 hrs)' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-[#647785]">
                      <span>Turnaround Time:</span>
                      <strong className="text-[#193247]">~{test.turnaroundHours} hours</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5ECEF] mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-[#486812] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#91BB40]" />
                    Available Daily
                  </span>
                  <Link to="/book-appointment">
                    <Button variant="outline" size="sm" className="font-bold">
                      Book OPD / Test
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Pathology Contact Strip */}
        <div className="bg-[#EBF6FC] border border-[#BCE1F5] p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#3DA9DF] text-white flex items-center justify-center shrink-0 font-bold">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#193247]">Pathology Collection &amp; Report Inquiries</h4>
              <p className="text-xs text-[#647785]">
                Need advice on fasting guidelines or sample drop-off times? Contact our laboratory desk at {phoneRaw}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/patient/reports">
              <Button variant="primary" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
                Access My Reports
              </Button>
            </Link>
            <a href={`tel:${phoneRaw}`}>
              <Button variant="outline" size="sm">
                Call Lab Desk
              </Button>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};