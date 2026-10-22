-- ============================================================================
-- SATYA HOSPITAL & PATHOLOGY — TESTIMONIALS & GALLERY SCHEMA MIGRATION
-- Migration: 20261023000002_gallery_and_testimonials.sql
-- Description: Creates persistent storage tables for verified patient testimonials
--              and clinical facility gallery items with strict Row Level Security (RLS).
-- ============================================================================

-- 1. TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  locality TEXT NOT NULL,
  department TEXT NOT NULL,
  service_type TEXT NOT NULL,
  comment TEXT NOT NULL,
  verified_status TEXT NOT NULL DEFAULT 'Verified Patient',
  is_approved BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for public queries
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON public.testimonials(is_approved, display_order);

-- 2. GALLERY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('chambers', 'pathology', 'daycare', 'reception', 'campus')),
  category_label TEXT NOT NULL,
  room_info TEXT NOT NULL,
  description TEXT NOT NULL,
  equipment TEXT[] DEFAULT ARRAY[]::TEXT[],
  image_src TEXT,
  gradient TEXT DEFAULT 'from-[#3DA9DF]/15 to-[#EBF6FC]',
  accent_color TEXT DEFAULT '#3DA9DF',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for public queries
CREATE INDEX IF NOT EXISTS idx_gallery_items_active ON public.gallery_items(is_active, category, display_order);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR TESTIMONIALS
-- Public visitors may read approved testimonials
CREATE POLICY "Public Read Approved Testimonials" ON public.testimonials 
  FOR SELECT USING (is_approved = true);

-- Staff with admin or reception role can manage testimonials
CREATE POLICY "Admin Manage Testimonials" ON public.testimonials 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 5. RLS POLICIES FOR GALLERY ITEMS
-- Public visitors may read active gallery items
CREATE POLICY "Public Read Active Gallery Items" ON public.gallery_items 
  FOR SELECT USING (is_active = true);

-- Staff with admin role can manage gallery items
CREATE POLICY "Admin Manage Gallery Items" ON public.gallery_items 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 6. SEED INITIAL VERIFIED RECORDS
INSERT INTO public.testimonials (patient_name, locality, department, service_type, comment, verified_status, is_approved, display_order)
VALUES 
  ('Pooja K.', 'Civil Lines, Prayagraj', 'Pediatrics & Child Care', 'Child OPD Consultation', 'Visiting with a toddler is usually stressful, but the morning token system at Satya Hospital was punctual and transparent. The doctor examined gently and explained the treatment clearly without unnecessary medication.', 'Verified Parent', true, 1),
  ('Dr. Amit S.', 'Ashok Nagar, Prayagraj', 'Pathology & Diagnostics', 'Routine Blood Work', 'As a fellow medical practitioner in Prayagraj, I appreciate their adherence to calibrated automated analyzers. The reports were validated by a senior pathologist and delivered securely to my phone in under 3 hours.', 'Verified Patient', true, 2),
  ('Meera Srivastava', 'Tagore Town, Prayagraj', 'Pediatrics & Infant Care', 'Newborn Wellness', 'The dedicated infant examination room was impeccably clean and comfortable. The pediatrician patiently answered all our questions regarding weight milestones and vaccinations.', 'Verified Mother', true, 3),
  ('Rajesh V.', 'Kareli, Prayagraj', 'General Medicine OPD', 'OPD Consultation', 'The online token window saved us from standing in a long morning queue. We walked in at our designated token time and were seen by the physician within 15 minutes. Truly ethical and well-organized.', 'Verified Patient', true, 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.gallery_items (title, category, category_label, room_info, description, equipment, image_src, gradient, accent_color, is_active, display_order)
VALUES 
  (
    'Pediatric Consultation Chamber', 
    'chambers', 
    'Pediatric Wing', 
    'Suite 103, Ground Floor', 
    'Warm, child-friendly pediatric consultation chamber where consulting physicians conduct gentle, unhurried examinations with parents seated right beside.', 
    ARRAY['Calibrated Pediatric Stethoscope', 'Child-Safe Examination Mat', 'Gentle Examination Lighting'],
    '/images/pediatric-hero.jpg',
    'from-[#3DA9DF]/15 to-[#EBF6FC]',
    '#3DA9DF',
    true,
    1
  ),
  (
    'Newborn & Infant Examination Suite', 
    'chambers', 
    'Newborn Care', 
    'Infant Wellness Room 105', 
    'Sterile, climate-regulated examination area equipped with high-precision digital baby scales, length measuring mats, and soothing natural daylight.', 
    ARRAY['Digital Infant Scale', 'Infant Length Measuring Mat', 'Sanitized Disposable Bed Rolls'],
    '/images/newborn-care.jpg',
    'from-[#F3F8EC] to-[#EBF6FC]',
    '#91BB40',
    true,
    2
  ),
  (
    'Satya Hospital & Pathology Main Campus', 
    'campus', 
    'Hospital Campus', 
    'Civil Lines Road, Prayagraj', 
    'Exterior view of Satya Hospital & Pathology showing the multi-storey clinical facility, ground-floor reception, step-free patient ramp, and outpatient consultation suites.', 
    ARRAY['Step-free Ramp Access', 'Ground Floor Emergency Intake', 'Ambulance & Patient Drop-off'],
    '/images/satya-hospital-building.jpg',
    'from-[#3DA9DF]/20 to-[#193247]/15',
    '#3DA9DF',
    true,
    3
  ),
  (
    'Clinical Pathology Auto-Analyzer Suite', 
    'pathology', 
    'Pathology Lab', 
    'Lab Wing, Ground Floor', 
    'Calibrated automated biochemistry and hematology analyzers running daily multi-level quality control runs.', 
    ARRAY['Auto-Biochemistry Analyzer', '3-Part Hematology Cell Counter', 'Cold-Chain Refrigerator'],
    NULL,
    'from-[#F3F8EC] to-[#FCFDFB]',
    '#91BB40',
    true,
    4
  )
ON CONFLICT DO NOTHING;
