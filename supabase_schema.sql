-- SQL to create the reports table in Supabase

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    education TEXT,
    date TEXT,
    careers JSONB,
    user_profile JSONB
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies for Authenticated Users
CREATE POLICY "Users can insert their own reports" ON public.reports 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports" ON public.reports 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" ON public.reports 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" ON public.reports 
    FOR DELETE USING (auth.uid() = user_id);
