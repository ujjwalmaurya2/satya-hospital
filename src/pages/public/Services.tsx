import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Stethoscope, 
  CheckCircle2, 
  ArrowRight, 
  Calendar,
  Baby,
  Sparkles,
  Microscope,
  Heart
} from 'lucide-react';
import { Card } from '../../components/common/Card';
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
    <div className="bg-[#FCFDFB] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F3F8EC] text-[#486812] border border-[#D5E8BA] text-xs font-bold">
            <Activity className="w-3.5 h-3.5 text-[#3DA9DF]" />
            <span>Clinical Disciplines &amp; Specialties</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#193247] tracking-tight">
            Outpatient Healthcare Services &amp; Medical Departments
          </h1>
          <p className="text-sm text-[#647785] leading-relaxed">
            Satya Hospital provides dedicated outpatient medical departments staffed by certified consultant physicians, pediatric specialists, surgeons, and pathologists.
          </p>
        </div>

        {/* Quick Highlights for Childcare */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link 
            to="/pediatric-care"
            className="p-5 rounded-2xl bg-white border border-[#CBD7DD] hover:border-[#3DA9DF] shadow-xs hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#F3F8EC] text-[#91BB40] flex items-center justify-center font-bold">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#193247] group-hover:text-[#3DA9DF] transition-colors">
                  Dedicated Pediatric Care Wing
                </h3>
                <p className="text-xs text-[#647785]">Routine checkups, childhood illness, and growth tracking</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#3DA9DF] group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>

          <Link 
            to="/newborn-care"
            className="p-5 rounded-2xl bg-white border border-[#CBD7DD] hover:border-[#3DA9DF] shadow-xs hover:shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#193247] group-hover:text-[#3DA9DF] transition-colors">
                  Newborn &amp; Infant Healthcare
                </h3>
                <p className="text-xs text-[#647785]">Postnatal assessments, lactation support, and baby wellness</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#3DA9DF] group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedDeptId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedDeptId === 'all'
                ? 'bg-[#3DA9DF] text-white shadow-xs'
                : 'bg-white border border-[#E5ECEF] text-[#193247] hover:bg-[#FCFDFB]'
            }`}
          >
            All Departments ({departments.length})
          </button>
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDeptId(dept.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedDeptId === dept.id
                  ? 'bg-[#3DA9DF] text-white shadow-xs'
                  : 'bg-white border border-[#E5ECEF] text-[#193247] hover:bg-[#FCFDFB]'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredDepts.map((dept) => (
            <Card key={dept.id} className="overflow-hidden border-[#CBD7DD] hover:border-[#3DA9DF]/50 transition-all duration-200 bg-white hover:shadow-md">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center font-bold">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#193247]">{dept.name}</h3>
                      <span className="text-xs text-[#486812] font-bold">
                        Outpatient Clinic Active
                      </span>
                    </div>
                  </div>
                  <Badge variant="medical-blue" size="sm" dot>
                    Active
                  </Badge>
                </div>

                <p className="text-xs text-[#647785] leading-relaxed">
                  {dept.description}
                </p>

                <div className="bg-[#FCFDFB] rounded-xl p-4 border border-[#E5ECEF] text-xs space-y-2">
                  <div className="flex items-center justify-between text-[#193247]">
                    <span className="text-[#647785]">Senior Consultant / Head:</span>
                    <span className="font-bold">{dept.headOfDepartment}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#193247]">
                    <span className="text-[#647785]">Consultation Room:</span>
                    <span className="font-semibold">Ground / First Floor OPD</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Link to={`/book-appointment`} className="w-full">
                    <Button variant="primary" size="sm" className="w-full font-bold" leftIcon={<Calendar className="w-4 h-4" />}>
                      Book Appointment for {dept.name.split(' ')[0]}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
};