-- 1. Fix Volunteer Visibility & Case Access
-- Ensure case_assignments can be seen by all authenticated users (Pool visibility)
CREATE POLICY "assignments_select_all" ON public.case_assignments
    FOR SELECT TO authenticated USING (true);

-- Ensure families can be seen by authenticated users
CREATE POLICY "families_select_all" ON public.families
    FOR SELECT TO authenticated USING (true);

-- Ensure children can be seen by authenticated users
CREATE POLICY "children_select_all" ON public.children
    FOR SELECT TO authenticated USING (true);

-- 2. Add Educational Grade to Children
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS educational_grade TEXT;

-- 3. Create Data Update Requests Table
CREATE TABLE IF NOT EXISTS public.data_update_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES public.profiles(id),
    requested_changes JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ
);

-- 4. Enable RLS and set policies for update requests
ALTER TABLE public.data_update_requests ENABLE ROW LEVEL SECURITY;

-- Volunteers can see their own requests
CREATE POLICY "requests_select_own" ON public.data_update_requests
    FOR SELECT TO authenticated USING (auth.uid() = volunteer_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- Volunteers can insert requests
CREATE POLICY "requests_insert_volunteer" ON public.data_update_requests
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = volunteer_id);

-- Admins can update requests (to approve/reject)
CREATE POLICY "requests_admin_all" ON public.data_update_requests
    FOR ALL TO authenticated USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 5. Add a comment for clarity
COMMENT ON COLUMN public.children.educational_grade IS 'Specific school grade like "2nd Preparatory" or "5th Primary"';
