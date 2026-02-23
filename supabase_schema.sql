-- SQL to create the roadmaps table in Supabase

CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    career_id TEXT NOT NULL,
    title TEXT NOT NULL,
    match_score INTEGER,
    reason TEXT,
    skills JSONB,
    roadmap JSONB,
    user_profile JSONB,
    saved_at TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (for MVP simplicity, usually you'd tie this to user_id)
CREATE POLICY "Allow anonymous insert" ON public.roadmaps FOR INSERT WITH CHECK (true);

-- Create policy to allow anyone to select (for MVP simplicity)
CREATE POLICY "Allow anonymous select" ON public.roadmaps FOR SELECT USING (true);

-- Create policy to allow anyone to delete
CREATE POLICY "Allow anonymous delete" ON public.roadmaps FOR DELETE USING (true);
