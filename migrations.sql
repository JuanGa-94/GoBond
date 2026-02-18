-- Migration: Setup Schedules and RLS Policies

-- 1. Ensure schedules table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    operating_days TEXT[] NOT NULL DEFAULT '{}',
    platform TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow everyone to view schedules
DROP POLICY IF EXISTS "Schedules are viewable by everyone" ON public.schedules;
CREATE POLICY "Schedules are viewable by everyone" 
ON public.schedules FOR SELECT 
USING (true);

-- Allow admins to insert schedules
DROP POLICY IF EXISTS "Admins can insert schedules" ON public.schedules;
CREATE POLICY "Admins can insert schedules" 
ON public.schedules FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
);

-- Allow admins to update schedules
DROP POLICY IF EXISTS "Admins can update schedules" ON public.schedules;
CREATE POLICY "Admins can update schedules" 
ON public.schedules FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
);

-- Allow admins to delete schedules
DROP POLICY IF EXISTS "Admins can delete schedules" ON public.schedules;
CREATE POLICY "Admins can delete schedules" 
ON public.schedules FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'ADMIN'
    )
);

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_route_id ON public.schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_departure_time ON public.schedules(departure_time);
