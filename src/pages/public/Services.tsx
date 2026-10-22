import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Stethoscope, 
  CheckCircle2, 
  ArrowRight, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useHospital } from '../../context/HospitalContext';

export const Services: React.FC = () => {
  const { departments } = useHospital();
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  const filteredDepts = selectedDeptId === 'all' 
    ? departments 
    : departments.filter(d => d.id === selectedDeptId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#1E78A4] text-xs font-semibold">
          <Activity className="w-3.5 h-3.5 text-[#3DA9DF]" />
          <span>Clinical Disciplines &amp; Treatments</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#243447]">
          Outpatient Medical Services &amp; Specialties
        </h1>
        <p className="text-sm text-[#667085] leading-relaxed">
          Satya Hospital offers dedicated clinical departments staffed by certified consultant physicians, surgeons, and pathologists. Explore our departments and OPD schedules below.
        </p>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedDeptId('all')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            selectedDeptId === 'all'
              ? 'bg-[#3DA9DF] text-white shadow-xs'
              : 'bg-white border border-[#E1E8ED] text-[#243447] hover:bg-[#F8FAFC]'
          }`}
        >
          All Departments ({departments.length})
        </button>
        {departments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setSelectedDeptId(dept.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedDeptId === dept.id
                ? 'bg-[#3DA9DF] text-white shadow-xs'
                : 'bg-white border border-[#E1E8ED] text-[#243447] hover:bg-[#F8FAFC]'
            }`}
          >
            {dept.name}
          </button>
        ))}
      </div>

      {/* Department Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredDepts.map((dept) => (
          <Card key={dept.id} className="overflow-hidden border-[#CBD5E1] hover:border-[#3DA9DF] transition-all duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#243447]">{dept.name}</h3>
                    <span className="text-xs text-[#91BB40] font-semibold">
                      Outpatient Clinic Active
                    </span>
                  </div>
                </div>
                <Badge variant="lime-green" size="sm">
                  Active
                </Badge>
              </div>

              <p className="text-xs text-[#667085] leading-relaxed">
                {dept.description}
              </p>

              <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E1E8ED] text-xs space-y-2">
                <div className="flex items-center justify-between text-[#243447]">
                  <span className="text-[#667085]">Senior Consultant / Head:</span>
                  <span className="font-semibold">{dept.headOfDepartment}</span>
                </div>
                <div className="flex items-center justify-between text-[#243447]">
                  <span className="text-[#667085]">Consultation Room:</span>
                  <span className="font-semibold">Ground / First Floor OPD</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Link to="/book-appointment">
                  <Button variant="primary" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
                    Book Consultation Slot
                  </Button>
                </Link>
                <Link to="/doctors" className="text-xs text-[#3DA9DF] font-semibold hover:underline flex items-center gap-1">
                  <span>View Doctors</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Notice Card */}
      <div className="bg-[#F4F8FA] border border-[#CBD5E1] p-6 rounded-2xl flex items-start gap-3.5 text-xs text-[#667085]">
        <AlertCircle className="w-5 h-5 text-[#3DA9DF] shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm text-[#243447] mb-0.5">Clinical Services Verification</h4>
          <p className="leading-relaxed">
            All listed clinical offerings reflect services actively provided during our daily OPD hours. If a specific super-specialty procedure is required, please verify with reception beforehand.
          </p>
        </div>
      </div>
    </div>
  );
};
