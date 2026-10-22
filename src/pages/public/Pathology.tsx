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
  AlertCircle 
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] text-[#3A5612] text-xs font-semibold">
          <Microscope className="w-3.5 h-3.5 text-[#91BB40]" />
          <span>Diagnostic Laboratory &amp; Pathology</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#243447]">
          In-House Automated Diagnostic Pathology
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          Satya Hospital's certified laboratory delivers high-precision clinical pathology, hematology, and biochemistry testing. Every patient report undergoes mandatory validation before publication to your secure health account.
        </p>
      </div>

      {/* Lab Safety & Workflow 4-Step Card */}
      <div className="bg-white rounded-2xl border border-[#E1E8ED] p-6 sm:p-8 shadow-xs">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-lg font-bold text-[#243447]">4-Step Diagnostic Quality Safeguard</h2>
          <p className="text-xs text-[#667085] mt-1">
            How we protect patient sample integrity from collection to digital report delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center sm:text-left">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E1E8ED] space-y-2">
            <span className="w-7 h-7 rounded-full bg-[#3DA9DF] text-white flex items-center justify-center text-xs font-bold mx-auto sm:mx-0">
              1
            </span>
            <h3 className="text-sm font-semibold text-[#243447]">Barcoded Phlebotomy</h3>
            <p className="text-xs text-[#667085]">
              Blood &amp; urine specimens are labeled with unique lab accession numbers to prevent sample mix-ups.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E1E8ED] space-y-2">
            <span className="w-7 h-7 rounded-full bg-[#3DA9DF] text-white flex items-center justify-center text-xs font-bold mx-auto sm:mx-0">
              2
            </span>
            <h3 className="text-sm font-semibold text-[#243447]">Automated Analysis</h3>
            <p className="text-xs text-[#667085]">
              Processed on calibrated analyzers with daily quality control checks and internal controls.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E1E8ED] space-y-2">
            <span className="w-7 h-7 rounded-full bg-[#91BB40] text-[#243447] flex items-center justify-center text-xs font-bold mx-auto sm:mx-0">
              3
            </span>
            <h3 className="text-sm font-semibold text-[#243447]">Pathologist Sign-Off</h3>
            <p className="text-xs text-[#667085]">
              A qualified medical pathologist reviews critical values before authorising report publication.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E1E8ED] space-y-2">
            <span className="w-7 h-7 rounded-full bg-[#3DA9DF] text-white flex items-center justify-center text-xs font-bold mx-auto sm:mx-0">
              4
            </span>
            <h3 className="text-sm font-semibold text-[#243447]">Secure PDF Access</h3>
            <p className="text-xs text-[#667085]">
              Instant access in your Patient Portal via signed, encrypted links with no public web exposure.
            </p>
          </div>
        </div>
      </div>

      {/* Tests Catalogue with Search & Filters */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#243447]">Diagnostic Test Catalogue &amp; Pricing</h3>
            <p className="text-xs text-[#667085]">Transparent hospital lab rates with expected turnaround times.</p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tests (e.g. CBC, TSH)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[#CBD5E1] text-xs text-[#243447] focus:ring-2 focus:ring-[#3DA9DF] focus:border-transparent bg-white shadow-2xs"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#3DA9DF] text-white'
                  : 'bg-white border border-[#E1E8ED] text-[#243447] hover:bg-[#F8FAFC]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Test Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <Card key={test.id} className="p-5 flex flex-col justify-between border-[#CBD5E1] hover:border-[#3DA9DF] transition-colors">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant="neutral" size="sm">
                    {test.category}
                  </Badge>
                  <span className="text-base font-bold text-[#243447]">
                    ₹{test.price}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-[#243447]">{test.name}</h4>
                  <span className="text-[11px] font-semibold text-[#3DA9DF] block mt-0.5">
                    Test Code: {test.testCode}
                  </span>
                </div>

                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E1E8ED] text-xs space-y-1.5">
                  <div className="flex justify-between text-[#667085]">
                    <span>Sample Specimen:</span>
                    <strong className="text-[#243447]">{test.specimenType}</strong>
                  </div>
                  <div className="flex justify-between text-[#667085]">
                    <span>Fasting Required:</span>
                    <Badge variant={test.fastingRequired ? 'warning' : 'success'} size="sm">
                      {test.fastingRequired ? 'Yes (8-10 hrs)' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[#667085]">
                    <span>Turnaround Time:</span>
                    <strong className="text-[#243447]">~{test.turnaroundHours} hours</strong>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E1E8ED] mt-4 flex items-center justify-between">
                <span className="text-[11px] text-[#91BB40] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Available Daily
                </span>
                <Link to="/book-appointment">
                  <Button variant="outline" size="sm">
                    Book OPD / Test
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Pathology Contact Strip */}
      <div className="bg-[#F3F8EC] border border-[#D5E8B5] p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#91BB40] text-white flex items-center justify-center shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#2C420D]">Home Sample Collection Inquiries</h4>
            <p className="text-xs text-[#3A5612]">
              Need assistance with fasting preparation or home phlebotomy? Contact our laboratory desk at {settings.phone}.
            </p>
          </div>
        </div>
        <Link to="/contact">
          <Button variant="accent" size="sm">
            Contact Lab Desk
          </Button>
        </Link>
      </div>
    </div>
  );
};
